## MODIFIED Requirements

### Requirement: Seeded base roles and permissions
The system SHALL provide an idempotent seed script (`prisma/seed.ts`) that ensures the following base entities exist after `npm run seed`. `prisma/seed.ts`'s `PERMISSIONS` array remains the source of truth for the complete, current permission list; this delta documents the addition of the `settings:*` permissions introduced by `config-ticket-miniprinter`.

- New permissions: `settings:read`, `settings:write`.
- Role grants:
  - `admin` → gains `settings:read`, `settings:write`
  - `operator` → gains `settings:read` only — NOT `settings:write`
  - `viewer` → gains `settings:read` only — NOT `settings:write`

`settings:write` gates editing the global ticket template (logo, header/footer text, paper width) and is withheld from `operator`/`viewer` because it's a business-identity configuration, not an operational task — consistent with how the project withholds `*:write` from read-only roles elsewhere in the catalog.

#### Scenario: Seed creates settings permissions
- **WHEN** `npm run seed` runs against a database that already has the permissions predating this change
- **THEN** the `permissions` table now contains rows for `settings:read` and `settings:write`

#### Scenario: Admin role gets both settings permissions
- **WHEN** the seed completes
- **THEN** the `admin` role has `role_permissions` rows linking it to `settings:read` and `settings:write`

#### Scenario: Operator role gets only settings:read
- **WHEN** the seed completes
- **THEN** the `operator` role has a `role_permissions` row linking it to `settings:read` but NOT to `settings:write`

#### Scenario: Viewer role gets only settings:read
- **WHEN** the seed completes
- **THEN** the `viewer` role has a `role_permissions` row linking it to `settings:read` but NOT to `settings:write`

#### Scenario: Seed remains idempotent (settings)
- **WHEN** `npm run seed` runs twice consecutively after adding the two `settings:*` permissions
- **THEN** the second run does not throw and the `permissions` and `role_permissions` tables contain the same rows as after the first run
