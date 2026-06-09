# Spec: inventory-api

## Purpose

Define the Branch Inventory API: per-branch stock management with absolute-set and atomic-delta adjustment operations. Stock is always tracked per branch; no global aggregation is exposed.

---

## Requirements

### Requirement: List branch inventory
The system SHALL expose `GET /api/v1/admin/branches/:branchId/inventory` that returns a paginated list of products in the branch's inventory. Requires the `inventory:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `search` (optional, min 2 chars; matches `product.code` OR `product.name` via `OR ILIKE`), `belowReorder` (default `false`; when `true` returns only records where `quantity < reorder_point`).

Response: `{ items: BranchInventoryDto[], total: number, page: number, pageSize: number }`. Each `BranchInventoryDto` includes `id`, `branchId`, `productId`, `productCode` (joined), `productName` (joined), `quantity`, `reservedQuantity`, `reorderPoint`, `updatedAt`. Returns HTTP 404 if `:branchId` does not match any branch.

#### Scenario: Admin lists branch inventory
- **WHEN** an authenticated user with `inventory:read` sends `GET /api/v1/admin/branches/<uuid>/inventory`
- **THEN** the system returns HTTP 200 with the inventory rows joined with product info

#### Scenario: Filter products below reorder point
- **WHEN** the request includes `?belowReorder=true`
- **THEN** only rows where `quantity < reorder_point` are returned

#### Scenario: Search by product code or name
- **WHEN** the request includes `?search=arroz`
- **THEN** only rows whose `product.code` or `product.name` contain "arroz" are returned (case-insensitive)

#### Scenario: Branch not found
- **WHEN** the `:branchId` does not match any branch
- **THEN** the system returns HTTP 404

#### Scenario: Forbidden
- **WHEN** an authenticated user without `inventory:read` calls the endpoint
- **THEN** the system returns HTTP 403

---

### Requirement: Get branch inventory item
The system SHALL expose `GET /api/v1/admin/branches/:branchId/inventory/:productId`. Requires `inventory:read`. Returns the single `BranchInventoryDto` for the (branch, product) pair, or HTTP 404 if no record exists.

#### Scenario: Get existing inventory item
- **WHEN** the request targets an existing (branch, product) pair
- **THEN** the system returns HTTP 200 with the dto

#### Scenario: Inventory record not found
- **WHEN** no record exists for the pair
- **THEN** the system returns HTTP 404 `{"error": "Inventory record not found"}`

#### Scenario: Branch or product missing
- **WHEN** either `:branchId` or `:productId` is not a valid UUID
- **THEN** the system returns HTTP 400

---

### Requirement: Create branch inventory item
The system SHALL expose `POST /api/v1/admin/branches/:branchId/inventory`. Requires `inventory:write`. Required body: `productId: string` (UUID of an existing active product). Optional: `quantity` (decimal >= 0, default 0), `reservedQuantity` (decimal >= 0, default 0), `reorderPoint` (decimal >= 0, default 0). The combination `(branch_id, product_id)` SHALL be UNIQUE; duplicate returns HTTP 409.

#### Scenario: Initialize inventory with stock
- **WHEN** the body is `{ "productId": "<uuid>", "quantity": 50, "reorderPoint": 10 }`
- **THEN** the system returns HTTP 201 with the new record

#### Scenario: Initialize with zero stock
- **WHEN** the body is `{ "productId": "<uuid>" }`
- **THEN** the system returns HTTP 201 with `quantity: 0`, `reservedQuantity: 0`, `reorderPoint: 0`

#### Scenario: Duplicate inventory item
- **WHEN** an inventory record already exists for the (branch, product) pair
- **THEN** the system returns HTTP 409

#### Scenario: Product not found or inactive
- **WHEN** the `productId` does not exist or `isActive = false`
- **THEN** the system returns HTTP 400 (do not allow stock for non-sellable products)

#### Scenario: Branch not found
- **WHEN** the URL `:branchId` is invalid or non-existent
- **THEN** the system returns HTTP 404 (when invalid format) or HTTP 400 (when no such branch)

---

### Requirement: Update branch inventory item (absolute set)
The system SHALL expose `PATCH /api/v1/admin/branches/:branchId/inventory/:productId`. Requires `inventory:write`. Body MAY include `quantity`, `reservedQuantity`, `reorderPoint` (each is a decimal >= 0). At least one field required. All provided values are absolute (not deltas). Returns HTTP 200 with the updated dto.

This endpoint is intended for capture corrections and initial setup; for transactional ADD/SUBTRACT operations use the `adjust` endpoint.

#### Scenario: Set absolute quantity
- **WHEN** the body is `{ "quantity": 100 }`
- **THEN** the system overwrites `quantity` and returns HTTP 200

#### Scenario: Negative value rejected
- **WHEN** the body is `{ "quantity": -5 }`
- **THEN** the system returns HTTP 400

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400

---

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

### Requirement: Negative quantity is allowed when originated by a sale
The column `branch_inventory.quantity` SHALL permit negative values. The DB-level CHECK constraint `quantity >= 0` on this column SHALL remain dropped (as established by the `add-pos` migration). Constraints `reserved_quantity >= 0` and `reorder_point >= 0` SHALL be preserved.

A negative `quantity` represents a stock obligation that must be settled by a future inter-branch transfer (the `branch_transfers` module, scoped for a later change). Negative stock is exclusively produced by the POS sale path (`CreateSaleUseCase` / `EditCompletedSaleUseCase` / `SaleRepository.createCompletedFromQuote` in `pos-api`) AND by the return cancellation path (`CancelReturnUseCase` in `returns-api`, when cancelling a return whose stock has been re-consumed by intervening sales). The admin endpoints `PATCH /inventory/:productId` and `POST /inventory/:productId/adjust` continue to reject negative results.

The return registration path (`CreateReturnUseCase` in `returns-api`) NEVER produces negative stock — it only increments. The return cancellation path MAY produce negative stock, mirroring the sale path's tolerance.

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

#### Scenario: Return creation never produces negative stock
- **WHEN** `CreateReturnUseCase` runs and `branch_inventory.quantity = -5` for the returned product
- **THEN** after the increment, `quantity = -5 + returnedQty` — still negative if `returnedQty < 5`, but the operation succeeds (the return is a refund of physical product entering the warehouse; whatever the prior debt, the inventory rises)

#### Scenario: Return cancellation may drive stock negative
- **WHEN** `CancelReturnUseCase` runs and the inventory available for the returned product is less than the quantity being un-returned (because sales consumed it in the meantime)
- **THEN** the row is updated to a negative `quantity` and the cancellation succeeds — the negative represents the real-world inventory debt to be settled

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

---

### Requirement: Delete branch inventory item
The system SHALL expose `DELETE /api/v1/admin/branches/:branchId/inventory/:productId`. Requires `inventory:write`. **Hard delete** — the row is removed. Returns HTTP 204. Use cases: a product is discontinued at a specific branch, or the row was created in error.

#### Scenario: Delete success
- **WHEN** the request targets an existing inventory record
- **THEN** the system returns HTTP 204 and the row is removed

#### Scenario: Inventory record not found
- **WHEN** no record exists for the pair
- **THEN** the system returns HTTP 404

---

### Requirement: No global stock
The system SHALL NOT expose any endpoint or query that returns a single "total stock per product" across branches as a primary aggregation. Stock is always reported per branch. A consumer that needs aggregated stock SHALL iterate branches explicitly or use a future analytics module.

#### Scenario: There is no /api/v1/admin/products/:id/stock endpoint
- **WHEN** an authenticated user GETs `/api/v1/admin/products/:id/stock`
- **THEN** the system returns HTTP 404 (the route does not exist)

#### Scenario: Aggregation is the consumer's responsibility
- **WHEN** the POS needs to display "total stock for product X across all branches"
- **THEN** the POS SHALL call `GET /branches/<id>/inventory/<productId>` per branch and aggregate client-side, OR a future analytics endpoint SHALL be added in a subsequent change
