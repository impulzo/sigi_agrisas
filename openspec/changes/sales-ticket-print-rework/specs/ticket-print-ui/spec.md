# ticket-print-ui

## RENAMED Requirements

### Requirement: Print ticket button on sale detail
TO: Print ticket action on the ticket view

## MODIFIED Requirements

### Requirement: Print ticket action on the ticket view
The system SHALL render the "Imprimir Ticket" action on `/sales/:id/ticket` (la vista de ticket), visible bajo el mismo permiso `sales:read` que ya gatea `/sales/:id` (sin permiso nuevo). La acción SHALL ubicarse en la parte inferior del ticket. Al hacer clic, el sistema SHALL imprimir únicamente el ticket térmico (`PrintableTicket`) — sin cargar en la impresión la barra de navegación, el back link, los botones de acción ni la tarjeta de vista previa. El contenido impreso SHALL incluir: marca "Agrisas", `folioCode`, fecha, cajero, sucursal, items (nombre de producto, cantidad, precio unitario, total de línea), método de pago, totales (subtotal, IVA e IEPS — ambos SIEMPRE como líneas separadas independientemente de su valor, y total), footer, y el folio como elemento decorativo tipo código de barras; más el logo/header/footer obtenidos de `GET /settings/ticket`. La impresión SHALL invocar `window.print()`. El sistema NO SHALL renderizar un botón "Imprimir ticket" separado en `/sales/:id` (el detalle de la venta), donde solo existe el enlace "Ver Ticket" hacia `/sales/:id/ticket`.

#### Scenario: Print action available regardless of sale status
- **WHEN** viewing a sale with `status` of `completed`, `cancelled`, or `edited` on `/sales/:id/ticket`
- **THEN** the "Imprimir Ticket" action is available (printing a record of any historical sale is valid)

#### Scenario: Single ticket entry point on sale detail
- **WHEN** viewing a sale on `/sales/:id`
- **THEN** only the "Ver Ticket" link is rendered (navigating to `/sales/:id/ticket`), and no separate "Imprimir ticket" button exists on the detail page

#### Scenario: Only the ticket is printed, not the surrounding UI
- **WHEN** the user triggers printing from `/sales/:id/ticket`
- **THEN** the printed output contains exclusively the thermal ticket; the navigation rail, back link, action buttons, and the styled preview card are hidden in the print output
- **AND** on screen (outside of printing) all UI renders normally, unchanged

#### Scenario: Printable view uses the sale's already-loaded data
- **WHEN** the print view renders
- **THEN** it uses exclusively the data already fetched by the page for that specific sale (no additional sale data is fetched) — folio, items, and totals match exactly what's shown on screen

#### Scenario: IVA and IEPS always shown as separate lines
- **WHEN** the printable view renders totals for a sale where every item has `iepsRate = 0`
- **THEN** the view shows both an "IVA" line and an "IEPS" line (with IEPS as `$0.00`), never a single combined "Impuestos" line and never omitting either

#### Scenario: Printed content is aligned to the Stitch design
- **WHEN** the printable view renders a sale
- **THEN** it shows the brand mark "Agrisas", the payment method name, and the folio label at the bottom as a decorative barcode-style element, alongside the existing logo/header/items/totals/footer

#### Scenario: Missing logo does not break the layout
- **WHEN** `GET /settings/ticket` returns `logoUrl: null`
- **THEN** the printable view omits the logo space entirely — no broken image icon, no empty gap

#### Scenario: Paper width from settings is applied
- **WHEN** `GET /settings/ticket` returns `paperWidth: "58mm"`
- **THEN** the printable view's `@media print` CSS sets the content width to `58mm` (not the `80mm` default)

#### Scenario: Print view hidden outside of printing
- **WHEN** the page is viewed normally on screen (not printing)
- **THEN** the printable ticket component is not visible and does not affect the normal page layout

#### Scenario: Settings fetch failure degrades gracefully
- **WHEN** `GET /settings/ticket` fails (network error, missing `settings:read`, etc.)
- **THEN** the print view still renders with the sale data, omitting logo/header/footer text (falling back to `80mm` width) rather than blocking the print action entirely
