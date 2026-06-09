# Spec: admin-providers

## Purpose

Define the REST API for provider management: a paginated catalog with fiscal data (RFC, tax regime, CFDI use), soft delete via `isActive`, and RBAC-guarded endpoints under `/api/v1/admin/providers`.

---

## Requirements

### Requirement: List providers
The system SHALL expose `GET /api/v1/admin/providers` that returns a paginated list of providers. Requires the `providers:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`) and `search` (optional, min 2 chars when present) control the result set. By default the system SHALL return only providers with `isActive = true`. When `search` is provided, the system SHALL match it case-insensitively against `name`, `legalName` and `rfc` with `OR ILIKE '%<search>%'` semantics. Whitespace-only `search` values SHALL be ignored. The response SHALL be `{ items: ProviderDto[], total: number, page: number, pageSize: number }`. Each `ProviderDto` includes `id`, `code`, `name`, `rfc`, `legalName` (string or `null`), `taxRegime` (string or `null`), `cfdiUse` (string or `null`), `taxZipCode` (string or `null`), `email` (string or `null`), `phone` (string or `null`), `address` (string or `null`), `contactName` (string or `null`), `notes` (string or `null`), `isActive`, `createdAt`, `updatedAt`. Results SHALL be ordered by `createdAt DESC`.

#### Scenario: Admin lists active providers
- **WHEN** an authenticated user with `providers:read` sends `GET /api/v1/admin/providers`
- **THEN** the system returns HTTP 200 with active providers only

#### Scenario: Admin lists including inactive providers
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes inactive providers as well

#### Scenario: Admin searches by RFC
- **WHEN** the request includes `?search=XAXX010101`
- **THEN** the response includes any provider whose `name`, `legalName` or `rfc` contains `XAXX010101` case-insensitively

#### Scenario: Search with single character is rejected
- **WHEN** the request includes `?search=a`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Whitespace search is ignored
- **WHEN** the request includes `?search=%20%20%20`
- **THEN** the system treats it as if `search` was absent and returns the full paginated result

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `providers:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "providers:read"}`

---

### Requirement: Get provider detail
The system SHALL expose `GET /api/v1/admin/providers/:id` that returns a single provider by UUID. Requires `providers:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets provider
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `ProviderDto`

#### Scenario: Provider not found
- **WHEN** the `:id` does not match any provider
- **THEN** the system returns HTTP 404 `{"error": "Provider not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create provider
The system SHALL expose `POST /api/v1/admin/providers` to create a new provider. Requires `providers:write`. The body SHALL include three required fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$`
- `name: string` (1–120 chars)
- `rfc: string` matching `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` (12 chars for Persona Moral, 13 chars for Persona Física; covers generic `XEXX010101000` and `XAXX010101000`)

Optional fields:

- `legalName: string | null` (max 200 chars)
- `taxRegime: string | null` (3 digits, matching `^\d{3}$`)
- `cfdiUse: string | null` (1 letter + 2 digits, matching `^[A-Z]\d{2}$`)
- `taxZipCode: string | null` (5 digits, matching `^\d{5}$`)
- `email: string | null` (valid email when not null, max 120 chars)
- `phone: string | null` (max 30 chars)
- `address: string | null` (max 300 chars)
- `contactName: string | null` (max 120 chars)
- `notes: string | null` (no max)
- `isActive: boolean` (default `true`)

The controller SHALL trim and uppercase `code`, `rfc`, `taxRegime` and `cfdiUse` before validation. Returns HTTP 201 with the new `ProviderDto`. Duplicate `code` returns HTTP 409 `{"error": "Provider code already in use"}`. Duplicate `rfc` returns HTTP 409 `{"error": "Provider RFC already in use"}`.

#### Scenario: Successful creation with minimal body
- **WHEN** the body is `{ "code": "PROV_001", "name": "Semillas ACME", "rfc": "SAC120101A12" }`
- **THEN** the system returns HTTP 201 with all optional fields set to `null` and `isActive: true`

#### Scenario: Successful creation with full fiscal data
- **WHEN** the body includes `code`, `name`, `rfc`, `legalName`, `taxRegime: "601"`, `cfdiUse: "G03"`, `taxZipCode: "06600"`, `email`, `phone`, `address`
- **THEN** the system persists all fields and returns HTTP 201

#### Scenario: RFC is normalized to uppercase
- **WHEN** the body contains `rfc: "sac120101a12"`
- **THEN** the system stores `SAC120101A12` and the response includes the uppercased value

#### Scenario: RFC for Persona Física (13 chars) is accepted
- **WHEN** the body contains `rfc: "HEGJ800101XYZ"`
- **THEN** the system returns HTTP 201

#### Scenario: Generic foreign RFC is accepted
- **WHEN** the body contains `rfc: "XEXX010101000"`
- **THEN** the system returns HTTP 201

#### Scenario: Invalid RFC format
- **WHEN** the body contains `rfc: "ABC123"`
- **THEN** the system returns HTTP 400 with a validation error referencing `rfc`

#### Scenario: Invalid taxRegime format
- **WHEN** the body contains `taxRegime: "60"` (only 2 digits)
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Invalid cfdiUse format
- **WHEN** the body contains `cfdiUse: "G0"` (missing digit)
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Invalid email format
- **WHEN** the body contains `email: "not-an-email"`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Duplicate code
- **WHEN** the body contains a `code` that already exists in the table
- **THEN** the system returns HTTP 409 `{"error": "Provider code already in use"}`

#### Scenario: Duplicate RFC
- **WHEN** the body contains an `rfc` that already exists in the table (case-insensitive)
- **THEN** the system returns HTTP 409 `{"error": "Provider RFC already in use"}`

#### Scenario: Unauthorized user (write)
- **WHEN** an authenticated user without `providers:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "providers:write"}`

---

### Requirement: Update provider
The system SHALL expose `PATCH /api/v1/admin/providers/:id` to partially update a provider. Requires `providers:write`. The body MAY include any of `name`, `rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. At least one updatable field MUST be present (excluding `code`).

When `rfc` is provided, it SHALL be re-validated with the same regex as on create and trimmed/uppercased. Optional fields that accept `null` (`legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`) clear the value when set explicitly to `null`. The same uniqueness constraint on `rfc` applies: changing it to a value already used by another provider returns HTTP 409.

#### Scenario: Admin updates fiscal data
- **WHEN** the body is `{ "legalName": "Semillas ACME S.A. de C.V.", "taxRegime": "601" }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Admin updates RFC
- **WHEN** the body is `{ "rfc": "sac120101a12" }`
- **THEN** the system normalizes to uppercase, validates the format, and returns HTTP 200 with the new value

#### Scenario: Admin clears optional field
- **WHEN** the body is `{ "legalName": null }`
- **THEN** the system stores `null` in `legal_name` and returns HTTP 200

#### Scenario: Admin reactivates inactive provider
- **WHEN** the body is `{ "isActive": true }` and the entity was inactive
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW", "name": "Otro" }`
- **THEN** the system updates only `name` and `code` remains unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one updatable field must be provided"}`

#### Scenario: Body with only code
- **WHEN** the body is `{ "code": "NEW" }`
- **THEN** the system returns HTTP 400 (only `code` is not a valid update)

#### Scenario: Duplicate RFC on update
- **WHEN** the new `rfc` is already used by another provider
- **THEN** the system returns HTTP 409 `{"error": "Provider RFC already in use"}`

#### Scenario: Provider not found
- **WHEN** the `:id` does not match any provider
- **THEN** the system returns HTTP 404 `{"error": "Provider not found"}`

---

### Requirement: Soft delete provider
The system SHALL expose `DELETE /api/v1/admin/providers/:id` that marks the provider as inactive without removing the row. Requires `providers:write`. Returns HTTP 204 on success. Calling DELETE on an already inactive provider SHALL succeed silently with HTTP 204.

#### Scenario: Admin soft-deletes an active provider
- **WHEN** the request targets an active provider
- **THEN** the system returns HTTP 204 and the entity now has `isActive = false`

#### Scenario: Admin soft-deletes an inactive provider
- **WHEN** the target entity has `isActive = false`
- **THEN** the system still returns HTTP 204

#### Scenario: Provider not found
- **WHEN** the `:id` does not match any provider
- **THEN** the system returns HTTP 404 `{"error": "Provider not found"}`

#### Scenario: Unauthorized user (write)
- **WHEN** an authenticated user without `providers:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "providers:write"}`
