## MODIFIED Requirements

### Requirement: Purchases report PDF and Excel artifacts
Cuando `?format=pdf` en cualquiera de los dos endpoints, el sistema SHALL generar el PDF con `@react-pdf/renderer` incluyendo encabezado (título, periodo/filtros aplicados, `generatedBy`, fecha de emisión), la tabla de filas, totales agregados y numeración de página. Cuando `?format=xlsx`, SHALL devolver un workbook (`xlsx`/SheetJS) con una fila por registro y fila de totales al final, con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`.

El header del PDF (en ambos endpoints: compras y pagos a proveedores) SHALL incluir el logo del negocio (tamaño reducido), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

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
