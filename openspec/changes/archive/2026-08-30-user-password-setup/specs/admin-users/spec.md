## MODIFIED Requirements

### Requirement: Create user
The system SHALL expose `POST /api/v1/admin/users` to create a new user account from the admin panel. Requires the `users:write` permission. The request body SHALL accept: `name` (string, min length 1, required), `email` (valid email, required, unique across users), `avatarUrl` (valid URL string or `null`, optional), `branchId` (UUID of an existing, active branch, or `null`, optional), `roleIds` (array of role UUIDs, optional). The request body SHALL NOT accept a `password` field — the system SHALL create the user with no password set (`passwordHash: null`) and, on success, SHALL trigger (best-effort, without blocking or reverting the creation on failure) a "set your password" email to the new user's address, containing a one-time password-setup link. On success the system SHALL create the user and, if `roleIds` is provided, assign those roles in the same database transaction, then return HTTP 201 with the created `AdminUserDto` (never including `passwordHash`). If `email` is already in use, the system SHALL return HTTP 409 `{"error": "Email already in use"}`. If `branchId` does not reference an existing active branch, the system SHALL return HTTP 400 `{"error": "Branch not found"}`.

#### Scenario: Admin creates a user with minimal fields
- **WHEN** an authenticated user with `users:write` sends `POST /api/v1/admin/users` with `{ "name": "Ana Pérez", "email": "ana@example.com" }`
- **THEN** the system returns HTTP 201 with the new `AdminUserDto` having `branchId: null` and `roles: []`, the response never includes `passwordHash`, and the created user has `passwordHash: null`

#### Scenario: Admin creates a user with branch and roles
- **WHEN** the body includes `{ "branchId": "<uuid-of-active-branch>", "roleIds": ["<uuid-of-operator-role>"] }` in addition to the required fields
- **THEN** the system returns HTTP 201 with `branchId` and `branchName` populated and `roles` containing the assigned role name, all persisted in a single transaction

#### Scenario: Set-password email is sent on successful creation
- **WHEN** a user is created successfully
- **THEN** the system triggers the send of a set-password email to the new user's address containing a one-time password-setup link

#### Scenario: Email delivery failure never blocks user creation
- **WHEN** a user is created successfully but the underlying email delivery fails (e.g. SMTP unavailable)
- **THEN** the system still returns HTTP 201 with the created user, logs the delivery failure, and does NOT surface the email error to the admin or roll back the created user

#### Scenario: Email already in use
- **WHEN** the body contains an `email` that already belongs to another user
- **THEN** the system returns HTTP 409 `{"error": "Email already in use"}` and no user is created

#### Scenario: branchId references a non-existent or inactive branch
- **WHEN** the body contains `{ "branchId": "<uuid-that-does-not-exist-or-is-inactive>" }`
- **THEN** the system returns HTTP 400 `{"error": "Branch not found"}` and no user is created

#### Scenario: password field in the body is ignored
- **WHEN** the body includes a `password` field despite it no longer being part of the accepted schema
- **THEN** the system ignores it, never hashes or persists it, and creates the user with `passwordHash: null` as usual

#### Scenario: Missing required field
- **WHEN** the body omits `name` or `email`
- **THEN** the system returns HTTP 400 with a validation error identifying the missing field

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `users:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "users:write"}` and no user is created

#### Scenario: Unauthenticated request
- **WHEN** the request has no valid access token
- **THEN** the middleware returns HTTP 401 before reaching the handler

## ADDED Requirements

### Requirement: Resend set-password email
The system SHALL expose `POST /api/v1/admin/users/:id/resend-set-password-email` to (re)send the password-setup email to an existing user. Requires the `users:write` permission (the same permission already guarding user mutations — no new permission is introduced). Unlike the automatic send triggered on creation, this action is admin-initiated and its outcome SHALL be surfaced to the admin: if the underlying email delivery fails, the system SHALL return HTTP 502 `{"error": "EmailDeliveryFailed"}`. Issuing this call SHALL invalidate any previously issued, unconsumed password-setup token for that user before issuing and sending the new one. This endpoint SHALL be the only way to affect a user's password from the admin panel — there is no endpoint or field that lets an admin set or view a user's password directly.

#### Scenario: Admin resends the set-password email
- **WHEN** an authenticated user with `users:write` sends `POST /api/v1/admin/users/:id/resend-set-password-email` for an existing user
- **THEN** the system invalidates any previous unconsumed token for that user, issues a new one, sends the email, and returns HTTP 200

#### Scenario: Email delivery fails on an explicit resend
- **WHEN** the admin triggers the resend and the underlying email delivery fails
- **THEN** the system returns HTTP 502 `{"error": "EmailDeliveryFailed"}` so the admin can retry, unlike the silent failure on automatic creation-time sends

#### Scenario: User not found
- **WHEN** `:id` does not reference an existing user
- **THEN** the system returns HTTP 404

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `users:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "users:write"}` and no email is sent

#### Scenario: Unauthenticated request
- **WHEN** the request has no valid access token
- **THEN** the middleware returns HTTP 401 before reaching the handler
