## MODIFIED Requirements

### Requirement: NavigationRail items catalog with submenu support
The catalog of items displayed in the `NavigationRail` SHALL be defined in `app/_components/organisms/NavigationRail/items.ts` and SHALL include a primary item with key `catalogs` (icon `category`, label "Catálogos", href `/catalogs`) whose `children` array contains **five** entries in this exact order: `payment-methods`, `folios`, `departments`, `branches`, `providers`. Each child SHALL declare its own `requires` permission, `icon`, `href`, and `label`. The new `providers` child SHALL be defined as `{ key: "providers", href: "/catalogs/providers", icon: "local_shipping", label: "Proveedores", requires: "providers:read" }` and SHALL be inserted at the end of the `children` array. The visibility rule of the parent item is unchanged: the parent `catalogs` is shown when at least one of its children resolves to `true` or `"loading"` via `useCurrentUser().can()`.

#### Scenario: All five catalog children render when permitted
- **WHEN** an authenticated user has all five permissions (`payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`) and hovers the `catalogs` icon
- **THEN** the `RailFlyout` renders five items in this order: "Formas de pago", "Folios", "Departamentos", "Sucursales", "Proveedores"

#### Scenario: Only providers:read shows only providers child
- **WHEN** an authenticated user has only `providers:read` (none of the other four catalog permissions)
- **THEN** the parent `catalogs` is still visible and the flyout renders only the "Proveedores" entry

#### Scenario: No catalog permissions hides parent
- **WHEN** an authenticated user has none of the five catalog read permissions
- **THEN** after permissions resolve, the parent `catalogs` is hidden from the rail

#### Scenario: Click on providers child navigates and closes flyout
- **WHEN** the flyout is open and the user clicks the "Proveedores" entry
- **THEN** the browser navigates to `/catalogs/providers` and the flyout is closed

#### Scenario: Providers icon uses local_shipping
- **WHEN** the flyout is rendered
- **THEN** the "Proveedores" item displays the `local_shipping` Material Symbol
