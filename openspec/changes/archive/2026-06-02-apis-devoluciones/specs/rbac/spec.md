## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The seed script `prisma/seed.ts` SHALL include three new permissions in its `PERMISSIONS` array: `returns:read` (description "Leer devoluciones"), `returns:create` ("Registrar devoluciones"), `returns:cancel` ("Cancelar devoluciones"). The seed SHALL assign these permissions to the base roles as follows:

- `admin` → all three new permissions
- `operator` → `returns:read`, `returns:create`, `returns:cancel` (the operator handles in-store returns end-to-end)
- `viewer` → `returns:read` (read-only access for supervisors and auditors)

The seed SHALL remain idempotent via `upsert` for both `Permission` and `RolePermission`. The total permission count rises from 31 to 34 after this change.

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

#### Scenario: Seed remains idempotent
- **WHEN** `npm run seed` runs twice consecutively
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run

#### Scenario: Seed merges with existing permissions (returns)
- **WHEN** the seed runs against a database that already has the 31 prior permissions but lacks the 3 new return ones
- **THEN** the 3 new permissions are created and assigned without modifying or removing any existing permission/grant
