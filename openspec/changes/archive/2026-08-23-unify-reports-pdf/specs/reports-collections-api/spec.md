## MODIFIED Requirements

### Requirement: Customer collections report PDF and Excel artifacts
El endpoint SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, SHALL responder `200 application/pdf` generado con `@react-pdf/renderer` (`CollectionsReportPdf`), agrupando visualmente las filas por cliente y, dentro de cada cliente, por ticket abonado, con totales por cliente y total general. Con `xlsx`, SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (`xlsx`/SheetJS) con hojas separadas para el detalle plano, `byCustomer` y `byTicket`. Ambos formatos SHALL responder con `Content-Disposition: attachment`. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`.

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

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
