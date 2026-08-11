# sales-screens-padding — Design

## Context

Ver proposal.md — Why. Estado actual relevante:

- El área de contenido de rutas privadas es `app/(private)/layout.tsx:24` → `<main className="pl-[80px] pt-16 h-full overflow-y-auto">`. El `pt-16` (64px) es el espacio que reserva la `TopAppBar` fija de 64px; el `pl-[80px]` reserva el `NavigationRail` fijo de 80px. El contenido empieza inmediatamente después, sin separación adicional de los bordes.
- Previamente (v1 de este change) se agregó `pt-2.5` (10px top) solo a los 5 contenedores raíz del módulo de ventas. Requisito ampliado por el cliente: padding de 10px en los bordes **izquierdo, superior y derecho** de **todas** las pantallas del panel privado.
- Hay 4 pantallas full-height con altura fija calculada respecto al viewport:
  - `PosPage` → `flex flex-col h-[calc(100vh-64px)]` (PosPage.tsx:280).
  - `EditSalePage` → `flex flex-col h-[calc(100vh-64px)]` (EditSalePage.tsx:195).
  - `QuoteCreatePage` → `flex flex-col h-[calc(100vh-64px)]` (QuoteCreatePage.tsx:144).
  - `QuoteEditPage` → `flex flex-col h-[calc(100vh-64px)]` (QuoteEditPage.tsx:190).
- Logos con `next/image` `fill` sin `sizes`: `NavigationRail.tsx:155` (contenedor `w-12 h-12`, es decir 48px), `TopAppBar.tsx:19` (contenedor `w-10 h-10`, es decir 40px) y `app/(public)/auth/layout.tsx:13` (contenedor responsivo `w-32 h-32 lg:w-56 lg:h-56`). Los tres disparan el warning de consola.

## Goals / Non-Goals

**Goals:**
- Aplicar 10px de gutter (padding) en los bordes izquierdo, superior y derecho a TODAS las pantallas del panel privado (rutas bajo `(private)`), de forma uniforme y en todos los estados (carga, error, sin permisos, contenido normal).
- Mantener sin overflow vertical las 4 pantallas full-height (POS, editar venta, crear/editar cotización).
- Eliminar el warning `sizes` de los logos de marca (fila 2).

**Non-Goals:**
- No cambiar el espaciado interno entre secciones de cada pantalla (solo el gutter exterior de 10px).
- No agregar padding inferior (el requisito del cliente es izq/top/der; el scroll vertical inferior queda libre).
- No alterar el ancho reservado para la topbar ni el rail (`pt-[74px]` = topbar 64 + 10; `pl-[90px]` = rail 80 + 10).
- No tocar backend, RBAC ni branch scoping.

## Decisions

**D1 — Gutter global en el `<main>` del layout privado, no por pantalla.** Se cambia `main` en `app/(private)/layout.tsx` a `pl-[90px] pt-[74px] pr-2.5`. Cubre las ~46 rutas privadas automáticamente y de forma uniforme, incluidos todos los estados de cada pantalla. Alternativa considerada: agregar `px-2.5 pt-2.5` al contenedor raíz de cada página (~46 archivos + bloques) — descartada: diff enorme (~100+ ediciones), alto riesgo de inconsistencia entre pantallas, y duplica lógica que el layout ya centraliza. La v1 de este change usó la variante por-pantalla (solo top, solo ventas); con el requisito ampliado a todo el panel, el layout global es la única opción consistente.

**D2 — Pantallas full-height: recalcular a `h-[calc(100vh-74px)]`.** El `main` global ahora reserva 74px arriba (`pt-[74px]`). Las 4 pantallas con altura fija calculada (`100vh-64px`) sobrepasarían el área de contenido en 10px (scroll vertical extra). Se ajustan a `h-[calc(100vh-74px)]` manteniendo `box-sizing: border-box` de Tailwind preflight. Se elimina también el `pt-2.5` que traían `PosPage`/`EditSalePage` (el top ya lo aporta el layout) para no duplicar el gutter a 20px.

**D3 — Sin `pb` (padding inferior).** El requisito del cliente es izq/top/der. Con `overflow-y-auto`, el contenido hace scroll hasta el borde inferior de `main` sin gutter adicional. Decisión explícita; se puede revertir si el cliente lo pide.

**D4 — Prop `sizes` en los logos según el contenedor.** En `next/image` con `fill`, `sizes` indica el ancho de render para elegir el srcset correcto. Valores: `NavigationRail` (contenedor `w-12 h-12` = 48px) → `sizes="48px"`; `TopAppBar` (contenedor `w-10 h-10` = 40px) → `sizes="40px"`; login (`app/(public)/auth/layout.tsx`, contenedor `w-32 h-32 lg:w-56 lg:h-56` = 128px/224px) → `sizes="(min-width: 1024px) 224px, 128px"`. El logo del login es un tercer `/logo.png` con `fill` sin `sizes`; se detectó en la verificación browser porque el warning aparecía al cargar `/auth/login`. Sin cambios visuales.

## Risks / Trade-offs

- **[Cambio de espaciado en todos los módulos]** → El gutter global afecta módulos que no habían sido revisados visualmente (dashboard, catálogos, reportes, facturación, etc.). Es el objetivo del requisito ampliado; el espaciado interno de cada pantalla no cambia. Las pantallas con padding interno propio (ej. `p-gutter` del dashboard) apilan con el gutter exterior de 10px de forma intencional.
- **[Scrollbar en el gutter derecho]** → `pr-2.5` (10px) puede quedar por debajo del scrollbar en sistemas sin scrollbars overlay (Windows con scrollbar fija). En macOS (overlay) no se percibe. Aceptable; verificar en browser.
- **[`h-[calc(100vh-74px)]` en pantallas full-height]** → Riesgo de 10px de overflow si el `pt-[74px]` del layout no coincide con la altura real reservada; mitigado en D2 con `border-box`. Verificado en browser: POS, editar venta y cotizaciones sin scroll vertical extra.
- **[Doble render de `PrintableTicket` (detalle y ticket)]** → Ajeno al cambio; no afecta el padding.
- **[JSDOM y warning `sizes`]** → JSDOM no evalúa `next/image` real; el warning se verifica en Playwright (browser) revisando `console messages`, no en unit test.
