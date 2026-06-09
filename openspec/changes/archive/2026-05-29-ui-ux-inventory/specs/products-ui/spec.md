## ADDED Requirements

### Requirement: Products list screen with server-side search and department filter
The system SHALL provide a screen at `/catalogs/products` that lists products in a paginated table connected to `GET /api/v1/admin/products`. The screen SHALL require the `products:read` permission (gated via `useCurrentUser().can("products:read")`). The toolbar SHALL include: a search input that submits its value to the backend `?search=` query parameter (server-side search) with a 300 ms debounce and a caption "Búsqueda en servidor · 2+ caracteres"; a department `<select>` filter that adds `?departmentId=` to the request and whose options are loaded once via `useDepartmentsOptions()`; a `Switch` "Mostrar inactivos" that toggles `?includeInactive=true`; and a button "Nuevo producto" gated by `products:write`. The table SHALL show columns: `Código` (font-mono), `Nombre`, `Departamento` (the `departmentName`), `Unidad`, `IVA` (the `ivaRate` rendered as percentage `"16%"` or `"—"` when null), `IEPS` (same rule), `Estado` (badge "Activo"/"Inactivo"), and `Acciones`. Pagination SHALL follow the same shape as the other catalogs (`page`, `pageSize`, total count, page selector; max 50 in UI). The actions column SHALL only render when the user has `products:write`, except for the "Gestionar" action which navigates to the detail and SHALL always render for `products:read` users.

#### Scenario: Authorized user loads the products list
- **WHEN** an authenticated user with `products:read` navigates to `/catalogs/products`
- **THEN** the screen renders the toolbar, table, and pagination, and a `GET /api/v1/admin/products?page=1&pageSize=20` request is dispatched

#### Scenario: Search shorter than 2 characters does not fetch
- **WHEN** the user types `"a"` in the search input
- **THEN** no `?search=` parameter is sent and an inline hint "Mínimo 2 caracteres" appears below the input

#### Scenario: Search with 2+ characters fetches debounced
- **WHEN** the user types `"glifo"` in the search input
- **THEN** after 300 ms a `GET /api/v1/admin/products?page=1&pageSize=20&search=glifo` request is dispatched, replacing any in-flight request

#### Scenario: Department filter narrows the list
- **WHEN** the user selects a department in the filter `<select>`
- **THEN** the next list request adds `?departmentId=<id>` and resets the page to 1

#### Scenario: Toggle inactive
- **WHEN** the user enables the "Mostrar inactivos" switch
- **THEN** the next list request adds `?includeInactive=true`

#### Scenario: IVA and IEPS rendered as percentage
- **WHEN** a row has `ivaRate === 0.16` and `iepsRate === null`
- **THEN** the IVA cell renders `"16%"` and the IEPS cell renders `"—"`

#### Scenario: Viewer cannot see write actions
- **WHEN** an authenticated user with only `products:read` opens the screen
- **THEN** the "Nuevo producto" button and the write actions (Editar/Eliminar) are not rendered, but the "Gestionar" action is still rendered

#### Scenario: User without products:read sees no access
- **WHEN** an authenticated user without `products:read` navigates to `/catalogs/products`
- **THEN** the screen renders an empty/forbidden state without dispatching the list request

#### Scenario: Empty result renders empty state
- **WHEN** the response has `total === 0`
- **THEN** the screen renders an `EmptyState` "No hay productos" instead of the table

---

### Requirement: Product create/edit modal
The system SHALL provide a single modal component `ProductEditModal` that handles both creation and edition based on a `mode` prop (`"create" | "edit"`). The modal SHALL render the editable fields: `code`, `name`, `departmentId` (a `<select>` of active departments), `unit`, `satProductCode`, `ivaRate` (numeric input with `%` suffix), `iepsRate` (numeric input with `%` suffix), and `isActive`. The `code` field SHALL be uppercase-forced as the user types and SHALL be disabled in `edit` mode. In `edit` mode the save button SHALL be disabled when the diff against the loaded entity is empty. In `create` mode the save button SHALL be enabled when required fields (`code`, `name`, `departmentId`, `unit`) are filled and pass client validation. Validation SHALL mirror the backend: `code` `^[A-Z0-9_]{1,32}$`, `satProductCode` `^\d{8}$` (when present), `ivaRate`/`iepsRate` numeric 0–100 (or empty → null). Validation errors SHALL be shown inline in Spanish. The `ivaRate`/`iepsRate` values SHALL be submitted as percentages (the backend normalizes values `> 1` to decimal); an empty tax field SHALL be submitted as `null`.

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

---

### Requirement: Product detail screen with tabs
The system SHALL provide a detail screen at `/catalogs/products/[id]` reachable from the list's "Gestionar" action, requiring `products:read`. The screen SHALL load the product via `GET /api/v1/admin/products/:id` and render its `code` and `name` as a header plus three tabs: "General", "Precios", "Dosificaciones". The "General" tab SHALL embed the same editable fields as `ProductEditModal` with a "Guardar cambios" button (diff submit, disabled when no changes) gated by `products:write`. A 404 on load SHALL render a "Producto no encontrado" state with a link back to `/catalogs/products`.

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

---

### Requirement: Product prices management in the Precios tab
The "Precios" tab SHALL list the product's prices via `GET /api/v1/admin/products/:id/prices` in a table with columns: `Nombre`, `Precio` (currency), `Cantidad mín.` (`minQuantity`), `Descuento` (`discountPct` as `"%"` or `"—"`), `Default` (a badge on the default row), and `Acciones`. A "Nuevo precio" button (gated by `products:write`) SHALL open a `ProductPriceModal` for creation; rows SHALL offer "Editar" and "Eliminar" (hard delete with `ConfirmDialog`). The modal SHALL validate `name` (required), `price >= 0`, `minQuantity >= 1`, `discountPct` 0–100 (or empty → null), and `isDefault` (boolean). After any mutation that changes the default price, the table SHALL re-fetch so the moved default badge is reflected. When the user lacks `products:write`, the table SHALL render read-only with a caption "Solo lectura — requiere products:write".

#### Scenario: Prices table lists prices with default badge
- **WHEN** the Precios tab opens for a product with prices
- **THEN** a `GET /api/v1/admin/products/:id/prices` request is dispatched and the row with `isDefault === true` shows a "Default" badge

#### Scenario: Create a price
- **WHEN** a user with `products:write` clicks "Nuevo precio", fills `name` and `price`, and submits
- **THEN** a `POST /api/v1/admin/products/:id/prices` request is dispatched and the table refreshes with the new row

#### Scenario: Duplicate price name shows inline error
- **WHEN** the user submits a price `name` already used by the product and the backend returns 409
- **THEN** the modal stays open and an inline error "Ya existe un precio con ese nombre." appears under the `name` field

#### Scenario: Second default price on create shows inline error
- **WHEN** the user submits a new price with `isDefault: true` while the product already has a default and the backend returns 409
- **THEN** the modal stays open and an inline error "El producto ya tiene un precio default." appears

#### Scenario: Setting a new default reflows the badge
- **WHEN** the user edits a non-default price to `isDefault: true` and the backend accepts it (the previous default is deactivated)
- **THEN** the table re-fetches and the "Default" badge moves to the edited row

#### Scenario: Delete a price with confirmation
- **WHEN** the user clicks "Eliminar" on a price row and confirms the dialog
- **THEN** a `DELETE /api/v1/admin/products/:id/prices/:priceId` request is dispatched and the row disappears

#### Scenario: Viewer sees prices read-only
- **WHEN** a user with only `products:read` opens the Precios tab
- **THEN** the "Nuevo precio" button and row actions are not rendered and a "Solo lectura — requiere products:write" caption is shown

---

### Requirement: Product dosifications management in the Dosificaciones tab
The "Dosificaciones" tab SHALL list the product's dosifications via `GET /api/v1/admin/products/:id/dosifications` in a table with columns: `Nombre`, `Partes` (`numParts`), `Precio unitario` (`computedUnitPrice` as currency, or the notice "Requiere precio default" when `requiresDefaultPrice === true`), `Estado` (badge), and `Acciones`. A "Nueva dosificación" button (gated by `products:write`) SHALL open a `ProductDosificationModal`; rows SHALL offer "Editar" and "Eliminar" (soft delete with `ConfirmDialog`) plus "Reactivar" for inactive rows. The modal SHALL validate `name` (required) and `numParts >= 2`. When the user lacks `products:write`, the table SHALL render read-only with a caption "Solo lectura — requiere products:write".

#### Scenario: Dosifications table shows computed unit price
- **WHEN** the Dosificaciones tab opens for a product that has a default price
- **THEN** each row shows its `computedUnitPrice` formatted as currency

#### Scenario: Dosification without default price shows notice
- **WHEN** a dosification has `requiresDefaultPrice === true` and `computedUnitPrice === null`
- **THEN** the "Precio unitario" cell renders the notice "Requiere precio default" instead of a number

#### Scenario: Create a dosification
- **WHEN** a user with `products:write` clicks "Nueva dosificación", enters `name` and `numParts = 4`, and submits
- **THEN** a `POST /api/v1/admin/products/:id/dosifications` request is dispatched and the table refreshes

#### Scenario: numParts below 2 is rejected client-side
- **WHEN** the user enters `numParts = 1` and tries to submit
- **THEN** the modal shows an inline error "El número de partes debe ser al menos 2." and does not dispatch the request

#### Scenario: Duplicate dosification name shows inline error
- **WHEN** the user submits a dosification `name` already used by the product and the backend returns 409
- **THEN** the modal stays open and an inline error "Ya existe una dosificación con ese nombre." appears under the `name` field

#### Scenario: Soft delete and reactivate
- **WHEN** the user clicks "Eliminar" on an active dosification and confirms, then later clicks "Reactivar" on the inactive row
- **THEN** a `DELETE .../dosifications/:id` is dispatched first (badge → "Inactivo"), and a `PATCH .../dosifications/:id` with `{ "isActive": true }` is dispatched on reactivate (badge → "Activo")

---

### Requirement: Typed service errors and frontend error mapping for products
The system SHALL expose service functions in `app/(private)/catalogs/products/_logic/services/` (`listProducts`, `getProduct`, `createProduct`, `updateProduct`, `softDeleteProduct`, `listPrices`, `createPrice`, `updatePrice`, `deletePrice`, `listDosifications`, `createDosification`, `updateDosification`, `softDeleteDosification`) that map HTTP responses to typed errors in `_logic/errors.ts`: `ProductNotFoundError` (404), `ProductCodeAlreadyInUseError` (409 with "code already in use"), `ProductDepartmentInvalidError` (400 with "Department not found or inactive"), `DuplicatePriceNameError` (409 with "price named"), `DuplicateDefaultPriceError` (409 with "already has a default price"), `DuplicateDosificationNameError` (409 with "dosification named"). Services SHALL accept an optional `fetchImpl` parameter and SHALL convert `createdAt`/`updatedAt` strings into `Date` instances before returning.

#### Scenario: 404 mapped on getProduct
- **WHEN** `getProduct({ id: "missing" })` is invoked and the backend returns 404
- **THEN** the call rejects with `ProductNotFoundError`

#### Scenario: 409 code mapped on createProduct
- **WHEN** `createProduct({ body })` is invoked with a duplicate `code` and the backend returns 409
- **THEN** the call rejects with `ProductCodeAlreadyInUseError`

#### Scenario: 400 invalid department mapped on createProduct
- **WHEN** `createProduct({ body })` is invoked with an inactive/missing department and the backend returns 400 "Department not found or inactive"
- **THEN** the call rejects with `ProductDepartmentInvalidError`

#### Scenario: 409 default price mapped on createPrice
- **WHEN** `createPrice(...)` is invoked with a second default and the backend returns 409 "Product already has a default price"
- **THEN** the call rejects with `DuplicateDefaultPriceError`

#### Scenario: Dates parsed in list response
- **WHEN** `listProducts(...)` receives a response with ISO date strings
- **THEN** each item's `createdAt` and `updatedAt` are instances of `Date`

#### Scenario: fetchImpl injection for tests
- **WHEN** a service is invoked with a `fetchImpl` mock
- **THEN** the service uses that mock instead of the global `authFetch`

---

### Requirement: useProducts hook with cancellation and useDepartmentsOptions
The system SHALL expose a hook `useProducts({ page, pageSize, search, departmentId, includeInactive })` that fetches the products list whenever any parameter changes, cancelling any in-flight request via `AbortController` on param change and on unmount, returning `{ items: Product[], total: number, isLoading: boolean, error: string | null, refresh: () => void }`. The `search` SHALL arrive already-debounced from the caller. The system SHALL also expose `useDepartmentsOptions()` returning `{ options: { id: string; name: string }[], isLoading: boolean }`, loading active departments once and caching the result at module level.

#### Scenario: Initial load
- **WHEN** `useProducts` mounts with default params
- **THEN** a fetch is dispatched and `isLoading` is `true` until it resolves

#### Scenario: Param change cancels previous request
- **WHEN** the `departmentId` changes while a previous request is still in flight
- **THEN** the previous request is aborted and a new request is dispatched

#### Scenario: Unmount cancels in-flight
- **WHEN** the component unmounts while a request is in flight
- **THEN** the request is aborted

#### Scenario: Department options cached at module level
- **WHEN** `useDepartmentsOptions()` is used by two components within the cache TTL
- **THEN** only one `GET /api/v1/admin/departments` request is dispatched and both receive the cached options
