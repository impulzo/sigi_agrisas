## 1. Atoms / shared prerequisites

- [x] 1.1 Registrar iconos faltantes en `app/_components/atoms/Icon/icons.ts`: `request_quote`, `task_alt`, `swap_horiz`, `update` (los demás ya existen). Smoke test que renderiza cada uno como `<span class="material-symbols-outlined">`.
- [x] 1.2 Mover `useFoliosOptions` y `usePaymentMethodsOptions` de `app/(private)/pos/_logic/hooks/` a `app/_hooks/`. Re-exportar desde la ubicación antigua con `export { useFoliosOptions } from "../../../../_hooks/useFoliosOptions"` para no romper imports existentes hasta migrar consumidores. Tests existentes deben seguir pasando.
- [x] 1.3 Actualizar imports en `PosPage`/`CartPanel` (y cualquier otro consumidor) para apuntar a `app/_hooks/`. Eliminar los re-exports temporales una vez migrado todo.
- [x] 1.4 Crear `app/_components/molecules/SegmentedButton/SegmentedButton.tsx` (presentational): props `{ value, options: Array<{ value, label, icon? }>, onChange, disabled?, "aria-label" }`. Usa `role="tablist"` + `role="tab"`; selección con `bg-secondary-container text-on-secondary-container`. Snapshot test + click test.

## 2. Quotes `_logic/` — tipos, errores

- [x] 2.1 Crear `app/(private)/quotes/_logic/types/api.ts` con DTOs HTTP: `QuoteDto`, `QuoteDetailDto`, `QuoteItemDto`, `QuoteItemInputBody`, `CreateQuoteBody`, `UpdateQuoteBody`, `AuthorizeQuoteBody`, `CancelQuoteBody`, `ConvertQuoteBody`. Importar `SaleDetailDto` desde `app/(private)/sales/_logic/types/api.ts` para tipar la respuesta de `convertQuote`.
- [x] 2.2 Crear `app/(private)/quotes/_logic/types/domain.ts`: `Quote` (con `Date` instances), `QuoteItem`, `QuoteListFilters` (`{ page, pageSize, branchId?, customerId?, status?, from?, to?, search? }`).
- [x] 2.3 Crear `app/(private)/quotes/_logic/errors.ts`: `QuoteNotFoundError`, `QuoteNotEditableError(status)`, `QuoteAlreadyCancelledError`, `QuoteAlreadyConvertedError(saleId)`, `QuoteExpiredError`, `CustomerInactiveError`, `BranchInactiveError`, `FolioInactiveError`, `PaymentMethodInactiveError`, `ProductInactiveError`, `ProductPriceMismatchError`, `EmptyQuoteError`, `QuoteScopingForbiddenError`, `QuoteCreateForbiddenError`, `QuoteWriteForbiddenError`, `QuoteAuthorizeForbiddenError`, `QuoteCancelForbiddenError`, `QuoteConvertForbiddenError`.

## 3. Quotes `_logic/` — servicios

- [x] 3.1 Crear `_logic/services/_mappers.ts` con `mapDtoToQuote(dto: QuoteDto): Quote` y `mapDtoToQuoteDetail(dto: QuoteDetailDto): QuoteDetail` (parsean ISO → Date para `createdAt`, `updatedAt`, `authorizedAt`, `cancelledAt`, `convertedAt`, `expiresAt`).
- [x] 3.2 Crear `_logic/services/listQuotes.ts` — `GET /api/v1/admin/quotes?...`, acepta `fetchImpl?`, devuelve `{ items: Quote[], total: number, page: number, pageSize: number }`.
- [x] 3.3 Crear `_logic/services/getQuote.ts` — `GET /api/v1/admin/quotes/:id`, mapea 404 → `QuoteNotFoundError`.
- [x] 3.4 Crear `_logic/services/createQuote.ts` — `POST /api/v1/admin/quotes`. Mapea 400 (inactive customer/branch/folio/product, price mismatch, empty items) y 403 (scoping/forbidden) a errores tipados.
- [x] 3.5 Crear `_logic/services/updateQuote.ts` — `PATCH /api/v1/admin/quotes/:id`. Mapea 409 con `status` → `QuoteNotEditableError(status)`.
- [x] 3.6 Crear `_logic/services/authorizeQuote.ts` — `POST /api/v1/admin/quotes/:id/authorize`. Mapea 409 "expired" → `QuoteExpiredError`; 409 status → `QuoteNotEditableError`.
- [x] 3.7 Crear `_logic/services/cancelQuote.ts` — `DELETE /api/v1/admin/quotes/:id`. Mapea 409 "already cancelled" → `QuoteAlreadyCancelledError`; 409 con `saleId` → `QuoteAlreadyConvertedError(saleId)`.
- [x] 3.8 Crear `_logic/services/convertQuote.ts` — `POST /api/v1/admin/quotes/:id/convert`. Mapea 409 expired → `QuoteExpiredError`; 409 status → `QuoteNotEditableError`; 400 fiscal folio/payment method inactivo. Devuelve `Sale` (parseando dates).
- [x] 3.9 Crear `_logic/services/index.ts` que re-exporta todos los servicios para imports limpios.

## 4. Quotes `_logic/` — schemas Zod

- [x] 4.1 Crear `_logic/schemas/createQuote.schema.ts` (valida `branchId`/`customerId`/`folioId` UUID, `items.length >= 1`, `quantity > 0`, `expiresAt >= tomorrow` cuando presente).
- [x] 4.2 Crear `_logic/schemas/convertQuote.schema.ts` (`paymentMethodId` UUID requerido, `folioId` UUID requerido, `notes?` max 1000).
- [x] 4.3 Crear `_logic/schemas/cancelQuote.schema.ts` (`reason?` max 500).
- [x] 4.4 Crear `_logic/schemas/authorizeQuote.schema.ts` (`notes?` max 1000).

## 5. Quotes `_logic/` — hooks

- [x] 5.1 Crear `_logic/hooks/useQuotesList.ts`: maneja `filters` (estado, sucursal, fechas, search), `AbortController` para cancelar requests obsoletos, debounce de 300 ms para `search`, exposes `{ items, total, page, isLoading, error, refresh }`.
- [x] 5.2 Crear `_logic/hooks/useQuoteDetail.ts`: carga por id, cancel-on-unmount, expone `{ quote, isLoading, error, refresh }`.
- [x] 5.3 Crear `_logic/hooks/useQuoteMutations.ts`: `{ isSaving, authorize, cancel, convert, update }`; cada función dispara `onChange?` tras éxito.
- [x] 5.4 Crear `_logic/hooks/useQuoteSubmission.ts`: paralelo de `useSaleSubmission`; expone `{ status, quote, error, submit, reset }` para `/quotes/new` y para el modo `quote` del POS.

## 6. Quotes UI — bloques compartidos

- [x] 6.1 Crear `app/(private)/quotes/_blocks/QuoteStatusBadge.tsx` — pill con punto coloreado; mapea `{ status, isExpired }` → label + tokens (tabla de la decisión 11 del design).
- [x] 6.2 Crear `app/(private)/quotes/_blocks/QuoteItemsTable.tsx` — tabla con columnas: `Código` (mono), `Producto`, `Tier`, `Cant.`, `Precio`, `Desc.`, `IVA`, `IEPS`, `Subtotal`, `Total línea` (tabular-nums). Reutiliza estructura de `SaleItemsTable`.
- [x] 6.3 Crear `app/(private)/quotes/_blocks/QuoteEmitPanel.tsx` — panel derecho para `/quotes/new` y `/quotes/[id]/edit`: selectores de sucursal/folio/cliente (en edit: disabled), `expiresAt` date input, `notes` textarea, `CartLinesList`, `CartTotals`, CTA "Crear cotización"/"Guardar cambios".

## 7. Quotes UI — listado

- [x] 7.1 Crear `app/(private)/quotes/page.tsx` (Server Component): exporta `metadata`, importa `QuotesListPage` como client component.
- [x] 7.2 Crear `_blocks/QuotesListPage.tsx` — guard `can("quotes:read")`, orquesta `useQuotesList`, renderiza `CatalogShell` + `QuotesToolbar` + `QuotesTable` + `CatalogPagination`. Maneja `CatalogEmpty` y `CatalogError`.
- [x] 7.3 Crear `_blocks/QuotesToolbar.tsx` — `SearchInput` (debounce 300 ms, badge "Búsqueda en servidor · 2+ caracteres"), `<select>` de estado (`Todas|Borrador|Autorizada|Convertida|Cancelada|Vencida`), `<select>` de sucursal (oculto sin bypass), `<input type="date">` from/to.
- [x] 7.4 Crear `_blocks/QuotesTable.tsx` — render tabla con columnas según decisión 10 del design; fila warning-tint cuando `isExpired`; columna `Sucursal` oculta sin bypass.
- [x] 7.5 Crear `_blocks/QuotesEmpty.tsx` — `EmptyState` + CTA "Nueva cotización" condicional a `can("quotes:create")`.

## 8. Quotes UI — crear

- [x] 8.1 Crear `app/(private)/quotes/new/page.tsx` (Server Component): exporta `metadata`, importa `QuoteCreatePage` client component.
- [x] 8.2 Crear `_blocks/QuoteCreatePage.tsx` — guard `can("quotes:create")`, orquesta layout split-pane (catálogo izquierda, `QuoteEmitPanel` derecha). Reusa `ProductCatalogPanel`, `PriceTierPicker`, `CustomerPicker`, `CustomerQuickAddModal`, `CartLinesList`, `CartTotals`. Submit vía `useQuoteSubmission`. Tras 201 → `router.push("/quotes/[id]")`. Toasts para errores 400/403.

## 9. Quotes UI — detalle

- [x] 9.1 Crear `app/(private)/quotes/[id]/page.tsx` (Server Component): exporta `metadata` con `params.id`, importa `QuoteDetailPage`.
- [x] 9.2 Crear `_blocks/QuoteDetailPage.tsx` — orquesta `useQuoteDetail` + `useQuoteMutations`; renderiza header, metadata grid, items table, totals, `QuoteActionsBar`. Maneja el banner `isExpired` y el banner de cancelación.
- [x] 9.3 Crear `_blocks/QuoteActionsBar.tsx` — botones contextuales por `(status, isExpired, can(...))` según tabla del design. Mostrar spinner durante `"loading"` permission checks.
- [x] 9.4 Crear `_blocks/AuthorizeQuoteModal.tsx` — campo `notes?`, submit `authorize(id, { notes? })`. Maneja 409 expired (inline) y 409 status (toast + refresh).
- [x] 9.5 Crear `_blocks/CancelQuoteModal.tsx` — campo `reason?`, submit `cancel(id, { reason? })`. Maneja 409 already cancelled (close + refresh) y 409 converted (deep-link a `/sales/[saleId]`).
- [x] 9.6 Crear `_blocks/ConvertQuoteModal.tsx` — selectores obligatorios `paymentMethodId` y `folioId` (fiscal), `notes?` opcional. Submit `convert(id, body)` → en 200 navega a `/sales/[saleId]`. Maneja 409 expired/status, 400 inactive folio/payment method.

## 10. Quotes UI — editar

- [x] 10.1 Crear `app/(private)/quotes/[id]/edit/page.tsx` (Server Component): importa `QuoteEditPage`.
- [x] 10.2 Crear `_blocks/QuoteEditPage.tsx` — guard `can("quotes:write")`, carga la cotización via `useQuoteDetail`; si `status !== 'draft'` muestra error inline y redirige a `/quotes/[id]` tras 2 s. Reusa `QuoteEmitPanel` con `mode="edit"` (folio/branch/customer disabled). Submit `update(id, body)`. Maneja 409 status mid-flight (toast + redirect).

## 11. POS — modo "Cotizar"

- [x] 11.1 Modificar `app/(private)/pos/_blocks/PosHeader.tsx` para aceptar prop `mode: "sale" | "quote"`, `onModeChange: (mode) => void`, `canQuote: boolean`. Renderiza `SegmentedButton` "Venta | Cotización" sólo si `canQuote`. Al cambiar de modo con carrito no vacío, abre `ConfirmDialog` "Se eliminarán las líneas actuales del carrito".
- [x] 11.2 Modificar `app/(private)/pos/_blocks/CartPanel.tsx` para aceptar prop `mode: "sale" | "quote"`, `expiresAt`/`onExpiresAtChange`. En `mode="quote"` oculta `paymentMethodId`, renderiza date input `expiresAt` (min: mañana, max: +180 días), cambia CTA a "Crear cotización" con `bg-secondary-container text-on-secondary-container`. Default prop `mode="sale"` para retrocompatibilidad.
- [x] 11.3 Modificar `app/(private)/pos/_blocks/PosPage.tsx` para sostener estado `mode`, conmutar entre `useSaleSubmission` y `useQuoteSubmission`, pasar `mode` a hijos. En `mode="quote"` tras éxito 201 → `router.push("/quotes/[id]")` (no `SaleConfirmedModal`).
- [x] 11.4 Crear `app/(private)/pos/_logic/hooks/useQuoteSubmission.ts` (paralelo a `useSaleSubmission`): expone `{ status, quote, error, submit, reset }`; importa `createQuote` desde `app/(private)/quotes/_logic/services/`.
- [x] 11.5 Actualizar el guard `can("sales:create")` del `PosPage` para permitir el modo `quote` cuando el usuario tenga `quotes:create` aunque NO tenga `sales:create`. Si tiene **sólo** `quotes:create`, la página mount en `mode="quote"` forzado y oculta el segmented (el `mode="sale"` no es alcanzable).

## 12. NavigationRail

- [x] 12.1 Modificar `app/_components/organisms/NavigationRail/items.ts`: insertar `{ key: "quotes", href: "/quotes", icon: "request_quote", label: "Cotizaciones", requires: "quotes:read" }` entre los items `sales` e `inventory`.
- [x] 12.2 Actualizar `tests/unit/ui/_components/organisms/NavigationRail.test.tsx` (o crear casos si no existen) para verificar: `viewer` (tiene `sales:read` + `quotes:read`) ve ambos items; `operator` ve POS + Sales + Quotes; usuario sin `quotes:read` NO ve "Cotizaciones".

## 13. Tests unitarios

- [x] 13.1 Tests de servicios (`tests/unit/ui/quotes/_logic/services/`): `listQuotes`, `getQuote` (404 → QuoteNotFoundError), `createQuote` (400 mapeos y 403), `updateQuote` (409 status), `authorizeQuote` (409 expired y status), `cancelQuote` (409 already cancelled y converted con saleId), `convertQuote` (200 → Sale, 409 expired, 400 inactive folio/PM).
- [x] 13.2 Tests de hooks (`tests/unit/ui/quotes/_logic/hooks/`): `useQuotesList` (cancelación de requests obsoletos), `useQuoteDetail` (cancel on unmount), `useQuoteMutations` (onChange callback dispara con tipo correcto: Quote para authorize/cancel/update, Sale para convert), `useQuoteSubmission` (status transitions).
- [x] 13.3 Tests de bloques: `QuoteStatusBadge` (cada estado + `authorized + isExpired → Vencida`), `QuotesTable` (columna sucursal oculta sin bypass, fila warning-tint cuando isExpired, deep-link a venta cuando converted), `QuoteActionsBar` (cada estado renderiza los botones correctos, loading state, `authorized + expired` desactiva Convertir).
- [x] 13.4 Tests de modales: `AuthorizeQuoteModal` (deshabilita en expired draft), `CancelQuoteModal` (renderiza deep-link a `/sales/[saleId]` cuando converted), `ConvertQuoteModal` (submit deshabilitado sin folio+PM, navegación tras 200, inline error en folio inactivo).
- [x] 13.5 Tests del POS modificado: `PosHeader` (segmented visible sólo con `canQuote`, confirma al cambiar con carrito), `CartPanel` (`mode="quote"` oculta payment method y muestra expiresAt; CTA "Crear cotización"), `PosPage` (en `mode="quote"` submit dispara `createQuote` y navega a `/quotes/[id]`; en `mode="sale"` comportamiento preservado).
- [x] 13.6 Tests de `QuoteEditPage`: redirect cuando status no es draft, 409 mid-flight muestra toast y navega al detalle.
- [x] 13.7 Test de `SegmentedButton` molecule: render con dos opciones, click invoca `onChange`, item seleccionado tiene `aria-selected="true"`.

## 14. Verificación end-to-end

- [x] 14.1 `npm run build` y `npm test` en verde.
- [x] 14.2 Verificación manual `admin`: crea cotización con 3 items y `expiresAt=+15d` → edita en draft → autoriza → convierte (con paymentMethodId + folio fiscal) → confirma redirect a `/sales/[id]`, `sale.quoteId` poblado, folio fiscal incrementado, stock decrementado en `branch_inventory`.
- [x] 14.3 Verificación manual `operator` en su sucursal: cotiza desde `/pos` (cambia a modo Cotización), añade 2 items, completa cotización → confirma redirect a `/quotes/[id]`. Autoriza, convierte. Intenta cancelar dos veces → 2da intentona muestra toast 409 e impide acción.
- [x] 14.4 Verificación manual `operator` sin matriz: convierte una cotización autorizada → emite venta correctamente (no hay guard de matriz para cotizaciones, distinto al editor de ventas).
- [x] 14.5 Verificación manual de expiración: crea cotización con `expiresAt=ayer` (manual en BD si necesario) → en `/quotes/[id]` aparece banner "Vencida"; intenta autorizar → 409 con mensaje inline; cancela y crea otra.
- [x] 14.6 Verificación manual de `viewer`: ve `/quotes` con datos de su sucursal, entra al detalle; NO ve botones Autorizar/Editar/Cancelar/Convertir; NO ve "POS" en el rail (no tiene `sales:create`); SÍ ve "Cotizaciones".
- [x] 14.7 Verificación manual de scoping: operador en B1 intenta GET `/quotes/[id]` de B2 vía URL directa → toast 403 + redirect a `/quotes`.
- [x] 14.8 Verificación manual del flujo "Cotización ya convertida → intento de cancelar": en detalle muestra deep-link "Ir a la venta"; click navega a `/sales/[saleId]`.
- [x] 14.9 Verificación visual contra el Stitch `03b348783f7b46f0ac6f88aaef19a649`: tabla con avatares circulares de iniciales, chips con punto coloreado, tipografía Inter, primary verde para Autorizar/Convertir, `secondary-container` para "Crear cotización".

## 15. Documentación

- [x] 15.1 Actualizar `CLAUDE.md` añadiendo sección "Cotizaciones (UI)" con: rutas `/quotes`, `/quotes/new`, `/quotes/[id]`, `/quotes/[id]/edit`; modo "Cotización" del POS; ubicación de hooks compartidos (`app/_hooks/useFoliosOptions.ts`, `app/_hooks/usePaymentMethodsOptions.ts`); errores tipados nuevos.
- [x] 15.2 Actualizar la sección "NavigationRail" en `CLAUDE.md`: agregar item `quotes` entre `sales` e `inventory`.
- [x] 15.3 Actualizar el listado de iconos registrados (si se documenta en algún `README` interno) con los cuatro nuevos.
- [x] 15.4 Actualizar la lista de changes OpenSpec archivados en `CLAUDE.md` cuando este change pase a archivo (se hace en `/opsx:archive`).
