# sales-screens-padding — Tasks

## 1. Frontend — separación superior 10px en pantallas de ventas

- [x] 1.1 `app/(private)/sales/_blocks/SalesListPage.tsx` — agregar `pt-2.5` al contenedor raíz (`flex flex-col gap-6`).
- [x] 1.2 `app/(private)/sales/_blocks/SaleDetailPage.tsx` — agregar `pt-2.5` al contenedor raíz (`max-w-4xl mx-auto space-y-6`).
- [x] 1.3 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — agregar `pt-2.5` al contenedor raíz (`w-full max-w-lg mx-auto space-y-4`).
- [x] 1.4 `app/(private)/pos/_blocks/PosPage.tsx` — root (`flex flex-col h-[calc(100vh-64px)]`): agregar `pt-2.5` (con `box-sizing: border-box` el padding no suma al height; sin overflow, verificado en browser).
- [x] 1.5 `app/(private)/sales/_blocks/EditSalePage.tsx` — root (`flex flex-col h-[calc(100vh-64px)]`): agregar `pt-2.5` (mismo criterio que POS).

## 2. Frontend — logo next/image sizes

- [x] 2.1 `app/_components/organisms/NavigationRail/NavigationRail.tsx` — logo `Image` (contenedor `w-12 h-12`): agregar `sizes="48px"`.
- [x] 2.2 `app/_components/organisms/TopAppBar/TopAppBar.tsx` — logo `Image` (contenedor `w-10 h-10`): agregar `sizes="40px"`.

## 3. Tests

- [x] 3.1 Tests unitarios: aserciones de `pt-2.5` en `SalesListPage` (`SalesListPage.padding.test.tsx` nuevo), `SaleDetailPage`, `TicketPreviewPage`, `PosPage` y `EditSalePage` (`EditSalePage.padding.test.tsx` nuevo).
- [x] 3.2 Verificación browser: `/sales`, `/sales/:id`, `/sales/:id/ticket`, `/pos` y `/sales/:id/edit` sin warning `sizes` en consola (0 errores, 0 warnings) y con `padding-top: 10px` en el contenedor raíz; POS/edit sin overflow vertical.

## 4. Verificación

- [x] 4.1 `npx jest` — suite verde (173 suites, 1189 tests).
- [x] 4.2 `npm run build` — typecheck verde.
- [x] 4.3 Navegación browser sin warnings `sizes` en rutas privadas.
- [x] 4.4 `npx playwright test sales-ticket-print` — e2e verde (3/3); el rework del ticket no se ve afectado por el padding.
- [x] 4.5 Root cause de "errores al cargar la pantalla de ventas": dev server stale por colisión `.next` con `npm run build` en paralelo (chunks 404). No es bug de código; se resuelve reiniciando el dev server. Documentado en este change.

