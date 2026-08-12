# Spec: payments-api

## Purpose

Define the customer payments (abonos) API: register, cancel, list, and report endpoints under `/api/v1/admin/payments` and `/api/v1/admin/sales/:id/payments`. Handles the credit-collection lifecycle for sales emitted with a credit payment method (`paymentMethod.isCredit=true`).

---
## Requirements
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
- Un `CustomerPayment` OPCIONALMENTE tiene una o más filas `CustomerPaymentItem` (`customer_payment_id` FK `ON DELETE CASCADE`, `sale_item_id` FK a `sale_items(id)` `ON DELETE RESTRICT`, `amount Decimal(14,4)` con CHECK `amount > 0`) — el desglose de a qué línea de la venta se aplicó cada porción del abono. Un `CustomerPayment` SIN filas `CustomerPaymentItem` significa que el monto se aplicó al saldo global de la venta sin desglose por línea (comportamiento previo, sigue siendo válido).

#### Scenario: Snapshot folio sobrevive reset de folios

- **WHEN** un abono es creado con folio `RECIBO-0001`, y luego un admin desactiva ese `Folio`
- **THEN** `GET /api/v1/admin/payments/:id` sigue devolviendo `folioCode: "RECIBO-0001"`

#### Scenario: branchId heredado del sale

- **WHEN** un abono se registra para una `Sale` cuyo `branchId = B1`
- **THEN** el `customer_payments.branch_id` persiste como `B1` aunque el body no lo envíe

#### Scenario: Abono sin desglose por línea no crea CustomerPaymentItem

- **WHEN** un abono se registra sin el campo `items` en el body
- **THEN** no se crea ninguna fila `CustomerPaymentItem`, y el comportamiento es idéntico al de antes de este change

---

### Requirement: Register payment endpoint

El sistema SHALL exponer `POST /api/v1/admin/payments` para registrar un abono. Requires `payments:create`. Body:

- `saleId: string` (UUID de una venta `completed` cuyo `paymentMethod.isCredit === true`).
- `paymentMethodId: string` (UUID de un payment method activo — el método con el que el cliente está pagando este abono específico; PUEDE o NO ser un método con `isCredit=true`. Típicamente es un método NO crédito como `EFECTIVO` o `TRANSFERENCIA`, porque un abono es un cobro real).
- `folioId: string` (UUID de un folio activo cuyo `scope='OPERATIONS'`, típicamente `code="RB"`).
- `amount: number` (decimal `> 0`; max 14 integer + 4 decimal digits).
- `notes?: string | null` (max 1000 chars).
- `items?: Array<{ saleItemId: string (uuid), amount: number (decimal > 0) }>` — OPCIONAL. Cuando se provee, reparte el abono entre líneas específicas de la venta con montos independientes por línea.

Flujo atómico (dentro de `prisma.$transaction`):

1. Cargar la `Sale` con `include: { paymentMethod: true, items: true }`; si no existe → HTTP 404.
2. Validar `sale.status === 'completed'`; sino → HTTP 409 `{"error":"SaleNotPayable","status":"<actual>"}`.
3. Validar `sale.paymentMethod.isCredit === true`; sino → HTTP 409 `{"error":"SaleNotPayable","reason":"not_credit"}`. (Una venta pagada al momento — con un `paymentMethod` que NO es crédito — no admite abonos posteriores.)
4. Aplicar branch scoping: si el caller no tiene `branches:access_all` y `sale.branchId !== x-user-branch-id` → HTTP 403.
5. Validar `paymentMethod.isActive` y `folio.isActive`; sino → HTTP 400.
6. Validar `folio.scope === 'OPERATIONS'`; sino → HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"<scope>"}`.
7. Validar `amount > 0` (Zod) y `amount <= sale.total - sale.paidAmount`; sino → HTTP 409 `{"error":"PaymentExceedsDueAmount","due": "<remaining>"}`.
8. **Si `items` está presente**: validar que cada `saleItemId` pertenece a `sale.items` (sino HTTP 400 `{"error":"SaleItemNotFound","saleItemId":"..."}`); validar `SUM(items[].amount) === amount` (tolerancia de redondeo `0.0001`, sino HTTP 400 `{"error":"PaymentItemsAmountMismatch","expected":amount,"sum":"<suma>"}`); para cada línea, calcular `lineDue = sale_item.lineTotal - SUM(customer_payment_items.amount de abonos completed previos para esa línea)` y validar `items[].amount <= lineDue` (sino HTTP 409 `{"error":"PaymentExceedsLineDueAmount","saleItemId":"...","due":"<lineDue>"}`, sin persistir nada).
9. Alocar folio atómico: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. 0 filas → HTTP 400.
10. `UPDATE sales SET paid_amount = paid_amount + ?, payment_status = ? WHERE id = ?` (el nuevo `payment_status` se calcula al vuelo: `paid` si `paid_amount + amount >= total`; sino `partial`).
11. `UPDATE customers SET current_balance = current_balance - ? WHERE id = ?` (sale.customerId).
12. `INSERT INTO customer_payments (...)` con `status='completed'`, `branch_id = sale.branchId`, `user_id = x-user-id`, folio snapshoteado.
13. **Si `items` está presente**: `INSERT INTO customer_payment_items (customer_payment_id, sale_item_id, amount)` una fila por línea.
14. Retornar HTTP 201 con el `PaymentDetailDto` (incluye `items?: Array<{saleItemId, amount}>` cuando aplica).

#### Scenario: Abono parcial

- **WHEN** una venta tiene `total=1000`, `paidAmount=0`, `paymentMethod.isCredit=true`; se registra abono `amount=300` con folio `RB` (`scope='OPERATIONS'`)
- **THEN** el abono se crea, `sale.paidAmount=300`, `sale.paymentStatus='partial'`, `customer.currentBalance -= 300`

#### Scenario: Abono liquida la venta

- **WHEN** una venta tiene `total=1000`, `paidAmount=700`, `paymentMethod.isCredit=true`; se registra abono `amount=300` con folio `RB`
- **THEN** el abono se crea, `sale.paidAmount=1000`, `sale.paymentStatus='paid'`, `customer.currentBalance -= 300`

#### Scenario: Abono excede el saldo pendiente

- **WHEN** una venta tiene `total=1000`, `paidAmount=700`; se registra abono `amount=400`
- **THEN** el sistema retorna HTTP 409 `{"error":"PaymentExceedsDueAmount","due":"300"}` y nada se persiste

#### Scenario: Venta pagada al momento (paymentMethod no es crédito)

- **WHEN** se intenta registrar abono sobre una venta cuyo `paymentMethod.isCredit=false`
- **THEN** HTTP 409 `{"error":"SaleNotPayable","reason":"not_credit"}`

#### Scenario: Venta cancelada

- **WHEN** se intenta registrar abono sobre una venta con `status='cancelled'`
- **THEN** HTTP 409 `{"error":"SaleNotPayable","status":"cancelled"}`

#### Scenario: Branch scoping cross-branch

- **WHEN** un operator con `x-user-branch-id=B1` intenta abonar una venta de `branchId=B2`
- **THEN** HTTP 403 (sin `branches:access_all`)

#### Scenario: Sin permiso payments:create

- **WHEN** un usuario sin `payments:create` intenta `POST /payments`
- **THEN** HTTP 403 `{"error":"Forbidden","required":"payments:create"}`

#### Scenario: Folio inactivo

- **WHEN** el `folioId` referencia un folio con `isActive=false`
- **THEN** HTTP 400 `{"error":"Folio inactive"}`

#### Scenario: Folio con scope incorrecto

- **WHEN** el `folioId` referencia un folio activo cuyo `scope !== 'OPERATIONS'` (e.g. el folio `COT` con `scope='POS'`)
- **THEN** HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"POS"}` y nada se persiste (no incrementa `current_number`, no muta `sale.paidAmount`, no muta `customer.currentBalance`)

#### Scenario: Abono repartido entre dos líneas con montos independientes

- **WHEN** una venta tiene líneas A (`lineTotal=100`, sin abonos previos) y B (`lineTotal=50`, sin abonos previos); se registra un abono con `amount=110`, `items: [{saleItemId: A, amount: 60}, {saleItemId: B, amount: 50}]`
- **THEN** el abono se crea con 2 `CustomerPaymentItem`, `sale.paidAmount += 110`, y el saldo restante de A es `40` y de B es `0`

#### Scenario: Monto de línea excede el saldo de esa línea específica

- **WHEN** la línea A tiene `lineTotal=100` con `40` ya abonado en abonos `completed` previos, y se intenta un nuevo abono con `items: [{saleItemId: A, amount: 70}]`
- **THEN** el sistema retorna HTTP 409 `{"error":"PaymentExceedsLineDueAmount","saleItemId":"A","due":"60"}` y nada se persiste, aunque `amount <= sale.total - sale.paidAmount` a nivel global

#### Scenario: Suma de items no coincide con el monto total

- **WHEN** se envía `amount=100` con `items: [{saleItemId: A, amount: 40}, {saleItemId: B, amount: 50}]` (suma 90 ≠ 100)
- **THEN** el sistema retorna HTTP 400 `{"error":"PaymentItemsAmountMismatch","expected":100,"sum":90}` antes de cualquier validación de saldo por línea

#### Scenario: saleItemId no pertenece a la venta

- **WHEN** `items` incluye un `saleItemId` que no está en `sale.items`
- **THEN** el sistema retorna HTTP 400 `{"error":"SaleItemNotFound","saleItemId":"..."}`

---

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

Las filas `CustomerPaymentItem` del abono NO se borran ni se mutan al cancelar — el cálculo de saldo por línea (`Requirement: List payments by sale`) SHALL excluir por join los `CustomerPaymentItem` cuyo `CustomerPayment.status = 'cancelled'`, de modo que el saldo de la línea se revierte automáticamente sin lógica de reversión adicional.

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

#### Scenario: Cancelar un abono con desglose por línea revierte el saldo de línea

- **WHEN** un abono con `CustomerPaymentItem` en las líneas A (`amount=60`) y B (`amount=50`) se cancela
- **THEN** el saldo pendiente de A vuelve a incluir esos `60` y el de B esos `50` en el siguiente `GET /sales/:id/payments` (vía exclusión de abonos `cancelled` del cálculo, no por mutación de las filas `CustomerPaymentItem`)

---

### Requirement: List payments endpoint

El sistema SHALL exponer `GET /api/v1/admin/payments` que devuelve listado paginado. Requires `payments:read`. Query params: `page` (default 1), `pageSize` (default 20, max 100), `saleId?` UUID, `customerId?` UUID, `userId?` UUID, `paymentMethodId?` UUID, `status?` (one or more of `completed,cancelled`, comma-separated), `from?` ISO date, `to?` ISO date, `branchId?` UUID.

Branch scoping: idéntico al patrón de `sales` (`resolveScopedBranchId`).

Response: `{ items: PaymentDto[], total, page, pageSize }`. Ordenado por `created_at DESC`.

`PaymentDto`: `id`, `saleId`, `saleFolioCode` (join), `customerId`, `customerName` (join), `userId`, `userName` (join), `branchId`, `branchName` (join), `paymentMethodId`, `paymentMethodCode` (join), `folioId`, `folioCode`, `folioNumber`, `amount` (string), `status`, `notes`, `createdAt`, `cancelledAt`, `cancellationReason`, `saleTotal` (string, monto total de la venta asociada), `salePaidAmount` (string, abonado hasta el momento en la venta), `salePaymentStatus` (`"paid" | "partial" | "pending"`, estado de cobro de la venta), `saleDueAmount` (string, `saleTotal - salePaidAmount`).

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

#### Scenario: Cada abono incluye el desglose de su venta

- **WHEN** se lista un abono cuya venta tiene `total=1000` y `paidAmount=300`
- **THEN** el item incluye `saleTotal="1000.0000"`, `salePaidAmount="300.0000"`, `saleDueAmount="700.0000"`, `salePaymentStatus="partial"`

#### Scenario: Venta liquidada al 100% refleja saldo cero

- **WHEN** se lista un abono cuya venta tiene `total=1000` y `paidAmount=1000`
- **THEN** el item incluye `saleDueAmount="0.0000"` y `salePaymentStatus="paid"`

---

### Requirement: Get payment detail

El sistema SHALL exponer `GET /api/v1/admin/payments/:id`. Requires `payments:read`. Devuelve HTTP 404 si no existe. Branch scoping aplica.

`PaymentDetailDto` hereda todos los campos de `PaymentDto` (incluyendo `saleTotal`, `salePaidAmount`, `salePaymentStatus`, `saleDueAmount`) y añade el bloque `sale: { id, folioCode, folioNumber, total, paidAmount, paymentStatus }` con el snapshot completo de la venta.

#### Scenario: Detalle de abono existente

- **WHEN** un caller autorizado invoca `GET /payments/:id` con UUID válido
- **THEN** responde HTTP 200 con `PaymentDetailDto` (`PaymentDto` + desglose de venta + bloque `sale`)

#### Scenario: No encontrado

- **WHEN** el `:id` no matchea ningún abono
- **THEN** HTTP 404

---

### Requirement: List payments by sale

El sistema SHALL exponer `GET /api/v1/admin/sales/:id/payments` que lista TODOS los abonos de una venta (incluye `cancelled`). Requires `payments:read`. Branch scoping vía el `sale.branchId`.

Response: `{ items: PaymentDto[], saleId, saleTotal, salePaidAmount, salePaymentStatus, saleDueAmount, lineBalances: Array<{ saleItemId, lineTotal, paidAmount, dueAmount }> }`. `saleDueAmount = saleTotal - salePaidAmount`. Cada elemento de `items[]` (`PaymentDto`) también incluye `saleTotal`, `salePaidAmount`, `salePaymentStatus`, `saleDueAmount` a nivel de fila (mismos valores que los campos de nivel superior de la respuesta, por consistencia con el resto de endpoints que devuelven `PaymentDto`). `lineBalances` incluye TODAS las líneas de la venta (tengan o no abonos por línea); `paidAmount` de cada línea es la suma de `CustomerPaymentItem.amount` de abonos `completed` para esa línea (`0` si nunca se abonó por línea); `dueAmount = lineTotal - paidAmount`. Sin paginación (una venta no tendrá miles de abonos).

#### Scenario: Listar abonos de venta

- **WHEN** una venta tiene 3 abonos (2 completed y 1 cancelled)
- **THEN** la respuesta los incluye TODOS, ordenados por `created_at ASC`, con los totales agregados

#### Scenario: lineBalances incluye líneas sin abono por línea

- **WHEN** una venta tiene 2 líneas y ningún abono usó `items` (desglose por línea)
- **THEN** `lineBalances` incluye ambas líneas con `paidAmount: 0` y `dueAmount = lineTotal`

#### Scenario: lineBalances refleja abonos por línea completados

- **WHEN** una línea A (`lineTotal=100`) recibió un abono por línea de `60` (completed)
- **THEN** `lineBalances` para A muestra `paidAmount: 60`, `dueAmount: 40`

### Requirement: Payment history report endpoint

El sistema SHALL exponer `GET /api/v1/admin/payments/history` que devuelve el historial con filtros y formatos `json`, `pdf` o `xlsx`. Requires `payments:report_read`.

Query params (todos opcionales excepto `format`):

- `format?: "json" | "pdf" | "xlsx"` (default `"json"`).
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

Para `format=pdf` o `format=xlsx`: sin paginación, límite duro 10,000 filas compartido entre ambos formatos. Si excede → HTTP 409 `{"error":"ReportTooLarge","limit":10000}`.

Para `format=pdf`: el PDF SHALL generarse con `@react-pdf/renderer`, devuelto con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"` (fecha del `generatedAt` UTC). El contenido SHALL agrupar visualmente las filas por ticket (`saleId`): un bloque de encabezado por ticket (folio de venta, cliente, Monto total, Saldo) seguido de las filas de sus abonos, antes de la sección de totales globales.

Para `format=xlsx`: el archivo SHALL generarse como workbook `.xlsx`, devuelto con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.xlsx"`. El contenido SHALL agrupar las filas por ticket con la misma estructura que el PDF (encabezado de ticket + filas de abonos + fila en blanco de separación), y una sección de totales globales al final de la hoja.

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
      "status": "completed",
      "saleTotal": "1000.0000",
      "salePaidAmount": "1000.0000",
      "salePaymentStatus": "paid",
      "saleDueAmount": "0.0000"
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
- **THEN** HTTP 200 con `items[]` filtrados (cada uno con `saleTotal`/`salePaidAmount`/`salePaymentStatus`/`saleDueAmount`) y `totals` agregados

#### Scenario: Historial por ticket

- **WHEN** un caller invoca `?saleId=<S>`
- **THEN** la respuesta solo incluye abonos cuyo `sale_id === S` (cubre "historial de abonos por Ticket")

#### Scenario: Historial filtrado por producto

- **WHEN** un caller invoca `?productId=<P>`
- **THEN** la respuesta incluye solo abonos cuya venta tiene al menos un `sale_item.product_id === P`; un abono cuya venta tiene 3 productos distintos aparece UNA sola vez

#### Scenario: PDF de historial agrupado por ticket

- **WHEN** un caller invoca `?format=pdf&userId=<U>`
- **THEN** HTTP 200 con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"`; el cuerpo es un PDF válido (comienza con bytes `%PDF-`) cuyo contenido agrupa las filas por ticket

#### Scenario: Excel de historial agrupado por ticket

- **WHEN** un caller con `payments:report_read` invoca `?format=xlsx&from=2026-06-01&to=2026-06-30`
- **THEN** HTTP 200 con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.xlsx"`; el archivo es un workbook `.xlsx` válido cuyo contenido agrupa las filas por ticket, con subtotal de Monto total/Saldo por ticket y totales globales al final

#### Scenario: Excel demasiado grande

- **WHEN** el set filtrado excede 10,000 filas y se pide `format=xlsx`
- **THEN** HTTP 409 `{"error":"ReportTooLarge","limit":10000}` (mismo comportamiento que `format=pdf`)

#### Scenario: PDF demasiado grande

- **WHEN** el set filtrado excede 10,000 filas y se pide `format=pdf`
- **THEN** HTTP 409 `{"error":"ReportTooLarge","limit":10000}`

#### Scenario: Sin permiso payments:report_read

- **WHEN** un usuario con `payments:read` pero SIN `payments:report_read` invoca el endpoint
- **THEN** HTTP 403 `{"error":"Forbidden","required":"payments:report_read"}`

---

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

---

### Requirement: Folio scope must be OPERATIONS for payments

`RegisterPaymentUseCase` SHALL validar, después de cargar el `Folio` desde el `folioId` recibido, que `folio.scope === 'OPERATIONS'`. Si el scope no coincide, el use case SHALL lanzar `FolioScopeMismatchError(expected='OPERATIONS', actual=<folio.scope>)` que el controller mapea a HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"<scope>"}`. La validación SHALL ocurrir en el mismo paso que `folio.isActive`, antes de la asignación atómica de `current_number`.

#### Scenario: Registrar abono con folio RB (OPERATIONS)

- **WHEN** un usuario con `payments:create` envía `POST /api/v1/admin/payments` con `folioId` apuntando al folio `RB` (`scope='OPERATIONS'`)
- **THEN** el sistema procede con el flujo normal y retorna HTTP 201

#### Scenario: Registrar abono con folio POS rechazado

- **WHEN** la request usa `folioId` apuntando a un folio cuyo `scope='POS'` (e.g. `TK`)
- **THEN** el sistema retorna HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"POS"}` y NO incrementa `current_number` ni muta `sale.paidAmount`

#### Scenario: Registrar abono con folio INVENTORY rechazado

- **WHEN** la request usa `folioId` apuntando al folio `TS` (`scope='INVENTORY'`)
- **THEN** el sistema retorna HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"INVENTORY"}`

---

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

---

