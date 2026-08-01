## ADDED Requirements

### Requirement: RBAC permission for cash cut report
El sistema SHALL definir el permiso `reports:cash_cut_read` en `prisma/seed.ts` y otorgarlo idempotentemente a los roles `admin`, `operator` y `viewer`. El endpoint de corte de caja SHALL exigirlo vía `requirePermission(req, "reports:cash_cut_read", authz)`, respondiendo `401` cuando falta `x-user-id` y `403` cuando `authz.userCan` devuelve `false`. (Traza: S5 Seguridad.)

#### Scenario: Usuario sin permiso
- **WHEN** un usuario autenticado sin `reports:cash_cut_read` llama al endpoint de corte de caja
- **THEN** el sistema responde `403`

#### Scenario: Sin identidad
- **WHEN** la request no propaga `x-user-id`
- **THEN** el sistema responde `401`

#### Scenario: Seed idempotente
- **WHEN** `npm run seed` corre dos veces
- **THEN** el permiso `reports:cash_cut_read` existe una sola vez y queda asignado a `admin`, `operator`, `viewer` sin duplicados

---

### Requirement: Cash cut report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/cash-cut` que devuelve el corte de caja (cobranza detallada) de un periodo. El endpoint SHALL delegar a `reportsController` y ejecutar `GetCashCutReportUseCase`. La fuente SHALL ser `customer_payments` con `status='completed'` y `createdAt` en el periodo, unida a `sales`, `customers` y `payment_methods`. La respuesta JSON SHALL incluir `rows` (una fila por abono), `totals` (`totalCollected`, `totalIva`) y `byPaymentMethod`. (Traza: S5.)

#### Scenario: Corte de caja con abonos
- **WHEN** un usuario con `reports:cash_cut_read` llama `GET /api/v1/admin/reports/cash-cut` con un periodo con abonos completados
- **THEN** responde `200 application/json` con `rows`, `totals` y `byPaymentMethod`

#### Scenario: Periodo vacío
- **WHEN** el periodo no tiene abonos `completed`
- **THEN** `rows` y `byPaymentMethod` están vacíos y `totals.totalCollected`/`totals.totalIva` son `0`

#### Scenario: Abonos cancelados no cuentan
- **WHEN** el periodo contiene abonos con `status='cancelled'`
- **THEN** no aparecen en `rows` ni se suman a `totals`

#### Scenario: Rango inválido
- **WHEN** `from > to`
- **THEN** el sistema responde `400`

---

### Requirement: Period and filters for cash cut
El endpoint SHALL requerir `?from`/`?to` (`YYYY-MM-DD`, obligatorios). SHALL aceptar filtros opcionales `?branchId`, `?customerId`, `?paymentMethodId` (UUID; `400` si inválidos) que acotan las filas devueltas. (Traza: S5.)

#### Scenario: Rango obligatorio
- **WHEN** la request no incluye `from` o `to`
- **THEN** el sistema responde `400`

#### Scenario: Filtro por cliente
- **WHEN** se envía `?customerId=<uuid>`
- **THEN** `rows` se acota a los abonos de ese cliente

#### Scenario: Filtro UUID inválido
- **WHEN** `?paymentMethodId` no es un UUID válido
- **THEN** el sistema responde `400`

---

### Requirement: Row composition and tax prorating
Cada fila del corte de caja SHALL incluir: `customerCode` (código del cliente), `docto` (`customer_payments.folioCode`), `factura` (`sale.folioCode` de la venta ligada), `customerName`, `facturaDate` (`sale.createdAt`), `days` (días transcurridos entre `facturaDate` y `collectedAt`), `amount` (`customer_payments.amount`), `paymentMethodCode`/`paymentMethodName`, `reference` (`customer_payments.notes`), `collectedAt` (`customer_payments.createdAt`), `ivaAmount` y `taxRatePct`. Como `customer_payments` no persiste IVA propio, `ivaAmount` e `taxRatePct` SHALL prorratearse desde la venta ligada: `ivaAmount = amount × (sale.taxTotal / sale.total)`, `taxRatePct = sale.taxTotal / sale.subtotal`. El redondeo SHALL usar banker's rounding a 4 decimales. (Traza: S5.)

#### Scenario: Días transcurridos
- **WHEN** una venta se factura el día X y su abono se cobra el día X+N
- **THEN** la fila correspondiente trae `days = N`

#### Scenario: IVA prorrateado en venta gravada
- **WHEN** el abono corresponde a una venta con `taxTotal > 0`
- **THEN** `ivaAmount` refleja la proporción del abono sobre el total de la venta y `taxRatePct` refleja la tasa efectiva de esa venta

#### Scenario: IVA prorrateado en venta con tasa 0%
- **WHEN** el abono corresponde a una venta con `taxTotal = 0`
- **THEN** `ivaAmount` y `taxRatePct` son `0`

---

### Requirement: Dynamic payment method breakdown
El corte de caja SHALL incluir `byPaymentMethod`: una fila de totalizador por cada `payment_method` realmente usado en las filas del periodo (agrupado por `paymentMethodId`), con su nombre real del catálogo, `count` y `total`. El sistema SHALL NO hardcodear categorías fijas de forma de pago (el catálogo `payment_methods` es administrable por el usuario). (Traza: S5.)

#### Scenario: Desglose dinámico
- **WHEN** el periodo tiene abonos con 3 formas de pago distintas del catálogo
- **THEN** `byPaymentMethod` trae exactamente 3 filas, una por cada forma de pago usada, con su nombre real

#### Scenario: Forma de pago sin uso en el periodo
- **WHEN** un `payment_method` existe en el catálogo pero no tiene abonos en el periodo
- **THEN** no aparece en `byPaymentMethod`

---

### Requirement: Export formats for cash cut
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` generado con `@react-pdf/renderer` (`CashCutReportPdf`), incluyendo encabezado (periodo, sucursal, `generatedBy`, fecha de emisión y numeración de página), la tabla de filas, los totales y el desglose por forma de pago. Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` generado con la librería `xlsx` (SheetJS) vía `buildCashCutWorkbook`, con las mismas 12 columnas de fila más filas de totales al final. Ambos formatos SHALL responder con `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. (Traza: S5.)

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook válido con las columnas de la historia más los totales

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

---

### Requirement: Branch scoping for cash cut
El endpoint SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, las filas SHALL limitarse a `branch_id = x-user-branch-id`. (Traza: S5 Seguridad.)

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` genera el corte de caja
- **THEN** todas las filas devueltas pertenecen a su sucursal

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el corte de caja agrega abonos de todas las sucursales
