## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Seeded RECIBO folio

**Reason**: El folio `RECIBO` se reemplaza por `RB` como parte del catálogo canónico de 8 folios (`TK`, `TC`, `RB`, `COT`, `DEV`, `TS`, `AB`, `CP`). La gestión del folio default de abonos pasa del seed RBAC (`prisma/seed.ts`) al nuevo seed dedicado de folios (`prisma/seeds/folios.ts`).

**Migration**: Tras desplegar la migración `add_folios_scope_column`, ejecutar `npm run seed:folios`. El nuevo seed:

1. Borra el folio `RECIBO` si no tiene `customer_payments` referenciados.
2. Si `RECIBO` está referenciado por abonos existentes, el seed aborta con mensaje claro. El operador debe ejecutar manualmente: `UPDATE folios SET code='RB', prefix='RB-', name='Recibo de Pago - Cobranza', scope='OPERATIONS' WHERE code='RECIBO'` (esto preserva `current_number` y todas las referencias) y luego re-correr `npm run seed:folios`.
3. Upserta el folio canónico `RB` con `scope='OPERATIONS'`, `prefix='RB-'`, `name='Recibo de Pago - Cobranza'`.

El FE de Abonos (`RegisterPaymentModal.tsx`) actualiza su default de `code === 'RECIBO'` a `code === 'RB'` en el mismo PR.

---

## MODIFIED Requirements

### Requirement: Register payment endpoint

El sistema SHALL exponer `POST /api/v1/admin/payments` para registrar un abono. Requires `payments:create`. Body:

- `saleId: string` (UUID de una venta `completed` cuyo `paymentMethod.isCredit === true`).
- `paymentMethodId: string` (UUID de un payment method activo — el método con el que el cliente está pagando este abono específico; PUEDE o NO ser un método con `isCredit=true`. Típicamente es un método NO crédito como `EFECTIVO` o `TRANSFERENCIA`, porque un abono es un cobro real).
- `folioId: string` (UUID de un folio activo cuyo `scope='OPERATIONS'`, típicamente `code="RB"`).
- `amount: number` (decimal `> 0`; max 14 integer + 4 decimal digits).
- `notes?: string | null` (max 1000 chars).

Flujo atómico (dentro de `prisma.$transaction`):

1. Cargar la `Sale` con `include: { paymentMethod: true }`; si no existe → HTTP 404.
2. Validar `sale.status === 'completed'`; sino → HTTP 409 `{"error":"SaleNotPayable","status":"<actual>"}`.
3. Validar `sale.paymentMethod.isCredit === true`; sino → HTTP 409 `{"error":"SaleNotPayable","reason":"not_credit"}`. (Una venta pagada al momento — con un `paymentMethod` que NO es crédito — no admite abonos posteriores.)
4. Aplicar branch scoping: si el caller no tiene `branches:access_all` y `sale.branchId !== x-user-branch-id` → HTTP 403.
5. Validar `paymentMethod.isActive` y `folio.isActive`; sino → HTTP 400.
6. Validar `folio.scope === 'OPERATIONS'`; sino → HTTP 400 `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"<scope>"}`.
7. Validar `amount > 0` (Zod) y `amount <= sale.total - sale.paidAmount`; sino → HTTP 409 `{"error":"PaymentExceedsDueAmount","due": "<remaining>"}`.
8. Alocar folio atómico: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. 0 filas → HTTP 400.
9. `UPDATE sales SET paid_amount = paid_amount + ?, payment_status = ? WHERE id = ?` (el nuevo `payment_status` se calcula al vuelo: `paid` si `paid_amount + amount >= total`; sino `partial`).
10. `UPDATE customers SET current_balance = current_balance - ? WHERE id = ?` (sale.customerId).
11. `INSERT INTO customer_payments (...)` con `status='completed'`, `branch_id = sale.branchId`, `user_id = x-user-id`, folio snapshoteado.
12. Retornar HTTP 201 con el `PaymentDetailDto`.

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
