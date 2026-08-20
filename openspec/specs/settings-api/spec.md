# Spec: settings-api

## Purpose

Configuración global del negocio. Cubre por ahora únicamente la plantilla del ticket de venta impreso (logo, encabezado, pie, ancho de papel), diseñada como un singleton — sin `branchId`, una sola configuración para todo el negocio — extensible a futuras configuraciones globales sin cambiar el patrón.

---
## Requirements
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

---

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

### Requirement: Get inventory notification settings
El sistema SHALL exponer `GET /api/v1/admin/settings/inventory-notifications`. Requiere `settings:read`. Retorna la configuración global (singleton, sin `branchId`, mismo patrón que `pricing_settings`) del correo destino para avisos de caducidad de inventario. Si no existe fila aún en `inventory_notification_settings`, el sistema SHALL retornar el valor por defecto SIN crear una fila: `{"expirationNotificationEmail": null}`.

#### Scenario: Sin configuración aún
- **WHEN** se llama `GET /settings/inventory-notifications` y `inventory_notification_settings` no tiene filas
- **THEN** el sistema retorna HTTP 200 con `{"expirationNotificationEmail": null}`, sin crear ninguna fila como efecto secundario

#### Scenario: Configuración existente
- **WHEN** existe una fila con `expiration_notification_email = "compras@agrisas.mx"`
- **THEN** el sistema retorna `{"expirationNotificationEmail": "compras@agrisas.mx"}`

#### Scenario: Sin permiso
- **WHEN** un caller sin `settings:read` llama al endpoint
- **THEN** el sistema retorna HTTP 403 `{"error": "Forbidden", "required": "settings:read"}`

### Requirement: Update inventory notification settings
El sistema SHALL exponer `PATCH /api/v1/admin/settings/inventory-notifications`. Requiere `settings:write`. Body: `expirationNotificationEmail: string | null` (formato email válido si no es `null`, máximo 120 caracteres). Un body vacío (`{}`) SHALL responder HTTP 400 (siguiendo la regla común de PATCH del resto de módulos admin: al menos 1 campo requerido). Si no existe fila aún, el sistema SHALL crearla (upsert) usando un `id` fijo y bien conocido, de forma que nunca exista más de una fila.

#### Scenario: Actualización exitosa
- **WHEN** el body es `{ "expirationNotificationEmail": "compras@agrisas.mx" }`
- **THEN** el sistema retorna HTTP 200 con el valor persistido

#### Scenario: Desactivar notificaciones enviando null
- **WHEN** el body es `{ "expirationNotificationEmail": null }`
- **THEN** el sistema persiste `null`, desactivando el envío de avisos de caducidad sin error

#### Scenario: Formato de email inválido es rechazado
- **WHEN** el body es `{ "expirationNotificationEmail": "no-es-un-correo" }`
- **THEN** el sistema retorna HTTP 400 con un mensaje de validación sobre el campo

#### Scenario: Body vacío es rechazado
- **WHEN** el body es `{}`
- **THEN** el sistema retorna HTTP 400

