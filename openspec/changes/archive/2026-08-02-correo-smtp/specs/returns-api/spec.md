## MODIFIED Requirements

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
  If `UPDATE` affects 0 rows, the system SHALL `INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, -${amount})` (creates the row with negative initial quantity). The resulting `quantity` MAY be negative — same rule as the POS sale path (see `inventory-api` Modified Requirement). **After each such decrement**, the system SHALL evaluate the low-stock notification trigger per `admin-notifications-api` "Notify admin on low stock" (best-effort, never blocks or fails this endpoint).
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

#### Scenario: Return cancellation crossing reorder point triggers admin notification
- **WHEN** cancelling a return decrements `branch_inventory.quantity` below `reorder_point` for that (branch, product), and no notification for that pair was sent in the last 24h
- **THEN** the system still returns HTTP 200 as normal, AND — per `admin-notifications-api` — an email is sent to the configured admin address and `lastLowStockNotifiedAt` is updated; a failure to send this email does NOT affect the HTTP 200 response
