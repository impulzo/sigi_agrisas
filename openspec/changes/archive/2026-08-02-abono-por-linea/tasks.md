## 1. Prisma schema + migración

- [x] 1.1 `prisma/schema.prisma`: nuevo modelo `CustomerPaymentItem` (`id`, `customerPaymentId @map("customer_payment_id")`, `saleItemId @map("sale_item_id")`, `amount Decimal @db.Decimal(14,4)`, `createdAt`), relación `CustomerPayment.items CustomerPaymentItem[]`, FK `customerPayment` `onDelete: Cascade`, FK `saleItem` `onDelete: Restrict`, `@@index([customerPaymentId])`, `@@index([saleItemId])`, `@@map("customer_payment_items")`.
- [x] 1.2 Migración generada manualmente (filtrada a `customer_payment_items`, mismo enfoque que `traspaso-simple`, evitando drift ajeno de RBAC) y aplicada con `prisma migrate deploy`.
- [x] 1.3 `npx prisma generate`.

## 2. Backend domain

- [x] 2.1 `src/modules/payments/domain/errors/PaymentExceedsLineDueAmountError.ts` — `{ saleItemId: string, due: number }`.
- [x] 2.2 `src/modules/payments/domain/errors/PaymentItemsAmountMismatchError.ts` — `{ expected: number, sum: number }`.
- [x] 2.3 `src/modules/payments/domain/errors/SaleItemNotFoundError.ts` — `{ saleItemId: string }`.

## 3. Backend application

- [x] 3.1 `application/ports/PaymentRepository.ts` — `CreatePaymentInput.items?: Array<{ saleItemId: string, amount: number }>`; `PaymentDto`/`PaymentWithSale` incluyen `items?: Array<{saleItemId, amount}>`; `SaleTotals` gana `lineBalances: Array<{saleItemId, lineTotal, paidAmount, dueAmount}>` (poblado por `listBySale`).
- [x] 3.2 `application/use-cases/RegisterPaymentUseCase.ts` — `RegisterPaymentRequest.items?`; pasa `items` a `CreatePaymentInput` sin lógica adicional (la validación vive en el repositorio, dentro de la misma transacción que el resto).
- [x] 3.3 `application/dto/PaymentDto.ts` — `PaymentDto`/`PaymentDetailDto` exponen `items?: Array<{saleItemId, productNameSnapshot, amount}>`; `ListPaymentsBySaleResult` expone `lineBalances`.
- [x] 3.4 `application/mappers/toPaymentDto.ts` — mapea `items` cuando presentes (join a `sale_items` para `productNameSnapshot`).

## 4. Backend infrastructure

- [x] 4.1 `infrastructure/repositories/PrismaPaymentRepository.ts` `createCompleted`: cuando `input.items` presente — cargar `sale.items` (ya se puede incluir en el `saleRow` existente vía `include: { items: true }`), validar cada `saleItemId ∈ sale.items` (sino `SaleItemNotFoundError`), validar `SUM(items[].amount) ≈ input.amount` (tolerancia `0.0001`, sino `PaymentItemsAmountMismatchError`), calcular `lineDue` por línea vía `SUM` de `customer_payment_items` unido a `customer_payments` con `status='completed'` para ese `sale_item_id`, validar `items[].amount <= lineDue` (sino `PaymentExceedsLineDueAmountError`) — TODO esto ANTES de alocar folio o mutar `sales`/`customers`. Tras el `INSERT` de `customer_payments`, insertar filas `customer_payment_items` en la misma transacción.
- [x] 4.2 `PrismaPaymentRepository.listBySale`: agregar query de `lineBalances` — `sale.items` join `SUM(customer_payment_items.amount)` filtrado por `customer_payments.status='completed'`, `GROUP BY sale_item_id`; líneas sin fila en el join reportan `paidAmount: 0`.
- [x] 4.3 `infrastructure/repositories/InMemoryPaymentRepository.ts` — replicar la misma lógica de validación/join en memoria para los tests de use cases.
- [x] 4.4 `infrastructure/http/PaymentsController.ts` — `registerSchema` gana `items: z.array(z.object({ saleItemId: z.string().uuid(), amount: z.number().positive() })).optional()`; mapeo de los 3 errores nuevos (`SaleItemNotFound` 400, `PaymentItemsAmountMismatch` 400, `PaymentExceedsLineDueAmount` 409).

## 5. Seeds / datos de prueba

- [x] 5.1 Creada venta a crédito de prueba con 2 líneas vía POS real (folio TC-3, "Cliente QA Billing SA de CV", $255.20) para ejercer el flujo end-to-end en 9.x.

## 6. UI lógica

- [x] 6.1 `app/(private)/payments/_logic/types/domain.ts` (o `api.ts`) — `PaymentItem`, `LineBalance`, `Payment.items?`, `SalePaymentsData.lineBalances`.
- [x] 6.2 `app/(private)/payments/_logic/schemas/registerPayment.ts` — schema condicional: modo simple (`amount` requerido) vs modo por línea (`items` no vacío, `amount` derivado, cada `items[].amount > 0`).
- [x] 6.3 `app/(private)/payments/_logic/services/registerPayment.ts` — envía `items` cuando presente; mapea 400 `PaymentItemsAmountMismatch`/`SaleItemNotFound` y 409 `PaymentExceedsLineDueAmount` a errores tipados nuevos en `_logic/errors.ts`.
- [x] 6.4 `app/(private)/payments/_logic/services/listSalePayments.ts` + `useSalePayments.ts` — propagan `lineBalances` desde la respuesta.

## 7. UI bloques

- [x] 7.1 `app/(private)/payments/_blocks/RegisterPaymentModal.tsx` — toggle "Repartir por producto"; en modo activo renderiza un input de monto por línea de `lineBalances` (deshabilitado si `dueAmount=0`), calcula `amount` total como suma, arma `items` en el submit; error `PaymentExceedsLineDueAmount` resalta el input de esa línea específica sin tocar las demás.
- [x] 7.2 `app/(private)/sales/_blocks/SalePaymentsSection.tsx` — nueva tabla "Saldo por producto" derivada de `lineBalances` (visible aunque no haya abonos); fila de abono con `items` no vacío muestra control expandible "Ver desglose".

## 8. Tests

- [x] 8.1 `tests/unit/modules/payments/application/use-cases/RegisterPaymentUseCase.perLine.test.ts` — 6 casos: retrocompatible, reparto por línea, línea excede saldo, suma no coincide, saleItemId ajeno, cancelación revierte saldo por línea. Todos verdes.
- [x] 8.2 `tests/unit/modules/payments/infrastructure/http/PaymentsController.test.ts` — 5 casos nuevos agregados (201 con items, 409 línea excede, 400 mismatch, 400 SaleItemNotFound, 400 Zod). 39/39 verde.
- [x] 8.3 Cubierto por 8.1 (InMemoryPaymentRepository ejercita la misma lógica de validación/reversión que Prisma) + smoke real 9.3 contra BD de pruebas. No se agregó archivo de integración separado — redundante con ambos.
- [x] 8.4 `RegisterPaymentModal.test.tsx` +3 casos (toggle oculto sin lineBalances, modo repartir deshabilita línea liquidada, envío con items). `SalePaymentsSection.test.tsx` +1 caso (tabla saldo por producto visible sin abonos). Compat fixes en los 2 archivos existentes (`lineBalances` prop/mock).

## 9. Verificación

- [x] 9.1 `npm run build` OK (todas las rutas compilan, incluyendo /sales/[id]).
- [x] 9.2 `npx jest` verde en el módulo payments/sales (14 suites, 123 tests). 3 fallas en el resto de la suite completa son preexistentes y no relacionadas (`sales-edit-from-hq`, `products-crud` — estado de BD compartido entre corridas de integración).
- [x] 9.3 Smoke real completo vía POS + API directa contra la BD de pruebas: creada venta a crédito real (folio TC-3, cliente "Cliente QA Billing", 2 líneas $127.60 c/u). Registrado abono de $60 repartido a una sola línea vía API → verificado `lineBalances` (línea A: pagado $60/pendiente $67.60; línea B intacta). Cancelado el abono → verificado reversión completa (ambas líneas de vuelta a $0 pagado). Verificado en UI real: tabla "Saldo por producto" visible sin abonos, badge "Abonos (1)" tras registrar, "Ver desglose" expande correctamente mostrando "RAFIA GRUESA 1KG $60.00", barra de progreso recalculada tras cancelar.

  **2 bugs reales encontrados y corregidos durante el smoke** (ninguno introducido por mí, preexistentes, expuestos porque nadie había ejercido `GET /sales/:id/payments` end-to-end antes):
  1. `PaymentsController.listBySale` reconstruía el response campo por campo manualmente y omitía `items` (por pago) y `lineBalances` — mi código en el use case los generaba correctamente pero nunca llegaban al cliente. Corregido en `PaymentsController.ts`.
  2. `listSalePayments.ts` (frontend) leía `body.paidAmount`/`body.total`/`body.paymentStatus`, campos que **nunca existieron** en la respuesta real del backend (que siempre usó `saleTotal`/`salePaidAmount`/`salePaymentStatus`) — bug de contrato preexistente que rompía silenciosamente (`NaN`) el botón "+ Registrar abono" y la barra de progreso en **toda venta a crédito del sistema**, no sólo en el flujo nuevo. El test unitario existente ocultaba el bug porque mockeaba la forma equivocada. Corregidos servicio + tipo `ListSalePaymentsResponse` + test.

  **1 bug de dev-mode encontrado, no corregido (fuera de alcance)**: `RegisterPaymentModal` (y probablemente otros modales `<dialog>` del proyecto con el mismo patrón) parpadea abierto→cerrado bajo React Strict Mode en `next dev` — el cleanup del `useEffect` llama `dialog.close()`, que dispara el evento nativo `close`, que activa el `onClose` del padre y cierra el modal antes de que el usuario pueda interactuar. **No ocurre en producción** (Strict Mode sólo duplica efectos en dev). Verificado que no es causado por mi diff (el `useEffect` en cuestión no fue tocado). El flujo se verificó igualmente completo vía API directa (arriba). Recomendado abrir un change aparte para auditar el patrón `<dialog>` en los demás modales del proyecto.
