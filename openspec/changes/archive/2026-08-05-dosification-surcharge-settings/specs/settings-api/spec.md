## ADDED Requirements

### Requirement: Get pricing settings
The system SHALL expose `GET /api/v1/admin/settings/pricing`. Requires `settings:read`. Returns the current global pricing configuration. If no row exists yet in `pricing_settings`, the system SHALL return the default value WITHOUT creating a row: `{"dosificationSurchargePct": 5}`.

#### Scenario: No configuration exists yet
- **WHEN** `GET /settings/pricing` is called and `pricing_settings` has no rows
- **THEN** the system returns HTTP 200 with `{"dosificationSurchargePct": 5}`, and no row is created as a side effect

#### Scenario: Configuration exists
- **WHEN** a row exists with `dosification_surcharge_pct = 8`
- **THEN** the system returns `{"dosificationSurchargePct": 8}`

#### Scenario: Forbidden without settings:read
- **WHEN** a caller without `settings:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "settings:read"}`

---

### Requirement: Update pricing settings
The system SHALL expose `PATCH /api/v1/admin/settings/pricing`. Requires `settings:write`. Body: `{ "dosificationSurchargePct": number }` (required — empty body → HTTP 400). `dosificationSurchargePct` MUST be a finite number `>= 0` (rejecting negative values); the system MAY cap or warn on absurdly high values but SHALL NOT silently clamp — a value `>= 0` is otherwise accepted as-is (no fixed upper bound, mirroring `customers-api`'s `creditDays` pattern of an unbounded but non-negative business percentage). If no row exists yet, the system SHALL create one (upsert) using a fixed, well-known `id` so at most one row ever exists — same singleton pattern as `ticket_settings`.

#### Scenario: Successful update
- **WHEN** the body is `{ "dosificationSurchargePct": 8 }`
- **THEN** the system returns HTTP 200 with `dosificationSurchargePct: 8`; subsequent `GET /products/:id/dosifications` calls compute `computedUnitPrice` using 8%

#### Scenario: Empty body rejected
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400

#### Scenario: Negative value rejected
- **WHEN** the body is `{ "dosificationSurchargePct": -1 }`
- **THEN** the system returns HTTP 400 and the previously configured value (or default) remains in effect

#### Scenario: Non-numeric value rejected
- **WHEN** the body is `{ "dosificationSurchargePct": "abc" }`
- **THEN** the system returns HTTP 400

#### Scenario: First write creates the singleton row
- **WHEN** `pricing_settings` has no rows and a valid `PATCH` is sent
- **THEN** the system creates exactly one row with the fixed singleton `id`

#### Scenario: Second write updates the same row, never creates a second one
- **WHEN** a row already exists and a valid `PATCH` is sent again
- **THEN** the system updates the existing row; `pricing_settings` still has exactly one row afterward

#### Scenario: Forbidden without settings:write
- **WHEN** a caller without `settings:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "settings:write"}`
