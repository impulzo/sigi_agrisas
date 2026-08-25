# sales-cut-api Specification

## Purpose
TBD - created by archiving change reporte-corte-ventas. Update Purpose after archive.
## Requirements
### Requirement: RBAC permission for sales cut report
El sistema SHALL definir el permiso `reports:sales_cut_read` en `prisma/seed.ts` y otorgarlo idempotentemente a los roles `admin`, `operator` y `viewer`. El endpoint de corte SHALL exigirlo vía `requirePermission(req, "reports:sales_cut_read", authz)`, respondiendo `401` cuando falta `x-user-id` y `403` cuando `authz.userCan` devuelve `false`. (Traza: S1/S2/S3 Seguridad.)

#### Scenario: Usuario sin permiso
- **WHEN** un usuario autenticado sin `reports:sales_cut_read` llama al endpoint de corte
- **THEN** el sistema responde `403`

#### Scenario: Sin identidad
- **WHEN** la request no propaga `x-user-id`
- **THEN** el sistema responde `401`

#### Scenario: Seed idempotente
- **WHEN** `npm run seed` corre dos veces
- **THEN** el permiso `reports:sales_cut_read` existe una sola vez y queda asignado a `admin`, `operator`, `viewer` sin duplicados

---

### Requirement: Sales cut report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/sales-cut` que devuelve el corte de ventas de un periodo. El endpoint SHALL delegar a `reportsController` y ejecutar `GetSalesCutReportUseCase`. El periodo SHALL calcularse por `createdAt`. Las ventas `completed` y `edited` SHALL sumar a los totales; las `cancelled` SHALL reportarse en un bloque `cancelled` separado que no suma al neto. La respuesta JSON SHALL incluir `totals` (`grossSales`, `ticketCount`, `subtotal`, `taxTotal`, `ivaTotal`, `iepsTotal`), `cancelled` (`count`, `total`), `cash`, y los desgloses `byPaymentMethod`, `byDay`, `byCashier`, `byBranch`. (Traza: S1.)

#### Scenario: Corte con ventas
- **WHEN** un usuario con `reports:sales_cut_read` llama `GET /api/v1/admin/reports/sales-cut` con un periodo con ventas
- **THEN** responde `200 application/json` con `totals`, `cancelled`, `cash` y los cuatro arrays de desglose

#### Scenario: Ventas canceladas aparte
- **WHEN** el periodo contiene ventas `cancelled`
- **THEN** aparecen en `cancelled` (`count`, `total`) y **no** se suman a `totals.grossSales` ni a `cash.netCash`

#### Scenario: Periodo vacío
- **WHEN** el periodo no tiene ventas
- **THEN** todos los montos y conteos son `0` y los arrays de desglose están vacíos

#### Scenario: Rango inválido
- **WHEN** `from > to`
- **THEN** el sistema responde `400`

---

### Requirement: Period preset and filters
El endpoint SHALL aceptar `?preset=today` (resuelto por el controller a `from = to = fecha UTC actual`) o `?from`/`?to` (`YYYY-MM-DD`). SHALL aceptar filtros opcionales `?branchId`, `?cashierId`, `?paymentMethodId` (UUID; `400` si inválidos) que acotan las consultas de ventas. (Traza: S1, S4.)

#### Scenario: Preset hoy
- **WHEN** la request trae `?preset=today`
- **THEN** el corte cubre el día UTC actual (`from = to = hoy`)

#### Scenario: Filtro por cajero
- **WHEN** se envía `?cashierId=<uuid>`
- **THEN** los totales y desgloses de ventas se acotan a ese cajero

#### Scenario: Filtro UUID inválido
- **WHEN** `?paymentMethodId` no es un UUID válido
- **THEN** el sistema responde `400`

---

### Requirement: Sales cut breakdowns
El corte SHALL incluir seis desgloses: `byPaymentMethod`, `byCashier`, `byBranch`, `byDay` (cada fila con `ticketCount`, `subtotal`, `taxTotal`, `total`), `byDepartment` (una fila por departamento con `key`, `label`, `ticketCount` [tickets distintos que incluyen ese departamento], `subtotal`, `taxTotal`, `total`) y `byProduct` (una fila por producto con `key`, `label`, `ticketCount`, `quantitySold` [suma de `sale_items.quantity`], `subtotal`, `taxTotal`, `total`). `byDepartment` y `byProduct` SHALL agregarse desde `sale_items` de ventas `completed`+`edited` del periodo/filtros aplicados — mismo criterio que los demás desgloses, sin restar devoluciones. El split IVA/IEPS SHALL exponerse solo a nivel global (`totals.ivaTotal`/`iepsTotal`, agregados desde `sale_items`); todos los desgloses SHALL usar `taxTotal` combinado. `byDay` SHALL ordenarse ascendente por fecha; los demás (incluidos `byDepartment` y `byProduct`) descendente por `total`, sin límite artificial de filas. (Traza: S1.)

#### Scenario: Desglose por método y por día
- **WHEN** el periodo tiene ventas con distintos métodos de pago en varios días
- **THEN** `byPaymentMethod` trae una fila por método (con nombre) y `byDay` una fila por día ordenada ascendente

#### Scenario: IVA/IEPS global
- **WHEN** el corte se genera
- **THEN** `totals.ivaTotal` y `totals.iepsTotal` reflejan la suma de impuestos de `sale_items` de las ventas activas del periodo

#### Scenario: Desglose por departamento
- **WHEN** el periodo tiene ventas de productos de distintos departamentos
- **THEN** `byDepartment` trae una fila por departamento (con nombre), ordenada descendente por `total`

#### Scenario: Desglose por producto con piezas
- **WHEN** el periodo tiene ventas de varios productos, incluyendo el mismo producto en múltiples líneas/tickets
- **THEN** `byProduct` trae una fila por producto (con nombre y código) con `quantitySold` sumando todas las líneas de ese producto, ordenada descendente por `total`

#### Scenario: Ventas canceladas no cuentan en los desgloses nuevos
- **WHEN** el periodo contiene ventas `cancelled`
- **THEN** esas ventas no se suman a `byDepartment` ni a `byProduct`

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** `byDepartment` y `byProduct` son arrays vacíos

---

### Requirement: Cash net composition
El corte SHALL calcular `cash.netCash = grossSales + paymentsReceived − returnsRefunded`, exponiendo los tres componentes. `paymentsReceived` SHALL ser `Σ customer_payments.amount` con `status='completed'` y `createdAt` en el periodo; `returnsRefunded` SHALL ser `Σ returns.refundTotal` con `status='completed'` y `returnedAt` en el periodo. Abonos y devoluciones `cancelled` SHALL NO contar. (Traza: S2.)

#### Scenario: Neto de caja con abonos y devoluciones
- **WHEN** el periodo tiene ventas activas, abonos `completed` y devoluciones `completed`
- **THEN** `cash.netCash` = `grossSales + paymentsReceived − returnsRefunded` y los tres componentes aparecen en `cash`

#### Scenario: Abonos y devoluciones cancelados
- **WHEN** existen abonos o devoluciones `cancelled` en el periodo
- **THEN** no se suman a `paymentsReceived` ni a `returnsRefunded`

---

### Requirement: PDF export and format selection
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.pdf"` generado con `@react-pdf/renderer` (`SalesCutReportPdf`), incluyendo encabezado (periodo, sucursal, `generatedBy`), totales, neto de caja, los desgloses y la tabla de detalle de tickets (`salesList`). Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.xlsx"` generado con la librería `xlsx` (SheetJS) vía `buildSalesCutWorkbook`, con una hoja por desglose (método, día, cajero, sucursal, departamento, producto) más una hoja de detalle de tickets. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. (Traza: S3.)

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el header SHALL omitir esa línea. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido, incluyendo la tabla de detalle de tickets

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook con una hoja por desglose más una hoja de detalle de tickets

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: PDF incluye dirección y RFC del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf` y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el header muestra ambos datos junto al logo, sin desplazar los totales, el neto de caja ni los desgloses

### Requirement: Sales cut ticket-level detail
La respuesta JSON del corte de ventas SHALL incluir `salesList`: un array con una fila por venta `completed`/`edited` del periodo/filtros aplicados (mismo criterio de estado y rango que el resto del corte), cada fila con `saleId`, `folioCode`, `customerName` (o `null` si la venta no tiene cliente asociado), `total` y `paymentMethodName`. `salesList` SHALL ordenarse descendente por fecha de la venta.

#### Scenario: Detalle de tickets del periodo
- **WHEN** el periodo tiene ventas activas de varios clientes y formas de pago
- **THEN** `salesList` trae una fila por venta con folio, cliente, importe y forma de pago

#### Scenario: Venta sin cliente asociado
- **WHEN** una venta del periodo no tiene `customerId`
- **THEN** su fila en `salesList` trae `customerName: null` en vez de omitir la fila

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** `salesList` es un array vacío

#### Scenario: Ventas canceladas no aparecen en el detalle
- **WHEN** el periodo contiene ventas `cancelled`
- **THEN** esas ventas no aparecen en `salesList`

---

### Requirement: Branch scoping for sales cut
El endpoint SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, todas las consultas (ventas, abonos, devoluciones y los desgloses) SHALL limitarse a `branch_id = x-user-branch-id`, y `byBranch` SHALL traer solo esa sucursal. (Traza: S1/S2 Seguridad.)

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` genera el corte
- **THEN** todos los agregados se limitan a su sucursal y `byBranch` trae una sola fila

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el corte agrega ventas/abonos/devoluciones de todas las sucursales y `byBranch` trae una fila por sucursal

