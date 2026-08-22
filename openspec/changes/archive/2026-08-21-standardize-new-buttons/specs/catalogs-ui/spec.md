## MODIFIED Requirements

### Requirement: CatalogToolbar with optional server-side search scope, min-length hint, and custom button label

The `CatalogToolbar` component SHALL accept optional props: `searchScope?: "client" | "server"` (default `"client"`), `searchMinLength?: number` (default `2`), `searchPlaceholder?: string` (default `"Buscar..."`), and `createButtonLabel?: string` (default `"Nuevo"`). When `searchScope === "server"` and the search field is empty or has `searchValue.length >= searchMinLength`, the toolbar SHALL render a static caption "Búsqueda en servidor · N+ caracteres" below the search input (styled `text-label-sm text-on-surface-variant`). When `searchScope === "server"` and `0 < searchValue.length < searchMinLength`, the toolbar SHALL replace the static caption with a conditional hint "Mínimo N caracteres" styled `text-label-sm text-error`. When `searchScope === "client"` (default), no caption or hint is rendered. The `createButtonLabel` prop sets the label of the "Nuevo" button; callers can pass `"Nuevo producto"` or any other string.

The create button SHALL render via `CreateButton` (`app/_components/molecules/CreateButton/CreateButton.tsx`, see the `design-system` capability) bound to `onCreate` via its `onClick` prop and `createButtonLabel` via its `label` prop, instead of a raw `<button>` with hardcoded classes or a direct `Button` instantiation.

Every catalog page SHALL pass an explicit `createButtonLabel` naming its resource with correct grammatical gender, instead of relying on the generic `"Nuevo"` default: `payment-methods` → `"Nuevo método de pago"`, `folios` → `"Nuevo folio"`, `departments` → `"Nuevo departamento"`, `branches` → `"Nueva sucursal"`, `providers` → `"Nuevo proveedor"`, `tax-rates` → `"Nueva tasa de impuesto"`, `products` → `"Nuevo producto"`, `customers` → `"Nuevo cliente"`, `vehicles` → `"Nuevo vehículo"`, `drivers` → `"Nuevo operador"`.

#### Scenario: Default scope is client
- **WHEN** `CatalogToolbar` is rendered without a `searchScope` prop
- **THEN** no scope caption is rendered (existing four catalogs are unaffected)

#### Scenario: Server scope renders static caption when search is empty
- **WHEN** `CatalogToolbar` is rendered with `searchScope="server"` and the search input is empty
- **THEN** the caption "Búsqueda en servidor · 2+ caracteres" appears below the search input

#### Scenario: Server scope shows min-length hint when search is too short
- **WHEN** `CatalogToolbar` is rendered with `searchScope="server"` and `searchValue.length === 1`
- **THEN** the caption changes to "Mínimo 2 caracteres" in error color

#### Scenario: createButtonLabel customizes the button
- **WHEN** `CatalogToolbar` is rendered with `createButtonLabel="Nuevo producto"`
- **THEN** the create button renders the label "Nuevo producto" instead of "Nuevo"

#### Scenario: Existing four catalogs do not pass searchScope
- **WHEN** the `payment-methods`, `folios`, `departments`, and `branches` pages render `CatalogToolbar`
- **THEN** they do NOT pass `searchScope` and the toolbar behavior is identical to the prior release

#### Scenario: Create button shares the CreateButton look
- **WHEN** any catalog page renders `CatalogToolbar` with `canWrite` true
- **THEN** the create button is a `CreateButton` instance (`rounded-full`, `variant="filled"`, `icon="add"` at the start, internally via `Button`), not a raw `<button>` or a directly-instantiated `Button` with independently maintained props

#### Scenario: All six previously-generic catalogs now pass an explicit label
- **WHEN** the `payment-methods`, `folios`, `departments`, `branches`, `providers`, or `tax-rates` pages render `CatalogToolbar`
- **THEN** each passes its own `createButtonLabel` ("Nuevo método de pago", "Nuevo folio", "Nuevo departamento", "Nueva sucursal", "Nuevo proveedor", "Nueva tasa de impuesto" respectively) instead of falling back to the generic `"Nuevo"` default
