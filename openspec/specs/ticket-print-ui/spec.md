# Spec: ticket-print-ui

## Purpose

Impresión del ticket de una venta desde su vista de detalle (`/sales/:id`), vía el diálogo nativo de impresión del navegador (`window.print()`), sin dependencias de hardware/software adicional. Ajustado al ancho de papel configurado globalmente en `settings-api`.

---
## Requirements
### Requirement: Print ticket action on the ticket view
The system SHALL render the "Imprimir Ticket" action on `/sales/:id/ticket` (la vista de ticket), visible bajo el mismo permiso `sales:read` que ya gatea `/sales/:id` (sin permiso nuevo). La acción SHALL ubicarse en la parte inferior del ticket. Al hacer clic, el sistema SHALL imprimir únicamente el ticket térmico (`PrintableTicket`) — sin cargar en la impresión la barra de navegación, el back link, los botones de acción ni la tarjeta de vista previa. El contenido impreso SHALL incluir, en orden de secciones: logo de Agrisas (`logoUrl` de `GET /settings/ticket` o el logo embebido `/logo.png` como fallback — el logo nunca se omite), header de negocio (razón social `businessName`, RFC `businessRfc`, dirección, "Tel. <phone>" y régimen fiscal desde `GET /settings/ticket`, omitiendo los campos nulos) — SIN texto de encabezado libre entre el logo y este bloque, `folioCode`, fecha, vendedor (etiqueta "Vendedor" sobre `cashierName`), sucursal, método de pago, sección cliente (RFC, nombre y dirección — SOLO si la venta tiene `customerId`), condiciones de crédito ("Condiciones: Crédito a <N> días" — SOLO si `customerCreditDays` no es null), items (nombre de producto, cantidad, precio unitario, total de línea), totales (subtotal, IVA e IEPS — ambos SIEMPRE como líneas separadas independientemente de su valor — y "Total a pagar"), footer, leyenda de revisión de mercancía (desde `GET /settings/ticket.legendText`, omitida si es null), y el folio (`folioCode` completo, con su prefijo/formato — nunca solo el número) como elemento decorativo tipo código de barras. El sistema NO SHALL renderizar la etiqueta "Cajero" en el ticket impreso (se usa "Vendedor"). El sistema NO SHALL renderizar ningún párrafo de "texto de encabezado" — ese campo fue eliminado de `TicketSettings`; el bloque de datos del negocio ocupa el espacio inmediatamente debajo del logo. Si la sucursal de la venta tiene configurado `printMode: 'escpos'` (ver capability `escpos-ticket-printing`), la impresión SHALL enviar el mismo contenido, en el mismo orden de secciones, como un job ESC/POS al agente local, SIN invocar `window.print()`; en cualquier otro caso (sin configuración, o `printMode: 'browser'`) la impresión SHALL invocar `window.print()` como hasta ahora. Para impresión browser, el CSS `@page` SHALL declarar un margen de cuatro valores (`top right bottom left`): margen inferior 4mm, laterales 3mm, y margen superior igual a 4mm más un margen adicional proporcional al alto del ticket (ver Requirement "Margen superior adicional proporcional al alto del ticket"); el alto total declarado en `@page size` SHALL crecer en esa misma cantidad adicional, de modo que el área imprimible disponible para el contenido no se reduzca. El contenedor `.printable-ticket` SHALL usar `position: absolute !important; top: 0 !important; left: 0 !important` como refuerzo menor (verificado que no anula el margen de `@page` en el pipeline de exportación a PDF de Chromium — ver Requirement "Anclaje superior del ticket en impresión térmica" para el detalle y sus alcances/limitaciones). Este forcing y el margen calculado NO SHALL considerarse una garantía de anclaje superior al imprimir a una impresora física real vía `window.print()` — confirmado en hardware real que el pipeline nativo de impresión (distinto al de exportación a PDF) puede centrar el contenido pese a un driver correctamente configurado; para esos casos la resolución soportada es `printMode: 'escpos'`, no un ajuste adicional de este CSS.

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
- **THEN** the injected CSS declares `@page { size: <paperWidth> <alturaTotal>mm; margin: <margenTop>mm 3mm 4mm 3mm; }`, where `<alturaTotal>` is `computeTicketPageHeightMm(sale)` plus the extra top margin defined in the "Margen superior adicional proporcional al alto del ticket" requirement, and `computeTicketPageHeightMm(sale)` is derived deterministically from the sale's own content — a base height covering fixed sections (logo, business header, ticket meta, totals, footer, legend, barcode), plus a fixed amount per item line in `sale.items`, plus conditional amounts for the customer section (when `sale.customerId` is set) and credit conditions line (when `sale.customerCreditDays` is not null), plus a fixed safety margin — NOT a fixed literal like `3276mm` — so that printers/drivers using a fixed physical page (Letter/A4) or "Save as PDF" do not trigger a disproportionate fit-to-page shrink of the printed content

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
- **THEN** the CSS `@page` rule declares `margin: <margenTop>mm 3mm 4mm 3mm` (margen superior = 4mm + 5% del alto de contenido, laterales 3mm, inferior 4mm); the `.printable-ticket` container also declares `position: absolute !important; top: 0 !important; left: 0 !important` as a harmless reinforcement — verified byte-identical with/without it when generating an actual PDF (`page.pdf({ preferCSSPageSize: true })`), which exercises Chromium's PDF-export pipeline only. Confirmed on real hardware (Windows, thermal printer with a correctly configured custom/roll paper size) that printing to a physical printer goes through a different native print pipeline that can still center the content vertically regardless of this CSS — see Requirement "Anclaje superior del ticket en impresión térmica" for the confirmed limitation and the recommended `printMode: 'escpos'` resolution

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
El contenido imprimible del ticket SHALL usar `position: absolute !important; top: 0 !important; left: 0 !important` en `.printable-ticket` como refuerzo menor contra drivers de impresoras térmicas que pudieran sustituir el layout normal por uno propio. Este forcing fue introducido por `document-thermal-print-limitation`, removido por `add-ticket-print-margins`, y reinstalado por `refine-thermal-ticket-print-layout` tras verificar (generando PDFs reales con Playwright, `page.pdf({ preferCSSPageSize: true })`, comparados byte a byte con y sin el forcing) que es inofensivo para el pipeline de exportación a PDF de Chromium — no anula el margen de `@page` en ese pipeline.

**Limitación confirmada en hardware real**: esa verificación ejercita el pipeline de exportación a PDF de Chromium ("Guardar como PDF"), que SÍ respeta `@page` fielmente. Imprimir a una impresora física registrada en el sistema operativo pasa por un pipeline distinto (integración nativa Chromium↔OS, ej. GDI en Windows), que NO se probó con esa verificación. Confirmado en hardware real (Windows, impresora térmica con el driver correctamente configurado en tamaño personalizado/rollo continuo — no un tamaño fijo tipo Carta/A4), imprimiendo vía el diálogo nativo de `window.print()`: el ticket sale **centrado verticalmente en la hoja física**, no anclado arriba con el margen declarado. Ninguna combinación de `position`/`margin`/`top`/`left` en el CSS de la página previene esto, porque el centrado ocurre en el pipeline nativo de impresión cuando el tamaño de página seleccionado en el diálogo de impresión no coincide exactamente con el `@page size` calculado (que varía por venta) — es comportamiento del pipeline de impresión de Chromium/SO sobre el medio físico, fuera del alcance de CSS de la página.

Por lo tanto, el forcing `top:0/left:0` y el margen calculado SHALL seguir declarados (no tienen costo ni riesgo, y sí ayudan en el pipeline de exportación a PDF/impresoras virtuales), pero NO SHALL considerarse una solución completa de anclaje para impresión a hardware físico real vía `window.print()`. Para sucursales que presenten el síntoma de centrado pese a tener el driver correctamente configurado, la solución recomendada y ya soportada por el sistema SHALL ser cambiar esa sucursal a `printMode: 'escpos'` (ver capability `escpos-ticket-printing`), que evita `window.print()` y el pipeline nativo de impresión por completo, enviando el contenido directo al agente local.

#### Scenario: Anclaje respeta el margen de @page al exportar a PDF
- **WHEN** se genera el PDF de impresión (ej. "Guardar como PDF" desde el diálogo de `window.print()`, o `page.pdf()` en verificación automatizada)
- **THEN** el contenido de `.printable-ticket` aparece anclado dentro del margen declarado por `@page` (no en la esquina física de la página, no centrado) — verificado generando el PDF real con Playwright y comparando byte a byte con y sin el forcing `top:0/left:0`

#### Scenario: El forcing de anclaje es inofensivo pero no resuelve el pipeline de impresión nativa
- **WHEN** se evalúa si `top: 0 !important; left: 0 !important` en `.printable-ticket` interfiere con el margen de `@page` en el pipeline de exportación a PDF
- **THEN** no interfiere (verificado byte a byte, PDFs idénticos con y sin el forcing) — pero esta verificación no cubre el pipeline de impresión a impresora física real vía el SO, que es donde se confirmó el síntoma de centrado (ver siguiente scenario)

#### Scenario: Refuerzo de ancho y box-sizing sigue vigente para impresoras térmicas de red
- **WHEN** se imprime desde una impresora térmica configurada como impresora de sistema (ej. EPSON TM-T20II, 80mm, conectada por red)
- **THEN** `.printable-ticket` y sus hijos (`.printable-ticket *`) usan `box-sizing: border-box`, reduciendo la probabilidad de que el driver reescale el contenido por desborde de ancho — este refuerzo de ancho es independiente del anclaje vertical y no se ve afectado por la limitación documentada arriba

#### Scenario: Confirmado en hardware real — browser print puede centrar el ticket pese a driver correctamente configurado
- **WHEN** se imprime un ticket vía `window.print()` a una impresora térmica física en Windows, con el driver configurado en tamaño personalizado/rollo continuo (no un tamaño fijo)
- **THEN** el ticket puede salir centrado verticalmente en la hoja física en vez de anclado arriba — confirmado en prueba de hardware real; no es un defecto de CSS corregible en el path browser, sino una limitación del pipeline nativo de impresión de Chromium/SO cuando el tamaño de página del diálogo no coincide exactamente con el `@page` calculado por venta

#### Scenario: ESC/POS es la solución recomendada para sucursales con este síntoma
- **WHEN** una sucursal reporta el ticket centrado (en vez de anclado arriba) pese a tener el driver de su impresora térmica correctamente configurado
- **THEN** la resolución recomendada y soportada es configurar esa sucursal con `printMode: 'escpos'` (ver capability `escpos-ticket-printing`), que evita `window.print()`/el pipeline nativo de impresión por completo — no se requiere ni existe un ajuste adicional de CSS/JS en el path browser para este síntoma

### Requirement: Robustez del ancho y del corte final ante sustitución de tamaño de página por el driver
El contenido imprimible del ticket SHALL evitar que el driver de la impresora térmica reescale o corte el contenido cuando sustituye el tamaño de página custom calculado por uno propio, reforzando tanto el ancho declarado como el espacio final antes del corte automático, calibrado para no dejar papel en blanco sobrante perceptible.

#### Scenario: Ancho de contenido no se desborda ni fuerza reescalado del driver
- **WHEN** se imprime con `paperWidth: "80mm"` (o `"58mm"`) configurado en `TicketSettings`, en una impresora térmica real como la EPSON TM-T20II
- **THEN** `.printable-ticket` usa `box-sizing: border-box` y ningún elemento interno (imagen, tabla, párrafo) se desborda del ancho declarado, de modo que el driver no necesite reescalar ni recortar el contenido para hacerlo caber

#### Scenario: Margen de "feed" final y colchón de seguridad calibrados sin generar papel en blanco sobrante
- **WHEN** el ticket termina de imprimir su contenido (footer, leyenda, folio decorativo)
- **THEN** se añade un espacio de feed explícito al final del contenido imprimible y el colchón de seguridad de altura calculada (`SAFETY_MARGIN_MM=15mm` + `FINAL_FEED_MM=6mm`) se mantiene lo suficientemente amplio para que el auto-cutter no corte la última línea de contenido, pero lo suficientemente ajustado para no imprimir una hoja/página en blanco adicional perceptible al final

#### Scenario: Calibración válida tanto para tickets cortos como largos
- **WHEN** se imprime un ticket con pocas líneas de producto y otro con muchas líneas
- **THEN** en ambos casos el ancho permanece dentro del declarado y el feed final es suficiente, sin depender de medición DOM ni de timing de `beforeprint` (la altura sigue derivándose únicamente de los datos ya cargados de la venta)

#### Scenario: Verificación final pendiente de confirmación en hardware real
- **WHEN** este refuerzo de ancho, feed final y colchón recalibrado se despliega sin una impresora física TM-T20II disponible en el entorno de desarrollo
- **THEN** el cierre de este change queda condicionado a que el cliente confirme en la impresora física que ya no hay recorte de contenido, hoja en blanco sobrante, ni desajuste de ancho

### Requirement: Margen superior adicional proporcional al alto del ticket
Además del margen base declarado en `@page` (4mm superior/inferior, 3mm laterales), el ticket impreso vía navegador SHALL sumar un margen superior adicional equivalente al 5% de la altura de contenido calculada (`computeTicketPageHeightMm(sale)`), de modo que tickets con más líneas de producto (y por tanto más altos) reciban proporcionalmente más espacio de aire en la parte superior antes del primer contenido impreso. Este margen adicional SHALL aplicarse únicamente al margen superior (top) usando la forma abreviada de 4 valores de la propiedad CSS `margin` (`top right bottom left`) — el margen inferior (4mm) y los laterales (3mm) permanecen sin cambios. El alto físico total declarado en `@page size` SHALL crecer en la misma cantidad que el margen superior adicional, de modo que el área imprimible disponible para el contenido (alto total menos márgenes) permanezca sin reducirse respecto al cálculo base.

#### Scenario: El margen superior crece con tickets más largos
- **WHEN** un ticket tiene más líneas de producto (mayor `sale.items.length`)
- **THEN** el margen superior adicional (5% de la altura de contenido calculada) es proporcionalmente mayor que en un ticket corto, mientras el margen inferior y los laterales permanecen fijos en 4mm y 3mm respectivamente

#### Scenario: El margen adicional no reduce el área imprimible para el contenido
- **WHEN** se calcula el alto total de `@page size`
- **THEN** éste crece exactamente en la misma cantidad que el margen superior adicional, de forma que el espacio disponible para el contenido (alto total − margen superior − margen inferior) es idéntico al que existiría si solo se aplicara el margen base de 4mm arriba y abajo

#### Scenario: El cálculo sigue siendo puro sobre los datos de la venta
- **WHEN** se calculan el margen superior adicional y el alto total de página
- **THEN** ambos se derivan matemáticamente de `computeTicketPageHeightMm(sale)`, sin `ref`, sin `getBoundingClientRect()` ni dependencia de eventos de impresión (`beforeprint`)

