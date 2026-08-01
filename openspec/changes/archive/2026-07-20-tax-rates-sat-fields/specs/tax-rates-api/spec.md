## MODIFIED Requirements

### Requirement: List tax rates
The system SHALL expose `GET /api/v1/admin/tax-rates` that returns a paginated list of tax rates. Requires `tax_rates:read`. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`). Response: `{ items: TaxRateDto[], total, page, pageSize }`. Each `TaxRateDto`: `{ id, code, name, description, satTaxCode, factorType, displayValue, rate, transferredAccount, pendingTransferredAccount, creditedAccount, pendingCreditedAccount, isActive, createdAt, updatedAt }`. `rate` is a decimal number (6 decimal places, format `0.000000`). Results ordered `createdAt DESC`.

#### Scenario: Admin lists active tax rates
- **WHEN** authenticated user with `tax_rates:read` calls `GET /api/v1/admin/tax-rates`
- **THEN** system returns HTTP 200 with active tax rates only, each including `satTaxCode`, `factorType`, `displayValue` and the 4 account fields

#### Scenario: Include inactive
- **WHEN** request includes `?includeInactive=true`
- **THEN** response includes inactive tax rates

#### Scenario: Forbidden without permission
- **WHEN** user lacks `tax_rates:read`
- **THEN** system returns HTTP 403 `{"error":"Forbidden","required":"tax_rates:read"}`

### Requirement: Get tax rate detail
The system SHALL expose `GET /api/v1/admin/tax-rates/:id`. Requires `tax_rates:read`. Returns HTTP 404 if not found. Returns `TaxRateDto` (including `satTaxCode`, `factorType`, `displayValue`, 4 account fields) regardless of `isActive`.

#### Scenario: Get existing tax rate
- **WHEN** `:id` matches a valid tax rate UUID
- **THEN** system returns HTTP 200 with `TaxRateDto` including the SAT classification fields

#### Scenario: Not found
- **WHEN** `:id` does not match any tax rate
- **THEN** system returns HTTP 404 `{"error":"Tax rate not found"}`

### Requirement: Create tax rate
The system SHALL expose `POST /api/v1/admin/tax-rates`. Requires `tax_rates:write`. Body: `{ code: string (^[A-Z0-9_]{1,32}$), name: string (1-100 chars), description?: string|null, satTaxCode: string (^\d{3}$), factorType: "Tasa" | "Cuota" | "Exento", displayValue: number, rate: number (6 decimal precision), transferredAccount?: string|null (max 20 chars), pendingTransferredAccount?: string|null (max 20 chars), creditedAccount?: string|null (max 20 chars), pendingCreditedAccount?: string|null (max 20 chars), isActive?: boolean (default true) }`. `code` is normalized to uppercase and trimmed. Duplicate `code` returns HTTP 409. Returns HTTP 201 with `TaxRateDto`.

#### Scenario: Successful creation
- **WHEN** body is `{ "code": "IVA_16", "name": "IVA 16%", "satTaxCode": "002", "factorType": "Tasa", "displayValue": 16, "rate": 0.16 }`
- **THEN** system returns HTTP 201 with the new tax rate including the SAT classification fields

#### Scenario: Duplicate code
- **WHEN** `code` already exists
- **THEN** system returns HTTP 409 `{"error":"Tax rate code already in use"}`

#### Scenario: Invalid SAT tax code format
- **WHEN** `satTaxCode: "IVA"` (not 3 digits)
- **THEN** system returns HTTP 400 with validation error on `satTaxCode`

#### Scenario: Invalid factor type
- **WHEN** `factorType: "Porcentaje"` (not in enum)
- **THEN** system returns HTTP 400 with validation error on `factorType`

#### Scenario: Empty body
- **WHEN** body contains no required fields
- **THEN** system returns HTTP 400

#### Scenario: Optional accounting accounts omitted
- **WHEN** body omits `transferredAccount`, `pendingTransferredAccount`, `creditedAccount`, `pendingCreditedAccount`
- **THEN** system returns HTTP 201 with those fields as `null`

### Requirement: Update tax rate
The system SHALL expose `PATCH /api/v1/admin/tax-rates/:id`. Requires `tax_rates:write`. Body MAY include `name`, `description` (string or null), `satTaxCode`, `factorType`, `displayValue`, `rate`, `transferredAccount`, `pendingTransferredAccount`, `creditedAccount`, `pendingCreditedAccount`, `isActive`. Field `code` MUST be ignored silently. At least one field required (empty body → 400). `satTaxCode`/`factorType`/`rate` validation same as create. Updating a tax rate with associated active products is allowed (no block). Returns HTTP 200 with updated `TaxRateDto`.

#### Scenario: Update rate value
- **WHEN** body is `{ "rate": 0.080000 }`
- **THEN** system returns HTTP 200 with updated rate; associated products are not affected

#### Scenario: Update SAT classification fields
- **WHEN** body is `{ "satTaxCode": "003", "factorType": "Tasa", "displayValue": 8 }`
- **THEN** system returns HTTP 200 with updated classification fields

#### Scenario: Empty body
- **WHEN** body is `{}`
- **THEN** system returns HTTP 400

#### Scenario: Code ignored on update
- **WHEN** body includes `{ "code": "NEW_CODE", "name": "Updated" }`
- **THEN** system returns HTTP 200 with `code` unchanged and `name` updated

### Requirement: Seed canonical tax rates
The system SHALL include an idempotent seed (`prisma/seeds/taxRates.ts`) that creates or updates three canonical tax rates: `IVA_16` (satTaxCode="002", factorType="Tasa", displayValue=16, rate=0.160000, name="IVA 16%"), `IEPS_8` (satTaxCode="003", factorType="Tasa", displayValue=8, rate=0.080000, name="IEPS 8%"), `IVA_0` (satTaxCode="002", factorType="Tasa", displayValue=0, rate=0.000000, name="IVA 0%"). The seed SHALL use `upsert` by `code` and be registered in `prisma/seed.ts`.

#### Scenario: Seed runs twice without error
- **WHEN** `npm run seed` is executed twice
- **THEN** no duplicate tax rates are created; existing ones are updated if changed, including the SAT classification fields

#### Scenario: Existing rows backfilled by migration
- **WHEN** the `add_sat_fields_to_tax_rates` migration runs against a database with the 3 pre-existing seeded rows
- **THEN** each row ends up with a non-null `satTaxCode`, `factorType`, and `displayValue` matching the values above, without requiring the seed script to run first

<!--
Nota de trazabilidad: la fila 4 de "Historia de Usuario" en proposal.md (guard de eliminación
si un producto usa el impuesto) NO tiene delta aquí porque el requirement "Deactivate tax rate
(soft delete)" del capability `tax-rates-api` (definido en el change pendiente `tax-rates`,
openspec/changes/tax-rates/specs/tax-rates-api/spec.md) ya cubre exactamente ese comportamiento
sin cambios. Este change no lo modifica.
-->
