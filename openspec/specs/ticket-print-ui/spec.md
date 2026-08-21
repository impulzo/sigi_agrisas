# Spec: ticket-print-ui

## Purpose

Impresión del ticket de una venta desde su vista de detalle (`/sales/:id`), vía el diálogo nativo de impresión del navegador (`window.print()`), sin dependencias de hardware/software adicional. Ajustado al ancho de papel configurado globalmente en `settings-api`.

---
## Requirements
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

#### Scenario: Page height matches the expected rendered content, not a fixed oversized value
- **WHEN** the print view renders
- **THEN** the injected CSS declares `@page { size: <paperWidth> <alturaCalculada>mm; margin: 0; }`, where `<alturaCalculada>` is derived deterministically from the sale's own content — a base height covering fixed sections (logo, business header, ticket meta, totals, footer, legend, barcode), plus a fixed amount per item line in `sale.items`, plus conditional amounts for the customer section (when `sale.customerId` is set) and credit conditions line (when `sale.customerCreditDays` is not null), plus a fixed safety margin — NOT a fixed literal like `3276mm` — so that printers/drivers using a fixed physical page (Letter/A4) or "Save as PDF" do not trigger a disproportionate fit-to-page shrink of the printed content

#### Scenario: Height calculation requires no DOM measurement or print-event timing
- **WHEN** the print view renders (before, during, or independent of any print event)
- **THEN** the calculated `@page` height is available immediately from the already-loaded `sale` data — the calculation never depends on `getBoundingClientRect()`, `ref`s, or the `beforeprint`/print pipeline timing, so it can never resolve to `undefined`/`NaN` or race with `window.print()`

#### Scenario: Long ticket does not split across pages
- **WHEN** a ticket has enough item lines to exceed a standard Letter/A4 page height
- **THEN** it still prints as a single continuous page — the calculated `@page` height grows with `sale.items.length` and always exceeds the expected rendered content height by the safety margin, so no content is cut off across multiple physical pages

#### Scenario: Print view hidden outside of printing
- **WHEN** the page is viewed normally on screen (not printing)
- **THEN** the printable ticket component is not visible and does not affect the normal page layout

#### Scenario: Settings fetch failure degrades gracefully
- **WHEN** `GET /settings/ticket` fails (network error, missing `settings:read`, etc.)
- **THEN** the print view still renders with the sale data, omitting logo/footer/business (name, RFC, address, phone, tax regime)/legend (falling back to `80mm` width, and `@page` sized to that fallback width with the same dynamically-calculated height) rather than blocking the print action entirely

#### Scenario: Logo rendered at 75x105px
- **WHEN** the printed ticket renders its logo (either `logoUrl` from settings or the `/logo.png` fallback)
- **THEN** the `img` is sized to 75px wide × 105px tall with `object-fit: contain` so the aspect ratio is preserved (no distortion)

### Requirement: Márgenes de página en la vista previa del ticket
La vista previa del ticket de venta (`/sales/[id]/ticket`) SHALL usar el mismo padding de página (horizontal y vertical) que el resto de las pantallas del panel bajo `app/(private)/`.

#### Scenario: Padding estándar al cargar la vista previa
- **WHEN** un cajero navega a `/sales/[id]/ticket` de una venta existente
- **THEN** el contenedor raíz de la vista previa tiene padding vertical y horizontal equivalente al usado por `PageShell` en el resto del sistema (`px-gutter`/`py-lg`, 24px)

#### Scenario: Padding no se rompe con secciones opcionales
- **WHEN** la venta previsualizada incluye secciones opcionales (datos de cliente, condiciones de crédito)
- **THEN** el padding de página se mantiene consistente y no se duplica ni se anula por el espaciado entre bloques (`space-y-4`) del contenido interno

### Requirement: Proporción y margen del logo consistentes entre preview e impresión
El logo del negocio SHALL renderizarse con la misma proporción apaisada (~1.63:1, acorde al aspect ratio del asset real) y el mismo margen inferior visible, tanto en la vista previa en pantalla como en el ticket impreso.

#### Scenario: Misma proporción de caja en preview e impresión
- **WHEN** se renderiza el logo (`ticketSettings.logoUrl` o el fallback `/logo.png`) en la vista previa y en el markup de impresión (`PrintableTicket`)
- **THEN** ambos usan una caja con proporción apaisada consistente con el aspect ratio real del logo, sin que `object-fit: contain` deje espacio vacío interno por una caja de orientación incorrecta (retrato)

#### Scenario: Margen visible entre logo y datos del negocio
- **WHEN** se mide el espacio entre el borde inferior del logo renderizado y el bloque de datos del negocio (nombre, RFC, dirección, teléfono, régimen fiscal) inmediatamente debajo
- **THEN** existe un margen visible y no residual (mayor al valor casi nulo previo de 2.4px impresión / 4.8px preview) y ese margen es el mismo en ambos contextos

### Requirement: Anclaje superior del ticket en impresión térmica
El contenido imprimible del ticket SHALL quedar anclado a la esquina superior izquierda de la página de impresión calculada, sin quedar centrado verticalmente, y sin que ningún estilo intermedio reintroduzca un `margin`/`position` que lo recentre.

#### Scenario: Anclaje top-left en la vista de impresión del navegador
- **WHEN** el cajero ejecuta `window.print()` desde la vista previa y se abre el diálogo/vista de impresión del navegador
- **THEN** el contenido de `.printable-ticket`/`.print-area` aparece anclado en `top: 0; left: 0` del `@page` calculado por `computeTicketPageHeightMm`, sin margen ni centrado vertical introducido por CSS del propio sistema

#### Scenario: Centrado remanente por limitación de driver/impresora queda fuera de alcance
- **WHEN** tras el refuerzo de CSS el ticket sigue apareciendo centrado en una impresora térmica física, debido a que el driver/SO usa un tamaño de papel distinto al `@page` calculado
- **THEN** ese caso se documenta como limitación conocida en el change `document-thermal-print-limitation` y no bloquea el cierre de este change ni motiva más cambios de CSS en este alcance

