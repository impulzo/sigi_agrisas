# Spec: Products UI

## Purpose

Pantalla de gestión del catálogo de productos (`/catalogs/products`) con listado paginado, búsqueda server-side, filtro por departamento, toggle de inactivos, modal de creación/edición, y vista de detalle en `/catalogs/products/[id]` con tres tabs (General / Precios / Dosificaciones) para gestionar el agregado completo (precios y dosificaciones) sin modales anidados.

---

## Requirements

### Requirement: Products list screen with server-side search and department filter
The system SHALL provide a screen at `/catalogs/products` that lists products in a paginated table connected to `GET /api/v1/admin/products`. The screen SHALL require the `products:read` permission (gated via `useCurrentUser().can("products:read")`). The toolbar SHALL include: a search input that submits its value to the backend `?search=` query parameter (server-side search) with a 300 ms debounce and a caption "Búsqueda en servidor · 2+ caracteres"; a department `<select>` filter that adds `?departmentId=` to the request and whose options are loaded once via `useDepartmentsOptions()`; a `Switch` "Mostrar inactivos" that toggles `?includeInactive=true`; and a button "Nuevo producto" gated by `products:write`. The table SHALL show columns: `Código` (font-mono), `Nombre`, `Departamento` (the `departmentName`), `Unidad`, `IVA` (the `ivaRate` rendered as percentage `"16%"` or `"—"` when null), `IEPS` (same rule), `Sujeto a impuestos` (badge "Sí"/"No" basado en `isTaxable`), `Estado` (badge "Activo"/"Inactivo"), y `Acciones`. Pagination SHALL follow the same shape as the other catalogs (`page`, `pageSize`, total count, page selector; max 50 in UI). The actions column SHALL only render when the user has `products:write`, except for the "Gestionar" action which navigates to the detail and SHALL always render for `products:read` users.

#### Scenario: Authorized user loads the products list
- **WHEN** an authenticated user with `products:read` navigates to `/catalogs/products`
- **THEN** the screen renders the toolbar, table, and pagination, and a `GET /api/v1/admin/products?page=1&pageSize=20` request is dispatched

#### Scenario: Authorized user loads the products list with isTaxable column
- **WHEN** an authenticated user with `products:read` navigates to `/catalogs/products`
- **THEN** the table renders a column "Sujeto a impuestos" showing badge "Sí" for `isTaxable: true` and "No" for `isTaxable: false`

#### Scenario: Search shorter than 2 characters does not fetch
- **WHEN** the user types `"a"` in the search input
- **THEN** no `?search=` parameter is sent and a conditional hint "Mínimo 2 caracteres" appears below the input

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
The system SHALL provide a single modal component `ProductEditModal` that handles both creation and edition based on a `mode` prop (`"create" | "edit"`). The modal SHALL render the editable fields: `code`, `name`, `departmentId` (a `<select>` of active departments), `unit`, `satProductCode`, `ivaRate` (numeric input with `%` suffix), `iepsRate` (numeric input with `%` suffix), `isActive`, and `isTaxable` (toggle/checkbox labeled "Sujeto a impuestos", default unchecked = false). The `code` field SHALL be uppercase-forced as the user types and SHALL be disabled in `edit` mode. In `edit` mode `isTaxable` SHALL be pre-filled from the loaded entity. In both modes `isTaxable` SHALL submit as boolean. In `edit` mode the save button SHALL be disabled when the diff against the loaded entity is empty. In `create` mode the save button SHALL be enabled when required fields (`code`, `name`, `departmentId`, `unit`) are filled and pass client validation. Validation SHALL mirror the backend: `code` `^[A-Z0-9_]{1,32}$`, `satProductCode` `^\d{8}$` (when present), `ivaRate`/`iepsRate` numeric 0–100 (or empty → null). Validation errors SHALL be shown inline in Spanish. The `ivaRate`/`iepsRate` values SHALL be submitted as percentages (the backend normalizes values `> 1` to decimal); an empty tax field SHALL be submitted as `null`.

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

### Requirement: Product image upload field in General tab
The "General" tab of the product detail (`/catalogs/products/[id]`) and the `ProductEditModal` (in both `create` and `edit` modes) SHALL render an `ImageUploadField` molecule that allows the user to upload, replace, or remove the product image. The field is **optional**: products can be saved without an image. It is gated by `products:write` (rendered read-only otherwise).

Behavior:
- A drop zone with label "Arrastra o haz click para subir" accepts image files.
- A preview SHALL be shown immediately after selection (using `URL.createObjectURL`).
- Client-side validation: MIME must be `image/jpeg`, `image/png`, or `image/webp`. Size must be ≤ 2 MB. Violations show inline error in Spanish and prevent dispatch.
- A "Eliminar imagen" button appears when the product already has an `imageUrl`; on click, dispatches `DELETE /api/v1/admin/products/:id/image` (after `ConfirmDialog`).
- On selection of a valid file, dispatches `POST /api/v1/admin/products/:id/image` as multipart; on success, the field reflects the new URL and the parent component re-fetches the product so the new image propagates to thumbnails elsewhere.
- In `create` mode the upload SHALL be deferred until the product exists (the modal first creates the product, then if a file was staged, dispatches the upload).
- When `imageUrl === null`, the placeholder SHALL render `<span className="material-symbols-outlined">image_not_supported</span>` over the `surface-container` background.

#### Scenario: Field renders in General tab
- **WHEN** a user with `products:write` opens the General tab
- **THEN** the `ImageUploadField` is visible with either the current image preview or the placeholder

#### Scenario: Viewer sees read-only field
- **WHEN** a user without `products:write` opens the General tab
- **THEN** the field renders without upload/delete actions (preview only or placeholder)

#### Scenario: Invalid MIME rejected client-side
- **WHEN** the user selects a `.pdf` file
- **THEN** an inline error "Formato no permitido. Usa JPG, PNG o WebP." is shown and no request is dispatched

#### Scenario: File too large rejected client-side
- **WHEN** the user selects a file larger than 2 MB
- **THEN** an inline error "La imagen excede 2 MB." is shown and no request is dispatched

#### Scenario: Successful upload updates preview
- **WHEN** the user selects a valid 800 KB JPG and the backend responds 200
- **THEN** the preview updates to the new public URL and the parent component re-fetches the product

#### Scenario: Delete image with confirmation
- **WHEN** the user clicks "Eliminar imagen" and confirms the dialog
- **THEN** `DELETE /api/v1/admin/products/:id/image` is dispatched, the field reverts to the placeholder, and the product is re-fetched

#### Scenario: Create mode defers upload
- **WHEN** the user opens `ProductEditModal` in `create` mode, stages an image, and submits the form
- **THEN** the modal first creates the product (`POST /products`), then uploads the staged image (`POST /products/:newId/image`), then closes; if the upload fails, the modal shows a warning ("Producto creado pero la imagen no pudo subirse") and stays open

---

### Requirement: Product thumbnail in list and detail header
The product list (`ProductsTable` at `/catalogs/products`) SHALL render a thumbnail column showing each product's image (40x40 px, rounded, `object-cover`) using the `ProductImage` atom. The product detail header (`/catalogs/products/[id]`) SHALL render a larger thumbnail (96x96 px) next to the `code`/`name`. When `imageUrl === null`, the `ProductImage` atom SHALL render the Material Symbol `image_not_supported` centered on a `surface-container` background; it MUST NOT issue HTTP requests or break the layout.

#### Scenario: Thumbnail rendered in list
- **WHEN** the products list renders an item with `imageUrl !== null`
- **THEN** an `<img>` with `loading="lazy"`, `width="40"`, `height="40"`, `className="rounded object-cover"` and the `imageUrl` as `src` is rendered as the first column

#### Scenario: Placeholder rendered in list
- **WHEN** the products list renders an item with `imageUrl === null`
- **THEN** the placeholder Material Symbol `image_not_supported` is shown in a 40x40 `surface-container` square

#### Scenario: Detail header thumbnail
- **WHEN** the detail screen loads with `imageUrl !== null`
- **THEN** a 96x96 thumbnail is rendered next to the `code`/`name` header

#### Scenario: Detail header placeholder
- **WHEN** the detail screen loads with `imageUrl === null`
- **THEN** the 96x96 placeholder Material Symbol is shown

#### Scenario: ProductImage never blocks render
- **WHEN** the `imageUrl` returns 404 or fails to load
- **THEN** the atom catches the error via `onError` and swaps to the placeholder without breaking the page

---

### Requirement: Product image services (client)
The frontend SHALL expose two services in `app/(private)/catalogs/products/_logic/services/`: `uploadProductImage(productId, file, fetchImpl?)` and `deleteProductImage(productId, fetchImpl?)`. They SHALL wrap `authFetch`, normalize HTTP errors to typed module errors (`ProductImageTooLargeError`, `ProductImageInvalidFormatError`, `ProductNotFoundError`), and accept an injectable `fetchImpl` for tests.

#### Scenario: uploadProductImage sends multipart
- **WHEN** the service is invoked with a valid `File`
- **THEN** the request is a `POST` with `Content-Type: multipart/form-data` and a `file` field; on success returns `{ imageUrl: string }`

#### Scenario: 413 maps to ProductImageTooLargeError
- **WHEN** the backend returns 413
- **THEN** the service throws `ProductImageTooLargeError(maxBytes: 2097152)`

#### Scenario: 400 invalid format maps to typed error
- **WHEN** the backend returns 400 with `{"error": "Invalid image format"}`
- **THEN** the service throws `ProductImageInvalidFormatError()`

#### Scenario: deleteProductImage idempotent
- **WHEN** the service is invoked for a product that has no image
- **THEN** the request returns 204 and the service resolves successfully

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

---

### Requirement: Provider column in products table
`ProductsTable` SHALL include a "Proveedor" column displaying `providerName` or "—" if null. Column positioned after "Departamento".

#### Scenario: Products table shows provider name
- **WHEN** a product's department belongs to a provider
- **THEN** "Proveedor" column shows the provider name

#### Scenario: Products table shows dash for no provider
- **WHEN** `providerName` is null
- **THEN** "Proveedor" column shows "—"

---

### Requirement: Provider filter in products page
`ProductsPage` toolbar SHALL include a "Proveedor" Combobox filter. Selecting a provider populates the "Departamento" filter with departments belonging to that provider (fetched via `GET /departments?providerId=<uuid>&pageSize=100`). Changing the provider filter clears the departmentId filter. Clearing the provider filter restores all departments.

#### Scenario: Select provider filters departments combobox
- **WHEN** user selects a provider in the toolbar
- **THEN** the department combobox updates to show only that provider's departments; previous department filter is cleared

#### Scenario: Clear provider restores all departments
- **WHEN** user clears the provider combobox
- **THEN** department combobox reloads with all active departments

---

### Requirement: Provider field derived in product form
`ProductGeneralTab` (and `ProductEditModal`) SHALL show a read-only "Proveedor" field that auto-populates when a department is selected (derived from `department.providerName`). The field is display-only and is not sent in the POST/PATCH body.

#### Scenario: Department selected shows provider
- **WHEN** user selects a department with an associated provider
- **THEN** the "Proveedor" read-only field shows the provider's name

#### Scenario: Department with no provider shows empty
- **WHEN** selected department has `providerId: null`
- **THEN** "Proveedor" field shows "Sin proveedor"

---

### Requirement: Provider field in department form
`DepartmentEditModal` SHALL include a "Proveedor" Combobox (required for new departments). The combobox fetches active providers (using an existing `useProvidersOptions` hook or equivalent). On edit, shows the current provider and allows changing. Existing departments with `providerId: null` show "Sin proveedor" and prompt the user to assign one.

#### Scenario: Create department requires provider
- **WHEN** user submits create form without selecting a provider
- **THEN** inline validation error "El proveedor es obligatorio"

#### Scenario: Edit department shows current provider
- **WHEN** user opens edit modal for a department with a provider
- **THEN** combobox is pre-selected with the current provider

#### Scenario: Department table shows provider column
- **WHEN** user views the departments table
- **THEN** a "Proveedor" column shows `providerName` or "—"
