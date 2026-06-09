## MODIFIED Requirements

### Requirement: Catalogs hub page
The system SHALL expose a private route `/catalogs` that serves as a hub for the six catalog modules. The hub SHALL render a grid of six entry cards in this order: `payment-methods`, `folios`, `departments`, `branches`, `providers`, `products`. Each card SHALL display the catalog icon, title, a short description, and an "Abrir" link to `/catalogs/<módulo>`. Cards SHALL be visually marked as disabled when the current user lacks the corresponding `<recurso>:read` permission, and SHALL render normally otherwise. The hub itself SHALL be reachable by any authenticated user. The fifth (`providers`) card SHALL be `{ icon: "local_shipping", title: "Proveedores", description: "Gestiona los proveedores y sus datos fiscales.", href: "/catalogs/providers", permission: "providers:read" }`. The sixth (`products`) card SHALL be `{ icon: "inventory_2", title: "Productos", description: "Gestiona el catálogo de productos, precios y dosificaciones.", href: "/catalogs/products", permission: "products:read" }`.

#### Scenario: Authenticated user opens the hub
- **WHEN** an authenticated user navigates to `/catalogs`
- **THEN** the page SHALL render six entry cards (Formas de pago, Folios, Departamentos, Sucursales, Proveedores, Productos) with their icons and short descriptions

#### Scenario: Card states for missing permission
- **WHEN** the current user does not have `payment_methods:read`
- **THEN** the "Formas de pago" card SHALL render disabled with a tooltip "Requiere permiso payment_methods:read" and its link SHALL NOT navigate

#### Scenario: Providers card disabled without providers:read
- **WHEN** the current user does not have `providers:read`
- **THEN** the "Proveedores" card SHALL render disabled with a "Sin acceso" state

#### Scenario: Products card disabled without products:read
- **WHEN** the current user does not have `products:read`
- **THEN** the "Productos" card SHALL render disabled with a "Sin acceso" state

#### Scenario: Products card navigates to the products list
- **WHEN** the user holds `products:read` and clicks the "Productos" card
- **THEN** the router SHALL navigate to `/catalogs/products`

#### Scenario: Card click navigates to submodule
- **WHEN** the user clicks an enabled catalog card
- **THEN** the router SHALL navigate to `/catalogs/<módulo>` (e.g., `/catalogs/payment-methods` or `/catalogs/providers`)

#### Scenario: Unauthenticated request to hub
- **WHEN** a user without a valid `refreshToken` cookie navigates to `/catalogs`
- **THEN** the middleware SHALL redirect to `/auth/login` before rendering
