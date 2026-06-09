# Spec: rbac

## Purpose

Define the role-based access control (RBAC) subsystem: domain entities, use cases for role/permission management, authorization service with caching, default role assignment on registration, and the `requirePermission` guard for route handlers.

---

## Requirements

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
- Permissions: `users:read`, `users:write`, `roles:read`, `roles:write`, `payment_methods:read`, `payment_methods:write`, `folios:read`, `folios:write`, `departments:read`, `departments:write`, `branches:read`, `branches:write`, `providers:read`, `providers:write`, `products:read`, `products:write`, `inventory:read`, `inventory:write`, `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:edit_completed`, `branches:access_all`, `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`, `returns:read`, `returns:create`, `returns:cancel`, `sales:create_credit`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`, `reports:inventory_read`
- Role grants:
  - `admin` → all 40 permissions
  - `operator` → `users:read`, `roles:read`, `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`, `inventory:read`, `inventory:write`, `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:create_credit`, `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`, `returns:read`, `returns:create`, `returns:cancel`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`, `reports:inventory_read`
  - `viewer` → `users:read`, `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`, `inventory:read`, `customers:read`, `sales:read`, `quotes:read`, `returns:read`, `payments:read`, `payments:report_read`, `reports:inventory_read`

The seed MUST be safe to run multiple times against the same database without raising errors or producing duplicate rows. The total permission count rises from 39 to 40 after the addition of `reports:inventory_read` (the 5 permissions `sales:create_credit`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read` were added by the prior `api-abonos` change).

Additionally, the seed SHALL upsert (idempotently) a base `Folio` with `code='RECIBO'`, `name='Recibo de abono'`, `prefix='RECIBO-'`, `isActive=true`. The `current_number` SHALL NOT be reset on re-execution.

#### Scenario: Seed runs on empty database
- **WHEN** `npm run seed` is run against a database that has the RBAC tables but no rows
- **THEN** all 3 roles, 35 permissions, and the role-permission grants listed above exist after the script completes

#### Scenario: Seed is idempotent
- **WHEN** `npm run seed` is run a second time against a database already seeded
- **THEN** no errors are thrown and no duplicate rows are created

#### Scenario: Seed adds new permissions to existing database
- **WHEN** `npm run seed` runs against a database that already has the original 4 permissions but lacks the 8 new catalog permissions
- **THEN** the 8 new permissions and their role grants are created without modifying existing roles or grants

#### Scenario: Seed creates providers permissions
- **WHEN** `npm run seed` runs against a fresh database
- **THEN** the `permissions` table contains rows with `key = 'providers:read'` and `key = 'providers:write'`

#### Scenario: Admin role gets both providers permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to both `providers:read` and `providers:write`

#### Scenario: Viewer role gets only providers:read
- **WHEN** the seed completes
- **THEN** the `viewer` role has a `role_permissions` row linking it to `providers:read` but NOT to `providers:write`

#### Scenario: Operator role gets only providers:read
- **WHEN** the seed completes
- **THEN** the `operator` role has a `role_permissions` row linking it to `providers:read` but NOT to `providers:write`

#### Scenario: Seed creates products and inventory permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 14 permissions
- **THEN** the `permissions` table now contains 18 rows including `products:read`, `products:write`, `inventory:read`, `inventory:write`

#### Scenario: Admin role gets all four new permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to `products:read`, `products:write`, `inventory:read`, `inventory:write`

#### Scenario: Operator role gets products:read, inventory:read, inventory:write
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `products:read`, `inventory:read`, `inventory:write`, but NOT to `products:write`

#### Scenario: Viewer role gets only the two read permissions
- **WHEN** the seed completes
- **THEN** the `viewer` role has `role_permissions` rows linking it to `products:read` and `inventory:read`, but NOT to `products:write` or `inventory:write`

#### Scenario: Seed creates POS permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 18 permissions
- **THEN** the `permissions` table now contains 25 rows including `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:edit_completed`, `branches:access_all`

#### Scenario: Admin role gets all seven new permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to each of the seven new permissions

#### Scenario: Operator role gets the five operational permissions
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, but NOT to `sales:edit_completed` or `branches:access_all`

#### Scenario: Viewer role gets only the read permissions
- **WHEN** the seed completes
- **THEN** the `viewer` role has `role_permissions` rows linking it to `customers:read` and `sales:read`, but NOT to any write/create/cancel/edit permission and NOT to `branches:access_all`

#### Scenario: branches:access_all is exclusive to admin
- **WHEN** the seed completes
- **THEN** `branches:access_all` SHALL be granted ONLY to the `admin` role; `operator` and `viewer` SHALL NOT have it

#### Scenario: Seed remains idempotent
- **WHEN** `npm run seed` runs twice consecutively
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run

#### Scenario: Seed merges with existing permissions
- **WHEN** the seed runs against a database that already has the 14 prior permissions but lacks the 4 new ones
- **THEN** the 4 new permissions are created and assigned without modifying or removing any existing permission/grant

#### Scenario: Seed creates quote permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 25 permissions
- **THEN** the `permissions` table now contains 31 rows including `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`

#### Scenario: Admin role gets all six new quote permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to each of the six new quote permissions

#### Scenario: Operator role gets all six new quote permissions
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`

#### Scenario: Viewer role gets only quotes:read
- **WHEN** the seed completes
- **THEN** the `viewer` role has a `role_permissions` row linking it to `quotes:read` but NOT to any write/create/cancel/authorize/convert quote permission

#### Scenario: Seed merges with existing permissions (quotes)
- **WHEN** the seed runs against a database that already has the 25 prior permissions but lacks the 6 new quote ones
- **THEN** the 6 new permissions are created and assigned without modifying or removing any existing permission/grant

#### Scenario: Seed creates returns permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 31 permissions
- **THEN** the `permissions` table now contains 34 rows including `returns:read`, `returns:create`, `returns:cancel`

#### Scenario: Admin role gets all three new permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to `returns:read`, `returns:create`, `returns:cancel`

#### Scenario: Operator role gets all three new permissions
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `returns:read`, `returns:create`, `returns:cancel`

#### Scenario: Viewer role gets only returns:read
- **WHEN** the seed completes
- **THEN** the `viewer` role has a `role_permissions` row linking it to `returns:read` but NOT to `returns:create` or `returns:cancel`

#### Scenario: Seed remains idempotent (returns)
- **WHEN** `npm run seed` runs twice consecutively
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run

#### Scenario: Seed merges with existing permissions (returns)
- **WHEN** the seed runs against a database that already has the 31 prior permissions but lacks the 3 new return ones
- **THEN** the 3 new permissions are created and assigned without modifying or removing any existing permission/grant

#### Scenario: Seed creates payments permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 34 permissions
- **THEN** the `permissions` table now contains 39 rows including `sales:create_credit`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`

#### Scenario: Admin role gets all five new permissions (payments)
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to `sales:create_credit`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`

#### Scenario: Operator role gets all five new permissions (payments)
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `sales:create_credit`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`

#### Scenario: Viewer role gets only payments:read and payments:report_read
- **WHEN** the seed completes
- **THEN** the `viewer` role has `role_permissions` rows linking it to `payments:read` and `payments:report_read` but NOT to `payments:create`, `payments:cancel`, or `sales:create_credit`

#### Scenario: Seed merges with existing permissions (payments)
- **WHEN** the seed runs against a database that already has the 34 prior permissions but lacks the 5 new payment ones
- **THEN** the 5 new permissions are created and assigned without modifying or removing any existing permission/grant

#### Scenario: Seed remains idempotent (payments)
- **WHEN** `npm run seed` runs twice consecutively after adding the payment permissions
- **THEN** the second run does not throw and the `permissions`, `role_permissions`, and `folios` tables contain the same rows as after the first run

#### Scenario: Seed creates RECIBO folio
- **WHEN** the seed runs against a database without a folio with `code='RECIBO'`
- **THEN** the `folios` table contains a row with `code='RECIBO'`, `name='Recibo de abono'`, `prefix='RECIBO-'`, `current_number=0`, `is_active=true`

#### Scenario: Seed preserves RECIBO current_number on re-run
- **WHEN** the folio `RECIBO` already exists with `current_number=42`
- **THEN** the second run does NOT reset `current_number`; the value remains `42`

#### Scenario: Seed creates reports permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 39 permissions
- **THEN** the `permissions` table now contains 40 rows including `reports:inventory_read`

#### Scenario: All three base roles get reports:inventory_read
- **WHEN** the seed completes
- **THEN** the `admin`, `operator`, and `viewer` roles each have a `role_permissions` row linking them to `reports:inventory_read`

#### Scenario: Seed remains idempotent (reports)
- **WHEN** `npm run seed` runs twice consecutively after adding `reports:inventory_read`
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run

#### Scenario: Seed merges with existing permissions (reports)
- **WHEN** the seed runs against a database that already has the 34 prior permissions but lacks `reports:inventory_read`
- **THEN** `reports:inventory_read` is created and assigned to `admin`, `operator`, and `viewer` without modifying or removing any existing permission/grant

---

### Requirement: branches:access_all bypass semantics
The permission `branches:access_all` SHALL act as a transversal bypass to branch-scoped authorization checks. Every backend handler that scopes a resource by `branchId` (POS sales listings/reads/creates/edits/cancels, branch inventory listings/reads/creates/updates/adjustments, future modules) SHALL check this permission via `AuthorizationService.userCan(userId, "branches:access_all")`; when the result is `true`, the handler SHALL skip the comparison between the resource's `branchId` and the user's `x-user-branch-id`. When the result is `false` and the comparison fails, the handler SHALL return HTTP 403 `{ "error": "Forbidden", "required": "branches:access_all" }`.

This permission SHALL NOT be granted to `operator` or `viewer` in the seed; only `admin`. Granting it to a custom role is allowed by the existing `GrantPermissionToRoleUseCase` but is the integrator's responsibility.

#### Scenario: Admin bypass applied
- **WHEN** an `admin` (granted `branches:access_all`) requests `GET /api/v1/admin/branches/<otherBranchId>/inventory`
- **THEN** the system returns HTTP 200 even though the admin's `branchId` differs from `<otherBranchId>`

#### Scenario: Operator bypass denied
- **WHEN** an `operator` (NOT granted `branches:access_all`) requests `GET /api/v1/admin/branches/<otherBranchId>/inventory` for a branch that is not theirs
- **THEN** the system returns HTTP 403 `{ "error": "Forbidden", "required": "branches:access_all" }`

#### Scenario: Bypass is not implied by other permissions
- **WHEN** an `operator` has `inventory:read` but lacks `branches:access_all`
- **THEN** the system still enforces the branch scoping (the `inventory:read` permission alone is not sufficient to access another branch)
