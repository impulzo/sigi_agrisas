## MODIFIED Requirements

### Requirement: Get ticket settings
The system SHALL expose `GET /api/v1/admin/settings/ticket`. Requires `settings:read`. Returns the current global ticket template configuration. If no row exists yet in `ticket_settings`, the system SHALL return the default values WITHOUT creating a row: `{"logoUrl": null, "footerText": null, "paperWidth": "80mm", "businessName": null, "businessRfc": null, "businessAddress": null, "businessPhone": null, "businessTaxRegime": null, "legendText": "Favor de revisar su mercancia. No se hacen cambios ni devoluciones. Gracias por su compra."}`. The 5 `business*` fields carry NO hardcoded fiscal data in source code — the real issuer identity (razón social, RFC, address, phone, tax regime) is populated exclusively via the idempotent seed script `npm run seed:ticket-settings` (`prisma/seeds/ticketSettings.ts`), which upserts the singleton row directly, or via an admin editing the form manually. `headerText` no longer exists as a field of `TicketSettings` — it is not present in the response, in the default object, or anywhere in the entity.

#### Scenario: No configuration exists yet and the seeder has not run
- **WHEN** `GET /settings/ticket` is called and `ticket_settings` has no rows
- **THEN** the system returns HTTP 200 with the default values (`businessName: null`, `businessRfc: null`, `businessAddress: null`, `businessPhone: null`, `businessTaxRegime: null`), and no row is created as a side effect

#### Scenario: Seeder populates the real issuer identity
- **WHEN** an operator runs `npm run seed:ticket-settings`
- **THEN** the singleton row is created (if absent) or updated (if present) with the real `businessName`, `businessRfc`, `businessAddress`, `businessPhone`, `businessTaxRegime` — other fields (`logoUrl`, `footerText`, `paperWidth`, `legendText`) are left untouched if the row already existed

#### Scenario: Configuration exists
- **WHEN** a row exists with `logo_url`, `footer_text`, `paper_width`, `business_name`, `business_rfc`, `business_address`, `business_phone`, `business_tax_regime`, `legend_text` set
- **THEN** the system returns those exact values, with no `headerText` key in the response

#### Scenario: Forbidden without settings:read
- **WHEN** a caller without `settings:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "settings:read"}`

---

### Requirement: Update ticket settings
The system SHALL expose `PATCH /api/v1/admin/settings/ticket`. Requires `settings:write`. Body (all optional, at least one required — empty body → HTTP 400): `footerText: string | null` (max 500 chars), `paperWidth: '58mm' | '80mm'`, `businessName: string | null` (max 200 chars), `businessRfc: string | null` (max 13 chars, no format validation — informational field, not a CFDI-grade RFC), `businessAddress: string | null` (max 300 chars), `businessPhone: string | null` (max 30 chars), `businessTaxRegime: string | null` (max 120 chars), `legendText: string | null` (max 500 chars). `headerText` is NOT a recognized field of this body — the request validation schema does not declare it, so if a caller sends it (e.g. a stale client from before this change), the system SHALL silently ignore it (standard "strip unknown keys" behavior) rather than rejecting the request or persisting it. Does NOT accept `logoUrl` in this body — the logo is managed exclusively via the dedicated upload/delete endpoints below. If no row exists yet, the system SHALL create one (upsert) using a fixed, well-known `id` so at most one row ever exists. On first write via this endpoint, columns not present in the body SHALL default to `DEFAULT_TICKET_SETTINGS` (`businessName: null`, `businessRfc: null`, etc. — see "Get ticket settings"), NOT to the real issuer identity; populating the real identity is the seeder's responsibility, not this endpoint's default-fallback.

#### Scenario: Successful partial update
- **WHEN** the body is `{ "footerText": "Gracias por su compra" }` and no other fields are sent
- **THEN** the system returns HTTP 200 with `footerText` updated and all other fields unchanged (or defaulted to the business info defaults, if this is the first write)

#### Scenario: Successful update of businessName and businessRfc
- **WHEN** the body is `{ "businessName": "Agrisas S.A. de C.V.", "businessRfc": "AGR010101AB1" }`
- **THEN** the system returns HTTP 200 with both fields updated and persisted

#### Scenario: Clearing businessName or businessRfc persists null
- **WHEN** the body is `{ "businessRfc": null }`
- **THEN** the system returns HTTP 200 with `businessRfc: null` persisted, leaving `businessName` unchanged

#### Scenario: Legacy headerText field in the request body is ignored
- **WHEN** a `PATCH` body is `{ "headerText": "algún texto", "footerText": "Gracias" }`
- **THEN** the system returns HTTP 200, applies `footerText` normally, and the response contains no `headerText` key — the value sent for `headerText` is not persisted anywhere

#### Scenario: Empty body rejected
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400

#### Scenario: Invalid paperWidth rejected
- **WHEN** the body is `{ "paperWidth": "40mm" }`
- **THEN** the system returns HTTP 400

#### Scenario: Business field over the max length rejected
- **WHEN** the body is `{ "businessPhone": "1-800-..." }` longer than 30 chars, or `{ "businessRfc": "..." }` longer than 13 chars, or `{ "businessName": "..." }` longer than 200 chars
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
