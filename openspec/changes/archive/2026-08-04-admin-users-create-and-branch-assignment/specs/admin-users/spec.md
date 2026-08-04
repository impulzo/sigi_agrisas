## ADDED Requirements

### Requirement: Create user
The system SHALL expose `POST /api/v1/admin/users` to create a new user account from the admin panel. Requires the `users:write` permission. The request body SHALL accept: `name` (string, min length 1, required), `email` (valid email, required, unique across users), `password` (string, min length 8, required), `avatarUrl` (valid URL string or `null`, optional), `branchId` (UUID of an existing, active branch, or `null`, optional), `roleIds` (array of role UUIDs, optional). The password SHALL be hashed with `BcryptPasswordHasher` before persisting; the plaintext password SHALL never be logged or stored. On success the system SHALL create the user and, if `roleIds` is provided, assign those roles in the same database transaction, then return HTTP 201 with the created `AdminUserDto` (never including `passwordHash`). If `email` is already in use, the system SHALL return HTTP 409 `{"error": "Email already in use"}`. If `branchId` does not reference an existing active branch, the system SHALL return HTTP 400 `{"error": "Branch not found"}`.

#### Scenario: Admin creates a user with minimal fields
- **WHEN** an authenticated user with `users:write` sends `POST /api/v1/admin/users` with `{ "name": "Ana Pérez", "email": "ana@example.com", "password": "supersecret" }`
- **THEN** the system returns HTTP 201 with the new `AdminUserDto` having `branchId: null` and `roles: []`, and the response never includes `passwordHash`

#### Scenario: Admin creates a user with branch and roles
- **WHEN** the body includes `{ "branchId": "<uuid-of-active-branch>", "roleIds": ["<uuid-of-operator-role>"] }` in addition to the required fields
- **THEN** the system returns HTTP 201 with `branchId` and `branchName` populated and `roles` containing the assigned role name, all persisted in a single transaction

#### Scenario: Email already in use
- **WHEN** the body contains an `email` that already belongs to another user
- **THEN** the system returns HTTP 409 `{"error": "Email already in use"}` and no user is created

#### Scenario: branchId references a non-existent or inactive branch
- **WHEN** the body contains `{ "branchId": "<uuid-that-does-not-exist-or-is-inactive>" }`
- **THEN** the system returns HTTP 400 `{"error": "Branch not found"}` and no user is created

#### Scenario: Password shorter than minimum
- **WHEN** the body contains `{ "password": "short" }` (fewer than 8 characters)
- **THEN** the system returns HTTP 400 with a validation error and no user is created

#### Scenario: Missing required field
- **WHEN** the body omits `name`, `email`, or `password`
- **THEN** the system returns HTTP 400 with a validation error identifying the missing field

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `users:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "users:write"}` and no user is created

#### Scenario: Unauthenticated request
- **WHEN** the request has no valid access token
- **THEN** the middleware returns HTTP 401 before reaching the handler
