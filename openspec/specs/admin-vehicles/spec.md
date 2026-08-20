# admin-vehicles Specification

## Purpose
TBD - created by archiving change vehicles-drivers-catalog-waybill-picker. Update Purpose after archive.
## Requirements
### Requirement: List vehicles
The system SHALL expose `GET /api/v1/admin/vehicles` that returns a paginated list of vehicles. Requires the `vehicles:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`) and `search` (optional, min 2 chars when present) control the result set. By default the system SHALL return only vehicles with `isActive = true`. When `search` is provided, the system SHALL match it case-insensitively against `code`, `plate` and `insuranceCompany` with `OR ILIKE '%<search>%'` semantics. Whitespace-only `search` values SHALL be ignored. The response SHALL be `{ items: VehicleDto[], total: number, page: number, pageSize: number }`. Each `VehicleDto` includes `id`, `code`, `plate`, `vehicleConfig`, `permitType`, `permitNumber`, `insuranceCompany`, `insurancePolicy`, `notes` (string or `null`), `isActive`, `createdAt`, `updatedAt`. Results SHALL be ordered by `createdAt DESC`.

#### Scenario: Admin lists active vehicles
- **WHEN** an authenticated user with `vehicles:read` sends `GET /api/v1/admin/vehicles`
- **THEN** the system returns HTTP 200 with active vehicles only

#### Scenario: Admin lists including inactive vehicles
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes inactive vehicles as well

#### Scenario: Admin searches by plate
- **WHEN** the request includes `?search=ABC123`
- **THEN** the response includes any vehicle whose `code`, `plate` or `insuranceCompany` contains `ABC123` case-insensitively

#### Scenario: Search with single character is rejected
- **WHEN** the request includes `?search=a`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `vehicles:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "vehicles:read"}`

---

### Requirement: Get vehicle detail
The system SHALL expose `GET /api/v1/admin/vehicles/:id` that returns a single vehicle by UUID. Requires `vehicles:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets vehicle
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `VehicleDto`

#### Scenario: Vehicle not found
- **WHEN** the `:id` does not match any vehicle
- **THEN** the system returns HTTP 404 `{"error": "Vehicle not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create vehicle
The system SHALL expose `POST /api/v1/admin/vehicles` to create a new vehicle. Requires `vehicles:write`. Required body fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$` (unique, immutable after creation)
- `plate: string` (1–20 chars)
- `vehicleConfig: string` (1–10 chars — SAT `c_ConfigAutotransporte` key, format-only check, no FK to a catalog table)
- `permitType: string` (1–10 chars — SCT permit type key)
- `permitNumber: string` (1–50 chars)
- `insuranceCompany: string` (1–150 chars)
- `insurancePolicy: string` (1–50 chars)

Optional fields:

- `notes: string | null` (no max)
- `isActive: boolean` (default `true`)

The controller SHALL trim and uppercase `code` before persisting. Returns HTTP 201 with the new `VehicleDto`. Duplicate `code` returns HTTP 409 `{"error": "Vehicle code already in use"}`.

#### Scenario: Successful creation
- **WHEN** the body is `{ "code": "UNIT_001", "plate": "ABC-1234", "vehicleConfig": "C2", "permitType": "TPAF01", "permitNumber": "123456", "insuranceCompany": "GNP", "insurancePolicy": "POL-9988" }`
- **THEN** the system returns HTTP 201 with `notes: null` and `isActive: true`

#### Scenario: Duplicate code
- **WHEN** the body contains a `code` that already exists in the table
- **THEN** the system returns HTTP 409 `{"error": "Vehicle code already in use"}`

#### Scenario: Missing required field
- **WHEN** the body omits `plate`
- **THEN** the system returns HTTP 400

#### Scenario: Unauthorized user (write)
- **WHEN** an authenticated user without `vehicles:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "vehicles:write"}`

---

### Requirement: Update vehicle
The system SHALL expose `PATCH /api/v1/admin/vehicles/:id` to partially update a vehicle. Requires `vehicles:write`. The body MAY include any of `plate`, `vehicleConfig`, `permitType`, `permitNumber`, `insuranceCompany`, `insurancePolicy`, `notes`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. At least one updatable field MUST be present.

#### Scenario: Admin updates insurance data
- **WHEN** the body is `{ "insuranceCompany": "AXA", "insurancePolicy": "POL-1111" }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Admin clears optional field
- **WHEN** the body is `{ "notes": null }`
- **THEN** the system stores `null` in `notes` and returns HTTP 200

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW", "plate": "XYZ-0000" }`
- **THEN** the system updates only `plate` and `code` remains unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one updatable field must be provided"}`

#### Scenario: Vehicle not found
- **WHEN** the `:id` does not match any vehicle
- **THEN** the system returns HTTP 404 `{"error": "Vehicle not found"}`

---

### Requirement: Soft delete and reactivate vehicle
The system SHALL support soft-deleting a vehicle via `PATCH /api/v1/admin/vehicles/:id` with `{ "isActive": false }` and reactivating it with `{ "isActive": true }`. Requires `vehicles:write`. Soft-deleted vehicles remain referenced by any `Waybill.vehicleId` that already points to them (no cascade, no data loss on the waybill's snapshot).

#### Scenario: Soft delete
- **WHEN** the body is `{ "isActive": false }` for an active vehicle
- **THEN** the system returns HTTP 200 with `isActive: false`, and the vehicle no longer appears in the default (active-only) list

#### Scenario: Reactivate
- **WHEN** the body is `{ "isActive": true }` for an inactive vehicle
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: Soft-deleted vehicle referenced by a past waybill keeps the waybill intact
- **WHEN** a vehicle referenced by `Waybill.vehicleId` on a prior Carta Porte is soft-deleted
- **THEN** `GET /api/v1/admin/waybills/:id` for that Carta Porte still returns its full snapshot of vehicle fields (`vehiclePlate`, `vehicleConfig`, etc.), unaffected by the vehicle's `isActive` status

