# sales-screens-padding

## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Administrador | Como usuario que navega el panel administrativo, quiero que el contenido de cada pantalla quede separado 10px del borde superior y 10px de los bordes laterales del área de contenido para que el contenido no se pegue a los bordes | La revisión con el cliente detectó que el contenido de las pantallas del panel queda pegado al borde superior y a los bordes laterales del área de contenido | - AC1: Todas las rutas privadas (`/dashboard`, `/pos`, `/sales`, `/quotes`, `/inventory`, `/catalogs`, `/users`, `/roles`, `/returns`, `/payments`, `/billing`, `/reports`, `/purchases`, `/waybills`, `/settings`, etc.) muestran 10px de espacio entre los bordes superior/izquierdo/derecho del área de contenido (`main`) y el contenido de la página<br>- AC2: La separación se aplica igual en estado de carga (spinner), error y contenido normal<br>- AC3: No cambia el layout interno de cada pantalla (mismo espaciado relativo entre secciones); el padding se aplica en el `<main>` global del layout privado, no en los contenedores de cada página | - CS1: El cambio es puramente presentacional; no altera fetch, permisos, branch scoping ni datos |
| 2 | Desarrollador | Como mantenedor del panel, quiero eliminar el warning de consola `Image with src "/logo.png" has "fill" but is missing "sizes" prop` en los logos de `NavigationRail`, `TopAppBar` y del login para mantener la consola limpia y el rendimiento de `next/image` óptimo | El warning aparece en cada navegación (rutas privadas y login) y ensucia el diagnóstico de errores reales en consola | - AC1: Al navegar una ruta privada o `/auth/login` la consola no muestra el warning de `sizes` para `/logo.png`<br>- AC2: El logo se sigue renderizando con `fill` + `object-contain` sin cambios visuales | - CS1: Solo se agrega la prop `sizes` (valor acorde al contenedor); no se cambia la fuente ni el manejo de la imagen |

## Why

Durante la revisión del módulo de ventas el cliente pidió separar 10px el contenido de las pantallas de los bordes del área de contenido. Ampliado a TODO el panel administrativo (todas las rutas privadas): padding uniforme de 10px en los bordes superior, izquierdo y derecho. Además se limpia el warning de consola generado por `next/image` en los dos logos de marca (NavigationRail y TopAppBar) — el warning aparece en toda ruta privada y puede enmascarar errores reales al depurar.

## What Changes

- **`app/(private)/layout.tsx`** — `<main>` global del layout privado: `pl-[80px] pt-16` → `pl-[90px] pt-[74px] pr-2.5`. Cubre de forma uniforme TODAS las pantallas privadas en todos los estados (normal, carga, error, sin permisos). `pl-[90px]` = rail 80px + 10px de gutter izquierdo; `pt-[74px]` = topbar 64px + 10px de gutter superior; `pr-2.5` = 10px de gutter derecho.
- **`app/(private)/sales/_blocks/SalesListPage.tsx`** — remover `pt-2.5` de los 4 contenedores raíz (estados loading/denied/error + contenido), para no apilar con el gutter global del layout.
- **`app/(private)/sales/_blocks/SaleDetailPage.tsx`** — remover `pt-2.5` de los 3 contenedores raíz (loading, error, contenido `max-w-4xl mx-auto space-y-6`).
- **`app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx`** — remover `pt-2.5` de los 3 contenedores raíz (loading, error, contenido `w-full max-w-lg mx-auto space-y-4`).
- **`app/(private)/pos/_blocks/PosPage.tsx`** — root `flex flex-col h-[calc(100vh-64px)] pt-2.5` → `flex flex-col h-[calc(100vh-74px)]` (el gutter global ya reserva el top; el calc se recalcula para no recortar contenido); remover `pt-2.5` de los estados loading/denied.
- **`app/(private)/sales/_blocks/EditSalePage.tsx`** — root `flex flex-col h-[calc(100vh-64px)] pt-2.5` → `flex flex-col h-[calc(100vh-74px)]`; remover `pt-2.5` de los estados loading/no-encontrada/cancelada.
- **`app/(private)/quotes/_blocks/QuoteCreatePage.tsx`** y **`app/(private)/quotes/_blocks/QuoteEditPage.tsx`** — root `flex flex-col h-[calc(100vh-64px)]` → `flex flex-col h-[calc(100vh-74px)]` (mismo criterio: el `main` global ahora reserva 74px en vez de 64px).
- **`app/_components/organisms/NavigationRail/NavigationRail.tsx`** — logo `Image` (línea ~155): agregar prop `sizes="48px"` (contenedor `w-12 h-12`).
- **`app/_components/organisms/TopAppBar/TopAppBar.tsx`** — logo `Image` (línea ~19): agregar prop `sizes="40px"` (contenedor `w-10 h-10`).
- **`app/(public)/auth/layout.tsx`** — logo del login `Image` (línea 13, contenedor responsivo `w-32 h-32 lg:w-56 lg:h-56`): agregar prop `sizes="(min-width: 1024px) 224px, 128px"`. Tercer logo `/logo.png` que también disparaba el warning `sizes` (se detectó al verificar en browser).

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `sales-screens-layout`: nueva capability (delta) que describe el gutter de 10px superior/izquierdo/derecho en todas las pantallas del panel privado (vía `<main>` del layout) y la ausencia del warning `sizes` en los logos.

## Impact

- **Frontend**: 12 archivos `tsx` (1 layout + 5 pantallas de ventas + 2 pantallas de cotizaciones + 3 logos + EditSalePage/PosPage compartidos ya contados). Sin cambios de lógica, sin backend, sin RBAC, sin branch scoping.
- **Tests**: `PrivateLayout.test.tsx` (aserciones source del gutter global) + actualización de casos en `tests/unit/ui/(private)/sales/` y `tests/unit/ui/(private)/pos/` (raíz sin `pt-2.5`; `h-[calc(100vh-74px)]`). Verificación visual en browser de que no hay warning `sizes` ni overflow en pantallas full-height.
- **Specs**: delta de `sales-screens-layout`.
