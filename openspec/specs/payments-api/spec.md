# Spec: payments-api

## Purpose

Define the customer payments (abonos) API: register, cancel, list, and report endpoints under `/api/v1/admin/payments` and `/api/v1/admin/sales/:id/payments`. Handles the credit-collection lifecycle for sales emitted with a credit payment method (`paymentMethod.isCredit=true`).

---
## Requirements
### Requirement: CustomerPayment aggregate model

El sistema SHALL persistir cada abono como `CustomerPayment` con los siguientes invariantes:

- `CustomerPayment.id` UUID PK.
- `saleId` (FK OPCIONAL a `sales(id)` `ON DELETE RESTRICT`). `saleId = NULL` indica un **abono a saldo general (sin ticket)** — producido exclusivamente por el endpoint `POST /api/v1/admin/customers/:id/payments` (Requirement "Register account payment endpoint"). El endpoint `POST /api/v1/admin/payments` (abono por venta) SIGUE exigiendo `saleId` no nulo en su propio Zod; nunca produce una fila con `saleId=null`.
- `customerId` (FK a `customers(id)` `ON DELETE RESTRICT`) — SIEMPRE obligatorio, con o sin venta asociada.
- `userId` (FK `@db.Uuid` a `users(id)` `ON DELETE RESTRICT`) — el cobrador que registró el abono.
- `branchId` (FK a `branches(id)` `ON DELETE RESTRICT`) — heredado del `sale.branchId` al crear cuando `saleId` no es nulo; cuando `saleId` es nulo, heredado del `branchId` resuelto por branch scoping en el momento del registro (NO se acepta libre en el body salvo bypass, ver Requirement "Register account payment endpoint").
- `paymentMethodId` (FK a `payment_methods(id)` `ON DELETE RESTRICT`).
- `folioId` (FK a `folios(id)` `ON DELETE RESTRICT`), `folioNumber INT`, `folioCode TEXT` snapshot.
- `amount` `Decimal(14,4)` con CHECK `amount > 0`.
- `status` `VARCHAR(20)` con CHECK en `('completed','cancelled')`. Default `'completed'`.
- `notes` `TEXT NULL` (max 1000 chars desde la API).
- `createdAt`, `cancelledAt`, `cancellationReason TEXT NULL`.
- `UNIQUE (folio_id, folio_number)`.
- Índices: `(sale_id, status)`, `(customer_id, status)`, `(user_id, created_at)`, `(branch_id, created_at)`. El índice `(sale_id, status)` admite `sale_id IS NULL` sin cambios (Postgres indexa NULLs normalmente, simplemente no participan en lookups por `sale_id` específico).
- Un `CustomerPayment` OPCIONALMENTE tiene una o más filas `CustomerPaymentItem` (`customer_payment_id` FK `ON DELETE CASCADE`, `sale_item_id` FK a `sale_items(id)` `ON DELETE RESTRICT`, `amount Decimal(14,4)` con CHECK `amount > 0`) — el desglose de a qué línea de la venta se aplicó cada porción del abono. Solo aplica cuando `saleId` no es nulo; un abono a saldo general (`saleId=null`) NUNCA tiene `CustomerPaymentItem`. Un `CustomerPayment` SIN filas `CustomerPaymentItem` significa que el monto se aplicó al saldo global de la venta sin desglose por línea (comportamiento previo, sigue siendo válido).

#### Scenario: Snapshot folio sobrevive reset de folios

- **WHEN** un abono es creado con folio `RECIBO-0001`, y luego un admin desactiva ese `Folio`
- **THEN** `GET /api/v1/admin/payments/:id` sigue devolviendo `folioCode: "RECIBO-0001"`

#### Scenario: branchId heredado del sale

- **WHEN** un abono se registra para una `Sale` cuyo `branchId = B1`
- **THEN** el `customer_payments.branch_id` persiste como `B1` aunque el body no lo envíe

#### Scenario: Abono sin desglose por línea no crea CustomerPaymentItem

- **WHEN** un abono se registra sin el campo `items` en el body
- **THEN** no se crea ninguna fila `CustomerPaymentItem`, y el comportamiento es idéntico al de antes de este change

#### Scenario: Abono a saldo general persiste con saleId null

- **WHEN** se registra un abono vía `POST /api/v1/admin/customers/:id/payments`
- **THEN** la fila `customer_payments` resultante tiene `sale_id = NULL`, `customer_id` poblado, y ninguna fila `CustomerPaymentItem` asociada

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
5. **Si `saleId` no es nulo** (abono por venta): `UPDATE sales SET paid_amount = paid_amount - ?, payment_status = ? WHERE id=?` (recalcular: si `paid_amount - amount > 0` → `partial`; si `== 0` y la venta es a crédito → `pending`; nunca `paid` tras una cancelación).
6. **Si `saleId` es nulo** (abono a saldo general): el paso 5 SHALL omitirse por completo — ninguna `Sale` se consulta ni se muta.
7. `UPDATE customers SET current_balance = current_balance + ? WHERE id=?` — este paso aplica siempre, con o sin venta asociada.
8. Retornar HTTP 200 con el `PaymentDetailDto` actualizado (`sale: null` si `saleId` es nulo).

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

#### Scenario: Cancelar un abono a saldo general no toca ninguna venta

- **WHEN** un abono a saldo general (`saleId=null`) completado de `amount=200` se cancela
- **THEN** el sistema responde HTTP 200 con `status='cancelled'`, `sale: null` en la respuesta, `customer.currentBalance += 200`, y ninguna fila de `sales` se consulta ni se muta

#### Scenario: Cancelar dos veces un abono a saldo general

- **WHEN** un abono a saldo general ya cancelado se cancela de nuevo
- **THEN** el sistema responde HTTP 409 `{"error":"PaymentAlreadyCancelled"}`, igual que el flujo por venta

---

### Requirement: List payments endpoint

El sistema SHALL exponer `GET /api/v1/admin/payments` que devuelve listado paginado. Requires `payments:read`. Query params: `page` (default 1), `pageSize` (default 20, max 100), `saleId?` UUID, `customerId?` UUID, `userId?` UUID, `paymentMethodId?` UUID, `status?` (one or more of `completed,cancelled`, comma-separated), `from?` ISO date, `to?` ISO date, `branchId?` UUID.

Branch scoping: idéntico al patrón de `sales` (`resolveScopedBranchId`).

Response: `{ items: PaymentDto[], total, page, pageSize }`. Ordenado por `created_at DESC`.

`PaymentDto`: `id`, `saleId` (`string | null`), `saleFolioCode` (join, `string | null`), `customerId`, `customerName` (join), `userId`, `userName` (join), `branchId`, `branchName` (join), `paymentMethodId`, `paymentMethodCode` (join), `folioId`, `folioCode`, `folioNumber`, `amount` (string), `status`, `notes`, `createdAt`, `cancelledAt`, `cancellationReason`, `saleTotal` (`string | null`, monto total de la venta asociada; `null` si `saleId` es nulo), `salePaidAmount` (`string | null`), `salePaymentStatus` (`"paid" | "partial" | "pending" | null`), `saleDueAmount` (`string | null`, `saleTotal - salePaidAmount` cuando aplica). Los campos `sale*` SHALL ser `null` (nunca `""`, `0` o `"pending"` por default) cuando `saleId` es nulo.

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

#### Scenario: Abono a saldo general muestra campos de venta como null

- **WHEN** se lista un abono con `saleId=null`
- **THEN** el item incluye `saleId: null`, `saleFolioCode: null`, `saleTotal: null`, `salePaidAmount: null`, `salePaymentStatus: null`, `saleDueAmount: null` — nunca `""`, `0` ni `"pending"`

---

### Requirement: Get payment detail

El sistema SHALL exponer `GET /api/v1/admin/payments/:id`. Requires `payments:read`. Devuelve HTTP 404 si no existe. Branch scoping aplica.

`PaymentDetailDto` hereda todos los campos de `PaymentDto` (incluyendo `saleTotal`, `salePaidAmount`, `salePaymentStatus`, `saleDueAmount`, todos nullable cuando `saleId` es nulo) y añade el bloque `sale: { id, folioCode, folioNumber, total, paidAmount, paymentStatus } | null` — `null` cuando el abono es a saldo general.

#### Scenario: Detalle de abono existente

- **WHEN** un caller autorizado invoca `GET /payments/:id` con UUID válido
- **THEN** responde HTTP 200 con `PaymentDetailDto` (`PaymentDto` + desglose de venta + bloque `sale`)

#### Scenario: No encontrado

- **WHEN** el `:id` no matchea ningún abono
- **THEN** HTTP 404

#### Scenario: Detalle de abono a saldo general

- **WHEN** un caller autorizado invoca `GET /payments/:id` sobre un abono con `saleId=null`
- **THEN** responde HTTP 200 con `PaymentDetailDto` donde `sale: null` y todos los campos `sale*` del nivel `PaymentDto` son `null`

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
- `saleId?: string` UUID — filtra a una venta específica (cubre el "historial por ticket"). No matchea abonos a saldo general (`saleId=null`).
- `customerId?: string` UUID.
- `productId?: string` UUID — filtra abonos cuya venta incluye ese producto (JOIN `sales` → `sale_items`; `DISTINCT customer_payments.id`). Excluye automáticamente abonos a saldo general (no tienen venta a la que hacer join).
- `paymentMethodId?: string` UUID.
- `status?: string` (comma-separated `completed,cancelled`; default ambos).
- `from?: string` (ISO date YYYY-MM-DD; inclusive lower bound sobre `created_at`).
- `to?: string` (ISO date YYYY-MM-DD; inclusive upper bound).
- `branchId?: string` UUID (con branch scoping).
- `page?`, `pageSize?` (solo para `format=json`; `pageSize` default `50`, max `200`).

El `JOIN sales` interno usado para resolver `saleFolioCode`/`saleTotal`/`salePaidAmount`/`salePaymentStatus` SHALL ser un `LEFT JOIN` (antes `INNER JOIN`) para incluir abonos a saldo general en el historial; esos campos vienen `null` para esas filas.

Para `format=pdf` o `format=xlsx`: sin paginación, límite duro 10,000 filas compartido entre ambos formatos. Si excede → HTTP 409 `{"error":"ReportTooLarge","limit":10000}`.

Para `format=pdf`: el PDF SHALL generarse con `@react-pdf/renderer`, devuelto con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"` (fecha del `generatedAt` UTC). El contenido SHALL agrupar visualmente las filas por ticket (`saleId`): un bloque de encabezado por ticket (folio de venta, cliente, Monto total, Saldo) seguido de las filas de sus abonos, antes de la sección de totales globales. **Los abonos a saldo general (`saleId=null`) SHALL agruparse en una sección separada con encabezado literal "Abonos a saldo general (sin ticket)"**, nunca colapsados entre sí bajo una key `null` compartida ni mezclados con los grupos por ticket. El encabezado del PDF SHALL incluir el logo del negocio (tamaño reducido, junto al título), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` desde `TicketSettings` — mismo mecanismo de resolución y fallback que el logo (`public/logo.png` cuando no está configurado). Cuando dirección o RFC sean `null`, el encabezado SHALL omitir esa línea sin renderizar texto vacío. Los colores de tabla (encabezado, bordes, texto mutado) SHALL provenir de la paleta de marca compartida (`pdfTheme`), no de valores hex arbitrarios específicos de este módulo.

Para `format=xlsx`: el archivo SHALL generarse como workbook `.xlsx`, devuelto con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.xlsx"`. El contenido SHALL agrupar las filas por ticket con la misma estructura que el PDF (encabezado de ticket + filas de abonos + fila en blanco de separación), más la misma sección separada "Abonos a saldo general (sin ticket)", y una sección de totales globales al final de la hoja.

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

#### Scenario: PDF incluye logo del negocio
- **WHEN** un caller con `payments:report_read` solicita `?format=pdf`
- **THEN** el PDF generado incluye el logo del negocio (o el fallback por defecto) en el encabezado

#### Scenario: PDF usa colores de marca
- **WHEN** un caller con `payments:report_read` solicita `?format=pdf`
- **THEN** el color de fondo del encabezado de tabla del PDF corresponde a la paleta de marca compartida, no al azul `#1565C0` anterior

#### Scenario: PDF incluye dirección y RFC del negocio
- **WHEN** un caller con `payments:report_read` solicita `?format=pdf` y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el encabezado muestra ambos datos junto al logo, sin desplazar el agrupamiento por ticket ni la sección de totales

#### Scenario: Historial incluye abonos a saldo general en sección separada
- **WHEN** el historial filtrado incluye 2 abonos por venta (tickets distintos) y 1 abono a saldo general
- **THEN** el PDF/XLSX muestra 2 grupos por ticket y 1 sección adicional "Abonos a saldo general (sin ticket)" con esa fila, nunca mezclados

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

### Requirement: Register account payment endpoint

El sistema SHALL exponer `POST /api/v1/admin/customers/:id/payments` para registrar un abono "a saldo general" (sin ticket asociado) y `GET /api/v1/admin/customers/:id/payments` para obtener el preview de deuda del cliente que alimenta la UI. Ambos requieren `payments:create` (POST) / `payments:read` (GET).

**`GET /api/v1/admin/customers/:id/payments`** — Response:
```json
{
  "currentBalance": "500.0000",
  "pendingSales": [
    { "saleId": "...", "folioCode": "TK-002", "total": "300.0000", "paidAmount": "0.0000", "due": "300.0000", "createdAt": "..." }
  ],
  "accountDebt": "200.0000"
}
```
`pendingSales` SHALL incluir únicamente ventas del cliente con `status='completed'`, `paymentMethod.isCredit=true` y `total > paidAmount`, ordenadas por `createdAt ASC`. `accountDebt = currentBalance - SUM(pendingSales[].due)`, con un piso de `0` (nunca negativo). Branch scoping: idéntico al patrón de `sales` — sin `branches:access_all`, `pendingSales` se acota siempre a `x-user-branch-id`; con bypass, se acota a `?branchId=` si se provee, o incluye todas las sucursales del cliente si se omite.

**`POST /api/v1/admin/customers/:id/payments`** — Body:
- `paymentMethodId: string` (UUID de un payment method activo).
- `folioId: string` (UUID de un folio activo cuyo `scope='OPERATIONS'`, típicamente `code="RB"`).
- `amount: number` (decimal `> 0`; max 14 integer + 4 decimal digits).
- `notes?: string | null` (max 1000 chars).
- `branchId?: string | null` (UUID) — resuelto vía el mismo helper `resolveScopedBranchId` ya usado por el resto del módulo (`list`, `history`): sin bypass, un `branchId` ausente u omitido se fuerza siempre a `x-user-branch-id`; un `branchId` explícito que NO coincida con `x-user-branch-id` SHALL rechazarse con HTTP 403 `{"error":"Forbidden","required":"branches:access_all"}` (defensa en profundidad — nunca se "ignora" silenciosamente un valor distinto, se rechaza). Con bypass, `branchId` es obligatorio (el endpoint lo exige explícitamente porque la fila "a cuenta" necesita una sucursal concreta) — ausente → HTTP 400.

Flujo atómico (dentro de `prisma.$transaction`):

1. Cargar el `Customer`; si no existe → HTTP 404 `{"error":"CustomerNotFound"}`.
2. Resolver `branchId` efectivo vía `resolveScopedBranchId`: sin bypass → `x-user-branch-id` si el body lo omite o coincide, 403 si el body envía uno distinto; con bypass → `branchId` del body, obligatorio (400 si se omite).
3. Validar `paymentMethod.isActive` y `folio.isActive`; sino → HTTP 400 `{"error":"PaymentMethod inactive"}` / `{"error":"Folio inactive"}`.
4. Validar `folio.scope === 'OPERATIONS'`; sino → HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"<scope>"}`.
5. Guard atómico: `UPDATE customers SET current_balance = current_balance - :amount WHERE id = :customerId AND current_balance - :amount >= (SELECT COALESCE(SUM(s.total - s.paid_amount), 0) FROM sales s JOIN payment_methods pm ON pm.id = s.payment_method_id WHERE s.customer_id = :customerId AND s.status = 'completed' AND pm.is_credit = true AND s.total > s.paid_amount [AND s.branch_id = :branchId si no hay bypass o si bypass con branchId explícito])`. 0 filas afectadas → recalcular `accountDebt` real y HTTP 409 `{"error":"PaymentExceedsAccountDebt","due":"<accountDebt>"}`.
6. Alocar folio atómico (mismo `allocateFolio` compartido ya usado por `payments`/`quotes`/`pos`): `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. 0 filas → HTTP 400.
7. `INSERT INTO customer_payments (...)` con `sale_id = NULL`, `status='completed'`, `branch_id = <branchId efectivo>`, `user_id = x-user-id`, folio snapshoteado.
8. Retornar HTTP 201 con el `PaymentDetailDto` (`sale: null`).

El cálculo de `accountDebt` del paso 5 SHALL ser idéntico, fila por fila, al expuesto por el `GET` de este mismo Requirement — ambos consultan el mismo criterio de "ventas a crédito pendientes".

#### Scenario: Preview muestra ventas pendientes y deuda sin ticket

- **WHEN** un cajero con `payments:create` invoca `GET /api/v1/admin/customers/:id/payments` sobre un cliente con `currentBalance=500` y una venta a crédito pendiente de `300`
- **THEN** responde HTTP 200 con `pendingSales: [{..., "due":"300.0000"}]` y `accountDebt: "200.0000"`

#### Scenario: Abono a saldo general dentro del tope

- **WHEN** ese mismo cliente registra un abono a saldo general de `200` vía `POST /api/v1/admin/customers/:id/payments`
- **THEN** HTTP 201, se crea 1 `CustomerPayment` con `saleId=null`, `customer.currentBalance` queda en `300`, y la venta pendiente de `300` NO se modifica

#### Scenario: Abono a saldo general excede accountDebt

- **WHEN** ese cliente (con `accountDebt=200` tras el abono anterior, o `200` desde el inicio si no se ha abonado) intenta un abono a saldo general de `250`
- **THEN** HTTP 409 `{"error":"PaymentExceedsAccountDebt","due":"200.0000"}` y nada se persiste

#### Scenario: Toda la deuda es de tickets — accountDebt es cero

- **WHEN** un cliente tiene `currentBalance=300` que corresponde íntegramente a una venta a crédito pendiente de `300` (`accountDebt=0`)
- **THEN** cualquier intento de abono a saldo general (`amount > 0`) responde HTTP 409 `{"error":"PaymentExceedsAccountDebt","due":"0.0000"}` — esa deuda solo puede abonarse vía `POST /api/v1/admin/payments` con el `saleId` correspondiente

#### Scenario: Cliente no encontrado

- **WHEN** el `:id` de la ruta no corresponde a ningún `Customer`
- **THEN** HTTP 404 `{"error":"CustomerNotFound"}`

#### Scenario: Branch scoping sin bypass — branchId omitido se fuerza a x-user-branch-id

- **WHEN** un operator con `x-user-branch-id=B1` envía `POST /api/v1/admin/customers/:id/payments` sin `branchId` en el body
- **THEN** el sistema usa `B1` como `branchId` efectivo, y `pendingSales`/`accountDebt` se calculan solo sobre ventas de `B1`

#### Scenario: Branch scoping sin bypass — branchId del body no coincide con x-user-branch-id

- **WHEN** un operator con `x-user-branch-id=B1` envía `POST /api/v1/admin/customers/:id/payments` con `branchId=B2` en el body
- **THEN** el sistema responde HTTP 403 `{"error":"Forbidden","required":"branches:access_all"}` y nada se persiste

#### Scenario: Branch scoping con bypass sin branchId — rechazado

- **WHEN** un admin con `branches:access_all` envía `POST /api/v1/admin/customers/:id/payments` sin `branchId` en el body
- **THEN** el sistema responde HTTP 400 — la fila "a cuenta" necesita una sucursal concreta y no puede inferirse en modo "todas las sucursales"

#### Scenario: Branch scoping con bypass y sin branchId explícito

- **WHEN** un admin con `branches:access_all` invoca `GET /api/v1/admin/customers/:id/payments` sin `?branchId=`
- **THEN** `pendingSales` incluye ventas pendientes de TODAS las sucursales del cliente, y `accountDebt` se calcula sobre esa deuda consolidada

#### Scenario: Sin permiso payments:create

- **WHEN** un usuario sin `payments:create` intenta `POST /api/v1/admin/customers/:id/payments`
- **THEN** HTTP 403 `{"error":"Forbidden","required":"payments:create"}`

#### Scenario: Folio con scope incorrecto

- **WHEN** el `folioId` referencia un folio activo cuyo `scope !== 'OPERATIONS'`
- **THEN** HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"<scope>"}` y nada se persiste (no incrementa `current_number`, no muta `customer.currentBalance`)

