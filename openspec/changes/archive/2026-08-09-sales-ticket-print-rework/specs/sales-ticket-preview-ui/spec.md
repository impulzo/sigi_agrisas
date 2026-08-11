# sales-ticket-preview-ui

## MODIFIED Requirements

### Requirement: Print action on the preview page
The system SHALL render an "Imprimir Ticket" button on `/sales/:id/ticket`, ubicado en la parte inferior del ticket, que al hacer clic invoca `window.print()` usando el componente térmico EXISTENTE `PrintableTicket.tsx` (per `ticket-print-ui`) — NO el layout de la tarjeta Stitch. El diseño Stitch es solo para visualización en pantalla; nunca se envía a la impresora física tal cual. La impresión SHALL aislarse del resto de la UI: solo se imprime el ticket térmico, ocultando la barra de navegación, el back link, los botones de acción y la propia tarjeta de vista previa. El contenido del ticket térmico SHALL estar alineado al diseño Stitch (logo de Agrisas — `logoUrl` de settings o el logo embebido `/logo.png` como fallback —, marca "Agrisas", método de pago, folio al final con elemento decorativo tipo código de barras), manteniendo el formato monospace/monocromo con ancho configurable `58mm`/`80mm` (default `80mm`).

#### Scenario: Print button uses the thermal ticket, not the styled preview
- **WHEN** a user clicks "Imprimir Ticket" on `/sales/:id/ticket`
- **THEN** the print dialog opens with the monospace 80mm/58mm thermal layout, not the Stitch-branded on-screen layout

#### Scenario: Print output contains only the ticket
- **WHEN** the user triggers printing from `/sales/:id/ticket`
- **THEN** the print output contains only the thermal ticket (navigation rail, back link, action buttons, and the styled preview card are hidden), while on screen the full UI renders normally

#### Scenario: Thermal ticket content mirrors the Stitch design structure
- **WHEN** the user prints a sale with a payment method and folio
- **THEN** the thermal output shows the Agrisas logo (`logoUrl` or the embedded `/logo.png` fallback), the brand mark "Agrisas", the payment method name, and the folio at the bottom as a decorative barcode-style element, mirroring the structure of the on-screen Stitch card
