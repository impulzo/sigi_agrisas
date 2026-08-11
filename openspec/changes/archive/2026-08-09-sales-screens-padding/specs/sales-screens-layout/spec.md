# sales-screens-layout

## ADDED Requirements

### Requirement: All private screens 10px left/top/right gutter

El sistema SHALL renderizar el contenido de cada pantalla del panel privado separado 10px de los bordes superior, izquierdo y derecho del área de contenido (`<main>`), vía `padding` en el contenedor raíz del layout privado (`app/(private)/layout.tsx`): `padding-left: 90px` (`pl-[90px]` = rail 80px + gutter 10px), `padding-top: 74px` (`pt-[74px]` = topbar 64px + gutter 10px) y `padding-right: 10px` (`pr-2.5`). Aplica a TODAS las rutas privadas: `/dashboard`, `/pos`, `/sales`, `/quotes`, `/inventory`, `/catalogs`, `/users`, `/roles`, `/returns`, `/payments`, `/billing`, `/reports`, `/purchases`, `/waybills`, `/settings`, etc. El espaciado SHALL aplicarse de forma consistente en los estados de carga, error y contenido normal. La separación NO SHALL alterar el espaciado relativo interno de cada pantalla (entre secciones); los contenedores raíz de las pantallas NO SHALL duplicar el gutter superior (no `pt-2.5` en páginas).

#### Scenario: Gutter global definido en el layout privado

- **WHEN** el usuario navega cualquier ruta privada
- **THEN** el `<main>` del layout privado (`app/(private)/layout.tsx`) tiene `padding-left: 90px`, `padding-top: 74px` y `padding-right: 10px`, de modo que el primer elemento de la página queda 10px separado de los bordes izq/superior/der del área de contenido

#### Scenario: Pantallas de ventas sin doble gutter superior

- **WHEN** el usuario navega `/sales`, `/sales/:id`, `/sales/:id/ticket`, `/pos` o `/sales/:id/edit`
- **THEN** el contenedor raíz de `SalesListPage`, `SaleDetailPage`, `TicketPreviewPage`, `PosPage` y `EditSalePage` NO tiene `padding-top: 10px` (`pt-2.5`) propio, evitando apilar 20px con el gutter global del layout

#### Scenario: Pantallas full-height sin overflow vertical

- **WHEN** el usuario navega `/pos`, `/sales/:id/edit`, `/quotes/new` o `/quotes/:id/edit`
- **THEN** el contenedor raíz de `PosPage`, `EditSalePage`, `QuoteCreatePage` y `QuoteEditPage` usa `height: calc(100vh - 74px)` de modo que el área de contenido llena el espacio bajo la topbar y el gutter superior (74px) sin scroll vertical extra

#### Scenario: Separación consistente en estados de carga y error

- **WHEN** una pantalla del panel muestra su estado de carga (spinner) o de error
- **THEN** el gutter global del layout se mantiene (la separación vive en el `<main>`, no en un nodo de estado interno de la página)

### Requirement: Brand logo next/image sizes prop

El sistema SHALL renderizar los logos de marca `/logo.png` con `next/image` usando la prop `sizes` acorde al ancho de su contenedor: `sizes="48px"` en el `NavigationRail` (contenedor `w-12 h-12`), `sizes="40px"` en el `TopAppBar` (contenedor `w-10 h-10`) y `sizes="(min-width: 1024px) 224px, 128px"` en el login (`app/(public)/auth/layout.tsx`, contenedor responsivo `w-32 h-32 lg:w-56 lg:h-56`). Con esto el sistema NO SHALL emitir el warning de consola `Image with src "/logo.png" has "fill" but is missing "sizes" prop`. La prop SHALL agregarse sin cambiar la fuente de la imagen, la clase `object-contain` ni el modo `fill`.

#### Scenario: Sin warning sizes al navegar rutas privadas y login

- **WHEN** el usuario navega una ruta privada (ej. `/sales`) o `/auth/login`
- **THEN** la consola del navegador no muestra el warning `has "fill" but is missing "sizes" prop` para `/logo.png`

#### Scenario: Logos siguen renderizando correctamente

- **WHEN** el usuario navega una ruta privada o el login
- **THEN** el logo `Agrisas` se muestra en `NavigationRail` (48px), en `TopAppBar` (40px) y en el login (128px/224px responsivo) con `object-contain`, sin cambios visuales
