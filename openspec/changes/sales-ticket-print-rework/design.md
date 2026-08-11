# sales-ticket-print-rework — Design

## Context

Ver proposal.md — Why. Estado actual relevante (trazable a las historias 1-4 de la tabla):

- `SaleDetailPage.tsx` renderiza dos acciones sobre el ticket: "Ver Ticket" (Link a `/sales/[id]/ticket`) y "Imprimir ticket" (botón que llama `window.print()`). Ambas producen la misma impresión del `PrintableTicket` montado al final de la página (`hidden print:block`). Fila 1.
- `TicketPreviewPage.tsx` muestra la tarjeta de marca Stitch (solo pantalla) más los botones "Imprimir Ticket" (abajo) y "Enviar por Correo". Fila 4.
- `PrintableTicket.tsx` es el ticket térmico monospace con `@media print` inline (ancho `paperWidth` 58/80mm). Fila 3.
- **No existe CSS de impresión global**: `body` y toda la UI (navigation rail, botones, tarjeta) se imprimen junto con el ticket. Fila 2.
- Specs canónicas que cambian: `ticket-print-ui` y `sales-ticket-preview-ui`.

## Goals / Non-Goals

**Goals:**
- Un solo punto de entrada al ticket desde el detalle ("Ver Ticket"); la acción de impresión vive dentro de la vista de ticket (fila 1).
- La impresión aísla el ticket térmico del resto de la UI (fila 2).
- El ticket térmico sigue siendo apto para impresora POS (monospace, monocromo, 58/80mm) con contenido alineado al diseño Stitch (marca "Agrisas", método de pago, folio al final) (filas 3-4).
- La tarjeta Stitch de pantalla no se modifica ni se imprime tal cual (fila 4).

**Non-Goals:**
- No se cambia backend, RBAC (`sales:read`) ni branch scoping.
- No se convierte la vista de ticket en modal (decisión del usuario: se mantiene página completa).
- No se introduce librería de impresión térmica (se mantiene `window.print()` + `@media print`).
- No se cambia el diseño visual de la tarjeta Stitch en pantalla.

## Decisions

**D1 — Aislamiento de impresión global vía `@media print` + clase `.print-area` (fila 2).** Se agrega en `globals.css`:

```css
@media print {
  body { visibility: hidden; }
  .print-area { visibility: visible; position: absolute; top: 0; left: 0; width: 100%; }
  .print-area * { visibility: visible; }
}
```

El `PrintableTicket` raíz recibe la clase `print-area` (además de `hidden print:block`). Alternativa considerada: utilitarios Tailwind `print:hidden` sobre cada elemento de UI — descartada porque la barra de navegación vive en layouts ancestros fuera del control del componente de página; el enfoque `visibility` alcanza cualquier ancestro de una sola vez y no rompe el layout en pantalla.

**D2 — Eliminar el botón redundante en `SaleDetailPage` (fila 1).** Se quita el botón "Imprimir ticket"; queda el Link "Ver Ticket". El `PrintableTicket` montado al final del detalle se conserva: con D1, Ctrl+P sobre `/sales/:id` imprime solo el ticket sin cambios de layout en pantalla.

**D3 — Alinear `PrintableTicket` al diseño Stitch (filas 3-4).** Se mantiene monospace, `paperWidth` dinámico (mapa `58mm`/`80mm`, default `80mm`), `hidden print:block`, logo con fallback al logo embebido de Agrisas (`/logo.png` cuando `logoUrl` es `null`), header/footer condicionales (fallback sin romper layout), y Subtotal/IVA/IEPS/Total siempre separados. Se agrega: marca "Agrisas" (título), línea de método de pago, y folio al final con elemento decorativo tipo código de barras (CSS `repeating-linear-gradient` monocromo, sin librería de barcode — mismo patrón de la tarjeta Stitch). No se cambia la tarjeta Stitch de `TicketPreviewPage`.

**D4 — Sin nuevos endpoints ni permisos.** La impresión reusa datos ya cargados por `useSaleDetail`; `getTicketSettings` ya degrada con gracia en fallo (fila 3, criterio de seguridad: misma protección que `/sales/:id`).

## Risks / Trade-offs

- **[`@media print` con `visibility: hidden` en `body`]** → En navegadores antiguos puede dejar páginas en blanco si el `.print-area` no se posiciona; mitigación: `position: absolute` al inicio del documento. JSDOM no evalúa `@media print`, por lo que el comportamiento print se valida con Playwright (`page.emulateMedia({ media: 'print' })`), no en tests unitarios.
- **[Doble render de `PrintableTicket` en detalle y ticket]** → Coste mínimo (oculto en pantalla); ya es el patrón existente. No afecta layout.
- **[Imprimir contenido "alineado a Stitch" vs tarjeta de color]** → La impresión sigue siendo monocroma/térmica; el diseño de color Stitch solo se ve en pantalla (decisión explícita del usuario).
