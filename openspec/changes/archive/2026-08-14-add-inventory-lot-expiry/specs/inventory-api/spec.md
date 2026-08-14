## MODIFIED Requirements

### Requirement: List branch inventory
The system SHALL expose `GET /api/v1/admin/branches/:branchId/inventory` that returns a paginated list of products in the branch's inventory. Requires the `inventory:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `search` (optional, min 2 chars; matches `product.code` OR `product.name` via `OR ILIKE`), `belowReorder` (default `false`; when `true` returns only records where `quantity < reorder_point`).

Response: `{ items: BranchInventoryDto[], total: number, page: number, pageSize: number }`. Each `BranchInventoryDto` includes `id`, `branchId`, `productId`, `productCode` (joined), `productName` (joined), `quantity`, `reservedQuantity`, `reorderPoint`, `updatedAt`, `nearestExpirationDate`, `nearestExpirationLotNumber`, `expiryStatus` (the three new fields per capability `inventory-lots`; `null` when the product has no `inventory_lots` records for that branch). Returns HTTP 404 if `:branchId` does not match any branch.

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

#### Scenario: List includes expiry status when lots are registered
- **WHEN** a listed product has one or more `inventory_lots` records for that branch
- **THEN** its `BranchInventoryDto` includes `nearestExpirationDate` (the closest one), `nearestExpirationLotNumber`, and `expiryStatus` computed per capability `inventory-lots`

#### Scenario: List omits expiry status when no lots are registered
- **WHEN** a listed product has no `inventory_lots` records for that branch
- **THEN** its `BranchInventoryDto` returns `nearestExpirationDate: null`, `nearestExpirationLotNumber: null`, `expiryStatus: null`

### Requirement: Get branch inventory item
The system SHALL expose `GET /api/v1/admin/branches/:branchId/inventory/:productId`. Requires `inventory:read`. Returns the single `BranchInventoryDto` for the (branch, product) pair, including `nearestExpirationDate`, `nearestExpirationLotNumber`, `expiryStatus` (same semantics as the list endpoint), or HTTP 404 if no record exists.

#### Scenario: Get existing inventory item
- **WHEN** the request targets an existing (branch, product) pair
- **THEN** the system returns HTTP 200 with the dto, including its expiry status fields

#### Scenario: Inventory record not found
- **WHEN** no record exists for the pair
- **THEN** the system returns HTTP 404 `{"error": "Inventory record not found"}`

#### Scenario: Branch or product missing
- **WHEN** either `:branchId` or `:productId` is not a valid UUID
- **THEN** the system returns HTTP 400
