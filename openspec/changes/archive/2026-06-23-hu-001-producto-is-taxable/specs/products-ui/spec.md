## MODIFIED Requirements

### Requirement: Products list screen with server-side search and department filter
The system SHALL provide a screen at `/catalogs/products` that lists products in a paginated table connected to `GET /api/v1/admin/products`. The screen SHALL require the `products:read` permission. The toolbar includes search, department filter, "Mostrar inactivos" switch, and "Nuevo producto" button (gated by `products:write`). The table SHALL show columns: `Código`, `Nombre`, `Departamento`, `Unidad`, `IVA`, `IEPS`, `Sujeto a impuestos` (badge "Sí"/"No" basado en `isTaxable`), `Estado`, `Acciones`. Pagination follows the same shape as other catalogs.

#### Scenario: Authorized user loads the products list with isTaxable column
- **WHEN** an authenticated user with `products:read` navigates to `/catalogs/products`
- **THEN** the table renders a column "Sujeto a impuestos" showing badge "Sí" for `isTaxable: true` and "No" for `isTaxable: false`

#### Scenario: IVA and IEPS rendered as percentage
- **WHEN** a row has `ivaRate === 0.16` and `iepsRate === null`
- **THEN** the IVA cell renders `"16%"` and the IEPS cell renders `"—"`

#### Scenario: Viewer cannot see write actions
- **WHEN** an authenticated user with only `products:read` opens the screen
- **THEN** "Nuevo producto" and write actions are not rendered, but "Gestionar" action is

---

### Requirement: Product create/edit modal
The system SHALL provide `ProductEditModal` with `mode: "create" | "edit"`. The modal SHALL include a toggle/checkbox field `isTaxable` labeled "Sujeto a impuestos" (default unchecked = false). In `edit` mode, `isTaxable` SHALL be pre-filled from the loaded entity. In both modes the field SHALL submit as boolean. All other existing validations remain unchanged.

#### Scenario: Create mode defaults isTaxable to false
- **WHEN** the modal opens in `mode="create"`
- **THEN** the "Sujeto a impuestos" toggle is unchecked by default

#### Scenario: Edit mode pre-fills isTaxable
- **WHEN** the modal opens in `mode="edit"` with `entity.isTaxable = true`
- **THEN** the "Sujeto a impuestos" toggle is checked

#### Scenario: Toggle submits boolean
- **WHEN** the user checks the "Sujeto a impuestos" toggle and saves
- **THEN** the request body includes `isTaxable: true`

#### Scenario: Empty diff in edit disables save
- **WHEN** the modal is in `edit` mode and no field has changed
- **THEN** the save button is disabled
