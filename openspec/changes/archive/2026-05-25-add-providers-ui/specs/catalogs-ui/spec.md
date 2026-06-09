## MODIFIED Requirements

### Requirement: Catalogs hub at /catalogs with five cards
The system SHALL provide a hub page at `/catalogs` (`CatalogsHubPage`) that renders **five** `CatalogHubCard` entries in this order: payment-methods, folios, departments, branches, providers. Each card SHALL be gated by the corresponding `<resource>:read` permission via `useCurrentUser().can()` and SHALL show a "Sin acceso" state when the permission resolves to `false`. The new fifth card for providers SHALL be defined with `{ icon: "local_shipping", title: "Proveedores", description: "Gestiona los proveedores y sus datos fiscales.", href: "/catalogs/providers", permission: "providers:read" }`.

#### Scenario: All five cards render for admin
- **WHEN** an admin with all five read permissions navigates to `/catalogs`
- **THEN** five cards render with all "Abrir" buttons enabled

#### Scenario: Provider card disabled without permission
- **WHEN** a user without `providers:read` navigates to `/catalogs`
- **THEN** the "Proveedores" card shows a disabled state with a tooltip "Requiere permiso providers:read"

#### Scenario: Provider card navigates to /catalogs/providers
- **WHEN** the user clicks the "Abrir" button on the "Proveedores" card
- **THEN** the browser navigates to `/catalogs/providers`

---

### Requirement: CatalogToolbar with optional server-side search scope
The `CatalogToolbar` component SHALL accept an optional prop `searchScope?: "client" | "server"` (default `"client"`). When `searchScope === "server"`, the toolbar SHALL render a caption "Búsqueda en servidor · 2+ caracteres" below the search input (styled `text-label-sm text-on-surface-variant`) to communicate to the user that the filter is applied by the backend, not the client. When `searchScope === "client"` (default), no caption is rendered, preserving the behavior of the four existing catalog screens (`payment-methods`, `folios`, `departments`, `branches`) which do not pass this prop.

#### Scenario: Default scope is client
- **WHEN** `CatalogToolbar` is rendered without a `searchScope` prop
- **THEN** no scope caption is rendered (existing four catalogs are unaffected)

#### Scenario: Server scope renders caption
- **WHEN** `CatalogToolbar` is rendered with `searchScope="server"` (as used by the providers screen)
- **THEN** the caption "Búsqueda en servidor · 2+ caracteres" appears below the search input

#### Scenario: Existing four catalogs do not pass searchScope
- **WHEN** the `payment-methods`, `folios`, `departments`, and `branches` pages render `CatalogToolbar`
- **THEN** they do NOT pass `searchScope` and the toolbar behavior is identical to the prior release
