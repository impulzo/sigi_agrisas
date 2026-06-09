# Spec: Admin Users

## Purpose

CRUD de administración de usuarios. Permite a usuarios con los permisos adecuados listar, consultar, actualizar y eliminar cuentas de usuario. Todos los endpoints requieren autenticación y autorización RBAC.

---

## Requirements

### Requirement: List users
The system SHALL expose `GET /api/v1/admin/users` that returns a paginated list of all registered users with their assigned roles and assigned branch. The endpoint requires the `users:read` permission. Query parameters `page` (default 1) and `pageSize` (default 20, max 100) control pagination. The response SHALL be `{ users: AdminUserDto[], total: number, page: number, pageSize: number }`. Each `AdminUserDto` includes `id`, `name`, `email`, `avatarUrl`, `branchId` (string or `null`), `branchName` (string or `null` — joined from the `branches` table when `branchId` is set), `roles: string[]`, `createdAt`, `updatedAt`. The field `passwordHash` SHALL never appear in any response.

#### Scenario: Admin lists all users with branch info
- **WHEN** an authenticated user with `users:read` sends `GET /api/v1/admin/users`
- **THEN** the system returns HTTP 200 with each user including `branchId` and `branchName` (or both `null` when no branch is assigned)

#### Scenario: Pagination parameters applied
- **WHEN** the request includes `?page=2&pageSize=5`
- **THEN** the system returns the corresponding slice of users and reflects `page: 2, pageSize: 5` in the response

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `users:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "users:read"}`

#### Scenario: Unauthenticated request
- **WHEN** the request has no valid access token
- **THEN** the middleware returns HTTP 401 before reaching the handler

---

### Requirement: Get user detail
The system SHALL expose `GET /api/v1/admin/users/:id` that returns a single user by ID including their assigned roles, `avatarUrl`, `branchId`, and `branchName`. Requires `users:read`. Returns HTTP 404 if the user does not exist.

#### Scenario: Admin gets existing user
- **WHEN** an authenticated user with `users:read` sends `GET /api/v1/admin/users/:id` with a valid user ID
- **THEN** the system returns HTTP 200 with the `AdminUserDto` for that user including `branchId` and `branchName`

#### Scenario: User not found
- **WHEN** the `:id` does not match any user
- **THEN** the system returns HTTP 404 `{"error": "User not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Update user
The system SHALL expose `PATCH /api/v1/admin/users/:id` to update a user's `name`, `email`, `avatarUrl`, and/or `branchId`. Requires `users:write`. All fields are optional; at least one must be present. `avatarUrl` accepts a valid URL string or `null` (to reset to the Gravatar default). `branchId` accepts a UUID of an existing branch or `null` (to unassign the user from any branch — typical for admins). If `email` changes to one already used by another user, the system returns 409. If `branchId` references a non-existent branch, the system returns HTTP 400 `{"error": "Branch not found"}`. An admin SHALL NOT be able to update their own account via this endpoint.

#### Scenario: Admin updates another user's name
- **WHEN** an authenticated user with `users:write` sends `PATCH /api/v1/admin/users/:id` with `{ "name": "New Name" }`
- **THEN** the system returns HTTP 200 with the updated `AdminUserDto`

#### Scenario: Admin updates email to an available address
- **WHEN** the body contains `{ "email": "new@example.com" }` and that email is not in use
- **THEN** the system returns HTTP 200 with the updated user

#### Scenario: Admin sets a custom avatar URL
- **WHEN** the body contains `{ "avatarUrl": "https://example.com/photo.jpg" }`
- **THEN** the system returns HTTP 200 with `avatarUrl` set to `"https://example.com/photo.jpg"`

#### Scenario: Admin resets avatar to default (avatarUrl: null)
- **WHEN** the body contains `{ "avatarUrl": null }`
- **THEN** the system stores `null` in the DB and returns the Gravatar default URL in the response

#### Scenario: Admin assigns user to a branch
- **WHEN** the body contains `{ "branchId": "<uuid-of-existing-branch>" }`
- **THEN** the system returns HTTP 200 with the updated `branchId` and the corresponding `branchName`

#### Scenario: Admin unassigns user from a branch
- **WHEN** the body contains `{ "branchId": null }` on a user previously assigned to a branch
- **THEN** the system stores `null` in `branch_id` and returns the updated `AdminUserDto` with `branchId: null` and `branchName: null`

#### Scenario: branchId references non-existent branch
- **WHEN** the body contains `{ "branchId": "<uuid-that-does-not-exist>" }`
- **THEN** the system returns HTTP 400 `{"error": "Branch not found"}`

#### Scenario: Invalid avatarUrl format
- **WHEN** the body contains `{ "avatarUrl": "not-a-url" }`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Email already in use
- **WHEN** the body contains `{ "email": "taken@example.com" }` and that email belongs to another user
- **THEN** the system returns HTTP 409 `{"error": "Email already in use"}`

#### Scenario: Admin tries to update own account
- **WHEN** the `:id` matches the `x-user-id` of the authenticated requester
- **THEN** the system returns HTTP 403 `{"error": "Cannot modify your own account"}`

#### Scenario: Empty body
- **WHEN** the body is `{}` or missing
- **THEN** the system returns HTTP 400 `{"error": "At least one field (name, email, avatarUrl, branchId) must be provided"}`

#### Scenario: User not found
- **WHEN** the `:id` does not match any user
- **THEN** the system returns HTTP 404 `{"error": "User not found"}`

---

### Requirement: Delete user
The system SHALL expose `DELETE /api/v1/admin/users/:id` to permanently remove a user and all their role assignments. Requires `users:write`. An admin SHALL NOT be able to delete their own account via this endpoint. The operation is irreversible (hard delete).

#### Scenario: Admin deletes another user
- **WHEN** an authenticated user with `users:write` sends `DELETE /api/v1/admin/users/:id` targeting a different user
- **THEN** the system returns HTTP 204 No Content; the user and their `user_roles` rows are deleted

#### Scenario: Admin tries to delete own account
- **WHEN** the `:id` matches the `x-user-id` of the authenticated requester
- **THEN** the system returns HTTP 403 `{"error": "Cannot delete your own account"}`

#### Scenario: User not found
- **WHEN** the `:id` does not match any user
- **THEN** the system returns HTTP 404 `{"error": "User not found"}`

---

### Requirement: User-to-branch assignment
The `users` table SHALL include a nullable column `branch_id` (mapped to `User.branchId: string | null` in Prisma) with a foreign key to `branches(id)` and `ON DELETE SET NULL`. The field semantics are:

- `null` — the user has no assigned branch; typical for `admin` users who oversee all branches and therefore use `branches:access_all` to bypass branch scoping.
- A valid branch id — the user is operationally assigned to that branch; downstream handlers compare this value against the path/body `branchId` to enforce scoping unless the user has `branches:access_all`.

A user may be assigned to AT MOST one branch. The assignment is read by the login flow when emitting the access and refresh tokens (claim `branchId`). When the assignment changes, the new value takes effect on the next full login (the existing refresh token still carries the old `branchId`; see `token-management`).

#### Scenario: Default for new users is null
- **WHEN** a user is created via `POST /api/v1/auth/register`
- **THEN** the persisted `branch_id` is `null` and the next access token contains `branchId: null`

#### Scenario: Login emits branchId claim
- **WHEN** a user assigned to branch `B1` logs in
- **THEN** the access and refresh tokens emitted SHALL include `branchId: "B1"`

#### Scenario: Branch deletion sets user.branchId to null
- **WHEN** an admin deletes a branch to which user `U1` was assigned
- **THEN** the `branch_id` of `U1` in the database SHALL be set to `null` automatically (FK `ON DELETE SET NULL`); the user remains active

---

### Requirement: User profile photo
Each user SHALL have an `avatarUrl` field that stores a URL to their profile photo. The column `avatar_url` in the `users` table SHALL be nullable (`String?`). When the stored value is `null`, the system SHALL compute a default avatar URL using Gravatar: `https://www.gravatar.com/avatar/<md5(email.toLowerCase().trim())>?d=mp&s=200`. The `AdminUserDto` SHALL always include `avatarUrl: string` — never `null` — by resolving the default at serialization time. Setting `avatarUrl` to `null` via `PATCH` resets the field to the Gravatar default (stores `null` in DB).

#### Scenario: New user has no stored avatar
- **WHEN** a user is fetched and `avatar_url` is `null` in the database
- **THEN** the system returns `avatarUrl` as `"https://www.gravatar.com/avatar/<md5(email)>?d=mp&s=200"` in the response

#### Scenario: User has a custom avatar URL stored
- **WHEN** a user is fetched and `avatar_url` contains a non-null URL
- **THEN** the system returns that exact URL as `avatarUrl`

#### Scenario: Admin resets avatar to default
- **WHEN** `PATCH /api/v1/admin/users/:id` is called with `{ "avatarUrl": null }`
- **THEN** the system stores `null` in `avatar_url` and the next GET returns the Gravatar default URL
