# Spec: reports-sales-by-product-api

## Purpose

Expone un reporte de solo lectura que cruza ventas del periodo contra el stock actual del catálogo, agrupable por cliente, departamento o producto, para decisiones de reabasto.

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
El sistema SHALL exponer `GET /api/v1/admin/reports/sales-by-product` que devuelve, para un periodo, tres desgloses agrupables — `byCustomer`, `byDepartment`, `byProduct` — y una tarjeta de `totals` (siempre presente sin importar el modo de agrupación seleccionado en la UI; los tres arrays SHALL calcularse y devolverse simultáneamente en la misma respuesta). El endpoint SHALL delegar a `reportsController` y ejecutar `GetSalesByProductReportUseCase`. Solo ventas con `status IN ('completed','edited')` del periodo/filtros SHALL sumar (mismo criterio que `sales-cut`). SHALL aceptar filtros opcionales `?branchId`, `?departmentId`, `?customerId` (UUID; `400` si inválidos) y `?from`/`?to` (`YYYY-MM-DD`).

#### Scenario: Reporte con ventas
- **WHEN** un usuario con permiso llama `GET /api/v1/admin/reports/sales-by-product` con un periodo con ventas
- **THEN** responde `200 application/json` con `totals`, `byCustomer`, `byDepartment` y `byProduct`

#### Scenario: Periodo vacío
- **WHEN** el periodo no tiene ventas
- **THEN** `totals` es cero y los tres arrays están vacíos

#### Scenario: Ventas canceladas no cuentan
- **WHEN** el periodo contiene ventas `cancelled`
- **THEN** esas ventas no se suman a ninguno de los tres desgloses ni a `totals`

#### Scenario: Filtro UUID inválido
- **WHEN** `?customerId` no es un UUID válido
- **THEN** el sistema responde `400`

---

### Requirement: Inventory cross-reference (stock vs sales)
Cada fila de `byProduct` SHALL incluir, además de `quantitySold` (piezas vendidas del periodo), el stock actual (`currentStock`) desde `branch_inventory` para ese producto — acotado a la sucursal del filtro cuando aplique, o sumado entre sucursales visibles para el usuario cuando no se filtra por sucursal.

#### Scenario: Cruce inventario-ventas
- **WHEN** el reporte agrupa por producto y ese producto tiene stock registrado en `branch_inventory`
- **THEN** la fila de ese producto incluye tanto `quantitySold` como `currentStock`

#### Scenario: Producto sin registro de inventario
- **WHEN** un producto vendido no tiene fila en `branch_inventory` para la sucursal filtrada
- **THEN** `currentStock` se reporta como `0`, sin omitir la fila del producto

---

### Requirement: Sales-by-product report PDF and Excel artifacts
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` generado con `@react-pdf/renderer`, incluyendo encabezado (periodo, filtros, `generatedBy`), `totals` y los tres desgloses. Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`xlsx`/SheetJS) con una hoja por desglose (Cliente, Departamento, Producto) más totales. Ambos formatos SHALL responder con `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`.

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook con hojas por Cliente/Departamento/Producto

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

---

### Requirement: Branch scoping for sales-by-product report
El endpoint SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, los tres desgloses y `totals` SHALL limitarse a `branch_id = x-user-branch-id`, incluyendo el cruce de `currentStock`.

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` genera el reporte
- **THEN** ventas, stock y totales se limitan a su sucursal

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el reporte agrega ventas y stock de todas las sucursales
