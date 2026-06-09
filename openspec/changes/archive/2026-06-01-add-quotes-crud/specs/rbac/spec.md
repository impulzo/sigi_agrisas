## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The seed script `prisma/seed.ts` SHALL include six new permissions in its `PERMISSIONS` array: `quotes:read` (description "Leer cotizaciones"), `quotes:create` ("Crear cotizaciones"), `quotes:write` ("Editar cotizaciones en borrador"), `quotes:cancel` ("Cancelar cotizaciones"), `quotes:authorize` ("Autorizar cotizaciones"), `quotes:convert` ("Convertir cotizaciones a ventas"). The seed SHALL assign these permissions to the base roles as follows:

- `admin` → all six new permissions
- `operator` → `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert` (all six — the operator is the field salesperson who cotizes, negotiates, and closes)
- `viewer` → `quotes:read` (read-only access for supervisors and auditors)

The seed SHALL remain idempotent via `upsert` for both `Permission` and `RolePermission`. The total permission count rises from 25 to 31 after this change.

#### Scenario: Seed creates quote permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 25 permissions
- **THEN** the `permissions` table now contains 31 rows including `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`

#### Scenario: Admin role gets all six new permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to each of the six new quote permissions

#### Scenario: Operator role gets all six new permissions
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`

#### Scenario: Viewer role gets only quotes:read
- **WHEN** the seed completes
- **THEN** the `viewer` role has a `role_permissions` row linking it to `quotes:read` but NOT to any write/create/cancel/authorize/convert permission

#### Scenario: Seed remains idempotent
- **WHEN** `npm run seed` runs twice consecutively
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run

#### Scenario: Seed merges with existing permissions
- **WHEN** the seed runs against a database that already has the 25 prior permissions but lacks the 6 new ones
- **THEN** the 6 new permissions are created and assigned without modifying or removing any existing permission/grant
