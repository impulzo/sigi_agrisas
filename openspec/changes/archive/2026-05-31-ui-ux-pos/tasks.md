## 1. Atoms/shared prerequisites

- [x] 1.1 Verificar/registrar los iconos `receipt_long`, `point_of_sale`, `local_offer`, `person_add` en `app/_components/atoms/Icon/icons.ts` (crear los que falten).
- [x] 1.2 Extender `app/_hooks/useCurrentUser.ts` para exponer `branchId: string | null` derivado del claim del JWT (lectura sin verificar firma, igual que el resto). Tests: añadir cobertura del nuevo campo en `tests/unit/ui/_hooks/useCurrentUser.test.ts` (token con branchId, token sin claim, token con cadena vacía).
- [x] 1.3 Crear `app/_hooks/useHeadquarters.ts`: consulta `GET /api/v1/admin/branches?pageSize=100&includeInactive=false`, filtra `isHeadquarters === true`, cache de módulo TTL 60s, devuelve `{ hq: { id, code, name } | null, isLoading, refresh }`. Test unitario en `tests/unit/ui/_hooks/useHeadquarters.test.ts`.
- [x] 1.4 Crear `app/_components/molecules/Combobox/Combobox.tsx` (presentational): props `{ value, onChange, onSearch, options, isLoading, placeholder, renderOption?, footerSlot? }`. Soporta footer (`footerSlot`) para botones como "+ Nuevo cliente". Sin lógica de negocio.

## 2. POS `_logic/` — tipos, errores, helpers

- [x] 2.1 Crear `app/(private)/pos/_logic/types/api.ts` con DTOs HTTP: `CreateSaleBody`, `SaleItemInputBody`, `SaleDetailDto`, `SaleItemDto`, `CustomerDto`, `CreateCustomerBody`, `ProductDto`, `ProductPriceDto`, `BranchOption`, `FolioOption`, `PaymentMethodOption`.
- [x] 2.2 Crear `_logic/types/domain.ts`: tipos del carrito (`CartLine` con snapshots completos), `CartState`, `SaleDraft`, `CustomerOption`, `HqState`.
- [x] 2.3 Crear `_logic/errors.ts`: `CustomerInactiveError`, `BranchInactiveError`, `FolioInactiveError`, `PaymentMethodInactiveError`, `ProductInactiveError`, `ProductPriceMismatchError`, `EmptyCartError`, `SaleScopingForbiddenError`, `SaleCreateForbiddenError`, `CustomerCodeAlreadyInUseError`, `CustomerRfcAlreadyInUseError`.
- [x] 2.4 Crear `_logic/lib/computeTotalsClient.ts` — port puro del `SaleTotalsCalculator` backend con banker's rounding a 4 decimales. Función `computeTotalsClient(lines): { lines, subtotal, taxTotal, total }`. Sin dependencias.
- [x] 2.5 Crear `_logic/lib/formatMxCurrency.ts`: `formatMxCurrency(n: number): string` → `"$1,234.56"` (2 decimales, separador miles, locale `es-MX`).

## 3. POS `_logic/` — servicios

- [x] 3.1 Crear `_logic/services/searchProducts.ts`
- [x] 3.2 Crear `_logic/services/getProductPrices.ts`
- [x] 3.3 Crear `_logic/services/searchCustomers.ts`
- [x] 3.4 Crear `_logic/services/createCustomer.ts`
- [x] 3.5 Crear `_logic/services/createSale.ts`

## 4. POS `_logic/` — schemas Zod

- [x] 4.1 Crear `_logic/schemas/saleDraft.schema.ts`
- [x] 4.2 Crear `_logic/schemas/cartLine.schema.ts`
- [x] 4.3 Crear `_logic/schemas/customerQuickAdd.schema.ts`

## 5. POS `_logic/` — hooks

- [x] 5.1 Crear `_logic/hooks/useFoliosOptions.ts` y `_logic/hooks/usePaymentMethodsOptions.ts`
- [x] 5.2 Crear `_logic/hooks/useProductSearch.ts`
- [x] 5.3 Crear `_logic/hooks/useCustomerSearch.ts`
- [x] 5.4 Crear `_logic/hooks/useCart.ts`
- [x] 5.5 Crear `_logic/hooks/useSelectedBranch.ts`
- [x] 5.6 Crear `_logic/hooks/useSaleSubmission.ts`

## 6. POS UI — bloques

- [x] 6.1 Crear `app/(private)/pos/page.tsx`
- [x] 6.2 Crear `_blocks/PosPage.tsx`
- [x] 6.3 Crear `_blocks/PosHeader.tsx`
- [x] 6.4 Crear `_blocks/ProductCatalogPanel.tsx` + `_blocks/ProductCatalogGrid.tsx`
- [x] 6.5 Crear `_blocks/PriceTierPicker.tsx`
- [x] 6.6 Crear `_blocks/CartPanel.tsx`
- [x] 6.7 Crear `_blocks/CustomerPicker.tsx`
- [x] 6.8 Crear `_blocks/CustomerQuickAddModal.tsx`
- [x] 6.9 Crear `_blocks/CartLinesList.tsx` y `_blocks/CartLine.tsx`
- [x] 6.10 Crear `_blocks/CartTotals.tsx`
- [x] 6.11 Crear `_blocks/SaleConfirmedModal.tsx`
- [x] 6.12 Implementar prompt `beforeunload` cuando el carrito tiene items.

## 7. Sales (`/sales`) — `_logic/`

- [x] 7.1 Crear `app/(private)/sales/_logic/types/api.ts` y `types/domain.ts`
- [x] 7.2 Crear `_logic/errors.ts`
- [x] 7.3 Crear `_logic/services/`
- [x] 7.4 Crear `_logic/hooks/useSalesList.ts`
- [x] 7.5 Crear `_logic/hooks/useSaleDetail.ts`
- [x] 7.6 Crear `_logic/hooks/useSaleMutations.ts`

## 8. Sales UI — listado

- [x] 8.1 Crear `app/(private)/sales/page.tsx`
- [x] 8.2 Crear `_blocks/SalesListPage.tsx`
- [x] 8.3 Crear `_blocks/SalesToolbar.tsx`
- [x] 8.4 Crear `_blocks/SalesTable.tsx`
- [x] 8.5 Crear `_blocks/SaleStatusBadge.tsx`

## 9. Sales UI — detalle, cancelar, editar

- [x] 9.1 Crear `app/(private)/sales/[id]/page.tsx`
- [x] 9.2 Crear `_blocks/SaleDetailPage.tsx`
- [x] 9.3 Crear `_blocks/SaleItemsTable.tsx`
- [x] 9.4 Crear `_blocks/CancelSaleModal.tsx`
- [x] 9.5 Crear `app/(private)/sales/[id]/edit/page.tsx` y `_blocks/EditSalePage.tsx`
- [x] 9.6 Implementar banda superior "Estás editando una venta ya emitida"

## 10. NavigationRail + permisos

- [x] 10.1 Modificar `app/_components/organisms/NavigationRail/items.ts`: añadir `requires: "sales:create"` al item `pos`; reemplazar item `billing` por `sales`.
- [x] 10.2 Test de `NavigationRail` que valide: `viewer` ve "Ventas" y NO ve "POS"; `operator`/`admin` ven ambos.

## 11. Tests unitarios

- [x] 11.1 `computeTotalsClient.test.ts` — set completo de casos del spec `pos-api > SaleTotalsCalculator` (línea simple, descuento, IVA+IEPS, null rates como 0, multi-línea, banker's rounding `.12345`, inputs inválidos lanzan).
- [x] 11.2 Tests de servicios POS (`createSale` mapeo 400/403, `searchProducts`, `createCustomer` mapeo 409 code/rfc).
- [x] 11.3 Tests del reducer `useCart` (add/update/remove/clear; recálculo de totales; cambio de tier no rompe snapshots).
- [x] 11.4 Tests de bloques POS (`ProductCatalogGrid` render + búsqueda; `PriceTierPicker` default preseleccionado, descuento override; `CustomerPicker` muestra badge de adeudo; `CartTotals` formato MX y números tabulares; `CartPanel` botón disabled sin folio/método/items).
- [x] 11.5 Tests de servicios sales (`listSales`, `getSale`, `cancelSale` 404/409, `editSale` 409 cancelled).
- [x] 11.6 Tests de bloques sales (`SalesTable` render + badge; `SalesToolbar` filtro de sucursal sólo para bypass; `SaleDetailPage` ocultando "Editar venta" para non-bypass fuera de HQ; `CancelSaleModal` idempotencia visual).
- [x] 11.7 Tests de `useHeadquarters` (cache, refresh, null cuando no hay HQ).
- [x] 11.8 Test extendido de `useCurrentUser` con `branchId`.

## 12. Verificación end-to-end

- [x] 12.1 `npm run build` y `npm test` en verde.
- [x] 12.2 Verificación manual en navegador con `admin`: emite venta multi-item con descuentos y tier no-default → confirma folio incrementado y stock decrementado; cancela una venta → verifica stock restaurado; edita una venta completada desde otra sucursal (con bypass) → verifica `status='edited'`; lista todas las sucursales.
- [x] 12.3 Verificación manual con `operator` asignado a HQ: emite venta en su sucursal; cancela; en `/sales` ve sólo su sucursal; el botón "Editar venta" NO aparece (le falta `sales:edit_completed`); `/sales/[id]` de otra sucursal → 403.
- [x] 12.4 Verificación manual con `operator` fuera de HQ: emite y cancela en su sucursal; en `/sales/[id]` ve botones de cancelar pero NO de editar; intento de cambiar branchId a otra sucursal → no permitido por el `<select>` (sólo lista su sucursal).
- [x] 12.5 Verificación manual con `viewer`: ve `/sales` con datos de su sucursal, entra al detalle; NO ve "POS" en el rail; intento manual a `/pos` → muestra `ForbiddenState`.
- [x] 12.6 Verificación de quick-add de cliente: operador crea cliente nuevo desde el carrito, queda seleccionado, emite la venta; cliente aparece en `/sales` con su nombre.
- [x] 12.7 Verificación visual contra el Stitch `3b7ab57a14944ac99f12f421db512076` — layout split-pane, totales en panel derecho, tipografía Inter, badges de estado, primary verde para "Finalizar venta".

## 13. Documentación

- [x] 13.1 Actualizar `CLAUDE.md` añadiendo sección "POS (UI)" con: rutas `/pos`, `/sales`, `/sales/[id]`, `/sales/[id]/edit`; hooks nuevos (`useHeadquarters`, `useCurrentUser.branchId`); patrón de quick-add de cliente; guard de matriz en cliente y su trade-off (defensa en profundidad).
- [x] 13.2 Actualizar la sección "NavigationRail" en `CLAUDE.md` para reflejar que `pos` está gateado por `sales:create` y que `billing` fue reemplazado por `sales`.
- [x] 13.3 Actualizar la lista de changes OpenSpec archivados en `CLAUDE.md` cuando este change pase a archivo (se hace en `/opsx:archive`).
