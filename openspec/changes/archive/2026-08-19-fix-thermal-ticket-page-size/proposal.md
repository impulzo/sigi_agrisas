## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Operador (imprime tickets desde POS/detalle de venta) | Como Cajero, quiero que el ticket se imprima al tamaño de papel configurado (58mm o 80mm) en una tira continua sin márgenes, para que la impresora térmica lo corte correctamente sin desperdiciar rollo ni cortar contenido a la mitad | - Given `TicketSettings.paperWidth = "80mm"` (default), When se imprime un ticket desde `/sales/[id]` o `/sales/[id]/ticket`, Then el diálogo de impresión usa tamaño de página `80mm x 3276mm` con margen `0`, no Carta/A4.<br>- Given `TicketSettings.paperWidth = "58mm"`, When se imprime, Then el tamaño de página es `58mm x 3276mm`, margen `0` — el ancho de página sigue derivándose de la misma configuración que ya define el ancho del contenedor `.printable-ticket`, sin un segundo valor hardcodeado que pueda desalinearse.<br>- Given un ticket con muchas líneas de producto (contenido más alto que una hoja Carta), When se imprime, Then no se corta en una segunda página — imprime como una sola tira continua (alto `3276mm`, el máximo estándar de rollo continuo).<br>- Given el CSS existente `.print-area { position: absolute; top: 0; left: 0; }` en `globals.css`, When coexiste con la nueva regla `@page`, Then no se generan página en blanco adicional, offset o corte inesperado. | - No aplica RBAC/permisos: es una corrección de CSS de impresión, sin cambios de acceso a datos ni de superficie de API.<br>- No se expone ni transmite ningún dato nuevo — mismos datos ya renderizados en el ticket (`sale`, `ticketSettings`), sólo cambia cómo el navegador pagina el documento.<br>- Sin riesgo de inyección: `paperWidth` viene de `TicketSettings.paperWidth`, ya restringido por tipo a `"58mm" | "80mm"` en el dominio — no es texto libre interpolado sin validar. |

## Why

`PrintableTicket.tsx` (`app/(private)/sales/_blocks/PrintableTicket.tsx:31-37`) inyecta `width: ${paperWidth}` en `@media print`, pero nunca declara `@page`. Sin esa regla el navegador usa el tamaño de página por defecto del sistema (Carta/A4 en la mayoría de configuraciones), así que al imprimir en una impresora térmica real el contenido se pagina y corta como si fuera una hoja completa en vez de una tira continua de 58/80mm — el cliente reportó explícitamente este problema ("Tamaño del ticket, ver para impresora térmica - 80 X 3276 mm"). El ancho del contenido ya es correcto (configurable, cubierto por `ticket-print-ui`); falta que el tamaño de *página* del navegador coincida.

## What Changes

- `PrintableTicket.tsx`: agregar `@page { size: ${paperWidth} 3276mm; margin: 0; }` dentro del mismo bloque `<style>` que ya inyecta el CSS de impresión, derivado de la misma variable `paperWidth` en scope (sin segundo valor hardcodeado).
- Revisar `app/globals.css:89-105` (`.print-area { position: absolute; ... }`) por conflicto con la nueva regla `@page` — ajustar solo si se detecta incompatibilidad real (offset, página en blanco).
- Sin cambios de API, backend, ni de datos — CSS únicamente.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `ticket-print-ui`: el escenario "Paper width from settings is applied" (`openspec/specs/ticket-print-ui/spec.md:60-62`) sólo especifica el ancho del *contenido* (`@media print` CSS width). Se amplía ese requisito para exigir también que el navegador use ese mismo ancho como tamaño de *página* (`@page`), no sólo como ancho de contenido — cierra el vacío que permitió el bug.

## Impact

- `app/(private)/sales/_blocks/PrintableTicket.tsx`
- Posiblemente `app/globals.css` (solo si se detecta conflicto real con `.print-area`)
- Sin cambios de backend, API, ni migraciones.
