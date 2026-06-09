## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The seed script `prisma/seed.ts` SHALL include seven new permissions in its `PERMISSIONS` array: `customers:read` (description "Leer clientes"), `customers:write` ("Crear/editar clientes"), `sales:read` ("Leer ventas"), `sales:create` ("Crear ventas"), `sales:cancel` ("Cancelar ventas"), `sales:edit_completed` ("Editar ventas completadas (matriz)"), `branches:access_all` ("Acceder a todas las sucursales — bypass del scoping"). The seed SHALL assign these permissions to the base roles as follows:

- `admin` → all seven new permissions
- `operator` → `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`
- `viewer` → `customers:read`, `sales:read`

The seed SHALL remain idempotent via `upsert` for both `Permission` and `RolePermission`. The total permission count rises from 18 to 25 after this change.

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
- **WHEN** the seed runs against a database that already has the 18 prior permissions but lacks the 7 new ones
- **THEN** the 7 new permissions are created and assigned without modifying or removing any existing permission/grant

---

## ADDED Requirements

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
