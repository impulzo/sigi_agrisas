# sales-ticket-print-rework

## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Administrador (`sales:read`) | Como usuario que consulta una venta, quiero un único acceso al ticket desde el detalle ("Ver Ticket", con el botón "Imprimir Ticket" dentro de la vista del ticket) para eliminar la duplicidad entre "Imprimir ticket" y "Ver Ticket" | - Given una venta en `/sales/:id` con cualquier `status` (`completed`/`cancelled`/`edited`), when reviso las acciones, then solo existe "Ver Ticket" (sin botón "Imprimir ticket" redundante).<br>- Given estoy en `/sales/:id/ticket`, when reviso la vista, then hay un botón "Imprimir Ticket" en la parte inferior del ticket.<br>- Given hago clic en "Ver Ticket" desde `/sales/:id`, when navego, then llego a `/sales/:id/ticket` con los datos de la misma venta. | - Mismo gate `sales:read` y branch scoping que ya protegen `/sales/:id`; sin permiso nuevo. |
| 2 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero que la impresión contenga solo el diseño del ticket (sin el menú, la barra de navegación, los botones ni otros detalles de la UI) para entregar un comprobante limpio | - Given el usuario dispara la impresión desde `/sales/:id/ticket`, when se genera el print, then solo aparece el ticket; la tarjeta de vista previa, el back link, los botones de acción y el navigation rail quedan ocultos.<br>- Given la página se ve en pantalla (sin imprimir), when la reviso, then todo el diseño Stitch y la UI se ven normal, sin cambios. | - El print usa exclusivamente los datos ya cargados de esa venta (`useSaleDetail`); no expone datos de otra venta ni de otro cliente. |
| 3 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero que funcione como ticket de POS para impresora térmica (formato y diseño) para que el comprobante físico se ajuste al papel térmico | - Given `paperWidth: "58mm"` configurado, when se imprime, then el CSS `@media print` usa 58mm (default 80mm).<br>- Given la venta tiene items, when se imprime, then el ticket muestra marca Agrisas, folio, fecha, cajero, sucursal, items (nombre, cantidad × precio, total), método de pago, Subtotal/IVA/IEPS (siempre líneas separadas aunque $0)/Total, footer y folio con elemento decorativo tipo código de barras.<br>- Given falla el fetch de `GET /settings/ticket`, when se imprime, then el ticket degrada con gracia (sin logo/header/footer, ancho 80mm) sin bloquear la impresión. | - El ancho de papel proviene de `settings` global (no por sucursal); la vista imprimible no inyecta código ni depende de hardware específico (solo `window.print()` + `@media print`). |
| 4 | Cajero/Administrador (`sales:read`) | Como usuario que revisa el ticket en pantalla, quiero que la vista previa respete el diseño Stitch (diseño del ticket dentro de la tarjeta/modal) y que lo que se imprime sea solo el ticket térmico, no la tarjeta de color | - Given veo `/sales/:id/ticket` en pantalla, then se muestra la tarjeta con el diseño de marca Stitch (logo, header, items, Subtotal/IVA/IEPS, Total, método de pago, footer, código de barras decorativo).<br>- Given imprimo desde la vista previa, then el output físico es el ticket térmico monospace/monocromo con contenido alineado a la tarjeta (marca, método de pago, folio al final), no la tarjeta Stitch de color a todo lo ancho. | - Misma protección que `/sales/:id` (gate `sales:read`); la tarjeta de pantalla reusa `SaleDetail` ya cargado, sin fetch adicional. |

## Why

Tras la revisión con el cliente se detectaron dos fricciones en el flujo de ticket de venta: (1) en el detalle de la venta conviven dos acciones redundantes —"Imprimir ticket" y "Ver Ticket"— que disparan exactamente la misma impresión, y (2) `window.print()` imprime toda la UI (navigation rail, botones, tarjeta de vista previa) porque no existe CSS de impresión global que aísle el ticket; el cliente quiere un único punto de entrada al ticket ("Ver Ticket") con el botón de imprimir dentro de la vista, y una impresión limpia tipo POS térmico que respete el diseño de marca definido en Stitch (la tarjeta de pantalla se conserva tal cual; el output físico es el ticket térmico con el mismo contenido).

## What Changes

- **`/sales/:id`** (`SaleDetailPage`): se elimina el botón "Imprimir ticket" (redundante). Permanece solo el enlace "Ver Ticket" hacia `/sales/:id/ticket`. Se conserva el `PrintableTicket` montado para que Ctrl+P en el detalle siga imprimiendo únicamente el ticket.
- **`/sales/:id/ticket`** (`TicketPreviewPage`): la tarjeta con el diseño Stitch se mantiene como vista previa de pantalla. El botón "Imprimir Ticket" (parte inferior) sigue disparando `window.print()`, ahora sobre el ticket térmico aislado.
- **`PrintableTicket.tsx`**: se alinea el contenido del ticket térmico al diseño Stitch: marca "Agrisas", método de pago, folio al final con elemento decorativo tipo código de barras (CSS `repeating-linear-gradient`, monocromo). Se mantiene monospace, ancho configurable `58mm`/`80mm`, logo/header/footer desde `GET /settings/ticket`, Subtotal/IVA/IEPS siempre como líneas separadas, y el patrón `hidden print:block`.
- **`globals.css`**: nuevo bloque global `@media print` que oculta `body` y hace visible únicamente `.print-area` (el ticket), aislando la impresión del resto de la UI en cualquier página.
- **Specs**: se actualizan `ticket-print-ui` (la acción de impresión vive en la vista de ticket, no en el detalle) y `sales-ticket-preview-ui` (el print es térmico alineado a Stitch; la tarjeta Stitch es solo pantalla; aislamiento de impresión).

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `ticket-print-ui`: el botón de impresión ya no vive en `/sales/:id` sino en `/sales/:id/ticket`; el print aísla la UI y el ticket térmico alinea su contenido al diseño Stitch (marca, método de pago, folio al final).
- `sales-ticket-preview-ui`: la acción de impresión de la vista previa produce el ticket térmico aislado (solo el ticket, sin la UI circundante) con contenido alineado al diseño Stitch; la tarjeta Stitch de color sigue siendo solo de pantalla.

## Impact

- **Frontend**: `app/(private)/sales/_blocks/SaleDetailPage.tsx` (eliminar botón redundante), `app/(private)/sales/_blocks/PrintableTicket.tsx` (alinear contenido a Stitch + clase `print-area`), `app/globals.css` (aislamiento `@media print`).
- **Sin backend**: no cambian endpoints, RBAC ni branch scoping. Se reutiliza `PrintableTicket.tsx` (sin crear componente de impresión nuevo).
- **Tests**: `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` (casos nuevos de contenido alineado), `tests/unit/ui/(private)/sales/_blocks/SaleDetailPage.test.tsx` (botón redundante ausente / "Ver Ticket" presente), nuevo e2e `tests/e2e/sales-ticket-print.spec.ts`.
- **Specs**: deltas de `ticket-print-ui` y `sales-ticket-preview-ui`.
