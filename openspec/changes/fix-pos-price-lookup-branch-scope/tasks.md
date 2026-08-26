## 1. Servicio compartido

- [x] 1.1 `getProductPrices(productId, branchId?, fetchImpl?)` en `app/(private)/pos/_logic/services/getProductPrices.ts` — agregar `?branchId=<id>` a la URL cuando `branchId` es truthy; sin cambio cuando se omite

## 2. Call sites — creación (Historia 1)

- [x] 2.1 `PosPage.tsx` — `handleAddProduct` pasa `selectedBranchId || null`
- [x] 2.2 `PosPage.tsx` — `handleChangeTier` pasa `selectedBranchId || null`
- [x] 2.3 `QuoteCreatePage.tsx` — `handleAddProduct` pasa `selectedBranchId || null`
- [x] 2.4 `QuoteCreatePage.tsx` — `handleChangeTier` pasa `selectedBranchId || null`

## 3. Call sites — edición (Historia 2)

- [x] 3.1 `EditSalePage.tsx` — `handleAddProduct` pasa `sale?.branchId ?? null`
- [x] 3.2 `EditSalePage.tsx` — `handleChangeTier` pasa `sale?.branchId ?? null`
- [x] 3.3 `QuoteEditPage.tsx` — `handleAddProduct` pasa `quote?.branchId ?? null`
- [x] 3.4 `QuoteEditPage.tsx` — `handleChangeTier` pasa `quote?.branchId ?? null`

## 4. Tests

- [x] 4.1 Actualizar `getProductPrices.test.ts` a la nueva firma (`branchId` como 2do parámetro posicional, `fetchImpl` como 3ro)
- [x] 4.2 Agregar caso: dispatch incluye `?branchId=<id>` cuando se provee
- [x] 4.3 Agregar caso: URL sin `branchId` cuando se omite/es `null`
- [x] 4.4 `npx tsc --noEmit` sin errores nuevos relacionados a los archivos tocados
- [x] 4.5 Suite completa (`npx jest`) en verde: 510/510 suites, 3698/3698 tests

## 5. Spec sync

- [x] 5.1 Delta `specs/pos-ui/spec.md` — requirement "Price/dosification selection dialog" (MODIFIED) documentando `branchId` en la petición de precios y su fuente por pantalla

## 6. Verificación manual (pendiente)

- [ ] 6.1 Playwright/browser: en POS con sucursal Tlaxiaco seleccionada, agregar un producto que sólo tiene precio de sucursal (sin precio base) y confirmar que `PriceTierPicker` muestra el precio en vez de "sin precios configurados"
- [ ] 6.2 Playwright/browser: en POS con sucursal Tlaxiaco seleccionada, agregar un producto con precio divergente (ej. `KAB1`/KER KAB 1L) y confirmar que se muestra el precio de Tlaxiaco, no el de Matriz
- [ ] 6.3 Playwright/browser: repetir 6.1/6.2 en `/quotes/new`
- [ ] 6.4 Playwright/browser: abrir `/sales/:id/edit` de una venta de una sucursal distinta a la del usuario logueado (con `sales:edit_completed` + guard HQ) y confirmar que los precios mostrados corresponden a la sucursal de la venta, no a la del usuario
