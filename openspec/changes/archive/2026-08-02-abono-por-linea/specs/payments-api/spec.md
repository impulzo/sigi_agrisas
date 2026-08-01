## MODIFIED Requirements

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

### Requirement: List payments by sale

El sistema SHALL exponer `GET /api/v1/admin/sales/:id/payments` que lista TODOS los abonos de una venta (incluye `cancelled`). Requires `payments:read`. Branch scoping vía el `sale.branchId`.

Response: `{ items: PaymentDto[], saleId, saleTotal, salePaidAmount, salePaymentStatus, saleDueAmount, lineBalances: Array<{ saleItemId, lineTotal, paidAmount, dueAmount }> }`. `saleDueAmount = saleTotal - salePaidAmount`. `lineBalances` incluye TODAS las líneas de la venta (tengan o no abonos por línea); `paidAmount` de cada línea es la suma de `CustomerPaymentItem.amount` de abonos `completed` para esa línea (`0` si nunca se abonó por línea); `dueAmount = lineTotal - paidAmount`. Sin paginación (una venta no tendrá miles de abonos).

#### Scenario: Listar abonos de venta

- **WHEN** una venta tiene 3 abonos (2 completed y 1 cancelled)
- **THEN** la respuesta los incluye TODOS, ordenados por `created_at ASC`, con los totales agregados

#### Scenario: lineBalances incluye líneas sin abono por línea

- **WHEN** una venta tiene 2 líneas y ningún abono usó `items` (desglose por línea)
- **THEN** `lineBalances` incluye ambas líneas con `paidAmount: 0` y `dueAmount = lineTotal`

#### Scenario: lineBalances refleja abonos por línea completados

- **WHEN** una línea A (`lineTotal=100`) recibió un abono por línea de `60` (completed)
- **THEN** `lineBalances` para A muestra `paidAmount: 60`, `dueAmount: 40`
