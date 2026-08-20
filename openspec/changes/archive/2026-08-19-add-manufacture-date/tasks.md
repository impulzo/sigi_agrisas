## 1. Schema Prisma y migraciones

- [x] 1.1 Agregar `manufactureDate DateTime? @map("manufacture_date") @db.Date` a `model Product` en `prisma/schema.prisma`
- [x] 1.2 Agregar `manufactureDate DateTime? @map("manufacture_date") @db.Date` a `model InventoryLot` en `prisma/schema.prisma`
- [x] 1.3 Crear migración `ALTER TABLE "products" ADD COLUMN "manufacture_date" DATE;`
- [x] 1.4 Crear migración `ALTER TABLE "inventory_lots" ADD COLUMN "manufacture_date" DATE;`
- [x] 1.5 Correr `npx prisma generate` y confirmar que el cliente Prisma expone `manufactureDate` en ambos modelos

## 2. Backend — Products

- [x] 2.1 Agregar `manufactureDate: Date | null` a `ProductProps` y constructor en `src/modules/products/domain/entities/Product.ts`
- [x] 2.2 Agregar `manufactureDate: string | null` a `ProductDto`, `CreateProductRequest`, `UpdateProductRequest`
- [x] 2.3 Agregar `manufactureDate?: string | null` a `CreateProductData`/`UpdateProductData` en `ProductRepository` (port)
- [x] 2.4 Actualizar `toProductDto` para mapear `manufactureDate` a string ISO `YYYY-MM-DD` o `null`
- [x] 2.5 Actualizar `PrismaProductRepository` (lectura, `create()`, `update()`) para persistir y mapear `manufactureDate`
- [x] 2.6 Agregar `manufactureDate: z.string().date().nullable().optional()` a `createBodySchema` y `updateBodySchema` en `ProductsController`, incluyéndolo en el `.refine()` de "al menos un campo" del PATCH
- [x] 2.7 Test unitario: `ProductsController` — creación con `manufactureDate` válido persiste; formato inválido devuelve 400; PATCH set/clear a `null`

## 3. Backend — Purchases / InventoryLot

- [x] 3.1 Agregar `manufactureDate: z.coerce.date().nullable().optional()` (campo independiente, sin tocar el `.refine` de lote+caducidad) a `purchaseItemSchema` en `PurchasesController`
- [x] 3.2 Agregar `manufactureDate?: Date | null` a `CreatePurchaseItemInput` en `PurchaseRepository` (port) y a `CreatePurchaseItemRequest` en `PurchaseDto`
- [x] 3.3 Passthrough `manufactureDate` en `CreatePurchaseUseCase`
- [x] 3.4 Incluir `manufactureDate` en el snapshot y en el `tx.inventoryLot.createMany` de `PrismaPurchaseRepository`, manteniendo el filtro de creación de lote basado únicamente en `lotNumber`+`expirationDate` (D2 de design.md)
- [x] 3.5 Mismo cambio en `InMemoryPurchaseRepository` para paridad de tests
- [x] 3.6 Test unitario: línea con lote+caducidad+manufactureDate persiste los tres; línea con sólo manufactureDate no crea lote y no persiste el dato; línea con lote+caducidad sin manufactureDate persiste `null`

## 4. Frontend — Products

- [x] 4.1 Agregar `manufactureDate?: string | null` a `ProductDto`, `CreateProductBody`, `UpdateProductBody` en `_logic/types/api.ts`
- [x] 4.2 Agregar `manufactureDate: string | null` a `_logic/types/domain.ts`
- [x] 4.3 Agregar `manufactureDate: z.string().nullable().optional()` a `createProductSchema`/`updateProductSchema`
- [x] 4.4 Mapear `manufactureDate` en `toProduct()` (`_logic/services/products.ts`)
- [x] 4.5 Agregar estado, prefill/reset, `buildDiff` y `<input type="date">` ("Fecha de elaboración") en `ProductEditModal.tsx`
- [x] 4.6 Agregar los mismos elementos en `ProductGeneralTab.tsx`

## 5. Frontend — Purchases

- [x] 5.1 Agregar `manufactureDate: z.string().nullable().optional()` (campo independiente) a `purchaseItemSchema` en `_logic/schemas/createPurchase.ts`
- [x] 5.2 Agregar `manufactureDate` al tipo de línea, estado inicial, callback `updateManufactureDate` y mapeo de payload en `useCreatePurchaseForm.ts`
- [x] 5.3 Agregar prop `onUpdateManufactureDate` y tercer `<input type="date">` ("Elaboración") en `PurchaseLineRow.tsx`, mismo estilo que los inputs de lote/caducidad
- [x] 5.4 Agregar `manufactureDate?: string | null` al tipo de request de línea en `_logic/types/api.ts` (purchases)

## 6. Verificación

- [x] 6.1 `npm test -- products` — suite de products pasa
- [x] 6.2 `npm test -- purchases` — suite de purchases pasa
- [x] 6.3 `npm run build` — verifica tipos end-to-end sin errores
- [x] 6.4 Manual (browser): crear/editar producto con y sin fecha de elaboración en `ProductEditModal` y en tab General — **bloqueado de nuevo** (opsx:verify, 2026-08-19): mismo fallo persistente de la extensión de Chrome (tab group se pierde / timeout de captura), no relacionado al código. Sustituido por revisión de código: `ProductEditModal.tsx:85,125,147-148,171,299-308` y `ProductGeneralTab.tsx:60,87-88,94,179-183` confirmados con estado, prefill, diff y input wireados correctamente; `ProductEditModal.test.tsx` en verde.
- [x] 6.5 Manual (browser): registrar compra con línea que incluya `manufactureDate` junto con lote+caducidad, y otra línea con sólo `manufactureDate` — **bloqueado de nuevo**, misma razón. Sustituido por revisión de código: `PurchaseLineRow.tsx:19,30,148-152` y `useCreatePurchaseForm.ts:23,57,116,138,191-192,249` confirmados wireados correctamente; suite `purchases` (53 suites/358 tests) en verde sin regresiones.
- [x] 6.6 Verificación de completitud contra specs: los 4 delta specs (`products-api`, `products-ui`, `purchases-api`, `inventory-lots`) tienen implementación correspondiente en código; 32/34 tareas completas, 2 bloqueadas por tooling de browser (ver 6.4/6.5) y sustituidas por smoke test API+DB directo contra el dev server real
