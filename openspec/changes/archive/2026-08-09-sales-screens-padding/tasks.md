# sales-screens-padding — Tasks

## 1. Frontend — gutter global de 10px izq/top/der en todas las pantallas privadas

- [x] 1.1 `app/(private)/layout.tsx` — `<main>` global: `pl-[80px] pt-16` → `pl-[90px] pt-[74px] pr-2.5` (rail 80 + 10 izq; topbar 64 + 10 top; 10 der).
- [x] 1.2 `app/(private)/sales/_blocks/SalesListPage.tsx` — remover `pt-2.5` de los 4 contenedores raíz (loading/denied/error/contenido).
- [x] 1.3 `app/(private)/sales/_blocks/SaleDetailPage.tsx` — remover `pt-2.5` de los 3 contenedores raíz (loading/error/contenido `max-w-4xl mx-auto space-y-6`).
- [x] 1.4 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — remover `pt-2.5` de los 3 contenedores raíz (loading/error/contenido `w-full max-w-lg mx-auto space-y-4`).
- [x] 1.5 `app/(private)/pos/_blocks/PosPage.tsx` — root `flex flex-col h-[calc(100vh-64px)] pt-2.5` → `flex flex-col h-[calc(100vh-74px)]`; remover `pt-2.5` de loading/denied.
- [x] 1.6 `app/(private)/sales/_blocks/EditSalePage.tsx` — root `flex flex-col h-[calc(100vh-64px)] pt-2.5` → `flex flex-col h-[calc(100vh-74px)]`; remover `pt-2.5` de loading/no-encontrada/cancelada.
- [x] 1.7 `app/(private)/quotes/_blocks/QuoteCreatePage.tsx` y `app/(private)/quotes/_blocks/QuoteEditPage.tsx` — root `h-[calc(100vh-64px)]` → `h-[calc(100vh-74px)]` (mismo criterio que POS/edit).

## 2. Frontend — logo next/image sizes

- [x] 2.1 `app/_components/organisms/NavigationRail/NavigationRail.tsx` — logo `Image` (contenedor `w-12 h-12`): agregar `sizes="48px"`.
- [x] 2.2 `app/_components/organisms/TopAppBar/TopAppBar.tsx` — logo `Image` (contenedor `w-10 h-10`): agregar `sizes="40px"`.
- [x] 2.3 `app/(public)/auth/layout.tsx` — logo del login `Image` (contenedor responsivo `w-32/lg:w-56`): agregar `sizes="(min-width: 1024px) 224px, 128px"` (tercer logo `/logo.png` que también disparaba el warning).

## 3. Tests

- [x] 3.1 `PrivateLayout.test.tsx` — aserciones source del gutter global (`pl-[90px]`, `pt-[74px]`, `pr-2.5`).
- [x] 3.2 Actualización de casos de padding en `SalesListPage.padding.test.tsx`, `SaleDetailPage.test.tsx`, `TicketPreviewPage.test.tsx` (raíz sin `pt-2.5`).
- [x] 3.3 Actualización de `PosPage.test.tsx` y `EditSalePage.padding.test.tsx` (raíz sin `pt-2.5` + `h-[calc(100vh-74px)]`).
- [x] 3.4 Verificación browser (Playwright): rutas privadas con gutter de 10px izq/top/der en el contenedor raíz (`pl:90px`, `pt:74px`, `pr:10px` en 9 rutas); `/pos`, `/sales/:id/edit`, `/quotes/new`, `/quotes/:id/edit` sin overflow vertical (`hasVScroll: false`); sin warning `sizes` en consola en rutas privadas (0 warnings tras el fix 2.3).

## 4. Verificación

- [x] 4.1 `npx jest` — suite verde.
- [x] 4.2 `npm run build` — typecheck verde.
- [x] 4.3 Navegación browser sin warnings `sizes` en rutas privadas y sin overflow en pantallas full-height (verificado vía Playwright; ver 3.4).
