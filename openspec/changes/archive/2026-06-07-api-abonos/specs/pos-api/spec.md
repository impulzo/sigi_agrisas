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

### Requirement: Create sale (atomic emission)
The system SHALL expose `POST /api/v1/admin/sales` that emits a completed sale in a single transaction. Requires `sales:create`. Required body:

- `branchId: string` (UUID of an active branch)
- `customerId: string` (UUID of an active customer)
- `paymentMethodId: string` (UUID of an active payment method)
- `folioId: string` (UUID of an active folio)
- `items: SaleItemInput[]` (at least 1 item)

Each `SaleItemInput`:

- `productId: string` (UUID of an active product)
- `productPriceId: string` (UUID of a price belonging to `productId`)
- `quantity: number` (decimal `> 0`; max 14 integer + 4 decimal digits)

Optional body:

- `notes: string | null` (max 1000 chars)
- `quoteId: string | null` (UUID of an authorized, not-yet-converted quote; defaults to `null`)

The body MUST NOT include any explicit `isCredit` flag; the credit flow is activated automatically when the selected `paymentMethod` has `isCredit=true` (see "Credit flow auto-activation" below).

**Branch scoping**: callers without `branches:access_all` MUST pass `branchId === x-user-branch-id`; mismatch returns HTTP 403. Callers without an assigned branch (`x-user-branch-id` empty) and without `branches:access_all` return HTTP 403.

**Credit flow auto-activation**: after loading the `paymentMethod`, if `paymentMethod.isCredit === true`, the controller SHALL:

1. Verify the caller has `sales:create_credit`; otherwise HTTP 403 `{"error":"Forbidden","required":"sales:create_credit"}`.
2. Verify `customer.creditLimit !== null`; otherwise HTTP 409 `{"error":"CustomerHasNoCreditLine"}`.
3. Verify `customer.currentBalance + sale.total <= customer.creditLimit`; otherwise HTTP 409 `{"error":"CreditLimitExceeded","available":"<remaining>"}`.

These checks run AFTER total calculation but BEFORE folio allocation, all within the same transaction.

**`quoteId` validation when present**: identical to the prior version. The quote does NOT constrain whether the sale is cash or credit — the `paymentMethodId` of the conversion (which the converter accepts independently of the quote) decides.

**Atomic flow (inside a Prisma transaction)**:

1. Validate `customer.isActive`, `branch.isActive`, `paymentMethod.isActive`, `folio.isActive`. Any inactive → HTTP 400.
2. Load `paymentMethod.isCredit` (via `include` or join) so the downstream branching is consistent within the transaction.
3. If `quoteId` is non-null: validate per the rules above; failure → HTTP 400.
4. For each item: load the `Product` and `ProductPrice`; verify `productPrice.productId === item.productId` (else `ProductPriceMismatchError` → HTTP 400) and `productPrice` belongs to a product whose `isActive = true` (else HTTP 400). `quantity > 0` (else HTTP 400). The system MAY skip enforcement of `minQuantity` in v1 (documented).
5. Snapshot `productCodeSnapshot = product.code`, `productNameSnapshot = product.name`, `priceNameSnapshot = price.name`, `unitPrice = price.price`, `discountPct = price.discountPct`, `ivaRate = product.ivaRate`, `iepsRate = product.iepsRate`.
6. Compute totals using `SaleTotalsCalculator` (domain service).
7. If `paymentMethod.isCredit === true`: validate credit line and limit per above; on failure abort with HTTP 409.
8. Allocate the next folio number atomically: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. If `RETURNING` is empty (folio inactive) → HTTP 400.
9. For each item, decrement inventory: `UPDATE branch_inventory SET quantity = quantity - ${qty}, updated_at = NOW() WHERE branch_id = ? AND product_id = ?`. If the update affects 0 rows (no inventory record exists for this pair), the system SHALL `INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, -${qty})` (creates the record with negative initial quantity). The result `quantity` MAY be negative — this is the implementation of the rule "selling with stock 0 leaves negative quantity awaiting transfer".
10. Compute `paidAmount` and `paymentStatus`:
    - If `paymentMethod.isCredit === false`: `paidAmount = total`, `paymentStatus = 'paid'`.
    - If `paymentMethod.isCredit === true`: `paidAmount = 0`, `paymentStatus = 'pending'`.
11. `INSERT` the `sales` row with `status='completed'`, `completedAt=NOW()`, snapshotted folio info, `quote_id = quoteId` (or `null`), `paid_amount`, `payment_status`.
12. `INSERT` the `sale_items` rows.
13. If `paymentMethod.isCredit === true`: `UPDATE customers SET current_balance = current_balance + ? WHERE id = ?` (sale.customerId).
14. If `quoteId` non-null: `UPDATE quotes SET status='converted', converted_at=NOW(), converted_sale_id=<newSaleId> WHERE id = quoteId`.

Returns HTTP 201 with the `SaleDetailDto` (including items, `quoteId`, `paidAmount`, `paymentStatus`, and the derived `isCredit` from the JOIN).

#### Scenario: Successful cash sale
- **WHEN** an `operator` with `x-user-branch-id: B1` and `sales:create` sends a valid body for branch B1 with 2 items, selecting a `paymentMethod` whose `isCredit=false` (no `quoteId`)
- **THEN** the system returns HTTP 201 with the `SaleDetailDto` (`quoteId: null`, `isCredit: false`, `paidAmount: total`, `paymentStatus: 'paid'`), `branch_inventory.quantity` decremented by each item's quantity, and `folios.current_number` incremented by 1
- **AND** `customer.currentBalance` is NOT modified

#### Scenario: Successful credit sale via CREDITO payment method
- **WHEN** an `operator` with `sales:create` and `sales:create_credit` sends a body selecting the `paymentMethod` whose `code='CREDITO'` and `isCredit=true` for a customer with `creditLimit=10000`, `currentBalance=2000`, and the new sale `total=5000`
- **THEN** the system returns HTTP 201 with `paidAmount=0`, `paymentStatus='pending'`, `isCredit=true` (derived); `customer.currentBalance` becomes `7000` after the transaction commits

#### Scenario: Credit payment method selected without sales:create_credit
- **WHEN** a caller with `sales:create` (but NOT `sales:create_credit`) selects a `paymentMethod` whose `isCredit=true`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"sales:create_credit"}`

#### Scenario: Credit sale exceeds creditLimit
- **WHEN** the body selects a `paymentMethod` with `isCredit=true` for a customer with `creditLimit=10000`, `currentBalance=8000`, and `sale.total=5000`
- **THEN** the system returns HTTP 409 `{"error":"CreditLimitExceeded","available":"2000.0000"}`; nothing is persisted

#### Scenario: Credit sale for customer without credit line
- **WHEN** the body selects a `paymentMethod` with `isCredit=true` for a customer with `creditLimit=null`
- **THEN** the system returns HTTP 409 `{"error":"CustomerHasNoCreditLine"}`

#### Scenario: Successful sale with quoteId (cash)
- **WHEN** the body includes `quoteId: Q` and a `paymentMethod` whose `isCredit=false`, where `Q` is an authorized quote with `convertedSaleId: null` and matching `branchId`/`customerId`
- **THEN** the system returns HTTP 201 with `quoteId: Q`, `isCredit=false`, `paidAmount=total`, `paymentStatus='paid'`; and the quote row has `status='converted'`, `convertedSaleId=<newSaleId>`

#### Scenario: Conversion from quote to credit sale
- **WHEN** the body includes both `quoteId: Q` and a `paymentMethod` whose `isCredit=true`, and the caller has `sales:create_credit`
- **THEN** the system applies BOTH the quote conversion AND the credit flow: the sale has `quoteId=Q`, `isCredit=true` (derived), `paidAmount=0`, `paymentStatus='pending'`; `customer.currentBalance += total`; the quote is marked converted

#### Scenario: Invalid quoteId (already converted)
- **WHEN** the body includes `quoteId: Q` where `Q` has `status='converted'`
- **THEN** the system returns HTTP 400 `{"error": "Quote cannot be linked to a new sale", "status": "converted"}` and the transaction does not commit

#### Scenario: Invalid quoteId (draft)
- **WHEN** the body includes `quoteId: Q` where `Q` has `status='draft'`
- **THEN** the system returns HTTP 400 `{"error": "Quote cannot be linked to a new sale", "status": "draft"}`

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

### Requirement: Cancel sale
The system SHALL expose `POST /api/v1/admin/sales/:id/cancel`. Requires `sales:cancel`. Body MAY include `reason: string | null` (max 500 chars). Branch scoping applies (callers without `branches:access_all` can only cancel sales in their assigned branch).

Behavior (inside a Prisma transaction):

- If `sale.status === 'cancelled'`: the operation is idempotent — returns HTTP 200 with the unchanged `SaleDetailDto` and the original `cancelledAt`/`cancellationReason`.
- If `sale.status === 'completed'` or `'edited'`:
  1. Load `sale.paymentMethod.isCredit` (via JOIN/include) so the credit-aware logic is consistent within the transaction.
  2. **Pre-check active payments**: if `paymentMethod.isCredit === true` AND there is at least one `CustomerPayment` with `status='completed'` linked to this sale → HTTP 409 `{"error":"SaleHasActivePayments","paymentIds":["<id1>","<id2>",...]}`. The transaction does NOT commit. The operator MUST cancel each listed payment first.
  3. For each item, `UPDATE branch_inventory SET quantity = quantity + ${qty}, updated_at = NOW() WHERE branch_id = ? AND product_id = ?` (restores stock).
  4. If `paymentMethod.isCredit === true`: `UPDATE customers SET current_balance = current_balance - (sale.total - sale.paidAmount) WHERE id = sale.customerId`. (Since active payments are required to be already cancelled, `paidAmount` reflects only cancelled payments which don't affect balance — so this subtracts the original outstanding.)
  5. `UPDATE sales SET status='cancelled', cancelled_at=NOW(), cancellation_reason=?`.

The folio is NOT reusable — the folio number stays consumed. `paidAmount`, `paymentStatus`, `paymentMethodId` are preserved (frozen at the moment of cancellation; not reset).

**Interaction with returns**: cancelling a sale that has one or more `completed` returns DOES NOT cancel those returns and DOES NOT double-restore stock. The cancellation restores ONLY the stock matching the CURRENT `sale_items.quantity` (the original sold quantity). Returns continue to exist as standalone records; the operator who wants a fully clean state can cancel each return separately (which decrements stock back) BEFORE cancelling the sale. **Recommended order documented**: cancel returns first, then cancel the sale. The system does NOT enforce this order in v1 — if the sale is cancelled while completed returns exist, the resulting stock will be inflated relative to the post-return state by exactly the returned amount (the returns previously incremented stock; the cancel sale now also increments stock by the full sold quantity). Operators are expected to reconcile manually until a future change introduces a guard.

#### Scenario: Cancel completed cash sale
- **WHEN** an authorized caller cancels a `completed` sale whose `paymentMethod.isCredit=false` and items totalling X units
- **THEN** the system returns HTTP 200, the sale `status` becomes `cancelled`, and `branch_inventory.quantity` for each item is incremented by the respective quantity
- **AND** `customer.currentBalance` is NOT modified

#### Scenario: Cancel credit sale with no payments
- **WHEN** a `completed` sale has `paymentMethod.isCredit=true`, `total=1000`, `paidAmount=0`, and no `CustomerPayment` rows
- **THEN** the cancellation proceeds: stock restored, `customer.currentBalance -= 1000`, `sale.status='cancelled'`

#### Scenario: Cancel credit sale with active payments rejected
- **WHEN** a `completed` sale has `paymentMethod.isCredit=true` and 2 `CustomerPayment` rows with `status='completed'`
- **THEN** the system returns HTTP 409 `{"error":"SaleHasActivePayments","paymentIds":[...]}` and nothing is persisted

#### Scenario: Cancel credit sale with only cancelled payments
- **WHEN** a `completed` sale has `paymentMethod.isCredit=true`, two `CustomerPayment` rows both `status='cancelled'`, `paidAmount=0`
- **THEN** the cancellation proceeds normally (the cancelled payments do not block)

#### Scenario: Cancel idempotent
- **WHEN** the same sale is cancelled twice
- **THEN** the second call returns HTTP 200 with no further side effects; `cancelled_at` and `cancellation_reason` remain from the first call

#### Scenario: Cancel edited sale restores edited items
- **WHEN** a sale was previously edited (status `edited`) and is now cancelled
- **THEN** the system restores stock based on the items currently in `sale_items` (the post-edit version) and sets `status='cancelled'`

#### Scenario: Cancel sale with returns (inflation risk documented)
- **WHEN** a `completed` sale had 10 units of product P sold, a `completed` return was registered for 4 units (stock incremented by 4), and the sale is then cancelled
- **THEN** the sale cancellation increments stock by the full 10 sold units; net effect on inventory is `+14` from a pre-sale-pre-return baseline. The two `Return` rows are unaffected. The operator is expected to reconcile (typically by cancelling the return first; v1 does not enforce the order — see design.md Risks).

#### Scenario: Out-of-branch cancellation
- **WHEN** an `operator` in branch B1 tries to cancel a sale whose `branchId = B2` and the operator lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404

#### Scenario: Folio stays consumed
- **WHEN** a sale with `folio_number = 1024` is cancelled
- **THEN** the next emitted sale on the same folio takes `folio_number = 1025`, not `1024`

### Requirement: Edit completed sale (headquarters only)
The system SHALL expose `PATCH /api/v1/admin/sales/:id`. Requires `sales:edit_completed`. The body MUST include a complete `items: SaleItemInput[]` (the new version of the lines; min 1). Optional: `customerId`, `paymentMethodId`, `notes`. The body MUST NOT change `folioId`, `folioNumber`, `branchId`.

**Headquarters check (combined gate)**: before invoking the use case, the controller SHALL evaluate:

```
if (NOT user has 'branches:access_all') AND
   (x-user-branch-id is empty OR
    headquarters branch does not exist OR
    x-user-branch-id !== headquarters.id)
→ HTTP 403 {"error": "Sales can only be edited from the headquarters branch"}
```

That is: a caller with `branches:access_all` (admin) MAY edit from any branch; a caller without it MUST be assigned to the branch flagged `is_headquarters = TRUE`. Combined with the existing `sales:edit_completed` requirement, only an admin or a specially-granted user physically at HQ can edit.

Behavior (inside a Prisma transaction):

- If `sale.status === 'cancelled'` → HTTP 409 `{"error": "Cancelled sales cannot be edited"}`.
- **If the sale has one or more `CustomerPayment` rows with `status='completed'`** → HTTP 409 `{"error":"SaleHasActivePayments","paymentIds":[...]}`. The operator MUST cancel each listed payment first.
- Load the OLD `paymentMethod.isCredit` (from the current sale, before any change) AND the NEW `paymentMethod.isCredit` (if `paymentMethodId` changes in the body). Both flags govern the `currentBalance` delta below.
- Restore stock for each existing item: `UPDATE branch_inventory SET quantity = quantity + ${oldQty} WHERE branch_id = ? AND product_id = ?`.
- Delete all rows from `sale_items` for this `saleId`.
- Re-run the validation + snapshot + decrement + insert flow from "Create sale" using the new `items[]`.
- Recompute totals.
- Recompute `paidAmount` and `paymentStatus` according to the NEW `paymentMethod.isCredit`:
  - NEW `isCredit=false`: `paidAmount = newTotal`, `paymentStatus = 'paid'`.
  - NEW `isCredit=true`: `paidAmount = 0`, `paymentStatus = 'pending'`.
- Update `customer.currentBalance` by `(- oldOutstanding + newOutstanding)` where:
  - `oldOutstanding = (oldIsCredit ? oldTotal - oldPaidAmount : 0)`.
  - `newOutstanding = (newIsCredit ? newTotal : 0)`.
- If the NEW `paymentMethod.isCredit=true`, ALSO validate the credit limit (`customer.currentBalance + newOutstanding <= customer.creditLimit`) and the `sales:create_credit` permission of the caller; failure → HTTP 409/403 respectively.
- `UPDATE sales SET subtotal=?, tax_total=?, total=?, status='edited', edited_at=NOW(), customer_id=?, payment_method_id=?, notes=?, paid_amount=?, payment_status=?`. `folio_id`/`folio_number`/`folio_code`/`branch_id` are NOT changed.

#### Scenario: Admin edits ticket from any branch
- **WHEN** an `admin` (has `branches:access_all` and `sales:edit_completed`) PATCHes a completed cash sale (no payments) with a new items array
- **THEN** the system returns HTTP 200 with the recalculated `SaleDetailDto` and `status='edited'`

#### Scenario: Edit sale with active payments rejected
- **WHEN** the target sale has at least one `CustomerPayment` with `status='completed'`
- **THEN** the system returns HTTP 409 `{"error":"SaleHasActivePayments","paymentIds":[...]}` and nothing is persisted

#### Scenario: Edit credit sale recomputes balance
- **WHEN** a credit sale with `total=1000`, `paidAmount=0` (no active payments) is edited to a new `total=1200`, keeping the same credit `paymentMethodId`
- **THEN** `customer.currentBalance -= 1000` and `customer.currentBalance += 1200` net `+200`; the sale has `paidAmount=0`, `paymentStatus='pending'`

#### Scenario: Edit cash sale to credit
- **WHEN** a cash sale with `paymentMethod.isCredit=false`, `total=500` is edited to a new `paymentMethodId` whose `isCredit=true`, and the caller has `sales:create_credit`
- **THEN** the sale becomes credit: `paidAmount=0`, `paymentStatus='pending'`; `customer.currentBalance += newTotal` (since `oldOutstanding=0` because original was cash)

#### Scenario: Edit credit sale to cash
- **WHEN** a credit sale with `paymentMethod.isCredit=true`, `total=1000`, `paidAmount=0`, no active payments, is edited to a new `paymentMethodId` whose `isCredit=false`
- **THEN** the sale becomes cash: `paidAmount=newTotal`, `paymentStatus='paid'`; `customer.currentBalance -= 1000` (the original outstanding)

#### Scenario: Operator at HQ without sales:edit_completed
- **WHEN** an `operator` with `x-user-branch-id = HQ_id` (no `sales:edit_completed`) PATCHes a sale
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "sales:edit_completed"}`

#### Scenario: User with sales:edit_completed but not at HQ
- **WHEN** a user with `sales:edit_completed` but `x-user-branch-id != HQ_id` and without `branches:access_all` PATCHes a sale
- **THEN** the system returns HTTP 403 `{"error": "Sales can only be edited from the headquarters branch"}`

#### Scenario: Edit cancelled sale
- **WHEN** the target sale has `status='cancelled'`
- **THEN** the system returns HTTP 409 `{"error": "Cancelled sales cannot be edited"}` and does not commit

#### Scenario: Edit zeroes out items
- **WHEN** the body has `items: []`
- **THEN** the system returns HTTP 400 `{"error": "Sale must include at least one item"}` and does not commit

#### Scenario: Folio invariants preserved
- **WHEN** the body includes `folioId` or `folioNumber`
- **THEN** the system silently ignores those fields and persists the original folio data

#### Scenario: Branch invariant preserved
- **WHEN** the body includes `branchId` different from the sale's current `branch_id`
- **THEN** the system silently ignores it and persists the original `branch_id`

#### Scenario: Stock fully recomputed
- **WHEN** the original items consumed 5 units of product A and 0 of B, and the new items consume 0 of A and 3 of B
- **THEN** after the edit, `branch_inventory.quantity` for A is restored by 5 and for B is decremented by 3 (allowed to go negative)
