## ADDED Requirements

### Requirement: Providers list screen with server-side search
The system SHALL provide a screen at `/catalogs/providers` that lists providers in a paginated table. The screen SHALL require the `providers:read` permission (gated via `useCurrentUser().can("providers:read")`). The toolbar SHALL include: a search input that submits its value to the backend `?search=` query parameter (server-side search) with a 300 ms debounce; a `Switch` "Mostrar inactivos" that toggles the `?includeInactive=true` query parameter; and a button "Nuevo proveedor" that opens the create modal (gated by `providers:write`). The toolbar SHALL render a small caption "Búsqueda en servidor · 2+ caracteres" below the search input to differentiate it from the client-side search of the other 4 catalogs. The table SHALL show columns: `Código`, `Nombre` (with `legalName` rendered as a smaller subtitle below the name when present), `RFC` (rendered in monospace font), `Régimen` (the `taxRegime` value or `—` when null), `Contacto` (first non-null of `email`/`phone`/`contactName` or `—`), `Estado` (badge "Activo"/"Inactivo"), and `Acciones`. Pagination SHALL follow the same shape as the other 4 catalogs (`page`, `pageSize`, total count, page selector). The actions column SHALL only render when the user has `providers:write`. Rows of inactive providers SHALL show a "Reactivar" action; rows of active providers SHALL show "Editar" and "Eliminar" actions.

#### Scenario: Admin opens the providers screen
- **WHEN** an authenticated user with `providers:read` navigates to `/catalogs/providers`
- **THEN** the screen renders the toolbar, table, and pagination, and a `GET /api/v1/admin/providers?page=1&pageSize=20` request is dispatched

#### Scenario: Search shorter than 2 characters does not fetch
- **WHEN** the user types `"a"` in the search input
- **THEN** no request is dispatched and an inline hint "Mínimo 2 caracteres" appears below the input

#### Scenario: Search with 2+ characters fetches debounced
- **WHEN** the user types `"acme"` in the search input
- **THEN** after 300 ms a `GET /api/v1/admin/providers?page=1&pageSize=20&search=acme` request is dispatched, replacing any in-flight request

#### Scenario: Toggle inactive
- **WHEN** the user enables the "Mostrar inactivos" switch
- **THEN** the next list request adds `?includeInactive=true`

#### Scenario: Viewer cannot see write actions
- **WHEN** an authenticated user with only `providers:read` opens the screen
- **THEN** the "Nuevo proveedor" button and the action column are not rendered

#### Scenario: User without providers:read sees no access
- **WHEN** an authenticated user without `providers:read` navigates to `/catalogs/providers`
- **THEN** the screen renders an empty/forbidden state without dispatching the list request

#### Scenario: Search request shows legalName subtitle in results
- **WHEN** the response includes a provider with `legalName !== null`
- **THEN** the row renders `name` as the primary text and `legalName` as a smaller subtitle below it

---

### Requirement: Provider create/edit modal with grouped sections
The system SHALL provide a single modal component `ProviderEditModal` that handles both creation and edition based on a `mode` prop (`"create" | "edit"`). The modal SHALL render its 12 editable fields grouped into three labelled sections: "Datos básicos" (`code`, `name`, `isActive`), "Datos fiscales" (`rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`), "Contacto" (`email`, `phone`, `address`, `contactName`, `notes`). The fields `code` and `rfc` SHALL be uppercase-forced as the user types (via `onChange`). The field `code` SHALL be disabled in `edit` mode (the backend ignores it silently, but the UI prevents confusion). The field `rfc` SHALL be editable in both modes. In `edit` mode, the save button SHALL be disabled when the diff against the loaded entity is empty. In `create` mode, the save button SHALL be enabled when all required fields (`code`, `name`, `rfc`) are filled and pass client validation. Validation SHALL mirror the backend regexes: `code` `^[A-Z0-9_]{1,32}$`, `rfc` `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$`, `taxRegime` `^\d{3}$`, `cfdiUse` `^[A-Z]\d{2}$`, `taxZipCode` `^\d{5}$`. Validation errors SHALL be shown inline below each field in Spanish.

#### Scenario: Create mode renders all fields editable
- **WHEN** the modal opens in `mode="create"`
- **THEN** all 12 fields are editable, `code` is enabled, `isActive` defaults to `true`

#### Scenario: Edit mode locks code
- **WHEN** the modal opens in `mode="edit"` with an `entity`
- **THEN** the `code` field is rendered disabled and pre-filled with `entity.code`; the other 11 fields are pre-filled and editable

#### Scenario: Invalid RFC client-side
- **WHEN** the user types `"ABC123"` in the RFC field and tries to submit
- **THEN** the modal shows an inline error under the RFC field "RFC inválido. Formato esperado: 3-4 letras + 6 dígitos + 3 alfanuméricos." and does not dispatch the request

#### Scenario: code and rfc are uppercase-forced
- **WHEN** the user types `"prov_001"` in `code` or `"sac120101a12"` in `rfc`
- **THEN** the field renders `"PROV_001"` and `"SAC120101A12"` immediately

#### Scenario: Empty diff in edit disables save
- **WHEN** the modal is in `edit` mode and the user has not changed any field
- **THEN** the save button is disabled

#### Scenario: 409 on duplicate code shows inline error
- **WHEN** the user submits a `code` already in use and the backend returns 409
- **THEN** the modal stays open and an inline error "Este código ya está en uso." appears under the `code` field

#### Scenario: 409 on duplicate RFC shows inline error
- **WHEN** the user submits an `rfc` already in use and the backend returns 409
- **THEN** the modal stays open and an inline error "Este RFC ya está en uso por otro proveedor." appears under the `rfc` field (in both create and edit modes)

#### Scenario: Optional fields cleared via null
- **WHEN** the user clears the `legalName` field in `edit` and submits
- **THEN** the request sends `{ "legalName": null }` and the response shows `legalName === null`

---

### Requirement: Soft delete and reactivate from row actions
The system SHALL allow soft-deleting active providers from the row's "Eliminar" action with a `ConfirmDialog` ("¿Desactivar este proveedor?"). On confirmation it SHALL call `DELETE /api/v1/admin/providers/:id` and refresh the list. The system SHALL allow reactivating inactive providers from the row's "Reactivar" action without confirmation, calling `PATCH /api/v1/admin/providers/:id` with `{ "isActive": true }`. Both actions SHALL require `providers:write`.

#### Scenario: Admin soft-deletes a provider with confirmation
- **WHEN** the user clicks "Eliminar" on an active row and confirms in the dialog
- **THEN** a `DELETE /api/v1/admin/providers/:id` request is dispatched and the list is refreshed; the row disappears (since `includeInactive` defaults to `false`)

#### Scenario: Admin cancels delete confirmation
- **WHEN** the user clicks "Eliminar" on an active row and cancels the dialog
- **THEN** no request is dispatched

#### Scenario: Admin reactivates an inactive provider
- **WHEN** the user toggles "Mostrar inactivos", finds an inactive provider, and clicks "Reactivar"
- **THEN** a `PATCH /api/v1/admin/providers/:id` with body `{ "isActive": true }` is dispatched without confirmation and the row's badge changes to "Activo"

#### Scenario: Viewer cannot reach soft delete or reactivate
- **WHEN** a user with only `providers:read` is on the screen
- **THEN** neither the "Eliminar" nor the "Reactivar" action are rendered

---

### Requirement: Typed service errors and frontend error mapping
The system SHALL expose service functions in `app/(private)/catalogs/providers/_logic/services/` (`listProviders`, `getProvider`, `createProvider`, `updateProvider`, `softDeleteProvider`) that map HTTP responses to typed errors defined in `_logic/errors.ts`: `ProviderNotFoundError` (404), `ProviderCodeAlreadyInUseError` (409 with `"code already in use"` in the message body), `ProviderRfcAlreadyInUseError` (409 with `"RFC already in use"` in the message body). The services SHALL accept an optional `fetchImpl` parameter to allow tests to inject a fake fetch. The services SHALL convert `createdAt` and `updatedAt` strings into JavaScript `Date` instances before returning.

#### Scenario: 404 mapped on get
- **WHEN** `getProvider({ id: "missing" })` is invoked and the backend returns 404
- **THEN** the call rejects with `ProviderNotFoundError`

#### Scenario: 409 code mapped on create
- **WHEN** `createProvider({ body })` is invoked with a duplicate `code` and the backend returns 409 `{"error":"Provider code already in use"}`
- **THEN** the call rejects with `ProviderCodeAlreadyInUseError`

#### Scenario: 409 rfc mapped on create
- **WHEN** `createProvider({ body })` is invoked with a duplicate `rfc` and the backend returns 409 `{"error":"Provider RFC already in use"}`
- **THEN** the call rejects with `ProviderRfcAlreadyInUseError`

#### Scenario: Dates parsed in list response
- **WHEN** `listProviders(...)` receives a response with ISO date strings
- **THEN** each item's `createdAt` and `updatedAt` are instances of `Date`

#### Scenario: fetchImpl injection for tests
- **WHEN** a service is invoked with a `fetchImpl` mock
- **THEN** the service uses that mock instead of the global `authFetch`

---

### Requirement: useProviders hook with cancellation
The system SHALL expose a hook `useProviders({ page, pageSize, search, includeInactive })` that fetches the providers list whenever any parameter changes. The hook SHALL cancel any in-flight request when parameters change again before the previous response arrives, using `AbortController`. The hook SHALL also cancel the in-flight request when the component unmounts. The hook SHALL return `{ items: Provider[], total: number, isLoading: boolean, error: Error | null, refresh: () => void }`. The `search` parameter SHALL be passed as already-debounced from the caller (the page orchestrator implements the 300 ms debounce); `useProviders` does not implement debouncing itself.

#### Scenario: Initial load
- **WHEN** the hook mounts with default params
- **THEN** a fetch is dispatched and `isLoading` is `true` until it resolves

#### Scenario: Param change cancels previous request
- **WHEN** the page changes from `1` to `2` while the previous request is still in flight
- **THEN** the previous request is aborted and a new request is dispatched

#### Scenario: refresh re-fetches with same params
- **WHEN** the caller invokes `refresh()`
- **THEN** a new fetch with the current params is dispatched

#### Scenario: Unmount cancels in-flight
- **WHEN** the component unmounts while a request is in flight
- **THEN** the request is aborted

---

### Requirement: useProviderMutations hook
The system SHALL expose a hook `useProviderMutations()` returning `{ createOne, updateOne, softDeleteOne, reactivateOne }`. Each method SHALL accept the necessary payload and an optional `{ onSuccess?, onError? }` callback. `reactivateOne(id)` SHALL be a convenience wrapper around `updateProvider(id, { isActive: true })`. `updateOne(id, body)` SHALL NOT dispatch the request when the body is empty; instead it MUST invoke `onError` (or no-op) so the modal can prevent submit. The hook SHALL re-throw typed errors so that `ProviderEditModal` can map them to inline field errors.

#### Scenario: createOne success invokes onSuccess
- **WHEN** `createOne(body, { onSuccess })` is invoked and the backend returns 201
- **THEN** `onSuccess` is called with the created `Provider`

#### Scenario: createOne 409 invokes onError with typed error
- **WHEN** `createOne(body, { onError })` is invoked and the backend returns 409 `code already in use`
- **THEN** `onError` is called with a `ProviderCodeAlreadyInUseError`

#### Scenario: updateOne with empty body is a no-op
- **WHEN** `updateOne(id, {}, { onError })` is invoked
- **THEN** no HTTP request is dispatched and the mutation either silently no-ops or invokes `onError` (implementation choice — both are acceptable as long as no request is made)

#### Scenario: reactivateOne sends only isActive
- **WHEN** `reactivateOne(id)` is invoked
- **THEN** a `PATCH /api/v1/admin/providers/:id` request with body `{ "isActive": true }` is dispatched
