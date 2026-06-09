## ADDED Requirements

### Requirement: CustomerPayment aggregate model

El sistema SHALL persistir cada abono como `CustomerPayment` con los siguientes invariantes:

- `CustomerPayment.id` UUID PK.
- `saleId` (FK a `sales(id)` `ON DELETE RESTRICT`).
- `customerId` (FK a `customers(id)` `ON DELETE RESTRICT`).
- `userId` (FK `@db.Uuid` a `users(id)` `ON DELETE RESTRICT`) — el cobrador que registró el abono.
- `branchId` (FK a `branches(id)` `ON DELETE RESTRICT`) — heredado del `sale.branchId` al crear, NO se acepta en el body.
- `paymentMethodId` (FK a `payment_methods(id)` `ON DELETE RESTRICT`).
- `folioId` (FK a `folios(id)` `ON DELETE RESTRICT`), `folioNumber INT`, `folioCode TEXT` snapshot.
- `amount` `Decimal(14,4)` con CHECK `amount > 0`.
- `status` `VARCHAR(20)` con CHECK en `('completed','cancelled')`. Default `'completed'`.
- `notes` `TEXT NULL` (max 1000 chars desde la API).
- `createdAt`, `cancelledAt`, `cancellationReason TEXT NULL`.
- `UNIQUE (folio_id, folio_number)`.
- Índices: `(sale_id, status)`, `(customer_id, status)`, `(user_id, created_at)`, `(branch_id, created_at)`.

#### Scenario: Snapshot folio sobrevive reset de folios

- **WHEN** un abono es creado con folio `RECIBO-0001`, y luego un admin desactiva ese `Folio`
- **THEN** `GET /api/v1/admin/payments/:id` sigue devolviendo `folioCode: "RECIBO-0001"`

#### Scenario: branchId heredado del sale

- **WHEN** un abono se registra para una `Sale` cuyo `branchId = B1`
- **THEN** el `customer_payments.branch_id` persiste como `B1` aunque el body no lo envíe

### Requirement: Register payment endpoint

El sistema SHALL exponer `POST /api/v1/admin/payments` para registrar un abono. Requires `payments:create`. Body:

- `saleId: string` (UUID de una venta `completed` cuyo `paymentMethod.isCredit === true`).
- `paymentMethodId: string` (UUID de un payment method activo — el método con el que el cliente está pagando este abono específico; PUEDE o NO ser un método con `isCredit=true`. Típicamente es un método NO crédito como `EFECTIVO` o `TRANSFERENCIA`, porque un abono es un cobro real).
- `folioId: string` (UUID de un folio activo, típicamente `code="RECIBO"`).
- `amount: number` (decimal `> 0`; max 14 integer + 4 decimal digits).
- `notes?: string | null` (max 1000 chars).

Flujo atómico (dentro de `prisma.$transaction`):

1. Cargar la `Sale` con `include: { paymentMethod: true }`; si no existe → HTTP 404.
2. Validar `sale.status === 'completed'`; sino → HTTP 409 `{"error":"SaleNotPayable","status":"<actual>"}`.
3. Validar `sale.paymentMethod.isCredit === true`; sino → HTTP 409 `{"error":"SaleNotPayable","reason":"not_credit"}`. (Una venta pagada al momento — con un `paymentMethod` que NO es crédito — no admite abonos posteriores.)
4. Aplicar branch scoping: si el caller no tiene `branches:access_all` y `sale.branchId !== x-user-branch-id` → HTTP 403.
5. Validar `paymentMethod.isActive` y `folio.isActive`; sino → HTTP 400.
6. Validar `amount > 0` (Zod) y `amount <= sale.total - sale.paidAmount`; sino → HTTP 409 `{"error":"PaymentExceedsDueAmount","due": "<remaining>"}`.
7. Alocar folio atómico: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. 0 filas → HTTP 400.
8. `UPDATE sales SET paid_amount = paid_amount + ?, payment_status = ? WHERE id = ?` (el nuevo `payment_status` se calcula al vuelo: `paid` si `paid_amount + amount >= total`; sino `partial`).
9. `UPDATE customers SET current_balance = current_balance - ? WHERE id = ?` (sale.customerId).
10. `INSERT INTO customer_payments (...)` con `status='completed'`, `branch_id = sale.branchId`, `user_id = x-user-id`, folio snapshoteado.
11. Retornar HTTP 201 con el `PaymentDetailDto`.

#### Scenario: Abono parcial

- **WHEN** una venta tiene `total=1000`, `paidAmount=0`, `paymentMethod.isCredit=true`; se registra abono `amount=300`
- **THEN** el abono se crea, `sale.paidAmount=300`, `sale.paymentStatus='partial'`, `customer.currentBalance -= 300`

#### Scenario: Abono liquida la venta

- **WHEN** una venta tiene `total=1000`, `paidAmount=700`, `paymentMethod.isCredit=true`; se registra abono `amount=300`
- **THEN** el abono se crea, `sale.paidAmount=1000`, `sale.paymentStatus='paid'`, `customer.currentBalance -= 300`

#### Scenario: Abono excede el saldo pendiente

- **WHEN** una venta tiene `total=1000`, `paidAmount=700`, `paymentMethod.isCredit=true`; se registra abono `amount=500`
- **THEN** el sistema responde HTTP 409 `{"error":"PaymentExceedsDueAmount","due":"300.0000"}` y la transacción no commitea

#### Scenario: Venta pagada al momento (paymentMethod no es crédito)

- **WHEN** se intenta abonar una venta cuyo `paymentMethod.isCredit=false`
- **THEN** el sistema responde HTTP 409 `{"error":"SaleNotPayable","reason":"not_credit"}`

#### Scenario: Venta cancelada

- **WHEN** se intenta abonar una venta con `status='cancelled'`
- **THEN** el sistema responde HTTP 409 `{"error":"SaleNotPayable","status":"cancelled"}`

#### Scenario: Branch scoping cross-branch

- **WHEN** un operador con `x-user-branch-id=B1` (sin `branches:access_all`) intenta abonar una venta de `branchId=B2`
- **THEN** el sistema responde HTTP 403 `{"error":"Forbidden","required":"branches:access_all"}`

#### Scenario: Sin permiso payments:create

- **WHEN** un usuario sin `payments:create` invoca el endpoint
- **THEN** el sistema responde HTTP 403 `{"error":"Forbidden","required":"payments:create"}`

#### Scenario: Folio inactivo

- **WHEN** el `folioId` referencia un folio con `isActive=false`
- **THEN** el sistema responde HTTP 400

### Requirement: Cancel payment endpoint

El sistema SHALL exponer `POST /api/v1/admin/payments/:id/cancel`. Requires `payments:cancel`. Body OPCIONAL: `{ reason?: string | null }` (max 500 chars). Branch scoping aplica vía `enforceBranchScope(req, payment.branchId)`.

Flujo atómico:

1. Cargar el `CustomerPayment`; si no existe → HTTP 404.
2. Si `status === 'cancelled'` → HTTP 409 `{"error":"PaymentAlreadyCancelled"}` (NO idempotente).
3. Aplicar branch scoping.
4. `UPDATE customer_payments SET status='cancelled', cancelled_at=NOW(), cancellation_reason=? WHERE id=?`.
5. `UPDATE sales SET paid_amount = paid_amount - ?, payment_status = ? WHERE id=?` (recalcular: si `paid_amount - amount > 0` → `partial`; si `== 0` y la venta es a crédito → `pending`; nunca `paid` tras una cancelación).
6. `UPDATE customers SET current_balance = current_balance + ? WHERE id=?`.
7. Retornar HTTP 200 con el `PaymentDetailDto` actualizado.

El folio NO se libera (numeración consecutiva).

#### Scenario: Cancelar abono completado

- **WHEN** un abono `completed` de `amount=300` se cancela
- **THEN** el sistema responde HTTP 200 con `status='cancelled'`, `sale.paidAmount -= 300`, `sale.paymentStatus` se recalcula, `customer.currentBalance += 300`

#### Scenario: Cancelar dos veces

- **WHEN** un abono ya cancelado se cancela de nuevo
- **THEN** el sistema responde HTTP 409 `{"error":"PaymentAlreadyCancelled"}` y no muta nada

#### Scenario: Cancelar último abono deja la venta pending

- **WHEN** una venta a crédito tiene un único abono que la liquidó (`paymentStatus=paid`) y ese abono se cancela
- **THEN** `sale.paidAmount = 0`, `sale.paymentStatus = 'pending'`, `customer.currentBalance += amount`

### Requirement: List payments endpoint

El sistema SHALL exponer `GET /api/v1/admin/payments` que devuelve listado paginado. Requires `payments:read`. Query params: `page` (default 1), `pageSize` (default 20, max 100), `saleId?` UUID, `customerId?` UUID, `userId?` UUID, `paymentMethodId?` UUID, `status?` (one or more of `completed,cancelled`, comma-separated), `from?` ISO date, `to?` ISO date, `branchId?` UUID.

Branch scoping: idéntico al patrón de `sales` (`resolveScopedBranchId`).

Response: `{ items: PaymentDto[], total, page, pageSize }`. Ordenado por `created_at DESC`.

`PaymentDto`: `id`, `saleId`, `saleFolioCode` (join), `customerId`, `customerName` (join), `userId`, `userName` (join), `branchId`, `branchName` (join), `paymentMethodId`, `paymentMethodCode` (join), `folioId`, `folioCode`, `folioNumber`, `amount` (string), `status`, `notes`, `createdAt`, `cancelledAt`, `cancellationReason`.

#### Scenario: Listado básico

- **WHEN** un operator invoca el endpoint sin filtros
- **THEN** recibe HTTP 200 con sus abonos de su sucursal, paginados

#### Scenario: Filtro por ticket (saleId)

- **WHEN** se filtra `?saleId=<uuid-S>`
- **THEN** solo se incluyen abonos cuyo `sale_id === S`

#### Scenario: Filtro por usuario cobrador

- **WHEN** se filtra `?userId=<uuid-U>`
- **THEN** solo se incluyen abonos cuyo `user_id === U`

#### Scenario: Filtro por rango de fechas

- **WHEN** se filtra `?from=2026-06-01&to=2026-06-30`
- **THEN** solo se incluyen abonos con `created_at` dentro de ese rango (inclusive)

#### Scenario: Filtro por status múltiple

- **WHEN** se filtra `?status=completed,cancelled`
- **THEN** se incluyen ambos estados

### Requirement: Get payment detail

El sistema SHALL exponer `GET /api/v1/admin/payments/:id`. Requires `payments:read`. Devuelve HTTP 404 si no existe. Branch scoping aplica.

#### Scenario: Detalle de abono existente

- **WHEN** un caller autorizado invoca `GET /payments/:id` con UUID válido
- **THEN** responde HTTP 200 con `PaymentDetailDto` (mismo `PaymentDto` + sale snapshot básico)

#### Scenario: No encontrado

- **WHEN** el `:id` no matchea ningún abono
- **THEN** HTTP 404

### Requirement: List payments by sale

El sistema SHALL exponer `GET /api/v1/admin/sales/:id/payments` que lista TODOS los abonos de una venta (incluye `cancelled`). Requires `payments:read`. Branch scoping vía el `sale.branchId`.

Response: `{ items: PaymentDto[], saleId, saleTotal, salePaidAmount, salePaymentStatus, saleDueAmount }`. `saleDueAmount = saleTotal - salePaidAmount`. Sin paginación (una venta no tendrá miles de abonos).

#### Scenario: Listar abonos de venta

- **WHEN** una venta tiene 3 abonos (2 completed y 1 cancelled)
- **THEN** la respuesta los incluye TODOS, ordenados por `created_at ASC`, con los totales agregados

### Requirement: Payment history report endpoint

El sistema SHALL exponer `GET /api/v1/admin/payments/history` que devuelve el historial con filtros y formatos `json` o `pdf`. Requires `payments:report_read`.

Query params (todos opcionales excepto `format`):

- `format?: "json" | "pdf"` (default `"json"`).
- `userId?: string` UUID — filtra abonos cuyo cobrador es ese usuario.
- `saleId?: string` UUID — filtra a una venta específica (cubre el "historial por ticket").
- `customerId?: string` UUID.
- `productId?: string` UUID — filtra abonos cuya venta incluye ese producto (JOIN `sales` → `sale_items`; `DISTINCT customer_payments.id`).
- `paymentMethodId?: string` UUID.
- `status?: string` (comma-separated `completed,cancelled`; default ambos).
- `from?: string` (ISO date YYYY-MM-DD; inclusive lower bound sobre `created_at`).
- `to?: string` (ISO date YYYY-MM-DD; inclusive upper bound).
- `branchId?: string` UUID (con branch scoping).
- `page?`, `pageSize?` (solo para `format=json`; `pageSize` default `50`, max `200`).

Para `format=pdf`: sin paginación, límite duro 10,000 filas. Si excede → HTTP 409 `{"error":"ReportTooLarge","limit":10000}`.

Para `format=pdf`: el PDF SHALL generarse con `@react-pdf/renderer` y devolverse con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"` (la fecha es la del `generatedAt` UTC).

`PaymentHistoryReportDto` (JSON):

```json
{
  "generatedAt": "2026-06-06T18:23:00.000Z",
  "generatedBy": { "userId": "<uuid>", "email": "operator@example.com" },
  "filters": { "userId": null, "saleId": null, "customerId": null, "productId": null, "paymentMethodId": null, "status": ["completed"], "from": null, "to": null, "branchId": null },
  "items": [
    {
      "id": "<uuid>",
      "createdAt": "2026-06-05T...",
      "folioCode": "RECIBO-0042",
      "saleId": "<uuid>",
      "saleFolioCode": "VENTA-1024",
      "customerId": "<uuid>",
      "customerName": "Acme S.A.",
      "userId": "<uuid>",
      "userName": "Juan Pérez",
      "branchId": "<uuid>",
      "branchName": "Matriz",
      "paymentMethodCode": "EFECTIVO",
      "amount": "300.0000",
      "status": "completed"
    }
  ],
  "totals": {
    "rowCount": 1,
    "completedCount": 1,
    "cancelledCount": 0,
    "totalAmountCompleted": "300.0000",
    "totalAmountCancelled": "0.0000"
  },
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```

#### Scenario: Historial JSON con filtros

- **WHEN** un caller con `payments:report_read` invoca `?userId=<U>&from=2026-06-01&to=2026-06-30`
- **THEN** HTTP 200 con `items[]` filtrados y `totals` agregados

#### Scenario: Historial por ticket

- **WHEN** un caller invoca `?saleId=<S>`
- **THEN** la respuesta solo incluye abonos cuyo `sale_id === S` (cubre "historial de abonos por Ticket")

#### Scenario: Historial filtrado por producto

- **WHEN** un caller invoca `?productId=<P>`
- **THEN** la respuesta incluye solo abonos cuya venta tiene al menos un `sale_item.product_id === P`; un abono cuya venta tiene 3 productos distintos aparece UNA sola vez

#### Scenario: PDF de historial

- **WHEN** un caller invoca `?format=pdf&userId=<U>`
- **THEN** HTTP 200 con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"`; el cuerpo es un PDF válido (comienza con bytes `%PDF-`)

#### Scenario: PDF demasiado grande

- **WHEN** el set filtrado excede 10,000 filas y se pide `format=pdf`
- **THEN** HTTP 409 `{"error":"ReportTooLarge","limit":10000}`

#### Scenario: Sin permiso payments:report_read

- **WHEN** un usuario con `payments:read` pero SIN `payments:report_read` invoca el endpoint
- **THEN** HTTP 403 `{"error":"Forbidden","required":"payments:report_read"}`

### Requirement: Branch scoping for payments

Los endpoints de `payments-api` SHALL aplicar branch scoping idéntico al resto de módulos:
- `GET /payments` y `GET /payments/history`: `resolveScopedBranchId` para `branchId` opcional; usuarios sin bypass quedan forzados a `x-user-branch-id`.
- `POST /payments`: el `branchId` se deriva del `sale.branchId`; si el caller no tiene bypass y `sale.branchId !== x-user-branch-id` → HTTP 403.
- `GET /payments/:id`, `POST /payments/:id/cancel`, `GET /sales/:id/payments`: `enforceBranchScope` cargando el recurso primero.

#### Scenario: Operator restringido a su sucursal en listado

- **WHEN** un operator con `x-user-branch-id=B1` invoca `GET /payments` sin `?branchId=`
- **THEN** solo recibe abonos de B1

#### Scenario: Admin con bypass ve todas las sucursales

- **WHEN** un admin con `branches:access_all` invoca `GET /payments`
- **THEN** recibe abonos de todas las sucursales

### Requirement: Payments module hexagonal layering

El módulo `src/modules/payments/` SHALL respetar el layering hexagonal:
- `domain/` no importa de `application/`, `infrastructure/`, Next, ni Prisma.
- `application/use-cases/` recibe `PaymentRepository` por DI; no importa Prisma.
- `infrastructure/repositories/PrismaPaymentRepository.ts` implementa el port con `prisma.$transaction`.
- `infrastructure/http/PaymentsController.ts` valida Zod, resuelve branch scoping, invoca use cases, serializa JSON o PDF.
- `infrastructure/di/container.ts` exporta `paymentsController`.
- Sin import circular con `pos/di`; si requiere `SaleRepository`, instanciar `PrismaSaleRepository` localmente (mismo patrón que `returns/di`).

#### Scenario: Use case sin acoplar Prisma

- **WHEN** un desarrollador inspecciona `src/modules/payments/application/use-cases/RegisterPaymentUseCase.ts`
- **THEN** el archivo no importa `@prisma/client` ni de `src/shared/infrastructure/prisma/`

### Requirement: Seeded RECIBO folio

`prisma/seed.ts` SHALL hacer upsert idempotente del folio `code="RECIBO"`, `name="Recibo de abono"`, `prefix="RECIBO-"`, `isActive=true`. El `current_number` NO se resetea en re-ejecuciones (idempotencia).

#### Scenario: Seed crea folio RECIBO

- **WHEN** `npm run seed` corre sobre una DB sin folio `RECIBO`
- **THEN** el folio se inserta con `current_number=0`

#### Scenario: Re-ejecución preserva el contador

- **WHEN** el folio `RECIBO` ya existe con `current_number=42`
- **THEN** el seed no toca `current_number`; queda en 42
