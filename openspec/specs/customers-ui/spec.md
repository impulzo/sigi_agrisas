# Spec: customers-ui

## Purpose

Pantalla de gestión de clientes bajo `/catalogs/customers` con datos fiscales mexicanos (RFC, régimen, CFDI) y datos de crédito (límite y plazo en días), búsqueda server-side debounced, modal con secciones agrupadas, soft delete con confirmación y reactivación directa. Conectada al CRUD existente en `/api/v1/admin/customers`.

---

## Requirements

### Requirement: Customers list screen with server-side search
The system SHALL provide a screen at `/catalogs/customers` that lists customers in a paginated table. The screen SHALL require the `customers:read` permission (gated via `useCurrentUser().can("customers:read")`), rendered optimistically while the check is `"loading"`. The toolbar SHALL include: a search input that submits its value to the backend `?search=` query parameter (server-side search, minimum 2 characters) with a 300 ms debounce and a caption "Búsqueda en servidor · 2+ caracteres" below the input; a `Switch` "Mostrar inactivos" that toggles the `?includeInactive=true` query parameter; and a button "Nuevo cliente" that opens the create modal (gated by `customers:write`). The table SHALL show columns: `Código`, `Nombre` (with `legalName` as a smaller subtitle when present), `RFC` (monospace), `Límite de crédito` (formatted currency or `—` when `null`), `Saldo actual` (`currentBalance`, formatted currency), `Plazo (días)` (`creditDays`), `Estado` (badge Activo/Inactivo), `Acciones`. The actions column SHALL only render when the user has `customers:write`. Active rows SHALL show "Editar" and "Eliminar"; inactive rows SHALL show "Reactivar".

#### Scenario: Admin opens the customers screen
- **WHEN** an authenticated user with `customers:read` navigates to `/catalogs/customers`
- **THEN** the screen renders the toolbar, table, and pagination, and dispatches `GET /api/v1/admin/customers?page=1&pageSize=20`

#### Scenario: Search shorter than 2 characters does not fetch
- **WHEN** the user types `"a"` in the search input
- **THEN** no `?search=` parameter is sent

#### Scenario: Search with 2+ characters fetches debounced
- **WHEN** the user types `"acme"` in the search input
- **THEN** after 300 ms a `GET /api/v1/admin/customers?page=1&pageSize=20&search=acme` request is dispatched, replacing any in-flight request

#### Scenario: Toggle inactive shows inactive customers
- **WHEN** the user enables the "Mostrar inactivos" switch
- **THEN** the next list request adds `?includeInactive=true` and rows with `isActive=false` appear

#### Scenario: pageSize respects backend maximum
- **WHEN** the pageSize selector offers options up to the UI maximum
- **THEN** no option exceeds the backend's `pageSize` maximum of 100

#### Scenario: Empty results render empty state
- **WHEN** a search or filter combination returns zero customers
- **THEN** the screen renders `CatalogEmpty` instead of an empty table

#### Scenario: Fetch failure renders error state
- **WHEN** the list request fails (network error or 5xx)
- **THEN** the screen renders `CatalogError` with a retry action

#### Scenario: Viewer cannot see write actions
- **WHEN** an authenticated user with only `customers:read` opens the screen
- **THEN** the "Nuevo cliente" button and the actions column are not rendered

#### Scenario: User without customers:read sees no access
- **WHEN** a user without `customers:read` navigates to `/catalogs/customers`
- **THEN** the route guard prevents the table from rendering / dispatching the list request (page treats it as unauthorized, optimistic while `can()` resolves)

---

### Requirement: Customer create/edit modal with grouped sections including credit fields
The system SHALL provide a single modal component `CustomerEditModal` handling both creation and edition via a `mode` prop (`"create" | "edit"`). Fields SHALL be grouped into three labelled sections: "Datos básicos" (`code`, `name`, `rfc`), "Datos fiscales" (`legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, collapsible/optional), "Contacto y crédito" (`email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`, `creditDays`). The fields `code` and `rfc` SHALL be uppercase-forced as the user types. The field `code` SHALL be disabled in `edit` mode. Client-side validation SHALL mirror the backend: `code` `^[A-Z0-9_]{1,32}$`, `rfc` `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$`, `taxRegime` `^\d{3}$`, `cfdiUse` `^[A-Z]\d{2}$`, `taxZipCode` `^\d{5}$`, `creditLimit` a non-negative number or empty (maps to `null`), `creditDays` a non-negative integer (left empty on create lets the backend apply its default of 30; left empty on edit is not sent as part of the diff unless explicitly cleared). In `create` mode the save button SHALL be enabled once `code`, `name`, `rfc` are filled and valid. In `edit` mode the save button SHALL be disabled while the diff against the loaded entity is empty.

#### Scenario: Create mode renders all fields editable
- **WHEN** the modal opens in `mode="create"`
- **THEN** all fields across the three sections are editable and `code` is enabled

#### Scenario: Edit mode locks code
- **WHEN** the modal opens in `mode="edit"` with an existing customer
- **THEN** the `code` field renders disabled and pre-filled; the remaining fields are pre-filled and editable

#### Scenario: Successful creation
- **WHEN** a user with `customers:write` fills `code`, `name`, `rfc` (required) and clicks "Guardar"
- **THEN** the modal calls `POST /api/v1/admin/customers`; on HTTP 201 it closes and the table refreshes

#### Scenario: Creation omitting creditDays lets backend apply default
- **WHEN** the user submits a new customer without touching the `creditDays` field
- **THEN** the request body does not force a `creditDays` value, and the created customer shows `creditDays: 30` (backend default) in the refreshed table

#### Scenario: Invalid RFC client-side
- **WHEN** the user types an RFC that does not match the expected pattern and tries to submit
- **THEN** the modal shows an inline error under the RFC field and does not dispatch the request

#### Scenario: 409 duplicate code shows inline error
- **WHEN** the create request returns HTTP 409 for a duplicate `code`
- **THEN** the modal stays open and shows an inline error under the `code` field

#### Scenario: 409 duplicate RFC shows inline error
- **WHEN** the create or update request returns HTTP 409 for a duplicate `rfc`
- **THEN** the modal stays open and shows an inline error under the `rfc` field

#### Scenario: Empty diff in edit disables save
- **WHEN** the modal is in `edit` mode and the user has not changed any field
- **THEN** the save button is disabled

#### Scenario: Diff-only submit on edit
- **WHEN** the user changes only `creditDays` from 30 to 60 in edit mode
- **THEN** the modal calls `PATCH /api/v1/admin/customers/:id` with body `{ "creditDays": 60 }` exclusively

#### Scenario: Optional field cleared via null
- **WHEN** the user clears the `creditLimit` field in edit mode and submits
- **THEN** the request sends `{ "creditLimit": null }`

---

### Requirement: Soft delete and reactivate customers from row actions
The system SHALL allow soft-deleting active customers from the row's "Eliminar" action, showing a `ConfirmDialog` before calling `DELETE /api/v1/admin/customers/:id`. The system SHALL allow reactivating inactive customers from the row's "Reactivar" action without confirmation, calling `PATCH /api/v1/admin/customers/:id` with `{ "isActive": true }`. Both actions SHALL require `customers:write`. Deactivating a customer that has historical sales SHALL NOT be blocked by the UI (the backend already preserves FK references on soft delete).

#### Scenario: Admin soft-deletes a customer with confirmation
- **WHEN** the user clicks "Eliminar" on an active row and confirms the dialog
- **THEN** a `DELETE /api/v1/admin/customers/:id` request is dispatched; on success the row disappears from the default (active-only) view

#### Scenario: Admin cancels delete confirmation
- **WHEN** the user clicks "Eliminar" and cancels the dialog
- **THEN** no request is dispatched and the row remains unchanged

#### Scenario: Admin reactivates an inactive customer
- **WHEN** the user toggles "Mostrar inactivos", finds an inactive customer, and clicks "Reactivar"
- **THEN** a `PATCH /api/v1/admin/customers/:id` with `{ "isActive": true }` is dispatched without confirmation

#### Scenario: Deactivating a customer with sales history is allowed
- **WHEN** a customer that has completed sales is soft-deleted
- **THEN** the UI does not block the action and the deactivation succeeds (existing sales keep referencing the same customer row)

#### Scenario: Viewer cannot reach soft delete or reactivate
- **WHEN** a user with only `customers:read` is on the screen
- **THEN** neither "Eliminar" nor "Reactivar" is rendered on any row

---

### Requirement: Typed service errors and dedicated frontend logic module
The system SHALL expose service functions in `app/(private)/catalogs/customers/_logic/services/` (`listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `softDeleteCustomer`) that map HTTP responses to typed errors in `_logic/errors.ts`: `CustomerNotFoundError` (404), `CustomerCodeAlreadyInUseError` (409, code conflict), `CustomerRfcAlreadyInUseError` (409, RFC conflict). Services SHALL accept an optional `fetchImpl` for tests and SHALL re-throw `UnauthenticatedError`/`ForbiddenError`/`NetworkError` from `app/_lib/authFetch.ts` without wrapping. This `_logic/` module SHALL be self-contained under `app/(private)/catalogs/customers/` and SHALL NOT import from `app/(private)/pos/_logic/` or vice versa — the POS module keeps its own independent customer types/services for the quick-add flow.

#### Scenario: 404 mapped on get
- **WHEN** `getCustomer({ id })` receives HTTP 404
- **THEN** it rejects with `CustomerNotFoundError`

#### Scenario: 409 code mapped on create
- **WHEN** `createCustomer({ body })` receives HTTP 409 for a duplicate `code`
- **THEN** it rejects with `CustomerCodeAlreadyInUseError`

#### Scenario: 409 rfc mapped on create or update
- **WHEN** `createCustomer` or `updateCustomer` receives HTTP 409 for a duplicate `rfc`
- **THEN** it rejects with `CustomerRfcAlreadyInUseError`

#### Scenario: fetchImpl injection for tests
- **WHEN** a service is invoked with a `fetchImpl` mock
- **THEN** the service uses that mock instead of the global `authFetch`

#### Scenario: No cross-imports with the POS customer logic
- **WHEN** the codebase is inspected for imports between `app/(private)/catalogs/customers/_logic/` and `app/(private)/pos/_logic/`
- **THEN** neither module imports from the other

---

### Requirement: useCustomers and useCustomerMutations hooks
The system SHALL expose a hook `useCustomers({ page, pageSize, search, includeInactive })` that fetches the customers list on parameter change, cancelling any in-flight request via `AbortController` when parameters change again or the component unmounts, returning `{ items, total, isLoading, error, refresh }`. The system SHALL expose a hook `useCustomerMutations()` returning `{ isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne }`, where `updateOne(id, body)` is a no-op returning `null` when `body` is empty, `reactivateOne(id)` wraps `updateCustomer(id, { isActive: true })`, and typed conflict errors are re-thrown (not swallowed) so `CustomerEditModal` can render them inline.

#### Scenario: Initial load dispatches a request
- **WHEN** `useCustomers` mounts with default params
- **THEN** a fetch is dispatched and `isLoading` is `true` until it resolves

#### Scenario: Param change cancels the previous request
- **WHEN** `page` changes while a previous request is in flight
- **THEN** the previous request is aborted and a new one is dispatched

#### Scenario: updateOne with empty body is a no-op
- **WHEN** `updateOne(id, {})` is invoked
- **THEN** no HTTP request is dispatched and the method returns `null`

#### Scenario: reactivateOne sends only isActive
- **WHEN** `reactivateOne(id)` is invoked
- **THEN** a `PATCH /api/v1/admin/customers/:id` request with body `{ "isActive": true }` is dispatched

#### Scenario: createOne re-throws conflict errors for the modal
- **WHEN** `createOne(body)` receives a 409 duplicate `code` or `rfc`
- **THEN** the corresponding typed error is re-thrown (not captured only in `mutationError`), so the modal can attach it to the specific field
