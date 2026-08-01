## ADDED Requirements

### Requirement: List tax rates
The system SHALL expose `GET /api/v1/admin/tax-rates` that returns a paginated list of tax rates. Requires `tax_rates:read`. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`). Response: `{ items: TaxRateDto[], total, page, pageSize }`. Each `TaxRateDto`: `{ id, code, name, description, rate, isActive, createdAt, updatedAt }`. `rate` is a decimal number (0–1, 4 decimal places). Results ordered `createdAt DESC`.

#### Scenario: Admin lists active tax rates
- **WHEN** authenticated user with `tax_rates:read` calls `GET /api/v1/admin/tax-rates`
- **THEN** system returns HTTP 200 with active tax rates only

#### Scenario: Include inactive
- **WHEN** request includes `?includeInactive=true`
- **THEN** response includes inactive tax rates

#### Scenario: Forbidden without permission
- **WHEN** user lacks `tax_rates:read`
- **THEN** system returns HTTP 403 `{"error":"Forbidden","required":"tax_rates:read"}`

### Requirement: Get tax rate detail
The system SHALL expose `GET /api/v1/admin/tax-rates/:id`. Requires `tax_rates:read`. Returns HTTP 404 if not found. Returns `TaxRateDto` regardless of `isActive`.

#### Scenario: Get existing tax rate
- **WHEN** `:id` matches a valid tax rate UUID
- **THEN** system returns HTTP 200 with `TaxRateDto`

#### Scenario: Not found
- **WHEN** `:id` does not match any tax rate
- **THEN** system returns HTTP 404 `{"error":"Tax rate not found"}`

### Requirement: Create tax rate
The system SHALL expose `POST /api/v1/admin/tax-rates`. Requires `tax_rates:write`. Body: `{ code: string (^[A-Z0-9_]{1,32}$), name: string (1-100 chars), description?: string|null, rate: number (0 ≤ rate ≤ 1, 4 decimal precision), isActive?: boolean (default true) }`. `code` is normalized to uppercase and trimmed. Duplicate `code` returns HTTP 409. Returns HTTP 201 with `TaxRateDto`.

#### Scenario: Successful creation
- **WHEN** body is `{ "code": "IVA_16", "name": "IVA 16%", "rate": 0.16 }`
- **THEN** system returns HTTP 201 with the new tax rate

#### Scenario: Duplicate code
- **WHEN** `code` already exists
- **THEN** system returns HTTP 409 `{"error":"Tax rate code already in use"}`

#### Scenario: Rate out of range
- **WHEN** `rate: 1.5`
- **THEN** system returns HTTP 400 with validation error

#### Scenario: Empty body
- **WHEN** body contains no required fields
- **THEN** system returns HTTP 400

### Requirement: Update tax rate
The system SHALL expose `PATCH /api/v1/admin/tax-rates/:id`. Requires `tax_rates:write`. Body MAY include `name`, `description` (string or null), `rate`, `isActive`. Field `code` MUST be ignored silently. At least one field required (empty body → 400). `rate` validation same as create. Updating a tax rate with associated active products is allowed (no block). Returns HTTP 200 with updated `TaxRateDto`.

#### Scenario: Update rate value
- **WHEN** body is `{ "rate": 0.08 }`
- **THEN** system returns HTTP 200 with updated rate; associated products are not affected

#### Scenario: Empty body
- **WHEN** body is `{}`
- **THEN** system returns HTTP 400

### Requirement: Deactivate tax rate (soft delete)
The system SHALL expose `DELETE /api/v1/admin/tax-rates/:id`. Requires `tax_rates:write`. Sets `isActive=false`. If there are active products (`isActive=true`) with `taxRateId=id`, the system SHALL return HTTP 409 `{"error":"TaxRateInUse","productCount":N}`. Deactivating an already-inactive tax rate returns HTTP 200 (idempotent).

#### Scenario: Deactivate unused tax rate
- **WHEN** no active products are associated
- **THEN** system returns HTTP 200 with `isActive: false`

#### Scenario: Tax rate in use by active products
- **WHEN** 3 active products have `taxRateId=id`
- **THEN** system returns HTTP 409 `{"error":"TaxRateInUse","productCount":3}`

#### Scenario: Already inactive
- **WHEN** tax rate is already `isActive=false`
- **THEN** system returns HTTP 200 (idempotent)

### Requirement: RBAC permissions for tax rates
The system SHALL register permissions `tax_rates:read` and `tax_rates:write` in the RBAC seed. Role assignments: `admin` → both; `operator` → both; `viewer` → `tax_rates:read` only.

#### Scenario: Operator can create tax rates
- **WHEN** user with role `operator` calls `POST /api/v1/admin/tax-rates`
- **THEN** request is permitted (HTTP 201)

#### Scenario: Viewer cannot write
- **WHEN** user with role `viewer` calls `POST /api/v1/admin/tax-rates`
- **THEN** system returns HTTP 403

### Requirement: Seed canonical tax rates
The system SHALL include an idempotent seed (`prisma/seeds/taxRates.ts`) that creates or updates three canonical tax rates: `IVA_16` (rate=0.1600, name="IVA 16%"), `IEPS_8` (rate=0.0800, name="IEPS 8%"), `IVA_0` (rate=0.0000, name="IVA 0%"). The seed SHALL use `upsert` by `code` and be registered in `prisma/seed.ts`.

#### Scenario: Seed runs twice without error
- **WHEN** `npm run seed` is executed twice
- **THEN** no duplicate tax rates are created; existing ones are updated if changed
