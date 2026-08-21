## Context

Dos superficies de UI, sin relación de código entre sí, agrupadas en un mismo change por venir del mismo pedido del usuario:

1. **Ticket de venta** (historias 1-3 de la tabla): `TicketPreviewPage.tsx` (vista previa en pantalla) y `PrintableTicket.tsx` (markup oculto que se activa vía `hidden print:block` al llamar `window.print()`) son dos árboles JSX independientes que renderizan el mismo contenido con estilos duplicados a mano — no comparten un componente base. Cualquier divergencia entre ambos (como la caja de logo actual) requiere corrección en los dos lugares.
2. **NavigationRail** (historia 4): componente único `app/_components/organisms/NavigationRail/NavigationRail.tsx`, sin relación con el ticket.

Constraints existentes que el diseño debe respetar:
- `tests/unit/ui/design-system/tokens.test.ts` rechaza clases `text-<categoria>-<variante>` fuera de `tailwind.config.ts → fontSize`, hex crudo, y ciertas clases de radio — todas las clases nuevas propuestas (`w-16`, `h-16`, `w-full`, `text-center`, `leading-tight`, `px-gutter`, `py-lg`, `mb-2`) ya existen en la escala de Tailwind/config del proyecto, ninguna es nueva.
- El rail mide `w-[80px]` fijo (`NavigationRail.tsx:159`) — no hay margen para ensanchar el contenedor de hover sin límite.
- `@page { margin: 0 }` en `PrintableTicket.tsx` ya es intencional (ticket térmico continuo, ver `openspec/changes/archive/2026-08-19-fix-thermal-ticket-page-size/`) — no se toca.
- El stub `openspec/changes/document-thermal-print-limitation/` está reservado para documentar una eventual limitación de driver/impresora — este change no lo completa ni lo modifica.

## Goals / Non-Goals

**Goals:**
- Historia 1: preview del ticket con el mismo padding de página (`px-gutter py-lg`) que el resto del panel.
- Historia 2: logo con la misma proporción apaisada (~1.63:1) y el mismo margen inferior visible en preview e impresión.
- Historia 3: reforzar el anclaje `top:0; left:0` de `.print-area` en la cascada de impresión, auditando que ningún estilo lo pise.
- Historia 4: contenedor de hover/activo del rail que contiene ícono+etiqueta sin desborde, mismo `text-label-sm` en todos los ítems (ya así, no cambia).

**Non-Goals:**
- No se unifica `TicketPreviewPage.tsx` y `PrintableTicket.tsx` en un componente compartido (refactor mayor fuera de alcance; el pedido es visual, no arquitectónico).
- No se resuelve la posible limitación de paper-size del driver/impresora física si persiste tras el refuerzo de CSS — queda para `document-thermal-print-limitation`.
- No se toca `RailFlyout.tsx` (submenú de Catálogos) — usa `text-body-md` en un layout horizontal distinto, sin el bug reportado.
- No se cambia `computeTicketPageHeightMm`, `paperWidth` ni ninguna otra medida de papel — el usuario confirmó que esas están correctas.

## Decisions

### D1 — Padding de página vía tokens existentes, no `PageShell` completo (historia 1)
Agregar `px-gutter py-lg` directamente al `className` del wrapper en `TicketPreviewPage.tsx:66`, en vez de envolver la página en `<PageShell>`.
- **Por qué**: `PageShell` exige `title` (prop obligatoria) y renderiza `PageHeader` — envolver ahí forzaría a agregar un `<h1>`/título que no existe hoy en esta pantalla (que ya tiene su propio link "Volver al detalle" + card de ticket), cambiando el diseño más allá de lo pedido en la historia 1 (que sólo pide el padding).
- **Alternativa descartada**: usar `PageShell width="narrow"` con `title="Ticket de venta"` — se descarta por alterar el diseño visual actual (agrega jerarquía de encabezado no solicitada) y por riesgo de romper el test existente `tests/unit/ui/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.test.tsx` si depende del árbol actual.

### D2 — Caja de logo apaisada uniforme en preview e impresión (historia 2)
Fijar la misma proporción (~1.63:1, calculada del asset real `public/logo.png` = 2536×1552px) en:
- Preview (`TicketPreviewPage.tsx:95`): `h-[100px] w-[140px]` → `h-[86px] w-[140px]` (140/1.63 ≈ 86).
- Impresión (`PrintableTicket.tsx:53`): `width:125px; height:150px` → `width:125px; height:77px` (125/1.63 ≈ 77).
- **Por qué esta proporción y no otra**: usar el ratio real del asset evita que `object-fit: contain` dibuje espacio vacío dentro de la caja (el bug actual: caja retrato 125×150 para un logo apaisado real deja ~37px de hueco arriba/abajo). Mantener anchos ya existentes (140px preview, 125px impresión — distintos porque son contextos de tamaño de fuente distinto, 16px vs 10px monospace) minimiza el diff y no reabre la discusión de "qué tan grande debe verse el logo", que no fue cuestionada por el usuario.
- **Alternativa descartada**: igualar también los anchos entre preview (140px) e impresión (125px) — se descarta porque cada contexto tiene su propia escala tipográfica base (preview usa `text-body-sm`/16px context, impresión usa `font-size:10px` monospace) y forzar el mismo ancho en px no garantiza la misma proporción visual relativa al resto del contenido.

### D3 — Margen inferior del logo restaurado a un valor explícito (historia 2)
Cambiar `mb-[4.8px]` (preview) y `margin: 0 auto 2.4px` (impresión) a `mb-2` (8px, token Tailwind estándar) y `margin: 0 auto 8px` respectivamente.
- **Por qué 8px**: es el token `spacing.sm`/`spacing.base` (8px) ya definido en `tailwind.config.ts`, el primer múltiplo "visible" por encima del valor residual actual (2.4px/4.8px, que en la práctica se percibe como ausente) y menor que `pb-4` (16px, usado para separar OTRAS secciones del ticket como cliente/condiciones) — evita confundir la jerarquía visual (el logo-header no debe leerse como una sección tan separada como cliente/condiciones).
- **Por qué el mismo valor absoluto en px (no `mb-2` de Tailwind en preview + un `px` equivalente en impresión)**: impresión no puede usar clases Tailwind (es un `<style>` con CSS plano inyectado, sin purga de Tailwind en ese string), así que se declara el equivalente numérico directamente.

### D4 — Refuerzo defensivo del anclaje de impresión sin cambiar el mecanismo (historia 3)
No se reemplaza `position:absolute;top:0;left:0` (ya presente en `.print-area`, `app/globals.css:99-104`) por otro mecanismo (ej. flexbox, grid) — se audita y refuerza:
- Confirmar que `.printable-ticket` (regla inyectada en `PrintableTicket.tsx:52`) no declara `margin` (hoy no lo hace) — agregar `margin: 0;` explícito ahí como defensa ante cualquier `margin: auto` que pudiera heredarse o inyectarse en el futuro.
- Confirmar que ningún ancestro entre `<body>` y `.print-area` tiene `position: relative/fixed/sticky` que reancle el `position:absolute` a un contenedor distinto del root (los wrappers actuales — `TicketPreviewPage`'s `div.w-full.max-w-lg.mx-auto` — no declaran `position`, así que no hay riesgo hoy, pero se deja como criterio de verificación explícito, no de código).
- **Por qué no rediseñar el mecanismo**: `position:absolute` sobre el elemento `.print-area` combinado con `visibility:hidden` en `body` (patrón "print only this element") es el patrón estándar y ya funciona en el modelo de caja del navegador; si el ticket sigue apareciendo centrado en una impresora física tras este refuerzo, la causa más probable es que el driver/SO imprime sobre un tamaño de papel distinto al `@page` calculado (ej. Letter/A4 en vez del ancho térmico), lo cual ningún CSS puede corregir — de ahí que la historia 3 explícitamente delimite ese caso al stub `document-thermal-print-limitation`.

### D5 — Contenedor de rail agrandado + wrap controlado vía `w-full` en la etiqueta (historia 4)
- Contenedor: `w-14 h-14` (56×56px) → `w-16 h-16` (64×64px) en `RailLink`, el botón de `RailParentItem`, y el botón de logout.
- Etiqueta: `<span className="text-label-sm">` → `<span className="text-label-sm w-full text-center leading-tight">` en los mismos tres lugares.
- **Por qué `w-full` es la causa raíz, no sólo agrandar la caja**: en un contenedor `flex flex-col items-center`, `align-items: center` (heredado de `items-center`) hace que cada flex item se dimensione por su *contenido* (comportamiento `align-self: center` con `width: auto` ⇒ min/max-content sizing), no por el ancho del contenedor padre. Sin `w-full` en el `<span>`, el texto nunca activa `word-wrap`/wrap normal porque el navegador le da todo el ancho que "pide" el texto sin cortar — de ahí el desborde visual pese a que el contenedor SÍ tiene un ancho fijo. Agrandar sólo la caja (sin `w-full`) no resuelve nada porque el `<span>` seguiría sin ancho acotado.
- **Por qué 64px y no más**: el rail mide 80px fijo; 64px dejan 8px de aire a cada lado (`(80-64)/2`), consistente con el padding visual que ya tienen otros ítems. Ensanchar más (ej. `w-20`=80px) eliminaría todo el aire lateral y pegaría el fondo hover al borde del rail.
- **Por qué no truncar/una sola línea (`truncate`) en vez de wrap**: truncar etiquetas como "Configuración" a "Config..." reduce la legibilidad/reconocimiento del ítem, que es exactamente lo que la historia 4 pide mejorar; permitir 2 líneas mantiene el texto completo.
- **Alternativa descartada**: usar `text-label-md` (12px) en vez de `text-label-sm` (11px) para que quepa en una sola línea — se descarta porque la historia 4 pide explícitamente uniformidad de tamaño (ya existe) y aumentar el tamaño de fuente global del rail no fue parte del pedido ni resuelve el desborde para las etiquetas más largas de todos modos.
- **Corrección post-verificación (opsx:verify)**: `w-full` acota el ancho pero no activa el wrap por sí solo cuando la etiqueta es una sola palabra sin espacios (`white-space`/`overflow-wrap` seguían en `normal`, y el navegador no parte una palabra sin puntos de quiebre). El texto se desbordaba en una sola línea y, al no verse "flotando" fuera del rail, parecía inofensivo — pero el `<nav>` (`overflow-y-auto` sin `overflow-x` explícito) fuerza por regla de la spec CSS que el eje x compute a `auto`, recortando ese desborde sin elipsis justo en el borde de 80px. Se agregó `break-words` (`overflow-wrap: break-word`) al `<span>` de las 3 variantes para que el wrap ocurra dentro de la palabra cuando no cabe. Ver `tasks.md` sección 5 para el detalle de verificación.

## Risks / Trade-offs

- [Riesgo] El rail con `h-16` en vez de `h-14` aumenta la altura total del `<nav>` con ~11 ítems primarios visibles simultáneamente (según permisos) → puede requerir más scroll en pantallas de baja altura. → **Mitigación**: el `<nav>` ya tiene `overflow-y-auto scrollbar-thin` (`NavigationRail.tsx:168`) y lógica de `scrollIntoView` para el ítem activo (`NavigationRail.tsx:146-156`) — el scroll ya es un comportamiento soportado, no uno nuevo.
- [Riesgo] Cambiar la caja del logo en impresión (125×77 en vez de 125×150) podría alterar el `BASE_HEIGHT_MM` estimado por `computeTicketPageHeightMm` (constante `BASE_HEIGHT_MM = 120`, calibrada para la altura visual anterior) → un logo más bajo deja MÁS espacio libre al final del ticket (extra en vez de faltante), no corta contenido. → **Mitigación**: no se ajusta `BASE_HEIGHT_MM` en este change (el usuario confirmó que las medidas de papel son correctas); el efecto es un margen inferior extra en el papel, no un corte, así que es seguro dejarlo así y no expandir el alcance a recalibrar constantes de altura.
- [Riesgo] El refuerzo de CSS del anclaje superior (D4) puede no resolver el centrado en una impresora térmica física real, dejando la historia 3 parcialmente insatisfecha. → **Mitigación**: ya delimitado explícitamente en el criterio de aceptación de la historia 3 y en este design — ese caso se documenta aparte, no bloquea el cierre de este change.

## Migration Plan
No aplica — cambios de presentación pura sin datos persistentes, migraciones de BD, ni contratos de API. Deploy estándar (build + verificación manual en navegador). Rollback: revertir el commit/PR, sin pasos adicionales.

## Open Questions
Ninguna — el usuario ya resolvió la única ambigüedad detectada (alcance del punto "pegado arriba, no centrado") vía `AskUserQuestion` en la fase de planeación: reforzar CSS en este change, dejar cualquier limitación de driver/impresora para el stub `document-thermal-print-limitation`.
