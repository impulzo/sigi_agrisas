## MODIFIED Requirements

### Requirement: Export formats for cash cut
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` generado con `@react-pdf/renderer` (`CashCutReportPdf`), incluyendo encabezado (periodo, sucursal, `generatedBy`, fecha de emisión y numeración de página), la tabla de filas, los totales y el desglose por forma de pago. Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` generado con la librería `xlsx` (SheetJS) vía `buildCashCutWorkbook`, con las mismas 12 columnas de fila más filas de totales al final. Ambos formatos SHALL responder con `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. (Traza: S5.)

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`), no de valores hex arbitrarios. El footer de numeración de página SHALL usar el formato "Página X de Y" (previamente "Pág. X de Y" en este reporte específicamente — normalizado para consistencia con el resto de los reportes del sistema).

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook válido con las columnas de la historia más los totales

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: Footer normalizado a "Página X de Y"
- **WHEN** un usuario con permiso agrega `?format=pdf` y el reporte tiene múltiples páginas
- **THEN** el footer de cada página muestra el texto "Página X de Y", no "Pág. X de Y"
