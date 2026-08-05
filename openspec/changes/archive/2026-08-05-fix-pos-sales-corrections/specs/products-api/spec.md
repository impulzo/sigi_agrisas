## MODIFIED Requirements

### Requirement: List products
The system SHALL expose `GET /api/v1/admin/products` that returns a paginated list of products. Requires the `products:read` permission. Query parameters control the result set: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (optional, min 2 chars when present; matches `name` OR `code` via `OR ILIKE '%search%'`), `departmentId` (optional UUID filter), `branchId` (optional UUID). Response: `{ items: ProductDto[], total: number, page: number, pageSize: number }`. Each `ProductDto` includes `id`, `code`, `name`, `unit`, `satProductCode` (string or `null`), `departmentId`, `departmentName` (joined), `ivaRate` (decimal 0–1 or `null`), `iepsRate` (decimal 0–1 or `null`), `imageUrl` (string or `null`), `isTaxable` (boolean), `isActive`, `createdAt`, `updatedAt`, and `stock: number | null`. Results ordered by `createdAt DESC`.

**`stock` field**: when the request includes `branchId`, the system SHALL join `branch_inventory` filtered by `(branch_id = branchId, product_id = product.id)` (unique pair) and set `stock = branch_inventory.quantity` for that product, or `stock = null` if no `branch_inventory` row exists for that pair. When the request omits `branchId`, `stock` is always `null` (no branch context to resolve stock against). This does NOT require the `inventory:read` permission — `products:read` alone is sufficient, since it is the same list endpoint, only enriched with an extra field.

#### Scenario: Admin lists active products
- **WHEN** an authenticated user with `products:read` sends `GET /api/v1/admin/products`
- **THEN** the system returns HTTP 200 with active products only, includes `departmentName` joined from the `departments` table, and each item includes `imageUrl` (string URL or `null`) and `isTaxable: boolean`

#### Scenario: Search by code and name
- **WHEN** the request includes `?search=ARROZ`
- **THEN** the response includes any product whose `name` or `code` contains `ARROZ` case-insensitively

#### Scenario: Filter by department
- **WHEN** the request includes `?departmentId=<uuid>`
- **THEN** the response includes only products whose `department_id` matches

#### Scenario: Search shorter than 2 chars rejected
- **WHEN** the request includes `?search=a`
- **THEN** the system returns HTTP 400

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden without permission
- **WHEN** an authenticated user without `products:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "products:read"}`

#### Scenario: branchId present returns stock per product
- **WHEN** an authenticated user with `products:read` sends `GET /api/v1/admin/products?branchId=<B1>` and product `P1` has a `branch_inventory` row for `(B1, P1)` with `quantity=42`
- **THEN** the response item for `P1` includes `stock: 42`

#### Scenario: branchId present but no inventory row for product
- **WHEN** the request includes `?branchId=<B1>` and product `P2` has no `branch_inventory` row for `(B1, P2)`
- **THEN** the response item for `P2` includes `stock: null`

#### Scenario: branchId omitted — stock always null
- **WHEN** the request omits `branchId`
- **THEN** every item in the response includes `stock: null`, regardless of any existing `branch_inventory` data

#### Scenario: Invalid branchId format rejected
- **WHEN** the request includes `?branchId=not-a-uuid`
- **THEN** the system returns HTTP 400
