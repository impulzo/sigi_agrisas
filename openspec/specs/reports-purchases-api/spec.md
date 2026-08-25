# Spec: reports-purchases-api

## Purpose

Expone endpoints de reportes de solo lectura sobre compras y pagos a proveedores, con filtros, branch scoping y export a PDF/Excel, sin acoplarse a los ports transaccionales del módulo `purchases`.

---
## Requirements
### Requirement: RBAC permission for purchases report
El sistema SHALL definir el permiso `reports:purchases_read` en `prisma/seed.ts` y otorgarlo idempotentemente a los roles `admin`, `operator` y `viewer`. Ambos endpoints (`purchases` y `purchases/provider-payments`) SHALL exigirlo vía `requirePermission(req, "reports:purchases_read", authz)`, respondiendo `401` cuando falta `x-user-id` y `403` cuando `authz.userCan` devuelve `false`.

#### Scenario: Usuario sin permiso
- **WHEN** un usuario autenticado sin `reports:purchases_read` llama a cualquiera de los dos endpoints
- **THEN** el sistema responde `403`

#### Scenario: Sin identidad
- **WHEN** la request no propaga `x-user-id`
- **THEN** el sistema responde `401`

#### Scenario: Seed idempotente
- **WHEN** `npm run seed` corre dos veces
- **THEN** el permiso `reports:purchases_read` existe una sola vez y queda asignado a `admin`, `operator`, `viewer` sin duplicados

---

### Requirement: Purchases report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/purchases` que devuelve un listado filtrado de compras (una fila por `Purchase`, no agregado). SHALL aceptar filtros opcionales `?branchId`, `?providerId` (UUID; `400` si inválidos), `?status` (`completed`\|`cancelled`) y `?from`/`?to` (`YYYY-MM-DD`, acotando `purchasedAt`). Cada fila SHALL incluir folio, proveedor, sucursal, subtotal, impuestos, total, `paidAmount`, `balance` (derivado como `total - paidAmount`, nunca negativo, formateado igual que el resto de campos monetarios), `paymentStatus` y fecha. SHALL aceptar `?format=json|pdf|xlsx` (default `json`). Un dataset que exceda el límite de filas para export (mismo umbral que `payments/history`, 10 000 filas) con `format=pdf` o `format=xlsx` SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`.

#### Scenario: Listado con filtros
- **WHEN** un usuario con permiso llama `GET /api/v1/admin/reports/purchases?providerId=<uuid>&from=2026-01-01&to=2026-01-31`
- **THEN** responde `200 application/json` con las compras de ese proveedor en el rango, con sus totales

#### Scenario: Sin resultados
- **WHEN** el filtro no matchea ninguna compra
- **THEN** responde `200` con un array vacío

#### Scenario: Filtro UUID inválido
- **WHEN** `?providerId` no es un UUID válido
- **THEN** el sistema responde `400`

#### Scenario: Reporte demasiado grande
- **WHEN** el filtro devuelve más de 10 000 compras y `format=pdf` o `format=xlsx`
- **THEN** responde `409 {"error":"ReportTooLarge","limit":10000}`

#### Scenario: Saldo pendiente de una compra a crédito parcialmente pagada
- **WHEN** una compra tiene `total=1000`, `paidAmount=400`
- **THEN** la fila incluye `balance` equivalente a `600`

#### Scenario: Saldo cero en compra liquidada o de contado
- **WHEN** una compra tiene `paymentStatus="paid"` (`total === paidAmount`, sea de contado o crédito ya liquidado)
- **THEN** la fila incluye `balance` equivalente a `0`

### Requirement: Provider payments report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/purchases/provider-payments` que devuelve un listado filtrado de pagos a proveedores (una fila por `ProviderPayment`). SHALL aceptar filtros opcionales `?branchId`, `?providerId` (UUID; `400` si inválidos), `?status` (`completed`\|`cancelled`) y `?from`/`?to` (acotando `paidAt`). Cada fila SHALL incluir folio del pago, folio de la compra ligada, proveedor, sucursal, monto, fecha de pago, y el saldo del proveedor al momento de la consulta: `providerInitialBalance` y `providerCurrentBalance` (leídos de `providers.initial_balance` y `providers.current_balance`). SHALL aceptar `?format=json|pdf|xlsx` (default `json`) con el mismo límite de 10 000 filas y respuesta `409 ReportTooLarge` que el endpoint de compras.

#### Scenario: Listado de pagos por proveedor
- **WHEN** un usuario con permiso llama `GET /api/v1/admin/reports/purchases/provider-payments?providerId=<uuid>`
- **THEN** responde `200 application/json` con los pagos a ese proveedor, incluyendo el folio de la compra ligada

#### Scenario: Filtro por estado
- **WHEN** se envía `?status=cancelled`
- **THEN** el listado solo incluye pagos cancelados

#### Scenario: Sin pagos en el periodo
- **WHEN** el filtro no matchea ningún pago
- **THEN** responde `200` con un array vacío

#### Scenario: Saldo del proveedor en cada fila
- **WHEN** un proveedor con `initialBalance = 2000` y `currentBalance = 4500` tiene pagos en el listado
- **THEN** cada fila de ese proveedor incluye `providerInitialBalance: 2000` y `providerCurrentBalance: 4500`

### Requirement: Purchases report PDF and Excel artifacts
Cuando `?format=pdf` en cualquiera de los dos endpoints, el sistema SHALL generar el PDF con `@react-pdf/renderer` incluyendo encabezado (título, periodo/filtros aplicados, `generatedBy`, fecha de emisión), la tabla de filas, totales agregados y numeración de página. Cuando `?format=xlsx`, SHALL devolver un workbook (`xlsx`/SheetJS) con una fila por registro y fila de totales al final, con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`.

El header del PDF (en ambos endpoints: compras y pagos a proveedores) SHALL incluir el logo del negocio (tamaño reducido), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el header SHALL omitir esa línea. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF de compras
- **WHEN** un usuario con permiso agrega `?format=pdf` al endpoint de compras
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel de pagos a proveedores
- **WHEN** un usuario con permiso agrega `?format=xlsx` al endpoint de pagos a proveedores
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook válido con las filas y los totales

#### Scenario: Formato inválido
- **WHEN** `?format=csv` en cualquiera de los dos endpoints
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf` en cualquiera de los dos endpoints
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: PDF incluye dirección y RFC del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf` en cualquiera de los dos endpoints y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el header muestra ambos datos junto al logo, sin desplazar la tabla de filas ni los totales

### Requirement: Branch scoping for purchases report
Ambos endpoints SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, el listado (compras o pagos a proveedores) SHALL limitarse a `branch_id = x-user-branch-id`.

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` llama cualquiera de los dos endpoints
- **THEN** el listado se limita a su sucursal, sin importar el `branchId` que envíe

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el listado incluye compras/pagos de todas las sucursales

