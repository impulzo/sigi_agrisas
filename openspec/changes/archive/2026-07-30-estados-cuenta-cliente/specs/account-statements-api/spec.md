## ADDED Requirements

### Requirement: RBAC permission for account statements
El sistema SHALL definir el permiso `reports:account_statements_read` en `prisma/seed.ts` y otorgarlo idempotentemente a los roles `admin`, `operator` y `viewer`. Ambos endpoints de estado de cuenta SHALL exigirlo vía `requirePermission(req, "reports:account_statements_read", authz)`, respondiendo `401` cuando falta `x-user-id` y `403` cuando `authz.userCan` devuelve `false`. (Traza: S1/S2/S3 Criterios de Seguridad.)

#### Scenario: Usuario sin permiso
- **WHEN** un usuario autenticado sin `reports:account_statements_read` llama a cualquiera de los endpoints de estado de cuenta
- **THEN** el sistema responde `403`

#### Scenario: Sin identidad
- **WHEN** la request no propaga `x-user-id`
- **THEN** el sistema responde `401`

#### Scenario: Seed idempotente
- **WHEN** `npm run seed` corre dos veces
- **THEN** el permiso `reports:account_statements_read` existe una sola vez y queda asignado a `admin`, `operator`, `viewer` sin duplicados

---

### Requirement: Account statement summary endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements` que devuelve, paginado, una fila por cliente con `customerId`, `customerCode`, `customerName`, `totalCharged`, `totalPaid`, `currentBalance`, `creditLimit`, `availableCredit`. El endpoint SHALL delegar a `reportsController` y ejecutar `GetAccountStatementsSummaryUseCase`. `pageSize` SHALL tener máximo 100. `currentBalance` SHALL leerse de `customers.current_balance` (fuente de verdad). `availableCredit` SHALL ser `null` cuando `creditLimit` es `null`, y `creditLimit − currentBalance` en otro caso. (Traza: S1.)

#### Scenario: Resumen con movimientos
- **WHEN** un usuario con `reports:account_statements_read` llama `GET /api/v1/admin/reports/account-statements`
- **THEN** responde `200 application/json` con `items[]` (una fila por cliente con los campos agregados) más `total`, `page`, `pageSize`

#### Scenario: Filtro solo con saldo
- **WHEN** se envía `?onlyWithBalance=true`
- **THEN** solo aparecen clientes con `currentBalance` distinto de `0`

#### Scenario: Cliente sin movimientos de crédito
- **WHEN** un cliente sin ventas a crédito ni abonos aparece en el resultado
- **THEN** sus `totalCharged` y `totalPaid` son `0` y `availableCredit` es igual a `creditLimit`

#### Scenario: Límite de crédito nulo
- **WHEN** un cliente tiene `creditLimit = null`
- **THEN** su `availableCredit` es `null`

---

### Requirement: Account statement ledger endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements/:customerId` que devuelve el libro mayor cronológico de un cliente. El encabezado SHALL incluir `currentBalance`, `creditLimit`, `availableCredit`, **`address`** (domicilio del cliente, `null` si no tiene) y **`lastInvoice`** (serie + folio del último comprobante emitido: `{ serie, folioNumber }` o `null` si el cliente no tiene ventas). El cuerpo SHALL incluir `openingBalance`, `closingBalance` y `movements[]`. Cada movimiento SHALL incluir `date`, `type` (`sale_credit` | `sale_cash` | `payment`), `folioCode`, `folioNumber`, `debit`, `credit`, `runningBalance`, `status`, y además los campos fiscales **`serie`** (= `folioCode`), **`factura`** (= `folioNumber`), **`dueDate`** (fecha de vencimiento; `null` para contado o ventas sin plazo), **`reference`** (referencia libre — de `customer_payments.notes` para abonos, `null` para ventas), y **`paymentMethodCode`** (forma de pago, ej. `TR`; de `payment_methods.code`). El `customerId` SHALL validarse como UUID (`400` si es inválido) y responder `404` si el cliente no existe. (Traza: S2 + user story legacy: Dirección, Última Factura, Ser, Factura, Vencimiento, Referencia, F.Pgo.)

> Descartado del legacy: columna `Clave` (concepto contable — no existe modelo de conceptos) y columna `Doc` (redundante con `serie`).

#### Scenario: Desglose cronológico
- **WHEN** un usuario con permiso pide el desglose de un cliente con ventas y abonos
- **THEN** responde `200` con `movements[]` ordenados por fecha ascendente, cada uno con su `type`, `debit`/`credit` y `runningBalance`

#### Scenario: El contado no mueve el saldo
- **WHEN** el cliente tiene ventas de contado (`payment_method.is_credit = false`) y de crédito
- **THEN** ambas aparecen marcadas por `type`, pero solo las de crédito (y los abonos) alteran `runningBalance`; las de contado tienen `debit=0`, `credit=0`

#### Scenario: Movimientos cancelados no afectan el saldo
- **WHEN** existen ventas o abonos con estado `cancelled`
- **THEN** aparecen con `status='cancelled'`, `debit=0`, `credit=0` y no alteran `runningBalance`

#### Scenario: Cliente inexistente
- **WHEN** el `customerId` es un UUID válido que no corresponde a ningún cliente
- **THEN** el sistema responde `404`

#### Scenario: Campos fiscales y encabezado
- **WHEN** un usuario con permiso pide el desglose de un cliente con dirección, ventas a crédito con vencimiento y abonos con nota y forma de pago
- **THEN** el encabezado incluye `address` y `lastInvoice` (`{serie, folioNumber}`), y cada movimiento incluye `serie`, `factura`, `dueDate`, `reference` y `paymentMethodCode` (las ventas de contado o sin plazo devuelven `dueDate=null`; las ventas devuelven `reference=null`)

---

### Requirement: Ledger history filter (General vs Histórico)
El endpoint de desglose SHALL aceptar `?history` (booleano). Con `history=false` (**General**), el sistema SHALL limitar los movimientos a las ventas a crédito con deuda viva (`payment_status != 'paid'`, no canceladas) y a los abonos asociados a esas ventas — es decir, solo las cuentas activas por cobrar. Con `history=true` (**Histórico**, valor por defecto), el sistema SHALL listar todos los movimientos (comportamiento vigente). El `openingBalance` y el `runningBalance` SHALL calcularse siempre sobre el universo completo cronológico; el filtro `history` solo acota qué filas se devuelven, sin alterar la aritmética del saldo. (Traza: user story legacy — checkbox "Mostrar Histórico".)

#### Scenario: Vista General (solo deudas activas)
- **WHEN** se envía `?history=false` y el cliente tiene facturas de crédito liquidadas y otras pendientes
- **THEN** solo aparecen las ventas de crédito con `payment_status != 'paid'` (y sus abonos); las liquidadas y las de contado no se listan

#### Scenario: Vista Histórica (default)
- **WHEN** no se envía `history` (o `history=true`)
- **THEN** se listan todos los movimientos del cliente, igual que el comportamiento por defecto

---

### Requirement: Ledger sort order (Orden de Información)
El endpoint de desglose SHALL aceptar `?sort` con tres modos: `date` (default: Fecha → Factura → Serie), `invoice` (Factura → Serie → Fecha) y `serie` (Serie → Factura → Fecha). El `sort` SHALL reordenar únicamente la presentación de `movements[]`; el `runningBalance` de cada movimiento SHALL conservar su valor cronológico calculado por `AccountLedgerBuilder` (no se recalcula por orden). Un `sort` distinto de los tres valores SHALL responder `400`. (Traza: user story legacy — "Orden de Información"; los modos legacy con `Clave`/`Doc` se remapean a las columnas disponibles Fecha/Factura/Serie.)

#### Scenario: Orden por factura
- **WHEN** se envía `?sort=invoice`
- **THEN** los movimientos se devuelven ordenados por `factura`, luego `serie`, luego `date`, conservando cada uno su `runningBalance` cronológico

#### Scenario: Orden inválido
- **WHEN** se envía `?sort=clave`
- **THEN** el sistema responde `400`

---

### Requirement: Print anticipo receipt endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements/:customerId/payments/:paymentId/receipt?format=pdf` que genera el recibo imprimible de un anticipo/abono con `@react-pdf/renderer` (`AnticipoReceiptPdf`): folio del abono, cliente, monto, forma de pago, referencia/notas, fecha y `generatedBy`. Ambos IDs SHALL validarse como UUID (`400` si son inválidos). SHALL responder `404` si el abono no existe o no pertenece al `customerId`. SHALL exigir `reports:account_statements_read` y aplicar branch scoping. `format` distinto de `pdf` (default o único válido para este endpoint) SHALL responder `400`. (Traza: user story legacy — botón "Imprimir Anticipo".)

#### Scenario: Recibo de anticipo
- **WHEN** un usuario con permiso pide el recibo de un abono existente del cliente con `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y el recibo del abono

#### Scenario: Abono ajeno al cliente
- **WHEN** el `paymentId` existe pero pertenece a otro cliente distinto de `:customerId`
- **THEN** el sistema responde `404`

---

### Requirement: Opening balance and date range
El endpoint de desglose SHALL aceptar `?from` y `?to`. Con `from` presente, el sistema SHALL calcular `openingBalance` como la suma de ventas a crédito vigentes menos abonos `completed` con fecha anterior a `from`, y el `runningBalance` SHALL arrancar en ese `openingBalance` listando solo los movimientos del rango. Sin `from`, `openingBalance` SHALL ser `0` y se listan todos los movimientos desde el inicio. (Traza: S2 — período.)

#### Scenario: Rango con saldo inicial
- **WHEN** se envía `?from=2026-07-01&to=2026-07-31` y el cliente tenía saldo previo
- **THEN** `openingBalance` refleja los movimientos de crédito previos al `from` y el primer `runningBalance` del rango parte de ese valor

#### Scenario: Histórico completo
- **WHEN** no se envía `from`
- **THEN** `openingBalance` es `0` y se listan todos los movimientos desde el primero

---

### Requirement: Running balance domain service
El sistema SHALL calcular `runningBalance` en un servicio de dominio puro `AccountLedgerBuilder` sin I/O. Dado `movements[]` y `openingBalance`, SHALL ordenar por fecha ascendente (ventas antes que abonos en el mismo instante) y acumular `runningBalance = prev + debit − credit`, donde `debit` solo aplica a `sale_credit` no cancelado y `credit` solo a `payment` `completed`. El redondeo SHALL ser half-to-even (banker's) a 4 decimales, consistente con los `*TotalsCalculator`. (Traza: S2 — Criterios de Aceptación.)

#### Scenario: Convergencia con current_balance
- **WHEN** se construye el libro completo (sin rango) de un cliente
- **THEN** el `closingBalance` final coincide con `customers.current_balance` del cliente

---

### Requirement: PDF export and format selection
Ambos endpoints SHALL aceptar `?format=json` (default) o `?format=pdf`. Con `pdf`, el sistema SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.pdf"`, generado con `@react-pdf/renderer` (`AccountStatementPdf`), incluyendo encabezado con cliente/rango/`generatedBy` y saldo inicial/final. Un `format` distinto de `json`/`pdf` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf"}`. Un desglose con más de 10 000 movimientos en formato PDF SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`. (Traza: S3.)

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf"}`

#### Scenario: Reporte demasiado grande
- **WHEN** el desglose supera 10 000 movimientos y `format=pdf`
- **THEN** responde `409` con `{"error":"ReportTooLarge","limit":10000}`

---

### Requirement: Branch scoping for account statements
Ambos endpoints SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, las agregaciones y el libro mayor SHALL limitarse a `branch_id = x-user-branch-id`, incluyendo la consulta de `openingBalance`. Un usuario sin bypass SHALL NO ver movimientos de sucursales fuera de su scope. (Traza: S1/S2 — Criterios de Seguridad.)

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` pide el desglose de un cliente con movimientos en varias sucursales
- **THEN** solo se devuelven los movimientos de su sucursal y el `openingBalance` se calcula sobre esa misma sucursal

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el resumen/desglose agrega los movimientos de todas las sucursales
