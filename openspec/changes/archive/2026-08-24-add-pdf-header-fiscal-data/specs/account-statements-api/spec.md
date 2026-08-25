## MODIFIED Requirements

### Requirement: Print anticipo receipt endpoint

El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements/:customerId/payments/:paymentId/receipt?format=pdf` que genera el recibo imprimible de un anticipo/abono con `@react-pdf/renderer` (`AnticipoReceiptPdf`): folio del abono, cliente, monto, forma de pago, referencia/notas, fecha y `generatedBy`. Ambos IDs SHALL validarse como UUID (`400` si son inválidos). SHALL responder `404` si el abono no existe o no pertenece al `customerId`. SHALL exigir `reports:account_statements_read` y aplicar branch scoping. `format` distinto de `pdf` (default o único válido para este endpoint) SHALL responder `400`.

El recibo SHALL incluir el logo del negocio en el encabezado (tamaño normal, al ser un documento entregado al cliente), junto con la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el encabezado SHALL omitir esa línea sin renderizar texto vacío. El folio del abono y el bloque de cliente ya existentes en el cuerpo del recibo SHALL conservarse sin cambio. Los colores del recibo SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Recibo de anticipo
- **WHEN** un usuario con permiso pide el recibo de un abono existente del cliente con `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y el recibo del abono

#### Scenario: Abono ajeno al cliente
- **WHEN** el `paymentId` existe pero pertenece a otro cliente distinto de `:customerId`
- **THEN** el sistema responde `404`

#### Scenario: Recibo incluye logo del negocio
- **WHEN** un usuario con permiso pide el recibo con `?format=pdf`
- **THEN** el recibo incluye el logo del negocio (o el fallback por defecto) en el encabezado

#### Scenario: Recibo incluye dirección y RFC del negocio, y conserva el folio y el cliente
- **WHEN** un usuario con permiso pide el recibo con `?format=pdf` y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el encabezado muestra ambos datos junto al logo, y el recibo sigue mostrando el folio del abono y los datos del cliente exactamente como antes de este cambio

---

### Requirement: PDF export and format selection

Ambos endpoints SHALL aceptar `?format=json` (default), `?format=pdf` o `?format=xlsx`. Con `pdf`, el sistema SHALL responder `200 application/pdf` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.pdf"`, generado con `@react-pdf/renderer` (`AccountStatementPdf`), incluyendo encabezado con cliente/rango/`generatedBy` y saldo inicial/final. Con `xlsx`, el sistema SHALL responder `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.xlsx"`, generado con la librería `xlsx` (SheetJS): el endpoint de resumen SHALL producir una fila por cliente con las mismas columnas de la tabla resumen (cliente, total cargado, total abonado, saldo, límite, disponible); el endpoint de libro mayor SHALL producir, por cada grupo de `groups[]`, una fila para la venta (si `sale` no es `null`) seguida inmediatamente por una fila por cada abono de `payments[]` y una fila de subtotal `"Saldo ticket"` con el `ticketBalance` del grupo — mismas columnas de movimiento ya existentes (Serie, Factura, Vencimiento, Referencia, F.Pgo, Cargo, Abono, Saldo, Estado) tanto para la fila de venta como para las de abono. Un `format` distinto de `json`/`pdf`/`xlsx` SHALL responder `400 {"error":"Invalid format. Allowed: json, pdf, xlsx"}`. Un desglose con más de 10 000 movimientos en formato `pdf` o `xlsx` SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`.

El header del PDF (ambos endpoints: resumen y libro mayor) SHALL incluir el logo del negocio (tamaño reducido), la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el header SHALL omitir esa línea. El header del libro mayor SHALL conservar el nombre del cliente ya mostrado en su título (`"Estado de Cuenta — {customer.name}"`) sin cambio. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: Export PDF
- **WHEN** un usuario con permiso agrega `?format=pdf`
- **THEN** responde `200 application/pdf` con `Content-Disposition: attachment` y cuerpo PDF binario válido

#### Scenario: Export Excel del resumen
- **WHEN** un usuario con permiso agrega `?format=xlsx` al endpoint de resumen
- **THEN** responde `200` con `Content-Type` de `.xlsx`, `Content-Disposition: attachment` y una fila por cliente con las columnas de la tabla resumen

#### Scenario: Export Excel del libro mayor agrupado por ticket
- **WHEN** un usuario con permiso agrega `?format=xlsx` al endpoint de libro mayor para un cliente con ventas a crédito y abonos
- **THEN** responde `200` con `Content-Type` de `.xlsx`, y el workbook tiene la fila de cada venta seguida de las filas de sus abonos y una fila de subtotal "Saldo ticket" por grupo, en vez de una lista plana intercalada cronológicamente

#### Scenario: Formato inválido
- **WHEN** `?format=csv`
- **THEN** responde `400` con `{"error":"Invalid format. Allowed: json, pdf, xlsx"}`

#### Scenario: Reporte demasiado grande
- **WHEN** el desglose supera 10 000 movimientos y `format=pdf` o `format=xlsx`
- **THEN** responde `409 {"error":"ReportTooLarge","limit":10000}`

#### Scenario: PDF incluye logo del negocio
- **WHEN** un usuario con permiso agrega `?format=pdf` en cualquiera de los dos endpoints
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

#### Scenario: PDF incluye dirección y RFC del negocio, libro mayor conserva el nombre del cliente
- **WHEN** un usuario con permiso agrega `?format=pdf` al endpoint de libro mayor de un cliente, y `TicketSettings.businessAddress`/`businessRfc` tienen valor
- **THEN** el header muestra ambos datos junto al logo, y el título del documento sigue mostrando el nombre del cliente sin cambio
