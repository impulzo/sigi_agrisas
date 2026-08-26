## Context

Ver `proposal.md` - Why para la motivación completa. Resumen técnico necesario:

`app/(private)/sales/_blocks/PrintableTicket.tsx` inyecta un `<style>` con `@page { size: ${paperWidth} ${pageHeightMm}mm; margin: 0 }`, donde `pageHeightMm` sale de `computeTicketPageHeightMm(sale)` (constantes fijas por sección + `SAFETY_MARGIN_MM=20`, sin medición DOM). El anclaje superior-izquierdo hoy depende únicamente de la regla global en `app/globals.css:89-105` (`.print-area{position:absolute;top:0;left:0;width:100%}`), no de estilo propio de `PrintableTicket`.

Impresora del cliente: EPSON TM-T20II, 80mm, conectada por red, driver de impresora de recibo instalado como impresora de sistema. Comportamiento documentado de este tipo de driver (GDI/Windows): cuando el navegador solicita un `@page` con tamaño custom en mm, el driver puede no reconocerlo exactamente y sustituir un tamaño de página propio (fijo o con offset), lo que produce simultáneamente los tres síntomas reportados — desajuste de ancho, recorte/hoja en blanco al final, y centrado remanente. No hay forma de verificar esto en el entorno de desarrollo (no hay impresora física TM-T20II disponible).

## Goals / Non-Goals

**Goals:**
- Reforzar el ancho, el anclaje y el feed final de `PrintableTicket` con CSS defensivo, sin depender de que el driver interprete perfectamente el `@page` custom (Historia #1, AC1-AC4).
- Dejar explícito en código/spec que el cierre de este change requiere confirmación del cliente en hardware real (Historia #1, AC5) — no marcar "resuelto" solo con revisión de código.
- Mantener `window.print()` como único mecanismo de impresión (decisión ya tomada por el cliente, descarta ePOS-Print/ESC-POS).

**Non-Goals:**
- No se implementa impresión directa ESC/POS ni Epson ePOS-Print SDK (ruta descartada explícitamente).
- No se reconfigura el driver de Windows/SO del cliente (fuera del alcance de este repo) ni se documenta un procedimiento de instalación de impresora — solo el lado del código.
- No se cambia el contenido fiscal/orden de secciones del ticket (folio, RFC, totales) — solo geometría de impresión.
- No se re-abre la calibración exacta en mm de `BASE_HEIGHT_MM`/`PER_ITEM_HEIGHT_MM` a un valor "perfecto" — sin hardware para medir, solo se amplía el margen de seguridad existente (más conservador, nunca más ajustado).

## Decisions

1. **Anclaje: mover `position:absolute;top:0;left:0;margin:0` al estilo inyectado por el propio `PrintableTicket`, además de mantener la regla en `globals.css`.**
   Responde a Historia #1 / AC1. Alternativa considerada: solo reforzar `globals.css`. Se descarta porque el estilo scoped al componente es más resiliente si algún wrapper intermedio (`hidden print:block` de Tailwind, o el `PageShell` de la vista previa) reintroduce un layout con `display:flex`/`margin:auto` — declarar la regla en ambos lugares es defensa en profundidad sin costo.

2. **Ancho: `box-sizing: border-box` en `.printable-ticket` y en todos sus elementos hijos vía `* { box-sizing: border-box }` scoped al componente.**
   Responde a Historia #1 / AC3. Alternativa considerada: reducir el ancho declarado a un valor menor que `paperWidth` (ej. 76mm dentro de un rollo de 80mm) para dejar margen de seguridad ante reescalado del driver. Se descarta como cambio de código porque alteraría el contrato ya spec'eado ("Paper width from settings is applied" en `ticket-print-ui`, sin modificar) — el ancho declarado debe seguir siendo exactamente `paperWidth`; el fix es asegurar que nada interno se desborde de ese ancho (causa más probable de que el driver necesite reescalar), no encoger el ancho declarado.

3. **Feed final: agregar un elemento de espaciado explícito (ej. `<div style="height: 12mm">`) al final del contenido imprimible y subir `SAFETY_MARGIN_MM` de 20 a un valor mayor (ej. 35).**
   Responde a Historia #1 / AC2 y AC4. Alternativa considerada: volver a una altura fija grande (como en el change archivado `fix-thermal-ticket-page-size`). Se descarta porque ya se abandonó ese enfoque en `fix-ticket-print-size` por otro problema (probablemente forzaba "fit-to-page" en impresoras no continuas) — mejor mantener el cálculo determinístico por contenido, solo con más margen.

4. **No agregar detección de user-agent/impresora ni rama de código específica para "TM-T20II".**
   No hay forma de detectar de forma confiable qué impresora física está seleccionada en el diálogo de impresión del navegador (el navegador no expone esa información a JS). El refuerzo de CSS aplica igual para todas las impresoras térmicas, no solo la TM-T20II — es la única opción viable sin ePOS-Print.

**Criterios de Seguridad de la Historia #1** (obligatorios, ver tabla en proposal.md): el cambio es puramente CSS/cálculo en cliente dentro de `PrintableTicket.tsx` — no toca `/sales/:id/ticket` (permiso `sales:read` sin cambios), no agrega endpoints, no expone datos nuevos, no requiere credenciales de red. No aplica ningún guard/branch-scoping adicional porque no se toca la capa de datos.

## Risks / Trade-offs

- [El driver de la TM-T20II podría seguir sustituyendo el tamaño de página pese al refuerzo CSS, ya documentado como posible en la spec] → Mitigación: el scenario "Verificación final pendiente de confirmación en hardware real" (en `ticket-print-ui` modificado) deja explícito que esto no bloquea el cierre del change; si persiste, se documenta como limitación de driver/SO fuera de alcance de CSS, sin reabrir más iteraciones a ciegas.
- [Subir `SAFETY_MARGIN_MM` y agregar feed final puede dejar un poco más de papel en blanco de lo estrictamente necesario en tickets cortos] → Mitigación: trade-off aceptado — mejor sobrante de papel que corte de contenido; el costo (unos mm de papel térmico) es marginal frente al de un ticket ilegible o incompleto entregado al cliente final.
- [Sin impresora física en este entorno, ningún test automatizado puede validar el comportamiento real del driver] → Mitigación: los tests unitarios existentes (`getProductPrices`-style) no aplican aquí; la verificación es manual por el cliente en la TM-T20II real, según lo declarado en tasks.md.

## Migration Plan

Cambio de solo frontend (CSS/constantes en un componente cliente), sin migración de datos ni de API. Deploy estándar; sin rollback especial más allá de revertir el commit si el cliente reporta regresión visual en impresoras que ya funcionaban bien.
