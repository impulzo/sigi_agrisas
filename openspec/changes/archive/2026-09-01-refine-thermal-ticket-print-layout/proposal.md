## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero / Operador POS | Como cajero, quiero que el ticket impreso tenga un margen superior extra proporcional a su largo para que el contenido no quede pegado al borde superior en tickets largos | Mejora legibilidad y presentación del comprobante físico | Given un ticket con N líneas de producto, When se imprime desde el navegador, Then el margen superior de `@page` es 4mm + 5% de la altura de contenido calculada (`computeTicketPageHeightMm`), y el alto total de `@page` crece en esa misma cantidad para no restarle espacio al contenido | Cambio puramente CSS/cálculo en cliente, sin nueva superficie de datos ni permisos nuevos |
| 2 | Cajero / Operador POS | Como cajero, quiero que ya no salga una hoja/página en blanco extra al final del ticket | Evita desperdicio de papel térmico y confusión al entregar el ticket al cliente | Given un ticket completo, When se imprime, Then el colchón fijo de altura (`SAFETY_MARGIN_MM` + `FINAL_FEED_MM`) baja de 47mm a 21mm, eliminando el sobrante perceptible sin cortar contenido | Mismo cálculo puro sobre `sale`, sin `getBoundingClientRect()` ni dependencia de `beforeprint` |
| 3 | Cajero / Operador POS | Como cajero, quiero que el ticket impreso desde el navegador tenga márgenes laterales y superior/inferior base para que el texto no quede cortado en los bordes del papel térmico | Evitar truncado de contenido en impresión térmica desde navegador (heredada de `add-ticket-print-margins`) | Given ticket listo para imprimir vía `window.print()`, When se imprime, Then CSS `@page` declara margen de 4 valores (top compensado, 3mm laterales, 4mm inferior) | Solo usuarios con `sales:read` acceden a impresión; cambio solo CSS |
| 4 | Cajero / Operador POS | Como cajero, quiero que el ticket no se recentre ni se corte por el driver de la impresora térmica EPSON TM-T20II | Impresoras térmicas de red pueden sustituir el tamaño de página custom por uno propio (heredada de `document-thermal-print-limitation`) | Given una EPSON TM-T20II configurada como impresora de sistema, When se imprime, Then el ancho declarado no se desborda (`box-sizing:border-box`) y el anclaje respeta el margen de `@page` (resolución formal: sin forzar `top:0!important;left:0!important`) | Refuerzo de robustez, sin impacto en datos de venta |
| 5 | Administrador / Cajero | Como administrador, quiero configurar por sucursal si el ticket se imprime vía navegador o vía un agente ESC/POS local | Sucursales cuyo driver de impresora térmica no respeta `@page` necesitan una vía directa ESC/POS (heredada de `add-escpos-ticket-printing`, feature completa) | Given una sucursal con `printMode:'escpos'` configurado, When se imprime, Then se envía un job JSON al agente local sin invocar `window.print()`; sin configuración, se usa el navegador como hoy | Endpoint de config bajo `settings:read`/`settings:write` + branch scoping; payload ESC/POS nunca incluye tokens/JWT |

## Why

Los 3 changes fusionados (`document-thermal-print-limitation`, `add-escpos-ticket-printing`, `add-ticket-print-margins`) fueron implementados en secuencia sobre el mismo bloque de CSS/altura de `PrintableTicket.tsx`, sin que ninguno se sincronizara nunca contra el canonical (`openspec/specs/ticket-print-ui/spec.md`), que quedó desactualizado (todavía muestra `@page margin: 0` y no menciona ESC/POS). Cada change pisó parcialmente al anterior:

- `document-thermal-print-limitation` forzó `top: 0 !important; left: 0 !important` en `.printable-ticket` para evitar que el driver de la EPSON TM-T20II re-centrara el contenido, y subió el colchón de altura (`SAFETY_MARGIN_MM` 20→35, `FINAL_FEED_MM` +12) para evitar corte de contenido.
- `add-ticket-print-margins` **removió** ese forcing de `top`/`left` para que `@page margin: 4mm 3mm` surtiera efecto visualmente, sin que nadie actualizara formalmente el requirement de anclaje del change anterior para reflejar esto — quedó un conflicto documentado solo implícitamente en el historial de código.
- `add-escpos-ticket-printing` agregó una feature completa e independiente (impresión ESC/POS por sucursal), pero copió el texto del requirement compartido "Print ticket action..." desde una versión vieja del spec (antes de los otros 2 changes), y su `tasks.md` (tarea 6.5) describe un estado del código (`@page size: auto`, sin `computeTicketPageHeightMm`) que fue revertido por un commit posterior y ya no es cierto.

Además, tras el despliegue de los 3, el cliente reporta dos problemas nuevos de layout: (a) el ticket necesita más aire en el borde superior, proporcional a su largo, y (b) el colchón de altura actual (35mm+12mm=47mm) es excesivo y produce una hoja/página en blanco extra al final.

Este change fusiona los 3 en uno solo para tener una única fuente de verdad consistente, resuelve formalmente (con verificación empírica en Playwright) el conflicto de anclaje entre el change de anclaje reforzado y el de márgenes, corrige la tarea desactualizada de `add-escpos-ticket-printing`, y agrega los 2 ajustes nuevos de layout pedidos.

## What Changes

- Fusiona los 3 folders de change activos (`document-thermal-print-limitation`, `add-ticket-print-margins`, `add-escpos-ticket-printing`) en uno solo; sus specs delta quedan reconciliadas en `ticket-print-ui` + `escpos-ticket-printing` (carry-over sin cambios de esta última).
- Resuelve formalmente, con verificación Playwright, el conflicto de anclaje `top:0 !important/left:0 !important` forzado vs `@page margin` — se mantiene sin ese forcing salvo que la verificación empírica demuestre lo contrario.
- Agrega margen superior adicional del 5% de la altura de contenido calculada, compensado en el alto total de `@page` para no reducir el área imprimible disponible para el contenido.
- Recalibra `SAFETY_MARGIN_MM` (35→15) y `FINAL_FEED_MM` (12→6) para eliminar la hoja en blanco sobrante reportada.
- Corrige un error preexistente en el canonical spec: el escenario de logo decía "75x105px", cuando el código real usa 125x77px.
- Cierra un cabo suelto de `add-escpos-ticket-printing`: deja lista la corrección ya presente en `SettingsController.ts` (regex de `agentUrl` de `https?` a `http`, alineada con Decision 7 de su `design.md`).

## Capabilities

### New Capabilities
- `escpos-ticket-printing` (carry-over sin cambios desde `add-escpos-ticket-printing`, primera vez que se incorpora al canonical)

### Modified Capabilities
- `ticket-print-ui`: reconciliación completa de "Print ticket action on the ticket view" y "Anclaje superior del ticket en impresión térmica"; recalibración de "Robustez del ancho y del corte final..."; nuevo requirement "Margen superior adicional proporcional al alto del ticket".

## Impact

- **Archivos modificados**: `app/(private)/sales/_blocks/PrintableTicket.tsx` (constantes de altura, fórmula de margen superior, CSS `@page`/`.printable-ticket`), `src/modules/settings/infrastructure/http/SettingsController.ts` (fix de regex `agentUrl`, ya presente sin commitear).
- **Tests**: `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` — 4 aserciones de `@page` recalculadas con los nuevos valores.
- **Specs**: `openspec/specs/ticket-print-ui/spec.md` y `openspec/specs/escpos-ticket-printing/spec.md` se actualizan vía `opsx:sync`/`opsx:archive` de este change (fuera de esta sesión, pendiente indicación explícita del usuario).
- **APIs/DB**: sin cambios adicionales a los ya implementados por `add-escpos-ticket-printing` (`BranchPrinterConfig`, ya migrado).
- **Pendiente fuera de esta sesión**: confirmación del cliente en la EPSON TM-T20II física de que el anclaje, ancho, corte y margen superior funcionan correctamente — no se cierra `opsx:verify` como "resuelto" solo con revisión de código, igual que en los 3 changes originales.
