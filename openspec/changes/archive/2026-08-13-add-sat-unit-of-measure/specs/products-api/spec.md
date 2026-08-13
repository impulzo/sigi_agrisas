## MODIFIED Requirements

### Requirement: List products
El sistema SHALL exponer `GET /api/v1/admin/products` que retorna una lista paginada de productos. Requiere el permiso `products:read`. Los parámetros de query controlan el resultado: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (opcional, mín. 2 chars cuando está presente; matchea `name` OR `code` vía `OR ILIKE '%search%'`), `departmentId` (filtro UUID opcional), `branchId` (UUID opcional). Respuesta: `{ items: ProductDto[], total: number, page: number, pageSize: number }`. Cada `ProductDto` incluye `id`, `code`, `name`, `unit` (clave SAT `c_ClaveUnidad`), `unitDescription` (string o `null` — descripción legible resuelta contra el catálogo SAT; `null` si `unit` no matchea ninguna clave del catálogo), `satProductCode` (string o `null`), `departmentId`, `departmentName` (joined), `ivaRate` (decimal 0–1 o `null`), `iepsRate` (decimal 0–1 o `null`), `imageUrl` (string o `null`), `isTaxable` (boolean), `isActive`, `createdAt`, `updatedAt`, y `stock: number | null`. Resultados ordenados por `createdAt DESC`.

**`stock` field**: cuando la request incluye `branchId`, el sistema SHALL hacer join con `branch_inventory` filtrado por `(branch_id = branchId, product_id = product.id)` (par único) y setear `stock = branch_inventory.quantity` para ese producto, o `stock = null` si no existe fila `branch_inventory` para ese par. Cuando la request omite `branchId`, `stock` siempre es `null`. Esto NO requiere el permiso `inventory:read` — `products:read` es suficiente.

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

#### Scenario: Producto con clave SAT válida incluye descripción resuelta
- **WHEN** un producto listado tiene `unit: "KGM"` y el catálogo SAT está sembrado
- **THEN** el item correspondiente incluye `unitDescription: "Kilogramo"`

#### Scenario: Producto con dato legado incluye unitDescription null
- **WHEN** un producto listado tiene `unit` en texto libre no capturado desde el catálogo (dato previo a este cambio)
- **THEN** el item correspondiente incluye `unitDescription: null`

---

### Requirement: Create product
The system SHALL expose `POST /api/v1/admin/products`. Requires `products:write`. Required body fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$`
- `name: string` (1–200 chars)
- `unit: string` matching `^[A-Za-z0-9]{2,3}$` (clave de unidad de medida del catálogo SAT `c_ClaveUnidad`; ej. `"KGM"`, `"H87"`, `"LTR"`)
- `departmentId: string` (UUID of an existing `Department`)

Optional fields:

- `satProductCode: string | null` matching `^\d{8}$`
- `ivaRate: number | null` (decimal 0–1; e.g. `0.16` for 16% — controller accepts also `16` and normalizes to `0.16`)
- `iepsRate: number | null` (same semantics as `ivaRate`)
- `imageUrl: string | null` (URL https válida, ≤2048 chars; default `null`)
- `isActive: boolean` (default `true`)
- `isTaxable: boolean` (default `false`)

The controller SHALL trim and uppercase `code` before persisting. The controller SHALL validate `isTaxable` as a boolean (non-boolean value → HTTP 400). The controller SHALL validate `unit` against the SAT unit-of-measure code format — this is a format check only (no FK to the catalog table), consistent with `satProductCode`: a full catalog re-seed cannot orphan an existing product's `unit`. Returns HTTP 201 with the new `ProductDto` including `isTaxable`. Duplicate `code` returns HTTP 409. `departmentId` not found returns HTTP 400 (or 422 — implementer's choice, must be documented). When `imageUrl` is provided in `POST` it MUST be a URL pointing to the configured Supabase Storage public bucket (`product-images`); URLs from other origins SHALL be rejected with HTTP 400.

#### Scenario: Minimal creation
- **WHEN** the body is `{ "code": "ARROZ_001", "name": "Arroz", "unit": "KGM", "departmentId": "<uuid>" }` with an existing department
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

#### Scenario: Invalid unit format rejected
- **WHEN** the body contains `unit: "kilogramos"` (free text, does not match the SAT unit code format)
- **THEN** the system returns HTTP 400

#### Scenario: imageUrl from foreign origin rejected
- **WHEN** the body contains `imageUrl: "https://evil.example.com/x.jpg"` (not the configured Supabase Storage bucket)
- **THEN** the system returns HTTP 400 `{"error": "Invalid image URL"}`

#### Scenario: Forbidden
- **WHEN** an authenticated user without `products:write` calls the endpoint
- **THEN** the system returns HTTP 403

---

### Requirement: Update product
The system SHALL expose `PATCH /api/v1/admin/products/:id`. Requires `products:write`. The body MAY include any of `name`, `unit`, `satProductCode`, `departmentId`, `ivaRate`, `iepsRate`, `imageUrl`, `isActive`, `isTaxable`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. `unit`, when present, MUST match the SAT unit code format `^[A-Za-z0-9]{2,3}$` (same rule as creation). `isTaxable` MAY be included and SHALL be validated as boolean. Body MUST contain at least one updatable field, else HTTP 400. Optional fields set to `null` clear the value. Setting `imageUrl: null` clears the persisted URL but does NOT delete the underlying object in Supabase Storage (use `DELETE /products/:id/image` for that). Setting `imageUrl` to a non-bucket URL SHALL return HTTP 400. Returns HTTP 200 with updated `ProductDto` including `isTaxable`.

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

#### Scenario: Update to invalid unit format rejected
- **WHEN** the body is `{ "unit": "saco 25kg" }` (free text, does not match the SAT unit code format)
- **THEN** the system returns HTTP 400

#### Scenario: Update to valid SAT unit code accepted
- **WHEN** the body is `{ "unit": "LTR" }` on an existing product
- **THEN** the system returns HTTP 200 with `unit: "LTR"`
