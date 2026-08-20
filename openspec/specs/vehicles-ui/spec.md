# vehicles-ui Specification

## Purpose
TBD - created by archiving change vehicles-drivers-catalog-waybill-picker. Update Purpose after archive.
## Requirements
### Requirement: Vehicles list screen
The system SHALL provide a screen at `/catalogs/vehicles` that lists vehicles in a paginated table, following the same shell (`CatalogShell`, `CatalogToolbar`, `CatalogPagination`, `CatalogStatusBadge`, `CatalogEmpty`, `CatalogError`) already used by the other catalog screens. The screen SHALL require the `vehicles:read` permission (gated via `useCurrentUser().can("vehicles:read")`), rendered optimistically while the check is `"loading"`. The toolbar SHALL include a search input (min 2 chars, 300 ms debounce, server-side via `?search=`), a `Switch` "Mostrar inactivos", and a button "Nuevo vehículo" that opens the create modal (gated by `vehicles:write`). The table SHALL show columns: `Código`, `Placa`, `Configuración`, `Permiso SCT`, `Aseguradora`, `Estado` (badge Activo/Inactivo), `Acciones`. The actions column SHALL only render when the user has `vehicles:write`. Active rows SHALL show "Editar" and "Eliminar"; inactive rows SHALL show "Reactivar".

#### Scenario: Admin opens the vehicles screen
- **WHEN** an authenticated user with `vehicles:read` navigates to `/catalogs/vehicles`
- **THEN** the screen renders the toolbar, table, and pagination, dispatching `GET /api/v1/admin/vehicles?page=1&pageSize=20`

#### Scenario: Toggle inactive shows inactive vehicles
- **WHEN** the user enables "Mostrar inactivos"
- **THEN** the next list request adds `?includeInactive=true` and rows with `isActive=false` appear

#### Scenario: Viewer cannot see write actions
- **WHEN** an authenticated user with only `vehicles:read` opens the screen
- **THEN** the "Nuevo vehículo" button and the actions column are not rendered

#### Scenario: User without vehicles:read sees no access
- **WHEN** a user without `vehicles:read` navigates to `/catalogs/vehicles`
- **THEN** the route guard prevents the table from rendering / dispatching the list request

---

### Requirement: Vehicle create/edit modal
The system SHALL provide a single modal component `VehicleEditModal` handling both creation and edition via a `mode` prop (`"create" | "edit"`). The modal SHALL render the editable fields: `code`, `plate`, `vehicleConfig`, `permitType`, `permitNumber`, `insuranceCompany`, `insurancePolicy`, `notes`, `isActive`. The `code` field SHALL be uppercase-forced as the user types and SHALL be disabled in `edit` mode. Validation SHALL mirror the backend: `code` `^[A-Z0-9_]{1,32}$`, remaining required fields non-empty. In `edit` mode the save button SHALL be disabled when the diff against the loaded entity is empty. In `create` mode the save button SHALL be enabled when the required fields are filled and pass client validation.

#### Scenario: Create mode renders all fields editable
- **WHEN** the modal opens in `mode="create"`
- **THEN** all fields are editable, `code` is enabled, `isActive` defaults to `true`

#### Scenario: Edit mode locks code
- **WHEN** the modal opens in `mode="edit"` with an `entity`
- **THEN** the `code` field is rendered disabled and pre-filled; the other fields are pre-filled and editable

#### Scenario: Successful creation
- **WHEN** a user with `vehicles:write` fills all required fields and clicks "Guardar"
- **THEN** the modal calls `POST /api/v1/admin/vehicles`; on HTTP 201 it closes and the table refreshes

#### Scenario: 409 duplicate code shows inline error
- **WHEN** the create request returns HTTP 409 for a duplicate `code`
- **THEN** the modal stays open and shows an inline error under the `code` field

#### Scenario: Empty diff in edit disables save
- **WHEN** the modal is in `edit` mode and the user has not changed any field
- **THEN** the save button is disabled

---

### Requirement: Vehicles hub card and navigation entry
The system SHALL add a "Vehículos" card to `CatalogsHubPage`, gated by `vehicles:read`, navigating to `/catalogs/vehicles`. The system SHALL add a `vehicles` child under the `catalogs` item in `NavigationRail`, gated by `vehicles:read`.

#### Scenario: Hub card visible with permission
- **WHEN** a user with `vehicles:read` opens `/catalogs`
- **THEN** the "Vehículos" card is visible and navigates to `/catalogs/vehicles`

#### Scenario: Hub card hidden without permission
- **WHEN** a user without `vehicles:read` opens `/catalogs`
- **THEN** the "Vehículos" card is not shown

