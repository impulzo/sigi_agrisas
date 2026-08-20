## ADDED Requirements

### Requirement: List drivers
The system SHALL expose `GET /api/v1/admin/drivers` that returns a paginated list of drivers (operadores de transporte). Requires the `drivers:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`) and `search` (optional, min 2 chars when present) control the result set. By default the system SHALL return only drivers with `isActive = true`. When `search` is provided, the system SHALL match it case-insensitively against `code`, `name` and `rfc` with `OR ILIKE '%<search>%'` semantics. Whitespace-only `search` values SHALL be ignored. The response SHALL be `{ items: DriverDto[], total: number, page: number, pageSize: number }`. Each `DriverDto` includes `id`, `code`, `name`, `rfc` (string or `null`), `licenseNumber`, `notes` (string or `null`), `isActive`, `createdAt`, `updatedAt`. Results SHALL be ordered by `createdAt DESC`.

#### Scenario: Admin lists active drivers
- **WHEN** an authenticated user with `drivers:read` sends `GET /api/v1/admin/drivers`
- **THEN** the system returns HTTP 200 with active drivers only

#### Scenario: Admin lists including inactive drivers
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes inactive drivers as well

#### Scenario: Admin searches by name
- **WHEN** the request includes `?search=Juan`
- **THEN** the response includes any driver whose `code`, `name` or `rfc` contains `Juan` case-insensitively

#### Scenario: Search with single character is rejected
- **WHEN** the request includes `?search=a`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `drivers:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "drivers:read"}`

---

### Requirement: Get driver detail
The system SHALL expose `GET /api/v1/admin/drivers/:id` that returns a single driver by UUID. Requires `drivers:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets driver
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `DriverDto`

#### Scenario: Driver not found
- **WHEN** the `:id` does not match any driver
- **THEN** the system returns HTTP 404 `{"error": "Driver not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create driver
The system SHALL expose `POST /api/v1/admin/drivers` to create a new driver. Requires `drivers:write`. Required body fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$` (unique, immutable after creation)
- `name: string` (1–150 chars)
- `licenseNumber: string` (1–50 chars)

Optional fields:

- `rfc: string | null` matching `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` when present (no uniqueness constraint — a driver catalog entry does not need a unique RFC beyond what `customers-api`/`admin-providers` already enforce for fiscal entities)
- `notes: string | null` (no max)
- `isActive: boolean` (default `true`)

The controller SHALL trim and uppercase `code` before persisting, and uppercase `rfc` when present. Returns HTTP 201 with the new `DriverDto`. Duplicate `code` returns HTTP 409 `{"error": "Driver code already in use"}`.

#### Scenario: Successful creation with minimal body
- **WHEN** the body is `{ "code": "OP_001", "name": "Juan Pérez", "licenseNumber": "LIC-99887" }` (no `rfc`)
- **THEN** the system returns HTTP 201 with `rfc: null`, `notes: null`, and `isActive: true`

#### Scenario: Successful creation with RFC
- **WHEN** the body includes a valid `rfc`
- **THEN** the system persists the uppercased value and returns HTTP 201

#### Scenario: Invalid RFC format
- **WHEN** the body contains `rfc: "XXX"`
- **THEN** the system returns HTTP 400

#### Scenario: Duplicate code
- **WHEN** the body contains a `code` that already exists in the table
- **THEN** the system returns HTTP 409 `{"error": "Driver code already in use"}`

#### Scenario: Unauthorized user (write)
- **WHEN** an authenticated user without `drivers:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "drivers:write"}`

---

### Requirement: Update driver
The system SHALL expose `PATCH /api/v1/admin/drivers/:id` to partially update a driver. Requires `drivers:write`. The body MAY include any of `name`, `rfc`, `licenseNumber`, `notes`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. At least one updatable field MUST be present.

#### Scenario: Admin updates license number
- **WHEN** the body is `{ "licenseNumber": "LIC-00001" }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Admin clears RFC
- **WHEN** the body is `{ "rfc": null }`
- **THEN** the system stores `null` in `rfc` and returns HTTP 200

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW", "name": "Otro" }`
- **THEN** the system updates only `name` and `code` remains unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one updatable field must be provided"}`

#### Scenario: Driver not found
- **WHEN** the `:id` does not match any driver
- **THEN** the system returns HTTP 404 `{"error": "Driver not found"}`

---

### Requirement: Soft delete and reactivate driver
The system SHALL support soft-deleting a driver via `PATCH /api/v1/admin/drivers/:id` with `{ "isActive": false }` and reactivating it with `{ "isActive": true }`. Requires `drivers:write`. Soft-deleted drivers remain referenced by any `Waybill.driverId` that already points to them (no cascade, no data loss on the waybill's snapshot).

#### Scenario: Soft delete
- **WHEN** the body is `{ "isActive": false }` for an active driver
- **THEN** the system returns HTTP 200 with `isActive: false`, and the driver no longer appears in the default (active-only) list

#### Scenario: Reactivate
- **WHEN** the body is `{ "isActive": true }` for an inactive driver
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: Soft-deleted driver referenced by a past waybill keeps the waybill intact
- **WHEN** a driver referenced by `Waybill.driverId` on a prior Carta Porte is soft-deleted
- **THEN** `GET /api/v1/admin/waybills/:id` for that Carta Porte still returns its full snapshot of driver fields (`driverName`, `driverRfc`, `driverLicenseNumber`), unaffected by the driver's `isActive` status
