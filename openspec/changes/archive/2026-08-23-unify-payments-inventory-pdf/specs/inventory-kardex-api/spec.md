## MODIFIED Requirements

### Requirement: Export formats
El endpoint SHALL aceptar `?format=xlsx` (200, `Content-Type` de spreadsheet, `Content-Disposition: attachment; filename="kardex-<code>-<from>_<to>.xlsx"`, una fila por movimiento) y `?format=pdf` (200 `application/pdf`, `Content-Disposition: attachment`, encabezado + tabla vía `@react-pdf/renderer`). El encabezado del PDF SHALL incluir el logo del negocio (tamaño reducido, junto al título), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto (`public/logo.png`) cuando no está configurado. Los colores de tabla (encabezado, bordes, texto mutado) SHALL provenir de la paleta de marca compartida (`pdfTheme`), no de valores hex arbitrarios específicos de este módulo. Un `format` fuera de `json|pdf|xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. Si el rango filtrado supera 10 000 movimientos, el sistema SHALL responder `409 {"error":"ReportTooLarge","tooLarge":true}` para cualquier formato.

#### Scenario: Export Excel
- **WHEN** un usuario con permiso agrega `?format=xlsx`
- **THEN** responde `200` con el archivo xlsx adjunto

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` adjunto

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400`

#### Scenario: Reporte demasiado grande
- **WHEN** el rango filtrado tiene más de 10 000 movimientos
- **THEN** responde `409` con `tooLarge:true`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso solicita `?format=pdf`
- **THEN** el PDF generado incluye el logo del negocio (o el fallback por defecto) en el encabezado, sin alterar el layout de las tarjetas de resumen (existencia total/almacén/saldo anterior/saldo final)

#### Scenario: PDF usa colores de marca
- **WHEN** un usuario con permiso solicita `?format=pdf`
- **THEN** el color de fondo del encabezado de tabla del PDF corresponde a la paleta de marca compartida, no al azul `#1565C0` anterior
