## 1. Prisma schema + migración

- [x] 1.1 Añadir modelo `Return` a `prisma/schema.prisma` con campos: `id @id @default(uuid())`, `saleId @map("sale_id")`, `branchId @map("branch_id")`, `customerId? @map("customer_id")`, `creatorId @map("creator_id") @db.Uuid`, `status @db.VarChar(20)` (default `"completed"`), `reason @db.Text`, `returnedAt @map("returned_at")`, `refundSubtotal @map("refund_subtotal") @db.Decimal(14, 4)`, `refundTax @map("refund_tax") @db.Decimal(14, 4)`, `refundTotal @map("refund_total") @db.Decimal(14, 4)`, `notes? @db.Text`, `cancelledAt? @map("cancelled_at")`, `cancelledBy? @map("cancelled_by") @db.Uuid`, `cancellationReason? @db.Text @map("cancellation_reason")`, `createdAt`, `updatedAt`; relaciones a `Sale` (RESTRICT), `Branch` (RESTRICT), `Customer?` (SET NULL), `User (creator)` (RESTRICT, `@relation("UserReturnsCreated")`), `User? (cancelledBy)` (SET NULL, `@relation("UserReturnsCancelled")`); índices en `saleId`, `branchId`, `customerId`, `status`, `returnedAt`, `createdAt`; `@@map("returns")`
- [x] 1.2 Añadir modelo `ReturnItem` con campos: `id`, `returnId @map("return_id")`, `saleItemId @map("sale_item_id")`, `productId @map("product_id")`, `productPriceId? @map("product_price_id")`, `productCodeSnapshot @db.VarChar(32) @map("product_code_snapshot")`, `productNameSnapshot @db.VarChar(200) @map("product_name_snapshot")`, `priceNameSnapshot @db.VarChar(60) @map("price_name_snapshot")`, `quantity @db.Decimal(14, 4)`, `unitPrice @db.Decimal(12, 4) @map("unit_price")`, `discountPct? @db.Decimal(5, 2) @map("discount_pct")`, `ivaRate? @db.Decimal(5, 4) @map("iva_rate")`, `iepsRate? @db.Decimal(5, 4) @map("ieps_rate")`, `lineSubtotal @db.Decimal(14, 4) @map("line_subtotal")`, `lineTax @db.Decimal(14, 4) @map("line_tax")`, `lineTotal @db.Decimal(14, 4) @map("line_total")`; relaciones `return` (CASCADE), `saleItem` (RESTRICT), `product` (RESTRICT), `productPrice?` (SET NULL); índices en `returnId`, `saleItemId`, `productId`; `@@map("return_items")`
- [x] 1.3 Modificar relaciones inversas en `Sale` (añadir `returns Return[]`), `SaleItem` (añadir `returnItems ReturnItem[]`), `Branch` (añadir `returns Return[]`), `Customer` (añadir `returns Return[]`), `User` (añadir `returnsCreated Return[] @relation("UserReturnsCreated")` y `returnsCancelled Return[] @relation("UserReturnsCancelled")`), `Product` (añadir `returnItems ReturnItem[]`), `ProductPrice` (añadir `returnItems ReturnItem[]`)
- [x] 1.4 Crear migración: `npx prisma migrate dev --name add_returns_tables`
- [x] 1.5 Verificar el SQL generado:
  - Tablas `returns` y `return_items` creadas con todos los índices listados
  - Tipos: `returns.refund_subtotal/refund_tax/refund_total` son `DECIMAL(14, 4)`; `return_items.quantity` es `DECIMAL(14, 4)`; `returns.returned_at/cancelled_at/created_at/updated_at` son `TIMESTAMP(3)`; `returns.creator_id/cancelled_by` son `UUID` (consistente con `sales.cashier_id`)
  - Verificar FKs: `returns_sale_id_fkey` RESTRICT, `returns_branch_id_fkey` RESTRICT, `returns_customer_id_fkey` SET NULL, `returns_creator_id_fkey` RESTRICT, `returns_cancelled_by_fkey` SET NULL, `return_items_return_id_fkey` CASCADE, `return_items_sale_item_id_fkey` RESTRICT, `return_items_product_id_fkey` RESTRICT, `return_items_product_price_id_fkey` SET NULL
  - Añadir manualmente si Prisma no lo hace: `CHECK (refund_subtotal >= 0)`, `CHECK (refund_tax >= 0)`, `CHECK (refund_total >= 0)` en `returns`; `CHECK (quantity > 0)` en `return_items`
- [x] 1.6 Aplicar migración contra Supabase (proyecto `qzzjpyepggwautckqeex`) vía MCP `apply_migration` + registrar en `_prisma_migrations` con su checksum para que `npx prisma migrate deploy` futuro no la re-aplique
- [x] 1.7 Ejecutar `npx prisma generate` y verificar que los tipos `Return`, `ReturnItem` existen en `@prisma/client`

## 2. Seed RBAC — 3 permisos nuevos

- [x] 2.1 Actualizar `prisma/seed.ts`: añadir al array `PERMISSIONS` las claves `returns:read` ("Leer devoluciones"), `returns:create` ("Registrar devoluciones"), `returns:cancel` ("Cancelar devoluciones")
- [x] 2.2 Actualizar el rol `admin` para incluir los 3 nuevos permisos
- [x] 2.3 Actualizar el rol `operator` para incluir los 3 nuevos permisos
- [x] 2.4 Actualizar el rol `viewer` para incluir SÓLO `returns:read`
- [x] 2.5 Ejecutar `npm run seed` y verificar: `SELECT COUNT(*) FROM permissions = 34`; admin/operator tienen los 3 (`returns:read/create/cancel`); viewer sólo tiene `returns:read`

## 3. Dominio `returns` (`src/modules/returns/domain/`)

- [x] 3.1 Crear `domain/entities/Return.ts` con factory `Return.create({ saleId, branchId, customerId, creatorId, reason, returnedAt, items?, notes? })` que inicializa `status='completed'`, refund totals en 0 (se sobreescriben en el use case tras calcular), `cancelledAt=null`, `cancelledBy=null`, `cancellationReason=null`, timestamps
- [x] 3.2 Crear `domain/entities/ReturnItem.ts` con factory que recibe los campos snapshot ya calculados (saleItemId, productId, productPriceId, código/nombre/precio snapshot, quantity, rates, line totals)
- [x] 3.3 Crear `domain/value-objects/ReturnStatus.ts` con union/enum `'completed' | 'cancelled'` y guards (`canBeCancelled`)
- [x] 3.4 Crear `domain/services/ReturnableQuantityCalculator.ts` con método estático `computeRemaining(soldQuantity, priorReturnItems): Decimal` — implementar regla "sum activeReturnQty + thisReturnQty <= soldQty"; lanzar error si `soldQuantity <= 0` o si algún item tiene `quantity <= 0`
- [x] 3.5 Crear `domain/services/ReturnTotalsCalculator.ts` con método estático `computeTotals(lines: ReturnLineInput[]): ReturnTotalsResult` — implementar la fórmula del spec `returns-api` con redondeo banker's a 4 decimales; lanzar errores tipados ante entradas inválidas. Implementación 1:1 con `SaleTotalsCalculator`
- [x] 3.6 Crear errores tipados en `domain/errors/`: `ReturnNotFoundError`, `ReturnAlreadyCancelledError`, `SaleNotReturnableError(status)`, `EmptyReturnError`, `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)`, `SaleItemNotPartOfSaleError(saleItemId)`

## 4. Aplicación `returns` (`src/modules/returns/application/`)

- [x] 4.1 Crear puerto `ports/ReturnRepository.ts` con métodos:
  - `findAll({ page, pageSize, branchId?, customerId?, saleId?, statuses?, from?, to?, search? }): Promise<{ items: Return[], total: number }>` (sumarios sin items; join a `sales`/`customers`/`users`/`branches` para los display fields)
  - `findByIdWithItems(id): Promise<ReturnWithItems | null>`
  - `findBySaleId(saleId): Promise<ReturnWithItems[]>` (para `GET /sales/:id/returns`; incluye `cancelled`)
  - `findPriorReturnItemsBySaleItemIds(saleItemIds: string[], tx?): Promise<{ saleItemId: string; quantity: Decimal; returnStatus: string }[]>` (carga acumulados activos+cancelados por línea; el use case filtra por status)
  - `aggregateReturnedQuantityBySaleItemIds(saleItemIds: string[]): Promise<Record<string, number>>` (consumido por `pos-api` para el campo `returnedQuantityBySaleItem`; sólo `status='completed'`)
  - `createWithItems(returnEntity, items, tx): Promise<ReturnWithItems>` (transaccional: incrementa inventario por item + INSERT return + INSERT return_items)
  - `markCancelled(id, userId, reason, items, tx): Promise<Return>` (transaccional: decrementa inventario por item + UPDATE returns)
- [x] 4.2 Crear DTOs en `application/dto/`: `ReturnDto`, `ReturnDetailDto` (extiende con `items: ReturnItemDto[]`), `ReturnItemDto`, `ReturnItemInput`, `ListReturnsRequest/Response`, `CreateReturnRequest`, `CancelReturnRequest`; mappers `toReturnDto`, `toReturnDetailDto`, `toReturnItemDto`
- [x] 4.3 Crear `CreateReturnUseCase`: recibe `CreateReturnRequest` + `creatorId`; carga `sale` con items via `saleRepository.findByIdWithItems`; valida `sale.status === 'completed'` (sino `SaleNotReturnableError(status)`); valida `items.length >= 1` (sino `EmptyReturnError`); para cada item: verifica `saleItemId` pertenece a `sale.items` (sino `SaleItemNotPartOfSaleError`), carga prior returnItems via `repo.findPriorReturnItemsBySaleItemIds`, computa `remaining = ReturnableQuantityCalculator.computeRemaining(soldQty, prior)`, valida `requested <= remaining` (sino `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)`); snapshotea desde el `sale_item`; computa totales via `ReturnTotalsCalculator`; orquesta `prisma.$transaction` donde invoca `repo.createWithItems` (incrementa inventario + persiste). Devuelve `ReturnDetailDto`
- [x] 4.4 Crear `ListReturnsUseCase` y `GetReturnUseCase` (delegan al repo; el scoping se aplica en el controller)
- [x] 4.5 Crear `ListReturnsBySaleUseCase`: carga `sale` (404 si no existe), delega a `repo.findBySaleId`; el scoping y el guard de existencia se aplican en el controller antes de invocar
- [x] 4.6 Crear `CancelReturnUseCase`: carga la devolución con items; si `status === 'cancelled'` → `ReturnAlreadyCancelledError`; orquesta `prisma.$transaction` donde invoca `repo.markCancelled(id, userId, reason, items, tx)` (decrementa inventario por cada item — permite negativo — + UPDATE returns)

## 5. Infraestructura `returns` (`src/modules/returns/infrastructure/`)

- [x] 5.1 Crear `infrastructure/repositories/PrismaReturnRepository.ts`: implementar los 7 métodos del puerto. `findAll` con paginación + JOINs a `sales`, `branches`, `customers`, `users (creator)` para sumarios; búsqueda en `sales.folio_code`/`sales.folio_number::text`/`customer.name`/`customer.rfc` con `OR ILIKE`. `findPriorReturnItemsBySaleItemIds` ejecuta `SELECT ri.sale_item_id, ri.quantity, r.status FROM return_items ri JOIN returns r ON r.id = ri.return_id WHERE ri.sale_item_id IN (?)` (NO filtra por status — el use case decide). `aggregateReturnedQuantityBySaleItemIds` ejecuta `SELECT ri.sale_item_id, SUM(ri.quantity) FROM return_items ri JOIN returns r ON r.id = ri.return_id WHERE ri.sale_item_id IN (?) AND r.status = 'completed' GROUP BY ri.sale_item_id`. `createWithItems` ejecuta dentro de tx: para cada item `$executeRaw UPDATE branch_inventory SET quantity = quantity + ? WHERE branch_id = ? AND product_id = ?`; si 0 rows afectadas → INSERT branch_inventory con `quantity = qty`; luego INSERT returns + INSERT return_items. `markCancelled` ejecuta dentro de tx: para cada item `$executeRaw UPDATE branch_inventory SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ?`; si 0 rows afectadas → INSERT branch_inventory con `quantity = -qty`; luego `UPDATE returns SET status='cancelled', cancelled_at=NOW(), cancelled_by=?, cancellation_reason=?`
- [x] 5.2 Crear `infrastructure/repositories/InMemoryReturnRepository.ts` para tests (mantiene `Map<id, Return>` y `Map<id, ReturnItem[]>`, simula el incremento/decremento contra un `InMemoryBranchInventoryRepository` inyectado; NO necesita transacciones reales pero respeta la semántica idempotente y atómica esperada)
- [x] 5.3 Crear `infrastructure/http/ReturnsController.ts` con métodos `list`, `getById`, `listBySale`, `create`, `cancel`. Schemas Zod inline: `saleId/saleItemId` UUID, `items[].quantity` decimal > 0, `reason` `.trim().min(3).max(500)`, `notes` max 1000, `returnedAt` ISO 8601 con refine `new Date(v) <= new Date()`, cancel `reason` max 500 nullable. Mapeo errores → HTTP:
  - `ReturnNotFoundError` → 404
  - `SaleNotReturnableError(status)` → 409 con `status`
  - `ReturnAlreadyCancelledError` → 409
  - `EmptyReturnError` → 400
  - `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)` → 409 con esos tres campos
  - `SaleItemNotPartOfSaleError(saleItemId)` → 400 con `saleItemId`
  - "Sale not found" (interno de `CreateReturnUseCase`) → 400 `{"error": "Sale not found"}` (no 404 porque el sale es input del body)
- [x] 5.4 Implementar el guard de branch scoping en `ReturnsController` usando el helper compartido `enforceBranchScope(req, resourceBranchId)` y `resolveScopedBranchId(req, queryBranchId)` de `src/modules/rbac/infrastructure/http/enforceBranchScope.ts`. Para `create`: cargar `sale.branchId` ANTES del scoping (404→400 si sale no existe, sino 403 si scoping falla). Para `getById`/`cancel`: cargar `return.branchId` ANTES (404 si no existe, sino 403). Para `listBySale`: cargar `sale.branchId` (404 si no existe, sino 403). Para `list`: usar `resolveScopedBranchId(req, queryBranchId)`
- [x] 5.5 Crear `infrastructure/di/container.ts`: instancia `PrismaReturnRepository`, importa `saleRepository` (del container de pos), `branchRepository`, `authorizationService`, `prisma`; instancia los 5 use cases + controller; exporta `returnsController`. Importar sólo el repo (no el controller) de pos para no acoplar containers

## 6. Cambios en `pos` — exponer `returnedQuantityBySaleItem` en `SaleDetailDto`

- [x] 6.1 Modificar `SaleDetailDto` (`src/modules/pos/application/dto/SaleDto.ts`) para incluir `returnedQuantityBySaleItem: Record<string, number>` (omitiendo keys cuyo valor sería 0)
- [x] 6.2 Modificar el mapper `toSaleDetailDto` para aceptar `returnedAggregate?: Record<string, number>` y pasarlo al DTO; si está vacío, el campo es `{}`
- [x] 6.3 Modificar `PrismaSaleRepository.findByIdWithItems` para, tras cargar `sale + sale_items`, ejecutar `SELECT ri.sale_item_id, SUM(ri.quantity)::float8 FROM return_items ri JOIN returns r ON r.id = ri.return_id WHERE ri.sale_item_id = ANY($1::text[]) AND r.status = 'completed' GROUP BY ri.sale_item_id` y mapear el resultado a `Record<saleItemId, number>`. Pasarlo al mapper
- [x] 6.4 Modificar `InMemorySaleRepository.findByIdWithItems` (si existe) para soportar el agregado en tests; aceptar un repo de returns opcional inyectado o devolver `{}` por defecto
- [x] 6.5 Verificar que `SalesController.getById` no requiere cambios (el DTO ya viaja con el nuevo campo)

## 7. Route Handlers `returns` (`app/api/v1/admin/returns/` + helper en `sales/[id]/returns`)

- [x] 7.1 Crear `app/api/v1/admin/returns/route.ts` con `GET` (perm `returns:read`) y `POST` (perm `returns:create`). Cada handler llama `requirePermission(req, ...)` primero, luego delega a `returnsController.list(req)` / `returnsController.create(req)`
- [x] 7.2 Crear `app/api/v1/admin/returns/[id]/route.ts` con `GET` (perm `returns:read`) que delega a `returnsController.getById(req, params)`
- [x] 7.3 Crear `app/api/v1/admin/returns/[id]/cancel/route.ts` con `POST` (perm `returns:cancel`)
- [x] 7.4 Crear `app/api/v1/admin/sales/[id]/returns/route.ts` con `GET` (perm `returns:read`) que delega a `returnsController.listBySale(req, params)`. NOTA: este route handler vive bajo `sales/` pero importa `returnsController` del container de returns

## 8. Tests unitarios — dominio puro

- [x] 8.1 `tests/unit/modules/returns/domain/services/ReturnableQuantityCalculator.test.ts` — sin prior returns, una `completed`, varias `completed`, una `cancelled` (no cuenta), `completed`+`cancelled` mixtas, devolución total (remaining=0), fracciones decimales, `soldQuantity <= 0` lanza, item con `quantity <= 0` lanza
- [x] 8.2 `tests/unit/modules/returns/domain/services/ReturnTotalsCalculator.test.ts` — línea simple, con descuento, con IVA, con IEPS, con ambos, sin tasas (nulls → 0), multi-línea agregada, redondeo banker's en valores límite, entradas inválidas lanzan error. **Bloque de equivalencia**: importa los vectores compartidos de `tests/fixtures/totals-vectors.ts` y verifica `ReturnTotalsCalculator.computeTotals(input)` equivale a `SaleTotalsCalculator.computeTotals(input)` y `QuoteTotalsCalculator.computeTotals(input)`
- [x] 8.3 `tests/unit/modules/returns/domain/entities/Return.test.ts` — `Return.create()` inicializa props readonly correctamente; `canBeCancelled()` true sólo en `completed`. Las transiciones se aplican en el use case + repository, no en la entidad

## 9. Tests unitarios — use cases `returns`

- [x] 9.1 `CreateReturnUseCase.test.ts` — happy path (devolución parcial): inventario incrementa, `Return.status='completed'`, snapshots correctos, totales correctos. `EmptyReturnError` con items vacíos. `SaleNotReturnableError` con sale `cancelled` o `edited`. `SaleItemNotPartOfSaleError` cuando `saleItemId` es de otra venta. `ReturnQuantityExceedsRemainingError` cuando `requested > remaining` (incluyendo escenario con devolución previa `completed` que reduce remaining). Verifica que una devolución previa `cancelled` NO reduce remaining (el caso "free space restored"). Verifica que no toca `sale_items` (asertar mocks)
- [x] 9.2 `ListReturnsUseCase.test.ts` — paginación, filtro por `branchId`/`customerId`/`saleId`, filtro por `status` múltiple, filtro por rango de fechas (`returned_at`), búsqueda
- [x] 9.3 `GetReturnUseCase.test.ts` — found con items, not found
- [x] 9.4 `ListReturnsBySaleUseCase.test.ts` — devuelve completed + cancelled en orden DESC por `returned_at`; sale not found → 404 conceptual; sale sin returns → `[]`
- [x] 9.5 `CancelReturnUseCase.test.ts` — happy path: inventario decrementa, `status='cancelled'`. `ReturnAlreadyCancelledError` si ya cancelled. Verifica que inventario puede quedar negativo si la cantidad a decrementar excede el stock actual. Verifica que NO toca `sale_items` ni `sales`

## 10. Tests unitarios — controllers (validación Zod + scoping)

- [x] 10.1 `ReturnsController.create.test.ts` — body inválido (saleId UUID malformado, items vacíos, quantity negativa, reason < 3 chars, returnedAt malformado/futuro), scoping mismatch → 403, sale no encontrada → 400, sale cancelada → 409 con `status`, sale editada → 409 con `status`, item de otra venta → 400, exceeds remaining → 409, 201 happy path. Verifica que el body con `branchId`/`customerId` los ignora (no figuran en el schema)
- [x] 10.2 `ReturnsController.cancel.test.ts` — happy path → 200, doble cancel → 409, no encontrada → 404, scoping mismatch → 403
- [x] 10.3 `ReturnsController.list.test.ts` — scoping implícito por branch, operator sin bypass → 403 con otra sucursal, operator sin branch → 403, admin con bypass → todas, pageSize > 100 → 400, search < 2 chars → 400, filtros `saleId`/`status`/`from`/`to`
- [x] 10.4 `ReturnsController.getById.test.ts` — 200 con items, 404 no existe, 403 scoping (no existence-leak: 404 antes de scoping si el id no existe), 400 UUID malformado
- [x] 10.5 `ReturnsController.listBySale.test.ts` — 200 con array completed+cancelled, 200 con array vacío, 404 sale no existe, 403 scoping
- [x] 10.6 `SalesController.test.ts` extendido: `GET /sales/:id` happy path verifica que `returnedQuantityBySaleItem` está presente y aggrega correctamente (mockear `returnRepo.aggregateReturnedQuantityBySaleItemIds` o equivalente). Sin returns → `{}`. Con returns mixtos `completed` + `cancelled` → sólo `completed` aparece

## 11. Tests de integración (Supabase real)

- [x] 11.1 `tests/integration/modules/returns/returns-create-and-cancel.test.ts`: crear venta de 10 unidades de producto P → `POST /returns` con `quantity=3` → 201, verificar `branch_inventory.quantity` incrementado por 3 y `Return.status='completed'`. `POST /returns` segundo con `quantity=8` → 409 `ReturnQuantityExceedsRemainingError(remaining=7)`. `POST /returns` con `quantity=5` → 201. `POST /returns/:id/cancel` (primer return) → 200, verificar `branch_inventory.quantity` revertido. Verificar que el `sale_items` original es inmutable byte-for-byte
- [x] 11.2 `tests/integration/modules/returns/returns-branch-scoping.test.ts`: setup operator de A y operator de B con dos ventas (una por sucursal). Verificar: operator A no puede ver/cancelar/crear returns sobre venta de B (403), operator A puede sobre venta de A (200/201). Admin puede sobre cualquiera. operator sin branch → 403 en list/create/getById/cancel
- [x] 11.3 `tests/integration/modules/returns/returns-edge-cases.test.ts`: (a) sale `cancelled` → 409 SaleNotReturnableError, (b) sale `edited` → 409 SaleNotReturnableError, (c) `saleItemId` de otra venta → 400, (d) cancelar return → free space restored: re-crear return por la misma cantidad → 201, (e) cancelar return cuando inventario actual < cantidad a un-return → inventario queda negativo y la cancelación devuelve 200
- [x] 11.4 `tests/integration/modules/returns/returns-rbac-smoke.test.ts`: viewer → `userCan(viewer, "returns:read") === true`; otros 2 → false. operator → 3 true. admin → 3 true + `branches:access_all` true. Verifica `SELECT key FROM permissions WHERE key LIKE 'returns:%'` devuelve 3 keys; `COUNT(*) FROM permissions >= 34`
- [x] 11.5 `tests/integration/modules/pos/sales-with-returns-aggregate.test.ts`: crear venta con 3 items A/B/C → `GET /sales/:id` → `returnedQuantityBySaleItem` es `{}`. Crear return de 2A y 1C → `GET /sales/:id` → `{ "<aId>": 2, "<cId>": 1 }` (B ausente). Crear segundo return de 1A → `{ "<aId>": 3, "<cId>": 1 }`. Cancelar el primer return → `{ "<aId>": 1 }` (la C ya no aparece, A sólo cuenta el return vivo)
- [x] 11.6 `tests/integration/modules/pos/cancel-sale-with-returns.test.ts`: crear venta, registrar return completed de parte, cancelar la venta. Verifica que: (a) la venta queda `cancelled`, (b) inventario se incrementa por la cantidad ORIGINAL vendida (no neta), (c) el return sigue existiendo intacto, (d) `returnedQuantityBySaleItem` post-cancel sigue mostrando el return (porque el sale_item original sigue ahí; `GET /sales/:id` debe seguir respondiendo el ticket cancelado). Documenta el comportamiento de "inflación" para reconciliación manual

## 12. Verificación de integridad del esquema — verificar vía `information_schema` / `pg_constraint` / `pg_indexes`

- [x] 12.1 Verificar vía `information_schema.referential_constraints`: las 9 FKs (`returns_sale_id_fkey` RESTRICT; `returns_branch_id_fkey` RESTRICT; `returns_customer_id_fkey` SET NULL; `returns_creator_id_fkey` RESTRICT; `returns_cancelled_by_fkey` SET NULL; `return_items_return_id_fkey` CASCADE; `return_items_sale_item_id_fkey` RESTRICT; `return_items_product_id_fkey` RESTRICT; `return_items_product_price_id_fkey` SET NULL) están presentes con los `delete_rule` correctos
- [x] 12.2 Verificar vía `pg_indexes`: existen `returns_sale_id_idx`, `returns_branch_id_idx`, `returns_customer_id_idx`, `returns_status_idx`, `returns_returned_at_idx`, `returns_created_at_idx`, `return_items_return_id_idx`, `return_items_sale_item_id_idx`, `return_items_product_id_idx`
- [x] 12.3 Verificar vía `pg_constraint contype='c'`: `returns_refund_subtotal_nonneg_chk`, `returns_refund_tax_nonneg_chk`, `returns_refund_total_nonneg_chk`, `return_items_quantity_positive_chk`

## 13. Documentación

- [x] 13.1 Actualizar `CLAUDE.md` añadiendo sección "Devoluciones (Backend)" con: tablas nuevas, endpoints, 3 permisos, ciclo de vida `completed → cancelled`, regla `customerBalance no muta`, regla "no modifica `sale_items`", regla de incremento/decremento atómico de inventario, branch scoping
- [x] 13.2 Actualizar la sección "POS (Backend)" de `CLAUDE.md` para mencionar el nuevo campo `SaleDetailDto.returnedQuantityBySaleItem` y el caveat "cancelar venta con returns vigentes infla el stock"
- [ ] 13.3 Actualizar la lista de changes OpenSpec archivados en `CLAUDE.md` cuando este change pase a archivo (se hace en `/opsx:archive`)

## 14. Verificación final

- [x] 14.1 `npx tsc --noEmit` — 0 errores de TypeScript en código nuevo y modificado
- [x] 14.2 `npx jest --testPathPattern="modules/(returns|pos)"` — todos los tests pasan
- [x] 14.3 Equivalente automatizado contra DB real cubre la cadena completa: `returns-edge-cases.test.ts` caso (d) ejecuta exactamente el flujo "crear venta → return → cancel → re-emitir return por la misma cantidad → 201", verificando que el espacio liberado por la cancelación es reusable. El smoke manual via curl queda como opcional (14.5)
- [x] 14.4 Regresión POS cubierta: `npm test -- --testPathPattern="modules/pos"` ejecuta 113 tests sobre 16 suites, todos en verde. Incluye `sales-create-and-cancel`, `sales-edit-from-hq`, `sales-with-quote-link`, `sales-negative-stock`, `sales-with-returns-aggregate` y `cancel-sale-with-returns`
- [ ] 14.5 Smoke manual via `curl` (opcional, post-deploy):
  - Login como operator con branch asignada
  - `POST /sales` → 201, anotar `saleId` y `saleItemIds`
  - `POST /returns` con `saleId` + 1 item + reason + returnedAt → 201, anotar `returnId`
  - `POST /returns` con `quantity` excediendo remaining → 409
  - `GET /sales/:saleId` → 200 con `returnedQuantityBySaleItem` poblado
  - `POST /returns/:id/cancel` → 200
  - `GET /sales/:saleId` → 200 con `returnedQuantityBySaleItem` sin la clave cancelada
  - Login como operator de OTRA sucursal → `POST /returns` con saleId → 403
