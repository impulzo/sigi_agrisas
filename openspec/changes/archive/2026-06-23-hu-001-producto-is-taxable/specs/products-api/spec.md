## MODIFIED Requirements

### Requirement: List products
The system SHALL expose `GET /api/v1/admin/products` that returns a paginated list of products. Requires the `products:read` permission. Query parameters control the result set: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (optional, min 2 chars when present; matches `name` OR `code` via `OR ILIKE '%search%'`), `departmentId` (optional UUID filter). Response: `{ items: ProductDto[], total: number, page: number, pageSize: number }`. Each `ProductDto` includes `id`, `code`, `name`, `unit`, `satProductCode` (string or `null`), `departmentId`, `departmentName` (joined), `ivaRate` (decimal 0–1 or `null`), `iepsRate` (decimal 0–1 or `null`), `imageUrl` (string or `null`), `isTaxable` (boolean), `isActive`, `createdAt`, `updatedAt`. Results ordered by `createdAt DESC`.

#### Scenario: Admin lists active products
- **WHEN** an authenticated user with `products:read` sends `GET /api/v1/admin/products`
- **THEN** the system returns HTTP 200 with active products, each item including `isTaxable: boolean`

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

---

### Requirement: Create product
The system SHALL expose `POST /api/v1/admin/products`. Requires `products:write`. Required body fields: `code`, `name`, `unit`, `departmentId`. Optional fields include `satProductCode`, `ivaRate`, `iepsRate`, `imageUrl`, `isActive`, and `isTaxable: boolean` (default `false`). The controller SHALL validate `isTaxable` as a boolean (non-boolean value → HTTP 400). Returns HTTP 201 with the new `ProductDto` including `isTaxable`.

#### Scenario: Minimal creation defaults isTaxable to false
- **WHEN** the body omits `isTaxable`
- **THEN** the system persists `is_taxable = false` and returns `isTaxable: false` in HTTP 201

#### Scenario: Explicit isTaxable true
- **WHEN** the body includes `isTaxable: true`
- **THEN** the system persists `is_taxable = true` and returns `isTaxable: true` in HTTP 201

#### Scenario: Non-boolean isTaxable rejected
- **WHEN** the body includes `isTaxable: "yes"`
- **THEN** the system returns HTTP 400

#### Scenario: Duplicate code
- **WHEN** the body contains a `code` already in use
- **THEN** the system returns HTTP 409 `{"error": "Product code already in use"}`

#### Scenario: Department not found
- **WHEN** the body's `departmentId` does not match any active department
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden
- **WHEN** an authenticated user without `products:write` calls the endpoint
- **THEN** the system returns HTTP 403

---

### Requirement: Update product
The system SHALL expose `PATCH /api/v1/admin/products/:id`. Requires `products:write`. `code` is immutable and SHALL be ignored silently. `isTaxable` MAY be included and SHALL be validated as boolean. Body must have ≥1 valid field; empty body → HTTP 400. Returns HTTP 200 with updated `ProductDto` including `isTaxable`.

#### Scenario: Toggle isTaxable to true
- **WHEN** the body includes `isTaxable: true` on an existing product with `isTaxable: false`
- **THEN** the system returns HTTP 200 with `isTaxable: true`

#### Scenario: Toggle isTaxable to false
- **WHEN** the body includes `isTaxable: false` on an existing product with `isTaxable: true`
- **THEN** the system returns HTTP 200 with `isTaxable: false`

#### Scenario: Product not found
- **WHEN** the `:id` does not match any product
- **THEN** the system returns HTTP 404

---

## ADDED Requirements

### Requirement: Taxable flag drives total calculation
The system SHALL propagate `isTaxable` from the product catalog through `PosLookupService` to `SaleTotalsCalculator` and `QuoteTotalsCalculator`. When a line item has `isTaxable = false`, the calculators SHALL use `effectiveIvaRate = 0` and `effectiveIepsRate = 0` regardless of the stored `ivaRate`/`iepsRate` on the product price.

#### Scenario: Non-taxable product generates zero tax in sale totals
- **WHEN** a sale line item references a product with `isTaxable = false` and `ivaRate = 0.16`
- **THEN** `lineIva = 0` and `lineIeps = 0` for that line

#### Scenario: Taxable product generates tax normally
- **WHEN** a sale line item references a product with `isTaxable = true` and `ivaRate = 0.16`
- **THEN** `lineIva = round(lineSubtotal * 0.16, 4)`
