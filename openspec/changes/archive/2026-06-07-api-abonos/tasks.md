## 1. Dependencias y configuración

- [x] 1.1 Verificar si `@react-pdf/renderer` ya está instalado (puede haber entrado con `reports-inventory`); sino: `npm install @react-pdf/renderer`
- [x] 1.2 Confirmar que `xlsx` y demás no tienen conflicto con `@react-pdf/renderer` (correr `npm ls` y resolver peer warnings si los hay)
- [x] 1.3 No requiere cambios en `tsconfig.json`; los componentes `.tsx` server se compilan por default

## 2. Migración Prisma `add_customer_payments`

- [x] 2.1 Generar archivo de migración `prisma/migrations/<TIMESTAMP>_add_customer_payments/migration.sql` con:
  - `ALTER TABLE sales ADD COLUMN paid_amount DECIMAL(14,4) NOT NULL DEFAULT 0`
  - `ALTER TABLE sales ADD COLUMN payment_status VARCHAR(10) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','partial','pending'))`
  - `UPDATE sales SET paid_amount = total WHERE paid_amount = 0` (backfill: todas las ventas previas quedan como pagadas al 100% — eran cash por definición porque el flag de crédito no existía)
  - `ALTER TABLE payment_methods ADD COLUMN is_credit BOOLEAN NOT NULL DEFAULT false`
  - `CREATE TABLE customer_payments (...)` con todos los campos del design.md D13 (id, sale_id, customer_id, user_id `@db.Uuid`, branch_id, payment_method_id, folio_id, folio_number, folio_code, amount, status, notes, created_at, cancelled_at, cancellation_reason)
  - `ALTER TABLE customer_payments ADD CONSTRAINT customer_payments_amount_check CHECK (amount > 0)`
  - `ALTER TABLE customer_payments ADD CONSTRAINT customer_payments_status_check CHECK (status IN ('completed','cancelled'))`
  - `CREATE UNIQUE INDEX customer_payments_folio_uq ON customer_payments(folio_id, folio_number)`
  - Índices `(sale_id, status)`, `(customer_id, status)`, `(user_id, created_at)`, `(branch_id, created_at)`
  - FKs con `ON DELETE RESTRICT` para todas las referencias
  - NOTA: NO se añade `sales.is_credit` — el carácter "crédito" se deriva de `paymentMethod.isCredit` vía JOIN
- [x] 2.2 Actualizar `prisma/schema.prisma`: agregar campos `paidAmount`, `paymentStatus` al modelo `Sale` (NO agregar `isCredit` a `Sale`); agregar campo `isCredit` al modelo `PaymentMethod`; crear modelo `CustomerPayment` con todos los campos y relaciones; añadir relación inversa `payments CustomerPayment[]` al modelo `Sale`, `Customer`, `User`, `Branch`, `PaymentMethod`, `Folio`
- [x] 2.3 Correr `npx prisma migrate dev --name add_customer_payments` localmente, verificar que la migración aplica limpia
- [x] 2.4 Correr `npx prisma generate` y verificar que los tipos TS reflejan los nuevos campos

## 3. Seed RBAC + folio RECIBO

- [x] 3.1 Editar `prisma/seed.ts`: agregar 5 entradas al array `PERMISSIONS`: `sales:create_credit`, `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read` con descripciones
- [x] 3.2 Editar `prisma/seed.ts`: agregar los 5 permisos al rol `admin`
- [x] 3.3 Editar `prisma/seed.ts`: agregar los 5 permisos al rol `operator`
- [x] 3.4 Editar `prisma/seed.ts`: agregar solo `payments:read` y `payments:report_read` al rol `viewer`
- [x] 3.5 Editar `prisma/seed.ts`: agregar al final un `prisma.folio.upsert({ where: { code: "RECIBO" }, create: { code: "RECIBO", name: "Recibo de abono", prefix: "RECIBO-", isActive: true }, update: { name: "Recibo de abono", prefix: "RECIBO-", isActive: true } })` (NO actualizar `currentNumber`)
- [x] 3.6 Editar `prisma/seed.ts`: agregar `prisma.paymentMethod.upsert({ where: { code: "CREDITO" }, create: { code: "CREDITO", name: "Crédito", description: "Venta a crédito (saldo a cuenta del cliente)", isCredit: true, isActive: true }, update: { name: "Crédito", description: "Venta a crédito (saldo a cuenta del cliente)", isActive: true } })` (NO actualizar `isCredit` para respetar la inmutabilidad)
- [x] 3.7 Correr `npm run seed` y verificar via `psql` o Prisma Studio que los 5 permisos, el folio RECIBO y el payment method CREDITO con `is_credit=true` existen
- [x] 3.8 Correr `npm run seed` una segunda vez y confirmar idempotencia (no duplicados, `current_number` preservado, `is_credit` preservado)

## 4. Dominio del módulo `payments`

- [x] 4.1 Crear `src/modules/payments/domain/entities/CustomerPayment.ts` con factory `CustomerPayment.create({...})` que valida `amount > 0`; campos: `id, saleId, customerId, userId, branchId, paymentMethodId, folioId, folioNumber, folioCode, amount, status, notes, createdAt, cancelledAt, cancellationReason`
- [x] 4.2 Crear `src/modules/payments/domain/value-objects/PaymentStatus.ts` con type `PaymentStatus = "completed" | "cancelled"` + guard `isPaymentStatus(v)`
- [x] 4.3 Crear `src/modules/payments/domain/value-objects/SalePaymentStatus.ts` con type `SalePaymentStatus = "paid" | "partial" | "pending"` + guard
- [x] 4.4 Crear `src/modules/payments/domain/services/SalePaymentApplier.ts` (puro, sin I/O): `applyPayment(sale: { total: Decimal, paidAmount: Decimal, isCredit: boolean }, delta: Decimal): { newPaidAmount: Decimal, newPaymentStatus: SalePaymentStatus }` — usado por register y cancel para calcular el nuevo estado
- [x] 4.5 Crear los 8 errores en `src/modules/payments/domain/errors/`: `PaymentNotFoundError`, `PaymentAlreadyCancelledError`, `PaymentExceedsDueAmountError`, `PaymentWouldOverpayError`, `SaleNotPayableError`, `SaleHasActivePaymentsError`, `CustomerHasNoCreditLineError`, `CreditLimitExceededError` (cada uno con `instanceof Error` y mensaje útil)
- [x] 4.6 Tests unitarios de dominio en `tests/unit/modules/payments/domain/`: `CustomerPayment.test.ts` (factory valida amount > 0), `SalePaymentApplier.test.ts` (vectores: parcial→partial, completa→paid, cancela último→pending)

## 5. Application: ports, DTOs, use cases

- [x] 5.1 Crear `src/modules/payments/application/ports/PaymentRepository.ts` con la interfaz: `createCompleted(input): Promise<CustomerPayment>`, `markCancelled(id, reason, userId): Promise<CustomerPayment>`, `findById(id): Promise<{ payment, sale } | null>`, `list(filters, pagination): Promise<{ items, total }>`, `listBySale(saleId): Promise<{ items, saleTotals }>`, `findHistory(filters, pagination?): Promise<{ items, total, totalAmountCompleted, totalAmountCancelled, completedCount, cancelledCount }>`
- [x] 5.2 Crear `src/modules/payments/application/dto/PaymentDto.ts`, `PaymentDetailDto.ts`, `PaymentHistoryRowDto.ts`, `PaymentHistoryReportDto.ts` con la forma exacta del spec
- [x] 5.3 Crear `src/modules/payments/application/mappers/toPaymentDto.ts` con `Decimal → string` (`.toFixed(4)`)
- [x] 5.4 Crear `src/modules/payments/application/use-cases/RegisterPaymentUseCase.ts` que orquesta: validar sale (status, isCredit, branch scope), validar amount ≤ remaining, llamar repo.createCompleted (que ejecuta TODOS los UPDATEs en una transacción Prisma)
- [x] 5.5 Crear `src/modules/payments/application/use-cases/CancelPaymentUseCase.ts`: validar status != cancelled, llamar repo.markCancelled
- [x] 5.6 Crear `src/modules/payments/application/use-cases/ListPaymentsUseCase.ts`: pasa filtros al repo
- [x] 5.7 Crear `src/modules/payments/application/use-cases/GetPaymentUseCase.ts`: 404 si no existe
- [x] 5.8 Crear `src/modules/payments/application/use-cases/ListPaymentsBySaleUseCase.ts`: trae todos los abonos de una venta + agregados
- [x] 5.9 Crear `src/modules/payments/application/use-cases/GetPaymentHistoryReportUseCase.ts`: respeta filtros (incluido `productId` que el repo traduce a JOIN), límite duro 10k para PDF (responde con un flag `tooLarge`)
- [x] 5.10 Tests unitarios para CADA use case en `tests/unit/modules/payments/application/use-cases/` usando `InMemoryPaymentRepository`

## 6. Infraestructura: repositorios

- [x] 6.1 Crear `src/modules/payments/infrastructure/repositories/InMemoryPaymentRepository.ts` que mantiene un `Map<id, CustomerPayment>` y mocks de `Sale`/`Customer`; soporta `findHistory` con filtro por `productId` recibiendo un parámetro de fixture de sale_items
- [x] 6.2 Crear `src/modules/payments/infrastructure/repositories/PrismaPaymentRepository.ts`:
  - `createCompleted`: `prisma.$transaction` con (a) `UPDATE folios SET current_number = current_number + 1 ... RETURNING`, (b) `UPDATE sales SET paid_amount = paid_amount + ?, payment_status = ? WHERE id = ? AND paid_amount + ? <= total RETURNING` (0 filas → throw `PaymentExceedsDueAmountError`), (c) `UPDATE customers SET current_balance = current_balance - ? WHERE id = ? AND current_balance - ? >= 0 RETURNING` (0 filas → throw `PaymentWouldOverpayError`), (d) `INSERT INTO customer_payments (...) RETURNING *`
  - `markCancelled`: `prisma.$transaction` con (a) `UPDATE customer_payments SET status='cancelled', cancelled_at=NOW(), cancellation_reason=? WHERE id = ? AND status = 'completed' RETURNING amount, sale_id, customer_id` (0 filas → throw `PaymentAlreadyCancelledError`), (b) recalcula `newPaymentStatus` con `SalePaymentApplier`, (c) `UPDATE sales SET paid_amount = paid_amount - ?, payment_status = ? WHERE id = ?`, (d) `UPDATE customers SET current_balance = current_balance + ? WHERE id = ?`
  - `findById`: join sale + customer + user + branch + paymentMethod + folio
  - `list`: con paginación, filtros por `saleId`, `customerId`, `userId`, `paymentMethodId`, `status[]`, `from/to`, `branchId`; ordena por `created_at DESC`
  - `listBySale`: trae TODOS los pagos (incluye cancelled) ordenados por `created_at ASC` + agregados de la sale
  - `findHistory`: incluye filtro `productId` vía `EXISTS (SELECT 1 FROM sale_items WHERE sale_items.sale_id = customer_payments.sale_id AND sale_items.product_id = ?)`; soporta paginación para JSON; límite duro 10001 para detección de overflow en PDF
- [x] 6.3 Refactor sugerido (opcional pero recomendado): extraer `allocateFolio(prisma, folioId)` a `src/shared/infrastructure/folios/allocateFolio.ts` y reusar en `PrismaSaleRepository`, `PrismaQuoteRepository`, `PrismaPaymentRepository`
- [x] 6.4 Tests del Prisma repo en `tests/integration/modules/payments/` si existe runner; sino skip y dejar la cobertura al smoke manual

## 7. PDF renderer

- [x] 7.1 Crear `src/modules/payments/infrastructure/pdf/pdfStyles.ts` con `StyleSheet.create({...})`
- [x] 7.2 Crear `src/modules/payments/infrastructure/pdf/PaymentHistoryPdf.tsx` que renderiza:
  - Header con título "Historial de Abonos", `generatedAt` y `generatedBy.email`
  - Sección de filtros aplicados (chips: usuario, ticket, cliente, producto, método, rango fechas, status)
  - Tabla con columnas: Fecha, Recibo (folioCode), Ticket (saleFolioCode), Cliente, Cobrador, Método, Monto, Estado
  - Totales globales (rowCount, totalAmountCompleted, totalAmountCancelled) al pie
  - Footer con `Página X de Y`
- [x] 7.3 Si `items.length === 0`: mensaje "Sin datos para los filtros aplicados"
- [x] 7.4 Cero imports de Next ni de cliente

## 8. HTTP controller + DI

- [x] 8.1 Crear `src/modules/payments/infrastructure/http/PaymentsController.ts` con métodos `register`, `cancel`, `list`, `getById`, `listBySale`, `history`. Cada uno: validar Zod, `requirePermission(req, ...)`, branch scoping con `enforceBranchScope`/`resolveScopedBranchId`, invocar use case, mapear errores de dominio a HTTP codes
- [x] 8.2 En `history`: ramificar por `?format=`. JSON → `NextResponse.json(...)`. PDF → si `tooLarge`, devolver 409; sino, `renderToBuffer(<PaymentHistoryPdf data={dto}/>)` + headers `application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"`
- [x] 8.3 Crear `src/modules/payments/infrastructure/di/container.ts` que instancia el repo Prisma local, el AuthorizationService (importado de `rbac/di`), los use cases y el controller; exporta `paymentsController`
- [x] 8.4 Tests del controller en `tests/unit/modules/payments/infrastructure/http/PaymentsController.test.ts` con `InMemoryPaymentRepository`: cobertura de 401, 403 (permiso y branch scoping), 400 (Zod), 409 (todos los errores de dominio), 200/201 happy paths para los 6 endpoints, JSON y PDF

## 9. Modificar módulo `pos`

- [x] 9.1 NO cambiar el body de `CreateSaleRequest.ts`: el flujo de crédito se deriva del `paymentMethodId`; el body queda igual que antes (sin `isCredit`)
- [x] 9.2 Editar `src/modules/pos/application/use-cases/CreateSaleUseCase.ts`:
  - Cargar el `PaymentMethod` por `paymentMethodId` (vía el `PosLookupService`); ahora el lookup debe incluir el campo `isCredit`
  - Si `paymentMethod.isCredit === true`: validar permiso `sales:create_credit` (delegado al controller; el use case asume autorizado), cargar customer, verificar `creditLimit != null` (sino throw `CustomerHasNoCreditLineError`), verificar `currentBalance + total <= creditLimit` (sino throw `CreditLimitExceededError`)
  - Setear `paidAmount` y `paymentStatus` derivado del flag: `isCredit ? (0, 'pending') : (total, 'paid')`
- [x] 9.3 Editar `src/modules/pos/infrastructure/repositories/PrismaSaleRepository.ts`:
  - `createCompleted` y `createCompletedFromQuote`: agregar campos `paid_amount`, `payment_status` al INSERT (NO `is_credit` — no existe); si el `paymentMethod.isCredit=true`, agregar `UPDATE customers SET current_balance = current_balance + ?` dentro de la misma transacción
  - `cancel`: cargar el `paymentMethod.isCredit` con la sale (`include: { paymentMethod: true }`); pre-check `EXISTS (SELECT 1 FROM customer_payments WHERE sale_id = ? AND status = 'completed')` y si hay → throw `SaleHasActivePaymentsError` con los IDs; sino, si `paymentMethod.isCredit=true`, agregar `UPDATE customers SET current_balance = current_balance - (total - paid_amount) WHERE id = ?` a la transacción
  - `replaceItemsAndRecalculate` (edit): pre-check `EXISTS (SELECT 1 FROM customer_payments WHERE sale_id = ? AND status = 'completed')` (sino throw); calcular el delta de `currentBalance` con ambos flags (old y new `paymentMethod.isCredit`); `paidAmount`/`paymentStatus` se recalculan según el nuevo `paymentMethod.isCredit`
- [x] 9.4 Editar `src/modules/pos/infrastructure/http/SalesController.ts`:
  - En el handler de `POST /sales` y `PATCH /sales/:id`: cargar el `paymentMethod` antes de invocar el use case (puede delegarse al use case mismo); si `paymentMethod.isCredit=true`, llamar `requirePermission(req, "sales:create_credit")` (separado de `sales:create`)
  - Mapear los 4 errores nuevos a HTTP 403/409
- [x] 9.5 Editar `src/modules/pos/application/dto/SaleDto.ts` (o equivalente): agregar `paidAmount: string`, `paymentStatus: SalePaymentStatus`, e `isCredit: boolean` (derivado del JOIN `paymentMethod.isCredit`) al DTO y al mapper `toSaleDto`. El `isCredit` es read-only en la salida; no se persiste como columna de `sales`
- [x] 9.6 Editar `src/modules/payment-methods/application/dto/PaymentMethodDto.ts` y `mappers/`: agregar `isCredit: boolean` al DTO y al mapper
- [x] 9.7 Editar `src/modules/payment-methods/infrastructure/http/PaymentMethodsController.ts`:
  - En el handler de `POST`: leer `isCredit?: boolean` del body Zod (default `false`); persistirlo
  - En el handler de `PATCH`: si el body trae `isCredit`, ignorarlo silenciosamente (idéntico al patrón de `code`)
- [x] 9.8 Actualizar tests existentes de `pos/`: agregar casos para sales con `paymentMethod.isCredit=true` (con y sin permiso `sales:create_credit`), límite excedido, sin línea de crédito, cancelación con/sin abonos, edición con/sin abonos. Verificar que los tests existentes con métodos cash siguen verdes
- [x] 9.9 Actualizar tests existentes de `payment-methods/`: agregar casos para POST con `isCredit=true`, POST sin `isCredit` default `false`, PATCH ignorando `isCredit`

## 10. Route handlers Next

- [x] 10.1 Crear `app/api/v1/admin/payments/route.ts` con `export const GET` (list) y `export const POST` (register), ambos delegando a `paymentsController`
- [x] 10.2 Crear `app/api/v1/admin/payments/[id]/route.ts` con `export const GET` (getById)
- [x] 10.3 Crear `app/api/v1/admin/payments/[id]/cancel/route.ts` con `export const POST` (cancel)
- [x] 10.4 Crear `app/api/v1/admin/payments/history/route.ts` con `export const GET` (history; ramifica JSON/PDF)
- [x] 10.5 Crear `app/api/v1/admin/sales/[id]/payments/route.ts` con `export const GET` (listBySale)
- [x] 10.6 NO declarar `export const runtime = "edge"` en ninguno
- [x] 10.7 Verificar que `middleware.ts` (raíz) propaga `x-user-*` correctamente para las nuevas rutas (el matcher ya cubre `/api/v1/...`)

## 11. Tests unitarios consolidados

- [x] 11.1 Verificar cobertura de TODOS los scenarios del spec de `payments-api`
- [x] 11.2 Verificar cobertura de los nuevos scenarios añadidos en el spec MODIFIED de `pos-api` (cash sale, credit sale exitosa con `paymentMethod.isCredit=true`, sin permiso `sales:create_credit`, sin línea de crédito, exceso de límite, cancelación con/sin abonos, edición con/sin abonos, edición cash→credit y credit→cash)
- [x] 11.3 Verificar cobertura de los nuevos scenarios de `customers-api` MODIFIED (currentBalance se mueve con credit sale, payment, cancel payment, cancel credit sale)
- [x] 11.4 Verificar cobertura de los nuevos scenarios añadidos en `admin-payment-methods` (POST con isCredit, default false, PATCH ignora isCredit, seed CREDITO)
- [x] 11.5 Correr `npm test` completo → todos los tests verdes (incluyendo los pre-existentes de pos, customers, returns, payment-methods)

## 12. Verificación manual end-to-end

- [x] 12.1 `npm run build` → sin errores TS
- [x] 12.2 `npm run dev` y login
- [x] 12.3 Smoke crear venta a crédito:
  - `POST /api/v1/admin/sales` con `paymentMethodId` apuntando al método semilla `CREDITO` (isCredit=true), customer con `creditLimit=10000, currentBalance=0`, total $1000 → 201 con `paymentStatus='pending'`, `isCredit=true` derivado, `customer.currentBalance=1000`
- [x] 12.4 Smoke crear venta seleccionando `CREDITO` sin tener `sales:create_credit` → 403
- [x] 12.5 Smoke crear venta seleccionando `CREDITO` que excede límite → 409 `CreditLimitExceeded`
- [x] 12.6 Smoke crear abono:
  - `POST /api/v1/admin/payments` con `saleId=<S>, amount=300, paymentMethodId, folioId=<RECIBO>` → 201; verificar `sale.paidAmount=300`, `sale.paymentStatus='partial'`, `customer.currentBalance=700`, `folios.RECIBO.current_number` incrementado
- [x] 12.7 Smoke abono que liquida → `paymentStatus='paid'`, `customer.currentBalance=0`
- [x] 12.8 Smoke abono que sobrepasa → 409 `PaymentExceedsDueAmount`
- [x] 12.9 Smoke cancelar abono → `customer.currentBalance` recupera; `sale.paymentStatus` regresa a `partial`/`pending`
- [x] 12.10 Smoke cancelar dos veces el mismo abono → 409 `PaymentAlreadyCancelled`
- [x] 12.11 Smoke cancelar venta con abonos activos → 409 `SaleHasActivePayments`
- [x] 12.12 Smoke editar venta con abonos activos → 409
- [x] 12.13 Smoke historial JSON con filtros: `GET /api/v1/admin/payments/history?userId=<U>&from=...&to=...` → 200 con totales correctos
- [x] 12.14 Smoke historial filtrado por producto: `?productId=<P>` → solo abonos cuyas ventas incluyen P
- [x] 12.15 Smoke historial PDF: `?format=pdf` → 200 `application/pdf`, archivo válido, abre y muestra layout correcto
- [x] 12.16 Smoke branch scoping: operador con sucursal A intenta abonar venta de sucursal B → 403
- [x] 12.17 Smoke RBAC: viewer con `payments:read` y `payments:report_read` puede listar e historial; NO puede crear/cancelar
- [x] 12.18 Re-ejecutar `npm run seed` → idempotente; permisos, folio RECIBO y payment method CREDITO intactos; `current_number` de RECIBO preservado; `is_credit` de CREDITO preservado en `true`
- [x] 12.19 Smoke admin-payment-methods: `POST /payment-methods` con `isCredit=true` crea método con flag; `PATCH /payment-methods/:id` con `{isCredit:false}` se ignora silenciosamente; `GET` expone `isCredit` en el DTO

## 13. Documentación

- [x] 13.1 Verificar que `openspec validate api-abonos` pasa sin errores
- [x] 13.2 Tras archivar (`/opsx:archive api-abonos`), confirmar que `CLAUDE.md` recibe la nueva sección "Abonos (Backend)" análoga a "Devoluciones (Backend)" con: ciclo de vida, endpoints, reglas de negocio (especialmente la interacción con cancel/edit Sale), tabla de permisos, branch scoping, arquitectura del módulo
- [x] 13.3 Confirmar que el delta de RBAC actualiza la tabla de permisos en `CLAUDE.md` (ya hay 35 permisos previos + 5 nuevos = 39 totales)
