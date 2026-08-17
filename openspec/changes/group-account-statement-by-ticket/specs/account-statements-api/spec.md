## MODIFIED Requirements

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

### Requirement: PDF export and format selection
Ambos endpoints SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, el sistema SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.pdf"`, generado con `@react-pdf/renderer` (`AccountStatementPdf`), incluyendo encabezado con cliente/rango/`generatedBy` y saldo inicial/final. Con `xlsx`, el sistema SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.xlsx"`, generado con la librería `xlsx` (SheetJS): el endpoint de resumen SHALL producir una fila por cliente con las mismas columnas de la tabla resumen (cliente, total cargado, total abonado, saldo, límite, disponible); el endpoint de libro mayor SHALL producir, por cada grupo de `groups[]`, una fila para la venta (si `sale` no es `null`) seguida inmediatamente por una fila por cada abono de `payments[]` y una fila de subtotal `"Saldo ticket"` con el `ticketBalance` del grupo — mismas columnas de movimiento ya existentes (Serie, Factura, Vencimiento, Referencia, F.Pgo, Cargo, Abono, Saldo, Estado) tanto para la fila de venta como para las de abono. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. Un desglose con más de 10 000 movimientos en formato `pdf` o `xlsx` SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`.

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
