## MODIFIED Requirements

### Requirement: List products
The system SHALL expose `GET /api/v1/admin/products` that returns a paginated list of products. Requires the `products:read` permission. Query parameters control the result set: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (optional, min 2 chars when present; matches `name` OR `code` via `OR ILIKE '%search%'`), `departmentId` (optional UUID filter). Response: `{ items: ProductDto[], total: number, page: number, pageSize: number }`. Each `ProductDto` includes `id`, `code`, `name`, `unit`, `satProductCode` (string or `null`), `departmentId`, `departmentName` (joined), `ivaRate` (decimal 0–1 or `null`), `iepsRate` (decimal 0–1 or `null`), `imageUrl` (string or `null`), `isActive`, `createdAt`, `updatedAt`. Results ordered by `createdAt DESC`.

#### Scenario: Admin lists active products
- **WHEN** an authenticated user with `products:read` sends `GET /api/v1/admin/products`
- **THEN** the system returns HTTP 200 with active products only, includes `departmentName` joined from the `departments` table, and each item includes `imageUrl` (string URL or `null`)

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

The controller SHALL trim and uppercase `code` before persisting. Returns HTTP 201 with the new `ProductDto`. Duplicate `code` returns HTTP 409. `departmentId` not found returns HTTP 400 (or 422 — implementer's choice, must be documented). When `imageUrl` is provided in `POST` it MUST be a URL pointing to the configured Supabase Storage public bucket (`product-images`); URLs from other origins SHALL be rejected with HTTP 400.

#### Scenario: Minimal creation
- **WHEN** the body is `{ "code": "ARROZ_001", "name": "Arroz", "unit": "kg", "departmentId": "<uuid>" }` with an existing department
- **THEN** the system returns HTTP 201 with `satProductCode`, `ivaRate`, `iepsRate`, `imageUrl` all `null` and `isActive: true`

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
The system SHALL expose `PATCH /api/v1/admin/products/:id`. Requires `products:write`. The body MAY include any of `name`, `unit`, `satProductCode`, `departmentId`, `ivaRate`, `iepsRate`, `imageUrl`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. Body MUST contain at least one updatable field, else HTTP 400. Optional fields set to `null` clear the value. Setting `imageUrl: null` clears the persisted URL but does NOT delete the underlying object in Supabase Storage (use `DELETE /products/:id/image` for that). Setting `imageUrl` to a non-bucket URL SHALL return HTTP 400.

#### Scenario: Update name and tax
- **WHEN** the body is `{ "name": "Arroz Integral", "ivaRate": 0 }`
- **THEN** the system returns HTTP 200 with the updated entity

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

## ADDED Requirements

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
