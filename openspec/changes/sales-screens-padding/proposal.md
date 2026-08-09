# sales-screens-padding

## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Administrador | Como usuario que navega el módulo de ventas, quiero que el contenido de cada pantalla (lista, detalle, ticket, POS, edición) quede separado 10px de la parte superior para que el contenido no se pegue al borde superior | La revisión con el cliente detectó que el contenido de las pantallas de ventas queda pegado al borde superior del área de contenido | - AC1: `/sales`, `/sales/[id]`, `/sales/[id]/ticket`, `/pos` y `/sales/[id]/edit` muestran 10px de espacio entre el borde superior del área de contenido (`main`) y el primer elemento de la página<br>- AC2: La separación se aplica igual en estado de carga (spinner), error y contenido normal<br>- AC3: No cambia el layout interno de cada pantalla (mismo espaciado relativo entre secciones) | - CS1: El cambio es puramente presentacional; no altera fetch, permisos, branch scoping ni datos |
| 2 | Desarrollador | Como mantenedor del panel, quiero eliminar el warning de consola `Image with src "/logo.png" has "fill" but is missing "sizes" prop` en los logos de `NavigationRail` y `TopAppBar` para mantener la consola limpia y el rendimiento de `next/image` óptimo | El warning aparece en cada navegación de las rutas privadas y ensucia el diagnóstico de errores reales en consola | - AC1: Al navegar `/sales` (o cualquier ruta privada) la consola no muestra el warning de `sizes` para `/logo.png` en `NavigationRail` ni `TopAppBar`<br>- AC2: El logo se sigue renderizando con `fill` + `object-contain` sin cambios visuales | - CS1: Solo se agrega la prop `sizes` (valor acorde al contenedor); no se cambia la fuente ni el manejo de la imagen |

## Why

Durante la revisión del módulo de ventas el cliente pidió dos ajustes de presentación agrupados en un solo cambio: (1) separar 10px el contenido de todas las pantallas de venta del borde superior del área de contenido, y (2) limpiar el warning de consola generado por `next/image` en los dos logos de marca (NavigationRail y TopAppBar). El primero mejora la lectura visual del módulo más transitado del panel; el segundo es higiene de consola — el warning aparece en toda ruta privada y puede enmascarar errores reales al depurar (fue parte de la confusión inicial al diagnosticar "errores al cargar la pantalla de ventas", que resultaron ser 404 de chunks de un dev server stale de otra sesión, no del código).

## What Changes

- **`app/(private)/sales/_blocks/SalesListPage.tsx`** — contenedor raíz (`flex flex-col gap-6`): agregar `pt-2.5` (10px) para separar del borde superior.
- **`app/(private)/sales/_blocks/SaleDetailPage.tsx`** — contenedor raíz (`max-w-4xl mx-auto space-y-6`): agregar `pt-2.5`.
- **`app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx`** — contenedor raíz (`w-full max-w-lg mx-auto space-y-4`): agregar `pt-2.5`.
- **`app/(private)/pos/_blocks/PosPage.tsx`** — contenedor raíz (`flex flex-col h-[calc(100vh-64px)]`): agregar `pt-2.5` (ajustando la altura interna si aplica para no recortar contenido).
- **`app/(private)/sales/_blocks/EditSalePage.tsx`** — contenedor raíz (`flex flex-col h-[calc(100vh-64px)]`): agregar `pt-2.5` (mismo criterio que POS).
- **`app/_components/organisms/NavigationRail/NavigationRail.tsx`** — logo `Image` (línea ~155): agregar prop `sizes="48px"` (contenedor `w-12 h-12`).
- **`app/_components/organisms/TopAppBar/TopAppBar.tsx`** — logo `Image` (línea ~19): agregar prop `sizes="40px"` (contenedor `w-10 h-10`).

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `sales-screens-layout`: nueva capability (delta) que describe la separación superior de 10px en las pantallas del módulo de ventas y la ausencia del warning `sizes` en los logos.

## Impact

- **Frontend**: 7 archivos `tsx` (5 pantallas de ventas + 2 logos). Sin cambios de lógica, sin backend, sin RBAC, sin branch scoping.
- **Tests**: casos unitarios nuevos/actualizados en `tests/unit/ui/(private)/sales/` para el `pt-2.5` de las pantallas de ventas (aserciones de className), y verificación visual en browser (Playwright) de que no hay warning `sizes`.
- **Specs**: delta de `sales-screens-layout`.
