## MODIFIED Requirements

### Requirement: Inventory screen with branch selector
The system SHALL provide a screen at `/inventory` that requires the `inventory:read` permission (gated via `useCurrentUser().can("inventory:read")`).

- **When the user has `branches:access_all`**: the screen SHALL render a branch `<select>` at the top, populated once via `useBranchesOptions()` from active branches (`GET /api/v1/admin/branches?pageSize=100`). The selected branch SHALL be held in local component state and default to unset. While no branch is selected, the screen SHALL render an `EmptyState` "Selecciona una sucursal" and SHALL NOT dispatch any inventory request.
- **When the user does NOT have `branches:access_all`**: the screen SHALL NOT render the branch `<select>`. The `branchId` used for the inventory request SHALL be fixed to the authenticated user's own `branchId` (from `useCurrentUser()`), shown as read-only text next to the "Sucursal:" label. If the user has no `branchId` assigned, the screen SHALL render an `EmptyState` "Sin sucursal asignada" instead of dispatching a request.

When a branch is resolved (selected by an admin, or fixed to the caller's own branch), the screen SHALL fetch `GET /api/v1/admin/branches/:id/inventory`. A user without `inventory:read` SHALL see an empty/forbidden state without any request dispatched.

#### Scenario: Admin opens inventory without selecting a branch
- **WHEN** a user with `inventory:read` and `branches:access_all` navigates to `/inventory`
- **THEN** the branch `<select>` renders with active branches and an `EmptyState` "Selecciona una sucursal" is shown, with no inventory request dispatched

#### Scenario: Admin selects a branch loads its inventory
- **WHEN** the admin selects a branch in the `<select>`
- **THEN** a `GET /api/v1/admin/branches/:id/inventory?page=1&pageSize=20` request is dispatched and the stock table renders

#### Scenario: Non-admin opens inventory and sees their own branch directly
- **WHEN** a user with `inventory:read` but without `branches:access_all`, and an assigned `branchId`, navigates to `/inventory`
- **THEN** no branch `<select>` is rendered, the sucursal name is shown as read-only text, and `GET /api/v1/admin/branches/:myBranchId/inventory?page=1&pageSize=20` is dispatched automatically

#### Scenario: Non-admin without an assigned branch sees an empty state
- **WHEN** a user with `inventory:read` but without `branches:access_all` and without any `branchId` assigned navigates to `/inventory`
- **THEN** the screen renders an `EmptyState` "Sin sucursal asignada" and no inventory request is dispatched

#### Scenario: User without inventory:read sees no access
- **WHEN** a user without `inventory:read` navigates to `/inventory`
- **THEN** the screen renders an empty/forbidden state without dispatching any request

#### Scenario: Admin switching branch refetches and resets page
- **WHEN** the admin changes the selected branch while on page 3
- **THEN** the screen fetches the new branch with `?page=1&pageSize=<current>`
