# Spec: Inventory Kardex API

## Purpose

Endpoints de lectura y reconstrucción sobre el ledger `inventory_movements` (ver `inventory-movements`): consulta de kardex por artículo con encabezado y grilla cronológica, export a xlsx/pdf, y reconstrucción determinística de saldos por `(productId, branchId)` para reparar drift entre `branch_inventory.quantity` y la suma real del ledger.

---
## Requirements
### Requirement: RBAC permissions for kardex
El sistema SHALL definir el permiso `inventory:kardex_read` en `prisma/seed.ts`, otorgado idempotentemente a `admin`, `operator` y `viewer`. El endpoint de consulta SHALL exigirlo vía `requirePermission(req, "inventory:kardex_read", authz)`. El endpoint de reconstrucción SHALL exigir `inventory:write` (ya otorgado a `admin`/`operator`, no a `viewer`).

#### Scenario: Viewer puede leer kardex pero no reconstruir
- **WHEN** un usuario con rol `viewer` llama al endpoint de consulta
- **THEN** responde `200`
- **WHEN** el mismo usuario llama al endpoint de reconstrucción
- **THEN** responde `403`

#### Scenario: Sin identidad
- **WHEN** la request no propaga `x-user-id`
- **THEN** ambos endpoints responden `401`

---

### Requirement: Kardex report endpoint
El sistema SHALL exponer `GET /api/v1/admin/inventory/kardex` con query `productId` (uuid, obligatorio), `branchId` (uuid, opcional), `from`/`to` (`YYYY-MM-DD`, obligatorios), `format` (`json|pdf|xlsx`, default `json`). La respuesta JSON SHALL incluir `product{code,name,unit}`, `header{existenciaTotal,existenciaAlmacen,saldoAnterior,saldoFinal}` y `movements[]` ordenados cronológicamente (`movementAt` asc, desempate por `sequence`), cada uno con `movementType`, `entrada`, `salida`, `saldo`, `unit`, `factor`, `unitCost`, `unitPrice`, `folioCode`, `folioNumber`, `serie`, `customerId`, `providerId`, `originFolioCode`, `originFolioNumber`, `status`, `notes`.

#### Scenario: Kardex con movimientos
- **WHEN** un usuario con `inventory:kardex_read` consulta un producto con movimientos en el rango
- **THEN** responde `200` con `product`, `header` y `movements[]` ordenados cronológicamente

#### Scenario: Rango sin movimientos
- **WHEN** el rango no tiene movimientos
- **THEN** `movements=[]` y `header.saldoFinal === header.saldoAnterior`

#### Scenario: Producto inexistente
- **WHEN** `productId` no existe
- **THEN** responde `404`

#### Scenario: Rango inválido
- **WHEN** `from > to`
- **THEN** responde `400`

---

### Requirement: Branch scoping for kardex
El sistema SHALL aplicar `resolveScopedBranchId(req, branchId, authz)` en la consulta y `enforceBranchScope` en la reconstrucción. Sin `branches:access_all`, `branchId` SHALL forzarse a la sucursal del usuario aunque la request pida otra o ninguna ("todas"). Con `branchId` omitido y bypass, el header SHALL agregar todas las sucursales en scope.

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` consulta sin `branchId`
- **THEN** el resultado se limita a su sucursal

#### Scenario: Admin sin filtro de sucursal
- **WHEN** un usuario con `branches:access_all` consulta sin `branchId`
- **THEN** `header.existenciaAlmacen`, `saldoAnterior` y `saldoFinal` agregan todas las sucursales

---

### Requirement: Export formats
El endpoint SHALL aceptar `?format=xlsx` (200, `Content-Type` de spreadsheet, `Content-Disposition: attachment; filename="kardex-<code>-<from>_<to>.xlsx"`, una fila por movimiento) y `?format=pdf` (200 `application/pdf`, `Content-Disposition: attachment`, encabezado + tabla vía `@react-pdf/renderer`). El encabezado del PDF SHALL incluir el logo del negocio (tamaño reducido, junto al título), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto (`public/logo.png`) cuando no está configurado. Los colores de tabla (encabezado, bordes, texto mutado) SHALL provenir de la paleta de marca compartida (`pdfTheme`), no de valores hex arbitrarios específicos de este módulo. Un `format` fuera de `json|pdf|xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. Si el rango filtrado supera 10 000 movimientos, el sistema SHALL responder `409 {"error":"ReportTooLarge","tooLarge":true}` para cualquier formato.

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con el archivo xlsx adjunto

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` adjunto

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400`

#### Scenario: Reporte demasiado grande
- **WHEN** el rango filtrado tiene más de 10 000 movimientos
- **THEN** responde `409` con `tooLarge:true`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso solicita `?format=pdf`
- **THEN** el PDF generado incluye el logo del negocio (o el fallback por defecto) en el encabezado, sin alterar el layout de las tarjetas de resumen (existencia total/almacén/saldo anterior/saldo final)

#### Scenario: PDF usa colores de marca
- **WHEN** un usuario con permiso solicita `?format=pdf`
- **THEN** el color de fondo del encabezado de tabla del PDF corresponde a la paleta de marca compartida, no al azul `#1565C0` anterior

### Requirement: Rebuild article balances
El sistema SHALL exponer `POST /api/v1/admin/inventory/kardex/rebuild` con body `{productId, branchId}` (ambos obligatorios). El sistema SHALL releer todos los movimientos de ese par `(productId, branchId)` ordenados por `(movementAt, sequence)`, recalcular `balanceAfter` acumulado desde `0`, sobrescribir cada fila con el saldo correcto, y actualizar `branch_inventory.quantity` al saldo final recalculado — todo en una transacción. La operación SHALL ser determinística (repetirla sin movimientos nuevos produce el mismo resultado) y SHALL NO insertar movimientos nuevos. La respuesta SHALL incluir `movementsRebuilt`, `previousQuantity`, `newQuantity`.

#### Scenario: Reconstrucción corrige drift
- **WHEN** `branch_inventory.quantity` difiere de la suma real de movimientos
- **THEN** tras reconstruir, `branch_inventory.quantity` iguala el saldo final recalculado del ledger

#### Scenario: Sin movimientos
- **WHEN** no hay movimientos para el par `(productId, branchId)`
- **THEN** el saldo se fija en `0` y `movementsRebuilt=0`

#### Scenario: Reconstrucción idempotente
- **WHEN** se reconstruye dos veces seguidas sin movimientos nuevos entre medio
- **THEN** el resultado (`newQuantity`) es el mismo en ambas ejecuciones

