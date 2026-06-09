## ADDED Requirements

### Requirement: Role and Permission entities
The system SHALL provide `Role` and `Permission` as domain entities, each with an immutable UUID identifier, a human-readable name/key, an optional description, and `createdAt`/`updatedAt` timestamps. `Role.name` SHALL match `^[a-z][a-z0-9_]{1,31}$` (snake_case, 2–32 chars). `Permission.key` SHALL match `^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$` (format `resource:action`, e.g. `users:read`).

#### Scenario: Valid role name accepted
- **WHEN** a `RoleName` value object is constructed with `"admin"` or `"farm_operator"`
- **THEN** construction succeeds without error

#### Scenario: Invalid role name rejected
- **WHEN** a `RoleName` value object is constructed with `"Admin"`, `"a"`, `""`, or a 33-char string
- **THEN** construction throws `InvalidRoleNameError`

#### Scenario: Valid permission key accepted
- **WHEN** a `PermissionKey` value object is constructed with `"users:read"` or `"farms:write"`
- **THEN** construction succeeds without error

#### Scenario: Invalid permission key rejected
- **WHEN** a `PermissionKey` value object is constructed with `"users"`, `"users:"`, `":read"`, or `"users:read:extra"`
- **THEN** construction throws `InvalidPermissionKeyError`

---

### Requirement: Assign role to user
The system SHALL allow assigning an existing role to an existing user. Assignment SHALL be idempotent at the API surface (re-assigning the same role to the same user MUST return a 409 conflict, not a duplicate row) and SHALL invalidate any cached permissions for that user immediately upon persistence.

#### Scenario: Successful role assignment
- **WHEN** `AssignRoleToUserUseCase.execute({ userId, roleName: "operator" })` is invoked with a valid user and role
- **THEN** a row is inserted in `user_roles` and the cached permissions for `userId` are invalidated

#### Scenario: Role not found
- **WHEN** `AssignRoleToUserUseCase.execute({ userId, roleName: "ghost" })` is invoked with a non-existent role
- **THEN** the use case throws `RoleNotFoundError`

#### Scenario: Duplicate assignment
- **WHEN** `AssignRoleToUserUseCase.execute(...)` is invoked twice with the same `userId` and `roleName`
- **THEN** the second call throws `RoleAlreadyAssignedError`

---

### Requirement: Revoke role from user
The system SHALL allow revoking a role from a user. The operation SHALL be idempotent (revoking an unassigned role MUST succeed silently) and SHALL invalidate cached permissions for the user.

#### Scenario: Successful role revocation
- **WHEN** `RevokeRoleFromUserUseCase.execute({ userId, roleId })` is invoked for an existing assignment
- **THEN** the row is deleted from `user_roles` and the user's cached permissions are invalidated

#### Scenario: Revoking unassigned role is idempotent
- **WHEN** `RevokeRoleFromUserUseCase.execute({ userId, roleId })` is invoked and no such assignment exists
- **THEN** the use case completes without throwing

---

### Requirement: Grant and revoke permissions on a role
The system SHALL allow granting and revoking permissions on a role. Granting a permission already attached to the role MUST throw `PermissionAlreadyGrantedError`. Revoking is idempotent. Both operations SHALL invalidate cached permissions for every user assigned to that role.

#### Scenario: Successful permission grant
- **WHEN** `GrantPermissionToRoleUseCase.execute({ roleId, permissionKey: "users:write" })` is invoked
- **THEN** a row is inserted in `role_permissions` and the cache is invalidated for all users in that role

#### Scenario: Permission not found
- **WHEN** `GrantPermissionToRoleUseCase.execute({ roleId, permissionKey: "ghost:read" })` is invoked
- **THEN** the use case throws `PermissionNotFoundError`

#### Scenario: Successful permission revocation
- **WHEN** `RevokePermissionFromRoleUseCase.execute({ roleId, permissionId })` is invoked
- **THEN** the row is deleted from `role_permissions` and the cache is invalidated

---

### Requirement: Authorization decision via AuthorizationService
The system SHALL expose `AuthorizationService.userCan(userId, permissionKey): Promise<boolean>` as the single source of truth for authorization decisions. The implementation SHALL aggregate permissions across all roles assigned to the user, MUST cache the result in memory with a TTL of 60 seconds keyed by `userId`, and MUST expose `invalidate(userId)` and `invalidateByRole(roleId)` for explicit invalidation.

#### Scenario: User has permission via role
- **WHEN** `userCan("user-123", "users:read")` is called and `user-123` has the role `operator` which grants `users:read`
- **THEN** the method returns `true`

#### Scenario: User lacks permission
- **WHEN** `userCan("user-456", "users:write")` is called and `user-456` has only `viewer` (no `users:write`)
- **THEN** the method returns `false`

#### Scenario: Cache hit on second call
- **WHEN** `userCan(userId, key)` is called twice within 60 seconds with no intervening invalidation
- **THEN** the second call MUST NOT execute a database query

#### Scenario: Cache expires after TTL
- **WHEN** `userCan(userId, key)` is called more than 60 seconds after the previous call with the same `userId`
- **THEN** a fresh database query is executed and the cache is refreshed

#### Scenario: Invalidate after role assignment
- **WHEN** `AssignRoleToUserUseCase` completes for `userId`, and then `userCan(userId, newPermissionKey)` is called immediately
- **THEN** the method returns `true` without waiting for the TTL to expire

---

### Requirement: Default role assignment on user registration
The system SHALL assign a configurable default role (defaulting to `viewer`) to every newly registered user. The default role name SHALL be read from the `RBAC_DEFAULT_ROLE` environment variable at startup. If the variable points to a role that does not exist at startup, the application MUST fail fast.

#### Scenario: New user gets viewer role
- **WHEN** a successful `POST /api/v1/auth/register` completes for a new email
- **THEN** a row is inserted in `user_roles` linking the new user to the `viewer` role

#### Scenario: Missing default role fails at startup
- **WHEN** the application boots with `RBAC_DEFAULT_ROLE=ghost` and no role named `ghost` exists
- **THEN** the DI container fails to initialize and the process exits with a non-zero status

---

### Requirement: requirePermission guard for route handlers
The system SHALL provide a reusable guard `requirePermission(req: NextRequest, permissionKey: string): Promise<NextResponse | null>` that route handlers invoke at the top of every protected endpoint. The guard SHALL read `x-user-id` from the request headers (set by the middleware), evaluate `AuthorizationService.userCan(userId, permissionKey)`, and return `NextResponse.json({ error: "Forbidden", required: permissionKey }, { status: 403 })` when the check fails, or `null` to indicate the handler may proceed.

#### Scenario: Authorized request proceeds
- **WHEN** `requirePermission(req, "users:read")` is invoked, `x-user-id` is present, and the user has the permission
- **THEN** the guard returns `null`

#### Scenario: Missing user id header
- **WHEN** `requirePermission(req, "users:read")` is invoked but `x-user-id` is absent
- **THEN** the guard returns a `NextResponse` with HTTP 401

#### Scenario: User lacks required permission
- **WHEN** `requirePermission(req, "users:write")` is invoked and the user does not have `users:write`
- **THEN** the guard returns a `NextResponse` with HTTP 403 and body `{ "error": "Forbidden", "required": "users:write" }`

---

### Requirement: Admin API for role and permission management
The system SHALL expose versioned administrative endpoints under `/api/v1/admin/**` for managing roles, permissions, and user-role assignments. Every endpoint SHALL be gated by `requirePermission` with the appropriate permission key as defined in the design document, validated with Zod schemas, and SHALL return typed JSON errors.

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

#### Scenario: List effective permissions for a user
- **WHEN** `GET /api/v1/admin/users/:id/permissions` is called by a caller with `users:read`
- **THEN** the response is HTTP 200 with `{ permissions: string[] }` containing the union of all permissions across the user's roles

#### Scenario: Validation error returns 400
- **WHEN** `POST /api/v1/admin/users/:id/roles` is called with `{ "roleName": "Admin" }` (uppercase, invalid)
- **THEN** the response is HTTP 400 with a Zod field error

#### Scenario: Unknown role returns 404
- **WHEN** `POST /api/v1/admin/users/:id/roles` is called with `{ "roleName": "ghost" }` and `ghost` does not exist
- **THEN** the response is HTTP 404

#### Scenario: Duplicate assignment returns 409
- **WHEN** `POST /api/v1/admin/users/:id/roles` is called for a `(userId, roleName)` pair that already exists
- **THEN** the response is HTTP 409

---

### Requirement: Seeded base roles and permissions
The system SHALL provide an idempotent seed script (`prisma/seed.ts`) that ensures the following base entities exist after `npm run seed`:

- Roles: `admin`, `operator`, `viewer`
- Permissions: `users:read`, `users:write`, `roles:read`, `roles:write`
- Role grants:
  - `admin` → `users:read`, `users:write`, `roles:read`, `roles:write`
  - `operator` → `users:read`, `roles:read`
  - `viewer` → `users:read`

The seed MUST be safe to run multiple times against the same database without raising errors or producing duplicate rows.

#### Scenario: Seed runs on empty database
- **WHEN** `npm run seed` is run against a database that has the RBAC tables but no rows
- **THEN** all 3 roles, 4 permissions, and 8 role-permission grants exist after the script completes

#### Scenario: Seed is idempotent
- **WHEN** `npm run seed` is run a second time against a database already seeded
- **THEN** no errors are thrown and no duplicate rows are created
