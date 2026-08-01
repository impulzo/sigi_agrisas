## ADDED Requirements

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
El corte SHALL incluir cuatro desgloses, cada fila con `ticketCount`, `subtotal`, `taxTotal`, `total`: `byPaymentMethod` (con nombre del método), `byCashier` (con nombre del cajero), `byBranch` (con nombre de sucursal) y `byDay` (una fila por día del rango). El split IVA/IEPS SHALL exponerse solo a nivel global (`totals.ivaTotal`/`iepsTotal`, agregados desde `sale_items`); los desgloses SHALL usar `taxTotal` combinado. `byDay` SHALL ordenarse ascendente por fecha; los demás descendente por `total`. (Traza: S1.)

#### Scenario: Desglose por método y por día
- **WHEN** el periodo tiene ventas con distintos métodos de pago en varios días
- **THEN** `byPaymentMethod` trae una fila por método (con nombre) y `byDay` una fila por día ordenada ascendente

#### Scenario: IVA/IEPS global
- **WHEN** el corte se genera
- **THEN** `totals.ivaTotal` y `totals.iepsTotal` reflejan la suma de impuestos de `sale_items` de las ventas activas del periodo

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
El endpoint SHALL aceptar `?format=json` (default) o `?format=pdf`. Con `pdf`, SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.pdf"` generado con `@react-pdf/renderer` (`SalesCutReportPdf`), incluyendo encabezado (periodo, sucursal, `generatedBy`), totales, neto de caja y desgloses. Un `format` distinto de `json`/`pdf` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf"}`. (Traza: S3.)

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf"}`

---

### Requirement: Branch scoping for sales cut
El endpoint SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, todas las consultas (ventas, abonos, devoluciones y los desgloses) SHALL limitarse a `branch_id = x-user-branch-id`, y `byBranch` SHALL traer solo esa sucursal. (Traza: S1/S2 Seguridad.)

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` genera el corte
- **THEN** todos los agregados se limitan a su sucursal y `byBranch` trae una sola fila

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el corte agrega ventas/abonos/devoluciones de todas las sucursales y `byBranch` trae una fila por sucursal
