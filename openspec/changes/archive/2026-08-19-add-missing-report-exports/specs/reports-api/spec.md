## MODIFIED Requirements

### Requirement: Inventory Stock Report endpoint

El sistema SHALL exponer `GET /api/v1/admin/reports/inventory/stock` que devuelve el reporte de stock agrupado por sucursal → departamento → productos, en formato JSON (default), PDF o XLSX, según el query param `?format=`. El endpoint SHALL delegar a `reportsController` (módulo `src/modules/reports/`) y ejecutar el use case `GetInventoryStockReportUseCase`.

#### Scenario: Request JSON con autenticación válida

- **WHEN** un usuario autenticado con permiso `reports:inventory_read` ejecuta `GET /api/v1/admin/reports/inventory/stock`
- **THEN** el sistema responde `200 application/json` con el DTO descrito en el requirement "Stock report JSON DTO"

#### Scenario: Request PDF con autenticación válida

- **WHEN** un usuario autenticado con permiso `reports:inventory_read` ejecuta `GET /api/v1/admin/reports/inventory/stock?format=pdf`
- **THEN** el sistema responde `200 application/pdf` con `Content-Disposition: attachment; filename="stock-YYYY-MM-DD.pdf"` y el cuerpo es un PDF binario válido generado por `@react-pdf/renderer`

#### Scenario: Request XLSX con autenticación válida

- **WHEN** un usuario autenticado con permiso `reports:inventory_read` ejecuta `GET /api/v1/admin/reports/inventory/stock?format=xlsx`
- **THEN** el sistema responde `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="stock-YYYY-MM-DD.xlsx"` y el cuerpo es un workbook XLSX válido generado por `buildInventoryStockWorkbook`

#### Scenario: format desconocido

- **WHEN** el query param `format` toma un valor distinto a `json`, `pdf` o `xlsx` (ej. `?format=csv`)
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

---

### Requirement: Stock report filters

El endpoint SHALL aceptar los siguientes filtros opcionales en la querystring, todos validados por Zod en el controller:
- `branchId?: string (UUID)` — descrito en el requirement de branch scoping.
- `departmentId?: string (UUID)` — restringe los productos al departamento dado. Si el departamento no existe, el reporte devuelve `branches[].departments[]` vacíos (no `404`).
- `includeZeroStock?: boolean` (default `true`) — cuando `false`, excluye productos con `quantity === 0` antes de calcular subtotales.
- `format?: "json" | "pdf" | "xlsx"` (default `"json"`).

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

### Requirement: Payment History Report endpoint

El sistema SHALL exponer `GET /api/v1/admin/reports/payments/history` que devuelve el historial de abonos con totales agregados, en formato JSON (default), PDF o XLSX según `?format=`. El endpoint SHALL delegar a `reportsController` y ejecutar el use case `GetPaymentHistoryReportUseCase`. Se diferencia del endpoint operativo `GET /api/v1/admin/payments/history` (módulo `payments`) en que: (a) no pagina — devuelve todos los abonos del rango solicitado; (b) incluye un bloque `summary` con totales bruto/neto/cancelado; (c) su PDF está orientado a auditoría ejecutiva.

#### Scenario: Request JSON con autenticación válida

- **WHEN** un usuario autenticado con permiso `payments:report_read` ejecuta `GET /api/v1/admin/reports/payments/history`
- **THEN** el sistema responde `200 application/json` con el DTO descrito en "Payment history report JSON DTO"

#### Scenario: Request PDF con autenticación válida

- **WHEN** un usuario con `payments:report_read` ejecuta `GET /api/v1/admin/reports/payments/history?format=pdf`
- **THEN** el sistema responde `200 application/pdf` con `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.pdf"` y cuerpo PDF binario válido

#### Scenario: Request XLSX con autenticación válida

- **WHEN** un usuario con `payments:report_read` ejecuta `GET /api/v1/admin/reports/payments/history?format=xlsx`
- **THEN** el sistema responde `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.xlsx"` y el cuerpo es un workbook XLSX válido generado por `buildPaymentHistoryWorkbook`

#### Scenario: format desconocido

- **WHEN** `?format=csv` u otro valor distinto a `json`, `pdf` o `xlsx`
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

---

### Requirement: Payment report filters

El endpoint SHALL aceptar los siguientes filtros opcionales, validados por Zod en el controller:
- `branchId?: string (UUID)` — descrito en el requirement de branch scoping.
- `customerId?: string (UUID)` — restringe los abonos al cliente dado. Si el cliente no existe, el reporte devuelve `payments: []` y `summary` en cero (no `404`).
- `startDate?: string (ISO 8601 date, ej. "2026-01-01")` — filtra `payment_date >= startDate 00:00:00 UTC`.
- `endDate?: string (ISO 8601 date, ej. "2026-06-07")` — filtra `payment_date <= endDate 23:59:59 UTC`.
- `format?: "json" | "pdf" | "xlsx"` (default `"json"`).

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

## ADDED Requirements

### Requirement: Stock report XLSX artifact

Cuando `?format=xlsx`, el sistema SHALL generar el workbook con `buildInventoryStockWorkbook` (paquete `xlsx`, `XLSX.utils.aoa_to_sheet` + `XLSX.write(..., { type: "buffer", bookType: "xlsx" })`) y devolverlo con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="stock-YYYY-MM-DD.xlsx"` (misma fecha que usa la rama PDF). El workbook SHALL contener, agrupado por sucursal → departamento igual que el PDF: columnas Código, Producto, Unidad, Stock, Reservado, Disponible, Reorden, Estado; subtotales por departamento y por sucursal; totales globales al final.

#### Scenario: XLSX con metadatos correctos

- **WHEN** el endpoint devuelve `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **THEN** la response tiene ese `Content-Type` y `Content-Disposition` cuyo `filename` matchea `^stock-\d{4}-\d{2}-\d{2}\.xlsx$`

#### Scenario: XLSX cuando el reporte está vacío

- **WHEN** la consulta no devuelve sucursales (`branches: []`)
- **THEN** el workbook se genera con encabezados y totales en cero, sin lanzar error; status `200`

### Requirement: Payment history report XLSX artifact

Cuando `?format=xlsx`, el sistema SHALL generar el workbook con `buildPaymentHistoryWorkbook` y devolverlo con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.xlsx"`. El workbook SHALL contener una fila por abono con columnas Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado, más un bloque de totales (`summary`: abonos completados, monto bruto, abonos cancelados, monto cancelado, monto neto) al final.

#### Scenario: XLSX con metadatos correctos

- **WHEN** el endpoint devuelve `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **THEN** la response tiene ese `Content-Type` y `Content-Disposition` cuyo `filename` matchea `^payments-\d{4}-\d{2}-\d{2}\.xlsx$`

#### Scenario: XLSX cuando el reporte está vacío

- **WHEN** `payments: []`
- **THEN** el workbook se genera con encabezados y el bloque `summary` en cero, sin lanzar error; status `200`
