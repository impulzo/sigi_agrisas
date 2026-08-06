## MODIFIED Requirements

### Requirement: Sale aggregate model
The system SHALL persist a sale as the aggregate `Sale` (header) + `SaleItem` (lines) with the following invariants:

- `Sale.status` is one of `completed`, `cancelled`, `edited`. There is no `open`/`draft` state — the cart lives in the client.
- `Sale.paymentStatus` is one of `paid`, `partial`, `pending`. Computed and persisted at every mutation that affects `paidAmount`:
  - `paid` when `paidAmount >= total`.
  - `partial` when `0 < paidAmount < total`.
  - `pending` when `paidAmount === 0`.
  - For sales whose `paymentMethod.isCredit === false`, `paymentStatus` is ALWAYS `paid` from emission (no `CustomerPayment` rows ever attach to them — they're paid at the moment).
  - For sales whose `paymentMethod.isCredit === true`, `paymentStatus` starts at `pending` and progresses to `partial` and then `paid` as `CustomerPayment` rows accumulate.
- `Sale.paidAmount` is `Decimal(14,4) DEFAULT 0`. Updated atomically by `RegisterPaymentUseCase` and `CancelPaymentUseCase` of the `payments` module (and on cancellation/edit of the sale when no active payments exist).
- The "credit nature" of a sale is NOT a field on `Sale`; it is inferred from `Sale.paymentMethod.isCredit` via JOIN (or `include`). The application MAY expose a derived `isCredit: boolean` in DTOs at read time but SHALL NOT persist it as a column on `sales`. Consumers SHOULD treat `paymentMethod.isCredit` as the source of truth.
- `Sale` references `branchId`, `customerId`, `cashierId` (the authenticated user who emitted the sale), `paymentMethodId`, `folioId`. All FKs `ON DELETE RESTRICT` (cancelling these catalog rows requires reassigning or archiving sales first).
- `Sale.folioNumber` is an integer assigned atomically at emission; `(folioId, folioNumber)` is UNIQUE.
- `Sale.folioCode` is a snapshot of the folio's `code` (and `prefix` when present, concatenated as `"${prefix}${number}"` or `"${code}-${number}"` per implementation choice — documented in `pos-api`).
- `Sale.subtotal`, `Sale.taxTotal`, `Sale.total` are persisted (computed at emission).
- `Sale.quoteId` is a nullable reference to a `Quote` (FK `ON DELETE SET NULL`). Indexed via `sales(quote_id)`. When the sale was emitted directly via `POST /api/v1/admin/sales` without a quote, the column is `null`. When the sale was emitted via `POST /api/v1/admin/quotes/:id/convert`, the column points to the originating quote.
- Each `SaleItem` snapshots `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate` so the ticket survives later changes to the catalog. `productId` (FK `ON DELETE RESTRICT`) and `productPriceId` (FK `ON DELETE SET NULL`) are retained for reporting.
- Each `SaleItem` persists `lineSubtotal`, `lineTax`, `lineTotal`.
- **Dosification lines**: a `SaleItem` MAY originate from a `ProductDosification` instead of a `ProductPrice`. In that case `productPriceId` SHALL be `null`, and the line additionally persists `dosificationId` (nullable FK to `product_dosifications`, `ON DELETE SET NULL`) and `numPartsSnapshot` (nullable `INT`, the dosification's `numParts` at the time of sale). `priceNameSnapshot` SHALL hold the dosification's `name` for these lines (same column, same display purpose as for price-based lines). Exactly one of `productPriceId`/`dosificationId` SHALL be non-null per `SaleItem` — never both, never neither. `unitPrice` for a dosification line is `DosificationPriceCalculator.computeUnitPrice(defaultPrice.price, numParts, surchargePct)`, where `surchargePct` is the value currently configured via `settings-api` (`GET /settings/pricing` → `dosificationSurchargePct`, default `5.0`) — NOT a fixed constant. `quantity` for a dosification line represents the number of dosification parts sold and MAY exceed `numParts` (selling more than one full container in a single line is allowed, e.g. 6 parts of a `numParts=4` dosification).
- **Inventory quantity for dosification lines**: any operation that moves `branch_inventory.quantity` from a `SaleItem` (creation, cancellation, edit) SHALL use `quantity / numPartsSnapshot` as the base-unit amount when `numPartsSnapshot` is non-null, instead of `quantity` directly. For lines without a dosification (`numPartsSnapshot = null`), the amount is `quantity` unchanged (no behavior change).

#### Scenario: Snapshot survives product rename
- **WHEN** a sale is completed for product `ARROZ_001 ("Arroz 1kg")`, and later the product is renamed to `"Arroz Integral 1kg"`
- **THEN** `GET /api/v1/admin/sales/:id` for the prior sale still returns `productNameSnapshot: "Arroz 1kg"` on that line

#### Scenario: Snapshot survives price deletion
- **WHEN** a sale is completed using `productPriceId = X`, and later the price `X` is hard-deleted via `DELETE /products/:id/prices/:priceId`
- **THEN** `GET /api/v1/admin/sales/:id` still returns the persisted `unitPrice`, `discountPct`, and `priceNameSnapshot` from when the sale was emitted, with `productPriceId: null` in the response

#### Scenario: Quote link exposed in detail
- **WHEN** a sale was emitted via `POST /api/v1/admin/quotes/:id/convert` from a quote whose id is `Q`
- **THEN** `GET /api/v1/admin/sales/:saleId` returns `quoteId: "Q"` in the `SaleDetailDto`

#### Scenario: Direct sale has null quote link
- **WHEN** a sale was emitted via `POST /api/v1/admin/sales` without a `quoteId` in the body
- **THEN** `GET /api/v1/admin/sales/:saleId` returns `quoteId: null`

#### Scenario: Deleting the originating quote does not break the sale
- **WHEN** a sale has `quoteId = Q` and the row in `quotes` with id `Q` is removed (manually or via a future purge module)
- **THEN** the sale row is preserved; `sale.quoteId` becomes `null` via the FK's `ON DELETE SET NULL`

#### Scenario: Cash sale has paymentStatus paid immediately
- **WHEN** a sale is emitted with a `paymentMethod` whose `isCredit=false` and `total=1000`
- **THEN** the persisted row has `paid_amount=1000`, `payment_status='paid'`

#### Scenario: Credit sale starts pending
- **WHEN** a sale is emitted with a `paymentMethod` whose `isCredit=true` and `total=1000`
- **THEN** the persisted row has `paid_amount=0`, `payment_status='pending'`

#### Scenario: SaleDetailDto exposes isCredit as derived field
- **WHEN** an authorized caller fetches `GET /api/v1/admin/sales/:id` for a sale whose `paymentMethod.isCredit=true`
- **THEN** the response includes `isCredit: true` derived from the JOIN; the field is read-only and not persisted on the `sales` table

#### Scenario: Dosification line snapshots numParts and dosificationId
- **WHEN** a sale is emitted with a line whose `dosificationId` references a dosification with `numParts=4`
- **THEN** the persisted `sale_items` row has `productPriceId: null`, `dosificationId` set, `numPartsSnapshot=4`, and `priceNameSnapshot` equal to the dosification's `name`

#### Scenario: Dosification quantity may exceed numParts
- **WHEN** a sale line sells `quantity=6` parts of a dosification with `numParts=4`
- **THEN** the line is accepted (no upper bound on `quantity` relative to `numParts`); `lineTotal = 6 * computedUnitPrice`

---

### Requirement: Create sale (atomic emission)
The system SHALL expose `POST /api/v1/admin/sales` that emits a completed sale in a single transaction. Requires `sales:create`. Required body:

- `branchId: string` (UUID of an active branch)
- `customerId: string` (UUID of an active customer)
- `paymentMethodId: string` (UUID of an active payment method)
- `folioId: string` (UUID of an active folio)
- `items: SaleItemInput[]` (at least 1 item)

Each `SaleItemInput`:

- `productId: string` (UUID of an active product)
- `productPriceId: string` (UUID of a price belonging to `productId`) **OR** `dosificationId: string` (UUID of a dosification belonging to `productId`) — exactly one of the two SHALL be present; both present or both absent → HTTP 400.
- `quantity: number` (decimal `> 0`; max 14 integer + 4 decimal digits). For a dosification line, `quantity` is the number of parts sold (MAY exceed the dosification's `numParts`).

Optional body:

- `notes: string | null` (max 1000 chars)
- `quoteId: string | null` (UUID of an authorized, not-yet-converted quote; defaults to `null`)

The body MUST NOT include any explicit `isCredit` flag; the credit flow is activated automatically when the selected `paymentMethod` has `isCredit=true` (see "Credit flow auto-activation" below).

**Branch scoping**: callers without `branches:access_all` MUST pass `branchId === x-user-branch-id`; mismatch returns HTTP 403. Callers without an assigned branch (`x-user-branch-id` empty) and without `branches:access_all` return HTTP 403.

**Credit flow auto-activation (non-blocking)**: after loading the `paymentMethod`, if `paymentMethod.isCredit === true`, the controller SHALL:

1. Verify the caller has `sales:create_credit`; otherwise HTTP 403 `{"error":"Forbidden","required":"sales:create_credit"}`.
2. The system SHALL NOT reject the sale for lacking a credit line or for exceeding `creditLimit`. Instead, once the final total is known, it computes an informational flag: `creditLimitExceeded = customer.creditLimit !== null && (customer.currentBalance + sale.total) > customer.creditLimit`. When `customer.creditLimit === null` (no credit line configured), `creditLimitExceeded` is `false` — there is no limit to exceed.

This computation runs AFTER total calculation but BEFORE folio allocation, all within the same transaction; it never aborts the transaction.

**`quoteId` validation when present**: if the body includes a non-null `quoteId`, the controller SHALL:

1. Load the quote; if it does not exist → HTTP 400 `{"error": "Quote not found", "reason": "not_found"}`.
2. Verify `quote.status === 'authorized'` AND `quote.convertedSaleId === null`. If not → HTTP 400 `{"error": "Quote cannot be linked to a new sale (status=<actual>)", "reason": "wrong_status"}`.
3. Verify `quote.branchId === branchId` and `quote.customerId === customerId` (the sale's branch/customer must match the quote's; mismatch → HTTP 400 `{"error": "...", "reason": "branch_mismatch" | "customer_mismatch"}`). The quote does NOT constrain `paymentMethodId`, `folioId`, or `items` — those are governed by the sale body.
4. Persist `sale.quoteId = quoteId`; ALSO update the quote in the same transaction: `quote.status='converted'`, `quote.convertedAt=NOW()`, `quote.convertedSaleId=<newSaleId>` (this keeps both sides consistent regardless of whether the caller used `POST /sales` or `POST /quotes/:id/convert`).

The `quoteId` does NOT constrain whether the sale is cash or credit — the `paymentMethodId` of the body decides.

**Atomic flow (inside a Prisma transaction)**:

1. Validate `customer.isActive`, `branch.isActive`, `paymentMethod.isActive`, `folio.isActive`. Any inactive → HTTP 400.
2. Load `paymentMethod.isCredit` (via `include` or join) so the downstream branching is consistent within the transaction.
3. If `quoteId` is non-null: validate per the rules above; failure → HTTP 400.
4. For each item:
   - If `productPriceId` is present: load the `Product` and `ProductPrice`; verify `productPrice.productId === item.productId` (else `ProductPriceMismatchError` → HTTP 400) and belongs to a product whose `isActive = true` (else HTTP 400).
   - If `dosificationId` is present instead: load the `Product` and `ProductDosification`; verify `dosification.productId === item.productId` (else HTTP 400) and `dosification.isActive = true` (else HTTP 400); load the product's default `ProductPrice` — if none exists → HTTP 400 `{"error": "Dosification requires a default price"}`; resolve the currently configured `dosificationSurchargePct` from `settings-api` (default `5.0` when unconfigured); compute `unitPrice = DosificationPriceCalculator.computeUnitPrice(defaultPrice.price, dosification.numParts, surchargePct)`.
   - `quantity > 0` (else HTTP 400) for either case. The system MAY skip enforcement of `minQuantity` in v1 (documented, applies only to price-based lines).
5. Snapshot `productCodeSnapshot = product.code`, `productNameSnapshot = product.name`; for price-based lines: `priceNameSnapshot = price.name`, `unitPrice = price.price`, `discountPct = price.discountPct`; for dosification lines: `priceNameSnapshot = dosification.name`, `unitPrice` per above, `discountPct = null`, `dosificationId = dosification.id`, `numPartsSnapshot = dosification.numParts`. Both kinds set `ivaRate = product.ivaRate`, `iepsRate = product.iepsRate`.
6. Compute totals using `SaleTotalsCalculator` (domain service) — unchanged by dosification lines (operates on `quantity * unitPrice`, agnostic to what `quantity` represents).
7. If `paymentMethod.isCredit === true`: compute the informational `creditLimitExceeded` flag per "Credit flow auto-activation" above. This step never aborts the transaction.
8. Allocate the next folio number atomically: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. If `RETURNING` is empty (folio inactive) → HTTP 400.
9. For each item, decrement inventory using the base-unit amount (`quantity / numPartsSnapshot` for dosification lines, `quantity` otherwise — see "Sale aggregate model"): `UPDATE branch_inventory SET quantity = quantity - ${amount}, updated_at = NOW() WHERE branch_id = ? AND product_id = ?`. If the update affects 0 rows (no inventory record exists for this pair), the system SHALL `INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, -${amount})` (creates the record with negative initial quantity). The result `quantity` MAY be negative — this is the implementation of the rule "selling with stock 0 leaves negative quantity awaiting transfer". **After each such decrement**, the system SHALL evaluate the low-stock notification trigger per `admin-notifications-api` "Notify admin on low stock" (best-effort, never blocks or fails this endpoint).
10. Compute `paidAmount` and `paymentStatus`:
    - If `paymentMethod.isCredit === false`: `paidAmount = total`, `paymentStatus = 'paid'`.
    - If `paymentMethod.isCredit === true`: `paidAmount = 0`, `paymentStatus = 'pending'` (regardless of `creditLimitExceeded`).
11. `INSERT` the `sales` row with `status='completed'`, `completedAt=NOW()`, snapshotted folio info, `quote_id = quoteId` (or `null`), `paid_amount`, `payment_status`.
12. `INSERT` the `sale_items` rows.
13. If `paymentMethod.isCredit === true`: `UPDATE customers SET current_balance = current_balance + ? WHERE id = ?` (sale.customerId) — regardless of `creditLimitExceeded`.
14. If `quoteId` non-null: `UPDATE quotes SET status='converted', converted_at=NOW(), converted_sale_id=<newSaleId> WHERE id = quoteId`.

Returns HTTP 201 with the `SaleDetailDto` (including items, `quoteId`, `paidAmount`, `paymentStatus`, the derived `isCredit` from the JOIN, and `creditLimitExceeded: boolean` — always `false` for non-credit sales).

**BREAKING**: this endpoint no longer returns HTTP 409 for `CreditLimitExceededError` or `CustomerHasNoCreditLineError`. Callers that previously branched on those 409 responses MUST instead read `creditLimitExceeded` from the HTTP 201 body.

#### Scenario: Successful cash sale
- **WHEN** an `operator` with `x-user-branch-id: B1` and `sales:create` sends a valid body for branch B1 with 2 items, selecting a `paymentMethod` whose `isCredit=false` (no `quoteId`)
- **THEN** the system returns HTTP 201 with the `SaleDetailDto` (`quoteId: null`, `isCredit: false`, `paidAmount: total`, `paymentStatus: 'paid'`, `creditLimitExceeded: false`), `branch_inventory.quantity` decremented by each item's quantity, and `folios.current_number` incremented by 1
- **AND** `customer.currentBalance` is NOT modified

#### Scenario: Successful credit sale via CREDITO payment method
- **WHEN** an `operator` with `sales:create` and `sales:create_credit` sends a body selecting the `paymentMethod` whose `code='CREDITO'` and `isCredit=true` for a customer with `creditLimit=10000`, `currentBalance=2000`, and the new sale `total=5000`
- **THEN** the system returns HTTP 201 with `paidAmount=0`, `paymentStatus='pending'`, `isCredit=true` (derived), `creditLimitExceeded=false` (7000 ≤ 10000); `customer.currentBalance` becomes `7000` after the transaction commits

#### Scenario: Credit payment method selected without sales:create_credit
- **WHEN** a caller with `sales:create` (but NOT `sales:create_credit`) selects a `paymentMethod` whose `isCredit=true`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"sales:create_credit"}`

#### Scenario: Credit sale exceeds creditLimit — sale still completes with warning flag
- **WHEN** the body selects a `paymentMethod` with `isCredit=true` for a customer with `creditLimit=10000`, `currentBalance=8000`, and `sale.total=5000`
- **THEN** the system returns HTTP 201 (NOT 409) with `creditLimitExceeded=true`, `paidAmount=0`, `paymentStatus='pending'`; the sale, sale items, folio increment, and inventory decrement are all persisted; `customer.currentBalance` becomes `13000`

#### Scenario: Credit sale for customer without credit line — sale still completes
- **WHEN** the body selects a `paymentMethod` with `isCredit=true` for a customer with `creditLimit=null`
- **THEN** the system returns HTTP 201 (NOT 409) with `creditLimitExceeded=false` (no limit configured, so nothing to exceed); the sale is persisted normally with `paidAmount=0`, `paymentStatus='pending'`

#### Scenario: Successful sale with quoteId (cash)
- **WHEN** the body includes `quoteId: Q` and a `paymentMethod` whose `isCredit=false`, where `Q` is an authorized quote with `convertedSaleId: null` and matching `branchId`/`customerId`
- **THEN** the system returns HTTP 201 with `quoteId: Q`, `isCredit=false`, `paidAmount=total`, `paymentStatus='paid'`; and the quote row has `status='converted'`, `convertedSaleId=<newSaleId>`

#### Scenario: Conversion from quote to credit sale
- **WHEN** the body includes both `quoteId: Q` and a `paymentMethod` whose `isCredit=true`, and the caller has `sales:create_credit`
- **THEN** the system applies BOTH the quote conversion AND the credit flow: the sale has `quoteId=Q`, `isCredit=true` (derived), `paidAmount=0`, `paymentStatus='pending'`; `customer.currentBalance += total`; the quote is marked converted

#### Scenario: Invalid quoteId (already converted)
- **WHEN** the body includes `quoteId: Q` where `Q` has `status='converted'`
- **THEN** the system returns HTTP 400 `{"error": "Quote cannot be linked to a new sale (status=converted)", "reason": "wrong_status"}` and the transaction does not commit

#### Scenario: Invalid quoteId (draft)
- **WHEN** the body includes `quoteId: Q` where `Q` has `status='draft'`
- **THEN** the system returns HTTP 400 `{"error": "Quote cannot be linked to a new sale (status=draft)", "reason": "wrong_status"}`

#### Scenario: Quote branch mismatch
- **WHEN** the body has `branchId: B1` but `quoteId: Q` where `Q.branchId = B2`
- **THEN** the system returns HTTP 400 and the transaction does not commit

#### Scenario: Quote customer mismatch
- **WHEN** the body has `customerId: C1` but `quoteId: Q` where `Q.customerId = C2`
- **THEN** the system returns HTTP 400

#### Scenario: Selling product with no inventory record
- **WHEN** the body includes a `productId` that has no `branch_inventory` row for the target branch
- **THEN** the system creates the row with `quantity = -item.quantity` and returns HTTP 201

#### Scenario: Selling product with stock 0
- **WHEN** the current `branch_inventory.quantity = 0` and the item `quantity = 5`
- **THEN** the system updates the row to `quantity = -5` and returns HTTP 201

#### Scenario: Selling more than available (still allowed)
- **WHEN** the current `branch_inventory.quantity = 3` and the item `quantity = 10`
- **THEN** the system updates the row to `quantity = -7` and returns HTTP 201

#### Scenario: Branch scoping violation
- **WHEN** an `operator` with `x-user-branch-id: B1` posts a body with `branchId: B2`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: Inactive customer
- **WHEN** the body's `customerId` references a customer with `isActive=false`
- **THEN** the system returns HTTP 400 `{"error": "Customer is inactive"}` and the transaction does not commit

#### Scenario: Mismatched productPrice
- **WHEN** an item has `productId: A` but `productPriceId: P` where `P.product_id !== A`
- **THEN** the system returns HTTP 400 `{"error": "Product price does not belong to product"}` and the transaction does not commit

#### Scenario: Empty items
- **WHEN** the body has `items: []`
- **THEN** the system returns HTTP 400 `{"error": "Sale must include at least one item"}`

#### Scenario: Inactive folio
- **WHEN** the body's `folioId` references a folio with `isActive=false`
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden without sales:create
- **WHEN** a caller without `sales:create` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "sales:create"}`

#### Scenario: Sale creation crossing reorder point triggers admin notification
- **WHEN** a sale item's decrement leaves `branch_inventory.quantity < reorder_point` for that (branch, product), and no notification for that pair was sent in the last 24h
- **THEN** the system still returns HTTP 201 as normal, AND — per `admin-notifications-api` — an email is sent to the configured admin address and `lastLowStockNotifiedAt` is updated; a failure to send this email does NOT affect the HTTP 201 response

#### Scenario: Dosification sale decrements a fraction of base stock
- **WHEN** the body has one item with `dosificationId` referencing a dosification with `numParts=4` and `quantity=3`, for a product whose default price is `100` and whose `branch_inventory.quantity = 10`, and no `pricing_settings` row exists yet (default 5% surcharge applies)
- **THEN** the system returns HTTP 201 with `unitPrice = (100/4)*1.05 = 26.25` on that line; `branch_inventory.quantity` becomes `10 - (3/4) = 9.25`

#### Scenario: Dosification without default price rejected
- **WHEN** the body has an item with `dosificationId` referencing a dosification whose product has no default `ProductPrice`
- **THEN** the system returns HTTP 400 `{"error": "Dosification requires a default price"}` and the transaction does not commit

#### Scenario: Dosification/productPrice mutual exclusivity
- **WHEN** an item includes both `productPriceId` and `dosificationId`, or neither
- **THEN** the system returns HTTP 400

#### Scenario: Dosification not belonging to product
- **WHEN** an item has `productId: A` but `dosificationId: D` where `D.product_id !== A`
- **THEN** the system returns HTTP 400 and the transaction does not commit

#### Scenario: Inactive dosification rejected
- **WHEN** an item's `dosificationId` references a dosification with `isActive=false`
- **THEN** the system returns HTTP 400
