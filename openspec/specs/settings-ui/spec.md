# Spec: settings-ui

## Purpose

Pantalla `/settings` para administrar la configuración global del negocio — por ahora, únicamente la plantilla del ticket de venta (logo, encabezado, pie, ancho de papel). Reemplaza el placeholder actual de la ruta.

---
## Requirements
### Requirement: Ticket settings form
The system SHALL render a form at `/settings` for viewing and editing the global ticket template, backed by `settings-api`. Visible to any user with `settings:read`; editable (inputs enabled, save/upload/delete actions available) only to users with `settings:write` — read-only display otherwise. Fields: logo (upload/preview/delete via the existing `ImageUploadField` component), razón social (`businessName`), RFC del emisor (`businessRfc`), business address, business phone, business tax regime (rendered as `SatCatalogCombobox catalog="regimen-fiscal"`, backed by `GET /api/v1/admin/sat-codes/regimen-fiscal` — the same molecule already used in `CustomerEditModal`), footer text, paper width selector (`58mm`/`80mm`). The form no longer includes a "header text" field — it was removed as redundant with razón social/RFC.

The tax regime combobox SHALL let the user filter options by description or code, same interaction as its use in `CustomerEditModal`; upon selection, the form SHALL build and persist `businessTaxRegime` as `"<code> — <description>"` (the full string, not just the code — unlike `Customer.taxRegime`, which stores only the code, because `businessTaxRegime` is printed verbatim on the ticket with no runtime catalog lookup). A previously-saved free-text value (e.g. a bare 3-digit code, or any string captured before this change) SHALL load into the field as free text and remain valid until the user re-selects from the combobox — the form SHALL NOT force re-selection or reject the existing value on load.

#### Scenario: Read-only view without settings:write
- **WHEN** a user has `settings:read` but not `settings:write`
- **THEN** the page shows the current configuration, including razón social and RFC, but all inputs/upload/delete controls are disabled

#### Scenario: Editable view with settings:write
- **WHEN** a user has `settings:write`
- **THEN** the page allows uploading/deleting the logo, editing razón social, RFC, business address/phone/tax regime, footer text, and changing the paper width, persisting changes via `settings-api`

#### Scenario: Header text field removed from the form
- **WHEN** any user (with or without `settings:write`) loads `/settings` (ticket tab)
- **THEN** no "Texto de encabezado" input/textarea is rendered anywhere in the form

#### Scenario: Tax regime combobox loads and filters
- **WHEN** a user with `settings:write` focuses the tax regime field and types "personas físicas"
- **THEN** the combobox fetches `GET /api/v1/admin/sat-codes/regimen-fiscal` and shows matching options by description

#### Scenario: Selecting a tax regime persists the full description
- **WHEN** the user selects the option `612 — Personas Físicas con Actividad Empresarial` and saves
- **THEN** the request sends `{ "businessTaxRegime": "612 — Personas Físicas con Actividad Empresarial" }` (the full string, not just `"612"`)

#### Scenario: Legacy free-text value loads without forcing re-selection
- **WHEN** the stored `businessTaxRegime` is `"612"` (captured before this change, code only)
- **THEN** the field loads showing `"612"`, the form remains valid, and saving other fields does not require the user to touch or re-select the tax regime

#### Scenario: No access without settings:read
- **WHEN** a user lacks `settings:read`
- **THEN** the page shows an access-denied state, consistent with other admin pages in the project

#### Scenario: Save reflects immediately
- **WHEN** an admin changes the footer text and saves
- **THEN** the page reflects the new value without requiring a manual page reload

### Requirement: Inventory notification settings form
El sistema SHALL renderizar en `/settings` una nueva sección "Notificaciones de inventario", respaldada por `settings-api` (`GET/PATCH /api/v1/admin/settings/inventory-notifications`). Visible para cualquier usuario con `settings:read`; editable (input habilitado, botón "Guardar cambios" disponible) sólo para usuarios con `settings:write` — de lo contrario, sólo lectura. Campo único: correo de notificación de caducidad (`expirationNotificationEmail`), con validación de formato email en el cliente antes de habilitar el guardado.

#### Scenario: Vista de solo lectura sin settings:write
- **WHEN** un usuario tiene `settings:read` pero no `settings:write`
- **THEN** la sección muestra el correo configurado (o vacío si no hay ninguno), con el input deshabilitado y sin botón de guardar

#### Scenario: Vista editable con settings:write
- **WHEN** un usuario tiene `settings:write`
- **THEN** la sección permite editar el correo y guardar el cambio vía `settings-api`, reflejando el nuevo valor sin recargar la página

#### Scenario: Formato de email inválido bloquea el guardado en cliente
- **WHEN** un usuario con `settings:write` escribe un valor sin formato de email válido
- **THEN** el botón "Guardar cambios" permanece deshabilitado y se muestra un mensaje de validación inline

#### Scenario: Sin acceso sin settings:read
- **WHEN** un usuario carece de `settings:read`
- **THEN** la página muestra un estado de acceso denegado, consistente con el resto de páginas admin del proyecto

