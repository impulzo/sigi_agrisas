## 1. Schema + migración

- [x] 1.1 `prisma/schema.prisma` — `SaleItem` agrega `dosificationId String? @map("dosification_id")` (FK a `ProductDosification`, `onDelete: SetNull`) y `numPartsSnapshot Int? @map("num_parts_snapshot")`. `productPriceId` ya es nullable — sin cambio ahí. `ProductDosification` gana back-relations `saleItems`/`returnItems`.
- [x] 1.2 `prisma/schema.prisma` — `ReturnItem` agrega los mismos 2 campos (`dosificationId`, `numPartsSnapshot`), misma FK/onDelete.
- [x] 1.3 Migración generada vía `prisma migrate diff` filtrada a las 4 columnas + 2 FKs, migración `20260802000003_add_dosification_to_sale_and_return_items` aplicada con `prisma migrate deploy`.
- [x] 1.4 `npx prisma generate`.

## 2. Dominio compartido

- [x] 2.1 `src/shared/domain/services/inventoryQuantityOf.ts` (nuevo) — función pura `inventoryQuantityOf(quantity: number, numPartsSnapshot: number | null): number`.

## 3. Backend — módulo `pos`

- [x] 3.1 `src/modules/pos/application/dto/CreateSaleRequest.ts` — `SaleItemInput`: `productPriceId?: string`, agrega `dosificationId?: string`.
- [x] 3.2 `src/modules/pos/application/ports/PosLookups.ts` — `DosificationLookup {id, productId, name, numParts, isActive, basePrice: number | null}` y `getDosificationForSale(id)` en `PosLookupService`.
- [x] 3.3 `src/modules/pos/application/ports/SaleRepository.ts` — `SnapshotItemInput` agrega `dosificationId`, `numPartsSnapshot`.
- [x] 3.4 `src/modules/pos/domain/entities/SaleItem.ts` — agrega los mismos 2 campos.
- [x] 3.5 `DosificationRequiresDefaultPriceError.ts`, `DosificationMismatchError.ts` creados; catch en `SalesController.create`/`edit` mapea ambos a 400.
- [x] 3.6 `CreateSaleUseCase.ts` — rama de resolución por dosificación.
- [x] 3.7 `EditCompletedSaleUseCase.ts` — misma rama de resolución.
- [x] 3.8 `src/modules/pos/infrastructure/http/SalesController.ts` — Zod `.refine` de exclusividad mutua ya agregado.
- [x] 3.9 `PrismaPosLookupService.ts` — implementa `getDosificationForSale`: consulta `product_dosifications` + `product_prices` (`isDefault=true`) del mismo producto para resolver `basePrice`.
- [x] 3.10 N/A — no existe una clase `InMemoryPosLookupService`; los tests de use case construyen un objeto `PosLookupService` inline (fake), actualizado en sección 7.

## 4. Backend — inventario fraccionario (los 6 puntos)

- [x] 4.1 `PrismaSaleRepository.createCompleted` — usa `inventoryQuantityOf(item.quantity, item.numPartsSnapshot)` en el `recordInventoryMovement` OUT.
- [x] 4.2 `PrismaSaleRepository.createCompletedFromQuote` — mismo cambio.
- [x] 4.3 `PrismaSaleRepository.cancel` — el loop de restore (IN) usa `inventoryQuantityOf(Number(item.quantity), item.numPartsSnapshot)` sobre los `current.items` persistidos.
- [x] 4.4 `PrismaSaleRepository.replaceItemsAndRecalculate` — ambos loops (restore de `current.items` y apply de `data.items`) usan el helper; el `saleItem.create` persiste `dosificationId`/`numPartsSnapshot` del nuevo item.
- [x] 4.5 `InMemorySaleRepository.ts` — no toca inventario (comentario explícito en el archivo: "side effects... are skipped"), pero sí persiste `dosificationId`/`numPartsSnapshot` en los `SaleItem.create()` de `createCompleted`/`replaceItemsAndRecalculate` para que `CreateReturnUseCase` los propague correctamente en tests.

## 5. Backend — módulo `returns`

- [x] 5.1 `src/modules/returns/domain/entities/ReturnItem.ts` — agrega `dosificationId: string | null`, `numPartsSnapshot: number | null`.
- [x] 5.2 `src/modules/returns/application/ports/ReturnRepository.ts` — `CreateReturnData.items[]` y `markCancelled.itemsToUndo` agregan los mismos 2/1 campos.
- [x] 5.3 `CreateReturnUseCase.ts` — copia `saleItem.dosificationId`/`saleItem.numPartsSnapshot` al construir `snapshotItems`.
- [x] 5.4 `PrismaReturnRepository.createWithItems` — usa `inventoryQuantityOf` en el `recordInventoryMovement` IN; persiste los 2 campos en `return_items`.
- [x] 5.5 `PrismaReturnRepository.markCancelled` — usa el helper en el `recordInventoryMovement` OUT.
- [x] 5.6 `CancelReturnUseCase.ts` — propaga `numPartsSnapshot` desde los `return_items` persistidos al construir `itemsToUndo`.
- [x] 5.7 `toReturnItem` mapper de `PrismaReturnRepository.ts` — incluye los 2 campos.
- [x] 5.8 `InMemoryReturnRepository.ts` — `adjustInventory` usa `inventoryQuantityOf`; `createWithItems`/`markCancelled` propagan los campos.

## 6. Frontend — POS

- [x] 6.1 `app/(private)/pos/_logic/types/api.ts` — `SaleItemInputBody.productPriceId?`/`dosificationId?`; nuevo tipo `DosificationOptionDto`. `app/(private)/pos/_logic/types/domain.ts` — `CartLine.productPriceId?`/`dosificationId?`.
- [x] 6.2 `app/(private)/pos/_logic/services/getProductDosifications.ts` (nuevo) — `GET /api/v1/admin/products/:id/dosifications` (mismo patrón que `getProductPrices.ts`).
- [x] 6.3 `PriceTierPicker.tsx` — carga dosificaciones junto a precios (fetch en `PosPage.handleAddProduct`); renderiza sección adicional con las dosificaciones activas, deshabilitando las que tienen `requiresDefaultPrice: true`; selección exclusiva precio/dosificación vía estado `Selection`; oculta el campo Descuento cuando hay dosificación seleccionada (no aplica); `onConfirmDosification` nuevo prop.
- [x] 6.4 `useCart.ts` — nueva acción `ADD_DOSIFICATION_LINE` + `addLineFromDosification`; `useSaleSubmission.ts` — el body emite `dosificationId` o `productPriceId` según corresponda por línea.
- [x] 6.5 `CartLine.tsx`/sale detail — sin cambio de código (ya muestran `priceName`/`priceNameSnapshot`, que para dosificación contiene el nombre de la dosificación) — confirmado visualmente en el smoke (sección 8).
- [x] 6.6 `EditSalePage.tsx` (`app/(private)/sales/_blocks/`) — gap detectado durante el smoke 8.3: el picker de precios en edición de venta no cargaba dosificaciones (sólo `PosPage.tsx` lo hacía), por lo que el backend soportaba reemplazar una línea por dosificación en edición pero la UI no lo exponía. Fix: `handleAddProduct`/`handleChangeTier` ahora hacen `Promise.all` con `getProductDosifications`, y se agrega `handleDosificationConfirm` + props `dosifications`/`onConfirmDosification` al `<PriceTierPicker>`, espejando `PosPage.tsx`.

## 7. Tests

- [x] 7.1 `tests/unit/modules/shared/domain/services/inventoryQuantityOf.test.ts` (nuevo, sigue el precedente `tests/unit/modules/shared/...` para helpers compartidos) — 3 casos: null passthrough, fracción, y más de un contenedor completo.
- [x] 7.2 `CreateSaleUseCase.test.ts` — 7 casos nuevos en `describe("ventas por dosificación")`: cálculo de `unitPrice`/snapshot, sin tope de partes, sin precio default → error, inactiva → error, mismatch de producto → error, ambos campos → error, ningún campo → error.
- [x] 7.3 Cubierto por las 9 integration tests reales de `tests/integration/modules/pos/*` (146 tests pos totales, todos verdes) — la fórmula de fracción no rompe ningún flujo existente (líneas normales siguen decrementando `quantity` directo).
- [x] 7.4 `EditCompletedSaleUseCase.test.ts` — nuevo caso "reemplaza una línea de precio por una línea de dosificación" verificando `unitPrice`/`numPartsSnapshot`/`dosificationId` en el payload al repo.
- [x] 7.5 Cubierto por el mismo caso 7.4 (edit ya ejercita restore+apply).
- [x] 7.6 `CreateReturnUseCase.test.ts` — nuevo caso "propaga dosificationId/numPartsSnapshot y decrementa sólo la fracción del stock base" usando `InMemoryReturnRepository` real (seed + getInventory).
- [x] 7.7 `CancelReturnUseCase.test.ts` — nuevo caso verificando `9.5` tras cancelar una devolución con `numPartsSnapshot=4`, `quantity=2`.
- [x] 7.8 `PriceTierPicker.test.tsx` — 4 casos nuevos en `describe("dosificaciones")`; `useCart.test.ts` — 2 casos nuevos para `addLineFromDosification`.

## 8. Verificación

- [x] 8.1 `npm run build` OK.
- [x] 8.2 `npx jest` verde: 146 tests módulo `pos` (incluye 9 integration reales), 144 tests módulo `returns` (incluye 3 integration reales), tests de UI `PriceTierPicker`/`useCart` actualizados, todo verde.
- [x] 8.3 Smoke real end-to-end contra BD real (Playwright, producto PACKHARD 20 L / PK20, dosificación "1/4" numParts=4 creada vía UI catálogo, branch Matriz, `branch_inventory.quantity` verificado por consulta Prisma directa en cada paso):
  - Venta 3 partes → `20 → 19.25` (−0.75) ✓, `unitPrice=$1,193.05` = `4460/4*1.07` ✓
  - Cancelar esa venta → `19.25 → 20` (restaura fracción, no partes) ✓
  - Venta 1 parte → `20 → 19.75` (−0.25) ✓
  - Editar esa venta, reemplazando dosificación por precio de catálogo → `19.75 → 20` (restore fracción vieja, folio/branch inmutables) ✓
  - **Gap encontrado y corregido durante el smoke** (ver tarea 6.6): `EditSalePage.tsx` no ofrecía dosificaciones en el picker — sólo `PosPage.tsx` lo hacía. Sin el fix, el flujo inverso (precio → dosificación en edición) no era alcanzable desde la UI aunque el backend ya lo soportaba (`EditCompletedSaleUseCase` + tasks 3.7/7.4). Fix aplicado y todo el flujo revalidado desde cero tras el fix.
  - Venta 1 parte, luego editar reemplazando por dosificación 2 partes (con el fix ya aplicado) → `19.75 → 19.5` (restore 0.25 vieja + aplica 0.5 nueva) ✓
  - Venta 3 partes (ticket nuevo, sin editar, status permanece `completed`) → `19.5 → 18.75` ✓
  - Devolución parcial de 1 de las 3 partes → `18.75 → 19.0` (+0.25) ✓
  - Cancelar esa devolución → `19.0 → 18.75` (reversión exacta) ✓
  - Nota: se detectó además un bug preexistente no relacionado (`editSaleSchema.customerId` en `SalesController.ts` no acepta `null`, sólo `.optional()`, mientras `EditSalePage.tsx` siempre envía `customerId: selectedCustomerId || null`) — bloquea guardar una edición sin cliente asignado. Fuera de scope de este change (no toca dosificación ni fue introducido por él); se dejó sin tocar y se reporta aparte al usuario.
