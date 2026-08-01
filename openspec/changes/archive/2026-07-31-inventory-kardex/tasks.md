## 1. Schema + migración

- [x] 1.1 `prisma/schema.prisma` — modelo `InventoryMovement` (`inventory_movements`) según `design.md`; relaciones nullable/`SetNull` en `Customer`, `Provider`, `Folio`; relaciones `Restrict` en `Branch`, `Product`.
- [x] 1.2 `npx prisma migrate dev --name add_inventory_movements` + `npx prisma generate`.

## 2. Helper compartido de escritura

- [x] 2.1 `src/shared/infrastructure/inventory/recordInventoryMovement.ts` — inserta 1 movimiento dentro de un `tx` existente; `UPDATE branch_inventory ... RETURNING quantity` (o `INSERT` si no existe la fila, igual que el comportamiento actual de `decrementInventoryAllowNegative`/`incrementInventory`) + `INSERT INTO inventory_movements` con el `balanceAfter` devuelto. Firma según `design.md`.
- [x] 2.2 Tests unitarios del helper contra una BD de test (vía los tests de integración de los hooks en la sección 3 — 32/32 suites, 212/212 tests contra Supabase real).

## 3. Hooks en repos Prisma existentes

- [x] 3.1 `PrismaSaleRepository.createCompleted`/`createCompletedFromQuote` — reemplazar `decrementInventoryAllowNegative` por `recordInventoryMovement` por línea (`movementType='sale'`, `direction='OUT'`, `unitPrice=item.unitPrice`, `sourceType='sale'`, `sourceId=saleId`, folio = folio de la venta).
- [x] 3.2 `PrismaSaleRepository.cancel` — por cada línea restaurada, `recordInventoryMovement` (`movementType='sale_cancel'`, `direction='IN'`, `movementAt=cancelledAt`, folio = folio de la venta).
- [x] 3.3 `PrismaSaleRepository.replaceItemsAndRecalculate` — por cada línea vieja restaurada, `recordInventoryMovement` (`sale_edit_restore`, `IN`); por cada línea nueva aplicada, `recordInventoryMovement` (`sale_edit_apply`, `OUT`); ambas con folio = folio de la venta, `movementAt=editedAt`.
- [x] 3.4 `PrismaReturnRepository.createWithItems` — reemplazar `incrementInventory` por `recordInventoryMovement` por línea (`return`, `IN`, `unitPrice=item.unitPrice`, folio/originFolio = folio de la venta referenciada, `movementAt=returnedAt`).
- [x] 3.5 `PrismaReturnRepository.markCancelled` — reemplazar `decrementInventory` por `recordInventoryMovement` por línea (`return_cancel`, `OUT`, folio/originFolio = folio de la venta, `movementAt=cancelledAt`).
- [x] 3.6 `PrismaBranchInventoryRepository.adjust` — resolver folio activo `code='TS'` `scope='INVENTORY'` (sin bloquear si no existe/inactivo) vía `allocateFolio`; `recordInventoryMovement` (`adjustment_in`/`adjustment_out` según signo de `delta`, `notes=reason`, `sourceType='adjustment'`, `sourceId=` id de la fila `branch_inventory`).
- [x] 3.7 `PrismaBranchInventoryRepository.create` — si `quantity > 0`, `recordInventoryMovement` (`adjustment_in`, `notes="Saldo inicial"`) en la misma transacción de creación.
- [x] 3.8 Tests: para cada hook (3.1–3.7), verificar que la operación original sigue funcionando igual **y** que se inserta el movimiento con los campos esperados — cubierto por el suite de integración existente (`sales-*`, `returns-*`, `inventory-*`, `quotes-*`) corriendo contra Supabase real tras aplicar la migración; 32/32 suites verdes.

## 4. Dominio (entidad + servicio puro)

- [x] 4.1 `src/modules/inventory/domain/entities/InventoryMovement.ts` — entidad de solo lectura (mapea la fila persistida).
- [x] 4.2 `src/modules/inventory/domain/services/KardexAssembler.ts` — arma `header` (existenciaTotal, existenciaAlmacen, saldoAnterior, saldoFinal) + ordena `movements[]` (`movementAt` asc, `sequence` asc).
- [x] 4.3 Tests `KardexAssembler` — orden cronológico, saldo acumulado correcto, agregación multi-sucursal, rango vacío (`saldoFinal = saldoAnterior`).

## 5. Puerto + DTOs

- [x] 5.1 `src/modules/inventory/application/ports/InventoryMovementRepository.ts` — `findMovementsInRange`, `getBranchBalances` (combina getBalanceBefore+getCurrentQuantities en una sola query por eficiencia), `rebuild`.
- [x] 5.2 `src/modules/inventory/application/dto/KardexReportRequest.ts`.
- [x] 5.3 `src/modules/inventory/application/dto/KardexReportResponseDto.ts`.
- [x] 5.4 `src/modules/inventory/application/dto/RebuildInventoryArticleResponseDto.ts`.

## 6. Use cases

- [x] 6.1 `src/modules/inventory/application/use-cases/GetKardexReportUseCase.ts`.
- [x] 6.2 `src/modules/inventory/application/use-cases/RebuildInventoryArticleUseCase.ts`.
- [x] 6.3 Tests de ambos use cases con `InMemoryInventoryMovementRepository`.

## 7. Repositorios

- [x] 7.1 `src/modules/inventory/infrastructure/repositories/PrismaInventoryMovementRepository.ts`.
- [x] 7.2 `src/modules/inventory/infrastructure/repositories/InMemoryInventoryMovementRepository.ts`.

## 8. Export

- [x] 8.1 `src/modules/inventory/infrastructure/pdf/KardexReportPdf.tsx`.
- [x] 8.2 `src/modules/inventory/infrastructure/xlsx/buildKardexWorkbook.ts`.

## 9. Controller + rutas + DI

- [x] 9.1 `src/modules/inventory/infrastructure/http/InventoryMovementsController.ts`.
- [x] 9.2 `src/modules/inventory/infrastructure/di/container.ts` — exporta `inventoryMovementsController`.
- [x] 9.3 `app/api/v1/admin/inventory/kardex/route.ts`.
- [x] 9.4 `app/api/v1/admin/inventory/kardex/rebuild/route.ts`.
- [x] 9.5 Tests de controller — RBAC (401/403), branch scoping, `format` inválido, `from>to`, `productId` inexistente, rebuild feliz + rebuild sin movimientos.

## 10. RBAC

- [x] 10.1 `prisma/seed.ts` — agregado `inventory:kardex_read`, otorgado a `admin`/`operator`/`viewer`.
- [x] 10.2 `npm run seed` corrido contra Supabase — idempotente, permiso verificado en BD.

## 11. Frontend — `_logic`

- [x] 11.1 `app/(private)/inventory/kardex/_logic/types/{api,domain}.ts`.
- [x] 11.2 `_logic/services/` — `getKardex`, `downloadKardexXlsx`, `downloadKardexPdf`, `rebuildInventoryArticle`, `searchProducts` (todas con `fetchImpl?`).
- [x] 11.3 `_logic/hooks/useKardex.ts` + `useProductSearch.ts`.

## 12. Frontend — bloques presentacionales

- [x] 12.1 `_blocks/KardexPage.tsx` + `KardexFilters.tsx`.
- [x] 12.2 `_blocks/KardexHeaderCards.tsx` + `KardexTabs.tsx` + `KardexTable.tsx` + `InlineFilterInput.tsx`.
- [x] 12.3 `_blocks/RebuildArticleButton.tsx` (+ `ConfirmDialog`) + `ExportButtons.tsx`.

## 13. Frontend — página + navegación

- [x] 13.1 `app/(private)/inventory/kardex/page.tsx` — Server Component, `metadata`, gating `can("inventory:kardex_read")`.
- [x] 13.2 `app/(private)/inventory/_blocks/InventoryTable.tsx` (nombre real del componente, no `BranchInventoryTable` como decía el proposal) — editado: acción de fila "Ver Kardex" → `/inventory/kardex?productId=&branchId=`.

## 14. Verificación

- [x] 14.1 `npm run build` (tipos) y `npm test` en verde — build OK, 323/323 suites unit (2228 tests) + 32/32 suites integración (212 tests) contra Supabase real.
- [x] 14.2 Prueba manual (Playwright, contra dev server real): venta → `sale` visible en kardex (folio TK, unitPrice); cancelarla → `sale_cancel`, saldo restaurado (15→62→61→62); ajuste manual (+/-) → `adjustment_in`/`adjustment_out` con folio `TS` autogenerado; Reconstruir Artículo → saldo recalculado correctamente (expone drift de stock legacy sin movimiento, comportamiento documentado); export xlsx (válido, abre como Excel 2007+) y pdf (válido, header %PDF) con filtros aplicados; sub-filtro client-side funcional; pestaña Estadísticas muestra placeholder "Próximamente"; deep-link desde `/inventory` → "Ver Kardex" precarga filtros y auto-fetch.
