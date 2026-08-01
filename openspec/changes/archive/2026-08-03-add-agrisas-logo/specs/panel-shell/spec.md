## ADDED Requirements

### Requirement: Logo oficial de Agrisas en NavigationRail y TopAppBar

El `NavigationRail` SHALL mostrar el asset `logo.png` (servido desde `/public/logo.png`) en su header fijo, en lugar del placeholder tipográfico "A". El `TopAppBar` SHALL mostrar el mismo logo en lugar del texto "Agrisas" (no junto a él). El logo SHALL renderizarse manteniendo proporción (sin distorsión) y SHALL incluir un `alt` descriptivo.

#### Scenario: Logo en el header del NavigationRail
- **WHEN** un usuario autenticado visualiza cualquier ruta bajo `(private)`
- **THEN** el header fijo del `NavigationRail` muestra la imagen `logo.png` en lugar del texto "A"

#### Scenario: Logo reemplaza el texto en el TopAppBar
- **WHEN** un usuario autenticado visualiza cualquier ruta bajo `(private)`
- **THEN** el `TopAppBar` muestra únicamente la imagen `logo.png`; el `<h1>Agrisas</h1>` textual ya no se renderiza

#### Scenario: Logo mantiene proporción y no rompe layout
- **WHEN** se inspecciona el markup renderizado del `NavigationRail` y el `TopAppBar`
- **THEN** la imagen usa `object-contain` (o equivalente) dentro de su contenedor y no distorsiona ni desborda el layout existente

#### Scenario: Logo visible independientemente del rol
- **WHEN** un usuario con rol `admin`, `operator` o `viewer` visualiza el panel privado
- **THEN** el logo se muestra igual para los tres roles, sin depender de `useCurrentUser().can()`

### Requirement: Favicon global del sistema

El `app/layout.tsx` raíz SHALL declarar `metadata.icons` apuntando a `/logo.png`, de modo que el navegador use ese asset como favicon en toda la aplicación (rutas públicas y privadas).

#### Scenario: Favicon en la pestaña del navegador
- **WHEN** un usuario (autenticado o no) navega a cualquier ruta de la aplicación
- **THEN** la pestaña del navegador muestra `logo.png` como ícono, derivado de `metadata.icons` en `app/layout.tsx`
