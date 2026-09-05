## MODIFIED Requirements

### Requirement: Print ticket action on the ticket view
The system SHALL render the "Imprimir Ticket" action on `/sales/:id/ticket` (la vista de ticket), visible bajo el mismo permiso `sales:read` que ya gatea `/sales/:id` (sin permiso nuevo). La acción SHALL ubicarse en la parte inferior del ticket. Al hacer clic, el sistema SHALL imprimir únicamente el ticket térmico (`PrintableTicket`) — sin cargar en la impresión la barra de navegación, el back link, los botones de acción ni la tarjeta de vista previa. El contenido impreso SHALL incluir, en orden de secciones: logo de Agrisas (`logoUrl` de `GET /settings/ticket` o el logo embebido `/logo.png` como fallback — el logo nunca se omite), header de negocio (razón social `businessName`, RFC `businessRfc`, dirección, "Tel. <phone>" y régimen fiscal desde `GET /settings/ticket`, omitiendo los campos nulos) — SIN texto de encabezado libre entre el logo y este bloque, `folioCode`, fecha, vendedor (etiqueta "Vendedor" sobre `cashierName`), sucursal, método de pago, sección cliente (RFC, nombre y dirección — SOLO si la venta tiene `customerId`), condiciones de pago ("Condiciones: Crédito a <N> días" en ventas a crédito, o "Condiciones: CONTADO" en ventas en efectivo — SIEMPRE presente, sin depender de si la venta tiene cliente asociado), items (nombre de producto, cantidad, precio unitario, total de línea), totales (subtotal, IVA e IEPS — ambos SIEMPRE como líneas separadas independientemente de su valor — y "Total a pagar"), footer, leyenda de revisión de mercancía (desde `GET /settings/ticket.legendText`, omitida si es null), y el folio (`folioCode` completo, con su prefijo/formato — nunca solo el número) como elemento decorativo tipo código de barras. El sistema NO SHALL renderizar la etiqueta "Cajero" en el ticket impreso (se usa "Vendedor"). El sistema NO SHALL renderizar ningún párrafo de "texto de encabezado" — ese campo fue eliminado de `TicketSettings`; el bloque de datos del negocio ocupa el espacio inmediatamente debajo del logo. Si la sucursal de la venta tiene configurado `printMode: 'escpos'` (ver capability `escpos-ticket-printing`), la impresión SHALL enviar el mismo contenido, en el mismo orden de secciones, como un job ESC/POS al agente local, SIN invocar `window.print()`; en cualquier otro caso (sin configuración, o `printMode: 'browser'`) la impresión SHALL invocar `window.print()` como hasta ahora. Para impresión browser, el CSS `@page` SHALL declarar un margen de cuatro valores (`top right bottom left`): margen inferior 4mm, laterales 3mm, y margen superior igual a 4mm más un margen adicional proporcional al alto del ticket (ver Requirement "Margen superior adicional proporcional al alto del ticket"); el alto total declarado en `@page size` SHALL crecer en esa misma cantidad adicional, de modo que el área imprimible disponible para el contenido no se reduzca. El contenedor `.printable-ticket` SHALL usar `position: absolute !important; top: 0 !important; left: 0 !important` como refuerzo menor (verificado que no anula el margen de `@page` en el pipeline de exportación a PDF de Chromium — ver Requirement "Anclaje superior del ticket en impresión térmica" para el detalle y sus alcances/limitaciones). Este forcing y el margen calculado NO SHALL considerarse una garantía de anclaje superior al imprimir a una impresora física real vía `window.print()` — confirmado en hardware real que el pipeline nativo de impresión (distinto al de exportación a PDF) puede centrar el contenido pese a un driver correctamente configurado; para esos casos la resolución soportada es `printMode: 'escpos'`, no un ajuste adicional de este CSS.

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
- **THEN** the printed ticket omits the customer section entirely (no empty rows) — the "Condiciones" line is unaffected by this and still renders (see below)

#### Scenario: Credit conditions shown when the sale is paid on credit
- **WHEN** the sale's payment method is credit (`sale.isCredit: true`)
- **THEN** the printed ticket shows "Condiciones: Crédito a <N> días", using the sale's customer `customerCreditDays`

#### Scenario: Cash conditions shown when the sale is paid in cash
- **WHEN** the sale's payment method is not credit (`sale.isCredit: false`), regardless of whether the sale has a customer
- **THEN** the printed ticket shows "Condiciones: CONTADO"

#### Scenario: Conditions line always renders, never omitted
- **WHEN** the printed ticket renders, for any combination of `sale.isCredit` and `sale.customerId`
- **THEN** the "Condiciones" line is always present (crédito or CONTADO) — it is never omitted, unlike the customer section which remains conditional on `customerId`

#### Scenario: Fallback to 30 days when a credit sale's customer has no creditDays set
- **WHEN** the sale is paid on credit (`sale.isCredit: true`) and `customerCreditDays` is `null` (a data inconsistency that business rules at sale creation should already prevent)
- **THEN** the printed ticket shows "Condiciones: Crédito a 30 días" instead of breaking the render or showing a blank/`NaN` value

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

#### Scenario: Page height matches the expected rendered content, not a fixed oversized value
- **WHEN** the print view renders
- **THEN** the injected CSS declares `@page { size: <paperWidth> <alturaTotal>mm; margin: <margenTop>mm 3mm 4mm 3mm; }`, where `<alturaTotal>` is `computeTicketPageHeightMm(sale)` plus the extra top margin defined in the "Margen superior adicional proporcional al alto del ticket" requirement, and `computeTicketPageHeightMm(sale)` is derived deterministically from the sale's own content — a base height covering fixed sections (logo, business header, ticket meta, totals, footer, legend, barcode), plus a fixed amount per item line in `sale.items`, plus a conditional amount for the customer section (when `sale.customerId` is set), plus a fixed amount for the conditions line (now always present, since "Condiciones" is unconditional — see Requirement above), plus a fixed safety margin — NOT a fixed literal like `3276mm` — so that printers/drivers using a fixed physical page (Letter/A4) or "Save as PDF" do not trigger a disproportionate fit-to-page shrink of the printed content

#### Scenario: Height calculation requires no DOM measurement or print-event timing
- **WHEN** the print view renders (before, during, or independent of any print event)
- **THEN** the content height, the extra top margin, and the total `@page` height are all available immediately from the already-loaded `sale` data — the calculation never depends on `getBoundingClientRect()`, `ref`s, or the `beforeprint`/print pipeline timing, so it can never resolve to `undefined`/`NaN` or race with `window.print()`

#### Scenario: Long ticket does not split across pages
- **WHEN** a ticket has enough item lines to exceed a standard Letter/A4 page height
- **THEN** it still prints as a single continuous page — the calculated `@page` total height grows with `sale.items.length` and the proportional extra top margin, while keeping the same content margin available as with the base margin alone, so no content is cut off across multiple physical pages

#### Scenario: Print view hidden outside of printing
- **WHEN** the page is viewed normally on screen (not printing)
- **THEN** the printable ticket component is not visible and does not affect the normal page layout

#### Scenario: Settings fetch failure degrades gracefully
- **WHEN** `GET /settings/ticket` fails (network error, missing `settings:read`, etc.)
- **THEN** the print view still renders with the sale data, omitting logo/footer/business (name, RFC, address, phone, tax regime)/legend (falling back to `80mm` width, and `@page` sized to that fallback width with the same dynamically-calculated height) rather than blocking the print action entirely

#### Scenario: Logo rendered at 125x77px
- **WHEN** the printed ticket renders its logo (either `logoUrl` from settings or the `/logo.png` fallback)
- **THEN** the `img` is sized to 125px wide × 77px tall with `object-fit: contain` so the aspect ratio is preserved (no distortion)

#### Scenario: Browser print declares page margins (verified for PDF export, not guaranteed on physical printers)
- **WHEN** the ticket prints via `window.print()` (browser mode)
- **THEN** the CSS `@page` rule declares `margin: <margenTop>mm 3mm 4mm 3mm` (margen superior = 4mm + 5% del alto de contenido, laterales 3mm, inferior 4mm); the `.printable-ticket` container also declares `position: absolute !important; top: 0 !important; left: 0 !important` as a harmless reinforcement — verified byte-identical with/without it when generating an actual PDF (`page.pdf({ preferCSSPageSize: true })`), which exercises Chromium's PDF-export pipeline only. Confirmado en hardware real (Windows, thermal printer with a correctly configured custom/roll paper size) that printing to a physical printer goes through a different native print pipeline that can still center the content vertically regardless of this CSS — see Requirement "Anclaje superior del ticket en impresión térmica" for the confirmed limitation and the recommended `printMode: 'escpos'` resolution

#### Scenario: ESC/POS print mode bypasses window.print()
- **WHEN** the sale's branch has `printMode: 'escpos'` configured and the cashier clicks "Imprimir Ticket"
- **THEN** the browser builds the ticket content as a JSON job (same sections and order as the HTML path) and POSTs it to the local agent, without ever calling `window.print()` or rendering the `PrintableTicket` HTML for printing

#### Scenario: Browser print remains the default when no ESC/POS printer is configured
- **WHEN** the sale's branch has no printer configuration, or has `printMode: 'browser'`
- **THEN** clicking "Imprimir Ticket" invokes `window.print()` exactly as before this change — no regression for branches that don't need ESC/POS

#### Scenario: ESC/POS failure surfaces a retry-or-fallback choice
- **WHEN** the local agent does not respond within the configured timeout, or the connection is refused
- **THEN** the cashier sees a clear error message with two explicit actions: "Reintentar" (retry the ESC/POS job) and "Imprimir desde el navegador" (fall back to the existing `window.print()` flow) — the system never retries against the agent automatically or silently

#### Scenario: Driver margin configuration recommended for persistent margins
- **WHEN** an administrator configures a thermal printer (ej. EPSON TM-T20II)
- **THEN** the spec recommends setting margins in the printer driver: Printing Preferences → Paper/Quality → Margins → User Defined (ej. 3mm left/right, 4mm top/bottom) as a persistent per-device solution that complements the CSS margins and works regardless of browser/print path

### Requirement: Márgenes de página en la vista previa del ticket
La vista previa del ticket de venta (`/sales/[id]/ticket`) SHALL usar el mismo padding de página (horizontal y vertical) que el resto de las pantallas del panel bajo `app/(private)/`.

#### Scenario: Padding estándar al cargar la vista previa
- **WHEN** un cajero navega a `/sales/[id]/ticket` de una venta existente
- **THEN** el contenedor raíz de la vista previa tiene padding vertical y horizontal equivalente al usado por `PageShell` en el resto del sistema (`px-gutter`/`py-lg`, 24px)

#### Scenario: Padding no se rompe con secciones opcionales o siempre presentes
- **WHEN** la venta previsualizada incluye la sección opcional de datos de cliente y la línea de Condiciones (siempre presente, crédito o CONTADO)
- **THEN** el padding de página se mantiene consistente y no se duplica ni se anula por el espaciado entre bloques (`space-y-4`) del contenido interno
