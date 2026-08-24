## MODIFIED Requirements

### Requirement: PDF export and format selection
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.pdf"` generado con `@react-pdf/renderer` (`SalesCutReportPdf`), incluyendo encabezado (periodo, sucursal, `generatedBy`), totales, neto de caja, los desgloses y la tabla de detalle de tickets (`salesList`). Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.xlsx"` generado con la librería `xlsx` (SheetJS) vía `buildSalesCutWorkbook`, con una hoja por desglose (método, día, cajero, sucursal, departamento, producto) más una hoja de detalle de tickets. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. (Traza: S3.)

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido, incluyendo la tabla de detalle de tickets

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook con una hoja por desglose más una hoja de detalle de tickets

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)
