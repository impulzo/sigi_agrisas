## ADDED Requirements

### Requirement: Sale aggregate model
The system SHALL persist a sale as the aggregate `Sale` (header) + `SaleItem` (lines) with the following invariants:

- `Sale.status` is one of `completed`, `cancelled`, `edited`. There is no `open`/`draft` state — the cart lives in the client.
- `Sale` references `branchId`, `customerId`, `cashierId` (the authenticated user who emitted the sale), `paymentMethodId`, `folioId`. All FKs `ON DELETE RESTRICT` (cancelling these catalog rows requires reassigning or archiving sales first).
- `Sale.folioNumber` is an integer assigned atomically at emission; `(folioId, folioNumber)` is UNIQUE.
- `Sale.folioCode` is a snapshot of the folio's `code` (and `prefix` when present, concatenated as `"${prefix}${number}"` or `"${code}-${number}"` per implementation choice — documented in `pos-api`).
- `Sale.subtotal`, `Sale.taxTotal`, `Sale.total` are persisted (computed at emission).
- Each `SaleItem` snapshots `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate` so the ticket survives later changes to the catalog. `productId` (FK `ON DELETE RESTRICT`) and `productPriceId` (FK `ON DELETE SET NULL`) are retained for reporting.
- Each `SaleItem` persists `lineSubtotal`, `lineTax`, `lineTotal`.

#### Scenario: Snapshot survives product rename
- **WHEN** a sale is completed for product `ARROZ_001 ("Arroz 1kg")`, and later the product is renamed to `"Arroz Integral 1kg"`
- **THEN** `GET /api/v1/admin/sales/:id` for the prior sale still returns `productNameSnapshot: "Arroz 1kg"` on that line

#### Scenario: Snapshot survives price deletion
- **WHEN** a sale is completed using `productPriceId = X`, and later the price `X` is hard-deleted via `DELETE /products/:id/prices/:priceId`
- **THEN** `GET /api/v1/admin/sales/:id` still returns the persisted `unitPrice`, `discountPct`, and `priceNameSnapshot` from when the sale was emitted, with `productPriceId: null` in the response

---

### Requirement: List sales
The system SHALL expose `GET /api/v1/admin/sales` that returns a paginated list of sales. Requires the `sales:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `branchId` (optional UUID), `customerId` (optional UUID), `status` (optional, comma-separated; one or more of `completed`,`cancelled`,`edited`), `from` (optional ISO date — inclusive lower bound on `created_at`), `to` (optional ISO date — inclusive upper bound on `created_at`), `search` (optional, min 2 chars; matches `folio_code`, `folio_number::text`, or joined `customer.name`/`customer.rfc`).

Each `SaleDto` includes `id`, `folioId`, `folioCode`, `folioNumber`, `branchId`, `branchName` (joined), `customerId`, `customerName` (joined), `customerRfc` (joined), `cashierId`, `cashierName` (joined), `paymentMethodId`, `paymentMethodCode` (joined), `status`, `subtotal`, `taxTotal`, `total`, `notes`, `completedAt`, `cancelledAt`, `cancellationReason`, `editedAt`, `createdAt`, `updatedAt`. `items` is NOT included in the list response.

Sorted by `created_at DESC`.

**Branch scoping**: if the caller does NOT have `branches:access_all`, the system SHALL behave as follows:

- If `?branchId=` is absent → the system implicitly applies `branchId = x-user-branch-id`. If `x-user-branch-id` is empty (user has no assigned branch), the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`.
- If `?branchId=<X>` is present and `X !== x-user-branch-id` → HTTP 403.

If the caller HAS `branches:access_all`:

- If `?branchId=` is absent → returns sales across all branches.
- If `?branchId=<X>` is present → filters to that branch.

#### Scenario: Operator lists own branch
- **WHEN** an `operator` with `x-user-branch-id: B1` (no `branches:access_all`) calls `GET /api/v1/admin/sales`
- **THEN** the system implicitly filters to `branchId = B1` and returns HTTP 200

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

### Requirement: Get sale detail
The system SHALL expose `GET /api/v1/admin/sales/:id` that returns a single sale with its items. Requires `sales:read`. Returns HTTP 404 if not found. Branch scoping applies (a caller without `branches:access_all` can only fetch sales whose `branchId === x-user-branch-id`; otherwise HTTP 403).

`SaleDetailDto` extends `SaleDto` with `items: SaleItemDto[]`, each including `id`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineTax`, `lineTotal`.

#### Scenario: Authorized fetch
- **WHEN** a caller with `sales:read` and access to the sale's branch fetches a valid `:id`
- **THEN** the system returns HTTP 200 with the `SaleDetailDto`

#### Scenario: Out-of-branch fetch
- **WHEN** a caller without `branches:access_all` fetches a sale whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404 `{"error": "Sale not found"}`

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

Optional body: `notes: string | null` (max 1000 chars).

**Branch scoping**: callers without `branches:access_all` MUST pass `branchId === x-user-branch-id`; mismatch returns HTTP 403. Callers without an assigned branch (`x-user-branch-id` empty) and without `branches:access_all` return HTTP 403.

**Atomic flow (inside a Prisma transaction)**:

1. Validate `customer.isActive`, `branch.isActive`, `paymentMethod.isActive`, `folio.isActive`. Any inactive → HTTP 400.
2. For each item: load the `Product` and `ProductPrice`; verify `productPrice.productId === item.productId` (else `ProductPriceMismatchError` → HTTP 400) and `productPrice` belongs to a product whose `isActive = true` (else HTTP 400). `quantity > 0` (else HTTP 400). The system MAY skip enforcement of `minQuantity` in v1 (documented).
3. Snapshot `productCodeSnapshot = product.code`, `productNameSnapshot = product.name`, `priceNameSnapshot = price.name`, `unitPrice = price.price`, `discountPct = price.discountPct`, `ivaRate = product.ivaRate`, `iepsRate = product.iepsRate`.
4. Compute totals using `SaleTotalsCalculator` (domain service).
5. Allocate the next folio number atomically: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. If `RETURNING` is empty (folio inactive) → HTTP 400.
6. For each item, decrement inventory: `UPDATE branch_inventory SET quantity = quantity - ${qty}, updated_at = NOW() WHERE branch_id = ? AND product_id = ?`. If the update affects 0 rows (no inventory record exists for this pair), the system SHALL `INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, -${qty})` (creates the record with negative initial quantity). The result `quantity` MAY be negative — this is the implementation of the rule "selling with stock 0 leaves negative quantity awaiting transfer".
7. `INSERT` the `sales` row with `status='completed'`, `completedAt=NOW()`, and snapshotted folio info.
8. `INSERT` the `sale_items` rows.

Returns HTTP 201 with the `SaleDetailDto` (including items).

#### Scenario: Successful sale
- **WHEN** an `operator` with `x-user-branch-id: B1` and `sales:create` sends a valid body for branch B1 with 2 items
- **THEN** the system returns HTTP 201 with the `SaleDetailDto`, `branch_inventory.quantity` decremented by each item's quantity, and `folios.current_number` incremented by 1

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

### Requirement: Cancel sale
The system SHALL expose `POST /api/v1/admin/sales/:id/cancel`. Requires `sales:cancel`. Body MAY include `reason: string | null` (max 500 chars). Branch scoping applies (callers without `branches:access_all` can only cancel sales in their assigned branch).

Behavior (inside a Prisma transaction):

- If `sale.status === 'cancelled'`: the operation is idempotent — returns HTTP 200 with the unchanged `SaleDetailDto` and the original `cancelledAt`/`cancellationReason`.
- If `sale.status === 'completed'` or `'edited'`: for each item, `UPDATE branch_inventory SET quantity = quantity + ${qty}, updated_at = NOW() WHERE branch_id = ? AND product_id = ?` (restores stock). Then `UPDATE sales SET status='cancelled', cancelled_at=NOW(), cancellation_reason=?`.

The folio is NOT reusable — the folio number stays consumed.

#### Scenario: Cancel completed sale
- **WHEN** an authorized caller cancels a `completed` sale with items totalling X units
- **THEN** the system returns HTTP 200, the sale `status` becomes `cancelled`, and `branch_inventory.quantity` for each item is incremented by the respective quantity

#### Scenario: Cancel idempotent
- **WHEN** the same sale is cancelled twice
- **THEN** the second call returns HTTP 200 with no further side effects; `cancelled_at` and `cancellation_reason` remain from the first call

#### Scenario: Cancel edited sale restores edited items
- **WHEN** a sale was previously edited (status `edited`) and is now cancelled
- **THEN** the system restores stock based on the items currently in `sale_items` (the post-edit version) and sets `status='cancelled'`

#### Scenario: Out-of-branch cancellation
- **WHEN** an `operator` in branch B1 tries to cancel a sale whose `branchId = B2` and the operator lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404

#### Scenario: Folio stays consumed
- **WHEN** a sale with `folio_number = 1024` is cancelled
- **THEN** the next emitted sale on the same folio takes `folio_number = 1025`, not `1024`

---

### Requirement: Edit completed sale (headquarters only)
The system SHALL expose `PATCH /api/v1/admin/sales/:id`. Requires `sales:edit_completed`. The body MUST include a complete `items: SaleItemInput[]` (the new version of the lines; min 1). Optional: `customerId`, `paymentMethodId`, `notes`. The body MUST NOT change `folioId`, `folioNumber`, or `branchId`.

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
- Restore stock for each existing item: `UPDATE branch_inventory SET quantity = quantity + ${oldQty} WHERE branch_id = ? AND product_id = ?`.
- Delete all rows from `sale_items` for this `saleId`.
- Re-run the validation + snapshot + decrement + insert flow from "Create sale" using the new `items[]`.
- Recompute totals and `UPDATE sales SET subtotal=?, tax_total=?, total=?, status='edited', edited_at=NOW(), customer_id=?, payment_method_id=?, notes=?`. `folio_id`/`folio_number`/`folio_code`/`branch_id` are NOT changed.

#### Scenario: Admin edits ticket from any branch
- **WHEN** an `admin` (has `branches:access_all` and `sales:edit_completed`) PATCHes a completed sale with a new items array
- **THEN** the system returns HTTP 200 with the recalculated `SaleDetailDto` and `status='edited'`

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

---

### Requirement: SaleTotalsCalculator (domain service)
The system SHALL provide a pure domain service `SaleTotalsCalculator` in `src/modules/pos/domain/services/SaleTotalsCalculator.ts` with a static method:

```
computeTotals(lines: SaleLineInput[]): SaleTotalsResult
```

`SaleLineInput`: `{ quantity, unitPrice, discountPct?, ivaRate?, iepsRate? }` — all decimals; `discountPct` defaults to `0` when absent; `ivaRate`/`iepsRate` default to `0` when `null`/absent.

`SaleTotalsResult`: `{ lines: SaleLineTotals[], subtotal, taxTotal, total }`. Each `SaleLineTotals`: `{ lineSubtotal, lineIva, lineIeps, lineTax, lineTotal }`.

Formula per line:

```
lineSubtotal = round(quantity * unitPrice * (1 - discountPct / 100), 4)
lineIva       = round(lineSubtotal * ivaRate, 4)
lineIeps      = round(lineSubtotal * iepsRate, 4)
lineTax       = lineIva + lineIeps
lineTotal     = lineSubtotal + lineTax
```

Header totals are the sum across lines for `lineSubtotal`, `lineTax`, `lineTotal` respectively (mapped to `subtotal`, `taxTotal`, `total`). Rounding uses banker's rounding (half-to-even) at 4 decimal places. The service SHALL throw if `quantity <= 0`, `unitPrice < 0`, `discountPct < 0 || discountPct > 100`, `ivaRate < 0 || ivaRate > 1`, or `iepsRate < 0 || iepsRate > 1`. No I/O dependencies (no Prisma, no fetch).

#### Scenario: Simple line
- **WHEN** `computeTotals([{ quantity: 2, unitPrice: 100, ivaRate: 0.16 }])` is invoked
- **THEN** the result has `lineSubtotal = 200`, `lineIva = 32`, `lineTax = 32`, `lineTotal = 232`, `subtotal = 200`, `taxTotal = 32`, `total = 232`

#### Scenario: With discount
- **WHEN** `computeTotals([{ quantity: 1, unitPrice: 100, discountPct: 10 }])` is invoked
- **THEN** `lineSubtotal = 90`, `lineTotal = 90`

#### Scenario: With IVA and IEPS
- **WHEN** `computeTotals([{ quantity: 1, unitPrice: 100, ivaRate: 0.16, iepsRate: 0.08 }])` is invoked
- **THEN** `lineIva = 16`, `lineIeps = 8`, `lineTax = 24`, `lineTotal = 124`

#### Scenario: Null rates treated as zero
- **WHEN** `computeTotals([{ quantity: 1, unitPrice: 100, ivaRate: null, iepsRate: null }])` is invoked
- **THEN** `lineTax = 0`, `lineTotal = 100`

#### Scenario: Multi-line aggregation
- **WHEN** `computeTotals([{quantity:1,unitPrice:100,ivaRate:0.16}, {quantity:2,unitPrice:50}])` is invoked
- **THEN** `subtotal = 200`, `taxTotal = 16`, `total = 216`

#### Scenario: Domain purity
- **WHEN** unit tests run against the calculator
- **THEN** no Prisma, no fetch, no environment access is required

#### Scenario: Invalid input rejected
- **WHEN** `computeTotals([{ quantity: 0, unitPrice: 100 }])` is invoked
- **THEN** the method throws a validation error

---

### Requirement: Branch scoping pattern for sale endpoints
Every route handler in `pos-api` that operates on a sale or on a branch-specific listing SHALL enforce the following scoping pattern using `x-user-branch-id` (from middleware) and `branches:access_all` (via `AuthorizationService.userCan`):

```
const bypass = await authz.userCan(userId, "branches:access_all");
if (!bypass) {
  const userBranch = req.headers.get("x-user-branch-id") ?? "";
  if (userBranch === "" || resourceBranchId !== userBranch) {
    return 403 { error: "Forbidden", required: "branches:access_all" };
  }
}
```

`resourceBranchId` is either: (a) the `branchId` in the request body/query for creates and listings, or (b) the `branchId` joined from the persisted sale for reads/updates/cancels/edits. Reads MUST resolve the sale's `branchId` BEFORE applying the check (so a 403 is not used as an existence oracle; if the sale does not exist, return 404 first).

#### Scenario: Resource leak prevented
- **WHEN** an unauthorized user requests `GET /api/v1/admin/sales/<id-of-sale-in-other-branch>`
- **THEN** the system returns HTTP 403 (not 200, not 404) only if the sale exists; if it does not exist, returns HTTP 404 (existence is revealed only to anyone with permission to look)

#### Scenario: Listing default
- **WHEN** an `operator` with `branchId=B1` (no bypass) calls `GET /api/v1/admin/sales` without `?branchId=`
- **THEN** the listing is implicitly scoped to `B1`

#### Scenario: Listing without assigned branch
- **WHEN** a user without `branches:access_all` and without a `branchId` calls `GET /api/v1/admin/sales` without `?branchId=`
- **THEN** the system returns HTTP 403
