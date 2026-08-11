# settings-api

## MODIFIED Requirements

### Requirement: Get ticket settings
The system SHALL expose `GET /api/v1/admin/settings/ticket`. Requires `settings:read`. Returns the current global ticket template configuration. If no row exists yet in `ticket_settings`, the system SHALL return the default values WITHOUT creating a row: `{"logoUrl": null, "headerText": null, "footerText": null, "paperWidth": "80mm", "businessAddress": "Ocotlán de Morelos, Oaxaca, C.P. 71520", "businessPhone": "951 292 80 86", "businessTaxRegime": "612 Personas Físicas con Actividad Empresarial", "legendText": "Favor de revisar su mercancia. No se hacen cambios ni devoluciones. Gracias por su compra."}`.

#### Scenario: No configuration exists yet
- **WHEN** `GET /settings/ticket` is called and `ticket_settings` has no rows
- **THEN** the system returns HTTP 200 with the default values (including the business info defaults), and no row is created as a side effect

#### Scenario: Configuration exists
- **WHEN** a row exists with `logo_url`, `header_text`, `footer_text`, `paper_width`, `business_address`, `business_phone`, `business_tax_regime`, `legend_text` set
- **THEN** the system returns those exact values

#### Scenario: Forbidden without settings:read
- **WHEN** a caller without `settings:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "settings:read"}`

---

### Requirement: Update ticket settings
The system SHALL expose `PATCH /api/v1/admin/settings/ticket`. Requires `settings:write`. Body (all optional, at least one required — empty body → HTTP 400): `headerText: string | null` (max 500 chars), `footerText: string | null` (max 500 chars), `paperWidth: '58mm' | '80mm'`, `businessAddress: string | null` (max 300 chars), `businessPhone: string | null` (max 30 chars), `businessTaxRegime: string | null` (max 120 chars), `legendText: string | null` (max 500 chars). Does NOT accept `logoUrl` in this body — the logo is managed exclusively via the dedicated upload/delete endpoints below. If no row exists yet, the system SHALL create one (upsert) using a fixed, well-known `id` so at most one row ever exists. On first write, columns not present in the body SHALL default to the business info defaults above (not `null`).

#### Scenario: Successful partial update
- **WHEN** the body is `{ "legendText": "Gracias por su compra" }` and no other fields are sent
- **THEN** the system returns HTTP 200 with `legendText` updated and all other fields unchanged (or defaulted to the business info defaults, if this is the first write)

#### Scenario: Empty body rejected
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400

#### Scenario: Invalid paperWidth rejected
- **WHEN** the body is `{ "paperWidth": "40mm" }`
- **THEN** the system returns HTTP 400

#### Scenario: Business field over the max length rejected
- **WHEN** the body is `{ "businessPhone": "1-800-..." }` longer than 30 chars
- **THEN** the system returns HTTP 400

#### Scenario: First write creates the singleton row
- **WHEN** `ticket_settings` has no rows and a valid `PATCH` is sent
- **THEN** the system creates exactly one row with the fixed singleton `id`

#### Scenario: Second write updates the same row, never creates a second one
- **WHEN** a row already exists and a valid `PATCH` is sent again
- **THEN** the system updates the existing row; `ticket_settings` still has exactly one row afterward

#### Scenario: Forbidden without settings:write
- **WHEN** a caller without `settings:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "settings:write"}`
