## 1. Schema

- [x] 1.1 Editar `prisma/schema.prisma`: `CustomerPayment.saleId` de `String` a `String?`, relación `sale` de `Sale` a `Sale?`.
- [x] 1.2 Correr `npx prisma migrate dev --name make_payment_sale_id_optional` (dev/test, nunca contra `DIRECT_URL` de prod) y verificar que la migración solo hace `ALTER COLUMN sale_id DROP NOT NULL` (sin backfill necesario).
- [x] 1.3 Correr `npx prisma generate`.

## 2. Domain

- [x] 2.1 Actualizar `src/modules/payments/domain/entities/CustomerPayment.ts`: `saleId: string | null` en props y en la entidad.
- [x] 2.2 Crear `src/modules/payments/domain/errors/PaymentExceedsAccountDebtError.ts` (análogo a `PaymentExceedsDueAmountError`, con `due: number`).
- [x] 2.3 Verificar si existe `CustomerNotFoundError`; si no, crearlo en `src/modules/customers/domain/errors/CustomerNotFoundError.ts`. (ya existía, reutilizado sin cambios)

## 3. Application

- [x] 3.1 Extender `src/modules/payments/application/ports/PaymentRepository.ts`: `PaymentWithSale.sale` pasa a `{...} | null`; agregar `createAccountCompleted(input: CreateAccountPaymentInput): Promise<PaymentWithSale>` y `getAccountDebt(customerId: string, branchScope: { callerBranchId: string | null; branchId: string | null }): Promise<AccountDebtSummary>` (tipos `CreateAccountPaymentInput`/`AccountDebtSummary` definidos en el mismo archivo de puerto).
- [x] 3.2 Crear `src/modules/payments/application/use-cases/RegisterAccountPaymentUseCase.ts` (recibe `customerId, paymentMethodId, folioId, amount, notes, userId, callerBranchId, branchId`; delega a `repo.createAccountCompleted`; mapea resultado a `PaymentDetailDto`).
- [x] 3.3 Crear `src/modules/payments/application/use-cases/GetCustomerAccountDebtUseCase.ts` (recibe `customerId, callerBranchId, branchId`; delega a `repo.getAccountDebt`).
- [x] 3.4 Confirmar que `RegisterPaymentUseCase` y `CreatePaymentInput` NO se modifican (sin cambios de contrato en el camino por venta).
- [x] 3.5 Actualizar `src/modules/payments/application/dto/PaymentDto.ts`: `PaymentDto.saleId`, `saleFolioCode`, `saleTotal`, `salePaidAmount`, `salePaymentStatus`, `saleDueAmount` → `| null`; `PaymentDetailDto.sale` → `{...} | null`.
- [x] 3.6 Actualizar `src/modules/payments/application/mappers/toPaymentDto.ts`: `JoinedFields` campos `sale*` nullable; `saleDueAmount()` retorna `null` si `saleTotal`/`salePaidAmount` son `null`; `toPaymentDetailDto` → `sale: data.sale ? {...} : null`.

## 4. Infrastructure — Prisma

- [x] 4.1 Implementar `PrismaPaymentRepository.createAccountCompleted`: validar `paymentMethod`/`folio` activos + `folio.scope==='OPERATIONS'`; guard atómico `UPDATE customers ... WHERE current_balance - :amount >= (subquery de ventas a crédito pendientes)`; 0 filas → recalcular `accountDebt` real y lanzar `PaymentExceedsAccountDebtError`; `allocateFolio`; `INSERT customer_payments` con `sale_id=null`.
- [x] 4.2 Implementar `PrismaPaymentRepository.getAccountDebt`: ventas a crédito pendientes del cliente (`status='completed'`, `paymentMethod.isCredit=true`, `total>paidAmount`), `orderBy createdAt asc`, acotadas por branch scope; `currentBalance` del cliente; `accountDebt = max(0, currentBalance - SUM(due))`.
- [x] 4.3 Null-safety en `findById` (línea ~333 `row.sale!` → nullable; `sale: sale ? {...} : null`, joins `saleFolioCode: sale?.folioCode ?? null`, etc.).
- [x] 4.4 Null-safety en `list()`: cambiar defaults `?? ""` / `?? 0` / `?? "pending"` a `?? null`.
- [x] 4.5 `markCancelled`: agregar rama `if (paymentRow.saleId === null)` que omite por completo el bloque de `UPDATE sales` y solo restaura `customers.current_balance`.
- [x] 4.6 `findHistory`: cambiar `JOIN sales s ON s.id = cp.sale_id` a `LEFT JOIN`; tipar `ItemRow`/`PaymentHistoryItem` con columnas `sale_*` nullable; `saleDueAmount` → `null` cuando no hay venta.
- [x] 4.7 Espejo completo en `InMemoryPaymentRepository.ts`: `createAccountCompleted`, `getAccountDebt`, mismos null-safety fixes en `findById`/`list`/`markCancelled`.

## 5. Infrastructure — HTTP

- [x] 5.1 Crear `app/api/v1/admin/customers/[id]/payments/route.ts` con handlers `GET` y `POST` que delegan a `PaymentsController`.
- [x] 5.2 Agregar a `PaymentsController.ts`: Zod `registerAccountSchema` (`paymentMethodId`, `folioId`, `amount`, `notes?`, `branchId?`); método `registerAccount(req, customerId)` — valida uuid, `requirePermission("payments:create")`, resuelve branch efectivo vía `resolveScopedBranchId` (400 si bypass sin branchId), invoca `RegisterAccountPaymentUseCase`, mapea errores (`CustomerNotFoundError`→404, `PaymentExceedsAccountDebtError`→409 `PaymentExceedsAccountDebt`, `InactiveResourceError`→400, `FolioScopeMismatchError`→400). Nota: se simplificó el puerto para recibir `branchId` ya resuelto (reusa `resolveScopedBranchId` existente) en vez de un `branchScope{callerBranchId,branchId}` propio — resuelve la Open Question de design.md.
- [x] 5.3 Agregar método `getAccountDebt(req, customerId)` — `requirePermission("payments:read")`, mismo branch scoping vía `resolveScopedBranchId` (branchId null = todas las sucursales, permitido aquí a diferencia del POST), invoca `GetCustomerAccountDebtUseCase`.
- [x] 5.4 Inyectar los dos nuevos use cases en `src/modules/payments/infrastructure/di/container.ts`. También se corrigieron 3 puntos preexistentes en `PaymentsController` (`list`, `listBySale`, `getById`) que asumían `sale`/`joins.sale*` no-null — ahora null-safe, necesario para que abonos a saldo general no crasheen esos endpoints.

## 6. Reportes (PDF/XLSX)

- [x] 6.1 `PaymentHistoryPdf.tsx`: agrupador `groupBySale` separa abonos con `saleId=null` (cada uno su propio grupo keyed por su `id`, nunca colapsados bajo una key `null` compartida) con encabezado "Abono a saldo general (sin ticket)".
- [x] 6.2 `buildPaymentsHistoryWorkbook.ts`: misma separación/encabezado en xlsx.
- [x] 6.3 (no previsto en el plan original, necesario por blast radius real del schema change) Null-safety en módulo `reports/` que consume `customer_payments.sale`: `PrismaAccountStatementRepository`/`GetAnticipoReceiptUseCase`/`AnticipoReceiptPdf` (comprobante de anticipo ahora puede no tener venta → "Saldo general (sin venta asociada)"), `PrismaPaymentReportRepository`/`buildPaymentHistoryWorkbook` (reporte de abonos propio de `reports/`, `saleFolioNumber` nullable → "Sin venta"), `PrismaCashCutRepository` (corte de caja: se excluyen abonos a saldo general de este reporte específico — su cálculo de IVA prorrateado es inherentemente por ticket; documentado inline, no es pérdida de dato, sigue apareciendo en `/payments` y en `currentBalance`).

## 7. UI — tipos y lectura

- [x] 7.1 `app/(private)/payments/_logic/types/{domain.ts,api.ts}`: campos `sale*` → `| null` (incluye `PaymentHistoryRowDto`; `ListSalePaymentsResponse` queda sin cambios, siempre sale-tied).
- [x] 7.2 `app/(private)/payments/_logic/lib/groupPaymentsBySale.ts`: key de agrupación `item.saleId ?? \`account:${item.id}\``; nuevo campo `groupKey` en `PaymentGroup` para React key/toggle (separado del `saleId` de negocio).
- [x] 7.3 `GroupedPaymentsTable.tsx` / `PaymentsTable.tsx` / `PaymentDetailPage.tsx` / `PaymentsHistoryPage.tsx`: renderizar "Sin venta asociada" / "Abono a saldo general (sin ticket)" cuando no hay venta, sin link a `/sales/[id]`; `PaymentStatusBadge` trata `salePaymentStatus=null` como "Completado" (no hay venta que esperar). Mappers (`listPayments.ts`, `getPayment.ts`, `listSalePayments.ts`) null-safe en el parseo.
- [x] 7.4 `app/(private)/payments/_logic/errors.ts`: agregar `PaymentExceedsAccountDebtError` y `CustomerNotFoundError` (mismo patrón que las demás clases de error ya mapeadas ahí).

## 8. UI — flujo nuevo

- [x] 8.1 Crear `app/(private)/payments/_logic/services/registerAccountPayment.ts` (`authFetch` → `POST /api/v1/admin/customers/:id/payments`) + `getCustomerAccountDebt.ts` (`GET` del mismo endpoint, no previsto como servicio separado en el plan pero necesario para alimentar el hook sin duplicar fetch).
- [x] 8.2 Crear `app/(private)/payments/_logic/hooks/useCustomerAccountDebt.ts` (expone `currentBalance`, `pendingSales`, `accountDebt`, `isLoading`, `error`, `refresh`).
- [x] 8.3 Crear `app/(private)/payments/_blocks/RegisterGlobalPaymentModal.tsx`: paso 1 `CustomerPicker` (import directo desde `app/(private)/pos/_blocks/CustomerPicker.tsx`, sin modificarlo); paso 2 al elegir cliente, consumir `useCustomerAccountDebt` y mostrar (a) tabla de `pendingSales` con botón "Abonar" por fila que abre el `RegisterPaymentModal` existente con ese `saleId` (`lineBalances=[]`, sin desglose por línea en este entry point), (b) formulario "Saldo general sin ticket" (monto ≤ `accountDebt`, `usePaymentMethodsOptions`, `useFoliosOptions`, selector de sucursal SOLO si `branches:access_all`, notas) que llama a `registerAccountPayment`; estado vacío si `accountDebt=0` y `pendingSales=[]`.
- [x] 8.4 `PaymentsToolbar.tsx`: botón "+ Registrar abono" gated por `can("payments:create")`, prop `onOpenRegisterGlobal`.
- [x] 8.5 `PaymentsListPage.tsx`: estado del modal, montar `RegisterGlobalPaymentModal`, refrescar el listado (`usePaymentsList.refresh`) en `onSuccess` de ambos caminos (abono por venta y abono a saldo general).

## 9. Tests

- [x] 9.1 `tests/unit/modules/payments/domain/CustomerPayment.test.ts`: caso con `saleId=null`.
- [x] 9.2 Nuevo `tests/unit/modules/payments/application/use-cases/RegisterAccountPaymentUseCase.test.ts`: abono dentro de `accountDebt`, excede `accountDebt`, `accountDebt=0` (toda la deuda es de tickets), cliente no encontrado, cancelación.
- [x] 9.3 `GetCustomerAccountDebtUseCase` cubierto en el mismo archivo: `pendingSales` ordenadas oldest-first, `accountDebt` floor 0. (Nota: sin test de integración Prisma real — el repo no tiene suite de integración contra DB para `payments`, solo `InMemoryPaymentRepository`, consistente con el resto del módulo.)
- [x] 9.4 `tests/unit/modules/payments/infrastructure/http/PaymentsController.test.ts`: nuevos describe blocks `getAccountDebt`/`registerAccount` — 403 sin permiso, 404 cliente inexistente, 409 `PaymentExceedsAccountDebt`, branchId ignorado/forzado sin bypass, branchId mismatch rechazado (403), branchId requerido con bypass.
- [x] 9.5 Cubierto en 9.2 (test de cancelación de abono `saleId=null` vía `CancelPaymentUseCase`, no toca `sales`) + test de historial en 9.6.
- [x] 9.6 Nuevo test en `PaymentsController.test.ts` — historial incluye abono `saleId=null` con `saleFolioCode`/`saleTotal`/`salePaymentStatus` en `null`.
- [x] 9.7 `PaymentsListPage.test.tsx`: 2 casos nuevos — botón visible/invisible según `payments:create`, abre `RegisterGlobalPaymentModal` al click.
- [x] 9.8 Nuevo `RegisterGlobalPaymentModal.test.tsx`: selección de cliente, render de `pendingSales`, abre `RegisterPaymentModal` existente con el `saleId` correcto, estado vacío, submit del camino "saldo general" (éxito + error `PaymentExceedsAccountDebt`), branchId requerido con bypass.
- [x] 9.9 `npx jest` completo corrido — 0 regresiones atribuibles al change (fallas de `ExpensesController`/`File is not defined` son preexistentes, no tocadas).

## 11. Hallazgos de QA (post-implementación)

- [x] 11.1 `src/modules/reports/infrastructure/pdf/PaymentHistoryReportPdf.tsx`: columna "Folio Venta" mostraba literal `null` para abonos a saldo general (no detectado por `tsc` porque `ReactNode` acepta `null`) — corregido a `"Sin venta"`, mismo criterio que `buildPaymentHistoryWorkbook.ts`.
- [x] 11.2 Declarar en `proposal.md` las 3 capabilities tocadas por el blast radius real del schema change (`saleId` nullable) que no se habían declarado: `account-statements-api` (comprobante de anticipo), `cash-cut-api` (exclusión deliberada de abonos a saldo general), `reports-api` (reporte ejecutivo de abonos). Deltas spec creados para las 3.
- [x] 11.3 Corregido wording del spec de `payments-api` (Requirement "Register account payment endpoint"): decía "ignora branchId del body" sin bypass; la implementación real (reusa `resolveScopedBranchId`) rechaza con 403 si no coincide — más estricto, no más laxo. Spec y `design.md` actualizados para reflejar la conducta real.
- [x] 11.4 Test nuevo en `tests/unit/modules/reports/application/use-cases/GetPaymentHistoryReportUseCase.test.ts`: abono con `saleId=null` se incluye con `saleFolioNumber: null`.

## 10. Specs y verificación

- [x] 10.1 Specs revisadas: coherentes con la implementación final salvo la simplificación de branch scoping (ver nota en 5.2/5.3 — `branchId` resuelto una sola vez vía `resolveScopedBranchId`, en vez de un `branchScope{callerBranchId,branchId}` propio; comportamiento equivalente, implementación más simple).
- [x] 10.2 `opsx:verify` corrido — ver reporte en la conversación. 1 WARNING encontrado y corregido (wording del spec de branch scoping no coincidía con la implementación real, más estricta); sin CRITICAL. NO archivado — pendiente instrucción explícita del usuario.
