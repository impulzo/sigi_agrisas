# Spec: admin-departments

## Purpose

Define the administrative CRUD endpoints for the departments catalog: list, get, create, update, and soft-delete operations under `/api/v1/admin/departments`.

---

## Requirements

### Requirement: List departments
The system SHALL expose `GET /api/v1/admin/departments` that returns a paginated list of departments. Requires the `departments:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100) and `includeInactive` (default `false`) control the result set. By default the system SHALL return only departments with `isActive = true`. The response SHALL be `{ items: DepartmentDto[], total: number, page: number, pageSize: number }`. Each `DepartmentDto` includes `id`, `code`, `name`, `description` (string or `null`), `isActive`, `createdAt`, `updatedAt`.

#### Scenario: Admin lists active departments
- **WHEN** an authenticated user with `departments:read` sends `GET /api/v1/admin/departments`
- **THEN** the system returns HTTP 200 with active departments only

#### Scenario: Admin lists including inactive departments
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes inactive departments as well

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `departments:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "departments:read"}`

---

### Requirement: Get department detail
The system SHALL expose `GET /api/v1/admin/departments/:id` that returns a single department by UUID. Requires `departments:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets department
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `DepartmentDto`

#### Scenario: Department not found
- **WHEN** the `:id` does not match any department
- **THEN** the system returns HTTP 404 `{"error": "Department not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create department
The system SHALL expose `POST /api/v1/admin/departments` to create a new department. Requires `departments:write`. The body SHALL include `code: string` matching `^[A-Z0-9_]{1,32}$` and `name: string` (1–100 chars). Optional: `description: string | null` (max 500 chars), `isActive: boolean` (default `true`). Returns HTTP 201 with the new `DepartmentDto`. Duplicate `code` returns HTTP 409.

#### Scenario: Successful creation
- **WHEN** the body is `{ "code": "SALES", "name": "Ventas" }`
- **THEN** the system returns HTTP 201 with `isActive: true` and `description: null`

#### Scenario: Creation with description
- **WHEN** the body is `{ "code": "OPS", "name": "Operaciones", "description": "Logística y producción" }`
- **THEN** the system persists all fields and returns HTTP 201

#### Scenario: Duplicate code
- **WHEN** the body contains `code: "SALES"` and a department with that code already exists
- **THEN** the system returns HTTP 409 `{"error": "Department code already in use"}`

#### Scenario: Invalid code format
- **WHEN** the body contains `code: "sales-mx"`
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Update department
The system SHALL expose `PATCH /api/v1/admin/departments/:id` to partially update a department. Requires `departments:write`. The body MAY include any of `name`, `description` (string or `null`), `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. At least one updatable field MUST be present.

#### Scenario: Admin updates name
- **WHEN** the body is `{ "name": "Ventas Corporativas" }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Admin clears description
- **WHEN** the body is `{ "description": null }`
- **THEN** the system stores `null` and returns HTTP 200

#### Scenario: Admin reactivates inactive department
- **WHEN** the body is `{ "isActive": true }` and the entity was inactive
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW", "name": "Otro" }`
- **THEN** the system updates only `name` and `code` remains unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one field (name, description, isActive) must be provided"}`

#### Scenario: Department not found
- **WHEN** the `:id` does not match any department
- **THEN** the system returns HTTP 404 `{"error": "Department not found"}`

---

### Requirement: Soft delete department
The system SHALL expose `DELETE /api/v1/admin/departments/:id` that marks the department as inactive without removing the row. Requires `departments:write`. Returns HTTP 204 on success. Calling DELETE on an already inactive department SHALL succeed silently.

#### Scenario: Admin soft-deletes an active department
- **WHEN** the request targets an active department
- **THEN** the system returns HTTP 204 and the entity now has `isActive = false`

#### Scenario: Admin soft-deletes an inactive department
- **WHEN** the target entity has `isActive = false`
- **THEN** the system still returns HTTP 204

#### Scenario: Department not found
- **WHEN** the `:id` does not match any department
- **THEN** the system returns HTTP 404 `{"error": "Department not found"}`

---

### Requirement: Create department requires providerId
`POST /api/v1/admin/departments` SHALL require `providerId: string (UUID)` in the request body. The referenced provider MUST exist and be active; otherwise the system returns HTTP 400 `{"error":"Provider not found or inactive"}`. The `providerId` SHALL be stored in `departments.provider_id`.

#### Scenario: Create department with valid provider
- **WHEN** body includes `providerId: "<uuid of active provider>"`
- **THEN** department is created with `provider_id` set; response includes `providerId` and `providerName`

#### Scenario: Create department with inactive provider
- **WHEN** body includes `providerId: "<uuid of inactive provider>"`
- **THEN** system returns HTTP 400 `{"error":"Provider not found or inactive"}`

#### Scenario: Create department without providerId
- **WHEN** body omits `providerId`
- **THEN** system returns HTTP 400 (validation error — field required for new departments)

---

### Requirement: Update department accepts providerId
`PATCH /api/v1/admin/departments/:id` SHALL accept `providerId: string (UUID) | null`. Setting `providerId` to a valid active provider reassigns the department. Setting to `null` disassociates it (allowed). Invalid or inactive provider → 400.

#### Scenario: Reassign department to different provider
- **WHEN** PATCH body is `{ "providerId": "<new provider uuid>" }`
- **THEN** `provider_id` is updated; response reflects new `providerId` and `providerName`

#### Scenario: Disassociate provider
- **WHEN** PATCH body is `{ "providerId": null }`
- **THEN** `provider_id` set to null; response has `providerId: null`, `providerName: null`

---

### Requirement: Filter departments by provider
`GET /api/v1/admin/departments` SHALL accept an optional query parameter `providerId: string (UUID)`. When provided, only departments with `provider_id = providerId` are returned. Combined with `includeInactive` and pagination.

#### Scenario: Filter by provider returns only that provider's departments
- **WHEN** request includes `?providerId=<uuid>`
- **THEN** response contains only departments with matching `provider_id`

#### Scenario: No departments for provider returns empty list
- **WHEN** the provider has no departments
- **THEN** response is `{ items: [], total: 0, page: 1, pageSize: 20 }`
