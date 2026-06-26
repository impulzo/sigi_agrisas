# Spec: products-api

## Purpose

Define the Products API: CRUD endpoints for the product catalog (SKUs), sub-resource management for prices and dosifications, and the domain service for computing dosification unit prices.

---

## Requirements

### Requirement: List products
The system SHALL expose `GET /api/v1/admin/products` that returns a paginated list of products. Requires the `products:read` permission. Query parameters control the result set: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (optional, min 2 chars when present; matches `name` OR `code` via `OR ILIKE '%search%'`), `departmentId` (optional UUID filter). Response: `{ items: ProductDto[], total: number, page: number, pageSize: number }`. Each `ProductDto` includes `id`, `code`, `name`, `unit`, `satProductCode` (string or `null`), `departmentId`, `departmentName` (joined), `ivaRate` (decimal 0–1 or `null`), `iepsRate` (decimal 0–1 or `null`), `imageUrl` (string or `null`), `isTaxable` (boolean), `isActive`, `createdAt`, `updatedAt`. Results ordered by `createdAt DESC`.

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

---

### Requirement: Get product detail
The system SHALL expose `GET /api/v1/admin/products/:id` that returns a single product by UUID. Requires `products:read`. Returns the entity regardless of `isActive`. The response includes `imageUrl: string | null`. Returns HTTP 404 if not found.

#### Scenario: Admin gets product
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `ProductDto` including `imageUrl`

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
- `imageUrl: string | null` (URL https válida, ≤2048 chars; default `null`)
- `isActive: boolean` (default `true`)
- `isTaxable: boolean` (default `false`)

The controller SHALL trim and uppercase `code` before persisting. The controller SHALL validate `isTaxable` as a boolean (non-boolean value → HTTP 400). Returns HTTP 201 with the new `ProductDto` including `isTaxable`. Duplicate `code` returns HTTP 409. `departmentId` not found returns HTTP 400 (or 422 — implementer's choice, must be documented). When `imageUrl` is provided in `POST` it MUST be a URL pointing to the configured Supabase Storage public bucket (`product-images`); URLs from other origins SHALL be rejected with HTTP 400.

#### Scenario: Minimal creation
- **WHEN** the body is `{ "code": "ARROZ_001", "name": "Arroz", "unit": "kg", "departmentId": "<uuid>" }` with an existing department
- **THEN** the system returns HTTP 201 with `satProductCode`, `ivaRate`, `iepsRate`, `imageUrl` all `null` and `isActive: true`

#### Scenario: Minimal creation defaults isTaxable to false
- **WHEN** the body omits `isTaxable`
- **THEN** the system persists `is_taxable = false` and returns `isTaxable: false` in HTTP 201

#### Scenario: Explicit isTaxable true
- **WHEN** the body includes `isTaxable: true`
- **THEN** the system persists `is_taxable = true` and returns `isTaxable: true` in HTTP 201

#### Scenario: Non-boolean isTaxable rejected
- **WHEN** the body includes `isTaxable: "yes"`
- **THEN** the system returns HTTP 400

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

#### Scenario: imageUrl from foreign origin rejected
- **WHEN** the body contains `imageUrl: "https://evil.example.com/x.jpg"` (not the configured Supabase Storage bucket)
- **THEN** the system returns HTTP 400 `{"error": "Invalid image URL"}`

#### Scenario: Forbidden
- **WHEN** an authenticated user without `products:write` calls the endpoint
- **THEN** the system returns HTTP 403

---

### Requirement: Update product
The system SHALL expose `PATCH /api/v1/admin/products/:id`. Requires `products:write`. The body MAY include any of `name`, `unit`, `satProductCode`, `departmentId`, `ivaRate`, `iepsRate`, `imageUrl`, `isActive`, `isTaxable`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. `isTaxable` MAY be included and SHALL be validated as boolean. Body MUST contain at least one updatable field, else HTTP 400. Optional fields set to `null` clear the value. Setting `imageUrl: null` clears the persisted URL but does NOT delete the underlying object in Supabase Storage (use `DELETE /products/:id/image` for that). Setting `imageUrl` to a non-bucket URL SHALL return HTTP 400. Returns HTTP 200 with updated `ProductDto` including `isTaxable`.

#### Scenario: Update name and tax
- **WHEN** the body is `{ "name": "Arroz Integral", "ivaRate": 0 }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Toggle isTaxable to true
- **WHEN** the body includes `isTaxable: true` on an existing product with `isTaxable: false`
- **THEN** the system returns HTTP 200 with `isTaxable: true`

#### Scenario: Toggle isTaxable to false
- **WHEN** the body includes `isTaxable: false` on an existing product with `isTaxable: true`
- **THEN** the system returns HTTP 200 with `isTaxable: false`

#### Scenario: Clear optional field
- **WHEN** the body is `{ "satProductCode": null }`
- **THEN** the system stores `null` in `sat_product_code` and returns HTTP 200

#### Scenario: Clear imageUrl preserves storage object
- **WHEN** the body is `{ "imageUrl": null }`
- **THEN** the system stores `null` in `image_url`, returns HTTP 200, and does NOT delete the object from Supabase Storage

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

### Requirement: Upload product image
The system SHALL expose `POST /api/v1/admin/products/:id/image` that receives a multipart request with field `file: File` and stores the image in Supabase Storage bucket `product-images`. Requires `products:write`.

Validation rules:
- MIME type MUST be one of: `image/jpeg`, `image/png`, `image/webp`. Otherwise HTTP 400 `{"error": "Invalid image format"}`.
- File size MUST be ≤ 2 MB (2 * 1024 * 1024 bytes). Otherwise HTTP 413 `{"error": "Image too large", "maxBytes": 2097152}`.
- Multipart body MUST contain exactly one `file` field. Otherwise HTTP 400.

Side effects:
- Upload object with key `products/{productId}/{newUuid}.{ext}` to bucket `product-images`.
- If the product already had `image_url` from this bucket, the previous object SHALL be deleted from Storage after the new one is persisted (best-effort; failure to delete the old object is logged but does not fail the request).
- Persist new public URL in `products.image_url`.

Returns HTTP 200 with `{ imageUrl: string }` (the new public URL).

Returns HTTP 404 if `:id` does not match any product. Returns HTTP 403 if user lacks `products:write`.

#### Scenario: Successful upload
- **WHEN** an authenticated user with `products:write` posts multipart with a 500 KB `image/png`
- **THEN** the system returns HTTP 200 with `{ imageUrl: "https://<supabase>/storage/v1/object/public/product-images/products/<id>/<uuid>.png" }` and `products.image_url` is updated

#### Scenario: Invalid MIME
- **WHEN** the uploaded file has MIME `application/pdf`
- **THEN** the system returns HTTP 400 `{"error": "Invalid image format"}`

#### Scenario: File too large
- **WHEN** the uploaded file is 3 MB
- **THEN** the system returns HTTP 413 `{"error": "Image too large", "maxBytes": 2097152}`

#### Scenario: Re-upload deletes previous object
- **WHEN** the product already has `image_url` pointing to a prior object in the bucket and a new valid upload arrives
- **THEN** the system uploads the new object, persists the new URL, and deletes the prior object from Storage (best-effort)

#### Scenario: Product not found
- **WHEN** the `:id` does not match any product
- **THEN** the system returns HTTP 404

#### Scenario: Forbidden
- **WHEN** the user lacks `products:write`
- **THEN** the system returns HTTP 403

---

### Requirement: Delete product image
The system SHALL expose `DELETE /api/v1/admin/products/:id/image` that removes the persisted image. Requires `products:write`. If `products.image_url` is non-null and points to the configured bucket, the underlying Storage object SHALL be deleted. Then `image_url` is set to `null` and the system returns HTTP 204.

If `products.image_url` is already `null`, returns HTTP 204 (idempotent).

#### Scenario: Delete existing image
- **WHEN** the product has a non-null `image_url`
- **THEN** the system deletes the Storage object, sets `image_url = null`, and returns HTTP 204

#### Scenario: Delete is idempotent
- **WHEN** the product already has `image_url = null`
- **THEN** the system returns HTTP 204 without contacting Storage

#### Scenario: Forbidden
- **WHEN** the user lacks `products:write`
- **THEN** the system returns HTTP 403

#### Scenario: Product not found
- **WHEN** the `:id` does not match any product
- **THEN** the system returns HTTP 404

---

### Requirement: Product image storage configuration
The Supabase project SHALL host a bucket named `product-images` configured as: SELECT (read) public; INSERT/UPDATE/DELETE restricted to the `service_role`. The backend SHALL read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment; the service role key MUST NOT be exposed to the browser. The `ProductImageStorage` adapter SHALL be the single integration point with Supabase Storage (`@supabase/supabase-js` server client).

#### Scenario: Service role key only on server
- **WHEN** the frontend bundle is inspected
- **THEN** `SUPABASE_SERVICE_ROLE_KEY` SHALL NOT appear anywhere in the client bundle

#### Scenario: Bucket policy enforces public read
- **WHEN** an unauthenticated `GET` is made to the public URL of any uploaded image
- **THEN** the request succeeds with HTTP 200 (public read)

#### Scenario: Bucket policy rejects anonymous writes
- **WHEN** an unauthenticated `POST` attempts to upload to the bucket
- **THEN** Supabase rejects the request (only `service_role` may write)

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

---

### Requirement: ProductDto includes providerName
The `ProductDto` (list and detail) SHALL include `providerName: string | null` derived from the join `products → departments → providers`. When the department has no provider, `providerName` is `null`. The list response SHALL also include `providerId: string | null` as a flat field.

#### Scenario: List products includes providerName
- **WHEN** GET /api/v1/admin/products returns items
- **THEN** each item includes `providerName: string | null` and `providerId: string | null`

#### Scenario: Detail includes providerName
- **WHEN** GET /api/v1/admin/products/:id is called
- **THEN** response includes `providerName` from the department's provider

---

### Requirement: Filter products by provider
`GET /api/v1/admin/products` SHALL accept an optional query parameter `providerId: string (UUID)`. When provided, only products whose department has `provider_id = providerId` are returned. Combined with existing filters (`departmentId`, `search`, pagination).

#### Scenario: Filter by provider
- **WHEN** request includes `?providerId=<uuid>`
- **THEN** response contains only products whose department belongs to that provider

#### Scenario: Combined filter providerId + departmentId
- **WHEN** request includes both `?providerId=<uuid>&departmentId=<uuid>`
- **THEN** both filters are applied (AND condition); if the department doesn't belong to that provider, result is empty

---

### Requirement: Taxable flag drives total calculation
The system SHALL propagate `isTaxable` from the product catalog through `PosLookupService` to `SaleTotalsCalculator` and `QuoteTotalsCalculator`. When a line item has `isTaxable = false`, the calculators SHALL use `effectiveIvaRate = 0` and `effectiveIepsRate = 0` regardless of the stored `ivaRate`/`iepsRate` on the product price.

#### Scenario: Non-taxable product generates zero tax in sale totals
- **WHEN** a sale line item references a product with `isTaxable = false` and `ivaRate = 0.16`
- **THEN** `lineIva = 0` and `lineIeps = 0` for that line

#### Scenario: Taxable product generates tax normally
- **WHEN** a sale line item references a product with `isTaxable = true` and `ivaRate = 0.16`
- **THEN** `lineIva = round(lineSubtotal * 0.16, 4)`
