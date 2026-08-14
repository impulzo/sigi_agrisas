## 1. Tokens

- [x] 1.1 `tailwind.config.ts` `fontSize`: añadir `display-md` 45/52/400, `display-sm` 36/44/400, `headline-md` 28/36/600, `headline-sm` 24/32/600, `title-lg` 22/28/500, `title-sm` 14/20/0.1px/500, `body-sm` 13/18/0.25px/400, `label-md` 12/16/0.5px/500. No tocar los 8 existentes.
- [x] 1.2 `tailwind.config.ts` `borderRadius`: `sm .25rem / DEFAULT .5rem / md .75rem / lg 1rem / xl 1.5rem / full 9999px`.
- [x] 1.3 `tailwind.config.ts` `boxShadow`: `elevation-1`, `elevation-2`, `elevation-3` (ambientales suaves).
- [x] 1.4 `app/globals.css`: bloque `:root` con el set M3 completo como tripletas RGB, para que `rgb(var(--md-sys-color-outline-variant))` de `.scrollbar-thin` resuelva.

## 2. Barrido de radios

- [x] 2.1 Codemod de una sola pasada en el scratchpad (no se commitea): `rounded`→`rounded-sm`, `rounded-sm`→`rounded-sm`, `rounded-md`→`rounded`, `rounded-lg`→`rounded`, `rounded-xl`→`rounded-md`, `rounded-2xl`→`rounded-lg`; `rounded-full` intacto. Cubrir direccionales (`rounded-r-xl`) y prefijos de variante (`hover:`, `sm:`).
- [x] 2.2 Ejecutar sobre `app/**/*.tsx` y `app/**/*.css`; verificar el conteo antes/después y que no quede ningún `rounded-2xl`/`rounded-3xl`.

## 3. Primitivas

- [x] 3.1 `app/_components/organisms/PageShell/PageShell.tsx` — props `{ title, description?, backHref?, actions?, toolbar?, width?: "default"|"narrow"|"full", children }`; exporta también `PageHeader`; barrel `index.ts`.
- [x] 3.2 `app/(private)/layout.tsx`: `<main>` pasa a `pl-20 pt-16 h-full overflow-y-auto`.
- [x] 3.3 `app/_components/atoms/Button/Button.tsx` — reescritura: 5 variantes × 3 tamaños, `loading`, `icon`/`iconPosition`, pill, tokenizado. Borrar `Button.module.css`. Añadir barrel.
- [x] 3.4 `app/_components/molecules/DataTable/` — `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`, con `align="right"` → `text-right tabular-nums`. Barrel.
- [x] 3.5 `app/_components/atoms/Input/Input.tsx` retokenizado; borrar `Input.module.css`. `molecules/FormField/FormField.tsx` retokenizado; borrar `FormField.module.css`.
- [x] 3.6 `app/_components/atoms/Select/Select.tsx` nuevo — mismo contrato visual que `Input`, chevron Material Symbols. Barrel.
- [x] 3.7 `app/_components/molecules/PageLoading/PageLoading.tsx` — sustituye los 9 `h-[60vh]` copiados.
- [x] 3.8 `Card.tsx`: `tone="default"` pasa a `rounded-lg` (1rem, según Stitch para tarjetas y diálogos).
- [x] 3.9 Correcciones puntuales: `SegmentedButton.tsx` `text-label-large`→`text-label-lg`; `QuoteDetailPage.tsx` `text-[20px]`→`size={20}` (3 sitios); `CreatePurchasePage.tsx` y `SatInvoiceUploader.tsx` `material-symbols-rounded`→`-outlined`; `Chip` `tone="warning"` deja de colisionar con `Badge variant="write"`.
- [~] 3.10 `Combobox.tsx` alineado al contrato de `Input`. `SatCatalogCombobox.tsx` **no tocado**: no tiene clases base propias (pasa `className` crudo), pero sus 4 usos actuales ya pasan className tokenizado — riesgo bajo, deuda de arquitectura declarada (ver reporte de verificación).

## 4. Migración — listados

- [x] 4.1 `sales`, `quotes`, `returns`, `payments`, `purchases`, `billing`, `waybills`: `CatalogShell`→`PageShell`, `<table>`→`DataTable`, CTAs→`<Button>`. En `sales` se quitó el `<div>` envoltorio redundante; en `billing` los CTAs pasan de `toolbar` a `actions`.
- [x] 4.2 8 sub-catálogos (`branches`, `customers`, `departments`, `folios`, `payment-methods`, `products`, `providers`, `tax-rates`): mismo patrón.
- [x] 4.3 Duplicadores del shell → `PageShell`: `InventoryPage`, `UsersPage`, `RolesPage`, `CatalogsHubPage`.
- [x] 4.4 Eliminados los `layout.tsx` de `catalogs`, `roles` y `users` que duplicaban `px-gutter py-lg max-w-screen-2xl mx-auto`.

## 5. Migración — detalles, reports, POS, settings

- [x] 5.1 Páginas de detalle → ancho unificado `max-w-4xl` (payments pasó de `max-w-3xl`), header bespoke preservado (folio en mono + badges inline no caben en `PageHeader.title: string`): `SaleDetailPage`, `QuoteDetailPage`, `PaymentDetailPage`, `PurchaseDetailPage`, `InvoiceDetailPage`, `WaybillDetailPage`, `ReturnDetailPage`. `QuoteDetailPage` título bajado de `headline-md` a `headline-sm` para igualar al resto.
- [x] 5.2 Reports — las 9 rutas: quitado `space-y-4 max-w-{5,6,7}xl mx-auto px-4 py-6`, usan `PageShell backHref="/reports"` (Ledger usa la geometría raíz de `PageShell` a mano, sin su header, por header bespoke con KPIs del cliente).
- [x] 5.3 Reports — tablas a `DataTable` en `PurchasesTable.tsx`, `ProviderPaymentsTable.tsx`, `cash-cut/CollectionsRowsTable.tsx`, `PriceListTable.tsx` — consts de `th`/`td` eliminadas.
- [x] 5.4 Reports — botones de exportar migrados a `<Button>`; tarjetas KPI/totales migradas a `<Card>` en `sales-cut/TotalsCards.tsx`, `cash-cut/TotalsCards.tsx`, `sales-by-product/SalesByProductPage.tsx`, `LedgerHeader.tsx`, `customer-collections/CustomerCollectionsPage.tsx` (6 tiles, 5 archivos — hallazgo de `/opsx:verify`, corregido).
- [x] 5.5 `PosPage` → `width="full"` (ya lo era). `PosHeader` título subido de `text-title-md` a **`text-title-lg`**, no `text-headline-lg` como decía la tarea original: `headline-lg` (32px/40px) no cabe en la barra compacta de 1 fila (`px-4 py-3`) junto al selector de sucursal y el `SegmentedButton`. Desviación deliberada, documentada en `designer.md` § Recetas cerradas ("Editor full-bleed").
- [x] 5.6 `SettingsPage` → `PageShell width="narrow"`.
- [x] 5.7 Borrado `CatalogShell.tsx` — cero referencias residuales en `app/` ni `tests/`.

## 6. Documentación

- [x] 6.1 `designer.md` en la raíz — origen Stitch, paleta, escala tipográfica, spacing, radios, elevación, catálogo de primitivas, recetas cerradas, prohibiciones, desviaciones registradas (incluye la nota técnica de `cn()`/`tailwind-merge`, no prevista originalmente).
- [x] 6.2 `openspec/specs/design-system/spec.md` — requisitos en formato verificable, incluida la corrección de la regla de panel de `PageShell` (sólo con `toolbar`) hecha durante la implementación.
- [x] 6.3 `CLAUDE.md` — sección "Sistema de diseño" añadida.

## 7. Tests

- [x] 7.1 5 snapshots regenerados con `npx jest -u --selectProjects ui` (dos pasadas: una tras el retokenizado, otra tras el fix de `cn()`).
- [x] 7.2 `tests/unit/ui/_components/organisms/PageShell.test.tsx`.
- [x] 7.3 `tests/unit/ui/_components/atoms/Button.test.tsx` extendido con matriz 5×3 + loading + icon.
- [x] 7.4 `tests/unit/ui/_components/molecules/DataTable.test.tsx`.
- [x] 7.5 `tests/unit/ui/_components/atoms/Select.test.tsx`.
- [x] 7.6 `tests/unit/ui/design-system/tokens.test.ts` — guardarraíl; allowlist de 145 archivos (no 69 como se estimó al planear; recalculada con scan multilínea real). Encontró y permitió corregir 2 bugs preexistentes (`text-label-xs` inexistente en `PaymentsToolbar.tsx`; colisión de `tailwind-merge` con la escala tipográfica custom).
- [x] 7.7 `playwright.config.ts` con `command: "npm run dev -- --port 3001"`; `"test:e2e": "playwright test"` en `package.json`.
- [x] 7.8 `tests/e2e/design-system.spec.ts` escrito con las 5 aserciones especificadas.
- [x] 7.9 `npm run build` ✅, `npm test` (UI 251/251, backend sin regresión) ✅, `npx playwright test tests/e2e/design-system.spec.ts` contra servidor dev + DB real: **5/5 verde** (`el h1 de las páginas de listado mide 32px`, `los encabezados de tabla miden 11px en mayúsculas y las celdas 13px`, `el CTA primario de cada ruta usa el mismo color y forma pill`, `ningún elemento con clase text-body-sm renderiza a 16px`, `el contenedor de página tiene el mismo padding en todas las rutas`). Se ajustó el timeout de la prueba de padding (10 navegaciones con compile en frío del dev server superaban el timeout default de 30s de Playwright) — no era un bug de la app.
