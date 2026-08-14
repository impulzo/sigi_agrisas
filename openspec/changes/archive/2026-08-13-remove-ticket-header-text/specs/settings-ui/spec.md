## MODIFIED Requirements

### Requirement: Ticket settings form
The system SHALL render a form at `/settings` for viewing and editing the global ticket template, backed by `settings-api`. Visible to any user with `settings:read`; editable (inputs enabled, save/upload/delete actions available) only to users with `settings:write` — read-only display otherwise. Fields: logo (upload/preview/delete via the existing `ImageUploadField` component), razón social (`businessName`), RFC del emisor (`businessRfc`), business address, business phone, business tax regime, footer text, paper width selector (`58mm`/`80mm`). The form no longer includes a "header text" field — it was removed as redundant with razón social/RFC.

#### Scenario: Read-only view without settings:write
- **WHEN** a user has `settings:read` but not `settings:write`
- **THEN** the page shows the current configuration, including razón social and RFC, but all inputs/upload/delete controls are disabled

#### Scenario: Editable view with settings:write
- **WHEN** a user has `settings:write`
- **THEN** the page allows uploading/deleting the logo, editing razón social, RFC, business address/phone/tax regime, footer text, and changing the paper width, persisting changes via `settings-api`

#### Scenario: Header text field removed from the form
- **WHEN** any user (with or without `settings:write`) loads `/settings` (ticket tab)
- **THEN** no "Texto de encabezado" input/textarea is rendered anywhere in the form

#### Scenario: No access without settings:read
- **WHEN** a user lacks `settings:read`
- **THEN** the page shows an access-denied state, consistent with other admin pages in the project

#### Scenario: Save reflects immediately
- **WHEN** an admin changes the footer text and saves
- **THEN** the page reflects the new value without requiring a manual page reload
