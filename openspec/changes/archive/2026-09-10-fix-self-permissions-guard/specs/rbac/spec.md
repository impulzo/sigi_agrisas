## MODIFIED Requirements

### Requirement: Admin API for role and permission management
The system SHALL expose versioned administrative endpoints under `/api/v1/admin/**` for managing roles, permissions, and user-role assignments. Every endpoint SHALL be gated by `requirePermission` with the appropriate permission key as defined in the design document, validated with Zod schemas, and SHALL return typed JSON errors. As an exception, `GET /api/v1/admin/users/:id/permissions` SHALL allow the request to proceed without `users:read` when `params.id` equals the requesting user's own id (`x-user-id` header propagated by the middleware) — a self-access check that lets any authenticated user resolve their own effective permissions (consumed by `useCurrentUser` to render the NavigationRail). Requesting the permissions of any OTHER user (`params.id !== x-user-id`) SHALL continue to require `users:read` exactly as today.

#### Scenario: List all roles
- **WHEN** `GET /api/v1/admin/roles` is called with a token whose user has `roles:read`
- **THEN** the response is HTTP 200 with `{ roles: [{ id, name, description }] }`

#### Scenario: Forbidden without permission
- **WHEN** `GET /api/v1/admin/roles` is called with a token whose user lacks `roles:read`
- **THEN** the response is HTTP 403 with `{ "error": "Forbidden", "required": "roles:read" }`

#### Scenario: Assign role to user
- **WHEN** `POST /api/v1/admin/users/:id/roles` is called with body `{ "roleName": "operator" }` and the caller has `users:write`
- **THEN** the response is HTTP 201 and `user_roles` contains the new assignment

#### Scenario: Grant permission to role
- **WHEN** `POST /api/v1/admin/roles/:id/permissions` is called with body `{ "permissionKey": "users:write" }` and the caller has `roles:write`
- **THEN** the response is HTTP 201 and `role_permissions` contains the new grant

#### Scenario: Revoke role from user
- **WHEN** `DELETE /api/v1/admin/users/:id/roles/:roleId` is called by a caller with `users:write`
- **THEN** the response is HTTP 204 and the row is removed from `user_roles`

#### Scenario: List effective permissions for a user with users:read
- **WHEN** `GET /api/v1/admin/users/:id/permissions` is called by a caller with `users:read`, for any `id` (including their own)
- **THEN** the response is HTTP 200 with `{ permissions: string[] }` containing the union of all permissions across the target user's roles

#### Scenario: Self-access to own permissions without users:read
- **WHEN** an authenticated user whose `x-user-id` header is `U1`, and who does NOT have `users:read`, calls `GET /api/v1/admin/users/U1/permissions`
- **THEN** the response is HTTP 200 with `{ permissions: string[] }` containing that user's own effective permissions — the request is NOT rejected with 403

#### Scenario: Forbidden when requesting another user's permissions without users:read
- **WHEN** an authenticated user whose `x-user-id` header is `U1`, and who does NOT have `users:read`, calls `GET /api/v1/admin/users/U2/permissions` (a different user id)
- **THEN** the response is HTTP 403 with `{ "error": "Forbidden", "required": "users:read" }`

#### Scenario: Validation error returns 400
- **WHEN** `POST /api/v1/admin/users/:id/roles` is called with `{ "roleName": "Admin" }` (uppercase, invalid)
- **THEN** the response is HTTP 400 with a Zod field error

#### Scenario: Unknown role returns 404
- **WHEN** `POST /api/v1/admin/users/:id/roles` is called with `{ "roleName": "ghost" }` and `ghost` does not exist
- **THEN** the response is HTTP 404

#### Scenario: Duplicate assignment returns 409
- **WHEN** `POST /api/v1/admin/users/:id/roles` is called for a `(userId, roleName)` pair that already exists
- **THEN** the response is HTTP 409
