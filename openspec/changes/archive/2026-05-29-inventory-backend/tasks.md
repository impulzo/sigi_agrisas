## 1. Prisma schema + migración

- [x] 1.1 Añadir modelo `Product` a `prisma/schema.prisma` con campos: `id @id @default(uuid())`, `code @unique @db.VarChar(32)`, `name @db.VarChar(200)`, `unit @db.VarChar(32)`, `satProductCode? @db.VarChar(16) @map("sat_product_code")`, `departmentId @db.Uuid @map("department_id")`, `ivaRate? @db.Decimal(5,4) @map("iva_rate")`, `iepsRate? @db.Decimal(5,4) @map("ieps_rate")`, `isActive @default(true) @map("is_active")`, `createdAt`, `updatedAt`; relación `department Department @relation(fields:[departmentId], references:[id], onDelete: Restrict)`; índices en `code`, `name`, `departmentId`; `@@map("products")`
- [x] 1.2 Añadir modelo `ProductPrice` con `id`, `productId @db.Uuid @map("product_id")`, `name @db.VarChar(60)`, `price @db.Decimal(12,4)`, `minQuantity @default(1) @map("min_quantity")`, `discountPct? @db.Decimal(5,2) @map("discount_pct")`, `isDefault @default(false) @map("is_default")`, `createdAt`, `updatedAt`; relación a `Product` con `onDelete: Cascade`; `@@unique([productId, name])`; `@@index([productId])`; `@@map("product_prices")`
- [x] 1.3 Añadir modelo `ProductDosification` con `id`, `productId @db.Uuid @map("product_id")`, `name @db.VarChar(60)`, `numParts @map("num_parts")`, `isActive @default(true) @map("is_active")`, `createdAt`, `updatedAt`; relación a `Product` con `onDelete: Cascade`; `@@unique([productId, name])`; `@@index([productId])`; `@@map("product_dosifications")`
- [x] 1.4 Añadir modelo `BranchInventory` con `id`, `branchId @db.Uuid @map("branch_id")`, `productId @db.Uuid @map("product_id")`, `quantity @db.Decimal(14,4) @default(0)`, `reservedQuantity @db.Decimal(14,4) @default(0) @map("reserved_quantity")`, `reorderPoint @db.Decimal(14,4) @default(0) @map("reorder_point")`, `updatedAt`; relaciones a `Product` y `Branch` con `onDelete: Cascade`; `@@unique([branchId, productId])`; índices en `branchId` y `productId`; `@@map("branch_inventory")`
- [x] 1.5 Ejecutar `npx prisma migrate dev --name add_products_and_inventory_tables`. Verificar que el SQL generado incluye los CHECK constraints (`quantity >= 0`, `reserved_quantity >= 0`, `reorder_point >= 0`, `min_quantity >= 1`, `num_parts >= 2`, `discount_pct BETWEEN 0 AND 100`) — si Prisma no los emite por mapeo, añadirlos manualmente al archivo SQL de la migración
- [x] 1.6 Añadir manualmente al SQL de la migración: `CREATE UNIQUE INDEX product_default_price_idx ON product_prices(product_id) WHERE is_default = TRUE` (Prisma no soporta partial unique indexes nativamente)
- [x] 1.7 Ejecutar `npx prisma generate` y verificar que los tipos `Product`, `ProductPrice`, `ProductDosification`, `BranchInventory` existen en `@prisma/client`

## 2. Seed RBAC — 4 permisos nuevos

- [x] 2.1 Actualizar `prisma/seed.ts`: añadir al array `PERMISSIONS` las claves `products:read`, `products:write`, `inventory:read`, `inventory:write` con descripciones en español
- [x] 2.2 Actualizar el rol `admin` para incluir las 4 claves en `permissions`
- [x] 2.3 Actualizar el rol `operator` para incluir `products:read`, `inventory:read`, `inventory:write`
- [x] 2.4 Actualizar el rol `viewer` para incluir `products:read`, `inventory:read`
- [x] 2.5 Ejecutar `npm run seed` y verificar idempotencia (correr 2 veces sin errores)

## 3. Dominio `products` (`src/modules/products/domain/`)

- [x] 3.1 Crear `domain/entities/Product.ts` con factory `Product.create()` (campos: id, code, name, unit, satProductCode?, departmentId, ivaRate?, iepsRate?, isActive, createdAt, updatedAt)
- [x] 3.2 Crear `domain/entities/ProductPrice.ts` con factory (id, productId, name, price, minQuantity, discountPct?, isDefault, createdAt, updatedAt)
- [x] 3.3 Crear `domain/entities/ProductDosification.ts` con factory (id, productId, name, numParts, isActive, createdAt, updatedAt)
- [x] 3.4 Crear `domain/services/DosificationPriceCalculator.ts` con constante `DOSIFICATION_SURCHARGE_PCT = 7.0` y método estático `computeUnitPrice(basePrice: number, numParts: number): number` que retorna `(basePrice / numParts) * (1 + 7/100)`; lanza error si `numParts < 1`
- [x] 3.5 Crear errores: `ProductNotFoundError`, `ProductCodeAlreadyInUseError`, `ProductPriceNotFoundError`, `DuplicatePriceNameError`, `DuplicateDefaultPriceError`, `ProductDosificationNotFoundError`, `DuplicateDosificationNameError`

## 4. Aplicación `products` (`src/modules/products/application/`)

- [x] 4.1 Crear puertos `ports/ProductRepository.ts`, `ports/ProductPriceRepository.ts`, `ports/ProductDosificationRepository.ts` con métodos CRUD apropiados (findAll con `?search`, `?departmentId`, `?includeInactive`; findById; create; update; softDelete/hardDelete según corresponda)
- [x] 4.2 Crear DTOs en `application/dto/`: `ProductDto`, `ListProductsRequest/Response`, `CreateProductRequest`, `UpdateProductRequest`, `ProductPriceDto`, `CreateProductPriceRequest`, `UpdateProductPriceRequest`, `ProductDosificationDto` (incluye `computedUnitPrice` y `requiresDefaultPrice`), `CreateProductDosificationRequest`, `UpdateProductDosificationRequest`
- [x] 4.3 Crear mappers `toProductDto`, `toProductPriceDto`, `toProductDosificationDto` (este último recibe opcionalmente el `defaultPrice` para calcular `computedUnitPrice`)
- [x] 4.4 Crear use cases para Product: `ListProductsUseCase`, `GetProductUseCase`, `CreateProductUseCase` (verifica `Department` existe via `DepartmentRepository`), `UpdateProductUseCase`, `SoftDeleteProductUseCase`
- [x] 4.5 Crear use cases para ProductPrice: `ListProductPricesUseCase`, `CreateProductPriceUseCase` (verifica producto existe; valida que solo haya un `is_default` por producto), `UpdateProductPriceUseCase`, `DeleteProductPriceUseCase` (hard delete)
- [x] 4.6 Crear use cases para ProductDosification: `ListProductDosificationsUseCase` (carga el default price y calcula `computedUnitPrice` para cada dosis), `CreateProductDosificationUseCase` (verifica producto existe), `UpdateProductDosificationUseCase`, `SoftDeleteProductDosificationUseCase`

## 5. Infraestructura `products` (`src/modules/products/infrastructure/`)

- [x] 5.1 Crear `infrastructure/repositories/PrismaProductRepository.ts` con todos los métodos del puerto; mapeo de `P2002` (target `code`) → `ProductCodeAlreadyInUseError`; `P2025` → `ProductNotFoundError`; búsqueda case-insensitive en `name` y `code` via `OR ILIKE` con Prisma `contains` + `mode: "insensitive"`; orden por `createdAt DESC`
- [x] 5.2 Crear `infrastructure/repositories/InMemoryProductRepository.ts` para tests
- [x] 5.3 Crear `infrastructure/repositories/PrismaProductPriceRepository.ts` con manejo de unicidad `(product_id, name)` → `DuplicatePriceNameError`; verificación de `is_default` único por producto (mapea constraint del partial unique index a `DuplicateDefaultPriceError` o re-throw específico)
- [x] 5.4 Crear `infrastructure/repositories/InMemoryProductPriceRepository.ts`
- [x] 5.5 Crear `infrastructure/repositories/PrismaProductDosificationRepository.ts`
- [x] 5.6 Crear `infrastructure/repositories/InMemoryProductDosificationRepository.ts`
- [x] 5.7 Crear `infrastructure/http/ProductsController.ts` con métodos `list`, `getById`, `create`, `update`, `softDelete`; schemas Zod inline: `code` regex `^[A-Z0-9_]{1,32}$`, `name` 1–200, `unit` 1–32, `satProductCode?` regex `^\d{8}$`, `departmentId` UUID, `ivaRate?` number 0–1 o porcentaje 0–100 (decidir formato y documentar), `iepsRate?` similar; normalización `code.toUpperCase().trim()`; mapeo errores → códigos HTTP
- [x] 5.8 Crear `infrastructure/http/ProductPricesController.ts` con métodos `list`, `create`, `update`, `delete`; schema Zod para `name` 1–60, `price >= 0`, `minQuantity >= 1`, `discountPct?` 0–100, `isDefault?` boolean; valida que `productId` en URL coincide con producto existente; mapea `DuplicatePriceNameError` → 409, `DuplicateDefaultPriceError` → 409
- [x] 5.9 Crear `infrastructure/http/ProductDosificationsController.ts` análogo; `numParts >= 2`; mapea `DuplicateDosificationNameError` → 409
- [x] 5.10 Crear `infrastructure/di/container.ts` que instancia los 3 repos Prisma + 14 use cases (5 Product + 4 Price + 5 Dosification) + 3 controllers; importa `departmentRepository` del módulo `departments` para la verificación de FK; exporta `productsController`, `productPricesController`, `productDosificationsController`

## 6. Dominio + Aplicación `inventory` (`src/modules/inventory/`)

- [x] 6.1 Crear `domain/entities/BranchInventory.ts` con factory (id, branchId, productId, quantity, reservedQuantity, reorderPoint, updatedAt)
- [x] 6.2 Crear errores: `BranchInventoryRecordNotFoundError`, `BranchInventoryAlreadyExistsError`, `NegativeStockNotAllowedError`
- [x] 6.3 Crear puerto `application/ports/BranchInventoryRepository.ts` con métodos: `findAll({ branchId, page, pageSize, search?, belowReorder? })`, `findByBranchAndProduct(branchId, productId)`, `create(data)`, `update(id, data)` (set absoluto), `adjust(id, delta)` (atómico con verificación de no-negatividad), `delete(id)`
- [x] 6.4 Crear DTOs: `BranchInventoryDto` (incluye datos del producto: code, name vía JOIN), `ListBranchInventoryRequest/Response`, `CreateBranchInventoryRequest`, `UpdateBranchInventoryRequest`, `AdjustStockRequest` (`delta`, opcional `reason`)
- [x] 6.5 Crear use cases: `ListBranchInventoryUseCase`, `GetBranchInventoryItemUseCase`, `CreateBranchInventoryItemUseCase` (verifica branch y product existen y no están inactivos), `UpdateBranchInventoryItemUseCase`, `AdjustStockUseCase`, `DeleteBranchInventoryItemUseCase`

## 7. Infraestructura `inventory` (`src/modules/inventory/infrastructure/`)

- [x] 7.1 Crear `infrastructure/repositories/PrismaBranchInventoryRepository.ts`: `findAll` con paginación y JOIN al producto para devolver `code`/`name`; `?search=` aplica ILIKE en `product.code` / `product.name`; `?belowReorder=true` filtra `quantity < reorder_point`; `create` mapea `P2002` `(branch_id, product_id)` → `BranchInventoryAlreadyExistsError`; `adjust` usa `$executeRaw` para `UPDATE ... SET quantity = quantity + ${delta} WHERE id = ${id} AND quantity + ${delta} >= 0`; si `executeRaw` retorna 0 filas, distinguir 404 vs error de stock negativo
- [x] 7.2 Crear `infrastructure/repositories/InMemoryBranchInventoryRepository.ts`
- [x] 7.3 Crear `infrastructure/http/BranchInventoryController.ts`: `list`, `getById` (recibe branchId + productId), `create`, `update`, `adjust`, `delete`; schemas Zod: `quantity/reservedQuantity/reorderPoint >= 0`, `delta` cualquier número, `reason?` string max 200
- [x] 7.4 Crear `infrastructure/di/container.ts` que instancia repo Prisma + 6 use cases + controller; exporta `branchInventoryController`

## 8. Route Handlers (`app/api/v1/admin/`)

- [x] 8.1 Crear `app/api/v1/admin/products/route.ts` con `GET` (perm `products:read`) y `POST` (perm `products:write`)
- [x] 8.2 Crear `app/api/v1/admin/products/[id]/route.ts` con `GET`, `PATCH`, `DELETE`
- [x] 8.3 Crear `app/api/v1/admin/products/[id]/prices/route.ts` con `GET` y `POST` (perm `products:write`)
- [x] 8.4 Crear `app/api/v1/admin/products/[id]/prices/[priceId]/route.ts` con `PATCH` y `DELETE`
- [x] 8.5 Crear `app/api/v1/admin/products/[id]/dosifications/route.ts` con `GET` y `POST`
- [x] 8.6 Crear `app/api/v1/admin/products/[id]/dosifications/[dosificationId]/route.ts` con `PATCH` y `DELETE`
- [x] 8.7 Crear `app/api/v1/admin/branches/[branchId]/inventory/route.ts` con `GET` (perm `inventory:read`) y `POST` (perm `inventory:write`)
- [x] 8.8 Crear `app/api/v1/admin/branches/[branchId]/inventory/[productId]/route.ts` con `GET`, `PATCH`, `DELETE`
- [x] 8.9 Crear `app/api/v1/admin/branches/[branchId]/inventory/[productId]/adjust/route.ts` con `POST` (perm `inventory:write`)

## 9. Tests unitarios — dominio puro

- [x] 9.1 `tests/unit/modules/products/domain/services/DosificationPriceCalculator.test.ts` — caso simple (precio=100, num_parts=10 → 10.7), caso con decimales, lanza error si `numParts < 1`, precio cero retorna 0 ajustado por 7%

## 10. Tests unitarios — use cases `products`

- [x] 10.1 `ListProductsUseCase.test.ts` — paginación, filtro `departmentId`, filtro `includeInactive`, búsqueda case-insensitive
- [x] 10.2 `GetProductUseCase.test.ts` — found, not found
- [x] 10.3 `CreateProductUseCase.test.ts` — éxito (mínimo: code+name+unit+departmentId), éxito con campos fiscales, `ProductCodeAlreadyInUseError`, error si `departmentId` no existe
- [x] 10.4 `UpdateProductUseCase.test.ts` — éxito, ignora `code` en body, `ProductNotFoundError`, body vacío rechazado
- [x] 10.5 `SoftDeleteProductUseCase.test.ts` — éxito, idempotente, `ProductNotFoundError`
- [x] 10.6 `CreateProductPriceUseCase.test.ts` — éxito, `DuplicatePriceNameError`, primer `isDefault=true` OK, segundo `isDefault=true` lanza `DuplicateDefaultPriceError`
- [x] 10.7 `UpdateProductPriceUseCase.test.ts` — éxito, cambio de `isDefault` exclusivo
- [x] 10.8 `DeleteProductPriceUseCase.test.ts` — éxito (hard delete), `ProductPriceNotFoundError`
- [x] 10.9 `ListProductDosificationsUseCase.test.ts` — devuelve `computedUnitPrice` correcto cuando hay default price, devuelve `null` cuando no hay
- [x] 10.10 `CreateProductDosificationUseCase.test.ts` — éxito, `DuplicateDosificationNameError`, `numParts < 2` rechazado

## 11. Tests unitarios — use cases `inventory`

- [x] 11.1 `ListBranchInventoryUseCase.test.ts` — paginación, filtro `belowReorder`, búsqueda por producto
- [x] 11.2 `CreateBranchInventoryItemUseCase.test.ts` — éxito, `BranchInventoryAlreadyExistsError`, falla si producto inactivo
- [x] 11.3 `UpdateBranchInventoryItemUseCase.test.ts` — set absoluto OK, no permite valores negativos en quantity
- [x] 11.4 `AdjustStockUseCase.test.ts` — delta positivo OK, delta negativo OK si stock suficiente, `NegativeStockNotAllowedError` si resulta negativo, `BranchInventoryRecordNotFoundError` si no existe
- [x] 11.5 `DeleteBranchInventoryItemUseCase.test.ts` — éxito, idempotente o lanza not-found (decidir)

## 12. Tests unitarios — controllers (validación Zod)

- [x] 12.1 `ProductsController.test.ts` — code inválido rechazado, code normalizado a uppercase, `departmentId` no-UUID rechazado, `ivaRate` fuera de rango rechazado, `satProductCode` formato inválido rechazado, search<2 chars rechazado
- [x] 12.2 `ProductPricesController.test.ts` — `price < 0` rechazado, `minQuantity < 1` rechazado, `discountPct > 100` rechazado, body vacío en update rechazado
- [x] 12.3 `ProductDosificationsController.test.ts` — `numParts < 2` rechazado, `name` vacío rechazado
- [x] 12.4 `BranchInventoryController.test.ts` — `quantity < 0` rechazado, `delta` no-numérico rechazado, `branchId` no-UUID rechazado

## 13. Tests de integración

- [x] 13.1 `tests/integration/modules/products/products-crud.test.ts` — flujo end-to-end: crear departamento → crear producto → añadir 2 precios (uno default) → añadir dosificación → GET dosificación verifica `computedUnitPrice` correcto → editar producto → softDelete → list (no aparece) → list `?includeInactive=true` (aparece) → cleanup
- [x] 13.2 `tests/integration/modules/inventory/inventory-crud.test.ts` — crear branch + producto → crear inventory record con stock inicial → adjust positivo → adjust negativo → adjust que excedería negativo (verificar `NegativeStockNotAllowedError`) → GET `?belowReorder=true` → cleanup

## 14. Verificación RBAC y permisos

- [x] 14.1 Verificar con `curl`: login como `viewer` → `GET /api/v1/admin/products` 200 OK; `POST /api/v1/admin/products` 403 `{"required":"products:write"}`
- [x] 14.2 Verificar con `curl`: login como `operator` → `GET /api/v1/admin/branches/.../inventory` 200; `POST /api/v1/admin/branches/.../inventory/.../adjust` 200
- [x] 14.3 Verificar en BD que los 4 nuevos permisos existen y están asignados correctamente (`SELECT * FROM permissions WHERE key LIKE 'products:%' OR key LIKE 'inventory:%'`)

## 15. Documentación brownfield

- [x] 15.1 Crear `docs/legacy-products-import.md` con el SQL de mapping documentado en `design.md` (Decisión 14) y notas operativas: cargar `legacy_products` desde CSV, ejecutar el INSERT, verificar conteo, errores comunes (departamentos faltantes)
- [x] 15.2 Documentar en el mismo archivo los campos brownfield que NO migran automáticamente (precios, dosificaciones, stock) y cómo capturarlos manualmente o vía import posterior

## 16. Verificación final

- [x] 16.1 Ejecutar `npm run build` — 0 errores de TypeScript
- [x] 16.2 Ejecutar `npm test` — todos los tests pasan (nuevos + suite existente)
- [x] 16.3 Actualizar `CLAUDE.md`: añadir sección "Productos e Inventario (Backend)" con los endpoints, permisos requeridos, reglas (soft delete en products/dosifications, hard delete en prices/inventory, fórmula de dosificación con surcharge fijo del 7%), schemas Zod relevantes, y referencia al doc de migración brownfield
- [x] 16.4 Actualizar la sección OpenSpec de `CLAUDE.md` con el change en curso
