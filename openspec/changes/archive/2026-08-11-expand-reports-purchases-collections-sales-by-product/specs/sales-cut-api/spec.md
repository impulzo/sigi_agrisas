## MODIFIED Requirements

### Requirement: PDF export and format selection
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.pdf"` generado con `@react-pdf/renderer` (`SalesCutReportPdf`), incluyendo encabezado (periodo, sucursal, `generatedBy`), totales, neto de caja, los desgloses y la tabla de detalle de tickets (`salesList`). Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.xlsx"` generado con la librería `xlsx` (SheetJS) vía `buildSalesCutWorkbook`, con una hoja por desglose (método, día, cajero, sucursal, departamento, producto) más una hoja de detalle de tickets. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. (Traza: S3.)

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido, incluyendo la tabla de detalle de tickets

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook con una hoja por desglose más una hoja de detalle de tickets

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

## ADDED Requirements

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
