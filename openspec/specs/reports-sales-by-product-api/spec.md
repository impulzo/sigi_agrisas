# Spec: reports-sales-by-product-api

## Purpose

Expone un reporte de solo lectura con el detalle cruzado Departamento + Producto + Cliente de las ventas del periodo, para saber cuánto (en piezas y en dinero) compró cada cliente de cada producto.

---
## Requirements
### Requirement: RBAC permission for sales-by-product report
El sistema SHALL definir el permiso `reports:sales_by_product_read` en `prisma/seed.ts` y otorgarlo idempotentemente a los roles `admin`, `operator` y `viewer`. El endpoint SHALL exigirlo vía `requirePermission(req, "reports:sales_by_product_read", authz)`, respondiendo `401` cuando falta `x-user-id` y `403` cuando `authz.userCan` devuelve `false`.

#### Scenario: Usuario sin permiso
- **WHEN** un usuario autenticado sin `reports:sales_by_product_read` llama al endpoint
- **THEN** el sistema responde `403`

#### Scenario: Sin identidad
- **WHEN** la request no propaga `x-user-id`
- **THEN** el sistema responde `401`

#### Scenario: Seed idempotente
- **WHEN** `npm run seed` corre dos veces
- **THEN** el permiso `reports:sales_by_product_read` existe una sola vez y queda asignado a `admin`, `operator`, `viewer` sin duplicados

---

### Requirement: Sales-by-product report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/sales-by-product` que devuelve, para un periodo, una tabla de detalle `rows` — una fila por combinación única Departamento + Producto + Cliente, con `quantity` (SUM de piezas vendidas) y `total` (SUM de `line_total`, con IVA/IEPS incluido) — y una tarjeta de `totals` (ticketCount/subtotal/taxTotal/total, siempre presente). `rows` SHALL ordenarse por `total` descendente, con desempate alfabético por departamento, producto y cliente. El endpoint SHALL paginar `rows` con `?page` (default `1`) y `?pageSize` (default `20`, máx `100`), devolviendo también `rowsTotal` (número de combinaciones distintas que matchean el filtro, para paginación). El endpoint SHALL delegar a `reportsController` y ejecutar `GetSalesByProductReportUseCase`. Solo ventas con `status IN ('completed','edited')` del periodo/filtros SHALL sumar (mismo criterio que `sales-cut`). SHALL aceptar filtros opcionales `?branchId`, `?departmentId`, `?customerId` (UUID; `400` si inválidos) y `?from`/`?to` (`YYYY-MM-DD`).

#### Scenario: Reporte con ventas
- **WHEN** un usuario con permiso llama `GET /api/v1/admin/reports/sales-by-product` con un periodo con ventas
- **THEN** responde `200 application/json` con `totals`, `rows` (Departamento/Producto/Cliente/Cantidad/Monto) y `rowsTotal`

#### Scenario: Periodo vacío
- **WHEN** el periodo no tiene ventas
- **THEN** `totals` es cero, `rows` está vacío y `rowsTotal` es `0`

#### Scenario: Ventas canceladas no cuentan
- **WHEN** el periodo contiene ventas `cancelled`
- **THEN** esas ventas no se suman a `rows` ni a `totals`

#### Scenario: Filtro UUID inválido
- **WHEN** `?customerId` no es un UUID válido
- **THEN** el sistema responde `400`

#### Scenario: Paginación
- **WHEN** un usuario pide `?page=2&pageSize=20` con más de 20 combinaciones Departamento+Producto+Cliente en el periodo
- **THEN** responde con las filas 21–40 (ordenadas por `total` desc) y `rowsTotal` igual al conteo total de combinaciones

---

### Requirement: Sales-by-product export row limit
El endpoint SHALL aceptar `?format=pdf` o `?format=xlsx` para exportar, ignorando `?page`/`?pageSize` de la request y trayendo hasta el límite de export (mismo umbral que `payments/history`/`purchases`, 10 000 filas). Un dataset que exceda ese límite con `format=pdf` o `format=xlsx` SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`.

#### Scenario: Reporte demasiado grande
- **WHEN** el filtro devuelve más de 10 000 combinaciones Departamento+Producto+Cliente y `format=pdf` o `format=xlsx`
- **THEN** responde `409 {"error":"ReportTooLarge","limit":10000}`

---

### Requirement: Sales-by-product report PDF and Excel artifacts
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` generado con `@react-pdf/renderer`, incluyendo encabezado (periodo, filtros, `generatedBy`), `totals` y la tabla de detalle. Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`xlsx`/SheetJS) con una única hoja "Detalle" (Departamento/Producto/Cliente/Cantidad/Monto) más totales. Ambos formatos SHALL responder con `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`.

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el header SHALL omitir esa línea. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook con una hoja "Detalle"

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: PDF incluye dirección y RFC del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf` y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el header muestra ambos datos junto al logo, sin desplazar `totals` ni la tabla de detalle

### Requirement: Branch scoping for sales-by-product report
El endpoint SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, `rows` y `totals` SHALL limitarse a `branch_id = x-user-branch-id`.

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` genera el reporte
- **THEN** ventas y totales se limitan a su sucursal

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el reporte agrega ventas de todas las sucursales

