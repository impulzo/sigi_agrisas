## Context

`PrintableTicket.tsx:31-37` inyecta CSS `@media print` con `width: ${paperWidth}` sobre el contenedor `.printable-ticket`, pero nunca declara la regla `@page` que controla el tamaño de página que usa el diálogo de impresión del navegador. `paperWidth` viene de `TicketSettings.paperWidth` (`"58mm" | "80mm"`, default `"80mm"`), configurable en `/settings` → Ticket. Responde a la única fila de la Historia de Usuario en `proposal.md`: sin `@page`, el navegador usa Carta/A4 por defecto y una impresora térmica real pagina/corta mal.

## Goals / Non-Goals

**Goals:**
- Que el tamaño de página (`@page`) coincida con `paperWidth`, usando el mismo valor ya en scope (sin segunda fuente de verdad).
- Alto de página fijo en `3276mm` (máximo estándar de rollo continuo térmico) para que el ticket imprima como una sola tira sin importar cuántas líneas de producto tenga.
- Margen `0` para aprovechar todo el ancho del rollo.

**Non-Goals:**
- No se cambia el mecanismo de impresión (`window.print()` nativo del navegador) ni se introduce una librería de impresión térmica (ESC/POS, etc.) — fuera de alcance, el cliente pidió corregir el tamaño de página, no cambiar el mecanismo.
- No se toca el ancho de 58mm/80mm en sí (`ticket-print-ui` ya lo cubre correctamente) — solo se añade el tamaño de página que faltaba.
- No se modifica `TicketSettingsForm.tsx` ni el modelo `TicketSettings` — `paperWidth` ya existe y ya se valida como `"58mm" | "80mm"`.

## Decisions

**D1 — `@page { size: ${paperWidth} 3276mm; margin: 0; }` dentro del mismo `<style>` ya inyectado, no un `<style>` separado.**
Mantiene una sola fuente de verdad para `paperWidth` (la misma variable que ya define `.printable-ticket { width: ... }`) — evita que un cambio futuro actualice un valor y olvide el otro.

**D2 — Alto de página fijo en `3276mm`, no dinámico según contenido.**
`3276mm` es el valor estándar usado por navegadores/impresoras térmicas para "rollo continuo" (equivalente a "sin límite práctico" para un ticket de POS). Calcular el alto real del contenido en JS agregaría complejidad (medir DOM antes de imprimir) sin beneficio — el navegador ya trunca la página física al contenido real cuando el alto declarado excede lo necesario, así que un valor fijo alto es seguro y es exactamente lo que pidió el cliente ("80 X 3276 mm").

**D3 — No tocar `globals.css` a menos que se confirme un conflicto real.**
`.print-area { position: absolute; top: 0; left: 0; }` (`globals.css:89-105`) ya posiciona el contenido en la esquina superior — en principio compatible con `@page { margin: 0 }`. Se revisa en `tasks.md` con una impresión de prueba (vista previa de impresión del navegador) antes de decidir si requiere ajuste; no se asume el conflicto de antemano.

## Risks / Trade-offs

- **[Riesgo]** Distintos navegadores/impresoras interpretan `@page { size }` con ligeras diferencias (Chrome vs. Firefox vs. drivers de impresora térmica que ignoran el tamaño de página y usan su propio ancho configurado en el driver). → **Mitigación:** el fix corrige el caso mayoritario (Chrome, que es el navegador soportado por el panel per stack); comportamiento de otros navegadores queda fuera de alcance salvo que el cliente reporte un caso específico.
- **[Riesgo]** Cambiar `@page` podría interactuar con la vista previa de impresión (`TicketPreviewPage.tsx`, que también usa `window.print()`) de forma distinta a la esperada. → **Mitigación:** `PrintableTicket` es el único componente que renderiza el markup impreso real (ambas vistas lo reutilizan vía `.print-area`), así que el fix aplica automáticamente a ambos flujos sin cambio adicional — se verifica en `tasks.md`.

## Migration Plan

No aplica — cambio de solo CSS, sin migración de datos ni flag de despliegue. Deploy estándar del branch.
