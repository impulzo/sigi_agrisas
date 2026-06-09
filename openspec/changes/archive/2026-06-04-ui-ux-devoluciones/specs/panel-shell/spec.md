## MODIFIED Requirements

### Requirement: Navigation rail item catalogue
The shared private layout SHALL render a fixed `NavigationRail` (80px wide) on the left edge of the viewport with the agreed Material 3 visual language and the brand mark at the top. The rail SHALL be split into two groups: a primary group with the destinations of the panel and a secondary group at the bottom with support/account entries. Each destination is declared as a typed `RailItem` `{ key, href, icon, label, requires?, children? }` where `requires?` is an optional permission key string (`<resource>:<action>`) and `children?` is an optional array of nested `RailItem` (only one level of nesting). The primary group SHALL include the following items in this order:

1. `dashboard` (icon `dashboard`, href `/dashboard`, label `Inicio`, no `requires`).
2. `pos` (icon `point_of_sale`, href `/pos`, label `POS`, declares `requires: "sales:create"`).
3. `sales` (icon `receipt_long`, href `/sales`, label `Ventas`, declares `requires: "sales:read"`).
4. `quotes` (icon `request_quote`, href `/quotes`, label `Cotizaciones`, declares `requires: "quotes:read"`).
5. `returns` (icon `assignment_return`, href `/returns`, label `Devoluciones`, declares `requires: "returns:read"`).
6. `inventory` (icon `inventory_2`, href `/inventory`, label `Inventario`, declares `requires: "inventory:read"`).
7. `catalogs` (icon `category`, href `/catalogs`, label `Catálogos`, with `children`: `payment-methods` (`payment_methods:read`, icon `payments`, href `/catalogs/payment-methods`), `folios` (`folios:read`, icon `tag`, href `/catalogs/folios`), `departments` (`departments:read`, icon `apartment`, href `/catalogs/departments`), `branches` (`branches:read`, icon `store`, href `/catalogs/branches`), `providers` (`providers:read`, icon `local_shipping`, href `/catalogs/providers`), `products` (`products:read`, icon `inventory_2`, href `/catalogs/products`)).
8. `users` (icon `group`, href `/users`, label `Usuarios`, declares `requires: "users:read"`).
9. `roles` (icon `shield_person`, href `/roles`, label `Roles`, declares `requires: "roles:read"`).

Below the secondary items, the rail SHALL render a standalone logout action button (icon `logout`, `title="Cerrar sesión"`) that invokes `useLogout` and is disabled while the logout is in flight.

When a `RailItem` has `children`, the rail SHALL render the parent item normally (icon + label) and, on hover or click of the parent, SHALL display a flyout panel (`RailFlyout`) anchored to the right edge of the rail (`left: 80px`) containing the visible children rendered as horizontal rows with icon + label. The parent item SHALL be visible if AT LEAST ONE child is visible according to the standard `requires` permission check; if all children are still in `"loading"` state, the parent SHALL be shown optimistically. Clicking the parent's icon SHALL navigate to the parent's `href`. Clicking a child inside the flyout SHALL navigate to the child's `href` and close the flyout.

#### Scenario: Items without requires are always shown
- **WHEN** a `RailItem` has no `requires` property (e.g. `dashboard`)
- **THEN** the rail SHALL render the item for every authenticated user

#### Scenario: Authorized user sees the quotes item
- **WHEN** the current user's effective permissions include `quotes:read`
- **THEN** the rail SHALL render the `quotes` item (label "Cotizaciones", href `/quotes`, icon `request_quote`) between `sales` and `returns`

#### Scenario: Unauthorized user does not see the quotes item
- **WHEN** the current user's effective permissions do not include `quotes:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `quotes` item

#### Scenario: Quotes item permission still loading
- **WHEN** the permission check for `quotes:read` is still in flight
- **THEN** the rail SHALL render the `quotes` item optimistically to avoid layout shift; the `QuotesListPage` route guard handles the unauthorized case if the check ultimately resolves to false

#### Scenario: Authorized user sees the returns item
- **WHEN** the current user's effective permissions include `returns:read`
- **THEN** the rail SHALL render the `returns` item (label "Devoluciones", href `/returns`, icon `assignment_return`) between `quotes` and `inventory`

#### Scenario: Unauthorized user does not see the returns item
- **WHEN** the current user's effective permissions do not include `returns:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `returns` item

#### Scenario: Returns item permission still loading
- **WHEN** the permission check for `returns:read` is still in flight
- **THEN** the rail SHALL render the `returns` item optimistically to avoid layout shift; the `ReturnsListPage` route guard handles the unauthorized case if the check ultimately resolves to false

#### Scenario: Returns item active for detail routes
- **WHEN** the current pathname is `/returns/abc-123`
- **THEN** the `returns` item SHALL render with the active styling because `pathname.startsWith("/returns/")`

#### Scenario: Authorized user sees the sales item
- **WHEN** the current user's effective permissions include `sales:read`
- **THEN** the rail SHALL render the `sales` item (label "Ventas", href `/sales`) between `pos` and `quotes`

#### Scenario: Authorized user sees the pos item
- **WHEN** the current user's effective permissions include `sales:create`
- **THEN** the rail SHALL render the `pos` item (label "POS", href `/pos`) between `dashboard` and `sales`

#### Scenario: Authorized user sees the inventory item
- **WHEN** the current user's effective permissions include `inventory:read`
- **THEN** the rail SHALL render the `inventory` item (label "Inventario", href `/inventory`) between `returns` and `catalogs`

#### Scenario: Unauthorized user does not see the inventory item
- **WHEN** the current user's effective permissions do not include `inventory:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `inventory` item

#### Scenario: Authorized user sees the users item
- **WHEN** the current user's effective permissions include `users:read`
- **THEN** the rail SHALL render the `users` item between `catalogs` and `roles`

#### Scenario: Authorized user sees the roles item
- **WHEN** the current user's effective permissions include `roles:read`
- **THEN** the rail SHALL render the `roles` item between `users` and the secondary group

#### Scenario: Unauthorized user does not see the users item
- **WHEN** the current user's effective permissions do not include `users:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `users` item

#### Scenario: Unauthorized user does not see the roles item
- **WHEN** the current user's effective permissions do not include `roles:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `roles` item

#### Scenario: Permission check still loading
- **WHEN** the permission check for a `requires`-gated item is still in flight
- **THEN** the rail SHALL render the item optimistically to avoid layout shift; the route guard on the destination page SHALL handle unauthorized access if the check ultimately resolves to false

#### Scenario: Active state of selected route
- **WHEN** the current pathname matches an item's `href` (or starts with `<href>/`)
- **THEN** that item SHALL render with the active styling (`bg-primary-container text-on-primary-container`)

#### Scenario: Quotes item active for detail routes
- **WHEN** the current pathname is `/quotes/abc-123` (or `/quotes/abc-123/edit`, or `/quotes/new`)
- **THEN** the `quotes` item SHALL render with the active styling because `pathname.startsWith("/quotes/")`

#### Scenario: Logout button always visible
- **WHEN** any authenticated user is on any private route
- **THEN** the logout button is rendered at the bottom of the NavigationRail, below the secondary items

#### Scenario: Logout button triggers session termination
- **WHEN** the user clicks the logout button
- **THEN** the button becomes disabled, the session is cleared, and the router navigates to `/auth/login`

#### Scenario: Catalogs parent visible when any child is allowed
- **WHEN** the user's permissions include at least one of `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`
- **THEN** the rail SHALL render the `catalogs` parent item between `inventory` and `users`

#### Scenario: Catalogs parent hidden when all children are denied
- **WHEN** the permission check has resolved and the user holds none of `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`
- **THEN** the rail SHALL NOT render the `catalogs` parent item

#### Scenario: Providers child rendered in the flyout
- **WHEN** the user holds `providers:read` and hovers the `catalogs` parent
- **THEN** the flyout SHALL include a `Proveedores` entry (icon `local_shipping`, href `/catalogs/providers`) in the children list

#### Scenario: Products child rendered in the flyout
- **WHEN** the user holds `products:read` and hovers the `catalogs` parent
- **THEN** the flyout SHALL include a `Productos` entry (icon `inventory_2`, href `/catalogs/products`) as the last child in the list

#### Scenario: Hovering catalogs opens the flyout
- **WHEN** the pointer enters the `catalogs` parent item
- **THEN** the rail SHALL render a `RailFlyout` panel adjacent to the rail (anchored at `left: 80px`, aligned vertically with the parent) showing the visible child items as horizontal rows

#### Scenario: Clicking the catalogs parent navigates to the hub
- **WHEN** the user clicks the `catalogs` parent icon
- **THEN** the router SHALL navigate to `/catalogs`

#### Scenario: Clicking a child in the flyout navigates and closes
- **WHEN** the user clicks "Formas de pago" in the flyout
- **THEN** the router SHALL navigate to `/catalogs/payment-methods` and the flyout SHALL close

#### Scenario: Flyout closes on mouse leave
- **WHEN** the pointer leaves both the `catalogs` parent and the flyout panel
- **THEN** the flyout SHALL close

#### Scenario: Child active state propagates to parent
- **WHEN** the current pathname starts with `/catalogs/`
- **THEN** the `catalogs` parent SHALL render with the active styling AND the matching child inside the flyout SHALL also be marked active when the flyout is open
