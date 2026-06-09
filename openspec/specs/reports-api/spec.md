# Spec: reports-api

## Purpose

Define the reports backend module (`src/modules/reports/`), which exposes endpoints under `/api/v1/admin/reports/**` for generating audit-oriented reports (inventory stock, payment history) in JSON and PDF formats. Reports apply RBAC permissions and branch scoping consistent with the rest of the panel, and the PDF artifacts are produced server-side with `@react-pdf/renderer`.

---

## Requirements

### Requirement: Inventory Stock Report endpoint

El sistema SHALL exponer `GET /api/v1/admin/reports/inventory/stock` que devuelve el reporte de stock agrupado por sucursal → departamento → productos, en formato JSON (default) o PDF, según el query param `?format=`. El endpoint SHALL delegar a `reportsController` (módulo `src/modules/reports/`) y ejecutar el use case `GetInventoryStockReportUseCase`.

#### Scenario: Request JSON con autenticación válida

- **WHEN** un usuario autenticado con permiso `reports:inventory_read` ejecuta `GET /api/v1/admin/reports/inventory/stock`
- **THEN** el sistema responde `200 application/json` con el DTO descrito en el requirement "Stock report JSON DTO"

#### Scenario: Request PDF con autenticación válida

- **WHEN** un usuario autenticado con permiso `reports:inventory_read` ejecuta `GET /api/v1/admin/reports/inventory/stock?format=pdf`
- **THEN** el sistema responde `200 application/pdf` con `Content-Disposition: attachment; filename="stock-YYYY-MM-DD.pdf"` y el cuerpo es un PDF binario válido generado por `@react-pdf/renderer`

#### Scenario: format desconocido

- **WHEN** el query param `format` toma un valor distinto a `json` o `pdf` (ej. `?format=csv`)
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid format. Allowed: json, pdf"}`

---

### Requirement: Stock report authentication and authorization

El endpoint SHALL requerir un JWT válido propagado por `AuthMiddlewareAdapter` (headers `x-user-id`, `x-user-email`, `x-user-roles`, `x-user-branch-id`) y SHALL exigir el permiso `reports:inventory_read`. SHALL responder `401` si el header `x-user-id` no está presente y `403` si `authz.userCan(userId, "reports:inventory_read")` devuelve `false`.

#### Scenario: Sin token

- **WHEN** la request no incluye `Authorization: Bearer`
- **THEN** el middleware responde `401 application/json` con `{"error":"Unauthorized"}` antes de invocar al controller

#### Scenario: Token válido sin el permiso

- **WHEN** un usuario autenticado SIN `reports:inventory_read` invoca el endpoint
- **THEN** el sistema responde `403 application/json` con `{"error":"Forbidden","required":"reports:inventory_read"}`

#### Scenario: Token válido con el permiso

- **WHEN** un usuario autenticado con `reports:inventory_read` invoca el endpoint sin otros errores
- **THEN** el sistema procede al use case y devuelve la respuesta (`200`)

---

### Requirement: Stock report branch scoping

El endpoint SHALL aplicar `enforceBranchScope`/`resolveScopedBranchId` (helpers de `src/modules/rbac/infrastructure/http/enforceBranchScope.ts`):
- Si el query param `branchId` está presente, SHALL validar UUID, y si el usuario NO tiene `branches:access_all`, SHALL exigir que `branchId === x-user-branch-id`; en caso contrario, `403`.
- Si `branchId` NO está presente:
  - Con `branches:access_all`, el reporte SHALL incluir todas las sucursales activas.
  - Sin `branches:access_all`, el reporte SHALL filtrar al `x-user-branch-id` del usuario.

#### Scenario: Admin con bypass solicita todas las sucursales

- **WHEN** un usuario con `branches:access_all` invoca el endpoint SIN `?branchId=`
- **THEN** el reporte incluye `branches[]` con todas las sucursales activas que tengan al menos un registro `BranchInventory` (o un producto vinculado, según D2)

#### Scenario: Admin con bypass solicita una sucursal específica

- **WHEN** un usuario con `branches:access_all` invoca el endpoint con `?branchId=<uuid-A>`
- **THEN** el reporte incluye solo la sucursal `A`

#### Scenario: Non-admin sin branchId

- **WHEN** un usuario sin `branches:access_all` invoca el endpoint SIN `?branchId=`
- **THEN** el reporte filtra automáticamente a `x-user-branch-id` y devuelve solo esa sucursal

#### Scenario: Non-admin solicita otra sucursal

- **WHEN** un usuario sin `branches:access_all` y con `x-user-branch-id=X` invoca el endpoint con `?branchId=Y` (Y ≠ X)
- **THEN** el sistema responde `403 application/json` con `{"error":"Forbidden","required":"branches:access_all"}`

#### Scenario: branchId con formato inválido

- **WHEN** `?branchId=` recibe un valor que no es UUID v4
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid branchId"}` antes de aplicar el branch scoping

---

### Requirement: Stock report filters

El endpoint SHALL aceptar los siguientes filtros opcionales en la querystring, todos validados por Zod en el controller:
- `branchId?: string (UUID)` — descrito en el requirement de branch scoping.
- `departmentId?: string (UUID)` — restringe los productos al departamento dado. Si el departamento no existe, el reporte devuelve `branches[].departments[]` vacíos (no `404`).
- `includeZeroStock?: boolean` (default `true`) — cuando `false`, excluye productos con `quantity === 0` antes de calcular subtotales.
- `format?: "json" | "pdf"` (default `"json"`).

#### Scenario: Filtro por departmentId

- **WHEN** el endpoint recibe `?departmentId=<uuid-D>` (y D existe y tiene productos)
- **THEN** cada `branches[i].departments[]` contiene a lo sumo un elemento (el departamento D) y `products[]` solo lista productos cuyo `departmentId === D`

#### Scenario: Filtro includeZeroStock=false

- **WHEN** el endpoint recibe `?includeZeroStock=false`
- **THEN** los productos con `quantity === 0` se omiten antes de agregar subtotales; los departamentos sin productos restantes se omiten; las sucursales sin departamentos restantes se omiten

#### Scenario: departmentId con formato inválido

- **WHEN** `?departmentId=` recibe un valor que no es UUID
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid departmentId"}`

#### Scenario: includeZeroStock con valor inválido

- **WHEN** `?includeZeroStock=maybe`
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid includeZeroStock"}`

---

### Requirement: Stock report JSON DTO

La respuesta JSON SHALL tener exactamente la siguiente forma. Cada producto SHALL incluir `availableQuantity = quantity - reservedQuantity` e `isBelowReorder = quantity < reorderPoint`, calculados en el use case. Los valores `Decimal` se serializan como `string` para preservar precisión.

```json
{
  "generatedAt": "2026-06-05T18:23:00.000Z",
  "generatedBy": { "userId": "<uuid>", "email": "operator@example.com" },
  "filters": {
    "branchId": null,
    "departmentId": null,
    "includeZeroStock": true
  },
  "branches": [
    {
      "branchId": "<uuid>",
      "branchCode": "MATRIZ",
      "branchName": "Matriz",
      "isHeadquarters": true,
      "departments": [
        {
          "departmentId": "<uuid>",
          "departmentCode": "AGRICULTOR",
          "departmentName": "AGRICULTOR",
          "products": [
            {
              "productId": "<uuid>",
              "code": "ACTIVA1",
              "name": "ACTIVANE 1KG",
              "unit": "PZA",
              "quantity": "42.0000",
              "reservedQuantity": "0.0000",
              "reorderPoint": "10.0000",
              "availableQuantity": "42.0000",
              "isBelowReorder": false
            }
          ],
          "subtotal": { "productCount": 1, "totalQuantity": "42.0000" }
        }
      ],
      "subtotal": { "departmentCount": 1, "productCount": 1, "totalQuantity": "42.0000" }
    }
  ],
  "totals": { "branchCount": 1, "departmentCount": 1, "productCount": 1, "totalQuantity": "42.0000" }
}
```

#### Scenario: Subtotales y totales consistentes

- **WHEN** el reporte devuelve `branches[]` con N sucursales, cada una con M_i departamentos y K_{i,j} productos
- **THEN** `totals.branchCount === N`, `totals.departmentCount === sum(M_i)`, `totals.productCount === sum(K_{i,j})`, y `totals.totalQuantity === sum(branches[i].subtotal.totalQuantity)`
- **AND** para cada sucursal i: `branches[i].subtotal.departmentCount === M_i`, `branches[i].subtotal.productCount === sum(K_{i,j})`, `branches[i].subtotal.totalQuantity === sum(branches[i].departments[j].subtotal.totalQuantity)`
- **AND** para cada departamento j: `subtotal.productCount === K_{i,j}`, `subtotal.totalQuantity === sum(branches[i].departments[j].products[k].quantity)`

#### Scenario: isBelowReorder marcado correctamente

- **WHEN** un producto tiene `quantity=5` y `reorderPoint=10`
- **THEN** `isBelowReorder === true`

#### Scenario: Cantidad negativa por venta del POS

- **WHEN** un producto tiene `quantity=-2` (legal en el dominio por el POS)
- **THEN** el producto se incluye con `quantity="-2.0000"` y `isBelowReorder === true`

#### Scenario: Sin sucursales con inventario

- **WHEN** la consulta filtra a una sucursal/departamento donde no hay registros `BranchInventory`
- **THEN** el reporte devuelve `branches: []`, `totals.branchCount === 0`, `totals.productCount === 0`, `totals.totalQuantity === "0.0000"`

---

### Requirement: Stock report PDF artifact

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `@react-pdf/renderer` (`renderToBuffer`) y devolverlo con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="stock-YYYY-MM-DD.pdf"` (la fecha es la del `generatedAt` UTC en formato `YYYY-MM-DD`). El PDF SHALL contener al menos:
- Header con título "Reporte de Stock", `generatedAt` formateado y email del `generatedBy`.
- Una sección por sucursal con `branchCode` + `branchName` + flag "Matriz" si `isHeadquarters`.
- Dentro de cada sucursal, una sub-sección por departamento con su nombre y la tabla de productos.
- Tabla con columnas: `Code`, `Producto`, `Unidad`, `Stock`, `Reservado`, `Disponible`, `Reorden`, `Estado` (texto "Bajo" cuando `isBelowReorder`).
- Subtotales por departamento y por sucursal; totales globales al final.
- Footer con número de página (`Página X de Y`).

#### Scenario: PDF con metadatos correctos

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** la response tiene `Content-Type: application/pdf` y `Content-Disposition` cuyo `filename` matchea `^stock-\d{4}-\d{2}-\d{2}\.pdf$`

#### Scenario: PDF cuando el reporte está vacío

- **WHEN** la consulta no devuelve sucursales (`branches: []`)
- **THEN** el PDF se genera con header, totales en cero (`Total productos: 0`), y un texto "Sin datos para los filtros aplicados"; status `200`

---

### Requirement: Stock report runtime in Node

El route handler `app/api/v1/admin/reports/inventory/stock/route.ts` SHALL ejecutarse en runtime Node (no Edge). El módulo `@react-pdf/renderer` y Prisma requieren APIs Node; el handler NO SHALL declarar `export const runtime = "edge"`.

#### Scenario: Route handler sin declaración de runtime Edge

- **WHEN** un desarrollador inspecciona `app/api/v1/admin/reports/inventory/stock/route.ts`
- **THEN** el archivo no exporta `runtime = "edge"` ni configura `next/dynamic` para forzar Edge

---

### Requirement: Reports module hexagonal layering

El módulo `src/modules/reports/` SHALL respetar el layering hexagonal del proyecto:
- `domain/` no importa de `application/` ni `infrastructure/`, ni de Next.js, ni de Prisma.
- `application/use-cases/` recibe instancias del port `InventoryReportRepository` por DI; no importa Prisma.
- `infrastructure/repositories/PrismaInventoryReportRepository.ts` implementa el port consultando Prisma.
- `infrastructure/http/ReportsController.ts` valida con Zod, resuelve branch scoping vía helpers RBAC, invoca el use case y serializa la respuesta (`json` o `pdf`).
- `infrastructure/di/container.ts` exporta `reportsController` con todas las dependencias resueltas.
- Sin import circular con otros módulos.

#### Scenario: Use case sin acoplar Prisma

- **WHEN** un desarrollador inspecciona `src/modules/reports/application/use-cases/GetInventoryStockReportUseCase.ts`
- **THEN** el archivo no importa `@prisma/client` ni `src/shared/infrastructure/prisma/client`
- **AND** el use case puede instanciarse con `InMemoryInventoryReportRepository` para tests

#### Scenario: Controller sin acoplar Prisma

- **WHEN** un desarrollador inspecciona `src/modules/reports/infrastructure/http/ReportsController.ts`
- **THEN** el archivo no importa Prisma directamente; usa los use cases y los helpers RBAC

#### Scenario: Domain sin importar infraestructura

- **WHEN** un desarrollador inspecciona cualquier archivo bajo `src/modules/reports/domain/`
- **THEN** no hay imports de Prisma, Next, ni de `infrastructure/`

---

### Requirement: Payment History Report endpoint

El sistema SHALL exponer `GET /api/v1/admin/reports/payments/history` que devuelve el historial de abonos con totales agregados, en formato JSON (default) o PDF según `?format=`. El endpoint SHALL delegar a `reportsController` y ejecutar el use case `GetPaymentHistoryReportUseCase`. Se diferencia del endpoint operativo `GET /api/v1/admin/payments/history` (módulo `payments`) en que: (a) no pagina — devuelve todos los abonos del rango solicitado; (b) incluye un bloque `summary` con totales bruto/neto/cancelado; (c) su PDF está orientado a auditoría ejecutiva.

#### Scenario: Request JSON con autenticación válida

- **WHEN** un usuario autenticado con permiso `payments:report_read` ejecuta `GET /api/v1/admin/reports/payments/history`
- **THEN** el sistema responde `200 application/json` con el DTO descrito en "Payment history report JSON DTO"

#### Scenario: Request PDF con autenticación válida

- **WHEN** un usuario con `payments:report_read` ejecuta `GET /api/v1/admin/reports/payments/history?format=pdf`
- **THEN** el sistema responde `200 application/pdf` con `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.pdf"` y cuerpo PDF binario válido

#### Scenario: format desconocido

- **WHEN** `?format=csv` u otro valor distinto a `json` | `pdf`
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid format. Allowed: json, pdf"}`

---

### Requirement: Payment report authentication and authorization

El permiso `payments:report_read` fue sembrado por `api-abonos` y ya está asignado a `admin`, `operator` y `viewer`. Este endpoint SHALL exigirlo vía `requirePermission(req, "payments:report_read")`. SHALL responder `401` si falta `x-user-id` y `403` si `userCan(userId, "payments:report_read")` devuelve `false`.

#### Scenario: Sin token

- **WHEN** la request no incluye `Authorization: Bearer`
- **THEN** el middleware responde `401 application/json` con `{"error":"Unauthorized"}` antes de invocar al controller

#### Scenario: Token válido sin el permiso

- **WHEN** un usuario autenticado SIN `payments:report_read` invoca el endpoint
- **THEN** el sistema responde `403 application/json` con `{"error":"Forbidden","required":"payments:report_read"}`

#### Scenario: Token válido con el permiso

- **WHEN** un usuario autenticado con `payments:report_read` invoca el endpoint sin otros errores
- **THEN** el sistema procede al use case y devuelve la respuesta (`200`)

---

### Requirement: Payment report branch scoping

El endpoint SHALL aplicar el mismo branch scoping que el reporte de inventario. `resolveScopedBranchId(req, parsed.branchId)` SHALL resolver el branchId efectivo; sin `branches:access_all`, el usuario solo SHALL poder consultar su propia sucursal. El `branchId` efectivo SHALL filtrar los abonos vía `customer_payments.sale.branch_id`.

#### Scenario: Non-admin sin branchId

- **WHEN** un usuario sin `branches:access_all` invoca el endpoint SIN `?branchId=`
- **THEN** el reporte filtra automáticamente a `x-user-branch-id`

#### Scenario: Non-admin solicita otra sucursal

- **WHEN** un usuario sin `branches:access_all` y con `x-user-branch-id=X` invoca con `?branchId=Y` (Y ≠ X)
- **THEN** el sistema responde `403 application/json` con `{"error":"Forbidden","required":"branches:access_all"}`

#### Scenario: branchId con formato inválido

- **WHEN** `?branchId=` recibe un valor que no es UUID v4
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid branchId"}`

---

### Requirement: Payment report filters

El endpoint SHALL aceptar los siguientes filtros opcionales, validados por Zod en el controller:
- `branchId?: string (UUID)` — descrito en el requirement de branch scoping.
- `customerId?: string (UUID)` — restringe los abonos al cliente dado. Si el cliente no existe, el reporte devuelve `payments: []` y `summary` en cero (no `404`).
- `startDate?: string (ISO 8601 date, ej. "2026-01-01")` — filtra `payment_date >= startDate 00:00:00 UTC`.
- `endDate?: string (ISO 8601 date, ej. "2026-06-07")` — filtra `payment_date <= endDate 23:59:59 UTC`.
- `format?: "json" | "pdf"` (default `"json"`).

#### Scenario: Filtro por customerId

- **WHEN** `?customerId=<uuid>` corresponde a un cliente con abonos
- **THEN** `payments[]` contiene solo abonos de ese cliente y `summary` refleja sus totales

#### Scenario: Filtro por rango de fechas

- **WHEN** `?startDate=2026-06-01&endDate=2026-06-07`
- **THEN** `payments[]` contiene solo abonos donde `paymentDate` ∈ [2026-06-01T00:00:00Z, 2026-06-07T23:59:59Z]

#### Scenario: customerId con formato inválido

- **WHEN** `?customerId=` recibe un valor que no es UUID
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid customerId"}`

#### Scenario: Fecha con formato inválido

- **WHEN** `?startDate=01-06-2026` (formato no ISO `YYYY-MM-DD`)
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid startDate"}`

---

### Requirement: Payment history report JSON DTO

La respuesta JSON SHALL tener exactamente la siguiente forma. `summary.totalPayments` cuenta solo los abonos `completed`; `summary.cancelledPayments` cuenta los `cancelled`. `summary.netAmount = totalAmount - cancelledAmount`. Los `Decimal` se serializan como `string` (4 decimales).

```json
{
  "generatedAt": "2026-06-07T18:00:00.000Z",
  "generatedBy": { "userId": "<uuid>", "email": "admin@agrisas.com" },
  "filters": {
    "branchId": null,
    "customerId": null,
    "startDate": null,
    "endDate": null
  },
  "summary": {
    "totalPayments": 10,
    "totalAmount": "5000.0000",
    "cancelledPayments": 1,
    "cancelledAmount": "200.0000",
    "netAmount": "4800.0000"
  },
  "payments": [
    {
      "paymentId": "<uuid>",
      "folioNumber": "RECIBO-001",
      "saleId": "<uuid>",
      "saleFolioNumber": "VNT-001",
      "customerId": "<uuid>",
      "customerCode": "CUST001",
      "customerName": "Agricola Juan SA de CV",
      "branchId": "<uuid>",
      "branchCode": "MATRIZ",
      "amount": "500.0000",
      "paymentDate": "2026-06-01T10:00:00.000Z",
      "status": "completed",
      "registeredBy": "<uuid>",
      "registeredByEmail": "operator@agrisas.com",
      "cancelledAt": null,
      "cancellationReason": null
    }
  ]
}
```

#### Scenario: Summary con abonos cancelados

- **WHEN** hay 10 abonos `completed` (total $5000) y 1 `cancelled` ($200)
- **THEN** `summary.totalPayments===10`, `summary.totalAmount==="5000.0000"`, `summary.cancelledPayments===1`, `summary.cancelledAmount==="200.0000"`, `summary.netAmount==="4800.0000"`

#### Scenario: Sin abonos en el rango

- **WHEN** los filtros no producen ningún abono
- **THEN** `payments: []`, `summary.totalPayments===0`, `summary.totalAmount==="0.0000"`, `summary.netAmount==="0.0000"`

---

### Requirement: Payment history report PDF artifact

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `renderToBuffer(<PaymentHistoryReportPdf data={dto}/>)` y devolverlo con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.pdf"`. El PDF SHALL contener:
- Header: título "Reporte de Historial de Abonos", `generatedAt` formateado, email de `generatedBy`, filtros activos.
- Tabla de abonos con columnas: Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado.
- Sección de totales: Total abonos, Monto bruto, Monto cancelado, Monto neto.
- Footer con número de página (`Página X de Y`).
- Si `payments.length === 0`: header normal + texto "Sin abonos para los filtros aplicados".

#### Scenario: PDF con metadatos correctos

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** `Content-Type: application/pdf` y `Content-Disposition` matchea `^attachment; filename="payments-\d{4}-\d{2}-\d{2}\.pdf"$`

#### Scenario: PDF cuando no hay abonos

- **WHEN** los filtros no producen ningún abono
- **THEN** el PDF se genera con header, sección de totales en cero y texto "Sin abonos para los filtros aplicados"; status `200`
