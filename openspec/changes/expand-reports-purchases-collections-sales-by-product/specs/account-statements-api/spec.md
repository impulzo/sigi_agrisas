## MODIFIED Requirements

### Requirement: PDF export and format selection
Ambos endpoints SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, el sistema SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.pdf"`, generado con `@react-pdf/renderer` (`AccountStatementPdf`), incluyendo encabezado con cliente/rango/`generatedBy` y saldo inicial/final. Con `xlsx`, el sistema SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.xlsx"`, generado con la librería `xlsx` (SheetJS): el endpoint de resumen SHALL producir una fila por cliente con las mismas columnas de la tabla resumen (cliente, total cargado, total abonado, saldo, límite, disponible); el endpoint de libro mayor SHALL producir una fila por movimiento con las mismas columnas de la tabla de movimientos (incluidas Serie, Factura, Vencimiento, Referencia, F.Pgo). Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. Un desglose con más de 10 000 movimientos en formato `pdf` o `xlsx` SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`.

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel del resumen
- **WHEN** un usuario con permiso agrega `?format=xlsx` al endpoint de resumen
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y una fila por cliente con las columnas de la tabla resumen

#### Scenario: Export Excel del libro mayor
- **WHEN** un usuario con permiso agrega `?format=xlsx` al endpoint de libro mayor
- **THEN** responde `200` con `Content-Type` de `.xlsx` y una fila por movimiento con las columnas de la tabla de movimientos

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: Reporte demasiado grande
- **WHEN** el desglose supera 10 000 movimientos y `format=pdf` o `format=xlsx`
- **THEN** responde `409 {"error":"ReportTooLarge","limit":10000}`
