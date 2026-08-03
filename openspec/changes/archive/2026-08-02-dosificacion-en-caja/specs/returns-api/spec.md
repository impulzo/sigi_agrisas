## MODIFIED Requirements

### Requirement: Return aggregate model
The system SHALL persist a product return as the aggregate `Return` (header) + `ReturnItem` (lines) with the following invariants:

- `Return.status` is one of `completed`, `cancelled`. There is no `draft` state — the return cart lives in the client. Transitions are:
  - `(created) → completed` (at `POST /returns`, atomically; never persisted as `draft`).
  - `completed → cancelled` (via `POST /returns/:id/cancel`). Terminal: no further transitions allowed.
- `Return` references `saleId` (the originating ticket; FK `ON DELETE RESTRICT`), `branchId` (snapshot of `sale.branchId`, immutable), `customerId` (snapshot of `sale.customerId`, nullable; FK `ON DELETE SET NULL`), `creatorId` (the authenticated user who registered the return; FK `ON DELETE RESTRICT`), `cancelledBy` (nullable; FK `ON DELETE SET NULL`).
- `Return.reason` is a required `TEXT` field with `length BETWEEN 3 AND 500` chars. Free text (no enum) in v1.
- `Return.returnedAt` is a required `TIMESTAMP(3)`. SHALL be `<= NOW()` at creation time. There is NO lower bound against `sale.completedAt` in v1 (operators may backdate captures).
- `Return.notes` is nullable, max 1000 chars.
- `Return.cancelledAt` and `Return.cancellationReason` are populated only when the cancellation occurs.
- `Return.refundSubtotal`, `Return.refundTax`, `Return.refundTotal` are persisted as `DECIMAL(14, 4)` and computed at creation from the snapshotted line totals.
- Each `ReturnItem` references `returnId` (FK `ON DELETE CASCADE`), `saleItemId` (FK `ON DELETE RESTRICT`; the link is required so the system can validate "this line belongs to the linked sale"), `productId` (FK `ON DELETE RESTRICT`), `productPriceId` (nullable; FK `ON DELETE SET NULL`).
- Each `ReturnItem` snapshots `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate` so the return is intact even if the sale, product, or price are later edited or deleted.
- Each `ReturnItem` persists `quantity` (`DECIMAL(14, 4)`, the quantity returned for that sale line — strictly `> 0`), `lineSubtotal`, `lineTax`, `lineTotal` (refund amounts; same formula as the sale's `SaleTotalsCalculator`).
- The combination `(saleItemId)` MAY appear multiple times across different `Return` rows for the same `saleId` (partial returns done in multiple visits are allowed). The system enforces "sum of `quantity` across active (`status='completed'`) returns ≤ `sale_item.quantity`" via the `ReturnableQuantityCalculator` at write time.
- **Dosification lines**: when the originating `SaleItem` has a non-null `dosificationId`/`numPartsSnapshot` (see `pos-api` "Sale aggregate model"), the corresponding `ReturnItem` SHALL copy both `dosificationId` (nullable FK to `product_dosifications`, `ON DELETE SET NULL`) and `numPartsSnapshot` (nullable `INT`) from the sale item at return-creation time — same snapshot pattern already used for `priceNameSnapshot`/`productCodeSnapshot`. `ReturnItem.quantity` for such a line represents parts returned, consistent with the sale line's unit (parts, not base units). `ReturnableQuantityCalculator` compares `quantity` (parts) against `sale_item.quantity` (parts) unchanged — no conversion needed there, since both sides are already expressed in the same unit (parts).
- **Inventory quantity for dosification lines**: any operation that moves `branch_inventory.quantity` from a `ReturnItem` (creation, cancellation) SHALL use `quantity / numPartsSnapshot` as the base-unit amount when `numPartsSnapshot` is non-null, instead of `quantity` directly — mirrors the same rule on the sale side.

#### Scenario: Snapshot survives product rename
- **WHEN** a return is registered for product `SAC_50KG ("Saco 50kg")`, and later the product is renamed to `"Saco 50kg Mix Premium"`
- **THEN** `GET /api/v1/admin/returns/:id` for the prior return still returns `productNameSnapshot: "Saco 50kg"` on that line

#### Scenario: Snapshot survives sale item deletion path (theoretical)
- **WHEN** the FK from `return_items.sale_item_id` is `ON DELETE RESTRICT` and a request attempts to delete the underlying `sale_item` row (via SQL or a future module)
- **THEN** the delete fails because at least one return references that line

#### Scenario: Dosification return copies numPartsSnapshot
- **WHEN** a return is registered for a sale line whose `numPartsSnapshot=4`
- **THEN** the resulting `return_items` row has `numPartsSnapshot=4` and the same `dosificationId` as the sale line

---

### Requirement: Create return (atomic registration)
The system SHALL expose `POST /api/v1/admin/returns` that registers a completed return in a single transaction. Requires `returns:create`.

Required body:

- `saleId: string` (UUID of an existing `Sale` with `status='completed'`)
- `reason: string` (min 3, max 500 chars; trimmed)
- `returnedAt: string` (ISO 8601 timestamp; SHALL be `<= NOW()`)
- `items: ReturnItemInput[]` (at least 1 item)

Each `ReturnItemInput`:

- `saleItemId: string` (UUID; SHALL belong to the linked `saleId`)
- `quantity: number` (decimal `> 0`; max 14 integer + 4 decimal digits). For a sale line originating from a dosification, this is parts returned (same unit as the sale line's `quantity`), not base units.

Optional body:

- `notes: string | null` (max 1000 chars)

The body SHALL NOT accept `branchId` or `customerId`: both are inherited from the linked sale.

**Branch scoping**: the controller resolves `sale.branchId` and applies the standard guard:
```
const bypass = await authz.userCan(userId, "branches:access_all");
if (!bypass && sale.branchId !== x-user-branch-id) return 403;
```

**Atomic flow (inside a Prisma transaction)**:

1. Load the sale via `saleRepo.findByIdWithItems(saleId)`; if it does not exist → HTTP 400 `{"error": "Sale not found"}` (not 404, since the body validation is failing).
2. Verify `sale.status === 'completed'`; if `cancelled` or `edited` → HTTP 409 `SaleNotReturnableError(status)` `{"error": "Sale is not returnable", "status": "<actual>"}`. (See pos-api Modified Requirement "Get sale detail" — `edited` is rejected in v1.)
3. Apply branch scoping (above); fail with 403 if violated.
4. Verify `items.length >= 1`; empty → HTTP 400 `EmptyReturnError`.
5. For each item:
   a. Verify `saleItemId` belongs to `sale.items` (else HTTP 400 `SaleItemNotPartOfSaleError`).
   b. Load all prior return_items for this `saleItemId` (any status) via the repo.
   c. `remaining = ReturnableQuantityCalculator.computeRemaining(saleItem.quantity, priorReturnItems)` — both `saleItem.quantity` and prior `return_items.quantity` are already in the same unit (parts for dosification lines, base units otherwise); no conversion needed at this step.
   d. If `item.quantity > remaining` → HTTP 409 `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)` with body `{"error": "Return quantity exceeds remaining", "saleItemId": "<id>", "requested": <n>, "remaining": <n>}`.
6. Snapshot per line from the corresponding `sale_item`: `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, and — when the sale item has them — `dosificationId`, `numPartsSnapshot`.
7. Compute totals using `ReturnTotalsCalculator` — unchanged by dosification lines.
8. For each item, INCREMENT inventory atomically using the base-unit amount (`quantity / numPartsSnapshot` when the sale item has a dosification, `quantity` otherwise):
   ```
   UPDATE branch_inventory
   SET quantity = quantity + ${amount}, updated_at = NOW()
   WHERE branch_id = ? AND product_id = ?
   ```
   If `UPDATE` affects 0 rows (no inventory record exists for this pair), the system SHALL `INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ${amount})` (creates the record with the returned amount as initial).
9. `INSERT` the `returns` row with `status='completed'`, snapshotted `branchId`/`customerId` from the sale, `creatorId = userId`, `returnedAt = body.returnedAt`, `reason`, `notes`, refund totals.
10. `INSERT` the `return_items` rows (including `dosificationId`/`numPartsSnapshot` when applicable).

Returns HTTP 201 with the `ReturnDetailDto` (including items).

#### Scenario: Successful partial return
- **WHEN** an `operator` with `x-user-branch-id: B1` and `returns:create` posts `{ saleId, reason: "Producto defectuoso", returnedAt: "2026-06-02T10:00:00Z", items: [{ saleItemId, quantity: 2 }] }` for a sale whose item has `quantity: 10` and no prior returns
- **THEN** the system returns HTTP 201, `branch_inventory.quantity` for that product is incremented by 2, and the return row is `status='completed'` with `refundTotal` matching the line's prorated total

#### Scenario: Successful full return
- **WHEN** the body returns all of every line's remaining quantity
- **THEN** the system returns HTTP 201; the sale row is NOT modified (status stays `completed`); subsequent `POST /returns` with any item from this sale rejects with `ReturnQuantityExceedsRemainingError`

#### Scenario: Multiple partial returns over time
- **WHEN** a sale line had `quantity=10`, a first return for 3 was completed yesterday, and today a second return for 5 is posted
- **THEN** the second return succeeds (`3 + 5 = 8 <= 10`) and inventory is incremented by 5

#### Scenario: Exceeds remaining
- **WHEN** the requested `quantity` for a line is greater than `remaining`
- **THEN** the system returns HTTP 409 `{"error": "Return quantity exceeds remaining", "saleItemId": "<id>", "requested": 7, "remaining": 4}` and the transaction does not commit

#### Scenario: Cancelled return does not count toward remaining
- **WHEN** a prior return for a line was cancelled, and a new return requests up to the original sold quantity
- **THEN** the new return succeeds — cancelled return quantities do NOT reduce remaining

#### Scenario: Sale is cancelled
- **WHEN** the linked sale has `status='cancelled'`
- **THEN** the system returns HTTP 409 `{"error": "Sale is not returnable", "status": "cancelled"}` and the transaction does not commit

#### Scenario: Sale is edited (v1)
- **WHEN** the linked sale has `status='edited'`
- **THEN** the system returns HTTP 409 `{"error": "Sale is not returnable", "status": "edited"}` — v1 only accepts `completed` (see design.md Decision 6 trade-offs)

#### Scenario: Branch scoping violation
- **WHEN** an `operator` with `x-user-branch-id: B1` posts a return for a sale whose `branchId: B2` and lacks `branches:access_all`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: SaleItem from another sale
- **WHEN** the body's `saleItemId` belongs to a sale OTHER than `saleId`
- **THEN** the system returns HTTP 400 `{"error": "Sale item does not belong to the linked sale", "saleItemId": "<id>"}` and the transaction does not commit

#### Scenario: Empty items
- **WHEN** the body has `items: []`
- **THEN** the system returns HTTP 400 `{"error": "Return must include at least one item"}`

#### Scenario: Missing reason
- **WHEN** the body omits `reason`
- **THEN** the system returns HTTP 400 with a Zod error pointing to `reason`

#### Scenario: returnedAt in the future
- **WHEN** the body has `returnedAt` strictly greater than the server's current time
- **THEN** the system returns HTTP 400 with a Zod error pointing to `returnedAt`

#### Scenario: Inventory record absent at return time
- **WHEN** the (branch, product) pair has no `branch_inventory` row
- **THEN** the system creates the row with `quantity = item.quantity` (positive initial) and returns HTTP 201

#### Scenario: Inventory was negative before the return
- **WHEN** `branch_inventory.quantity = -5` and a return for 3 of that product is registered
- **THEN** the row is updated to `quantity = -2` and the system returns HTTP 201

#### Scenario: Concurrent returns on the same line
- **WHEN** two concurrent requests both attempt to return `quantity=6` of a line whose `remaining=10`
- **THEN** both transactions read `remaining=10` and serialize at the inventory UPDATE; the FIRST to commit succeeds and the SECOND, when it attempts to re-read `remaining`, sees `4` (or fails with the constraint) and rejects with `ReturnQuantityExceedsRemainingError`. The use case SHALL use repository methods that observe prior returns inside the same transaction so that conflicts surface as 409 rather than silent over-returns.

#### Scenario: customerBalance does not mutate
- **WHEN** the customer's `current_balance = 1500` before the return
- **THEN** after a successful return the customer's `current_balance` is still `1500` (currentBalance is read-only in v1)

#### Scenario: Forbidden without returns:create
- **WHEN** a caller without `returns:create` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "returns:create"}`

#### Scenario: Return of a dosification line increments a fraction of base stock
- **WHEN** a return is registered for `quantity=2` parts of a sale line whose `numPartsSnapshot=4`
- **THEN** `branch_inventory.quantity` is incremented by `2/4 = 0.5` (not by `2`)

---

### Requirement: Cancel return
The system SHALL expose `POST /api/v1/admin/returns/:id/cancel`. Requires `returns:cancel`. Optional body: `reason: string | null` (max 500 chars). Branch scoping applies (callers without `branches:access_all` can only cancel returns in their assigned branch).

Behavior (inside a Prisma transaction):

- If `return.status === 'cancelled'` → HTTP 409 `ReturnAlreadyCancelledError` `{"error": "Return is already cancelled"}` (NOT idempotent — re-cancellation is treated as a probable double-click).
- If `return.status === 'completed'`: for each item, DECREMENT inventory atomically using the base-unit amount (`quantity / numPartsSnapshot` when the return item has a dosification, `quantity` otherwise):
  ```
  UPDATE branch_inventory
  SET quantity = quantity - ${amount}, updated_at = NOW()
  WHERE branch_id = ? AND product_id = ?
  ```
  If `UPDATE` affects 0 rows, the system SHALL `INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, -${amount})` (creates the row with negative initial quantity). The resulting `quantity` MAY be negative — same rule as the POS sale path (see `inventory-api` Modified Requirement).
- Then `UPDATE returns SET status='cancelled', cancelled_at=NOW(), cancelled_by=<userId>, cancellation_reason=?` (one row).

Returns HTTP 200 with the updated `ReturnDetailDto`.

The cancellation does NOT modify the originating `Sale` or any `SaleItem` row. The sale ticket remains identical to its pre-return state on the sales side; only `returns.status` and `branch_inventory.quantity` change.

#### Scenario: Cancel completed return
- **WHEN** an authorized caller cancels a `completed` return with items totalling X units of product P
- **THEN** the system returns HTTP 200, the return `status` becomes `cancelled`, and `branch_inventory.quantity` for product P at the return's branch is decremented by X

#### Scenario: Re-cancellation rejected
- **WHEN** the same return is cancelled twice
- **THEN** the second call returns HTTP 409 `{"error": "Return is already cancelled"}` and no side effects occur

#### Scenario: Cancellation may drive stock negative
- **WHEN** at the moment of cancellation `branch_inventory.quantity = 2` and the return restored `5` units (i.e., between the return and the cancellation, 3 were sold)
- **THEN** the system updates the row to `quantity = -3` and returns HTTP 200 — the negative balance represents a real inventory debt to be settled by transfer or admin adjust

#### Scenario: Cancellation when inventory row was deleted
- **WHEN** between the return and the cancellation, the (branch, product) inventory row was removed (e.g., via `DELETE /inventory`)
- **THEN** the system re-creates the row with `quantity = -qty` and returns HTTP 200

#### Scenario: Out-of-branch cancellation
- **WHEN** an `operator` in branch B1 tries to cancel a return whose `branchId = B2` and lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Return not found
- **WHEN** the `:id` does not match any return
- **THEN** the system returns HTTP 404

#### Scenario: Free space restored for new returns
- **WHEN** a return for 3 units of a sale line is cancelled
- **THEN** `ReturnableQuantityCalculator.computeRemaining(...)` for that line increases by 3 — a new return up to the original sold quantity becomes possible

#### Scenario: Forbidden without returns:cancel
- **WHEN** a caller without `returns:cancel` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "returns:cancel"}`

#### Scenario: Cancel a dosification return decrements a fraction of base stock
- **WHEN** a `completed` return with `numPartsSnapshot=4`, `quantity=2` parts (i.e. `0.5` base units incremented at creation) is cancelled
- **THEN** `branch_inventory.quantity` is decremented by `0.5` (not by `2`)
