## MODIFIED Requirements

### Requirement: Navigation rail item catalogue
The shared private layout SHALL render a fixed `NavigationRail` (80px wide) on the left edge of the viewport with the agreed Material 3 visual language and the brand mark at the top. The rail SHALL be split into two groups: a primary group with the destinations of the panel and a secondary group at the bottom with support/account entries. Each destination is declared as a typed `RailItem` `{ key, href, icon, label, requires?, children? }` where `requires?` is an optional permission key string (`<resource>:<action>`) and `children?` is an optional array of nested `RailItem` (only one level of nesting). The primary group SHALL include the following items in this order: `dashboard`, `pos`, `inventory`, `billing`, `catalogs` (icon `category`, href `/catalogs`, with `children`: `payment-methods` (`payment_methods:read`, icon `payments`, href `/catalogs/payment-methods`), `folios` (`folios:read`, icon `tag`, href `/catalogs/folios`), `departments` (`departments:read`, icon `apartment`, href `/catalogs/departments`), `branches` (`branches:read`, icon `store`, href `/catalogs/branches`)), `users` (declares `requires: "users:read"`, icon `group`), `roles` (declares `requires: "roles:read"`). Below the secondary items, the rail SHALL render a standalone logout action button (icon `logout`, `title="Cerrar sesión"`) that invokes `useLogout` and is disabled while the logout is in flight.

When a `RailItem` has `children`, the rail SHALL render the parent item normally (icon + label) and, on hover or click of the parent, SHALL display a flyout panel (`RailFlyout`) anchored to the right edge of the rail (`left: 80px`) containing the visible children rendered as horizontal rows with icon + label. The parent item SHALL be visible if AT LEAST ONE child is visible according to the standard `requires` permission check; if all children are still in `"loading"` state, the parent SHALL be shown optimistically. Clicking the parent's icon SHALL navigate to the parent's `href`. Clicking a child inside the flyout SHALL navigate to the child's `href` and close the flyout.

#### Scenario: Items without requires are always shown
- **WHEN** a `RailItem` has no `requires` property (e.g. `dashboard`)
- **THEN** the rail SHALL render the item for every authenticated user

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

#### Scenario: Logout button always visible
- **WHEN** any authenticated user is on any private route
- **THEN** the logout button is rendered at the bottom of the NavigationRail, below the secondary items

#### Scenario: Logout button triggers session termination
- **WHEN** the user clicks the logout button
- **THEN** the button becomes disabled, the session is cleared, and the router navigates to `/auth/login`

#### Scenario: Catalogs parent visible when any child is allowed
- **WHEN** the user's permissions include at least one of `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`
- **THEN** the rail SHALL render the `catalogs` parent item between `billing` and `users`

#### Scenario: Catalogs parent hidden when all children are denied
- **WHEN** the permission check has resolved and the user holds none of `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`
- **THEN** the rail SHALL NOT render the `catalogs` parent item

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

## ADDED Requirements

### Requirement: RailFlyout molecule
The system SHALL expose a reusable molecule `app/_components/molecules/RailFlyout/RailFlyout.tsx` that renders a vertical popover panel for `NavigationRail` parents with `children`. Props: `{ open: boolean; anchorTop: number; items: RailItem[]; activeHref: string; onItemClick: (href: string) => void; onClose: () => void }`. The component SHALL render an empty fragment when `open === false`. When open, it SHALL render a `<div role="menu">` positioned absolute at `left: 80px; top: <anchorTop>px`, styled with `bg-surface-container-low border border-outline-variant rounded-r-xl shadow-lg py-2 min-w-[240px]`. Each child SHALL be rendered as a `<Link role="menuitem">` with icon + label horizontally, with active styling when its `href` matches `activeHref` or `activeHref.startsWith(href + "/")`. The flyout SHALL invoke `onClose` when the pointer leaves the panel. The component SHALL be presentational (no fetch, no router push imperative, only declarative `<Link>`).

#### Scenario: Flyout renders nothing when closed
- **WHEN** `<RailFlyout open={false} ... />` is rendered
- **THEN** the DOM SHALL NOT contain any element from the flyout

#### Scenario: Flyout renders items when open
- **WHEN** `<RailFlyout open={true} items={[a, b, c]} ... />` is rendered
- **THEN** the DOM SHALL contain three `role="menuitem"` links with the items' icons and labels in order

#### Scenario: Active item gets active styling
- **WHEN** `activeHref="/catalogs/folios"` and the flyout includes an item with `href="/catalogs/folios"`
- **THEN** that item SHALL render with `bg-primary-container text-on-primary-container` classes

#### Scenario: Item click invokes onItemClick
- **WHEN** the user clicks a child link
- **THEN** the component SHALL invoke `onItemClick(href)` once with that child's `href`

#### Scenario: Pointer leave invokes onClose
- **WHEN** the pointer leaves the flyout panel
- **THEN** the component SHALL invoke `onClose` exactly once

#### Scenario: Positioned at the anchor's vertical offset
- **WHEN** `anchorTop={120}` is provided
- **THEN** the root panel SHALL have inline style `top: 120px` (so the flyout aligns with the parent icon)
