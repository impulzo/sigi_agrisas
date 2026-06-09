## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The system SHALL provide an idempotent seed script (`prisma/seed.ts`) that ensures the following base entities exist after `npm run seed`:

- Roles: `admin`, `operator`, `viewer`
- Permissions: `users:read`, `users:write`, `roles:read`, `roles:write`, `payment_methods:read`, `payment_methods:write`, `folios:read`, `folios:write`, `departments:read`, `departments:write`, `branches:read`, `branches:write`
- Role grants:
  - `admin` → all 12 permissions
  - `operator` → `users:read`, `roles:read`, `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`
  - `viewer` → `users:read`, `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`

The seed MUST be safe to run multiple times against the same database without raising errors or producing duplicate rows.

#### Scenario: Seed runs on empty database
- **WHEN** `npm run seed` is run against a database that has the RBAC tables but no rows
- **THEN** all 3 roles, 12 permissions, and the role-permission grants listed above exist after the script completes

#### Scenario: Seed is idempotent
- **WHEN** `npm run seed` is run a second time against a database already seeded
- **THEN** no errors are thrown and no duplicate rows are created

#### Scenario: Seed adds new permissions to existing database
- **WHEN** `npm run seed` runs against a database that already has the original 4 permissions but lacks the 8 new catalog permissions
- **THEN** the 8 new permissions and their role grants are created without modifying existing roles or grants
