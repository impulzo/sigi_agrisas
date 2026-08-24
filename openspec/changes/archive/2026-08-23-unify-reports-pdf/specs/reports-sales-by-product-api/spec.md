## MODIFIED Requirements

### Requirement: Sales-by-product report PDF and Excel artifacts
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` generado con `@react-pdf/renderer`, incluyendo encabezado (periodo, filtros, `generatedBy`), `totals` y la tabla de detalle. Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`xlsx`/SheetJS) con una única hoja "Detalle" (Departamento/Producto/Cliente/Cantidad/Monto) más totales. Ambos formatos SHALL responder con `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`.

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y un workbook con una hoja "Detalle"

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)
