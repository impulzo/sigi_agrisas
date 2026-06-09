# Spec: admin-branches

## Purpose

Define the administrative CRUD endpoints for the branches catalog: list, get, create, update, and soft-delete operations under `/api/v1/admin/branches`.

---

## Requirements

### Requirement: List branches
The system SHALL expose `GET /api/v1/admin/branches` that returns a paginated list of branches. Requires the `branches:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100) and `includeInactive` (default `false`) control the result set. By default the system SHALL return only branches with `isActive = true`. The response SHALL be `{ items: BranchDto[], total: number, page: number, pageSize: number }`. Each `BranchDto` includes `id`, `code`, `name`, `address` (string or `null`), `phone` (string or `null`), `email` (string or `null`), `isHeadquarters: boolean`, `isActive`, `createdAt`, `updatedAt`.

#### Scenario: Admin lists active branches
- **WHEN** an authenticated user with `branches:read` sends `GET /api/v1/admin/branches`
- **THEN** the system returns HTTP 200 with active branches only, each including `isHeadquarters`

#### Scenario: Admin lists including inactive branches
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes inactive branches as well

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `branches:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:read"}`

#### Scenario: Headquarters flag visible in list
- **WHEN** one branch is marked `isHeadquarters: true` and the rest are `false`
- **THEN** exactly one item in the response has `isHeadquarters: true`

---

### Requirement: Get branch detail
The system SHALL expose `GET /api/v1/admin/branches/:id` that returns a single branch by UUID. Requires `branches:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets branch
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `BranchDto`

#### Scenario: Branch not found
- **WHEN** the `:id` does not match any branch
- **THEN** the system returns HTTP 404 `{"error": "Branch not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create branch
The system SHALL expose `POST /api/v1/admin/branches` to create a new branch. Requires `branches:write`. The body SHALL include `code: string` matching `^[A-Z0-9_]{1,32}$` and `name: string` (1–100 chars). Optional: `address: string | null` (max 300 chars), `phone: string | null` (max 30 chars), `email: string | null` (valid email when not null, max 120 chars), `isHeadquarters: boolean` (default `false`), `isActive: boolean` (default `true`). At most ONE branch may have `isHeadquarters = true` at any time, enforced by a partial UNIQUE INDEX `branches_hq_idx ON branches(is_headquarters) WHERE is_headquarters = TRUE`. Attempting to create a second headquarters returns HTTP 409 `{"error": "Another branch is already marked as headquarters"}`. Returns HTTP 201 with the new `BranchDto`. Duplicate `code` returns HTTP 409.

#### Scenario: Successful creation with minimal body
- **WHEN** the body is `{ "code": "HQ", "name": "Matriz" }`
- **THEN** the system returns HTTP 201 with `isHeadquarters: false` and `isActive: true`

#### Scenario: Creation marks branch as headquarters
- **WHEN** the body is `{ "code": "MATRIZ", "name": "Matriz", "isHeadquarters": true }` and no other HQ exists
- **THEN** the system returns HTTP 201 with `isHeadquarters: true`

#### Scenario: Reject second headquarters
- **WHEN** another branch with `isHeadquarters = true` already exists and the body sets `isHeadquarters: true`
- **THEN** the system returns HTTP 409 `{"error": "Another branch is already marked as headquarters"}`

#### Scenario: Duplicate code
- **WHEN** the body contains `code: "HQ"` and a branch with that code already exists
- **THEN** the system returns HTTP 409 `{"error": "Branch code already in use"}`

#### Scenario: Invalid email
- **WHEN** the body contains `email: "not-an-email"`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Invalid code format
- **WHEN** the body contains `code: "sucursal-norte"` (lowercase and hyphen)
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Update branch
The system SHALL expose `PATCH /api/v1/admin/branches/:id` to partially update a branch. Requires `branches:write`. The body MAY include any of `name`, `address` (string or `null`), `phone` (string or `null`), `email` (string or `null`), `isHeadquarters: boolean`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. At least one updatable field MUST be present. Setting `isHeadquarters: true` SHALL fail with HTTP 409 if another branch already has `isHeadquarters = true`. Setting `isHeadquarters: false` is always allowed (results in zero HQs, which is permitted but flagged in the system warning).

#### Scenario: Admin updates address
- **WHEN** the body is `{ "address": "Nueva dirección 200" }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Promote branch to headquarters
- **WHEN** the body is `{ "isHeadquarters": true }` and no other HQ exists
- **THEN** the system returns HTTP 200 with `isHeadquarters: true`

#### Scenario: Reject promotion when another HQ exists
- **WHEN** another branch has `isHeadquarters = true` and the body sets `isHeadquarters: true` on a different branch
- **THEN** the system returns HTTP 409 `{"error": "Another branch is already marked as headquarters"}`

#### Scenario: Demote headquarters
- **WHEN** the body is `{ "isHeadquarters": false }` on the current HQ
- **THEN** the system returns HTTP 200 with `isHeadquarters: false`; afterwards no branch is HQ

#### Scenario: Admin clears email
- **WHEN** the body is `{ "email": null }`
- **THEN** the system stores `null` in the email column and returns HTTP 200

#### Scenario: Admin reactivates inactive branch
- **WHEN** the body is `{ "isActive": true }` and the entity was inactive
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW", "name": "Otro" }`
- **THEN** the system updates only `name` and `code` remains unchanged

#### Scenario: Invalid email format
- **WHEN** the body contains `email: "not-an-email"`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one field (name, address, phone, email, isHeadquarters, isActive) must be provided"}`

#### Scenario: Branch not found
- **WHEN** the `:id` does not match any branch
- **THEN** the system returns HTTP 404 `{"error": "Branch not found"}`

---

### Requirement: Headquarters singleton invariant
The system SHALL maintain the invariant "at most one branch has `is_headquarters = true`" at the database level via the partial unique index `CREATE UNIQUE INDEX branches_hq_idx ON branches(is_headquarters) WHERE is_headquarters = TRUE` and at the API level via 409 responses in `POST` and `PATCH`. The system does NOT require exactly one HQ to exist (zero HQs is a valid configuration during transitions). When no HQ exists, the POS `PATCH /api/v1/admin/sales/:id` endpoint will reject all non-admin callers with HTTP 403, since the headquarters check fails by definition.

#### Scenario: Database constraint as safety net
- **WHEN** two concurrent requests both attempt to PATCH different branches with `{ "isHeadquarters": true }` starting from a state with zero HQs
- **THEN** at most one of them succeeds; the other receives HTTP 409 (Postgres uniqueness violation surfaced by the repo)

#### Scenario: Zero HQs is allowed
- **WHEN** the only HQ branch is demoted via `PATCH ... { "isHeadquarters": false }`
- **THEN** the system returns HTTP 200 and the configuration with zero HQs persists; subsequent attempts to edit a completed sale will fail with HTTP 403 until an HQ is set again

---

### Requirement: Soft delete branch
The system SHALL expose `DELETE /api/v1/admin/branches/:id` that marks the branch as inactive without removing the row. Requires `branches:write`. Returns HTTP 204 on success. Calling DELETE on an already inactive branch SHALL succeed silently.

#### Scenario: Admin soft-deletes an active branch
- **WHEN** the request targets an active branch
- **THEN** the system returns HTTP 204 and the entity now has `isActive = false`

#### Scenario: Admin soft-deletes an inactive branch
- **WHEN** the target entity has `isActive = false`
- **THEN** the system still returns HTTP 204

#### Scenario: Branch not found
- **WHEN** the `:id` does not match any branch
- **THEN** the system returns HTTP 404 `{"error": "Branch not found"}`
