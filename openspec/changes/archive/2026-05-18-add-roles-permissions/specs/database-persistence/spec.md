## ADDED Requirements

### Requirement: RBAC tables migration
The system SHALL include a Prisma migration `add_rbac_tables` that creates four tables in the `public` schema: `roles`, `permissions`, `role_permissions`, and `user_roles`. All foreign keys to `users` and to each other MUST use `ON DELETE CASCADE`. The migration MUST be idempotent under `prisma migrate deploy`.

The schema MUST include:

- `public.roles`:
  - `id` UUID PK, default `gen_random_uuid()`
  - `name` VARCHAR(32) UNIQUE NOT NULL
  - `description` TEXT NULL
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
  - Index `roles_name_idx` on `name`

- `public.permissions`:
  - `id` UUID PK, default `gen_random_uuid()`
  - `key` VARCHAR(64) UNIQUE NOT NULL
  - `description` TEXT NULL
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
  - Index `permissions_key_idx` on `key`

- `public.role_permissions`:
  - `role_id` UUID NOT NULL REFERENCES `roles(id)` ON DELETE CASCADE
  - `permission_id` UUID NOT NULL REFERENCES `permissions(id)` ON DELETE CASCADE
  - `granted_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
  - PRIMARY KEY (`role_id`, `permission_id`)
  - Index `role_permissions_permission_idx` on `permission_id`

- `public.user_roles`:
  - `user_id` UUID NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `role_id` UUID NOT NULL REFERENCES `roles(id)` ON DELETE CASCADE
  - `assigned_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
  - PRIMARY KEY (`user_id`, `role_id`)
  - Index `user_roles_role_idx` on `role_id`

#### Scenario: Migration applies cleanly on a database with only the users table
- **WHEN** `prisma migrate deploy` is run against a Supabase database whose only RBAC-related table is `public.users`
- **THEN** the four RBAC tables, indexes, and FK constraints are created exactly as defined above

#### Scenario: Cascade delete propagates to user_roles
- **WHEN** a row in `public.users` is deleted
- **THEN** all rows in `public.user_roles` with that `user_id` are also deleted

#### Scenario: Cascade delete propagates to role_permissions when a role is removed
- **WHEN** a row in `public.roles` is deleted
- **THEN** all rows in `public.role_permissions` and `public.user_roles` referencing that role are also deleted

---

### Requirement: Prisma repositories for RBAC entities
The system SHALL provide four Prisma-backed repositories that implement the corresponding application ports of the `rbac` module:

- `RolePrismaRepository` implements `RoleRepository`
- `PermissionPrismaRepository` implements `PermissionRepository`
- `UserRolePrismaRepository` implements `UserRoleRepository`
- `RolePermissionPrismaRepository` implements `RolePermissionRepository`

Each repository MUST use the shared `prisma` singleton from `src/shared/infrastructure/prisma/client.ts` and MUST translate Prisma unique-constraint errors (`P2002`) into typed domain errors (`RoleAlreadyAssignedError`, `PermissionAlreadyGrantedError`).

#### Scenario: assign() persists a new user-role link
- **WHEN** `UserRolePrismaRepository.assign(userId, roleId)` is called with valid ids
- **THEN** a row is inserted in `public.user_roles` and the call resolves without error

#### Scenario: Duplicate assign throws domain error
- **WHEN** `UserRolePrismaRepository.assign(userId, roleId)` is called with a pair that already exists
- **THEN** the repository catches Prisma `P2002` and throws `RoleAlreadyAssignedError`

#### Scenario: listByUser returns user roles with role data
- **WHEN** `UserRolePrismaRepository.listByUser(userId)` is called for a user with two assigned roles
- **THEN** the method returns an array of two `Role` domain entities

#### Scenario: grant() persists role-permission link
- **WHEN** `RolePermissionPrismaRepository.grant(roleId, permissionId)` is called with valid ids
- **THEN** a row is inserted in `public.role_permissions`

#### Scenario: Duplicate grant throws domain error
- **WHEN** `RolePermissionPrismaRepository.grant(...)` is called with a pair already present
- **THEN** the repository throws `PermissionAlreadyGrantedError`

---

### Requirement: Effective permissions query
The system SHALL provide a single SQL query (executed by `PrismaAuthorizationService.fetchUserPermissions`) that returns the set of distinct `permissions.key` values for a given `userId`, joining `permissions`, `role_permissions`, and `user_roles`. The query MUST use the indexes defined on `user_roles.user_id`, `role_permissions.role_id`, and `permissions.id` for performance.

#### Scenario: Aggregates permissions across multiple roles
- **WHEN** a user has two roles, where role A grants `users:read` and role B grants `users:read` and `roles:read`
- **THEN** the query returns the set `{ "users:read", "roles:read" }` (no duplicates)

#### Scenario: Returns empty set for user with no roles
- **WHEN** a user has zero rows in `user_roles`
- **THEN** the query returns an empty array

---

### Requirement: Seed script
The system SHALL provide `prisma/seed.ts`, registered in `package.json` under `prisma.seed`, that performs idempotent `upsert` of the base roles and permissions defined in the `rbac` capability spec. The seed MUST be wrapped in a `prisma.$transaction` so that partial failure does not leave the catalog in an inconsistent state.

#### Scenario: Seed runs successfully on first execution
- **WHEN** `npm run seed` is executed against a database with the migration applied but no RBAC rows
- **THEN** the transaction completes and all base roles, permissions, and grants are inserted

#### Scenario: Seed is idempotent
- **WHEN** `npm run seed` is executed against a database that is already seeded
- **THEN** no errors are thrown and no duplicate rows are created
