## ADDED Requirements

### Requirement: List products
The system SHALL expose `GET /api/v1/admin/products` that returns a paginated list of products. Requires the `products:read` permission. Query parameters control the result set: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (optional, min 2 chars when present; matches `name` OR `code` via `OR ILIKE '%search%'`), `departmentId` (optional UUID filter). Response: `{ items: ProductDto[], total: number, page: number, pageSize: number }`. Each `ProductDto` includes `id`, `code`, `name`, `unit`, `satProductCode` (string or `null`), `departmentId`, `departmentName` (joined), `ivaRate` (decimal 0–1 or `null`), `iepsRate` (decimal 0–1 or `null`), `isActive`, `createdAt`, `updatedAt`. Results ordered by `createdAt DESC`.

#### Scenario: Admin lists active products
- **WHEN** an authenticated user with `products:read` sends `GET /api/v1/admin/products`
- **THEN** the system returns HTTP 200 with active products only and includes `departmentName` joined from the `departments` table

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

### Requirement: Get product detail
The system SHALL expose `GET /api/v1/admin/products/:id` that returns a single product by UUID. Requires `products:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets product
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `ProductDto`

#### Scenario: Product not found
- **WHEN** the `:id` does not match any product
- **THEN** the system returns HTTP 404 `{"error": "Product not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400

---

### Requirement: Create product
The system SHALL expose `POST /api/v1/admin/products`. Requires `products:write`. Required body fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$`
- `name: string` (1–200 chars)
- `unit: string` (1–32 chars; e.g. "pieza", "kg", "lt")
- `departmentId: string` (UUID of an existing `Department`)

Optional fields:

- `satProductCode: string | null` matching `^\d{8}$`
- `ivaRate: number | null` (decimal 0–1; e.g. `0.16` for 16% — controller accepts also `16` and normalizes to `0.16`)
- `iepsRate: number | null` (same semantics as `ivaRate`)
- `isActive: boolean` (default `true`)

The controller SHALL trim and uppercase `code` before persisting. Returns HTTP 201 with the new `ProductDto`. Duplicate `code` returns HTTP 409. `departmentId` not found returns HTTP 400 (or 422 — implementer's choice, must be documented).

#### Scenario: Minimal creation
- **WHEN** the body is `{ "code": "ARROZ_001", "name": "Arroz", "unit": "kg", "departmentId": "<uuid>" }` with an existing department
- **THEN** the system returns HTTP 201 with `satProductCode`, `ivaRate`, `iepsRate` all `null` and `isActive: true`

#### Scenario: Full fiscal creation
- **WHEN** the body includes valid `satProductCode`, `ivaRate: 16`, `iepsRate: 0`
- **THEN** the system persists `iva_rate = 0.16` and `ieps_rate = 0` and returns the product in HTTP 201

#### Scenario: Duplicate code
- **WHEN** the body contains a `code` already in use
- **THEN** the system returns HTTP 409 `{"error": "Product code already in use"}`

#### Scenario: Department not found
- **WHEN** the body's `departmentId` does not match any active department
- **THEN** the system returns HTTP 400 with an error indicating the department is missing

#### Scenario: Invalid satProductCode
- **WHEN** the body contains `satProductCode: "ABC123"` (not 8 digits)
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden
- **WHEN** an authenticated user without `products:write` calls the endpoint
- **THEN** the system returns HTTP 403

---

### Requirement: Update product
The system SHALL expose `PATCH /api/v1/admin/products/:id`. Requires `products:write`. The body MAY include any of `name`, `unit`, `satProductCode`, `departmentId`, `ivaRate`, `iepsRate`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. Body MUST contain at least one updatable field, else HTTP 400. Optional fields set to `null` clear the value.

#### Scenario: Update name and tax
- **WHEN** the body is `{ "name": "Arroz Integral", "ivaRate": 0 }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Clear optional field
- **WHEN** the body is `{ "satProductCode": null }`
- **THEN** the system stores `null` in `sat_product_code` and returns HTTP 200

#### Scenario: Change department
- **WHEN** the body is `{ "departmentId": "<new-uuid>" }` referring to an existing active department
- **THEN** the system updates the FK and returns HTTP 200

#### Scenario: Empty body
- **WHEN** the body is `{}` or only contains `code`
- **THEN** the system returns HTTP 400

#### Scenario: Product not found
- **WHEN** the `:id` does not match any product
- **THEN** the system returns HTTP 404

---

### Requirement: Soft delete product
The system SHALL expose `DELETE /api/v1/admin/products/:id` that marks the product as `isActive=false` without removing the row. Requires `products:write`. Returns HTTP 204. Sub-resources (`product_prices`, `product_dosifications`, `branch_inventory`) are NOT cascade-removed by the soft delete (they remain accessible for historical reference).

#### Scenario: Soft delete success
- **WHEN** the request targets an active product
- **THEN** the system returns HTTP 204 and the entity has `is_active = false`

#### Scenario: Reactivate via update
- **WHEN** an admin sends `PATCH /api/v1/admin/products/:id` with `{"isActive": true}` to a previously soft-deleted product
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: Product not found
- **WHEN** the `:id` does not match any product
- **THEN** the system returns HTTP 404

---

### Requirement: List product prices
The system SHALL expose `GET /api/v1/admin/products/:id/prices`. Requires `products:read`. Returns `{ items: ProductPriceDto[] }` ordered by `is_default DESC, min_quantity ASC, name ASC`. Each `ProductPriceDto` includes `id`, `productId`, `name`, `price`, `minQuantity`, `discountPct` (or `null`), `isDefault`, `createdAt`, `updatedAt`.

#### Scenario: List prices
- **WHEN** an authorized user gets prices for an existing product
- **THEN** the response includes all prices, default first

#### Scenario: Product not found
- **WHEN** the URL `:id` does not match any product
- **THEN** the system returns HTTP 404

---

### Requirement: Create product price
The system SHALL expose `POST /api/v1/admin/products/:id/prices`. Requires `products:write`. Required body: `name: string` (1–60 chars), `price: number` (>= 0, max 12 integer digits + 4 decimals). Optional: `minQuantity: number` (integer >= 1, default 1), `discountPct: number | null` (0–100), `isDefault: boolean` (default `false`). A product may have at most ONE price with `isDefault: true`; attempting to create a second default returns HTTP 409 `{"error": "Product already has a default price"}`. Two prices with the same `name` on the same product return HTTP 409.

#### Scenario: Create non-default price
- **WHEN** the body is `{ "name": "Mayoreo", "price": 10.50, "minQuantity": 10 }`
- **THEN** the system returns HTTP 201

#### Scenario: Create first default price
- **WHEN** the body is `{ "name": "Menudeo", "price": 12.00, "isDefault": true }` and no default exists
- **THEN** the system returns HTTP 201

#### Scenario: Reject second default price
- **WHEN** the product already has a default price and the body sets `isDefault: true`
- **THEN** the system returns HTTP 409

#### Scenario: Duplicate price name
- **WHEN** a price named "Menudeo" already exists for the product
- **THEN** the system returns HTTP 409

#### Scenario: Invalid price
- **WHEN** the body contains `price: -5`
- **THEN** the system returns HTTP 400

---

### Requirement: Update product price
The system SHALL expose `PATCH /api/v1/admin/products/:id/prices/:priceId`. Requires `products:write`. Body MAY include `name`, `price`, `minQuantity`, `discountPct`, `isDefault`. At least one field required. Toggling `isDefault: true` SHALL automatically unset `isDefault` on the prior default price of the same product (atomic).

#### Scenario: Update price value
- **WHEN** the body is `{ "price": 13.50 }`
- **THEN** the system returns HTTP 200 with the new value

#### Scenario: Promote to default
- **WHEN** the body is `{ "isDefault": true }` for a non-default price and another price is currently default
- **THEN** the system atomically sets the new price as default and unsets the previous default; returns HTTP 200

#### Scenario: Price not found
- **WHEN** `:priceId` does not exist
- **THEN** the system returns HTTP 404

---

### Requirement: Delete product price
The system SHALL expose `DELETE /api/v1/admin/products/:id/prices/:priceId`. Requires `products:write`. Returns HTTP 204. **Hard delete** — the row is removed permanently. Deleting the default price leaves the product without a default; the next `POST /prices` may set a new default.

#### Scenario: Delete price success
- **WHEN** an authorized user deletes an existing price
- **THEN** the system returns HTTP 204 and the row is removed

#### Scenario: Price not found
- **WHEN** `:priceId` does not exist
- **THEN** the system returns HTTP 404

---

### Requirement: List product dosifications with computed unit price
The system SHALL expose `GET /api/v1/admin/products/:id/dosifications`. Requires `products:read`. Returns `{ items: ProductDosificationDto[] }`. Each `ProductDosificationDto` includes `id`, `productId`, `name`, `numParts`, `isActive`, `computedUnitPrice: number | null`, `requiresDefaultPrice: boolean`, `createdAt`, `updatedAt`.

The `computedUnitPrice` is computed by the domain service `DosificationPriceCalculator` using the product's default price (`is_default = true`) as `basePrice`. Formula: `basePrice / numParts * (1 + 0.07)` — a fixed 7% surcharge. If the product has no default price, `computedUnitPrice` is `null` and `requiresDefaultPrice` is `true`.

#### Scenario: With default price
- **WHEN** the product has a default price of `100.00` and a dosification with `numParts=10`
- **THEN** the response includes that dosification with `computedUnitPrice ≈ 10.70` (100 / 10 * 1.07) and `requiresDefaultPrice: false`

#### Scenario: Without default price
- **WHEN** the product has no `is_default = true` price
- **THEN** the response includes each dosification with `computedUnitPrice: null` and `requiresDefaultPrice: true`

#### Scenario: Inactive dosifications included by default
- **WHEN** the product has dosifications with `is_active = false`
- **THEN** the response includes them (no filtering in the list endpoint; UI filters as needed)

---

### Requirement: Create product dosification
The system SHALL expose `POST /api/v1/admin/products/:id/dosifications`. Requires `products:write`. Required body: `name: string` (1–60 chars), `numParts: number` (integer >= 2). Optional: `isActive: boolean` (default `true`). Duplicate `name` for the same product returns HTTP 409.

#### Scenario: Create dosification
- **WHEN** the body is `{ "name": "Por dosis", "numParts": 50 }`
- **THEN** the system returns HTTP 201

#### Scenario: Reject numParts < 2
- **WHEN** the body is `{ "name": "X", "numParts": 1 }`
- **THEN** the system returns HTTP 400 (a dosification must split into at least 2 parts)

#### Scenario: Duplicate name
- **WHEN** the product already has a dosification with that name
- **THEN** the system returns HTTP 409

---

### Requirement: Update product dosification
The system SHALL expose `PATCH /api/v1/admin/products/:id/dosifications/:dosificationId`. Requires `products:write`. Body MAY include `name`, `numParts`, `isActive`. At least one field required.

#### Scenario: Update numParts
- **WHEN** the body is `{ "numParts": 24 }`
- **THEN** the system returns HTTP 200 with the new value; next GET shows recomputed `computedUnitPrice`

#### Scenario: Deactivate dosification
- **WHEN** the body is `{ "isActive": false }`
- **THEN** the system returns HTTP 200 with `isActive: false`

#### Scenario: Dosification not found
- **WHEN** `:dosificationId` does not exist
- **THEN** the system returns HTTP 404

---

### Requirement: Delete product dosification (soft)
The system SHALL expose `DELETE /api/v1/admin/products/:id/dosifications/:dosificationId`. Requires `products:write`. This is a **soft delete**: the row is marked `isActive = false` (the same effect as `PATCH { "isActive": false }`). Returns HTTP 204.

#### Scenario: Soft delete success
- **WHEN** an authorized user deletes a dosification
- **THEN** the system returns HTTP 204 and the row has `is_active = false`

#### Scenario: Reactivate via update
- **WHEN** an admin sends `PATCH /dosifications/:id` with `{"isActive": true}` later
- **THEN** the dosification is active again

---

### Requirement: Dosification price calculator (domain service)
The system SHALL provide a pure domain service `DosificationPriceCalculator` with a single static method `computeUnitPrice(basePrice: number, numParts: number): number` that returns `(basePrice / numParts) * (1 + DOSIFICATION_SURCHARGE_PCT / 100)` where `DOSIFICATION_SURCHARGE_PCT = 7.0`. The method SHALL throw if `numParts < 1`. The service SHALL have no I/O dependencies (no DB, no HTTP).

#### Scenario: Standard calculation
- **WHEN** `computeUnitPrice(100, 10)` is invoked
- **THEN** the result is `10.7` (within floating-point precision)

#### Scenario: With decimals
- **WHEN** `computeUnitPrice(99.99, 7)` is invoked
- **THEN** the result is approximately `15.284142...` (`99.99 / 7 * 1.07`)

#### Scenario: Zero base price
- **WHEN** `computeUnitPrice(0, 10)` is invoked
- **THEN** the result is `0`

#### Scenario: Reject invalid numParts
- **WHEN** `computeUnitPrice(100, 0)` or `computeUnitPrice(100, -1)` is invoked
- **THEN** the method throws an Error

#### Scenario: Domain purity
- **WHEN** unit tests are run against the calculator
- **THEN** no Prisma, no fetch, no environment access is required
