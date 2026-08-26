## MODIFIED Requirements

### Requirement: Product prices management in the Precios tab
The "Precios" tab SHALL show a branch selector above the prices table: "Precio base (todas)" (default selection) plus one option per active branch. Selecting "Precio base" dispatches `GET /api/v1/admin/products/:id/prices` (no `branchId`) and lists only base prices. Selecting a branch dispatches `GET /api/v1/admin/products/:id/prices?branchId=<id>` and lists that branch's effective prices (its own overrides plus inherited base rows).

The table columns are: `Nombre`, `Precio` (currency), `Cantidad mín.` (`minQuantity`), `Descuento` (`discountPct` as `"%"` or `"—"`), `Default` (a badge on the default row of the selected bucket), `Origen` (badge "Base" or "Override <sucursal>" driven by the DTO's `isOverride`), and `Acciones`. A "Nuevo precio" button (gated by `products:write`) SHALL open a `ProductPriceModal` for creation, pre-filling `branchId` with the currently selected branch (or `null` for "Precio base"). Rows SHALL offer "Editar" and "Eliminar" (hard delete with `ConfirmDialog`); when a branch is selected and the row shown is an inherited base row (`isOverride: false`), the row action SHALL instead read "Crear override aquí" — editing an inherited row is not possible without first materializing an override for that branch. The modal SHALL validate `name` (required), `price >= 0`, `minQuantity >= 1`, `discountPct` 0–100 (or empty → null), and `isDefault` (boolean); `branchId` is not editable once a price is created. After any mutation that changes the default price, the table SHALL re-fetch so the moved default badge is reflected. When the user lacks `products:write`, the table SHALL render read-only with a caption "Solo lectura — requiere products:write".

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

#### Scenario: Select a branch shows its effective prices
- **WHEN** the user selects "Zarioz" from the branch selector for a product with a Zarioz override on "Precio Publico"
- **THEN** a `GET .../prices?branchId=<Zarioz>` request is dispatched and the "Precio Publico" row shows the override value with an "Override Zarioz" badge

#### Scenario: Inherited row shows base value and offers to create an override
- **WHEN** a branch is selected and a price name has no override for that branch
- **THEN** the row shows the base value with a "Base" badge, and its row action reads "Crear override aquí" instead of "Editar"/"Eliminar"

#### Scenario: Creating an override from a branch view pre-fills branchId
- **WHEN** the user clicks "Crear override aquí" on an inherited row while "Huajuapan" is selected
- **THEN** `ProductPriceModal` opens pre-filled with that price's `name` and `branchId: <Huajuapan>`, ready to submit a new override

#### Scenario: Switching back to "Precio base" shows only global prices
- **WHEN** the user switches the selector from a branch back to "Precio base (todas)"
- **THEN** a `GET .../prices` request without `branchId` is dispatched and only base rows (`branchId: null`) are shown
