## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The seed script `prisma/seed.ts` SHALL include four new permissions in its `PERMISSIONS` array: `products:read` (description "Leer productos"), `products:write` ("Crear/editar productos"), `inventory:read` ("Leer inventario"), `inventory:write` ("Ajustar inventario"). The seed SHALL assign these permissions to the base roles as follows:

- `admin` → `products:read`, `products:write`, `inventory:read`, `inventory:write`
- `operator` → `products:read`, `inventory:read`, `inventory:write` (operators typically work at a branch and adjust stock during shifts; they do not create products)
- `viewer` → `products:read`, `inventory:read`

The seed SHALL remain idempotent via `upsert` for both `Permission` and `RolePermission`. The total permission count rises from 14 to 18 after this change.

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

#### Scenario: Seed remains idempotent
- **WHEN** `npm run seed` runs twice consecutively
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run

#### Scenario: Seed merges with existing permissions
- **WHEN** the seed runs against a database that already has the 14 prior permissions but lacks the 4 new ones
- **THEN** the 4 new permissions are created and assigned without modifying or removing any existing permission/grant
