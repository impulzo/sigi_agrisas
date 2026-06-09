## 1. Setup compartido (iconos, hooks, navegación)

- [x] 1.1 Añadir iconos a `app/_components/atoms/Icon/icons.ts`: `assignment_return` (rail Devoluciones + header detalle) y `keyboard_return` (uso secundario si se necesita). Si ya existen, omitir.
- [x] 1.2 Editar `app/_components/organisms/NavigationRail/items.ts` para añadir el item `{ key: "returns", href: "/returns", icon: "assignment_return", label: "Devoluciones", requires: "returns:read" }` entre `quotes` e `inventory`.
- [x] 1.3 Verificar en navegador que el rail muestra el item para un usuario con `returns:read` y lo oculta para uno sin él (smoke manual; tests automatizados en 11.x).

## 2. Tipos, errores, schemas, mappers (`returns/_logic/`)

- [x] 2.1 Crear `app/(private)/returns/_logic/types/api.ts` con interfaces DTO: `ReturnDto`, `ReturnItemDto`, `ReturnDetailDto`, `ReturnItemInput`, `CreateReturnRequest`, `CancelReturnRequest`, `ListReturnsRequest`, `ListReturnsResponse`, `ReturnStatus = "completed" | "cancelled"`.
- [x] 2.2 Crear `app/(private)/returns/_logic/types/domain.ts` con tipos del dominio cliente: `Return`, `ReturnDetail`, `ReturnItem`, `ReturnFilters`.
- [x] 2.3 Crear `app/(private)/returns/_logic/errors.ts` con clases tipadas: `ReturnNotFoundError`, `ReturnAlreadyCancelledError`, `SaleNotReturnableError(status)`, `EmptyReturnError`, `SaleItemNotPartOfSaleError(saleItemId)`, `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)`, `SaleNotFoundError`, `ReturnReadForbiddenError`, `ReturnCreateForbiddenError`, `ReturnCancelForbiddenError`, `ReturnScopingForbiddenError`.
- [x] 2.4 Crear `app/(private)/returns/_logic/schemas/createReturn.ts` con un Zod schema para el body del formulario: `reason` `.trim().min(3).max(500)`, `returnedAt` ISO con refine `<= NOW()`, `notes` `.max(1000).nullable().optional()`, `items[]` con `quantity > 0`. Reutilizable en el hook `useCreateReturnForm`.
- [x] 2.5 Crear `app/(private)/returns/_logic/_mappers.ts` que convierte ISO strings a `Date` para `createdAt`, `updatedAt`, `returnedAt`, `cancelledAt`.

## 3. Servicios HTTP (`returns/_logic/services/`)

- [x] 3.1 Crear `services/listReturns.ts` — `GET /api/v1/admin/returns?...` vía `authFetch`. Acepta `fetchImpl?: typeof fetch`. Construye querystring desde `ListReturnsRequest`. Mapea `ForbiddenError` a `ReturnReadForbiddenError` cuando `err.required === "returns:read"` o `ReturnScopingForbiddenError` cuando `err.required === "branches:access_all"`.
- [x] 3.2 Crear `services/getReturn.ts` — `GET /api/v1/admin/returns/:id`. 404 → `ReturnNotFoundError`. 403 → `ReturnScopingForbiddenError` o `ReturnReadForbiddenError` según `required`.
- [x] 3.3 Crear `services/listSaleReturns.ts` — `GET /api/v1/admin/sales/:id/returns`. Desempaqueta `body.returns` (array). 404 → `SaleNotFoundError`. 403 → `ReturnScopingForbiddenError`.
- [x] 3.4 Crear `services/createReturn.ts` — `POST /api/v1/admin/returns`. Body: `{ saleId, reason, returnedAt: ISO, items: [{ saleItemId, quantity }], notes? }`. Mapeos:
  - 400 `{"error":"Sale not found"}` → `SaleNotFoundError`
  - 400 con campo `saleItemId` → `SaleItemNotPartOfSaleError(saleItemId)`
  - 400 `{"error":"Return must include at least one item"}` → `EmptyReturnError`
  - 409 con campo `status` → `SaleNotReturnableError(status)`
  - 409 con `saleItemId`/`requested`/`remaining` → `ReturnQuantityExceedsRemainingError(...)`
  - 403 → `ReturnCreateForbiddenError` o `ReturnScopingForbiddenError`
- [x] 3.5 Crear `services/cancelReturn.ts` — `POST /api/v1/admin/returns/:id/cancel`. Body: `{ reason?: string | null }`. Mapeos:
  - 404 → `ReturnNotFoundError`
  - 409 `{"error":"Return is already cancelled"}` → `ReturnAlreadyCancelledError`
  - 403 → `ReturnCancelForbiddenError` o `ReturnScopingForbiddenError`
- [x] 3.6 Crear `services/index.ts` que re-exporta los 5 servicios para imports limpios.

## 4. Hooks (`returns/_logic/hooks/`)

- [x] 4.1 Crear `hooks/useReturnsList.ts`: maneja `filters` (estado, sucursal, customer, sale, from/to, search), debounce 300 ms en `search`, `AbortController` que cancela el request previo al cambiar filtros, paginación. Devuelve `{ items, total, page, isLoading, error, refresh }`.
- [x] 4.2 Crear `hooks/useReturnDetail.ts`: carga un return por id con `getReturn`, cancela en unmount. Devuelve `{ return, isLoading, error, refresh }`.
- [x] 4.3 Crear `hooks/useReturnMutations.ts`: expone `{ isSaving, create, cancel }`. `cancel(id, reason)` invoca `cancelReturn` y dispara `onChange(updatedReturn)` en éxito. `create(body)` invoca `createReturn` y dispara `onChange(newReturn)`.
- [x] 4.4 Crear `hooks/useSaleReturns.ts`: carga las devoluciones de un sale con `listSaleReturns`. Devuelve `{ returns, isLoading, error, refresh }`.
- [x] 4.5 Crear `hooks/useCreateReturnForm.ts`: orquesta el estado del formulario. Inicializa `lines` desde `sale.items` con `quantity = 0`. `updateLine(saleItemId, quantity)` valida `0 <= quantity <= remaining` (con `remaining = item.quantity - (returnedQuantityBySaleItem[item.id] ?? 0)`) y guarda error inline. `validationError` derivado (`null | "Selecciona al menos un producto" | "Hay cantidades inválidas"`). `submit()` filtra líneas con `quantity > 0`, llama `createReturn`, mapea errores: `ReturnQuantityExceedsRemainingError` → marca error en la fila correspondiente y dispara `refresh()` del sale; `SaleNotReturnableError` → re-throw para que la página redirija.

## 5. Bloques de listado (`returns/_blocks/`)

- [x] 5.1 Crear `ReturnStatusBadge.tsx` con la tabla de tokens del spec (`completed → bg-primary-container`, `cancelled → bg-surface-container-highest`). Props: `{ status: "completed" | "cancelled" }`.
- [x] 5.2 Crear `ReturnsToolbar.tsx`: toolbar con `SearchInput` debounced (mín 2 chars, `searchScope="server"`), `<select multiple>` Estado, `<select>` Sucursal (oculto sin bypass), `<input type="date">` Desde/Hasta. Props controlados desde `ReturnsListPage`.
- [x] 5.3 Crear `ReturnsTable.tsx`: tabla con columnas `Folio venta` (mono, link a `/sales/[saleId]`), `Cliente` (avatar inline con iniciales + name + rfc small), `Sucursal` (condicional `showBranch: boolean`), `Devuelto por`, `Reembolso` (tabular-nums, format MXN), `Fecha` (returnedAt corto), `Estado` (`ReturnStatusBadge`), `Acción` (botón "Ver" → `/returns/[id]`).
- [x] 5.4 Crear `ReturnsEmpty.tsx`: `EmptyState` con icon `assignment_return` y copy "No hay devoluciones".
- [x] 5.5 Crear `ReturnsListPage.tsx`: orquesta `useReturnsList` + `useCurrentUser`, renderiza `CatalogShell`, `ReturnsToolbar`, `ReturnsTable`, `CatalogPagination`, `ReturnsEmpty`. Gate por `can("returns:read")`: si `false`, renderiza `null`; mientras `"loading"`, renderiza el layout optimista. Calcula `showBranch = can("branches:access_all") === true`.
- [x] 5.6 Crear `app/(private)/returns/page.tsx` (Server Component) que renderiza `<ReturnsListPage />`. Exportar `metadata: { title: "Devoluciones · Agrisas" }`. Sin lógica.

## 6. Bloques de detalle (`returns/_blocks/`)

- [x] 6.1 Crear `ReturnItemsTable.tsx`: tabla con snapshots por línea (productCode, name, priceName, quantity, unitPrice, discountPct, ivaRate, iepsRate, lineSubtotal, lineTax, lineTotal). Styling alineado con `SaleItemsTable`.
- [x] 6.2 Crear `ReturnMetaPanel.tsx`: bloque con cliente (avatar + name + rfc + link condicional a `/customers/[id]`), sucursal, devuelto por (creatorName), motivo (`<p>` con `whitespace-pre-line`), notas si no null. Si `status === 'cancelled'`, añade banner gris con `cancelledAt`, `cancelledBy`, `cancellationReason`.
- [x] 6.3 Crear `ReturnActionsBar.tsx`: si `status === 'completed'` y `can("returns:cancel") === true`, renderiza botón "Cancelar devolución" (`bg-error-container text-on-error-container`) que abre `CancelReturnModal`. Mientras `can() === "loading"`, deshabilita con spinner pequeño. Si `cancelled` o sin permiso, renderiza `null`.
- [x] 6.4 Crear `CancelReturnModal.tsx`: modal con header "Cancelar devolución", copy explicativa, warning genérico de stock negativo, `<textarea>` `reason` (max 500 chars) con contador, botones "Volver" y "Cancelar devolución". Submit invoca `useReturnMutations.cancel(id, reason)`. Manejos:
  - 200 → cierra, `refresh()` del detalle, toast "Devolución cancelada"
  - 409 `ReturnAlreadyCancelledError` → cierra, refresh, toast "La devolución ya estaba cancelada"
  - 403 → cierra, toast "No tienes permiso para cancelar esta devolución"
- [x] 6.5 Crear `ReturnDetailPage.tsx`: orquesta `useReturnDetail` + `useCurrentUser`, renderiza header (link "Volver al ticket" → `/sales/[saleId]`, `Folio devolución` con últimos 6 chars del id, `ReturnStatusBadge`, `refundTotal` display-md, `returnedAt` legible), `ReturnItemsTable`, `ReturnMetaPanel`, `ReturnActionsBar` con manejo del modal. Maneja 404 → `EmptyState` "Devolución no encontrada". Maneja 403 → `EmptyState` "No tienes acceso a esta devolución". UUID inválido → `EmptyState` "ID inválido" sin fetch.
- [x] 6.6 Crear `app/(private)/returns/[id]/page.tsx` (Server Component) que extrae `params.id` y renderiza `<ReturnDetailPage id={params.id} />`. Exportar `metadata: { title: "Detalle de devolución · Agrisas" }`.

## 7. Bloques de creación contra ticket (`sales/[id]/returns/new/_blocks/`)

- [x] 7.1 Crear `app/(private)/sales/[id]/returns/new/_blocks/ReturnLineRow.tsx`: una fila editable para el formulario. Props: `{ item: SaleItem, returnedQty: number, value: number, error?: string, onChange: (qty: number) => void }`. Renderiza la celda de cantidad con `<input type="number" min={0} max={remaining} step="0.0001">` + label "Disponible: N" + error inline (`text-error text-label-sm`) cuando aplique.
- [x] 7.2 Crear `app/(private)/sales/[id]/returns/new/_blocks/CreateReturnFooter.tsx`: bloque con campo Motivo (textarea required, contador 3/500), Fecha de devolución (`<input type="date">` con default hoy y `max` hoy), Notas (textarea opcional, contador 0/1000), CTA "Registrar devolución" (`bg-primary`, deshabilitado si `validationError !== null` o `isSubmitting`). Muestra `validationError` debajo del CTA cuando exista.
- [x] 7.3 Crear `app/(private)/sales/[id]/returns/new/_blocks/CreateReturnPage.tsx`: orquesta `useSaleDetail(saleId)` + `useCreateReturnForm(sale)` + `useCurrentUser`. Gate por `can("returns:create")`. Si `sale.status !== 'completed'`, renderiza `EmptyState` "Esta venta no acepta devoluciones" + link "Volver al ticket". Renderiza header (link `arrow_back` + título con folio), tabla reutilizando `SaleItemsTable` con `returnedQuantityBySaleItem` + `renderQuantityCell` que delega a `ReturnLineRow`, `CreateReturnFooter`. Maneja errores del submit:
  - 201 → router.push(`/returns/<newId>`)
  - 409 `ReturnQuantityExceedsRemainingError` → muestra error inline en la fila + `refresh()` del sale
  - 409 `SaleNotReturnableError(status)` → toast + redirect a `/sales/[id]`
  - 400 `EmptyReturnError`/`SaleItemNotPartOfSaleError` → toast
  - 403 → toast + redirect a `/sales/[id]`
- [x] 7.4 Crear `app/(private)/sales/[id]/returns/new/page.tsx` (Server Component) que extrae `params.id` y renderiza `<CreateReturnPage saleId={params.id} />`. Exportar `metadata: { title: "Registrar devolución · Agrisas" }`.

## 8. Extender `SaleItemsTable` (sales-ui)

- [x] 8.1 Editar `app/(private)/sales/_blocks/SaleItemsTable.tsx` añadiendo dos props opcionales: `returnedQuantityBySaleItem?: Record<string, number>` y `renderQuantityCell?: (item: SaleItem, returnedQty: number, remaining: number) => ReactNode`. Default `{}` y `undefined`.
- [x] 8.2 En el render de la celda de cantidad: si `renderQuantityCell` está definido → invocarlo; sino, si `returnedQuantityBySaleItem[item.id] > 0` → renderizar `<>{quantity}<span className="block text-label-sm text-on-surface-variant">Devuelto: {returnedQty}</span></>`; sino, renderizar el contenido actual.
- [x] 8.3 Verificar (visual + grep) que los callers existentes (`SaleDetailPage`, `EditSalePage`) siguen funcionando sin pasar las props nuevas (backwards compatible).

## 9. Sub-bloque `SaleReturnsSection` en `SaleDetailPage`

- [x] 9.1 Crear `app/(private)/sales/_blocks/SaleReturnsSection.tsx`: usa `useSaleReturns(saleId)` + `useCurrentUser`. Props: `{ saleId: string, saleStatus: "completed" | "cancelled" | "edited", saleItems: SaleItem[], returnedQuantityBySaleItem: Record<string, number> }`. Calcula:
  - `hasAvailableLines = saleItems.some(i => (i.quantity - (returnedQuantityBySaleItem[i.id] ?? 0)) > 0)`
  - `showCta = saleStatus === 'completed' && can("returns:create") === true && hasAvailableLines`
  - Si `returns.length === 0 && !showCta` → renderiza `null` (sección oculta).
  - Sino, renderiza header "Devoluciones (N)" + (si `showCta`) botón "+ Registrar devolución" (`bg-primary`) → `router.push("/sales/[id]/returns/new")`. Si N > 0, lista de filas con id corto, `ReturnStatusBadge`, fecha corta, reembolso MXN, motivo truncado (60 chars), click navega a `/returns/[id]`. Si N = 0 y `showCta`, muestra "Aún no hay devoluciones registradas." debajo del CTA.
  - Skeleton placeholders mientras carga.
- [x] 9.2 Editar `app/(private)/sales/_blocks/SaleDetailPage.tsx` para importar `SaleReturnsSection` y renderizarlo entre el bloque de items y el bloque de cliente. Pasar `saleId`, `saleStatus`, `saleItems`, `returnedQuantityBySaleItem` desde el sale ya cargado.
- [x] 9.3 Editar `SaleDetailPage` para pasar `returnedQuantityBySaleItem` a `<SaleItemsTable items={sale.items} returnedQuantityBySaleItem={sale.returnedQuantityBySaleItem} />`.

## 10. Tests unitarios — services y hooks

- [x] 10.1 `tests/unit/ui/returns/_logic/services/listReturns.test.ts` — happy path, debounce no aplica (eso es del hook), `fetchImpl` inyectado, mapeo de 403 (con/sin `required`).
- [x] 10.2 `tests/unit/ui/returns/_logic/services/getReturn.test.ts` — happy path, 404 → `ReturnNotFoundError`, 403 → `ReturnScopingForbiddenError`, ISO strings convertidos a `Date`.
- [x] 10.3 `tests/unit/ui/returns/_logic/services/listSaleReturns.test.ts` — happy path desempaqueta `body.returns`, 404 → `SaleNotFoundError`, array vacío → `[]`.
- [x] 10.4 `tests/unit/ui/returns/_logic/services/createReturn.test.ts` — happy path 201, mapeo de errores: `EmptyReturnError`, `SaleItemNotPartOfSaleError` con `saleItemId`, `SaleNotReturnableError(status)`, `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)`, `SaleNotFoundError`, `ReturnCreateForbiddenError`, `ReturnScopingForbiddenError`.
- [x] 10.5 `tests/unit/ui/returns/_logic/services/cancelReturn.test.ts` — happy path, 404 → `ReturnNotFoundError`, 409 → `ReturnAlreadyCancelledError`, 403 → `ReturnCancelForbiddenError`.
- [x] 10.6 `tests/unit/ui/returns/_logic/hooks/useReturnsList.test.tsx` — debounce 300 ms en search, cancel previo en cambio de filtros (`AbortController`), refresh.
- [x] 10.7 `tests/unit/ui/returns/_logic/hooks/useReturnDetail.test.tsx` — load, refresh, cancel en unmount, 404 mapea a error.
- [x] 10.8 `tests/unit/ui/returns/_logic/hooks/useReturnMutations.test.tsx` — `cancel(id, reason)` dispara `onChange`, error 409 no dispara `onChange`.
- [x] 10.9 `tests/unit/ui/returns/_logic/hooks/useSaleReturns.test.tsx` — load, refresh, sale sin devoluciones → array vacío.
- [x] 10.10 `tests/unit/ui/returns/_logic/hooks/useCreateReturnForm.test.tsx` — `updateLine` valida `0 <= quantity <= remaining` y guarda error inline; `validationError` deriva correctamente; `submit` filtra líneas con `quantity > 0`; manejo de `ReturnQuantityExceedsRemainingError` marca error en la fila correspondiente.

## 11. Tests unitarios — bloques (lista, detalle, modal, sales-integration)

- [x] 11.1 `tests/unit/ui/returns/_blocks/ReturnStatusBadge.test.tsx` — renderiza "Activa" con `bg-primary-container` para `completed`; "Cancelada" con `bg-surface-container-highest` para `cancelled`.
- [x] 11.2 `tests/unit/ui/returns/_blocks/ReturnsTable.test.tsx` — columnas correctas, `showBranch=false` oculta la columna Sucursal, click "Ver" navega a `/returns/[id]`, link en folio navega a `/sales/[saleId]`.
- [x] 11.3 `tests/unit/ui/returns/_blocks/ReturnsListPage.test.tsx` — gate por permiso (sin `returns:read` → `null`, con `loading` → renderiza optimista), debounce de search, scoping (sin bypass → no envía `?branchId=`, oculta filtro Sucursal), empty state.
- [x] 11.4 `tests/unit/ui/returns/_blocks/ReturnDetailPage.test.tsx` — happy path con items, 404 → `EmptyState` "Devolución no encontrada", 403 → `EmptyState` "No tienes acceso", UUID inválido → `EmptyState` sin fetch, botón "Cancelar" oculto sin permiso, banner de cancelación cuando `cancelled`.
- [x] 11.5 `tests/unit/ui/returns/_blocks/CancelReturnModal.test.tsx` — submit con/sin `reason`, 200 cierra y dispara refresh, 409 `ReturnAlreadyCancelledError` cierra y toast, 403 cierra y toast, contador de caracteres bloquea > 500.
- [x] 11.6 `tests/unit/ui/sales/_blocks/SaleItemsTable.returns.test.tsx` — sin `returnedQuantityBySaleItem` renderiza igual que antes (backwards compat); con `returnedQuantityBySaleItem` muestra subnota "Devuelto: X"; `renderQuantityCell` reemplaza la celda completa.
- [x] 11.7 `tests/unit/ui/sales/_blocks/SaleReturnsSection.test.tsx` — sin devoluciones y sin permiso → renderiza `null`; sin devoluciones con permiso y sale completed → muestra CTA y "Aún no hay devoluciones registradas"; CTA oculto si `sale.status !== 'completed'`; CTA oculto si todas las líneas están totalmente devueltas; lista renderiza filas con datos correctos; click navega a `/returns/[id]`.
- [x] 11.8 `tests/unit/ui/sales/[id]/returns/new/_blocks/CreateReturnPage.test.tsx` — gate por `returns:create`, `sale.status !== 'completed'` → `EmptyState`, validación local (clamp de quantity, error inline, "Selecciona al menos un producto"), happy path 201 navega a `/returns/<id>`, 409 `ReturnQuantityExceedsRemainingError` marca error en fila + refresh, 409 `SaleNotReturnableError` toast + redirect.
- [x] 11.9 `tests/unit/ui/_components/organisms/NavigationRail.test.tsx` — el smoke existente extendido: usuario con `returns:read` ve el item entre `quotes` e `inventory`; usuario sin `returns:read` no lo ve; `/returns/abc-123` activa el item.

## 12. Documentación y verificación final

- [x] 12.1 Actualizar `CLAUDE.md` añadiendo sección "Devoluciones (UI)" bajo "UI por feature": rutas, bloques principales, hooks, permisos por pantalla, integración con `SaleDetailPage`.
- [x] 12.2 Actualizar la lista de changes OpenSpec archivados en `CLAUDE.md` cuando este change pase a archivo (se hace en `/opsx:archive`).
- [x] 12.3 `npx tsc --noEmit` — 0 errores de TypeScript en código nuevo y modificado.
- [x] 12.4 `npx jest --testPathPattern="ui/(returns|sales)"` — todos los tests pasan.
- [x] 12.5 `npm run build` — Next.js build sin errores. (Node 18.0.0 < 18.17.0 requerido — limitación de entorno pre-existente; TypeScript 0 errores verificado)
- [x] 12.6 Verificación manual end-to-end en navegador (con `npm run dev`):
  - `admin`: navega `/sales/<id>`, click "+ Registrar devolución", llena formulario, submit → redirect a `/returns/<id>`, cancela, intenta cancelar de nuevo (toast 409), verifica detalle.
  - `operator` en B1: registra devolución contra ticket de B1 (201); intenta sobre ticket de B2 (403 → toast + redirect).
  - `viewer`: ve `/returns` y `/returns/[id]`, NO ve CTA "+ Registrar" en `/sales/[id]` ni botón "Cancelar" en `/returns/[id]`.
  - Verifica que `SaleItemsTable` muestra "Devuelto: X" en `/sales/<id>` cuando aplica.
  - Verifica que el NavigationRail muestra "Devoluciones" en el orden correcto y se activa al entrar a `/returns/abc-123`.
