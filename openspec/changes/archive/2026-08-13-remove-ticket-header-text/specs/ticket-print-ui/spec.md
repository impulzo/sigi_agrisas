## MODIFIED Requirements

### Requirement: Print ticket action on the ticket view
The system SHALL render the "Imprimir Ticket" action on `/sales/:id/ticket` (la vista de ticket), visible bajo el mismo permiso `sales:read` que ya gatea `/sales/:id` (sin permiso nuevo). La acción SHALL ubicarse en la parte inferior del ticket. Al hacer clic, el sistema SHALL imprimir únicamente el ticket térmico (`PrintableTicket`) — sin cargar en la impresión la barra de navegación, el back link, los botones de acción ni la tarjeta de vista previa. El contenido impreso SHALL incluir, en orden de secciones: logo de Agrisas (`logoUrl` de `GET /settings/ticket` o el logo embebido `/logo.png` como fallback — el logo nunca se omite), header de negocio (razón social `businessName`, RFC `businessRfc`, dirección, "Tel. <phone>" y régimen fiscal desde `GET /settings/ticket`, omitiendo los campos nulos) — SIN texto de encabezado libre entre el logo y este bloque, `folioCode`, fecha, vendedor (etiqueta "Vendedor" sobre `cashierName`), sucursal, método de pago, sección cliente (RFC, nombre y dirección — SOLO si la venta tiene `customerId`), condiciones de crédito ("Condiciones: Crédito a <N> días" — SOLO si `customerCreditDays` no es null), items (nombre de producto, cantidad, precio unitario, total de línea), totales (subtotal, IVA e IEPS — ambos SIEMPRE como líneas separadas independientemente de su valor — y "Total a pagar"), footer, leyenda de revisión de mercancía (desde `GET /settings/ticket.legendText`, omitida si es null), y el folio (`folioCode` completo, con su prefijo/formato — nunca solo el número) como elemento decorativo tipo código de barras. El sistema NO SHALL renderizar la etiqueta "Cajero" en el ticket impreso (se usa "Vendedor"). El sistema NO SHALL renderizar ningún párrafo de "texto de encabezado" — ese campo fue eliminado de `TicketSettings`; el bloque de datos del negocio ocupa el espacio inmediatamente debajo del logo. La impresión SHALL invocar `window.print()`.

#### Scenario: Print action available regardless of sale status
- **WHEN** viewing a sale with `status` of `completed`, `cancelled`, or `edited` on `/sales/:id/ticket`
- **THEN** the "Imprimir Ticket" action is available (printing a record of any historical sale is valid)

#### Scenario: Printable view uses the sale's already-loaded data
- **WHEN** the print view renders
- **THEN** it uses exclusively the data already fetched by the page for that specific sale (no additional sale data is fetched) — folio, items, and totals match exactly what's shown on screen

#### Scenario: Customer section rendered when sale has a customer
- **WHEN** the sale has `customerId` (with `customerRfc`, `customerName`, `customerAddress` populated)
- **THEN** the printed ticket shows a "Cliente" section with RFC, name, and address

#### Scenario: Customer section omitted for walk-in sales
- **WHEN** the sale has `customerId: null`
- **THEN** the printed ticket omits the customer section entirely (no empty rows)

#### Scenario: Credit conditions shown when the customer has creditDays
- **WHEN** the sale's customer has `customerCreditDays` set (non-null)
- **THEN** the printed ticket shows "Condiciones: Crédito a <N> días"

#### Scenario: Credit conditions omitted without a customer
- **WHEN** the sale has no customer (`customerCreditDays: null`)
- **THEN** the conditions line is omitted

#### Scenario: Business info section from settings
- **WHEN** `GET /settings/ticket` returns `businessName`, `businessRfc`, `businessAddress`, `businessPhone`, `businessTaxRegime`
- **THEN** the printed ticket shows the business section under the logo, in this order: razón social (`businessName`), "RFC: <businessRfc>", address, "Tel. <phone>", tax regime; when a field is `null`, that specific line is omitted without breaking the layout

#### Scenario: Header text no longer rendered
- **WHEN** the printed ticket renders its content between the logo and the business info section
- **THEN** no separate "texto de encabezado" paragraph appears — the business info section (razón social, RFC, address, phone, tax regime) is the first content block after the logo, even when all `business*` fields are `null` (nothing renders in that slot)

#### Scenario: Total labeled as "Total a pagar"
- **WHEN** the ticket renders its totals
- **THEN** the total line is labeled "Total a pagar" (the column header "Total" in the items grid is unaffected)

#### Scenario: Legend shown in the footer
- **WHEN** `GET /settings/ticket` returns `legendText`
- **THEN** the printed ticket shows the legend near the footer; when `legendText` is `null`, the legend is omitted

#### Scenario: IVA and IEPS always shown as separate lines
- **WHEN** the printable view renders totals for a sale where every item has `iepsRate = 0`
- **THEN** the view shows both an "IVA" line and an "IEPS" line (with IEPS as `$0.00`), never a single combined "Impuestos" line and never omitting either

#### Scenario: Missing logo does not break the layout
- **WHEN** `GET /settings/ticket` returns `logoUrl: null`
- **THEN** the printable view uses the embedded Agrisas logo (`/logo.png`) as fallback — never a broken image icon, never an empty gap

#### Scenario: Paper width from settings is applied
- **WHEN** `GET /settings/ticket` returns `paperWidth: "58mm"`
- **THEN** the printable view's `@media print` CSS sets the content width to `58mm` (not the `80mm` default)

#### Scenario: Print view hidden outside of printing
- **WHEN** the page is viewed normally on screen (not printing)
- **THEN** the printable ticket component is not visible and does not affect the normal page layout

#### Scenario: Settings fetch failure degrades gracefully
- **WHEN** `GET /settings/ticket` fails (network error, missing `settings:read`, etc.)
- **THEN** the print view still renders with the sale data, omitting logo/footer/business (name, RFC, address, phone, tax regime)/legend (falling back to `80mm` width) rather than blocking the print action entirely

#### Scenario: Logo rendered at 75x105px
- **WHEN** the printed ticket renders its logo (either `logoUrl` from settings or the `/logo.png` fallback)
- **THEN** the `img` is sized to 75px wide × 105px tall with `object-fit: contain` so the aspect ratio is preserved (no distortion)

#### Scenario: Logo bottom margin reduced 40%
- **WHEN** the printed ticket renders its logo above the business info section
- **THEN** the bottom margin separating the logo from the content below it is `2.4px` (a 40% reduction from the prior `4px`)

#### Scenario: Folio rendered below the decorative barcode
- **WHEN** the printed ticket renders the folio as a decorative barcode-style element near the footer
- **THEN** the folio label is rendered as plain text immediately below the barcode-style bars — never above it, never omitted

#### Scenario: Folio shown in full with its folio code
- **WHEN** the printed ticket renders the folio (header line and below the decorative barcode)
- **THEN** it shows `sale.folioCode` — the fully formatted folio (with the folio's prefix, e.g. `TK000042`) — never the bare `folioNumber`
