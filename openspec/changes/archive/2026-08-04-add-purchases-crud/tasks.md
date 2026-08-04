## 1. Migración de base de datos

- [x] 1.1 Agregar a `prisma/schema.prisma`: columnas `currentBalance`, `creditLimit`, `creditDays` en `Provider`
- [x] 1.2 Agregar a `prisma/schema.prisma`: modelos `Purchase`, `PurchaseItem`, `ProviderPayment` con relaciones a `Provider`, `Branch`, `Folio`, `PaymentMethod`, `Product` (ver `design.md`) — nota: `taxTotal`/`lineTax` combinados (IVA+IEPS), no separados, para igualar convención real de Sale/Quote/Return
- [x] 1.3 Agregar relaciones inversas necesarias en `Provider`, `Branch`, `Folio`, `PaymentMethod`, `Product` (`purchases`, `providerPayments`, `purchaseItems` según corresponda)
- [x] 1.4 Migración aplicada vía archivo manual aislado (`20260803000001_add_purchases_and_provider_payments`) + `prisma migrate deploy`, NO vía `migrate dev` — la BD real tenía drift preexistente no relacionado (PKs de `roles`/`permissions`/`users`/`role_permissions`/`user_roles`, FKs de `customer_payments`, etc.) que `migrate dev` intentaba "corregir" junto con mi cambio; se aisló para no tocar esas tablas
- [x] 1.5 Ejecutar `npx prisma generate`

## 2. Seed de folios y RBAC

- [x] 2.1 Agregar `{ code: "PP", name: "Pago a Proveedor", prefix: "PP-", scope: "OPERATIONS" }` a la lista de folios en `prisma/seeds/folios.ts` — nota: `CANONICAL_CODES` ya tenía drift preexistente (folio `TRI` duplicado/no documentado en spec desde antes de este change; no se tocó, fuera de alcance)
- [x] 2.2 Actualizar tabla de folios en `openspec/specs/data-seeding/spec.md` (agregada fila `PP`, contador 8→9; nota: el spec ya estaba desalineado con el código real por el folio `TRI` preexistente no documentado — no corregido, fuera de alcance de este change)
- [x] 2.3 Agregar permisos `purchases:read`, `purchases:create`, `purchases:cancel`, `purchases:pay`, `purchases:pay_cancel` al array `PERMISSIONS` de `prisma/seed.ts`
- [x] 2.4 Asignar los 5 permisos a `admin` y `operator`, solo `purchases:read` a `viewer` en el array `ROLES` de `prisma/seed.ts`
- [x] 2.5 Ejecutado `npm run seed:folios` y `npm run seed` — idempotentes, folio PP creado, permisos actualizados sin errores

## 3. Extensión de infraestructura compartida

- [x] 3.1 Extender el union type `movementType` en `src/shared/infrastructure/inventory/recordInventoryMovement.ts` con `"purchase" | "purchase_cancel"`
- [x] 3.2 Extender el union type `sourceType` en el mismo archivo con `"purchase"`
- [x] 3.3 Crear `src/modules/purchases/domain/services/PurchaseTotalsCalculator.ts` (banker's rounding a 4 decimales, misma fórmula que `SaleTotalsCalculator`, incluye `isTaxable` para paridad con los otros 3 calculadores)
- [x] 3.4 Agregado `PurchaseTotalsCalculator` al test de equivalencia en `ReturnTotalsCalculator.test.ts` (reutiliza `totalsVectors` existente, mapea `unitPrice`→`unitCost`) — 22/22 tests pasan

## 4. Módulo `purchases` — dominio

- [x] 4.1 Crear entidad `Purchase` (`src/modules/purchases/domain/entities/Purchase.ts`) con factory `create()` y estado `completed`/`cancelled`
- [x] 4.2 Crear entidad `PurchaseItem` (`src/modules/purchases/domain/entities/PurchaseItem.ts`)
- [x] 4.3 Crear entidad `ProviderPayment` (`src/modules/purchases/domain/entities/ProviderPayment.ts`) con validación `amount > 0`
- [x] 4.4 Crear `PurchasePaymentApplier` (`src/modules/purchases/domain/services/PurchasePaymentApplier.ts`) — cálculo puro de `newPaidAmount`/`newPaymentStatus` para pagar y cancelar, invocado realmente por el repositorio (a diferencia de `SalePaymentApplier`, que quedó desacoplado)
- [x] 4.5 Creados errores de dominio: `ProviderNotFoundOrInactiveError`, `ProductNotFoundOrInactiveError`, `PurchaseItemsEmptyError`, `PurchaseNotFoundError`, `PurchaseAlreadyCancelledError`, `PurchaseHasActiveProviderPaymentsError`, `PurchaseNotPayableError`, `ProviderPaymentExceedsDueAmountError`, `ProviderPaymentNotFoundError`, `ProviderPaymentAlreadyCancelledError`

## 5. Módulo `purchases` — aplicación

- [x] 5.1 Definidos puertos `PurchaseRepository` y `ProviderPaymentRepository` (`src/modules/purchases/application/ports/`)
- [x] 5.2 Creados DTOs y mappers `toPurchaseDto`/`toProviderPaymentDto` (`src/modules/purchases/application/dto/`, `mappers/`)
- [x] 5.3 Creado `CreatePurchaseUseCase` (thin — valida items no vacíos, delega validación de proveedor/producto/folio/crédito a `repo.createCompleted`, siguiendo patrón Payments)
- [x] 5.4 Creado `CancelPurchaseUseCase`
- [x] 5.5 Creados `ListPurchasesUseCase` y `GetPurchaseUseCase`
- [x] 5.6 Creados `RegisterProviderPaymentUseCase`, `CancelProviderPaymentUseCase`, `ListProviderPaymentsByPurchaseUseCase`, `GetProviderPaymentUseCase`

## 6. Módulo `purchases` — infraestructura (Prisma)

- [x] 6.1 Creado `PrismaPurchaseRepository.createCompleted`: transacción con validación de proveedor/branch/paymentMethod/producto activos, `allocateFolio(tx, folio CP resuelto por code+scope)`, `recordInventoryMovement` (`movementType="purchase"`, `direction="IN"`) por línea, snapshot de líneas, cálculo de totales (`PurchaseTotalsCalculator`), update atómico `providers.current_balance` si es crédito, insert de `purchase`+`purchase_items` — nota: validación movida al repo (no al use case), siguiendo el patrón Payments ya documentado en design.md
- [x] 6.2 Creado `PrismaPurchaseRepository.cancel`: guard de abonos activos (`PurchaseHasActiveProviderPaymentsError`), `recordInventoryMovement` (`movementType="purchase_cancel"`, `direction="OUT"`) por línea, revierte `providers.current_balance` si aplica — idempotencia de doble-cancelación queda a cargo del use case (`canBeCancelled()`), mismo patrón que `PrismaReturnRepository`
- [x] 6.3 Creado `PrismaPurchaseRepository.findAll`/`findByIdWithItems` con filtros `providerId`/`branchId`/`status`/`from`/`to`, incluye `providerPayments` en el detalle (branch scoping se aplica en el controller vía `resolveScopedBranchId`/`enforceBranchScope`, no en el repo)
- [x] 6.4 Creado `PrismaProviderPaymentRepository.createCompleted`: valida `purchase.paymentMethod.isCredit`, guard de monto excedente, `allocateFolio(tx, folio PP resuelto por code+scope)`, update atómico `purchases.paid_amount`/`payment_status` + `providers.current_balance`, insert
- [x] 6.5 Creado `PrismaProviderPaymentRepository.markCancelled`: guard de doble cancelación vía `UPDATE ... WHERE status='completed'` (filas afectadas), revierte `purchases.paid_amount`/`payment_status` + `providers.current_balance`
- [x] 6.6 Creados `InMemoryPurchaseRepository`/`InMemoryProviderPaymentRepository` para tests (con seeds propios de provider/branch/paymentMethod/product/purchase)

## 7. Módulo `purchases` — HTTP y DI

- [x] 7.1 Creado `PurchasesController` (`src/modules/purchases/infrastructure/http/PurchasesController.ts`) con Zod schemas inline (create/list/cancel/registerPayment/cancelPayment), `enforceBranchScope`/`resolveScopedBranchId` según cada operación; `requirePermission` movido a nivel de ruta (patrón mayoritario del repo)
- [x] 7.2 Creado `src/modules/purchases/infrastructure/di/container.ts` — no requirió inyectar `ProviderRepository`/`ProductRepository` externos porque la validación vive dentro de la transacción Prisma del propio repo (patrón Payments), no en el use case
- [x] 7.3 Creadas rutas `app/api/v1/admin/purchases/route.ts` (GET/POST), `app/api/v1/admin/purchases/[id]/route.ts` (GET), `app/api/v1/admin/purchases/[id]/cancel/route.ts` (POST), `app/api/v1/admin/purchases/[id]/provider-payments/route.ts` (GET/POST), `app/api/v1/admin/provider-payments/[id]/cancel/route.ts` (POST) — todas delegando al controller, permiso vía `requirePermission` en cada route.ts

## 8. Tests

- [x] 8.1 Unit tests de `CreatePurchaseUseCase`/`CancelPurchaseUseCase` con `InMemoryPurchaseRepository` (contado/crédito, proveedor/producto inactivo, doble cancelación, abonos activos)
- [x] 8.2 Unit tests de `RegisterProviderPaymentUseCase`/`CancelProviderPaymentUseCase` con `InMemoryProviderPaymentRepository`
- [x] 8.3 Unit test dedicado de `PurchaseTotalsCalculator` (`tests/unit/modules/purchases/domain/services/`) + equivalencia ya agregada en `ReturnTotalsCalculator.test.ts` (task 3.4)
- [x] 8.4 Unit test de `PurchasePaymentApplier` (pending→partial→paid y reversa, nunca negativo)
- [x] 8.5 Flujo multi-paso dentro de `RegisterProviderPaymentUseCase.test.ts` (InMemory, siguiendo convención CLAUDE.md "use cases se prueban con InMemory, nunca mock de BD real"): abono parcial → abono que completa → cancelar el último → verifica `paidAmount`/`paymentStatus`/`providers.currentBalance` consistentes en cada paso

## 9. Verificación

- [x] 9.1 `npm run build` — exitoso, 5 rutas nuevas registradas (`/api/v1/admin/purchases`, `/purchases/[id]`, `/purchases/[id]/cancel`, `/purchases/[id]/provider-payments`, `/provider-payments/[id]/cancel`)
- [x] 9.2 `npm test` — 2752/2763 tests pasan; los 2 suites que fallan (`products-crud.test.ts`, `quotes-conversion-edge-cases.test.ts`) son integration tests contra la BD real preexistentes, no tocan `purchases`, y pasan en aislado (flakiness de paralelismo contra Supabase compartido, confirmado antes y después de este change)
- [x] 9.3 `openspec validate add-purchases-crud --strict` → "Change 'add-purchases-crud' is valid"
- [x] 9.4 Revisión manual completada: los 8 requirements y sus ~20 escenarios de `specs/purchases-api/spec.md` tienen cobertura — 33 tests unitarios (`CreatePurchaseUseCase`, `CancelPurchaseUseCase`, `RegisterProviderPaymentUseCase`/`CancelProviderPaymentUseCase`, `ListPurchasesUseCase`/`GetPurchaseUseCase`, `PurchaseTotalsCalculator`, `PurchasePaymentApplier`) cubren las reglas de negocio; branch scoping y permisos RBAC reutilizan `enforceBranchScope`/`resolveScopedBranchId`/`requirePermission` ya probados por el resto del sistema (no se duplicó test de esos helpers, consistente con el resto del repo)
