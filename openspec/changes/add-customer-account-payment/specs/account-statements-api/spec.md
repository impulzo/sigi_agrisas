## MODIFIED Requirements

### Requirement: Print anticipo receipt endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements/:customerId/payments/:paymentId/receipt?format=pdf` que genera el recibo imprimible de un anticipo/abono con `@react-pdf/renderer` (`AnticipoReceiptPdf`): folio del abono, cliente, monto, forma de pago, referencia/notas, fecha y `generatedBy`. Ambos IDs SHALL validarse como UUID (`400` si son inválidos). SHALL responder `404` si el abono no existe o no pertenece al `customerId`. SHALL exigir `reports:account_statements_read` y aplicar branch scoping. `format` distinto de `pdf` (default o único válido para este endpoint) SHALL responder `400`.

El recibo SHALL incluir el logo del negocio en el encabezado (tamaño normal, al ser un documento entregado al cliente), junto con la razón social (si está configurada), la dirección y el RFC del negocio, resueltos vía `toPdfIssuer` — mismo mecanismo de resolución y fallback que el logo. Cuando dirección o RFC sean `null`, el encabezado SHALL omitir esa línea sin renderizar texto vacío. El folio del abono y el bloque de cliente ya existentes en el cuerpo del recibo SHALL conservarse sin cambio. Los colores del recibo SHALL provenir de la paleta de marca compartida (`pdfTheme`).

**El bloque `sale` del recibo (`{ folio: string }`) SHALL ser `null` cuando el abono es "a saldo general" (sin venta asociada, `CustomerPayment.saleId = null`)**. En ese caso, la línea "Aplicado a" del recibo SHALL mostrar el literal "Saldo general (sin venta asociada)" en vez de un folio de venta.

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

#### Scenario: Recibo de un abono a saldo general (sin venta)
- **WHEN** un usuario con permiso pide el recibo de un abono cuyo `saleId` es `null`
- **THEN** responde `200 application/pdf`, el bloque `sale` del DTO es `null`, y la línea "Aplicado a" del PDF muestra "Saldo general (sin venta asociada)" en vez de un folio
