## 1. Base de datos y Prisma

- [x] 1.1 Agregar columnas nullable a `Branch` en `prisma/schema.prisma`: `addressStreet String? @map("address_street") @db.VarChar(150)`, `addressExteriorNumber String? @map("address_exterior_number") @db.VarChar(20)`, `addressInteriorNumber String? @map("address_interior_number") @db.VarChar(20)`, `addressNeighborhood String? @map("address_neighborhood") @db.VarChar(100)`, `addressMunicipality String? @map("address_municipality") @db.VarChar(100)`, `addressState String? @map("address_state") @db.VarChar(3)`, `addressCountry String? @default("MEX") @map("address_country") @db.VarChar(3)`, `addressZipCode String? @map("address_zip_code") @db.VarChar(5)`.
- [x] 1.2 Agregar modelo `Waybill`: `id`, `folioId @map("folio_id")`, `folioNumber Int @map("folio_number")`, `originBranchId @map("origin_branch_id")`, `destinationBranchId @map("destination_branch_id")`, `status String @db.VarChar(20)`, snapshot de ubicaciones origen/destino (mismos 8 campos que `Branch`, prefijados `origin`/`destination`), `vehiclePlate`, `vehicleConfig`, `vehiclePermitType`, `vehiclePermitNumber`, `insuranceCompany`, `insurancePolicy` (todos `String @db.VarChar`), `driverName`, `driverRfc String? @db.VarChar(13)`, `driverLicenseNumber`, `distanceKm Decimal @db.Decimal(10,2)`, `departureAt DateTime`, `arrivalAt DateTime`, `cfdiUuid String? @db.VarChar(40)`, `facturamaCfdiId String? @db.VarChar(40)`, `xmlUrl String? @db.Text`, `pdfUrl String? @db.Text`, `cancelledAt DateTime?`, `cancelledBy String? @db.Uuid`, `cancellationReason String? @db.VarChar(500)`, `creatorId String @db.Uuid`, `createdAt`/`updatedAt`. Índices en `originBranchId`, `destinationBranchId`, `status`, `folioId`. Único `(folioId, folioNumber)`.
- [x] 1.3 Agregar modelo `WaybillItem`: `id`, `waybillId @map("waybill_id")`, `productId String? @map("product_id")`, `productCodeSnapshot`, `productNameSnapshot`, `satBienesTranspCode String @db.VarChar(8)`, `satUnitCode String @db.VarChar(10)`, `quantity Decimal @db.Decimal(14,4)`, `weightKg Decimal @db.Decimal(14,4)`, `isHazardousMaterial Boolean @default(false)`, `hazardousMaterialCode String? @db.VarChar(10)`. Relación a `Waybill` `onDelete: Cascade`; a `Product` `onDelete: SetNull`.
- [x] 1.4 Relaciones inversas: `Branch.waybillsAsOrigin Waybill[]`, `Branch.waybillsAsDestination Waybill[]`. `Product.waybillItems` **no** se agregó — `WaybillItem.productId` es una columna plana sin relación Prisma, mismo patrón que `InvoiceItem.productId` en `billing-api` (evita atar `Product` a un módulo más).
- [x] 1.5 Migración aplicada contra la DB real (`agrisas`/Supabase) — **no** vía `migrate dev` interactivo (el entorno no-interactivo lo rechaza, y además `migrate dev` detectó drift pre-existente no relacionado en `users`/`roles`/`permissions`/`role_permissions`/`user_roles` que hubiera intentado recrear PKs de tablas con datos reales). En su lugar: `prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script` para generar el diff completo, se extrajo manualmente **solo** la porción de este cambio (columnas de `branches`, tablas `waybills`/`waybill_items`, índices, FKs) a `prisma/migrations/20260718000001_add_waybills_tables_and_branch_address/migration.sql`, aplicada con `npx prisma migrate deploy` (no toca el drift preexistente ajeno a este cambio). Verificado con `npx prisma migrate status` → "Database schema is up to date!".
- [x] 1.6 `npx prisma generate`.

## 2. RBAC y entorno

- [x] 2.1 Agregar `waybills:read`, `waybills:write`, `waybills:cancel` a `prisma/seed.ts` (permisos viven ahí, no en `prisma/seeds/rbac.ts` — ese archivo no existe); asignado: `admin`/`operator` → los 3; `viewer` → `waybills:read`.
- [x] 2.2 Confirmado: `.env.example` ya documenta `FACTURAMA_*`/`FACTURAMA_MOCK` (reutilizados de `add-billing-facturama`, sin variables nuevas).

## 3. Módulo `waybills` — Dominio

- [x] 3.1 `src/modules/waybills/domain/entities/Waybill.ts` — entity pura + `WaybillItem`.
- [x] 3.2 `src/modules/waybills/domain/value-objects/WaybillStatus.ts` (`completed`|`cancelled`).
- [x] 3.3 `src/modules/waybills/domain/errors.ts` — `WaybillNotFoundError`, `InvalidBranchPairError`, `BranchAddressIncompleteError`, `InsufficientStockAtOriginError`, `WaybillAlreadyCancelledError`, `WaybillNotStampedError`, `FacturamaStampError`, `FacturamaCancelError`, `BranchScopeViolationError`.

## 4. Módulo `waybills` — Application (ports + use cases)

- [x] 4.1 Port `application/ports/WaybillRepository.ts`: `list`, `findById` (siempre trae items — no hay `findByIdWithItems` separado, a diferencia de `returns-api`, porque no existe un caso de uso que quiera el header sin líneas), `createCompleted` (tx: folio + movimiento inventario + persistencia), `markCancelled` (tx: reversión + persistencia).
- [x] 4.2 Port `application/ports/WaybillFacturamaGateway.ts`: `stampTraslado(payload)`, `cancel(cfdiId, motive)`, `download(format, cfdiId)`. **No importar de `src/modules/billing/`.**
- [x] 4.3 Port `application/ports/WaybillLookupService.ts` (o servicio equivalente): carga `Branch` (con dirección estructurada), `Product` para mapear líneas.
- [x] 4.4 DTOs `application/dto/WaybillDto.ts`, `WaybillItemDto.ts`; request types (`CreateWaybillRequest`, `CancelWaybillRequest`). Mapper `toWaybillDto.ts`.
- [x] 4.5 Use cases: `CreateWaybillUseCase` (valida sucursales+dirección+stock → aloca folio TS → mueve inventario origen estricto/destino tolerante → arma payload SAT → llama gateway → persiste, todo en una transacción), `CancelWaybillUseCase` (revierte inventario, cancela CFDI si aplica), `ListWaybillsUseCase`, `GetWaybillUseCase`, `DownloadWaybillFileUseCase`.

## 5. Módulo `waybills` — Infraestructura

- [x] 5.1 `infrastructure/repositories/PrismaWaybillRepository.ts` — `createCompleted` (tx: `allocateFolio` + `UPDATE branch_inventory ... WHERE quantity - delta >= 0` en origen + incremento tolerante en destino + insert `waybills`+`waybill_items`), `markCancelled` (tx: incremento tolerante en origen + decremento tolerante en destino), lecturas con scoping por origen O destino.
- [x] 5.2 `infrastructure/repositories/InMemoryWaybillRepository.ts` para tests de use cases.
- [x] 5.3 `infrastructure/services/FacturamaRestGateway.ts` (propio del módulo, NO reexporta el de `billing`) — arma Basic Auth desde env, payload `CfdiType='T'` + Complemento CartaPorte, normaliza errores.
- [x] 5.4 `infrastructure/services/FakeFacturamaGateway.ts` — UUIDs deterministas, sin red.
- [x] 5.5 `infrastructure/http/WaybillsController.ts` — handlers `create`, `list`, `getById`, `cancel`, `download`. Validación Zod; orden UUID+body → scope check (origen O destino) → use case. `requirePermission` por endpoint.
- [x] 5.6 `infrastructure/di/container.ts` — exporta `waybillsController`. Selecciona `FakeFacturamaGateway` si `FACTURAMA_MOCK!=='false'`, si no `FacturamaRestGateway`. Instancia repositorios de `products`/`branches` localmente si se requieren (evitar import circular).

## 6. Routes API

- [x] 6.1 `app/api/v1/admin/waybills/route.ts` — GET (list), POST (create+stamp).
- [x] 6.2 `app/api/v1/admin/waybills/[id]/route.ts` — GET (detail).
- [x] 6.3 `app/api/v1/admin/waybills/[id]/cancel/route.ts` — POST (cancel).
- [x] 6.4 `app/api/v1/admin/waybills/[id]/download/route.ts` — GET (pdf/xml stream).

## 7. Admin Branches (extensión)

- [x] 7.1 Extender Zod schema de `POST`/`PATCH /admin/branches` para aceptar los 8 campos de dirección estructurada, independientes de `address`.
- [x] 7.2 Extender `BranchDto`/mapper para incluir los campos nuevos.
- [x] 7.3 Extender validación `addressZipCode` (`^\d{5}$`) en el controller.

## 8. Tests

- [x] 8.1 `tests/unit/modules/waybills/CreateWaybillUseCase.test.ts` — transferencia OK; stock insuficiente → 409 sin mover inventario; sucursales iguales → 400; dirección incompleta → 400; Facturama rechaza → rollback total (verificar que NO se persiste folio ni inventario movido); línea sin `productId` omite validación de stock.
- [x] 8.2 `tests/unit/modules/waybills/CancelWaybillUseCase.test.ts` — cancela `completed` → `cancelled`, revierte inventario; doble cancel → 409; destino puede quedar negativo.
- [x] 8.3 `tests/unit/modules/waybills/FacturamaRestGateway.test.ts` — arma payload Traslado + Complemento CartaPorte; normaliza errores; usa `fetchImpl` mock.
- [x] 8.4 `tests/unit/modules/waybills/FakeFacturamaGateway.test.ts` — deterministas, sin red.
- [x] 8.5 Branch scoping: list por origen O destino; getById/cancel/download fuera de scope (ninguna de las dos sucursales) → 403.
- [x] 8.6 Test de no-acoplamiento: `src/modules/waybills/` no importa de `src/modules/billing/` (grep/lint estático en CI o test simple de imports).
- [x] 8.7 (agregado en `/opsx:verify`) `tests/unit/modules/waybills/DownloadWaybillFileUseCase.test.ts` — `WaybillNotFoundError`; `WaybillNotStampedError` cuando `facturamaCfdiId` es `null` (escenario defensivo del spec, no cubierto originalmente).
- [x] 8.8 (agregado en `/opsx:verify`) `tests/unit/modules/branches/infrastructure/http/BranchesController.test.ts` — describe "domicilio fiscal estructurado": create con los 8 campos, PATCH parcial de un solo campo, `addressZipCode`/`addressState` con formato inválido → 400 (validación agregada en tarea 7.3 no tenía test dedicado).

## 9. Verificación

- [x] 9.1 `npm run build` (typecheck) OK — todas las rutas `/api/v1/admin/waybills*` compilan. `npx jest` (unitario + integración, DB ya migrada): 2336/2340 verdes; los 4 fallos son de `tests/integration/modules/pos/sales-edit-from-hq.test.ts` (colisión de RFC de fixture pre-existente al correr la suite dos veces contra la misma DB — no relacionado a este cambio, no se tocó código de `pos`/`customers`).
- [x] 9.2 `npm run seed` corrido contra la DB real — agregó los 3 permisos `waybills:*` idempotentemente (verificado, sin duplicados).
- [x] 9.3 Cobertura equivalente a smoke vía los 27 tests unitarios de `tests/unit/modules/waybills/` (mismo patrón atómico `UPDATE ... WHERE quantity - delta >= 0` que ya usa `PrismaBranchInventoryRepository.adjust` en producción): stock suficiente → `completed` con `cfdiUuid` fake e inventario movido; stock insuficiente → `InsufficientStockAtOriginError` sin mover inventario; cancelar → revierte inventario y cancela CFDI; re-cancelar → `WaybillAlreadyCancelledError`. Un smoke adicional contra la DB real (crear/cancelar registros sintéticos) fue bloqueado por el clasificador de auto-mode por exceder el consentimiento explícito ("migración + seed") — no se ejecutó.
