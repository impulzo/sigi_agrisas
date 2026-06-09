## ADDED Requirements

### Requirement: Inventory screen with branch selector
The system SHALL provide a screen at `/inventory` that requires the `inventory:read` permission (gated via `useCurrentUser().can("inventory:read")`). The screen SHALL render a branch `<select>` at the top, populated once via `useBranchesOptions()` from active branches (`GET /api/v1/admin/branches?pageSize=100`). The selected branch SHALL be held in local component state and default to unset. While no branch is selected, the screen SHALL render an `EmptyState` "Selecciona una sucursal" and SHALL NOT dispatch any inventory request. When a branch is selected, the screen SHALL fetch `GET /api/v1/admin/branches/:id/inventory`. A user without `inventory:read` SHALL see an empty/forbidden state without any request dispatched.

#### Scenario: Authorized user opens inventory without selecting a branch
- **WHEN** a user with `inventory:read` navigates to `/inventory`
- **THEN** the branch `<select>` renders with active branches and an `EmptyState` "Selecciona una sucursal" is shown, with no inventory request dispatched

#### Scenario: Selecting a branch loads its inventory
- **WHEN** the user selects a branch in the `<select>`
- **THEN** a `GET /api/v1/admin/branches/:id/inventory?page=1&pageSize=20` request is dispatched and the stock table renders

#### Scenario: User without inventory:read sees no access
- **WHEN** a user without `inventory:read` navigates to `/inventory`
- **THEN** the screen renders an empty/forbidden state without dispatching any request

#### Scenario: Switching branch refetches and resets page
- **WHEN** the user changes the selected branch while on page 3
- **THEN** the screen fetches the new branch with `?page=1&pageSize=<current>`

---

### Requirement: Stock table with reorder alerts, search and filter
For a selected branch, the system SHALL render a paginated stock table with columns: `Código` (`productCode`, font-mono), `Producto` (`productName`), `Cantidad` (`quantity`), `Reservado` (`reservedQuantity`), `Disponible` (computed client-side as `quantity - reservedQuantity`), `Punto reorden` (`reorderPoint`), and `Acciones`. Rows where `quantity < reorderPoint` SHALL be visually flagged with a warning indicator (e.g., a badge or row accent). The toolbar SHALL include: a search input mapped to `?search=` with a 300 ms debounce; a `Switch` "Solo bajo punto de reorden" that toggles `?belowReorder=true`; and an "Asignar producto" button gated by `inventory:write`. Pagination SHALL follow the catalogs shape. The actions column SHALL only render when the user has `inventory:write`.

#### Scenario: Rows below reorder point are flagged
- **WHEN** a row has `quantity < reorderPoint`
- **THEN** the row renders a warning indicator (low-stock badge/accent)

#### Scenario: Available column is computed client-side
- **WHEN** a row has `quantity === 50` and `reservedQuantity === 12`
- **THEN** the "Disponible" cell renders `38`

#### Scenario: Below-reorder filter
- **WHEN** the user enables the "Solo bajo punto de reorden" switch
- **THEN** the next request adds `?belowReorder=true` and only flagged rows are returned

#### Scenario: Search debounced
- **WHEN** the user types `"glifo"` in the search input
- **THEN** after 300 ms a request with `?search=glifo` is dispatched, replacing any in-flight request

#### Scenario: Viewer cannot see write actions
- **WHEN** a user with only `inventory:read` views a branch's stock
- **THEN** the "Asignar producto" button and the row actions are not rendered

#### Scenario: Branch with no inventory shows empty state
- **WHEN** the selected branch returns `total === 0`
- **THEN** the screen renders an `EmptyState` "Esta sucursal no tiene productos asignados" with an "Asignar producto" call-to-action (gated by `inventory:write`)

---

### Requirement: Assign product to branch modal
The system SHALL provide an `InventoryAssignModal` opened by "Asignar producto" (gated by `inventory:write`). The modal SHALL let the user pick a product (a searchable `<select>`/typeahead populated from `GET /api/v1/admin/products?search=`), set an initial `quantity` (>= 0, default 0), and a `reorderPoint` (>= 0, default 0). On submit it SHALL call `POST /api/v1/admin/branches/:id/inventory` with `{ productId, quantity, reorderPoint }`. A 409 (product already assigned to the branch) SHALL show an inline error. A 400 (product not found or inactive) SHALL show an inline error.

#### Scenario: Assign a product with initial stock
- **WHEN** the user picks a product, sets `quantity = 100`, `reorderPoint = 10`, and submits
- **THEN** a `POST /api/v1/admin/branches/:id/inventory` with body `{ "productId": "<id>", "quantity": 100, "reorderPoint": 10 }` is dispatched and the table refreshes with the new row

#### Scenario: Duplicate assignment shows inline error
- **WHEN** the user picks a product already assigned to the branch and the backend returns 409
- **THEN** the modal stays open and an inline error "Este producto ya está asignado a la sucursal." appears

#### Scenario: Inactive/missing product shows inline error
- **WHEN** the backend returns 400 "Product not found or inactive"
- **THEN** the modal stays open and an inline error "El producto no existe o está inactivo." appears under the product field

#### Scenario: Negative quantity rejected client-side
- **WHEN** the user enters `quantity = -5`
- **THEN** the modal shows an inline error "La cantidad no puede ser negativa." and does not dispatch the request

---

### Requirement: Adjust stock modal (atomic delta)
The system SHALL provide a `StockAdjustModal` opened by the row action "Ajustar stock" (gated by `inventory:write`). The modal SHALL show the current `quantity`, a signed delta input (positive to add, negative to remove), an optional `reason` text field, and a live preview "Stock resultante: N" (current + delta, clamped display). On submit it SHALL call `POST /api/v1/admin/branches/:id/inventory/:productId/adjust` with `{ delta, reason? }`. A 409 (`Negative stock not allowed`) SHALL show an inline error and keep the modal open. After a successful adjust the table SHALL re-fetch.

#### Scenario: Positive adjustment
- **WHEN** the user enters `delta = 25` with reason "Recepción de compra" and submits
- **THEN** a `POST .../adjust` with body `{ "delta": 25, "reason": "Recepción de compra" }` is dispatched and the table refreshes

#### Scenario: Live preview reflects delta
- **WHEN** the current quantity is `40` and the user types `delta = -10`
- **THEN** the preview shows "Stock resultante: 30"

#### Scenario: Adjustment that would go negative shows inline error
- **WHEN** the user submits a delta that the backend rejects with 409 "Negative stock not allowed"
- **THEN** the modal stays open and an inline error "El ajuste dejaría el stock en negativo." appears

#### Scenario: Zero delta is a no-op
- **WHEN** the delta input is `0`
- **THEN** the submit button is disabled

---

### Requirement: Edit inventory record modal (absolute set)
The system SHALL provide an `InventoryEditModal` opened by the row action "Editar registro" (gated by `inventory:write`) for correcting absolute values. The modal SHALL pre-fill `quantity`, `reservedQuantity`, and `reorderPoint` (all >= 0) and, on submit, call `PATCH /api/v1/admin/branches/:id/inventory/:productId` with only the changed fields. The save button SHALL be disabled when the diff is empty. A negative value in any field SHALL be rejected client-side.

#### Scenario: Edit reorder point only
- **WHEN** the user changes `reorderPoint` from `10` to `20` and submits
- **THEN** a `PATCH .../inventory/:productId` with body `{ "reorderPoint": 20 }` is dispatched and the table refreshes

#### Scenario: Empty diff disables save
- **WHEN** the user opens the edit modal and changes nothing
- **THEN** the save button is disabled

#### Scenario: Negative value rejected client-side
- **WHEN** the user sets `quantity = -1`
- **THEN** the modal shows an inline error "El valor no puede ser negativo." and does not dispatch the request

---

### Requirement: Remove product from branch (hard delete)
The system SHALL allow removing a product's inventory record from a branch via the row action "Quitar de sucursal" (gated by `inventory:write`) with a `ConfirmDialog` ("¿Quitar este producto de la sucursal? El registro de stock se eliminará."). On confirmation it SHALL call `DELETE /api/v1/admin/branches/:id/inventory/:productId` (hard delete) and refresh the table.

#### Scenario: Remove with confirmation
- **WHEN** the user clicks "Quitar de sucursal" and confirms the dialog
- **THEN** a `DELETE .../inventory/:productId` request is dispatched and the row disappears

#### Scenario: Cancel removal
- **WHEN** the user clicks "Quitar de sucursal" and cancels the dialog
- **THEN** no request is dispatched

#### Scenario: Viewer cannot remove
- **WHEN** a user with only `inventory:read` views the table
- **THEN** the "Quitar de sucursal" action is not rendered

---

### Requirement: Typed service errors and hooks for inventory
The system SHALL expose service functions in `app/(private)/inventory/_logic/services/` (`listBranchInventory`, `getInventoryItem`, `assignProduct`, `updateInventoryItem`, `adjustStock`, `removeInventoryItem`) that map HTTP responses to typed errors in `_logic/errors.ts`: `InventoryRecordNotFoundError` (404), `InventoryAlreadyExistsError` (409 "already exists"), `NegativeStockNotAllowedError` (409 "Negative stock not allowed"), `InventoryTargetInvalidError` (400, branch/product not found or inactive). Services SHALL accept an optional `fetchImpl` and convert `updatedAt` to a `Date`. The system SHALL expose `useBranchInventory({ branchId, page, pageSize, search, belowReorder })` with `AbortController` cancellation (returning `{ items, total, isLoading, error, refresh }`) and `useBranchesOptions()` (active branches cached at module level). When `branchId` is unset, `useBranchInventory` SHALL NOT dispatch a request.

#### Scenario: 409 already exists mapped on assign
- **WHEN** `assignProduct(...)` is invoked for a product already assigned and the backend returns 409
- **THEN** the call rejects with `InventoryAlreadyExistsError`

#### Scenario: 409 negative stock mapped on adjust
- **WHEN** `adjustStock(...)` is invoked with a delta that the backend rejects with 409 "Negative stock not allowed"
- **THEN** the call rejects with `NegativeStockNotAllowedError`

#### Scenario: 400 invalid target mapped on assign
- **WHEN** `assignProduct(...)` is invoked with an inactive product and the backend returns 400
- **THEN** the call rejects with `InventoryTargetInvalidError`

#### Scenario: Hook does not fetch without a branch
- **WHEN** `useBranchInventory` is used with `branchId` unset
- **THEN** no request is dispatched and `items` is an empty array

#### Scenario: Param change cancels previous request
- **WHEN** the `search` changes while a previous request is still in flight
- **THEN** the previous request is aborted and a new request is dispatched

#### Scenario: fetchImpl injection for tests
- **WHEN** a service is invoked with a `fetchImpl` mock
- **THEN** the service uses that mock instead of the global `authFetch`
