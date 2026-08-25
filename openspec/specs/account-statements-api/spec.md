# Spec: account-statements-api

## Purpose

Define el estado de cuenta de crédito por cliente, alojado en el módulo `reports` (`src/modules/reports/`): un resumen agregado multi-cliente y un libro mayor cronológico por cliente con saldo corrido, expuestos vía `GET /api/v1/admin/reports/account-statements` y `GET /api/v1/admin/reports/account-statements/:customerId`, con export JSON/PDF, RBAC, y branch scoping, reutilizando la infraestructura del módulo `reports`.

---
## Requirements
### Requirement: RBAC permission for account statements
El sistema SHALL definir el permiso `reports:account_statements_read` en `prisma/seed.ts` y otorgarlo idempotentemente a los roles `admin`, `operator` y `viewer`. Ambos endpoints de estado de cuenta SHALL exigirlo vía `requirePermission(req, "reports:account_statements_read", authz)`, respondiendo `401` cuando falta `x-user-id` y `403` cuando `authz.userCan` devuelve `false`.

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
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements` que devuelve, paginado, una fila por cliente con `customerId`, `customerCode`, `customerName`, `totalCharged`, `totalPaid`, `initialBalance`, `currentBalance`, `creditLimit`, `availableCredit`. El endpoint SHALL delegar a `reportsController` y ejecutar `GetAccountStatementsSummaryUseCase`. `pageSize` SHALL tener máximo 100. `currentBalance` SHALL leerse de `customers.current_balance` (fuente de verdad). `initialBalance` SHALL leerse de `customers.initial_balance`. `availableCredit` SHALL ser `null` cuando `creditLimit` es `null`, y `creditLimit − currentBalance` en otro caso.

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

#### Scenario: Saldo inicial en el resumen
- **WHEN** un cliente tiene `initialBalance = 1000` (deuda histórica capturada al migrar)
- **THEN** su fila del resumen incluye `initialBalance: 1000`, distinto de `currentBalance` si hubo movimientos posteriores

---

### Requirement: Account statement ledger endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements/:customerId` que devuelve el libro mayor cronológico de un cliente. El encabezado SHALL incluir `currentBalance`, `creditLimit`, `availableCredit`, `address` (domicilio del cliente, `null` si no tiene) y `lastInvoice` (serie + folio del último comprobante emitido: `{ serie, folioNumber }` o `null` si el cliente no tiene ventas). El cuerpo SHALL incluir `openingBalance`, `closingBalance`, `movements[]` y `groups[]`. Cada movimiento (en `movements[]` y dentro de `groups[]`) SHALL incluir `date`, `type` (`sale_credit` | `sale_cash` | `payment`), `folioCode`, `folioNumber`, `debit`, `credit`, `runningBalance`, `status`, y además los campos fiscales `serie` (= `folioCode`), `factura` (= `folioNumber`), `dueDate` (fecha de vencimiento; `null` para contado o ventas sin plazo), `reference` (referencia libre — de `customer_payments.notes` para abonos, `null` para ventas), y `paymentMethodCode` (forma de pago, ej. `TR`; de `payment_methods.code`). `groups[]` SHALL agrupar los mismos movimientos ya presentes en `movements[]` por venta: cada elemento tiene `sale` (el movimiento de tipo venta, o `null` para el grupo de abonos sin venta visible en el rango), `payments[]` (los abonos ligados a esa venta vía `customer_payments.sale_id`, ordenados cronológicamente) y `ticketBalance` (el `debit` de la venta menos la suma de `credit` de sus abonos, `"0.0000"` para ventas de contado o para el grupo sin venta). Los abonos cuyo `saleId` no corresponde a ninguna venta presente en `movements[]` (la venta cae fuera del rango consultado, folded en `openingBalance`) SHALL agruparse en un único grupo final con `sale: null`. `groups[]` SHALL ser puramente derivado de `movements[]` — no introduce movimientos nuevos ni altera `debit`/`credit`/`runningBalance` de ninguno. El `customerId` SHALL validarse como UUID (`400` si es inválido) y responder `404` si el cliente no existe.

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

#### Scenario: Venta a crédito con abonos agrupados
- **WHEN** un cliente tiene una venta a crédito con 2 abonos parciales ligados vía `customer_payments.sale_id`
- **THEN** `groups[]` contiene un elemento con `sale` igual a esa venta, `payments` con los 2 abonos (orden cronológico) y `ticketBalance` igual al `debit` de la venta menos la suma de `credit` de ambos abonos

#### Scenario: Abono sin venta visible en el rango
- **WHEN** se consulta con `?from=` y un abono del rango pertenece a una venta anterior a `from` (folded en `openingBalance`, ausente de `movements[]`)
- **THEN** ese abono aparece en un único grupo final de `groups[]` con `sale: null`, junto a cualquier otro abono en la misma situación

#### Scenario: Venta de contado sin abonos
- **WHEN** una venta de contado no tiene abonos ligados (los abonos son exclusivos de ventas a crédito)
- **THEN** aparece en `groups[]` como un grupo con `sale` poblado, `payments: []` y `ticketBalance: "0.0000"`

#### Scenario: groups[] no altera movements[] ni el saldo
- **WHEN** se compara la respuesta con y sin considerar `groups[]`
- **THEN** `movements[]`, `openingBalance`, `closingBalance` y `totals` son idénticos a como se calculaban antes de que existiera `groups[]`

---

### Requirement: Ledger history filter (General vs Histórico)
El endpoint de desglose SHALL aceptar `?history` (booleano). Con `history=false` (**General**), el sistema SHALL limitar los movimientos a las ventas a crédito con deuda viva (`payment_status != 'paid'`, no canceladas) y a los abonos asociados a esas ventas — es decir, solo las cuentas activas por cobrar. Con `history=true` (**Histórico**, valor por defecto), el sistema SHALL listar todos los movimientos (comportamiento vigente). El `openingBalance` y el `runningBalance` SHALL calcularse siempre sobre el universo completo cronológico; el filtro `history` solo acota qué filas se devuelven, sin alterar la aritmética del saldo.

#### Scenario: Vista General (solo deudas activas)
- **WHEN** se envía `?history=false` y el cliente tiene facturas de crédito liquidadas y otras pendientes
- **THEN** solo aparecen las ventas de crédito con `payment_status != 'paid'` (y sus abonos); las liquidadas y las de contado no se listan

#### Scenario: Vista Histórica (default)
- **WHEN** no se envía `history` (o `history=true`)
- **THEN** se listan todos los movimientos del cliente, igual que el comportamiento por defecto

---

### Requirement: Ledger sort order (Orden de Información)
El endpoint de desglose SHALL aceptar `?sort` con tres modos: `date` (default: Fecha → Factura → Serie), `invoice` (Factura → Serie → Fecha) y `serie` (Serie → Factura → Fecha). El `sort` SHALL reordenar la presentación tanto de `movements[]` como de `groups[]`; el `runningBalance` de cada movimiento SHALL conservar su valor cronológico calculado por `AccountLedgerBuilder` (no se recalcula por orden). Para `groups[]`, el criterio de orden se aplica a la venta (`group.sale`) de cada grupo — los abonos dentro de un grupo (`group.payments[]`) SHALL permanecer siempre en orden cronológico ascendente sin importar `sort`, y el grupo de abonos sin venta visible (`sale: null`) SHALL ubicarse siempre al final de `groups[]`, sin importar `sort`. Un `sort` distinto de los tres valores SHALL responder `400`.

#### Scenario: Orden por factura
- **WHEN** se envía `?sort=invoice`
- **THEN** los movimientos de `movements[]` se devuelven ordenados por `factura`, luego `serie`, luego `date`, conservando cada uno su `runningBalance` cronológico

#### Scenario: Orden inválido
- **WHEN** se envía `?sort=clave`
- **THEN** el sistema responde `400`

#### Scenario: Orden de grupos por factura o serie
- **WHEN** se envía `?sort=invoice` o `?sort=serie` y el cliente tiene varias ventas a crédito con abonos
- **THEN** `groups[]` se reordena por el folio de cada `group.sale` según el criterio elegido, pero los `payments[]` dentro de cada grupo mantienen su orden cronológico

#### Scenario: Grupo huérfano siempre al final
- **WHEN** existe un grupo con `sale: null` (abonos sin venta visible en el rango), sin importar el `?sort` elegido
- **THEN** ese grupo aparece como el último elemento de `groups[]`

---

### Requirement: Print anticipo receipt endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements/:customerId/payments/:paymentId/receipt?format=pdf` que genera el recibo imprimible de un anticipo/abono con `@react-pdf/renderer` (`AnticipoReceiptPdf`): folio del abono, cliente, monto, forma de pago, referencia/notas, fecha y `generatedBy`. Ambos IDs SHALL validarse como UUID (`400` si son inválidos). SHALL responder `404` si el abono no existe o no pertenece al `customerId`. SHALL exigir `reports:account_statements_read` y aplicar branch scoping. `format` distinto de `pdf` (default o único válido para este endpoint) SHALL responder `400`.

El recibo SHALL incluir el logo del negocio en el encabezado (tamaño normal, al ser un documento entregado al cliente), junto con la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el encabezado SHALL omitir esa línea sin renderizar texto vacío. El folio del abono y el bloque de cliente ya existentes en el cuerpo del recibo SHALL conservarse sin cambio. Los colores del recibo SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Recibo de anticipo
- **WHEN** un usuario con permiso pide el recibo de un abono existente del cliente con `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y el recibo del abono

#### Scenario: Abono ajeno al cliente
- **WHEN** el `paymentId` existe pero pertenece a otro cliente distinto de `:customerId`
- **THEN** el sistema responde `404`

#### Scenario: Recibo incluye logo del negocio
- **WHEN** un usuario con permiso pide el recibo con `?format=pdf`
- **THEN** el recibo incluye el logo del negocio (o el fallback por defecto) en el encabezado

#### Scenario: Recibo incluye dirección y RFC del negocio, y conserva el folio y el cliente
- **WHEN** un usuario con permiso pide el recibo con `?format=pdf` y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el encabezado muestra ambos datos junto al logo, y el recibo sigue mostrando el folio del abono y los datos del cliente exactamente como antes de este cambio

### Requirement: Opening balance and date range
El endpoint de desglose SHALL aceptar `?from` y `?to`. Con `from` presente, el sistema SHALL calcular `openingBalance` como `customer.initialBalance` más la suma de ventas a crédito vigentes menos abonos `completed` con fecha anterior a `from`, y el `runningBalance` SHALL arrancar en ese `openingBalance` listando solo los movimientos del rango. Sin `from`, `openingBalance` SHALL ser igual a `customer.initialBalance` (no `0` fijo) y se listan todos los movimientos desde el inicio.

#### Scenario: Rango con saldo inicial
- **WHEN** se envía `?from=2026-07-01&to=2026-07-31` y el cliente tenía saldo previo (incluyendo su `initialBalance`)
- **THEN** `openingBalance` refleja `initialBalance` más los movimientos de crédito previos al `from`, y el primer `runningBalance` del rango parte de ese valor

#### Scenario: Histórico completo con initialBalance en cero
- **WHEN** no se envía `from` y el cliente tiene `initialBalance = 0` (comportamiento por defecto para clientes sin deuda migrada)
- **THEN** `openingBalance` es `0` y se listan todos los movimientos desde el primero

#### Scenario: Histórico completo con deuda inicial capturada
- **WHEN** no se envía `from` y el cliente tiene `initialBalance = 1500` (deuda histórica capturada al migrar)
- **THEN** `openingBalance` es `1500` y el `runningBalance` del primer movimiento parte de esa base

### Requirement: Running balance domain service
El sistema SHALL calcular `runningBalance` en un servicio de dominio puro `AccountLedgerBuilder` sin I/O. Dado `movements[]` y `openingBalance`, SHALL ordenar por fecha ascendente (ventas antes que abonos en el mismo instante) y acumular `runningBalance = prev + debit − credit`, donde `debit` solo aplica a `sale_credit` no cancelado y `credit` solo a `payment` `completed`. El redondeo SHALL ser half-to-even (banker's) a 4 decimales, consistente con los `*TotalsCalculator`.

#### Scenario: Convergencia con current_balance
- **WHEN** se construye el libro completo (sin rango) de un cliente
- **THEN** el `closingBalance` final coincide con `customers.current_balance` del cliente

---

### Requirement: PDF export and format selection
Ambos endpoints SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, el sistema SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.pdf"`, generado con `@react-pdf/renderer` (`AccountStatementPdf`), incluyendo encabezado con cliente/rango/`generatedBy` y saldo inicial/final. Con `xlsx`, el sistema SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.xlsx"`, generado con la librería `xlsx` (SheetJS): el endpoint de resumen SHALL producir una fila por cliente con las mismas columnas de la tabla resumen (cliente, total cargado, total abonado, saldo, límite, disponible); el endpoint de libro mayor SHALL producir, por cada grupo de `groups[]`, una fila para la venta (si `sale` no es `null`) seguida inmediatamente por una fila por cada abono de `payments[]` y una fila de subtotal `"Saldo ticket"` con el `ticketBalance` del grupo — mismas columnas de movimiento ya existentes (Serie, Factura, Vencimiento, Referencia, F.Pgo, Cargo, Abono, Saldo, Estado) tanto para la fila de venta como para las de abono. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. Un desglose con más de 10 000 movimientos en formato `pdf` o `xlsx` SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`.

El header del PDF (ambos endpoints: resumen y libro mayor) SHALL incluir el logo del negocio (tamaño reducido), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el header SHALL omitir esa línea. El header del libro mayor SHALL conservar el nombre del cliente ya mostrado en su título (`"Estado de Cuenta — {customer.name}"`) sin cambio. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel del resumen
- **WHEN** un usuario con permiso agrega `?format=xlsx` al endpoint de resumen
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y una fila por cliente con las columnas de la tabla resumen

#### Scenario: Export Excel del libro mayor agrupado por ticket
- **WHEN** un usuario con permiso agrega `?format=xlsx` al endpoint de libro mayor para un cliente con ventas a crédito y abonos
- **THEN** responde `200` con `Content-Type` de `.xlsx`, y el workbook tiene la fila de cada venta seguida de las filas de sus abonos y una fila de subtotal "Saldo ticket" por grupo, en vez de una lista plana intercalada cronológicamente

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: Reporte demasiado grande
- **WHEN** el desglose supera 10 000 movimientos y `format=pdf` o `format=xlsx`
- **THEN** responde `409 {"error":"ReportTooLarge","limit":10000}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf` en cualquiera de los dos endpoints
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: PDF incluye dirección y RFC del negocio, libro mayor conserva el nombre del cliente
- **WHEN** un usuario con permiso agrega `?format=pdf` al endpoint de libro mayor de un cliente, y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el header muestra ambos datos junto al logo, y el título del documento sigue mostrando el nombre del cliente sin cambio

### Requirement: Branch scoping for account statements
Ambos endpoints SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, las agregaciones y el libro mayor SHALL limitarse a `branch_id = x-user-branch-id`, incluyendo la consulta de `openingBalance`. Un usuario sin bypass SHALL NO ver movimientos de sucursales fuera de su scope.

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` pide el desglose de un cliente con movimientos en varias sucursales
- **THEN** solo se devuelven los movimientos de su sucursal y el `openingBalance` se calcula sobre esa misma sucursal

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el resumen/desglose agrega los movimientos de todas las sucursales

