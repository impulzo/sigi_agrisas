## MODIFIED Requirements

### Requirement: List providers
The system SHALL expose `GET /api/v1/admin/providers` that returns a paginated list of providers. Requires the `providers:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`) and `search` (optional, min 2 chars when present) control the result set. By default the system SHALL return only providers with `isActive = true`. When `search` is provided, the system SHALL match it case-insensitively against `name`, `legalName` and `rfc` with `OR ILIKE '%<search>%'` semantics. Whitespace-only `search` values SHALL be ignored. The response SHALL be `{ items: ProviderDto[], total: number, page: number, pageSize: number }`. Each `ProviderDto` includes `id`, `code`, `name`, `rfc` (string or `null`), `legalName` (string or `null`), `taxRegime` (string or `null`), `cfdiUse` (string or `null`), `taxZipCode` (string or `null`), `email` (string or `null`), `phone` (string or `null`), `address` (string or `null`), `contactName` (string or `null`), `notes` (string or `null`), `creditLimit` (number or `null`), `currentBalance` (number), `creditDays` (integer), `initialBalance` (number), `isActive`, `createdAt`, `updatedAt`. Results SHALL be ordered by `createdAt DESC`.

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

#### Scenario: List includes credit and balance fields
- **WHEN** an authenticated user with `providers:read` lists providers
- **THEN** each `ProviderDto` includes `creditLimit`, `currentBalance`, `creditDays` and `initialBalance`

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `providers:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "providers:read"}`

---

### Requirement: Create provider
The system SHALL expose `POST /api/v1/admin/providers` to create a new provider. Requires `providers:write`. The body SHALL include two required fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$`
- `name: string` (1–120 chars)

Optional fields:

- `rfc: string | null` matching `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` when present (12 chars for Persona Moral, 13 chars for Persona Física; covers generic `XEXX010101000` and `XAXX010101000`; unique among non-null values; omitted, empty string, or `null` all persist as `null`)
- `legalName: string | null` (max 200 chars)
- `taxRegime: string | null` (3 digits, matching `^\d{3}$`)
- `cfdiUse: string | null` (1 letter + 2 digits, matching `^[A-Z]\d{2}$`)
- `taxZipCode: string | null` (5 digits, matching `^\d{5}$`)
- `email: string | null` (valid email when not null, max 120 chars)
- `phone: string | null` (max 30 chars)
- `address: string | null` (max 300 chars)
- `contactName: string | null` (max 120 chars)
- `notes: string | null` (no max)
- `creditLimit: number | null` (decimal `>= 0`; `null` means no explicit limit)
- `creditDays: integer` (`>= 0`; defaults to `30` when omitted)
- `initialBalance: number` (decimal `>= 0`; defaults to `0` when omitted — deuda inicial capturada al dar de alta)
- `isActive: boolean` (default `true`)

The controller SHALL trim and uppercase `code`, `taxRegime` and `cfdiUse` before validation, and `rfc` when present. `currentBalance` SHALL always be set to `initialBalance` on creation (`0` when omitted); it is not independently settable. Returns HTTP 201 with the new `ProviderDto`. Duplicate `code` returns HTTP 409 `{"error": "Provider code already in use"}`. A non-null duplicate `rfc` returns HTTP 409 `{"error": "Provider RFC already in use"}`; two providers with `rfc: null` MAY coexist. A negative `initialBalance` returns HTTP 400.

#### Scenario: Successful creation with minimal body
- **WHEN** the body is `{ "code": "PROV_001", "name": "Semillas ACME" }` (no `rfc`)
- **THEN** the system returns HTTP 201 with `rfc: null`, all other optional fields `null`, `currentBalance: 0`, `initialBalance: 0`, `creditDays: 30`, and `isActive: true`

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

#### Scenario: Two providers without RFC coexist
- **WHEN** two separate `POST` requests each omit `rfc`
- **THEN** both providers are created successfully, each with `rfc: null`, with no HTTP 409

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
- **WHEN** the body contains a non-null `rfc` that already exists in the table (case-insensitive)
- **THEN** the system returns HTTP 409 `{"error": "Provider RFC already in use"}`

#### Scenario: initialBalance sets currentBalance on creation
- **WHEN** the body includes `initialBalance: 8500`
- **THEN** the system returns HTTP 201 with `initialBalance: 8500` and `currentBalance: 8500`

#### Scenario: Negative initialBalance rejected
- **WHEN** the body includes `initialBalance: -100`
- **THEN** the system returns HTTP 400

#### Scenario: Unauthorized user (write)
- **WHEN** an authenticated user without `providers:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "providers:write"}`

---

### Requirement: Update provider
The system SHALL expose `PATCH /api/v1/admin/providers/:id` to partially update a provider. Requires `providers:write`. The body MAY include any of `name`, `rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`, `creditDays`, `initialBalance`, `isActive`. The field `code` MUST NOT be updatable; `currentBalance` MUST NOT be independently settable — both are ignored silently if present. At least one updatable field MUST be present (excluding `code`).

When `rfc` is provided as a non-null value, it SHALL be re-validated with the same regex as on create and trimmed/uppercased; `rfc: null` clears it (no longer occupies the unique constraint). Optional fields that accept `null` (`legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`) clear the value when set explicitly to `null`. The same uniqueness constraint on non-null `rfc` applies: changing it to a value already used by another provider returns HTTP 409. A negative `initialBalance` returns HTTP 400. When `initialBalance` changes, the system SHALL atomically adjust `currentBalance` by the delta (`new - old`) within the same request transaction.

#### Scenario: Admin updates fiscal data
- **WHEN** the body is `{ "legalName": "Semillas ACME S.A. de C.V.", "taxRegime": "601" }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Admin updates RFC
- **WHEN** the body is `{ "rfc": "sac120101a12" }`
- **THEN** the system normalizes to uppercase, validates the format, and returns HTTP 200 with the new value

#### Scenario: Admin clears RFC
- **WHEN** the body is `{ "rfc": null }` on a provider that previously had an `rfc`
- **THEN** the system stores `rfc = null` and returns HTTP 200; the provider no longer occupies that RFC in the unique constraint

#### Scenario: Admin clears optional field
- **WHEN** the body is `{ "legalName": null }`
- **THEN** the system stores `null` in `legal_name` and returns HTTP 200

#### Scenario: Admin reactivates inactive provider
- **WHEN** the body is `{ "isActive": true }` and the entity was inactive
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: code and currentBalance in body are ignored
- **WHEN** the body is `{ "code": "NEW", "currentBalance": 99999, "name": "Otro" }`
- **THEN** the system updates only `name`; `code` and `current_balance` remain unchanged

#### Scenario: Update initialBalance adjusts currentBalance by delta
- **WHEN** a provider has `initialBalance: 2000`, `currentBalance: 5000` (3000 acumulado por compras a crédito posteriores), and the body is `{ "initialBalance": 1500" }`
- **THEN** the system returns HTTP 200 with `initialBalance: 1500` and `currentBalance: 4500` (delta `-500` aplicado atómicamente)

#### Scenario: Negative initialBalance on update rejected
- **WHEN** the body is `{ "initialBalance": -1 }`
- **THEN** the system returns HTTP 400

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one updatable field must be provided"}`

#### Scenario: Body with only code
- **WHEN** the body is `{ "code": "NEW" }`
- **THEN** the system returns HTTP 400 (only `code` is not a valid update)

#### Scenario: Duplicate RFC on update
- **WHEN** the new non-null `rfc` is already used by another provider
- **THEN** the system returns HTTP 409 `{"error": "Provider RFC already in use"}`

#### Scenario: Provider not found
- **WHEN** the `:id` does not match any provider
- **THEN** the system returns HTTP 404 `{"error": "Provider not found"}`
