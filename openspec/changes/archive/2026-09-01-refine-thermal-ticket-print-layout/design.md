## Context

`PrintableTicket.tsx` (`app/(private)/sales/_blocks/`) renderiza el ticket térmico para impresión vía `window.print()`. Su código actual (tras este change) declara:

```ts
const BASE_HEIGHT_MM = 85;  // recalibrado de 120 por Decision 7
const CUSTOMER_SECTION_HEIGHT_MM = 30;
const CREDIT_LINE_HEIGHT_MM = 8;
const PER_ITEM_HEIGHT_MM = 12;
const SAFETY_MARGIN_MM = 15; // recalibrado de 35 por Decision 2
const FINAL_FEED_MM = 6;     // recalibrado de 12 por Decision 2

// @page { size: <paperWidth> <pageHeightMm>mm; margin: <topMarginMm>mm 3mm 4mm 3mm; }
// .printable-ticket { margin:0 !important; position:absolute !important; top:0 !important; left:0 !important; ... }
```

`add-ticket-print-margins` removió el `top: 0 !important; left: 0 !important` que `document-thermal-print-limitation` había forzado en `.printable-ticket` — nadie actualizó formalmente el requirement de anclaje de este último para reflejarlo. `app/globals.css` (líneas ~89-105) tiene además una regla global `.print-area { position:absolute; top:0; left:0; width:100% }` **sin** `!important`, usada exclusivamente por `.printable-ticket` (confirmado, cero otros usos) — no forma parte del scope de este change (ver Non-Goals).

El canonical `openspec/specs/ticket-print-ui/spec.md` nunca se sincronizó contra ninguno de los 3 changes: sigue mostrando `@page margin: 0`, el requirement de anclaje sin refuerzo, y cero mención de ESC/POS.

## Goals / Non-Goals

**Goals:**
- Una sola fuente de verdad para `ticket-print-ui` + `escpos-ticket-printing`, reemplazando los 3 changes dispersos.
- Resolver formalmente, con evidencia empírica (Playwright), el conflicto de anclaje `top:0/left:0` forzado vs `@page margin`.
- ~~Eliminar la hoja en blanco sobrante reportada~~ **[RESUELTO Decision 7]** — recalibrar `BASE_HEIGHT_MM` (120→85) tras confirmación en hardware real, reductor ~37mm de blanco sin corte.
- Agregar margen superior proporcional (5%) sin reabrir el riesgo de corte de contenido en tickets largos.
- Corregir la tarea 6.5 desactualizada de `add-escpos-ticket-printing` (describía un estado del código ya revertido).

**Non-Goals:**
- No se re-implementa nada de `add-escpos-ticket-printing` — feature ya completa (24/24 tareas), sin cambios de comportamiento.
- No se cambia el contenido/orden de secciones del ticket.
- No se hace configurable el margen superior vía `TicketSettings` — sigue siendo constante en código (mismo criterio que `add-ticket-print-margins` Decision 1).
- No se toca `app/globals.css`/`.print-area` en este change, aunque interfiera con la verificación de anclaje — se documenta como limitación conocida si aplica (decisión explícita del usuario, ver Risks).

## Decisions

### 1. Compensar el alto total de `@page` con el margen superior extra
**Rationale:** si el margen superior adicional (5% de `computeTicketPageHeightMm(sale)`) se sumara solo a `margin-top` sin agrandar `@page size`, le restaría presupuesto directo al colchón de contenido — justo lo que se busca reducir en la Decision 2, reabriendo el riesgo de corte en tickets largos (donde el 5% es mayor). Por eso el alto total de página crece exactamente en la misma cantidad que el margen superior extra: el ajuste es "aire puro" para el papel, no le resta espacio al contenido.
```ts
const contentHeightMm = computeTicketPageHeightMm(sale);
const extraTopMarginMm = Math.round(contentHeightMm * EXTRA_TOP_MARGIN_PCT); // 5%
const topMarginMm = BASE_TOP_MARGIN_MM + extraTopMarginMm; // 4mm + 5%
const pageHeightMm = contentHeightMm + extraTopMarginMm;   // compensación
```
**Alternativa considerada:** sumar el 5% solo a `margin-top` sin compensar el alto total — descartada porque reduce el área imprimible disponible para el contenido, proporcionalmente más en tickets largos, contradiciendo el objetivo de reducir el colchón sin reabrir el corte.

### 2. Recalibrar `SAFETY_MARGIN_MM` (35→15) y `FINAL_FEED_MM` (12→6)
**Rationale:** el colchón actual (47mm) es el candidato más directo para explicar la hoja en blanco extra reportada. Se elige la opción agresiva (total 21mm, -55%) para atacar el síntoma de forma directa, apoyándose en que otras protecciones agregadas en el mismo periodo (`box-sizing:border-box` en todo `.printable-ticket *`, `FINAL_FEED_MM` como colchón dedicado al corte, separado del general) ya cubren parte de la causa raíz original de los cortes (desborde de ancho, falta de feed dedicado) que motivó subir el colchón general a 35 en `document-thermal-print-limitation`.
**Alternativa considerada:** valores conservadores (20mm/8mm, total 28mm) — descartada por decisión explícita del usuario (prioriza eliminar el síntoma reportado ahora, acepta el riesgo de ajustar de nuevo tras confirmación en hardware físico).
**Nota:** son valores estimados sin hardware físico — ver Risks.

### 3. Reinstalar `top: 0 !important; left: 0 !important` en `.printable-ticket`, verificado empíricamente
**Rationale:** `getBoundingClientRect()` bajo `page.emulateMedia({media:'print'})` (el método planeado originalmente) no sirve para esta verificación — `@page margin` no se aplica al layout normal del DOM, solo al pipeline real de paginación de impresión/PDF. Se cambió el método a generar el PDF real (`page.pdf({ preferCSSPageSize: true })`) con y sin el forcing reinstalado temporalmente, convertir ambos a PNG (`pdftoppm`) y comparar por checksum: **resultaron byte-idénticos**. Un elemento `position: absolute; top: 0; left: 0` se ancla al origen de su contenedor de bloque inicial, que en el pipeline de impresión de Chromium ya es el área de contenido posterior al margen de página — nunca compitió con `@page margin`. Por lo tanto se reinstala el forcing de forma permanente como refuerzo adicional contra drivers de impresoras térmicas (ej. EPSON TM-T20II), sin riesgo de anular los márgenes.
**Alternativa descartada:** mantener el estado sin forcing (post `add-ticket-print-margins`) — se descarta porque la verificación demostró que reinstalar el forcing es un no-op para el layout normal (no rompe nada) pero sí aporta robustez adicional para casos donde el driver de la impresora se desvíe del pipeline estándar de Chromium.
**Fuera de scope (decisión explícita del usuario):** `app/globals.css`/`.print-area` no se edita en este change — no hizo falta, la verificación no mostró interferencia.
**Corrección post-hardware (ver Decision 5):** esta verificación solo cubre el pipeline de exportación a PDF de Chromium. Confirmado en hardware real que NO cubre el pipeline de impresión nativa a impresora física, donde el ticket puede salir centrado pese al forcing. El forcing se mantiene (sigue siendo inofensivo y aporta robustez de ancho/layout), pero deja de presentarse como solución completa de anclaje.

### 5. Documentar la divergencia entre pipeline de exportación a PDF y pipeline de impresión nativa, y recomendar ESC/POS
**Contexto:** tras el merge de este change (PR ya mergeado), el usuario reportó una prueba en hardware real (Windows, impresora térmica con driver correctamente configurado en tamaño personalizado/rollo continuo — no un tamaño fijo) imprimiendo vía `window.print()`: el ticket sale centrado verticalmente en la hoja física, no anclado arriba con el margen declarado.
**Causa raíz:** `page.pdf({ preferCSSPageSize: true })` (usado en la Decision 3) ejercita el pipeline de exportación a PDF de Chromium, que sí respeta `@page` fielmente. Imprimir a una impresora física registrada en el SO pasa por un pipeline distinto (integración nativa Chromium↔OS, ej. GDI en Windows). Cuando el tamaño de página seleccionado en el diálogo de impresión no coincide exactamente con el `@page size` calculado (que varía por venta), ese pipeline nativo puede centrar el contenido dentro del medio físico — comportamiento de Chromium/SO, no controlable desde el CSS de la página. Por eso la verificación de la Decision 3 no detectó este síntoma: validó el pipeline equivocado para este caso de uso.
**Rationale de la resolución:** no existe una palanca CSS/JS conocida que fuerce el pipeline nativo de impresión a alinear el contenido arriba cuando hay un desajuste de tamaño de página — es una decisión interna de Chromium/SO sobre cómo mapear el canvas renderizado al medio físico seleccionado. La solución ya construida y soportada por el sistema es el modo ESC/POS (`printMode: 'escpos'`, capability `escpos-ticket-printing`), que evita `window.print()` y el pipeline nativo de impresión por completo enviando el contenido directo al agente local — sin negociación de tamaño de página con el SO, por lo tanto sin este síntoma.
**Alternativas descartadas (sin intentar):** por decisión explícita del usuario, no se investigaron mitigaciones adicionales del lado browser (ej. Chrome `--kiosk-printing`/impresión silenciosa, fijar el tamaño de papel por defecto del driver a nivel SO) — se aceptó el diagnóstico y se documentó ESC/POS como resolución, sin cambios de código adicionales en el path browser.
**Alcance de este ajuste:** puramente documental (spec + este design.md + tasks.md) — no hay cambio de código, ya que no existe una corrección de CSS/JS viable para el síntoma confirmado.

### 6. Copiar `escpos-ticket-printing` sin cambios
**Rationale:** capability completa e independiente (branch printer config, payload JSON, retry/fallback), no tocada por ningún ajuste de este merge. Se incorpora al canonical por primera vez (carry-over).

### 7. Recalibrar `BASE_HEIGHT_MM` (120→85) — resolución de hallazgo diferido en Decision 2
**Contexto:** tras confirmación en hardware real (user reportó en sesión posterior), queda un tramo de blanco notorio al final del ticket al imprimir. Análisis empírico del change (tasks.md §2/§6.1) diagnosticó: venta de prueba `d07fd50c...` (3 items, cliente+crédito) con `pageHeightMm=226mm` mostraba contenido real ~68%, dejando 72mm no-contenido (SAFETY 15+FEED 6+EXTRA_TOP 11+EXCESO 40mm). El exceso de 40mm es sobreestimación de `BASE_HEIGHT_MM=120`.
**Rationale:** bloque fijo real (logo+header+meta+totales+footer+leyenda+barcode) a 10px monospace ocupa ~96mm máximo. Nuevo `BASE_HEIGHT_MM=85` (reduce 35mm, ~29%) alinea mejor con realidad, manteniendo pequeño colchón sin reusar presupuesto de SAFETY/FEED (esos quedan reservados al pipeline de corte, Decision 2). Con el nuevo valor, misma venta pasa de `pageHeightMm=226mm` (68% content) a `pageHeightMm=189mm` (~90-95% content) — reducción de ~37mm blanco, ~16%.
**Cambios de código:**
- `app/(private)/sales/_blocks/PrintableTicket.tsx` línea 12: `const BASE_HEIGHT_MM = 85;`
- `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` líneas 121-154: actualizar 4 aserciones `@page` con nuevos valores (164mm/124mm/189mm para los perfiles testados).
**Test:** `npm test -- "PrintableTicket.test.tsx"` → 24/24 en verde.
**Verificación empírica:** derivado de datos ya en repo (venta d07fd50c..., análisis Playwright previo) — aplicable directo sin medición nueva.

## Risks / Trade-offs

| Risk | Mitigación |
|---|---|
| `SAFETY_MARGIN_MM=15`/`FINAL_FEED_MM=6` son estimación sin hardware físico — riesgo de reabrir corte de contenido en tickets con nombres/direcciones muy largas | Queda como tarea pendiente de confirmación en la EPSON TM-T20II física (ver tasks.md); ajustable en una sola constante si hace falta subir de nuevo |
| `BASE_HEIGHT_MM=85` es derivado de análisis empírico (venta d07fd50c... con ~96mm medido de bloque fijo) — pequeño riesgo de variación si hay renderizado distinto entre contextos (OS, driver, Chromium build) | Bajo riesgo (85mm aún deja ~30mm de colchón por debajo de la máximo teórico); queda confirmable en hardware real; ajustable en una sola constante si hace falta |
| El 5% con compensación de altura total es una interpretación técnica del pedido original ("agregar margen top, sin tocar el resto"), no la lectura literal — el alto total de `@page` sí cambia | Confirmado explícitamente con el usuario antes de implementar; documentado aquí y en el requirement correspondiente |
| `app/globals.css`/`.print-area` podría interferir con la verificación de anclaje y no se toca por decisión explícita | Se documenta como limitación conocida en el resultado de la verificación Playwright si aplica, sin bloquear el resto del change |
| Corrección del escenario "Logo rendered at 75x105px" → "125x77px" es un drive-by fix no solicitado explícitamente | Bajo riesgo (1 línea de spec, alinea con código real y con el requirement de proporción del logo), incluido por decisión explícita del usuario |
| Confirmado en hardware real (Windows, driver correctamente configurado): browser print (`window.print()`) puede centrar el ticket verticalmente pese al forcing `top:0/left:0` — limitación del pipeline nativo de impresión, no corregible desde CSS/JS de la página (ver Decision 5) | Recomendar/migrar la sucursal afectada a `printMode: 'escpos'` (ya soportado); no se persigue una mitigación CSS/browser porque no hay una viable conocida |

## Migration Plan

Ninguna migración de datos nueva — `BranchPrinterConfig` ya se aplicó en `add-escpos-ticket-printing`. Cambio limitado a frontend (CSS/cálculo) y a una corrección de validación ya presente en el backend (`SettingsController.ts`).
