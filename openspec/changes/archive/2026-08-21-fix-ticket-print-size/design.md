## Context

`PrintableTicket.tsx` inyecta un `<style>` con `@page { size: ${paperWidth} 3276mm; margin: 0; }`. `3276mm` es un valor arbitrario "prácticamente infinito" (~10.75 metros) pensado para que un ticket largo nunca dispare paginación en un rollo térmico continuo. Funciona bien cuando el driver del sistema operativo tiene configurado el papel como rollo continuo (custom paper size que coincide o excede el `@page`). Pero cuando el destino de impresión usa papel fijo (Letter/A4, o "Guardar como PDF" desde el diálogo nativo de Chrome — el caso común en desarrollo/QA y en muchas impresoras de oficina mal configuradas), Chrome calcula el layout sobre la página CSS completa (80mm × 3276mm) y luego escala esa página gigante para caber en el papel físico seleccionado, reduciendo el contenido a una fracción minúscula de su tamaño real. Esto responde a la fila #1 de la tabla de Historia de Usuario (proposal.md).

## Goals / Non-Goals

**Goals:**
- El `@page` height debe aproximarse al alto real del ticket renderizado, no a un valor arbitrario desproporcionado, para que el fit-to-page de Chrome no dispare un shrink perceptible en papel fijo.
- El ticket debe seguir imprimiéndose en una sola página continua (sin cortes) tanto en rollo térmico continuo como en el caso fallback de papel fijo.
- Cero cambios de comportamiento en el ancho (`58mm`/`80mm`) ni en contenido/orden de secciones — ya cumplen `ticket-print-ui`.

**Non-Goals:**
- No se intenta detectar o forzar la configuración del driver de impresión del sistema operativo (fuera del alcance de una página web).
- No se cambia el mecanismo de impresión (`window.print()`) ni se introduce una librería de impresión de terceros.
- No se toca `TicketPreviewPage.tsx` salvo por herencia automática al compartir `PrintableTicket`.

## Decisions

**Calcular la altura del `@page` con una fórmula determinística basada en el contenido de la venta (constantes por sección + por línea de item), NO midiendo el DOM.**

- Alternativas consideradas:
  - a) Reducir el valor fijo a algo "razonable" (p.ej. `1000mm`): descartado — sigue siendo arbitrario, puede quedar corto para tickets con muchas líneas (recorta contenido) o seguir siendo desproporcionado para tickets cortos (sigue habiendo shrink, sólo que menor). No resuelve el problema de raíz, sólo lo atenúa.
  - b) Usar `size: <paperWidth> auto` (mixed length + `auto` en `@page size`): descartado — `auto` como valor por-eje de `@page size` no es parte de la spec CSS estándar (`@page size` acepta `auto | <length>{1,2} | <page-size> [portrait|landscape]`, donde `auto` es un valor único para AMBOS ejes, no mezclable con un length explícito en el otro eje) y el soporte real en Chrome para ese comportamiento de "fit-to-content" en la práctica no es consistente — no es una garantía cross-browser fiable para el caso de uso.
  - c) Medir altura real del DOM vía `ref` + `useLayoutEffect` (descartada tras revisión de implementación): **inviable con el markup actual**. `.printable-ticket` usa Tailwind `hidden print:block` — es decir, `display: none` en TODO momento salvo durante la ejecución real de impresión (`@media print`). Un elemento con `display:none` nunca tiene layout box, así que `getBoundingClientRect().height` siempre devuelve `0` en cualquier punto anterior al propio evento de impresión — no hay ninguna ventana temporal en la que el ticket esté oculto visualmente pero con layout real medible. Forzarlo (renderizarlo siempre off-screen con `position:fixed; left:-9999px` en vez de `display:none`) introduce una carrera de especificidad/orden de cascada con la regla global `.print-area { position:absolute; top:0; left:0; width:100% }` (`globals.css`) que ya gestiona qué se ve durante la impresión — arriesga romper el posicionamiento del ticket impreso. Se descarta por fragilidad y por exceder el alcance de un fix de un solo archivo.
  - d) Calcular la altura a partir de los datos ya disponibles en `props` (`sale.items.length`, presencia de `customerId`/`customerCreditDays`) con constantes por sección (elegida): sin DOM, sin timing, sin `useLayoutEffect`, sin "use client" — es una función pura `computeTicketPageHeightMm(sale)` calculable en cualquier momento del render (incluso SSR). Constantes conservadoras cubren el peor caso razonable de cada bloque (logo, header de negocio, meta de ticket, sección cliente, condiciones de crédito, totales, footer, leyenda, código de barras) más un monto fijo por cada línea de item (suficiente para nombres de producto que envuelven a 2 líneas), más un margen de seguridad. Determinista y 100% testeable sin mocks de DOM.
- El ancho (`paperWidth`) no cambia de mecanismo: sigue viniendo de `ticketSettings?.paperWidth ?? "80mm"` y fijando tanto el `width` del contenido como el primer valor de `@page size`, sin cambios.
- Constantes propuestas (ajustables si en verificación manual algún ticket real corta contenido): `BASE_HEIGHT_MM = 120` (logo + header de negocio + meta + totales + footer + leyenda + barcode), `CUSTOMER_SECTION_HEIGHT_MM = 30` (sólo si `sale.customerId`), `CREDIT_LINE_HEIGHT_MM = 8` (sólo si `sale.customerCreditDays != null`), `PER_ITEM_HEIGHT_MM = 12` por cada elemento de `sale.items`, `SAFETY_MARGIN_MM = 20` sumado siempre al final.

## Risks / Trade-offs

- **[Riesgo] Las constantes son estimaciones fijas por sección; un ticket con nombres de producto excepcionalmente largos (envuelven 3+ líneas) podría superar la altura calculada** → Mitigación: `PER_ITEM_HEIGHT_MM` y `SAFETY_MARGIN_MM` están dimensionados con holgura sobre el caso típico (2 líneas por item); si la verificación manual (tarea 3.2) revela recortes, se ajustan las constantes — no requiere cambio de mecanismo, sólo de valores.
- **[Riesgo] Constantes desalineadas del layout real si el ticket cambia de diseño en el futuro (nuevas secciones, otro font-size)** → Mitigación: las constantes viven junto al cálculo en el mismo archivo (`PrintableTicket.tsx`), documentadas con un comentario breve de a qué sección corresponden — cualquier cambio de layout que las invalide es visible en el mismo diff.
- **[Trade-off] Se pierde la garantía "matemáticamente imposible de paginar" que daba 3276mm, a cambio de un valor calculado con margen** → Aceptado: la garantía real que importa (imprimir sin cortes) se mantiene mientras el margen de seguridad cubra la varianza esperable de contenido; 3276mm resolvía un problema (paginado) creando otro peor (shrink ilegible) — el trade-off es directamente el motivo del fix.
