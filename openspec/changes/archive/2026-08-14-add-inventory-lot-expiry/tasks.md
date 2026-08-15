## 1. Modelo de datos

- [x] 1.1 Agregar modelo `InventoryLot` a `prisma/schema.prisma` (tabla `inventory_lots`: `id`, `branchId`, `productId`, `purchaseItemId`, `lotNumber`, `expirationDate` `@db.Date`, `quantity`, `createdAt`; índice `(branchId, productId, expirationDate)`)
- [x] 1.2 Agregar relación inversa `inventoryLots InventoryLot[]` en el modelo `PurchaseItem`
- [x] 1.3 Correr `npx prisma migrate dev --name add_inventory_lots_table` y `npx prisma generate` (aplicado vía `migrate deploy` con migración escrita a mano — `migrate dev` detectó drift preexistente no relacionado en tablas RBAC y se evitó para no tocarlo)

## 2. Backend — Compras: puerto y validación

- [x] 2.1 Extender `CreatePurchaseItemInput` en `src/modules/purchases/application/ports/PurchaseRepository.ts` con `lotNumber?: string | null` y `expirationDate?: Date | null`
- [x] 2.2 Extender `purchaseItemSchema` en `src/modules/purchases/infrastructure/http/PurchasesController.ts`: `lotNumber` (string 1-64) y `expirationDate` (`z.coerce.date()`) opcionales, con `.refine()` exigiendo par completo o ninguno (mensaje 400 claro)

## 3. Backend — Compras: persistencia transaccional

- [x] 3.1 En `PrismaPurchaseRepository.createCompleted`: generar explícitamente el `id` de cada `PurchaseItem` (mismo patrón que `purchaseId = randomUUID()`) para poder referenciarlo
- [x] 3.2 En la misma transacción, tras crear la compra con sus items, insertar en `inventory_lots` un registro por cada línea que tenga `lotNumber` y `expirationDate` (`branchId`, `productId`, `purchaseItemId`, `lotNumber`, `expirationDate`, `quantity`)
- [x] 3.3 En `PrismaPurchaseRepository.cancel`: dentro de la misma transacción que revierte inventario, `deleteMany` de `inventory_lots` cuyo `purchaseItemId` pertenezca a los items de la compra cancelada
- [x] 3.4 Reflejar el mismo comportamiento (crear/borrar lotes) en `InMemoryPurchaseRepository` para paridad en tests de use-cases

## 4. Backend — Inventario: cálculo de semáforo

- [x] 4.1 Crear `src/modules/inventory/domain/services/ExpiryStatusCalculator.ts` (servicio puro, sin I/O): `compute(expirationDate: Date | null, now: Date): "ok" | "warning" | "critical" | null` con umbrales verde >30 días, amarillo 8-30, rojo ≤7 (incluye vencido)
- [x] 4.2 Tests unitarios de `ExpiryStatusCalculator` cubriendo los 4 casos de umbral (null, ok, warning, critical) incluyendo límites exactos (30, 31, 7, 8 días)

## 5. Backend — Inventario: puerto y repositorio de lotes

- [x] 5.1 Crear puerto `src/modules/inventory/application/ports/InventoryLotRepository.ts` con `findNearestExpirationByProducts(branchId: string, productIds: string[]): Promise<Map<string, { expirationDate: Date; lotNumber: string }>>`
- [x] 5.2 Implementar `PrismaInventoryLotRepository` (`src/modules/inventory/infrastructure/repositories/`): query `DISTINCT ON (product_id) ... ORDER BY product_id, expiration_date ASC` sobre `inventory_lots WHERE branch_id = $1 AND product_id = ANY($2)`
- [x] 5.3 Implementar `InMemoryInventoryLotRepository` para tests

## 6. Backend — Inventario: enriquecimiento de DTO y use cases

- [x] 6.1 Extender `BranchInventoryDto` con `nearestExpirationDate: string | null`, `nearestExpirationLotNumber: string | null`, `expiryStatus: "ok" | "warning" | "critical" | null`
- [x] 6.2 Inyectar `InventoryLotRepository` en `ListBranchInventoryUseCase`; tras mapear con `toBranchInventoryDto`, pedir `findNearestExpirationByProducts` con los `productId` de la página y enriquecer cada DTO con `ExpiryStatusCalculator.compute(...)`
- [x] 6.3 Inyectar `InventoryLotRepository` en `GetBranchInventoryItemUseCase`; mismo enriquecimiento para el item único
- [x] 6.4 Registrar `PrismaInventoryLotRepository` en `src/modules/inventory/infrastructure/di/container.ts` e inyectarla en ambos use cases
- [x] 6.5 Tests unitarios de `ListBranchInventoryUseCase`/`GetBranchInventoryItemUseCase` con `InMemoryInventoryLotRepository`: producto con lotes (status correcto), producto sin lotes (`null`), producto con múltiples lotes (usa el más próximo)

## 7. Frontend — Compras

- [x] 7.1 Extender `PurchaseFormLine` en `useCreatePurchaseForm.ts` con `lotNumber?: string; expirationDate?: string` (ISO `yyyy-mm-dd`) y setters `onUpdateLot`/`onUpdateExpiration`
- [x] 7.2 Incluir `lotNumber`/`expirationDate` (o `null`) en el payload de `submit()` hacia `createPurchase`
- [x] 7.3 Agregar inputs opcionales "Lote" (texto) y "Caducidad" (`type="date"`) en `PurchaseLineRow.tsx`, mismo estilo que los inputs existentes
- [x] 7.4 Extender `purchaseItemSchema` en `app/(private)/purchases/_logic/schemas/createPurchase.ts` con `lotNumber`/`expirationDate` opcionales + `.refine()` de par completo o ninguno (mismo mensaje que backend)

## 8. Frontend — Inventario

- [x] 8.1 Extender `InventoryItem` (`app/(private)/inventory/_logic/types/domain.ts`) y su tipo API correspondiente con `nearestExpirationDate: Date | null`, `nearestExpirationLotNumber: string | null`, `expiryStatus: "ok" | "warning" | "critical" | null`
- [x] 8.2 Actualizar el mapper de `app/(private)/inventory/_logic/services/inventory.ts` (API → domain) para convertir el `nearestExpirationDate` string a `Date`
- [x] 8.3 Crear `app/(private)/inventory/_blocks/ExpiryStatusBadge.tsx` calcado del patrón de `SalePaymentStatusBadge.tsx` (Record de 3 configs verde/amarillo/rojo + dot + label; retorna `null` si `status` es `null`)
- [x] 8.4 Agregar columna "Caducidad" en `InventoryTable.tsx` (entre "P. reorden" y "Acciones") con `<ExpiryStatusBadge />` + fecha formateada, sin modificar la lógica existente de `isLow`/fondo de fila

## 9. Verificación

- [x] 9.1 `npm test` — suite completa en verde (465/465 suites, 3291/3291 tests)
- [x] 9.2 `npm run build` — sin errores de tipos (único error de `tsc --noEmit` es preexistente en `TicketSettingsDto`, no tocado por este cambio)
- [x] 9.3 Manual: crear compra con lote+caducidad (probar fechas a 3, 15 y 45 días) → verificar badge correcto en `/inventory` para cada umbral. Verificado en navegador real (dev server + admin seed): 3 días → "Vence pronto" rojo, 15 días → "Por vencer" amarillo, 45 días → "Vigente" verde. **Bug encontrado y corregido durante esta verificación**: `DATE_FMT` en `InventoryTable.tsx` no fijaba `timeZone: "UTC"`, causando que la fecha de caducidad (columna `@db.Date`, sin hora) se mostrara un día antes en timezones negativos (ej. México) por conversión a hora local del navegador. Fix: agregar `timeZone: "UTC"` al `Intl.DateTimeFormat`.
- [x] 9.4 Manual: cancelar esa compra → verificar que el badge desaparece (lote eliminado) y el inventario revierte como antes. Verificado: ambos badges (amarillo y verde) desaparecieron tras cancelar, y `quantity` revirtió correctamente en ambos productos.
- [x] 9.5 Manual: crear compra sin lote/caducidad → verificar que no aparece badge y el flujo de compra no cambia. Verificado: compra se registró normal, `quantity` incrementó, sin badge de caducidad.
