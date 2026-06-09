## ADDED Requirements

### Requirement: Roles administration page
The system SHALL expose a private page at `/roles` under the `(private)` route group that presents the role catalogue and the permissions assigned to each role. The page MUST be a master-detail view: the master pane lists all roles fetched from `GET /api/v1/admin/roles`, the detail pane shows the selected role's name and description under the label "Configurando: [name]", plus a grouped toggle editor for all permissions in the catalogue (from `GET /api/v1/admin/permissions`), grouped by resource (the segment before `:`). A permission toggle is ON when the permission is assigned to the selected role (`GET /api/v1/admin/roles/:id/permissions`).

A page header shows the title "Roles y Permisos" and — when the user has `roles:write` — a "Crear Nuevo Rol" button.

#### Scenario: User with permission opens the roles page
- **WHEN** a user whose effective permissions include `roles:read` navigates to `/roles`
- **THEN** the page SHALL render the list of roles in the master pane, automatically select the first role, and render its permission toggles in the detail pane

#### Scenario: User without permission opens the roles page
- **WHEN** a user without the `roles:read` permission navigates to `/roles`
- **THEN** the page SHALL render an `EmptyState` with title "Sin acceso" and a description inviting them to contact an administrator — without redirecting

#### Scenario: Selecting a different role
- **WHEN** the user clicks a role in the master pane
- **THEN** the detail pane SHALL update to that role's permissions without a full-page reload; the previously selected role row loses its active styling and the new row gains it

#### Scenario: Roles list is empty
- **WHEN** the `GET /api/v1/admin/roles` response is `{ "roles": [] }`
- **THEN** the master pane SHALL render an `EmptyState` with title "Sin roles" and the detail pane SHALL be empty (or hidden)

---

### Requirement: Grant and revoke permissions via staged batch save
The page SHALL allow users with the `roles:write` permission to grant and revoke permissions on the selected role using toggle switches. Changes are staged locally — toggling a switch does NOT immediately trigger a network request. When the user clicks "Guardar Cambios", all pending changes (grants and revokes) are applied in parallel via `POST /api/v1/admin/roles/:id/permissions` and `DELETE /api/v1/admin/roles/:id/permissions/:permId`. "Descartar" resets all staged changes to the last saved state.

The "Guardar Cambios" and "Descartar" buttons SHALL be disabled when there are no pending changes (`isDirty = false`). While saving, the "Guardar Cambios" button SHALL show a spinner and be disabled.

#### Scenario: Toggling a permission enables Guardar Cambios
- **WHEN** the user clicks a toggle switch whose current state differs from the saved state
- **THEN** the toggle SHALL visually update immediately, and the "Guardar Cambios" and "Descartar" buttons SHALL become enabled

#### Scenario: Successful batch save
- **WHEN** the user clicks "Guardar Cambios" with pending changes
- **THEN** all grant and revoke requests SHALL be sent in parallel, and on success the saved state SHALL update to reflect the new assignments

#### Scenario: Descartar reverts pending changes
- **WHEN** the user clicks "Descartar" with pending changes
- **THEN** all toggles SHALL revert to the last saved state and the "Guardar Cambios" button SHALL become disabled again

#### Scenario: Save fails with a server error
- **WHEN** any network request during save returns a non-2xx response
- **THEN** the UI SHALL display the error message inline and the staged state SHALL remain as-is so the user can retry or discard

#### Scenario: Last permission revoked from a role
- **WHEN** the user turns off all toggles for a role and saves
- **THEN** the role SHALL have no assigned permissions; all toggles SHALL be in the OFF state after the save completes

---

### Requirement: Permissions grouped by resource with human-readable labels
Permissions in the toggle editor SHALL be grouped by their resource segment (the part before `:`). Each group SHALL have a human-readable section header in Spanish (e.g., "Usuarios" for `users`, "Roles y Permisos" for `roles`). Each permission item SHALL display its `description` field as the label; if `description` is null the key SHALL be used as fallback. No technical keys (`resource:action`) SHALL be visible to the user in the main display.

#### Scenario: Known resource shows Spanish group header
- **WHEN** the catalogue contains permissions with resource `users`
- **THEN** those permissions SHALL be listed under the section header "Usuarios"

#### Scenario: Permission shows description, not key
- **WHEN** a permission has `description: "Leer usuarios"` and `key: "users:read"`
- **THEN** the toggle item SHALL display "Leer usuarios" — NOT "users:read"

---

### Requirement: Loading and error states
While any of the lists (roles, role permissions, permissions catalogue) are loading, the corresponding pane SHALL render a `Skeleton`-based placeholder. If the roles list fetch fails, the master pane SHALL render an inline error message with a "Reintentar" button that re-invokes the fetch.

#### Scenario: Initial roles load
- **WHEN** the page mounts and `GET /api/v1/admin/roles` has not yet resolved
- **THEN** the master pane SHALL render skeleton rows

#### Scenario: Failed roles fetch
- **WHEN** the network request fails (offline, 500)
- **THEN** the master pane SHALL render "No se pudo cargar la lista de roles" with a "Reintentar" button that calls `refresh()` on the hook
