# drivers-ui Specification

## Purpose
TBD - created by archiving change vehicles-drivers-catalog-waybill-picker. Update Purpose after archive.
## Requirements
### Requirement: Drivers list screen
The system SHALL provide a screen at `/catalogs/drivers` that lists drivers (operadores) in a paginated table, following the same shell already used by the other catalog screens. The screen SHALL require the `drivers:read` permission, rendered optimistically while the check is `"loading"`. The toolbar SHALL include a search input (min 2 chars, 300 ms debounce, server-side via `?search=`), a `Switch` "Mostrar inactivos", and a button "Nuevo operador" that opens the create modal (gated by `drivers:write`). The table SHALL show columns: `Código`, `Nombre`, `RFC` (monospace, or `—` when `null`), `Licencia`, `Estado` (badge Activo/Inactivo), `Acciones`. The actions column SHALL only render when the user has `drivers:write`. Active rows SHALL show "Editar" and "Eliminar"; inactive rows SHALL show "Reactivar".

#### Scenario: Admin opens the drivers screen
- **WHEN** an authenticated user with `drivers:read` navigates to `/catalogs/drivers`
- **THEN** the screen renders the toolbar, table, and pagination, dispatching `GET /api/v1/admin/drivers?page=1&pageSize=20`

#### Scenario: Toggle inactive shows inactive drivers
- **WHEN** the user enables "Mostrar inactivos"
- **THEN** the next list request adds `?includeInactive=true` and rows with `isActive=false` appear

#### Scenario: Viewer cannot see write actions
- **WHEN** an authenticated user with only `drivers:read` opens the screen
- **THEN** the "Nuevo operador" button and the actions column are not rendered

#### Scenario: User without drivers:read sees no access
- **WHEN** a user without `drivers:read` navigates to `/catalogs/drivers`
- **THEN** the route guard prevents the table from rendering / dispatching the list request

---

### Requirement: Driver create/edit modal
The system SHALL provide a single modal component `DriverEditModal` handling both creation and edition via a `mode` prop (`"create" | "edit"`). The modal SHALL render the editable fields: `code`, `name`, `rfc`, `licenseNumber`, `notes`, `isActive`. The `code` field SHALL be uppercase-forced and disabled in `edit` mode; `rfc`, when non-empty, SHALL be uppercase-forced and SHALL NOT be marked required. Validation SHALL mirror the backend: `code` `^[A-Z0-9_]{1,32}$`, `rfc` `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` when non-empty, `name`/`licenseNumber` non-empty. In `edit` mode the save button SHALL be disabled when the diff against the loaded entity is empty. In `create` mode the save button SHALL be enabled when `code`, `name`, `licenseNumber` are filled and pass client validation.

#### Scenario: Create mode renders all fields editable
- **WHEN** the modal opens in `mode="create"`
- **THEN** all fields are editable, `code` is enabled, `isActive` defaults to `true`

#### Scenario: RFC is not marked required
- **WHEN** the modal opens in `mode="create"` or `mode="edit"`
- **THEN** the RFC field label does not show the required-field indicator (`*`)

#### Scenario: Edit mode locks code
- **WHEN** the modal opens in `mode="edit"` with an `entity`
- **THEN** the `code` field is rendered disabled and pre-filled; the other fields are pre-filled and editable

#### Scenario: Successful creation without RFC
- **WHEN** a user with `drivers:write` fills `code`, `name`, `licenseNumber` (no `rfc`) and clicks "Guardar"
- **THEN** the modal calls `POST /api/v1/admin/drivers`; on HTTP 201 it closes and the table refreshes

#### Scenario: 409 duplicate code shows inline error
- **WHEN** the create request returns HTTP 409 for a duplicate `code`
- **THEN** the modal stays open and shows an inline error under the `code` field

#### Scenario: Empty diff in edit disables save
- **WHEN** the modal is in `edit` mode and the user has not changed any field
- **THEN** the save button is disabled

---

### Requirement: Drivers hub card and navigation entry
The system SHALL add an "Operadores" card to `CatalogsHubPage`, gated by `drivers:read`, navigating to `/catalogs/drivers`. The system SHALL add a `drivers` child under the `catalogs` item in `NavigationRail`, gated by `drivers:read`.

#### Scenario: Hub card visible with permission
- **WHEN** a user with `drivers:read` opens `/catalogs`
- **THEN** the "Operadores" card is visible and navigates to `/catalogs/drivers`

#### Scenario: Hub card hidden without permission
- **WHEN** a user without `drivers:read` opens `/catalogs`
- **THEN** the "Operadores" card is not shown

