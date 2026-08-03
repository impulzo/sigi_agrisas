## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The system SHALL provide an idempotent seed script (`prisma/seed.ts`) that ensures the following base entities exist after `npm run seed`:

- Roles: `admin`, `operator`, `viewer`
- Permissions: the 40 previously seeded permissions (see prior scenarios in this requirement for their history) PLUS `waybills:read`, `waybills:write`, `waybills:cancel`, `waybills:stamp` — 44 total.
- Role grants (delta over the previously seeded state):
  - `admin` → all 44 permissions, including `waybills:read`, `waybills:write`, `waybills:cancel`, `waybills:stamp`
  - `operator` → gains `waybills:read`, `waybills:write`, `waybills:cancel`, `waybills:stamp`
  - `viewer` → gains `waybills:read` only — NOT `waybills:write`, `waybills:cancel`, or `waybills:stamp`

`waybills:stamp` gates creating a `type='carta_porte'` waybill (Complemento Carta Porte, timbrado ante el SAT) in addition to the pre-existing `waybills:write`; it is irreversible once stamped, which is why it is withheld from `viewer` and granted only to the two roles that can already write.

The seed MUST remain safe to run multiple times against the same database without raising errors, duplicating rows, or resetting `current_number` on any seeded `Folio`.

#### Scenario: Seed creates waybills permissions
- **WHEN** `npm run seed` runs against a database that already has the previous 40 permissions
- **THEN** the `permissions` table now contains 44 rows including `waybills:read`, `waybills:write`, `waybills:cancel`, `waybills:stamp`

#### Scenario: Admin role gets all four waybills permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to `waybills:read`, `waybills:write`, `waybills:cancel`, and `waybills:stamp`

#### Scenario: Operator role gets all four waybills permissions
- **WHEN** the seed completes
- **THEN** the `operator` role has `role_permissions` rows linking it to `waybills:read`, `waybills:write`, `waybills:cancel`, and `waybills:stamp`

#### Scenario: Viewer role gets only waybills:read
- **WHEN** the seed completes
- **THEN** the `viewer` role has a `role_permissions` row linking it to `waybills:read` but NOT to `waybills:write`, `waybills:cancel`, or `waybills:stamp`

#### Scenario: Seed remains idempotent (waybills)
- **WHEN** `npm run seed` runs twice consecutively after adding the four `waybills:*` permissions
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run
