## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The system SHALL provide an idempotent seed script (`prisma/seed.ts`) that ensures the following base entities exist after `npm run seed`:

- Roles: `admin`, `operator`, `viewer`
- Permissions: `users:read`, `users:write`, `roles:read`, `roles:write`, `payment_methods:read`, `payment_methods:write`, `folios:read`, `folios:write`, `departments:read`, `departments:write`, `branches:read`, `branches:write`, `providers:read`, `providers:write`, `products:read`, `products:write`, `inventory:read`, `inventory:write`, `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:edit_completed`, `sales:create_credit`, `branches:access_all`, `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`, `returns:read`, `returns:create`, `returns:cancel`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`
- Role grants:
  - `admin` → all 39 permissions
  - `operator` → `users:read`, `roles:read`, `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`, `inventory:read`, `inventory:write`, `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:create_credit`, `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`, `returns:read`, `returns:create`, `returns:cancel`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`
  - `viewer` → `users:read`, `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`, `inventory:read`, `customers:read`, `sales:read`, `quotes:read`, `returns:read`, `payments:read`, `payments:report_read`

The seed MUST be safe to run multiple times against the same database without raising errors or producing duplicate rows. The total permission count rises from 34 to 39 after the addition of `sales:create_credit`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`.

Additionally, the seed SHALL upsert (idempotently) a base `Folio` with `code='RECIBO'`, `name='Recibo de abono'`, `prefix='RECIBO-'`, `isActive=true`. The `current_number` SHALL NOT be reset on re-execution.

#### Scenario: Seed runs on empty database
- **WHEN** `npm run seed` is run against a database that has the RBAC tables but no rows
- **THEN** all 3 roles, 39 permissions, and the role-permission grants listed above exist after the script completes; the `folios` table contains a row with `code='RECIBO'` and `current_number=0`

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

#### Scenario: Admin role gets all three new return permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to `returns:read`, `returns:create`, `returns:cancel`

#### Scenario: Operator role gets all three new return permissions
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `returns:read`, `returns:create`, `returns:cancel`

#### Scenario: Viewer role gets only returns:read
- **WHEN** the seed completes
- **THEN** the `viewer` role has a `role_permissions` row linking it to `returns:read` but NOT to `returns:create` or `returns:cancel`

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
