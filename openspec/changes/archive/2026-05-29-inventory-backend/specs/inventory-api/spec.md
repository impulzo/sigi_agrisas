## ADDED Requirements

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
The system SHALL expose `POST /api/v1/admin/branches/:branchId/inventory/:productId/adjust`. Requires `inventory:write`. Body: `delta: number` (any signed decimal). Optional: `reason: string` (max 200 chars; not persisted in this change — reserved for future audit module).

The operation SHALL be atomic at the database level using a conditional `UPDATE` (e.g., `UPDATE branch_inventory SET quantity = quantity + ${delta} WHERE id = ${id} AND quantity + ${delta} >= 0`). If the update would result in a negative `quantity`, the system SHALL return HTTP 409 `{"error": "Negative stock not allowed"}` WITHOUT modifying the row. Returns HTTP 200 with the updated dto on success.

#### Scenario: Positive adjustment
- **WHEN** the current quantity is `50` and the body is `{ "delta": 10 }`
- **THEN** the system returns HTTP 200 with `quantity: 60`

#### Scenario: Negative adjustment within stock
- **WHEN** the current quantity is `50` and the body is `{ "delta": -10 }`
- **THEN** the system returns HTTP 200 with `quantity: 40`

#### Scenario: Negative adjustment exceeding stock
- **WHEN** the current quantity is `5` and the body is `{ "delta": -10 }`
- **THEN** the system returns HTTP 409 `{"error": "Negative stock not allowed"}` and the row is NOT modified

#### Scenario: Concurrent adjustments
- **WHEN** two concurrent requests both attempt `{ "delta": -3 }` against a row with `quantity = 5`
- **THEN** one returns HTTP 200 (with new quantity `2`) and the other returns HTTP 409 (since the WHERE clause filters atomically); BOTH NEVER succeed if either would produce a negative result

#### Scenario: Inventory record not found
- **WHEN** the (branch, product) pair has no inventory record
- **THEN** the system returns HTTP 404

#### Scenario: Reason field is accepted but not persisted
- **WHEN** the body includes `{ "delta": 5, "reason": "Recepción factura 123" }`
- **THEN** the system accepts the request, applies the delta, and ignores `reason` (audit is deferred to a future change)

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
