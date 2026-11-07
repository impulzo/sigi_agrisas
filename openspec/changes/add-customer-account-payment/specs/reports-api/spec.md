## MODIFIED Requirements

### Requirement: Payment history report JSON DTO

La respuesta JSON SHALL tener exactamente la siguiente forma. `summary.totalPayments` cuenta solo los abonos `completed`; `summary.cancelledPayments` cuenta los `cancelled`. `summary.netAmount = totalAmount - cancelledAmount`. Los `Decimal` se serializan como `string` (4 decimales).

**`payments[].saleId` y `payments[].saleFolioNumber` SHALL ser `string | null`** — `null` cuando el abono es "a saldo general" (`CustomerPayment.saleId = null`, sin venta asociada). Este reporte, a diferencia del corte de caja (`cash-cut-api`), NO excluye estos abonos: los incluye con esos dos campos en `null`, ya que no depende de prorratear IVA ni de ningún otro cálculo derivado de la venta.

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

#### Scenario: Abono a saldo general incluido con saleId y saleFolioNumber null

- **WHEN** el rango filtrado incluye un abono a saldo general (`saleId=null`) además de abonos por venta
- **THEN** `payments` incluye esa fila con `saleId: null` y `saleFolioNumber: null`, y SIGUE contando en `summary.totalPayments`/`totalAmount`

---

### Requirement: Payment history report PDF artifact

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `renderToBuffer(<PaymentHistoryReportPdf data={dto}/>)` y devolverlo con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.pdf"`. El PDF SHALL contener:
- Header: título "Reporte de Historial de Abonos", `generatedAt` formateado, email de `generatedBy`, filtros activos.
- Tabla de abonos con columnas: Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado. **La columna "Folio Venta" SHALL mostrar el literal "Sin venta" cuando `saleFolioNumber` es `null`** (abono a saldo general), en vez de una celda vacía o el texto `null`.
- Sección de totales: Total abonos, Monto bruto, Monto cancelado, Monto neto.
- Footer con número de página (`Página X de Y`).
- Si `payments.length === 0`: header normal + texto "Sin abonos para los filtros aplicados".

El header SHALL incluir el logo del negocio (tamaño reducido), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el resto de los reportes internos. Cuando dirección o RFC sean `null`, el header SHALL omitir esa línea. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: PDF con metadatos correctos

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** `Content-Type: application/pdf` y `Content-Disposition` matchea `^attachment; filename="payments-\d{4}-\d{2}-\d{2}\.pdf"$`

#### Scenario: PDF cuando no hay abonos

- **WHEN** los filtros no producen ningún abono
- **THEN** el PDF se genera con header, sección de totales en cero y texto "Sin abonos para los filtros aplicados"; status `200`

#### Scenario: PDF incluye logo del negocio

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: PDF incluye dirección y RFC del negocio

- **WHEN** el endpoint devuelve `application/pdf` y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el header muestra ambos datos junto al logo, sin desplazar la tabla de abonos ni la sección de totales

#### Scenario: PDF muestra "Sin venta" para un abono a saldo general

- **WHEN** el PDF incluye un abono con `saleFolioNumber=null`
- **THEN** la columna "Folio Venta" de esa fila muestra el literal "Sin venta"

---

### Requirement: Payment history report XLSX artifact

Cuando `?format=xlsx`, el sistema SHALL generar el workbook con `buildPaymentHistoryWorkbook` y devolverlo con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.xlsx"`. El workbook SHALL contener una fila por abono con columnas Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado, más un bloque de totales (`summary`: abonos completados, monto bruto, abonos cancelados, monto cancelado, monto neto) al final. **La columna "Folio Venta" SHALL mostrar el literal "Sin venta" cuando `saleFolioNumber` es `null`** (abono a saldo general), igual que el PDF.

#### Scenario: XLSX con metadatos correctos

- **WHEN** el endpoint devuelve `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **THEN** la response tiene ese `Content-Type` y `Content-Disposition` cuyo `filename` matchea `^payments-\d{4}-\d{2}-\d{2}\.xlsx$`

#### Scenario: XLSX cuando el reporte está vacío

- **WHEN** `payments: []`
- **THEN** el workbook se genera con encabezados y el bloque `summary` en cero, sin lanzar error; status `200`

#### Scenario: XLSX muestra "Sin venta" para un abono a saldo general

- **WHEN** el workbook incluye un abono con `saleFolioNumber=null`
- **THEN** la celda de "Folio Venta" de esa fila contiene el literal "Sin venta"
