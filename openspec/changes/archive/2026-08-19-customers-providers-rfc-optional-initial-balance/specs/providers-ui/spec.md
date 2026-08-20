## MODIFIED Requirements

### Requirement: Providers list screen with server-side search
The system SHALL provide a screen at `/catalogs/providers` that lists providers in a paginated table. The screen SHALL require the `providers:read` permission (gated via `useCurrentUser().can("providers:read")`). The toolbar SHALL include: a search input that submits its value to the backend `?search=` query parameter (server-side search) with a 300 ms debounce; a `Switch` "Mostrar inactivos" that toggles the `?includeInactive=true` query parameter; and a button "Nuevo proveedor" that opens the create modal (gated by `providers:write`). The toolbar SHALL render a small caption "Búsqueda en servidor · 2+ caracteres" below the search input to differentiate it from the client-side search of the other 4 catalogs. The table SHALL show columns: `Código`, `Nombre` (with `legalName` rendered as a smaller subtitle below the name when present), `RFC` (rendered in monospace font, or `—` when `null`), `Régimen` (the `taxRegime` value or `—` when null), `Contacto` (first non-null of `email`/`phone`/`contactName` or `—`), `Saldo inicial` (`initialBalance`, formatted currency), `Saldo actual` (`currentBalance`, formatted currency), `Estado` (badge "Activo"/"Inactivo"), and `Acciones`. Pagination SHALL follow the same shape as the other 4 catalogs (`page`, `pageSize`, total count, page selector). The actions column SHALL only render when the user has `providers:write`. Rows of inactive providers SHALL show a "Reactivar" action; rows of active providers SHALL show "Editar" and "Eliminar" actions.

#### Scenario: Admin opens the providers screen
- **WHEN** an authenticated user with `providers:read` navigates to `/catalogs/providers`
- **THEN** the screen renders the toolbar, table, and pagination, and a `GET /api/v1/admin/providers?page=1&pageSize=20` request is dispatched

#### Scenario: Search shorter than 2 characters does not fetch
- **WHEN** the user types `"a"` in the search input
- **THEN** no `?search=` parameter is sent and an inline hint "Mínimo 2 caracteres" appears below the input

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

#### Scenario: RFC column shows em-dash when null
- **WHEN** a provider row has `rfc: null`
- **THEN** the `RFC` column renders `—` instead of an empty cell

#### Scenario: Saldo columns present
- **WHEN** the table renders a provider with `initialBalance: 2000` and `currentBalance: 4500`
- **THEN** the `Saldo inicial` column shows `$2,000.00` and the `Saldo actual` column shows `$4,500.00`

---

### Requirement: Provider create/edit modal with grouped sections
The system SHALL provide a single modal component `ProviderEditModal` that handles both creation and edition based on a `mode` prop (`"create" | "edit"`). The modal SHALL render its editable fields grouped into three labelled sections: "Datos básicos" (`code`, `name`, `isActive`), "Datos fiscales" (`rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`), "Contacto y crédito" (`email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`, `creditDays`, `initialBalance`). The fields `code` and, when non-empty, `rfc` SHALL be uppercase-forced as the user types (via `onChange`). The field `code` SHALL be disabled in `edit` mode (the backend ignores it silently, but the UI prevents confusion). The field `rfc` SHALL be optional, editable in both modes, and SHALL NOT be marked with the required-field indicator (`*`). In `edit` mode, the save button SHALL be disabled when the diff against the loaded entity is empty. In `create` mode, the save button SHALL be enabled when the required fields (`code`, `name`) are filled and pass client validation (`rfc` is no longer required). Validation SHALL mirror the backend regexes: `code` `^[A-Z0-9_]{1,32}$`, `rfc` `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` when non-empty (empty maps to `null`), `taxRegime` `^\d{3}$`, `cfdiUse` `^[A-Z]\d{2}$`, `taxZipCode` `^\d{5}$`, `creditLimit` a non-negative number or empty (maps to `null`), `creditDays` a non-negative integer, `initialBalance` a non-negative number or empty (maps to `0` on create). Validation errors SHALL be shown inline below each field in Spanish.

#### Scenario: Create mode renders all fields editable
- **WHEN** the modal opens in `mode="create"`
- **THEN** all fields are editable, `code` is enabled, `isActive` defaults to `true`

#### Scenario: RFC is not marked required
- **WHEN** the modal opens in `mode="create"` or `mode="edit"`
- **THEN** the RFC field label does not show the required-field indicator (`*`)

#### Scenario: Create without RFC succeeds
- **WHEN** the user fills only `code` and `name`, leaves `rfc` empty, and submits
- **THEN** the modal calls `POST /api/v1/admin/providers` without an `rfc` field (or with `rfc: null`)

#### Scenario: Edit mode locks code
- **WHEN** the modal opens in `mode="edit"` with an `entity`
- **THEN** the `code` field is rendered disabled and pre-filled with `entity.code`; the other fields are pre-filled and editable

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
- **WHEN** the user submits a non-empty `rfc` already in use and the backend returns 409
- **THEN** the modal stays open and an inline error "Este RFC ya está en uso por otro proveedor." appears under the `rfc` field (in both create and edit modes)

#### Scenario: Optional fields cleared via null
- **WHEN** the user clears the `legalName` field in `edit` and submits
- **THEN** the request sends `{ "legalName": null }` and the response shows `legalName === null`

#### Scenario: Create with initial balance
- **WHEN** the user enters `2000` in "Saldo inicial" during creation and submits
- **THEN** the request body includes `{ "initialBalance": 2000 }`, and on success the table shows `$2,000.00` as both saldo inicial and saldo actual for the new provider

#### Scenario: Edit initial balance
- **WHEN** the user changes "Saldo inicial" in `edit` mode from `1000` to `1500` and submits
- **THEN** the modal calls `PATCH /api/v1/admin/providers/:id` with `{ "initialBalance": 1500 }`, and on success the refreshed table reflects the backend-adjusted `currentBalance`

#### Scenario: Negative initial balance rejected client-side
- **WHEN** the user types `-50` in "Saldo inicial" and tries to submit
- **THEN** the modal shows an inline error and does not dispatch the request
