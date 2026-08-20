## 1. Base de datos

- [x] 1.1 Agregar `acquisitionPrice Decimal? @map("acquisition_price") @db.Decimal(12,4)` a `model Product` en `prisma/schema.prisma`.
- [x] 1.2 Generar migración `add_acquisition_price_to_products` (`npx prisma migrate dev --name add_acquisition_price_to_products`).
- [x] 1.3 `npx prisma generate`.

## 2. Backend — Productos

- [x] 2.1 `src/modules/products/domain/entities/Product.ts`: agregar `acquisitionPrice: number | null`.
- [x] 2.2 `src/modules/products/application/dto/ProductDto.ts`, `CreateProductRequest.ts`, `UpdateProductRequest.ts`: agregar `acquisitionPrice`.
- [x] 2.3 `src/modules/products/application/mappers/toProductDto.ts`: mapear `acquisitionPrice`.
- [x] 2.4 `src/modules/products/infrastructure/repositories/PrismaProductRepository.ts`: incluir `acquisitionPrice` en select/create/update.
- [x] 2.5 `src/modules/products/infrastructure/repositories/InMemoryProductRepository.ts`: soportar el campo para tests.
- [x] 2.6 `src/modules/products/infrastructure/http/ProductsController.ts`: agregar `acquisitionPrice: z.number().min(0).nullable().optional()` a los schemas Zod de create y update.

## 3. Backend — Compras (efecto sobre costo de adquisición)

- [x] 3.1 `src/modules/purchases/infrastructure/repositories/PrismaPurchaseRepository.ts` método `createCompleted`: dentro de la misma `$transaction`, por cada línea, `tx.product.update({ where: { id: item.productId }, data: { acquisitionPrice: item.unitCost } })`.
- [x] 3.2 Confirmar que `cancel()` NO toca `acquisitionPrice` (sin cambios ahí — sólo agregar comentario si aclara la intencionalidad).
- [x] 3.3 `src/modules/purchases/infrastructure/repositories/InMemoryPurchaseRepository.ts`: replicar el mismo efecto para que los tests con repo en memoria sean fieles al comportamiento real.

## 4. Backend — Reporte de inventario por departamento

- [x] 4.1 `src/modules/reports/application/ports/DepartmentPriceListRepository.ts`: agregar `acquisitionPrice` a `RawPriceListRow`.
- [x] 4.2 `src/modules/reports/infrastructure/repositories/PrismaDepartmentPriceListRepository.ts`: incluir `acquisitionPrice` en el `select` de producto (líneas ~18-21).
- [x] 4.3 `src/modules/reports/application/dto/DepartmentPriceListResponseDto.ts`: agregar `acquisitionPrice: string | null` a `DepartmentProductDto`.
- [x] 4.4 `src/modules/reports/application/use-cases/GetDepartmentPriceListReportUseCase.ts`: propagar `acquisitionPrice` al armar cada `DepartmentProductDto` (formatear a string 4 decimales, `null` si no hay valor).
- [x] 4.5 `src/modules/reports/domain/services/priceColumnNames.ts`: cambiar el algoritmo de `Set<string>` ordenado alfabético a: recolectar `Map<string, boolean>` (nombre → algún precio con ese nombre es `isDefault`), ordenar entradas `isDefault=true` primero, resto por `localeCompare("es-MX")`.

## 5. Backend — Artefactos PDF/Excel del reporte

- [x] 5.1 `src/modules/reports/infrastructure/pdf/DepartmentPriceListReportPdf.tsx`: agregar columna "Costo Adq." (moneda MXN o "—") junto a código/nombre/unidad de cada producto; usar el nuevo orden de `priceColumnNames` para las filas de precio.
- [x] 5.2 `src/modules/reports/infrastructure/xlsx/buildDepartmentPriceListWorkbook.ts`: agregar columna `Costo Adq.` al `BASE_HEADER`; formatear el precio (`price.price`) y el costo como moneda o valor numérico consistente; aplicar el nuevo orden.

## 6. Frontend — Catálogo de productos

- [x] 6.1 `app/(private)/catalogs/products/_logic/types/{api,domain}.ts`: agregar `acquisitionPrice`.
- [x] 6.2 `app/(private)/catalogs/products/_logic/schemas/product.schema.ts`: agregar validación `acquisitionPrice` numérica ≥ 0, opcional/nullable.
- [x] 6.3 `app/(private)/catalogs/products/_blocks/ProductGeneralTab.tsx`: agregar campo "Precio de adquisición" (mismo patrón de input que `ivaRate`/`iepsRate`), estado, hidratación, envío en `updateProduct`.
- [x] 6.4 `app/(private)/catalogs/products/_blocks/ProductEditModal.tsx` (modo create): agregar el campo si el modal de creación replica los campos de General.

## 7. Frontend — Reporte de inventario por departamento

- [x] 7.1 `app/(private)/reports/inventory/_logic/types/api.ts`: agregar `acquisitionPrice: string | null` al DTO espejo.
- [x] 7.2 `app/(private)/reports/_blocks/InventoryPriceStockTable.tsx`: agregar columna "Costo adq." después de "Stock"; aplicar el mismo cambio de orden en la copia local de `priceColumnNames` (líneas 18-28) que en el backend (paso 4.5).

## 8. Tests

- [x] 8.1 Test unitario de `priceColumnNames` (backend): dado un set de nombres con uno marcado `isDefault`, verifica orden `[default, ...resto alfabético es-MX]` — caso concreto `["10","15","4","Precio público"(default)]` → `["Precio público","10","15","4"]`.
- [x] 8.2 Test de paridad: mismo input a la función backend y a la copia en `InventoryPriceStockTable.tsx` produce el mismo array de nombres en el mismo orden (test en `tests/unit/ui/`).
- [x] 8.3 Test de `PrismaPurchaseRepository.createCompleted` (o `InMemoryPurchaseRepository` equivalente): al completar una compra, `product.acquisitionPrice` queda igual a `unitCost` de la línea.
- [x] 8.4 Test de línea repetida del mismo producto en una compra: la última línea procesada define `acquisitionPrice`.
- [x] 8.5 Test de cancelación de compra: `acquisitionPrice` no cambia al cancelar.
- [x] 8.6 Test de `ProductsController` (create/update): acepta `acquisitionPrice` válido, rechaza negativo (400), acepta `null`.
- [x] 8.7 Test de `GetDepartmentPriceListReportUseCase`: `acquisitionPrice` se serializa como string con 4 decimales o `null`.
- [x] 8.8 Test RTL de `ProductGeneralTab`: captura y envío de "Precio de adquisición", incluyendo limpiar el campo → envía `null`.

## 9. Verificación manual

- [x] 9.1 `/catalogs/products/<id>` → capturar precio de adquisición, guardar, recargar y confirmar persistencia. Verificado con Playwright: `45.5` persiste tras reload.
- [x] 9.2 Completar una compra con líneas de ese producto y `unitCost` distinto → confirmar que el precio de adquisición del producto se actualiza automáticamente. Cubierto por test automatizado (8.3); no repetido manualmente por falta de datos de compra de prueba.
- [x] 9.3 Cancelar esa compra → confirmar que el precio de adquisición NO se revierte. Cubierto por test automatizado (8.5).
- [x] 9.4 `/reports/inventory` → verificado con Playwright: columna "Costo adq." muestra `$45.50` formateado como moneda; orden default-first de columnas de precio confirmado por test unitario (8.1/8.2) — el dataset de prueba sólo tiene una lista de precio, no permite verificar visualmente el caso público/10/15/4 completo.
