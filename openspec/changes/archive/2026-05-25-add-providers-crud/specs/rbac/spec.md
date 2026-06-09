## MODIFIED Requirements

### Requirement: RBAC permission seed
The seed script `prisma/seed.ts` SHALL include the permissions `providers:read` and `providers:write` in its `PERMISSIONS` array, with Spanish descriptions ("Leer proveedores" and "Crear/editar proveedores"). The seed SHALL assign `providers:read` AND `providers:write` to the `admin` role, and only `providers:read` to both `operator` and `viewer` roles. The seed SHALL remain idempotent via `upsert` for both `Permission` and `RolePermission`.

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

#### Scenario: Seed is idempotent
- **WHEN** `npm run seed` runs twice consecutively
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run
