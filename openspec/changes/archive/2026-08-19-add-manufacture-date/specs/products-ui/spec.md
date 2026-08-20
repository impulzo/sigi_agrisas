## MODIFIED Requirements

### Requirement: Product create/edit modal
The system SHALL provide a single modal component `ProductEditModal` that handles both creation and edition based on a `mode` prop (`"create" | "edit"`). The modal SHALL render the editable fields: `code`, `name`, `departmentId` (a `<select>` of active departments), `unit`, `satProductCode`, `ivaRate` (numeric input with `%` suffix), `iepsRate` (numeric input with `%` suffix), `manufactureDate` (date input, optional, label "Fecha de elaboración"), `isActive`, and `isTaxable` (toggle/checkbox labeled "Sujeto a impuestos", default unchecked = false). The `code` field SHALL be uppercase-forced as the user types and SHALL be disabled in `edit` mode. In `edit` mode `isTaxable` and `manufactureDate` SHALL be pre-filled from the loaded entity. In both modes `isTaxable` SHALL submit as boolean. In `edit` mode the save button SHALL be disabled when the diff against the loaded entity is empty. In `create` mode the save button SHALL be enabled when required fields (`code`, `name`, `departmentId`, `unit`) are filled and pass client validation. Validation SHALL mirror the backend: `code` `^[A-Z0-9_]{1,32}$`, `satProductCode` `^\d{8}$` (when present), `ivaRate`/`iepsRate` numeric 0–100 (or empty → null), `manufactureDate` a valid date or empty. Validation errors SHALL be shown inline in Spanish. The `ivaRate`/`iepsRate` values SHALL be submitted as percentages (the backend normalizes values `> 1` to decimal); an empty tax field SHALL be submitted as `null`. An empty `manufactureDate` field SHALL be submitted as `null`.

#### Scenario: Create mode defaults isTaxable to false
- **WHEN** the modal opens in `mode="create"`
- **THEN** the "Sujeto a impuestos" toggle is unchecked by default

#### Scenario: Edit mode pre-fills isTaxable
- **WHEN** the modal opens in `mode="edit"` with `entity.isTaxable = true`
- **THEN** the "Sujeto a impuestos" toggle is checked

#### Scenario: Toggle submits boolean
- **WHEN** the user checks the "Sujeto a impuestos" toggle and saves
- **THEN** the request body includes `isTaxable: true`

#### Scenario: Create mode renders required fields editable
- **WHEN** the modal opens in `mode="create"`
- **THEN** `code` is enabled, the department `<select>` lists active departments, and `isActive` defaults to `true`

#### Scenario: Edit mode locks code
- **WHEN** the modal opens in `mode="edit"` with an `entity`
- **THEN** the `code` field is rendered disabled and pre-filled; the other fields are pre-filled and editable

#### Scenario: code is uppercase-forced
- **WHEN** the user types `"prod_001"` in `code`
- **THEN** the field renders `"PROD_001"` immediately

#### Scenario: Invalid satProductCode client-side
- **WHEN** the user types `"123"` in `satProductCode` and tries to submit
- **THEN** the modal shows an inline error "Código SAT inválido. Debe tener 8 dígitos." and does not dispatch the request

#### Scenario: Tax fields submitted as percentage
- **WHEN** the user enters `16` in the IVA field and submits
- **THEN** the request body sends `{ "ivaRate": 16 }` (the backend normalizes to `0.16`)

#### Scenario: Empty tax field submitted as null
- **WHEN** the user clears the IEPS field and submits
- **THEN** the request body sends `{ "iepsRate": null }`

#### Scenario: Empty diff in edit disables save
- **WHEN** the modal is in `edit` mode and no field has changed
- **THEN** the save button is disabled

#### Scenario: 409 on duplicate code shows inline error
- **WHEN** the user submits a `code` already in use and the backend returns 409
- **THEN** the modal stays open and an inline error "Este código ya está en uso." appears under the `code` field

#### Scenario: 400 on inactive/invalid department shows inline error
- **WHEN** the user submits with a `departmentId` that the backend rejects as not found or inactive (400)
- **THEN** the modal stays open and an inline error "El departamento no existe o está inactivo." appears under the department field

#### Scenario: Edit mode pre-fills manufactureDate
- **WHEN** the modal opens in `mode="edit"` with `entity.manufactureDate = "2026-01-15"`
- **THEN** the "Fecha de elaboración" input shows `2026-01-15`

#### Scenario: Empty manufactureDate submitted as null
- **WHEN** the user leaves "Fecha de elaboración" empty and submits (create or edit)
- **THEN** the request body sends `manufactureDate: null`

---

### Requirement: Product detail screen with tabs
The system SHALL provide a detail screen at `/catalogs/products/[id]` reachable from the list's "Gestionar" action, requiring `products:read`. The screen SHALL load the product via `GET /api/v1/admin/products/:id` and render its `code` and `name` as a header plus three tabs: "General", "Precios", "Dosificaciones". The "General" tab SHALL embed the same editable fields as `ProductEditModal` — including `manufactureDate` — with a "Guardar cambios" button (diff submit, disabled when no changes) gated by `products:write`. A 404 on load SHALL render a "Producto no encontrado" state with a link back to `/catalogs/products`.

#### Scenario: Detail loads and shows tabs
- **WHEN** a user with `products:read` opens `/catalogs/products/<id>` for an existing product
- **THEN** the header shows the product `code` and `name` and the three tabs (General, Precios, Dosificaciones) are rendered with "General" active by default

#### Scenario: 404 on missing product
- **WHEN** the product id does not exist and the backend returns 404
- **THEN** the screen renders "Producto no encontrado" with a link back to `/catalogs/products`

#### Scenario: General tab save is gated and diff-based
- **WHEN** a user with `products:write` edits a field in the General tab
- **THEN** the "Guardar cambios" button enables and on submit dispatches `PATCH /api/v1/admin/products/:id` with only the changed fields

#### Scenario: Viewer sees General tab read-only
- **WHEN** a user with only `products:read` opens the detail
- **THEN** the General tab fields are disabled and the "Guardar cambios" button is not rendered
