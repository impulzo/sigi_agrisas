## Purpose

Pantalla `/settings` para administrar la configuración global del negocio — por ahora, únicamente la plantilla del ticket de venta (logo, encabezado, pie, ancho de papel). Reemplaza el placeholder actual de la ruta.

## ADDED Requirements

### Requirement: Ticket settings form
The system SHALL render a form at `/settings` for viewing and editing the global ticket template, backed by `settings-api`. Visible to any user with `settings:read`; editable (inputs enabled, save/upload/delete actions available) only to users with `settings:write` — read-only display otherwise. Fields: logo (upload/preview/delete via the existing `ImageUploadField` component), header text, footer text, paper width selector (`58mm`/`80mm`).

#### Scenario: Read-only view without settings:write
- **WHEN** a user has `settings:read` but not `settings:write`
- **THEN** the page shows the current configuration but all inputs/upload/delete controls are disabled

#### Scenario: Editable view with settings:write
- **WHEN** a user has `settings:write`
- **THEN** the page allows uploading/deleting the logo, editing header/footer text, and changing the paper width, persisting changes via `settings-api`

#### Scenario: No access without settings:read
- **WHEN** a user lacks `settings:read`
- **THEN** the page shows an access-denied state, consistent with other admin pages in the project

#### Scenario: Save reflects immediately
- **WHEN** an admin changes the footer text and saves
- **THEN** the page reflects the new value without requiring a manual page reload
