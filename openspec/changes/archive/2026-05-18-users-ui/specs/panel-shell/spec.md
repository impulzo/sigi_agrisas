## MODIFIED Requirements

### Requirement: Navigation rail item catalogue
The shared private layout SHALL render a fixed `NavigationRail` (80px wide) on the left edge of the viewport with the agreed Material 3 visual language and the brand mark at the top. The rail SHALL be split into two groups: a primary group with the destinations of the panel and a secondary group at the bottom with support/account entries. Each destination is declared as a typed `RailItem` `{ key, href, icon, label, requires? }` where `requires?` is an optional permission key string (`<resource>:<action>`). The primary group SHALL include the following items in this order: `dashboard`, `pos`, `inventory`, `billing`, `users` (declares `requires: "users:read"`, icon `group`), `roles` (declares `requires: "roles:read"`).

#### Scenario: Items without requires are always shown
- **WHEN** a `RailItem` has no `requires` property (e.g. `dashboard`)
- **THEN** the rail SHALL render the item for every authenticated user

#### Scenario: Authorized user sees the users item
- **WHEN** the current user's effective permissions include `users:read`
- **THEN** the rail SHALL render the `users` item between `billing` and `roles`

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
