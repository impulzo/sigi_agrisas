# Spec: reports-collections-api

## Purpose

Expone un reporte de cobranza de solo lectura agrupable por cliente y por ticket abonado, separado e independiente del reporte de Corte de Caja (`cash-cut`) ya existente.

---
## Requirements
### Requirement: RBAC permission for customer collections report
El sistema SHALL definir el permiso `reports:customer_collections_read` en `prisma/seed.ts` y otorgarlo idempotentemente a los roles `admin`, `operator` y `viewer`. Este permiso SHALL ser distinto de `reports:cash_cut_read` — no debe heredarse ni asumirse implícitamente de él. El endpoint SHALL exigirlo vía `requirePermission(req, "reports:customer_collections_read", authz)`, respondiendo `401` cuando falta `x-user-id` y `403` cuando `authz.userCan` devuelve `false`.

#### Scenario: Usuario sin permiso
- **WHEN** un usuario autenticado sin `reports:customer_collections_read` llama al endpoint, aunque tenga `reports:cash_cut_read`
- **THEN** el sistema responde `403`

#### Scenario: Sin identidad
- **WHEN** la request no propaga `x-user-id`
- **THEN** el sistema responde `401`

#### Scenario: Seed idempotente
- **WHEN** `npm run seed` corre dos veces
- **THEN** el permiso `reports:customer_collections_read` existe una sola vez y queda asignado a `admin`, `operator`, `viewer` sin duplicados

---

### Requirement: Customer collections report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/customer-collections` que devuelve la cobranza (`customer_payments` con `status='completed'`) de un periodo, agregada en dos formas simultáneas: `byCustomer` (una fila por cliente con `customerId`, `customerName`, `count`, `total`) y `byTicket` (una fila por venta abonada con `saleId`, `factura` [folio de la venta], `customerName`, `count` [número de abonos aplicados a ese ticket], `total`). SHALL aceptar filtros `?branchId`, `?customerId` (UUID; `400` si inválidos) y `?from`/`?to` (`YYYY-MM-DD`, obligatorios). El endpoint SHALL delegar a `reportsController` y ejecutar `GetCollectionsReportUseCase`.

#### Scenario: Cobranza con abonos
- **WHEN** un usuario con permiso llama el endpoint con un periodo que tiene abonos completados de varios clientes, algunos aplicados al mismo ticket
- **THEN** responde `200 application/json` con `byCustomer` (una fila por cliente) y `byTicket` (una fila por venta, agregando los abonos aplicados a esa venta)

#### Scenario: Filtro por cliente
- **WHEN** se envía `?customerId=<uuid>`
- **THEN** `byCustomer` y `byTicket` solo incluyen abonos de ese cliente

#### Scenario: Periodo sin cobranza
- **WHEN** el periodo no tiene abonos `completed`
- **THEN** `byCustomer` y `byTicket` son arrays vacíos

#### Scenario: Abonos cancelados no cuentan
- **WHEN** existen abonos `cancelled` en el periodo
- **THEN** no se suman a `byCustomer` ni a `byTicket`

#### Scenario: Rango de fechas obligatorio
- **WHEN** la request no incluye `from` o `to`
- **THEN** el sistema responde `400`

---

### Requirement: Customer collections report PDF and Excel artifacts
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` generado con `@react-pdf/renderer` (`CollectionsReportPdf`), agrupando visualmente las filas por cliente y, dentro de cada cliente, por ticket abonado, con totales por cliente y total general. Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`xlsx`/SheetJS) con hojas separadas para el detalle plano, `byCustomer` y `byTicket`. Ambos formatos SHALL responder con `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`.

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el header SHALL omitir esa línea. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF agrupado
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con las filas agrupadas por cliente y sub-agrupadas por ticket

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx` y hojas de detalle, por cliente y por ticket

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: PDF incluye dirección y RFC del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf` y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el header muestra ambos datos junto al logo, sin desplazar el agrupamiento por cliente/ticket

### Requirement: Branch scoping for customer collections report
El endpoint SHALL aplicar `resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, `byCustomer` y `byTicket` SHALL limitarse a `branch_id = x-user-branch-id`.

#### Scenario: Operador sin bypass
- **WHEN** un operador sin `branches:access_all` genera el reporte
- **THEN** ambos desgloses se limitan a su sucursal

#### Scenario: Admin con bypass
- **WHEN** un usuario con `branches:access_all` no envía `branchId`
- **THEN** el reporte agrega cobranza de todas las sucursales

