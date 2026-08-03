## Purpose

Configuración global del negocio. Cubre por ahora únicamente la plantilla del ticket de venta impreso (logo, encabezado, pie, ancho de papel), diseñada como un singleton — sin `branchId`, una sola configuración para todo el negocio — extensible a futuras configuraciones globales sin cambiar el patrón.

## ADDED Requirements

### Requirement: Get ticket settings
The system SHALL expose `GET /api/v1/admin/settings/ticket`. Requires `settings:read`. Returns the current global ticket template configuration. If no row exists yet in `ticket_settings`, the system SHALL return the default values WITHOUT creating a row: `{"logoUrl": null, "headerText": null, "footerText": null, "paperWidth": "80mm"}`.

#### Scenario: No configuration exists yet
- **WHEN** `GET /settings/ticket` is called and `ticket_settings` has no rows
- **THEN** the system returns HTTP 200 with the default values, and no row is created as a side effect

#### Scenario: Configuration exists
- **WHEN** a row exists with `logo_url`, `header_text`, `footer_text`, `paper_width` set
- **THEN** the system returns those exact values

#### Scenario: Forbidden without settings:read
- **WHEN** a caller without `settings:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "settings:read"}`

### Requirement: Update ticket settings
The system SHALL expose `PATCH /api/v1/admin/settings/ticket`. Requires `settings:write`. Body (all optional, at least one required — empty body → HTTP 400): `headerText: string | null` (max 500 chars), `footerText: string | null` (max 500 chars), `paperWidth: '58mm' | '80mm'`. Does NOT accept `logoUrl` in this body — the logo is managed exclusively via the dedicated upload/delete endpoints below. If no row exists yet, the system SHALL create one (upsert) using a fixed, well-known `id` so at most one row ever exists.

#### Scenario: Successful partial update
- **WHEN** the body is `{ "footerText": "Gracias por su compra" }` and no other fields are sent
- **THEN** the system returns HTTP 200 with `footerText` updated and all other fields unchanged (or defaulted, if this is the first write)

#### Scenario: Empty body rejected
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400

#### Scenario: Invalid paperWidth rejected
- **WHEN** the body is `{ "paperWidth": "40mm" }`
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

### Requirement: Upload/delete ticket logo
The system SHALL expose `POST /api/v1/admin/settings/ticket/logo` (multipart form, field `file`) and `DELETE /api/v1/admin/settings/ticket/logo`. Both require `settings:write`. Upload accepts `image/jpeg`, `image/png`, `image/webp` up to 2MB (same limits as `products-api` "Upload product image"). On successful upload, the system SHALL best-effort delete the previous logo from storage (if any) before persisting the new `logoUrl` on the singleton row (creating it if it doesn't exist yet, per "Update ticket settings"). Storage uses a dedicated Supabase bucket (`ticket-logo`), separate from `product-images`.

#### Scenario: Successful upload replaces previous logo
- **WHEN** a valid PNG under 2MB is uploaded and a previous logo already existed
- **THEN** the system returns HTTP 200 with the new `logoUrl`; the previous logo file is removed from storage (best-effort — a storage delete failure does not block the new upload)

#### Scenario: Invalid format rejected
- **WHEN** the uploaded file's mimetype is not jpeg/png/webp
- **THEN** the system returns HTTP 400 `{"error": "Invalid image format"}` and the current `logoUrl` is unchanged

#### Scenario: File too large rejected
- **WHEN** the uploaded file exceeds 2MB
- **THEN** the system returns HTTP 413 and the current `logoUrl` is unchanged

#### Scenario: Delete removes the logo
- **WHEN** `DELETE /settings/ticket/logo` is called and a logo exists
- **THEN** `logoUrl` becomes `null` and the file is removed from storage

#### Scenario: Delete when no logo exists is a no-op success
- **WHEN** `DELETE /settings/ticket/logo` is called and `logoUrl` is already `null`
- **THEN** the system returns HTTP 200 without error

#### Scenario: Forbidden without settings:write
- **WHEN** a caller without `settings:write` calls either endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "settings:write"}`
