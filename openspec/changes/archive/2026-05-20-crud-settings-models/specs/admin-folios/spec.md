## ADDED Requirements

### Requirement: List folios
The system SHALL expose `GET /api/v1/admin/folios` that returns a paginated list of folios. The endpoint requires the `folios:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100) and `includeInactive` (default `false`) control the result set. By default the system SHALL return only folios with `isActive = true`. The response SHALL be `{ items: FolioDto[], total: number, page: number, pageSize: number }`. Each `FolioDto` includes `id`, `code`, `name`, `prefix` (string or `null`), `currentNumber` (number ≥ 0), `isActive`, `createdAt`, `updatedAt`.

#### Scenario: Admin lists active folios
- **WHEN** an authenticated user with `folios:read` sends `GET /api/v1/admin/folios`
- **THEN** the system returns HTTP 200 with active folios only

#### Scenario: Admin lists including inactive folios
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes inactive folios as well

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `folios:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "folios:read"}`

---

### Requirement: Get folio detail
The system SHALL expose `GET /api/v1/admin/folios/:id` that returns a single folio by UUID. Requires `folios:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets folio
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `FolioDto`

#### Scenario: Folio not found
- **WHEN** the `:id` does not match any folio
- **THEN** the system returns HTTP 404 `{"error": "Folio not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create folio
The system SHALL expose `POST /api/v1/admin/folios` to create a new folio. Requires `folios:write`. The body SHALL include `code: string` matching `^[A-Z0-9_]{1,32}$` and `name: string` (1–100 chars). Optional: `prefix: string | null` matching `^[A-Z0-9-]{1,8}$` when not null, `currentNumber: integer ≥ 0` (default `0`), `isActive: boolean` (default `true`). Returns HTTP 201 with the new `FolioDto`. Duplicate `code` returns HTTP 409.

#### Scenario: Successful creation with minimal body
- **WHEN** the body is `{ "code": "FAC_A", "name": "Facturas Serie A" }`
- **THEN** the system returns HTTP 201 with `prefix: null`, `currentNumber: 0`, `isActive: true`

#### Scenario: Creation with prefix and starting number
- **WHEN** the body is `{ "code": "REC_1", "name": "Recibos", "prefix": "REC-", "currentNumber": 1000 }`
- **THEN** the system returns HTTP 201 with the provided values

#### Scenario: Duplicate code
- **WHEN** the body contains `code: "FAC_A"` and a folio with that code already exists
- **THEN** the system returns HTTP 409 `{"error": "Folio code already in use"}`

#### Scenario: Invalid prefix format
- **WHEN** the body contains `prefix: "rec-"` (lowercase)
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Negative currentNumber rejected
- **WHEN** the body contains `currentNumber: -1`
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Update folio
The system SHALL expose `PATCH /api/v1/admin/folios/:id` to partially update a folio. Requires `folios:write`. The body MAY include any of `name`, `prefix` (string or `null` to clear), `currentNumber`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. At least one updatable field MUST be present.

#### Scenario: Admin updates currentNumber
- **WHEN** the body is `{ "currentNumber": 5000 }`
- **THEN** the system returns HTTP 200 with the updated value

#### Scenario: Admin clears prefix
- **WHEN** the body is `{ "prefix": null }`
- **THEN** the system stores `null` in the prefix column

#### Scenario: Admin reactivates inactive folio
- **WHEN** the body is `{ "isActive": true }` and the entity was inactive
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW", "name": "Otro" }`
- **THEN** the system updates only `name` and `code` remains unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one field (name, prefix, currentNumber, isActive) must be provided"}`

#### Scenario: Folio not found
- **WHEN** the `:id` does not match any folio
- **THEN** the system returns HTTP 404 `{"error": "Folio not found"}`

---

### Requirement: Soft delete folio
The system SHALL expose `DELETE /api/v1/admin/folios/:id` that marks the folio as inactive without removing the row. Requires `folios:write`. Returns HTTP 204 on success. Calling DELETE on an already inactive folio SHALL succeed silently.

#### Scenario: Admin soft-deletes an active folio
- **WHEN** the request targets an active folio
- **THEN** the system returns HTTP 204 and the entity now has `isActive = false`

#### Scenario: Admin soft-deletes an inactive folio
- **WHEN** the target entity has `isActive = false`
- **THEN** the system still returns HTTP 204

#### Scenario: Folio not found
- **WHEN** the `:id` does not match any folio
- **THEN** the system returns HTTP 404 `{"error": "Folio not found"}`
