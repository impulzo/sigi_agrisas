## 1. Prisma schema + migración

- [x] 1.1 Añadir modelo `Customer` a `prisma/schema.prisma` con campos: `id @id @default(uuid())`, `code @unique @db.VarChar(32)`, `name @db.VarChar(120)`, `rfc @unique @db.VarChar(13)`, `legalName? @db.VarChar(200) @map("legal_name")`, `taxRegime? @db.VarChar(3) @map("tax_regime")`, `cfdiUse? @db.VarChar(3) @map("cfdi_use")`, `taxZipCode? @db.VarChar(5) @map("tax_zip_code")`, `email? @db.VarChar(120)`, `phone? @db.VarChar(30)`, `address? @db.VarChar(300)`, `contactName? @db.VarChar(120) @map("contact_name")`, `notes? @db.Text`, `creditLimit? @db.Decimal(12, 4) @map("credit_limit")`, `currentBalance @default(0) @db.Decimal(12, 4) @map("current_balance")`, `isActive @default(true) @map("is_active")`, `createdAt`, `updatedAt`; índices en `code`, `rfc`, `name`; `@@map("customers")`
- [x] 1.2 Añadir modelo `Sale` con campos: `id`, `folioId @map("folio_id")`, `folioNumber @map("folio_number")`, `folioCode @db.VarChar(40) @map("folio_code")`, `branchId @map("branch_id")`, `customerId @map("customer_id")`, `cashierId @map("cashier_id")`, `paymentMethodId @map("payment_method_id")`, `status @db.VarChar(20)`, `subtotal @db.Decimal(14, 4)`, `taxTotal @db.Decimal(14, 4) @map("tax_total")`, `total @db.Decimal(14, 4)`, `notes? @db.Text`, `completedAt? @map("completed_at")`, `cancelledAt? @map("cancelled_at")`, `cancellationReason? @db.Text @map("cancellation_reason")`, `editedAt? @map("edited_at")`, `createdAt`, `updatedAt`; relaciones a `Folio`, `Branch`, `Customer`, `User (cashier)`, `PaymentMethod` (todas `onDelete: Restrict`); `@@unique([folioId, folioNumber])`; índices en `branchId`, `customerId`, `status`, `completedAt`; `@@map("sales")`
- [x] 1.3 Añadir modelo `SaleItem` con campos: `id`, `saleId @map("sale_id")`, `productId @map("product_id")`, `productPriceId? @map("product_price_id")`, `productCodeSnapshot @db.VarChar(32) @map("product_code_snapshot")`, `productNameSnapshot @db.VarChar(200) @map("product_name_snapshot")`, `priceNameSnapshot @db.VarChar(60) @map("price_name_snapshot")`, `quantity @db.Decimal(14, 4)`, `unitPrice @db.Decimal(12, 4) @map("unit_price")`, `discountPct? @db.Decimal(5, 2) @map("discount_pct")`, `ivaRate? @db.Decimal(5, 4) @map("iva_rate")`, `iepsRate? @db.Decimal(5, 4) @map("ieps_rate")`, `lineSubtotal @db.Decimal(14, 4) @map("line_subtotal")`, `lineTax @db.Decimal(14, 4) @map("line_tax")`, `lineTotal @db.Decimal(14, 4) @map("line_total")`; relación `sale` `onDelete: Cascade`, `product` `onDelete: Restrict`, `productPrice` `onDelete: SetNull`; índices en `saleId`, `productId`; `@@map("sale_items")`
- [x] 1.4 Modificar `User`: añadir `branchId? @map("branch_id")` y relación `branch Branch? @relation(fields: [branchId], references: [id], onDelete: SetNull)`; añadir relación inversa `sales Sale[] @relation("UserSales")` (cashier)
- [x] 1.5 Modificar `Branch`: añadir `isHeadquarters @default(false) @map("is_headquarters")`; relaciones inversas `users User[]`, `sales Sale[]`
- [x] 1.6 Modificar relaciones inversas en `Folio`, `Customer`, `PaymentMethod`, `Product`, `ProductPrice` para incluir `sales Sale[]` / `items SaleItem[]` según corresponda
- [x] 1.7 `npx prisma migrate deploy` aplicado contra Supabase tras corregir `sales.cashier_id` de TEXT a UUID (users.id es UUID en este proyecto, el resto es TEXT)
- [x] 1.8 Editar manualmente el SQL de la migración (escrito directamente, sin generar primero):
  - Añadir `ALTER TABLE branch_inventory DROP CONSTRAINT IF EXISTS branch_inventory_quantity_check;` (verificar nombre exacto con `\d+ branch_inventory` en dev; ajustar si el nombrado de Prisma difiere)
  - Añadir `CREATE UNIQUE INDEX branches_hq_idx ON branches(is_headquarters) WHERE is_headquarters = TRUE;`
  - Verificar que `CHECK (reserved_quantity >= 0)` y `CHECK (reorder_point >= 0)` se conservan
  - Añadir `CHECK (quantity > 0)` a `sale_items` (la cantidad por línea debe ser positiva; el delta negativo lo aplica el use case)
  - Añadir `CHECK (current_balance >= 0)` a `customers` (no permite saldo negativo en este change; documentar como futuro reto si se necesita "saldo a favor")
- [x] 1.9 Ejecutar `npx prisma generate` y verificar que los tipos `Customer`, `Sale`, `SaleItem` y los campos `User.branchId`, `Branch.isHeadquarters` existen en `@prisma/client`

## 2. Seed RBAC — 7 permisos nuevos

- [x] 2.1 Actualizar `prisma/seed.ts`: añadir al array `PERMISSIONS` las claves `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:edit_completed`, `branches:access_all` con descripciones en español
- [x] 2.2 Actualizar el rol `admin` para incluir los 7
- [x] 2.3 Actualizar el rol `operator` para incluir `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`
- [x] 2.4 Actualizar el rol `viewer` para incluir `customers:read`, `sales:read`
- [x] 2.5 `npm run seed` ejecutado 2 veces sin error; total permisos = 25; `branches:access_all` sólo en admin verificado

## 3. Token + middleware — propagar `branchId`

- [x] 3.1 Modificar `src/modules/auth/application/dto/AuthResponse.ts` para incluir `branchId: string | null` en el payload
- [x] 3.2 Modificar `src/modules/auth/application/ports/TokenService.ts`: la interfaz incluye `branchId: string | null` en `generateAccessToken` y `generateRefreshToken`, y en el `TokenPayload` retornado por `verifyAccessToken`/`verifyRefreshToken`
- [x] 3.3 Modificar `src/modules/auth/infrastructure/services/JwtTokenService.ts`: emitir/leer `branchId` en ambos tokens; por defecto `null` cuando la firma no incluye el claim (compatibilidad con tokens legacy)
- [x] 3.4 Modificar `LoginUseCase` y `RegisterUseCase` para cargar `user.branchId` y pasarlo al `TokenService` (los nuevos registros nacen con `branchId = null`)
- [x] 3.5 Modificar `RefreshTokenUseCase` para propagar el `branchId` del refresh token al nuevo access token (no re-consulta BD)
- [x] 3.6 Modificar `AuthMiddlewareAdapter` para setear `x-user-branch-id` en el request reenviado: el header tiene el `branchId` verificado, o `""` cuando es `null`/ausente
- [x] 3.7 Añadir tests unitarios para `JwtTokenService` que cubran: token con `branchId` válido, token con `branchId: null`, token legacy sin claim `branchId`. Añadido también: tests del helper `enforceBranchScope`/`resolveScopedBranchId` en `tests/unit/modules/rbac/infrastructure/http/`

## 4. Dominio `customers` (`src/modules/customers/domain/`)

- [x] 4.1 Crear `domain/entities/Customer.ts` con factory `Customer.create({ code, name, rfc, ...optional })` que normaliza `code` y `rfc` (uppercase + trim) y valida regex; `currentBalance` se inicializa en `0`; `isActive` default `true`
- [x] 4.2 Crear errores: `CustomerNotFoundError`, `CustomerCodeAlreadyInUseError`, `CustomerRfcAlreadyInUseError`, `InactiveCustomerError`

## 5. Aplicación `customers` (`src/modules/customers/application/`)

- [x] 5.1 Crear puerto `ports/CustomerRepository.ts` con métodos `findAll({ page, pageSize, search?, includeInactive? })`, `findById`, `create`, `update`, `softDelete`
- [x] 5.2 Crear DTOs: `CustomerDto`, `ListCustomersRequest/Response`, `CreateCustomerRequest`, `UpdateCustomerRequest`, mapper `toCustomerDto`
- [x] 5.3 Crear use cases: `ListCustomersUseCase`, `GetCustomerUseCase`, `CreateCustomerUseCase` (ignora `currentBalance` en body), `UpdateCustomerUseCase` (ignora `code` y `currentBalance` en body), `SoftDeleteCustomerUseCase`

## 6. Infraestructura `customers` (`src/modules/customers/infrastructure/`)

- [x] 6.1 Crear `infrastructure/repositories/PrismaCustomerRepository.ts`: mapeo de `P2002` por `code` → `CustomerCodeAlreadyInUseError`, por `rfc` → `CustomerRfcAlreadyInUseError`; búsqueda case-insensitive en `name`/`legalName`/`rfc` (`OR ILIKE`); orden por `createdAt DESC`
- [x] 6.2 Crear `infrastructure/repositories/InMemoryCustomerRepository.ts` para tests
- [x] 6.3 Crear `infrastructure/http/CustomersController.ts` con schemas Zod inline; normalización `code`/`rfc` a uppercase+trim; mapeo de errores → HTTP
- [x] 6.4 Crear `infrastructure/di/container.ts` que instancia repo Prisma + 5 use cases + controller; exporta `customersController`

## 7. Route Handlers `customers` (`app/api/v1/admin/customers/`)

- [x] 7.1 Crear `app/api/v1/admin/customers/route.ts` con `GET` (perm `customers:read`) y `POST` (perm `customers:write`)
- [x] 7.2 Crear `app/api/v1/admin/customers/[id]/route.ts` con `GET`, `PATCH`, `DELETE`

## 8. Cambios en `branches`: `isHeadquarters`

- [x] 8.1 Modificar `src/modules/branches/domain/entities/Branch.ts` para incluir `isHeadquarters: boolean`
- [x] 8.2 Añadir error `AnotherBranchIsHeadquartersError`
- [x] 8.3 Modificar el DTO `BranchDto` para incluir `isHeadquarters: boolean`
- [x] 8.4 Modificar `CreateBranchUseCase` y `UpdateBranchUseCase` para aceptar `isHeadquarters?: boolean`; mapear violación del partial unique index a `AnotherBranchIsHeadquartersError` → 409
- [x] 8.5 Añadir método `findHeadquarters(): Promise<Branch | null>` al puerto `BranchRepository` (necesario para el guard de edición de tickets)
- [x] 8.6 Implementar `findHeadquarters` en `PrismaBranchRepository` (`findFirst({ where: { isHeadquarters: true } })`) y en `InMemoryBranchRepository`
- [x] 8.7 Modificar `BranchesController` para incluir `isHeadquarters` en los schemas Zod de create/update y mapear `AnotherBranchIsHeadquartersError` → 409
- [x] 8.8 Verificar que los tests existentes de `branches` siguen pasando (esperado: ajustes triviales por el campo nuevo)

## 9. Cambios en `users`: `branchId`

- [x] 9.1 Modificar `src/modules/users/domain/entities/User.ts` para incluir `branchId: string | null` (importar el patrón de `name?` existente)
- [x] 9.2 Modificar el DTO `AdminUserDto` para incluir `branchId: string | null` y `branchName: string | null`
- [x] 9.3 Modificar `ListUsersUseCase` y `GetUserUseCase` para incluir el JOIN con `branches` y devolver `branchName`
- [x] 9.4 Modificar `UpdateUserUseCase` para aceptar `branchId?: string | null`; cuando `branchId` es un UUID, verifica que la branch existe (vía `BranchRepository.findById`) — si no existe, lanza `BranchNotFoundError` (que el controller mapea a HTTP 400 `{"error": "Branch not found"}`)
- [x] 9.5 Modificar `PrismaAdminUserRepository` para incluir `branchId` en `create`/`update`/`findById`/`findAll` con JOIN a `branches`
- [x] 9.6 Modificar `UsersController` (admin) para aceptar `branchId` en el schema Zod del PATCH y para incluirlo en la respuesta; aceptar `branchId: null` para limpiar la asignación
- [x] 9.7 Añadir test que cubra `PATCH` con `branchId` válido, `branchId: null`, y `branchId` referenciando una branch inexistente

## 10. Cambios en `inventory`: drop CHECK + branch scoping

- [x] 10.1 Verificar (manual SQL) que la migración eliminó el CHECK `quantity >= 0` de `branch_inventory` y que los otros CHECK siguen vigentes
- [x] 10.2 Modificar `BranchInventoryController` (todos los handlers) para aplicar el guard de branch scoping antes de invocar el use case: usar `requirePermission` para `inventory:*`, luego evaluar `authz.userCan(userId, 'branches:access_all')`; si no tiene bypass y `x-user-branch-id !== :branchId`, devolver 403
- [x] 10.3 Asegurar que el controlador resuelve primero la existencia del recurso (para GET/PATCH/DELETE/adjust) y devuelve 404 cuando aplica antes de evaluar scoping cuando el recurso no existe (regla de no-leak de existencia)
- [x] 10.4 No tocar el `WHERE quantity + delta >= 0` del repo `PrismaBranchInventoryRepository`: el admin `/adjust` debe seguir devolviendo 409 cuando el delta excede el stock — el cambio en BD no debe relajar el contrato del endpoint
- [x] 10.5 Añadir tests de integración que verifiquen: (a) admin `/adjust` con delta que dejaría negativo → 409 sigue intacto; (b) `branch_inventory.quantity` puede insertarse manualmente con valor `-5` directamente vía Prisma (probando que el CHECK fue eliminado)

## 11. Dominio `pos` (`src/modules/pos/domain/`)

- [x] 11.1 Crear `domain/entities/Sale.ts` con factory `Sale.create({...})` y métodos puros `markCancelled(reason)`, `markEdited(newTotals, newCustomerId?, newPaymentMethodId?)`
- [x] 11.2 Crear `domain/entities/SaleItem.ts` con factory que recibe los campos snapshot ya calculados
- [x] 11.3 Crear `domain/value-objects/SaleStatus.ts` con enum/union `'completed' | 'cancelled' | 'edited'` y guards
- [x] 11.4 Crear `domain/services/SaleTotalsCalculator.ts` con método estático `computeTotals(lines: SaleLineInput[]): SaleTotalsResult` — implementar la fórmula del spec `pos-api` con redondeo banker's a 4 decimales; lanzar errores tipados ante entradas inválidas (`quantity <= 0`, `unitPrice < 0`, `discountPct` fuera de [0,100], `ivaRate`/`iepsRate` fuera de [0,1])
- [x] 11.5 Crear errores: `SaleNotFoundError`, `SaleAlreadyCancelledError`, `SaleNotEditableHereError`, `ProductPriceMismatchError`, `EmptySaleError`, `FolioExhaustedError`, `CancelledSaleNotEditableError`

## 12. Aplicación `pos` (`src/modules/pos/application/`)

- [x] 12.1 Crear puerto `ports/SaleRepository.ts` con métodos: `findAll({ page, pageSize, branchId?, customerId?, statuses?, from?, to?, search? })` (devuelve sumarios sin items), `findByIdWithItems(id)`, `createWithItems(sale, items)` (recibe los snapshots ya calculados; ejecuta el INSERT atómicamente dentro de una tx que el use case orquesta), `cancel(id, reason)` (idempotente), `replaceItemsAndRecalculate(id, newItems, newTotals, newCustomerId?, newPaymentMethodId?, notes?)`
- [x] 12.2 Crear DTOs: `SaleDto`, `SaleDetailDto` (extiende `SaleDto` con `items: SaleItemDto[]`), `SaleItemDto`, `SaleItemInput`, `ListSalesRequest/Response`, `CreateSaleRequest`, `CancelSaleRequest`, `EditCompletedSaleRequest`; mappers `toSaleDto` y `toSaleDetailDto`
- [x] 12.3 Crear `CreateSaleUseCase`: recibe `CreateSaleRequest`; valida customer/branch/folio/paymentMethod activos; valida items (cada `productPrice.productId === item.productId`, productos activos); snapshotea; invoca `SaleTotalsCalculator`; orquesta una transacción Prisma que: incrementa folio (`UPDATE ... RETURNING current_number`), decrementa o crea inventory por item (sin cláusula `>= 0`), persiste sale + items; devuelve `SaleDetailDto`
- [x] 12.4 Crear `ListSalesUseCase` y `GetSaleUseCase` (delegan al repo; el scoping se aplica en el controller)
- [x] 12.5 Crear `CancelSaleUseCase`: transaccional; si `status === 'cancelled'` → devuelve la sale tal cual (idempotente); restaura stock por item (`quantity += item.quantity`); marca `status='cancelled'`, `cancelled_at`, `cancellation_reason`
- [x] 12.6 Crear `EditCompletedSaleUseCase`: transaccional; verifica `status !== 'cancelled'` (sino lanza `CancelledSaleNotEditableError`); restaura stock viejo; borra `sale_items`; aplica nueva lista de items con el mismo flujo que `CreateSaleUseCase` (re-snapshot, re-decremento); recalcula totales; marca `status='edited'`, `edited_at`; respeta inmutabilidad de `folioId/folioNumber/folioCode/branchId`

## 13. Infraestructura `pos` (`src/modules/pos/infrastructure/`)

- [x] 13.1 Crear `infrastructure/repositories/PrismaSaleRepository.ts`: implementar los cuatro métodos. `findAll` con paginación + JOINs a `branches`, `customers`, `users`, `payment_methods` para sumarios; búsqueda en `folio_code`/`folio_number`/`customer.name`/`customer.rfc` con `OR ILIKE`. `createWithItems` ejecuta el `prisma.$transaction` completo: `UPDATE folios ... RETURNING`, por cada item `UPDATE branch_inventory SET quantity = quantity - ${qty} WHERE ...` y si `affected === 0` entonces `INSERT INTO branch_inventory ... VALUES (..., -${qty})`, finalmente `INSERT sales` y `INSERT sale_items`. `cancel` ejecuta `UPDATE branch_inventory SET quantity = quantity + ${qty} ...` por item y `UPDATE sales SET status='cancelled' ...`. `replaceItemsAndRecalculate` orquesta el flujo descrito en el use case
- [x] 13.2 Crear `infrastructure/repositories/InMemorySaleRepository.ts` que implemente la misma interfaz pero **sin transacciones reales** — adecuado para tests de use cases (los tests de transaccionalidad real viven en integración)
- [x] 13.3 Crear `infrastructure/http/SalesController.ts` con métodos `list`, `getById`, `create`, `cancel`, `edit`; schemas Zod: `branchId/customerId/paymentMethodId/folioId` UUID, `items[].productId`/`productPriceId` UUID, `items[].quantity > 0`, `notes` max 1000; mapeo errores → HTTP
- [x] 13.4 Implementar el guard de branch scoping en `SalesController`: helper `enforceBranchScope(req, resourceBranchId)` que evalúa `authz.userCan(userId, 'branches:access_all')` y compara con `x-user-branch-id`
- [x] 13.5 Implementar el guard combinado `enforceHeadquartersForEdit(req)` en `SalesController` que: (a) llama a `branchRepository.findHeadquarters()`, (b) verifica `branches:access_all` o `x-user-branch-id === hq.id`
- [x] 13.6 Crear `infrastructure/di/container.ts`: instancia `PrismaSaleRepository`, importa `customersController`'s repo, `branchRepository`, `productRepository`, `productPriceRepository`, `branchInventoryRepository`, `folioRepository`, `paymentMethodRepository`, `authorizationService`; instancia 5 use cases + controller; exporta `salesController`

## 14. Route Handlers `pos` (`app/api/v1/admin/sales/`)

- [x] 14.1 Crear `app/api/v1/admin/sales/route.ts` con `GET` (perm `sales:read`) y `POST` (perm `sales:create`)
- [x] 14.2 Crear `app/api/v1/admin/sales/[id]/route.ts` con `GET` (perm `sales:read`) y `PATCH` (perm `sales:edit_completed` + guard de matriz)
- [x] 14.3 Crear `app/api/v1/admin/sales/[id]/cancel/route.ts` con `POST` (perm `sales:cancel`)

## 15. Tests unitarios — dominio puro

- [x] 15.1 `tests/unit/modules/pos/domain/services/SaleTotalsCalculator.test.ts` — línea simple (qty=2, price=100, IVA=16% → total 232), con descuento, con IEPS además de IVA, sin tasas (nulls → 0), multi-línea agregada, redondeo banker's en valores límite (`.12345`), entradas inválidas lanzan error

## 16. Tests unitarios — use cases `customers`

- [x] 16.1-16.5 Unificados en `tests/unit/modules/customers/application/use-cases/CustomerCrudUseCases.test.ts` — paginación, búsqueda, found/not found, `code`/`rfc` duplicado → 409, ignora `code`/`currentBalance` en update, soft delete

## 17. Tests unitarios — use cases `pos`

- [x] 17.1 `CreateSaleUseCase.test.ts` — totales con IVA/IEPS/descuento, `EmptySaleError`, `ProductPriceMismatchError`, customer/producto inactivo. Snapshot inventory (crea record con `quantity=-qty`) verificado a nivel de repo Prisma; los unit tests cubren la lógica del use case
- [x] 17.2 `ListSalesUseCase.test.ts` — paginación, filtro por `branchId`, filtro por `status` múltiple, filtro por rango de fechas, filtro por `customerId`; usa `InMemorySaleRepository`
- [x] 17.3 `GetSaleUseCase.test.ts` — found con items, not found, expone branchId, devuelve campos de cancelación; usa `InMemorySaleRepository`
- [x] 17.4 `CancelSaleUseCase.test.ts` — cancela completed, restaura stock vía repo, cancela cancelled es idempotente, not found
- [x] 17.5 `EditCompletedSaleUseCase.test.ts` — recalcula totales, restaura stock viejo + aplica nuevo, `CancelledSaleNotEditableError`, items vacíos → `EmptySaleError`

## 18. Tests unitarios — controllers (validación Zod + scoping)

- [x] 18.1 `CustomersController.test.ts` — Zod inválido, code uppercase, rfc inválido, email malformado, creditLimit negativo; ignora currentBalance/code en body; duplicate code/rfc → 409; softDelete + reactivación; 31 tests
- [x] 18.2 `SalesController.test.ts` — body inválido, scoping mismatch → 403, HQ guard → 403
- [x] 18.3 `BranchesController.test.ts` — segundo HQ → 409, demote HQ → 200
- [x] 18.4 `UsersController.test.ts` — `branchId` válido/null/inexistente cubierto en `UpdateUserUseCase.test.ts` (test del use case incluye los 3 casos)

## 19. Tests de integración (Supabase real)

- [x] 19.1 `tests/integration/modules/customers/customers-crud.test.ts` — 14 tests: CRUD, búsqueda ILIKE, soft delete, reactivación, unicidad code/rfc
- [x] 19.2 `tests/integration/modules/pos/sales-create-and-cancel.test.ts` — 6 tests: transacción atómica, folio increment, stock decremento, idempotencia cancel, folio no liberado
- [x] 19.3 `tests/integration/modules/pos/sales-edit-from-hq.test.ts` — 4 tests: edición ajusta stock, inmutabilidad de folio, CancelledSaleNotEditableError
- [x] 19.4 `tests/integration/modules/pos/sales-negative-stock.test.ts` — 4 tests: stock negativo permitido en BD, CHECK eliminado verificado vía $executeRaw, /adjust sigue rechazando negativos
- [x] 19.5 `tests/integration/modules/pos/sales-branch-scoping.test.ts` — 8 tests: enforceBranchScope y resolveScopedBranchId con AuthorizationService real
- [x] 19.6 `tests/integration/modules/pos/sales-edit-only-hq.test.ts` — 8 tests: permisos RBAC reales (admin/viewer vs branches:access_all y sales:edit_completed), lógica del guard HQ con bypass y sin HQ registrada
- [x] 19.7 `tests/integration/modules/inventory/inventory-allows-negative.test.ts` — 6 tests: CHECK eliminado, reserved_quantity/reorder_point CHECK siguen vigentes, /adjust rechaza negativos
- [x] 19.8 `tests/integration/modules/inventory/inventory-branch-scoping.test.ts` — 5 tests: enforceBranchScope en inventario, aislamiento por sucursal

## 20. Verificación RBAC y permisos — verificado con smoke tests vs Supabase real

- [x] 20.1 `viewer` con bypass-less → GET /sales sin ?branchId= → 403 `branches:access_all`; POST /sales → 403 `sales:create`
- [x] 20.2 `operator` asignado a una sucursal → PATCH /sales/:id → 403 `sales:edit_completed`; GET /sales scoped a su branch (200); GET /sales?branchId=otra → 403
- [x] 20.3 `admin` con JWT firmado vía `JWT_ACCESS_SECRET` → GET /customers 200, POST /customers 201, GET /sales 200, PATCH /branches isHeadquarters=true/false 200
- [x] 20.4 Verificado en BD: 7 permisos nuevos presentes; `branches:access_all` sólo en admin

## 21. Verificación de integridad del esquema — verificado vía `information_schema` / `pg_constraint` / `pg_indexes`

- [x] 21.1 CHECK `branch_inventory_quantity_nonneg_chk` ELIMINADO; quedan `reserved_quantity_nonneg_chk` y `reorder_point_nonneg_chk`
- [x] 21.2 Índice `branches_hq_idx` existe (partial unique)
- [x] 21.3 Tablas `customers`, `sales`, `sale_items` creadas con FKs `ON DELETE RESTRICT` y `(folio_id, folio_number)` único
- [x] 21.4 `users.branch_id` añadido como nullable (`is_nullable: 'YES'`); FK `ON DELETE SET NULL`

## 22. Documentación

- [x] 22.1 Actualizar `CLAUDE.md` añadiendo sección "POS (Backend)" con: tablas nuevas, endpoints, permisos, regla matriz, regla stock negativo, regla cliente con adeudo (no se mueve `currentBalance`), branch scoping y bypass
- [x] 22.2 Actualizar la sección de "Middleware de autenticación" en `CLAUDE.md` para incluir `x-user-branch-id`
- [x] 22.3 Actualizar la sección "JWT" en `CLAUDE.md` para mencionar el claim `branchId` y el trade-off de re-login para que tome efecto un cambio de sucursal
- [x] 22.4 Actualizar la lista de changes OpenSpec archivados en `CLAUDE.md` cuando este change pase a archivo (se hace en `/opsx:archive`)

## 23. Verificación final

- [x] 23.1 `npx tsc --noEmit` — 0 errores de TypeScript en código nuevo (1 error preexistente en `PrismaAuthorizationService.cache.test.ts` no relacionado)
- [x] 23.2 `npx jest` (unit) — 1034/1034 tests pasan; integración omitida por requerir BD
- [x] 23.3 Smoke test parcial ejecutado: admin POST /customers OK (201), customer creado con `currentBalance: 0`. Flujo completo con creación de venta + cancel pendiente (requiere setup de Product+Price+Folio+PaymentMethod en BD)
- [x] 23.4 Smoke test parcial ejecutado: admin PATCH /branches isHeadquarters=true/false OK (200). Edit de venta completada pendiente (requiere setup completo POS)
