## MODIFIED Requirements

### Requirement: Adjust stock (atomic delta)
The system SHALL expose `POST /api/v1/admin/branches/:branchId/inventory/:productId/adjust`. Requires `inventory:write`. Body: `delta: number` (any signed decimal). Optional: `reason: string` (max 200 chars; not persisted in this change — reserved for future audit module). This endpoint preserves its original semantics: deltas that would cause `quantity` to fall below `0` SHALL be rejected with HTTP 409 `{"error": "Negative stock not allowed"}` WITHOUT modifying the row, EVEN AFTER the database CHECK constraint `quantity >= 0` is removed by the `add-pos` migration. The protection lives in the SQL `WHERE quantity + ${delta} >= 0` clause executed by the controller.

This endpoint is intended for capture corrections and initial setup by administrators. Sale-driven decrements DO NOT use this endpoint; the POS module performs its own atomic updates without the negative-stock guard (see `pos-api`).

Branch scoping applies: callers without `branches:access_all` may only invoke this endpoint when `:branchId === x-user-branch-id`; mismatch returns HTTP 403.

#### Scenario: Positive adjustment
- **WHEN** the current quantity is `50` and the body is `{ "delta": 10 }`
- **THEN** the system returns HTTP 200 with `quantity: 60`

#### Scenario: Negative adjustment within stock
- **WHEN** the current quantity is `50` and the body is `{ "delta": -10 }`
- **THEN** the system returns HTTP 200 with `quantity: 40`

#### Scenario: Negative adjustment exceeding stock
- **WHEN** the current quantity is `5` and the body is `{ "delta": -10 }`
- **THEN** the system returns HTTP 409 `{"error": "Negative stock not allowed"}` and the row is NOT modified — even though the column-level CHECK constraint has been dropped, the WHERE clause in the controller still enforces non-negativity for the admin path

#### Scenario: Concurrent adjustments
- **WHEN** two concurrent requests both attempt `{ "delta": -3 }` against a row with `quantity = 5`
- **THEN** one returns HTTP 200 (with new quantity `2`) and the other returns HTTP 409 (since the WHERE clause filters atomically); BOTH NEVER succeed if either would produce a negative result

#### Scenario: Inventory record not found
- **WHEN** the (branch, product) pair has no inventory record
- **THEN** the system returns HTTP 404

#### Scenario: Reason field is accepted but not persisted
- **WHEN** the body includes `{ "delta": 5, "reason": "Recepción factura 123" }`
- **THEN** the system accepts the request, applies the delta, and ignores `reason` (audit is deferred to a future change)

#### Scenario: Out-of-branch caller is forbidden
- **WHEN** an `operator` with `x-user-branch-id = B1` calls the endpoint with `:branchId = B2` and does not have `branches:access_all`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

---

## ADDED Requirements

### Requirement: Negative quantity is allowed when originated by a sale
The column `branch_inventory.quantity` SHALL permit negative values. The DB-level CHECK constraint `quantity >= 0` on this column SHALL be dropped by the `add-pos` migration. Constraints `reserved_quantity >= 0` and `reorder_point >= 0` SHALL be preserved.

A negative `quantity` represents a stock obligation that must be settled by a future inter-branch transfer (the `branch_transfers` module, scoped for a later change). Negative stock is exclusively produced by the POS sale path (`CreateSaleUseCase` / `EditCompletedSaleUseCase` in `pos-api`); the admin endpoints `PATCH /inventory/:productId` and `POST /inventory/:productId/adjust` continue to reject negative results.

#### Scenario: List shows negative quantity
- **WHEN** a POS sale leaves `branch_inventory.quantity = -3` and an authorized user lists the inventory
- **THEN** the response includes the record with `quantity: -3` (no filtering)

#### Scenario: Admin PATCH still rejects negative
- **WHEN** an admin sends `PATCH /api/v1/admin/branches/:branchId/inventory/:productId` with `{ "quantity": -5 }`
- **THEN** the system returns HTTP 400 (the controller validates `quantity >= 0` via Zod; the column accepts the value but the API does not)

#### Scenario: Admin adjust still rejects driving to negative
- **WHEN** an admin sends `POST /api/v1/admin/branches/:branchId/inventory/:productId/adjust` with `{ "delta": -10 }` against a record with `quantity = 5`
- **THEN** the system returns HTTP 409 (the WHERE clause `quantity + delta >= 0` prevents the update; the dropped CHECK does not weaken this path)

#### Scenario: belowReorder includes negative stock
- **WHEN** a record has `quantity = -2` and `reorder_point = 5`, and a list request includes `?belowReorder=true`
- **THEN** the record is included (`-2 < 5`)

---

### Requirement: List/Get/Create/Update/Delete enforce branch scoping
The endpoints `GET /api/v1/admin/branches/:branchId/inventory`, `GET .../:productId`, `POST .../inventory`, `PATCH .../:productId`, `POST .../:productId/adjust`, and `DELETE .../:productId` SHALL enforce branch scoping per the pattern defined in `auth-middleware` and `rbac` (Requirement: branches:access_all bypass semantics). Callers without `branches:access_all` SHALL be limited to `:branchId === x-user-branch-id`; mismatch returns HTTP 403 `{ "error": "Forbidden", "required": "branches:access_all" }`. This requirement does NOT modify the existing inputs/outputs of these endpoints; it only adds the scoping gate as a precondition.

#### Scenario: Operator lists own branch
- **WHEN** an `operator` with `x-user-branch-id = B1` and `inventory:read` calls `GET /api/v1/admin/branches/B1/inventory`
- **THEN** the system returns HTTP 200

#### Scenario: Operator lists other branch
- **WHEN** an `operator` with `x-user-branch-id = B1` calls `GET /api/v1/admin/branches/B2/inventory`
- **THEN** the system returns HTTP 403 `{ "error": "Forbidden", "required": "branches:access_all" }`

#### Scenario: Admin lists any branch
- **WHEN** an `admin` with `branches:access_all` calls `GET /api/v1/admin/branches/<anyBranchId>/inventory`
- **THEN** the system returns HTTP 200 regardless of the admin's `x-user-branch-id`

#### Scenario: Scoping does not leak existence
- **WHEN** an unauthorized caller targets an inventory record in a branch they cannot access
- **THEN** the handler SHALL resolve the resource and return 404 if it does not exist BEFORE evaluating scoping; existence is revealed only to anyone with permission to look at that branch (HTTP 403 is returned only when the resource exists in another branch)
