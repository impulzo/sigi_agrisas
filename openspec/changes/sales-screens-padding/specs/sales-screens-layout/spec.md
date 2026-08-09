# sales-screens-layout

## ADDED Requirements

### Requirement: Sales screens top separation of 10px

El sistema SHALL renderizar el contenido de cada pantalla del módulo de ventas separado 10px del borde superior del área de contenido (`<main>`), vía `padding-top: 10px` (`pt-2.5` en Tailwind) en el contenedor raíz de la página. Aplica a: `/sales` (lista), `/sales/:id` (detalle), `/sales/:id/ticket` (vista de ticket), `/pos` (punto de venta) y `/sales/:id/edit` (edición). El espaciado SHALL aplicarse de forma consistente en los estados de carga, error y contenido normal. La separación NO SHALL alterar el espaciado relativo interno de cada pantalla (entre secciones) ni el layout de otros módulos (el `<main>` global del layout privado no cambia).

#### Scenario: Lista de ventas con separación superior

- **WHEN** el usuario navega a `/sales` y la lista carga
- **THEN** el contenedor raíz de `SalesListPage` tiene `padding-top: 10px` entre el borde superior de `main` y el primer elemento (título de la página)

#### Scenario: Detalle de venta con separación superior

- **WHEN** el usuario navega a `/sales/:id` (venta válida)
- **THEN** el contenedor raíz de `SaleDetailPage` tiene `padding-top: 10px` entre el borde superior de `main` y el header de la venta

#### Scenario: Vista de ticket con separación superior

- **WHEN** el usuario navega a `/sales/:id/ticket`
- **THEN** el contenedor raíz de `TicketPreviewPage` tiene `padding-top: 10px` entre el borde superior de `main` y el back link

#### Scenario: Punto de venta con separación superior sin overflow

- **WHEN** el usuario navega a `/pos` con una sucursal seleccionada
- **THEN** el contenedor raíz de `PosPage` tiene `padding-top: 10px` sobre el `h-[calc(100vh-64px)]` (con `box-sizing: border-box`, el padding se resta del height) de modo que el área de contenido llena el espacio bajo la topbar sin scroll vertical extra

#### Scenario: Edición de venta con separación superior sin overflow

- **WHEN** el usuario navega a `/sales/:id/edit` (venta editable)
- **THEN** el contenedor raíz de `EditSalePage` tiene `padding-top: 10px` sobre el `h-[calc(100vh-64px)]` (mismo criterio `border-box` que POS)

#### Scenario: Separación consistente en estados de carga y error

- **WHEN** una pantalla de ventas muestra su estado de carga (spinner) o de error
- **THEN** el contenedor raíz conserva el `padding-top: 10px` (la separación se aplica en el contenedor raíz, no en un nodo de estado interno)

### Requirement: Brand logo next/image sizes prop

El sistema SHALL renderizar los logos de marca `/logo.png` con `next/image` usando la prop `sizes` acorde al ancho de su contenedor: `sizes="48px"` en el `NavigationRail` (contenedor `w-12 h-12`) y `sizes="40px"` en el `TopAppBar` (contenedor `w-10 h-10`). Con esto el sistema NO SHALL emitir el warning de consola `Image with src "/logo.png" has "fill" but is missing "sizes" prop`. La prop SHALL agregarse sin cambiar la fuente de la imagen, la clase `object-contain` ni el modo `fill`.

#### Scenario: Sin warning sizes al navegar rutas privadas

- **WHEN** el usuario navega una ruta privada (ej. `/sales`)
- **THEN** la consola del navegador no muestra el warning `has "fill" but is missing "sizes" prop` para `/logo.png`

#### Scenario: Logos siguen renderizando correctamente

- **WHEN** el usuario navega una ruta privada
- **THEN** el logo `Agrisas` se muestra en `NavigationRail` (48px) y en `TopAppBar` (40px) con `object-contain`, sin cambios visuales
