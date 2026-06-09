## MODIFIED Requirements

### Requirement: Sale aggregate model
The system SHALL persist a sale as the aggregate `Sale` (header) + `SaleItem` (lines) with the following invariants:

- `Sale.status` is one of `completed`, `cancelled`, `edited`. There is no `open`/`draft` state — the cart lives in the client.
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

---

### Requirement: List sales
The system SHALL expose `GET /api/v1/admin/sales` that returns a paginated list of sales. Requires the `sales:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `branchId` (optional UUID), `customerId` (optional UUID), `status` (optional, comma-separated; one or more of `completed`,`cancelled`,`edited`), `from` (optional ISO date — inclusive lower bound on `created_at`), `to` (optional ISO date — inclusive upper bound on `created_at`), `search` (optional, min 2 chars; matches `folio_code`, `folio_number::text`, or joined `customer.name`/`customer.rfc`).

Each `SaleDto` includes `id`, `folioId`, `folioCode`, `folioNumber`, `branchId`, `branchName` (joined), `customerId`, `customerName` (joined), `customerRfc` (joined), `cashierId`, `cashierName` (joined), `paymentMethodId`, `paymentMethodCode` (joined), `quoteId` (string or `null`), `status`, `subtotal`, `taxTotal`, `total`, `notes`, `completedAt`, `cancelledAt`, `cancellationReason`, `editedAt`, `createdAt`, `updatedAt`. `items` is NOT included in the list response.

Sorted by `created_at DESC`.

**Branch scoping**: if the caller does NOT have `branches:access_all`, the system SHALL behave as follows:

- If `?branchId=` is absent → the system implicitly applies `branchId = x-user-branch-id`. If `x-user-branch-id` is empty (user has no assigned branch), the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`.
- If `?branchId=<X>` is present and `X !== x-user-branch-id` → HTTP 403.

If the caller HAS `branches:access_all`:

- If `?branchId=` is absent → returns sales across all branches.
- If `?branchId=<X>` is present → filters to that branch.

#### Scenario: Operator lists own branch
- **WHEN** an `operator` with `x-user-branch-id: B1` (no `branches:access_all`) calls `GET /api/v1/admin/sales`
- **THEN** the system implicitly filters to `branchId = B1` and returns HTTP 200, including `quoteId` for each row (or `null` if the sale was direct)

#### Scenario: Operator tries another branch
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/sales?branchId=B2`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: Admin lists all branches
- **WHEN** an `admin` (has `branches:access_all`) calls `GET /api/v1/admin/sales`
- **THEN** the system returns sales from all branches

#### Scenario: Operator without branch tries to list
- **WHEN** an `operator` with `x-user-branch-id: ""` (no branch assigned) calls `GET /api/v1/admin/sales` without `?branchId=`
- **THEN** the system returns HTTP 403

#### Scenario: Filter by date range
- **WHEN** the request includes `?from=2026-01-01&to=2026-01-31`
- **THEN** only sales with `created_at` within that range are returned

#### Scenario: Filter by multiple statuses
- **WHEN** the request includes `?status=completed,edited`
- **THEN** the response excludes sales whose status is `cancelled`

#### Scenario: Search by folio number
- **WHEN** the request includes `?search=1024`
- **THEN** sales whose `folio_number = 1024` OR whose `folio_code` contains "1024" are included

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
- `productPriceId: string` (UUID of a price belonging to `productId`)
- `quantity: number` (decimal `> 0`; max 14 integer + 4 decimal digits)

Optional body:

- `notes: string | null` (max 1000 chars)
- `quoteId: string | null` (UUID of an authorized, not-yet-converted quote; defaults to `null`)

**Branch scoping**: callers without `branches:access_all` MUST pass `branchId === x-user-branch-id`; mismatch returns HTTP 403. Callers without an assigned branch (`x-user-branch-id` empty) and without `branches:access_all` return HTTP 403.

**`quoteId` validation when present**: if the body includes a non-null `quoteId`, the controller SHALL:

1. Load the quote; if it does not exist → HTTP 400 `{"error": "Quote not found"}`.
2. Verify `quote.status === 'authorized'` AND `quote.convertedSaleId === null`. If not → HTTP 400 `{"error": "Quote cannot be linked to a new sale", "status": "<actual>"}`.
3. Verify `quote.branchId === branchId` and `quote.customerId === customerId` (the sale's branch/customer must match the quote's; mismatch → HTTP 400). The quote does NOT constrain `paymentMethodId`, `folioId`, or `items` — those are governed by the sale body.
4. Persist `sale.quoteId = quoteId`; ALSO update the quote in the same transaction: `quote.status='converted'`, `quote.convertedAt=NOW()`, `quote.convertedSaleId=<newSaleId>` (this keeps both sides consistent regardless of whether the caller used `POST /sales` or `POST /quotes/:id/convert`).

This path is offered for advanced integrations (e.g., a script that emits sales from external systems). The normal UI flow uses `POST /api/v1/admin/quotes/:id/convert` which delegates to the same persistence pipeline.

**Atomic flow (inside a Prisma transaction)**:

1. Validate `customer.isActive`, `branch.isActive`, `paymentMethod.isActive`, `folio.isActive`. Any inactive → HTTP 400.
2. If `quoteId` is non-null: validate per the rules above; failure → HTTP 400.
3. For each item: load the `Product` and `ProductPrice`; verify `productPrice.productId === item.productId` (else `ProductPriceMismatchError` → HTTP 400) and `productPrice` belongs to a product whose `isActive = true` (else HTTP 400). `quantity > 0` (else HTTP 400). The system MAY skip enforcement of `minQuantity` in v1 (documented).
4. Snapshot `productCodeSnapshot = product.code`, `productNameSnapshot = product.name`, `priceNameSnapshot = price.name`, `unitPrice = price.price`, `discountPct = price.discountPct`, `ivaRate = product.ivaRate`, `iepsRate = product.iepsRate`.
5. Compute totals using `SaleTotalsCalculator` (domain service).
6. Allocate the next folio number atomically: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. If `RETURNING` is empty (folio inactive) → HTTP 400.
7. For each item, decrement inventory: `UPDATE branch_inventory SET quantity = quantity - ${qty}, updated_at = NOW() WHERE branch_id = ? AND product_id = ?`. If the update affects 0 rows (no inventory record exists for this pair), the system SHALL `INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, -${qty})` (creates the record with negative initial quantity). The result `quantity` MAY be negative — this is the implementation of the rule "selling with stock 0 leaves negative quantity awaiting transfer".
8. `INSERT` the `sales` row with `status='completed'`, `completedAt=NOW()`, snapshotted folio info, and `quote_id = quoteId` (or `null`).
9. `INSERT` the `sale_items` rows.
10. If `quoteId` non-null: `UPDATE quotes SET status='converted', converted_at=NOW(), converted_sale_id=<newSaleId> WHERE id = quoteId`.

Returns HTTP 201 with the `SaleDetailDto` (including items and `quoteId`).

#### Scenario: Successful sale
- **WHEN** an `operator` with `x-user-branch-id: B1` and `sales:create` sends a valid body for branch B1 with 2 items (no `quoteId`)
- **THEN** the system returns HTTP 201 with the `SaleDetailDto` (`quoteId: null`), `branch_inventory.quantity` decremented by each item's quantity, and `folios.current_number` incremented by 1

#### Scenario: Successful sale with quoteId
- **WHEN** the body includes `quoteId: Q` where `Q` is an authorized quote with `convertedSaleId: null` and matching `branchId`/`customerId`
- **THEN** the system returns HTTP 201 with `quoteId: Q`, and the quote row has `status='converted'`, `convertedSaleId=<newSaleId>`

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

#### Scenario: customerBalance does not mutate
- **WHEN** the customer's `current_balance = 1500` before emission
- **THEN** after a successful emission the customer's `current_balance` is still `1500`

#### Scenario: Forbidden without sales:create
- **WHEN** a caller without `sales:create` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "sales:create"}`

---

### Requirement: Get sale detail
The system SHALL expose `GET /api/v1/admin/sales/:id` that returns a single sale with its items. Requires `sales:read`. Returns HTTP 404 if not found. Branch scoping applies (a caller without `branches:access_all` can only fetch sales whose `branchId === x-user-branch-id`; otherwise HTTP 403).

`SaleDetailDto` extends `SaleDto` with `items: SaleItemDto[]`, each including `id`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineTax`, `lineTotal`. The DTO includes `quoteId` (string or `null`).

#### Scenario: Authorized fetch
- **WHEN** a caller with `sales:read` and access to the sale's branch fetches a valid `:id`
- **THEN** the system returns HTTP 200 with the `SaleDetailDto` (including `quoteId`)

#### Scenario: Out-of-branch fetch
- **WHEN** a caller without `branches:access_all` fetches a sale whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404 `{"error": "Sale not found"}`

---

### Requirement: SaleRepository.createCompletedFromQuote (conversion bridge)
The system SHALL extend `SaleRepository` with a method `createCompletedFromQuote(input, tx)` that:

- Accepts an open Prisma transaction handle `tx` (so the caller — typically `ConvertQuoteToSaleUseCase` — orchestrates the outer transaction that also updates the quote).
- Accepts an input including `branchId`, `customerId`, `paymentMethodId`, `folioId`, `cashierId`, `notes`, `quoteId`, and a pre-snapshotted `items: SaleItemSnapshotInput[]` (each item carries `productId`, `productPriceId`, `quantity`, `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate` — values copied from the quote's `quote_items`, NOT re-resolved from the catalog).
- Reuses the same SQL plan as `createCompleted`: atomic folio increment via `UPDATE folios ... RETURNING`, per-item `UPDATE branch_inventory ... SET quantity = quantity - qty WHERE branch_id = ? AND product_id = ?` falling back to `INSERT branch_inventory (..., -qty)` when no row exists, `INSERT sales (..., quote_id=<quoteId>)`, `INSERT sale_items`.
- Computes totals from the snapshotted unit prices using `SaleTotalsCalculator` (since the snapshots are authoritative for cotization-derived sales).
- Returns the same `SaleDetailDto` shape as `createCompleted`.

The original `createCompleted` SHALL remain unchanged and continues to be used by `POST /api/v1/admin/sales` for direct sale emission.

#### Scenario: Conversion preserves snapshot prices
- **WHEN** `createCompletedFromQuote` is invoked with snapshot `unitPrice: 12.50`, and the current catalog price for that `productPriceId` is `13.00`
- **THEN** the resulting `sale_item.unit_price = 12.50` (the snapshot wins; the conversion does NOT re-resolve from the catalog)

#### Scenario: Conversion uses fiscal folio
- **WHEN** `createCompletedFromQuote` is invoked with `folioId = F_fiscal`
- **THEN** `F_fiscal.current_number` is incremented by 1 and the resulting `sale.folioId = F_fiscal`; the quote's folio (which is a different folio entirely) is NOT touched

#### Scenario: Conversion decrements inventory
- **WHEN** `createCompletedFromQuote` is invoked for an item `{ productId: P, quantity: 5 }` and the current `branch_inventory.quantity` for (branch, P) is `10`
- **THEN** after the call, `branch_inventory.quantity` is `5`

#### Scenario: Conversion allows negative stock
- **WHEN** `createCompletedFromQuote` is invoked for an item with `quantity = 30` and current inventory is `0`
- **THEN** the resulting inventory is `-30` (no rejection, same rule as direct POS sales)
