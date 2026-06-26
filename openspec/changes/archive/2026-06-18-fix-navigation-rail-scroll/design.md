## Context

`NavigationRail` actualmente usa `flex flex-col` con altura completa pero sin overflow controlado. El layout privado (`app/(private)/layout.tsx`) tampoco fija `h-screen overflow-hidden` a nivel root. Consecuencia: cuando los items primarios + RBAC-gated + secundarios + logout exceden el viewport (laptops <720px de alto, splits, zoom), los items inferiores son inalcanzables porque:

1. El rail crece más allá del viewport sin scroll interno.
2. El scroll del `<body>` no llega al fondo del rail si el contenido principal es corto.
3. `RailFlyout` (submenú de `catalogs`) tampoco contempla overflow vertical.

El rail YA es sticky/fixed visualmente (left edge) pero el comportamiento de scroll está implícito en el flujo del documento, lo que rompe la persistencia funcional. La capacidad `panel-shell` define la persistencia visual; falta enforcear persistencia de **alcance** (todos los items son alcanzables sin importar el alto del viewport).

## Goals / Non-Goals

**Goals:**
- Rail y `<main>` scrollean de forma **independiente**: scroll en uno no afecta al otro.
- Items inferiores del rail (incluido logout) siempre alcanzables vía scroll interno cuando el contenido excede el alto.
- `RailFlyout` scrollea internamente si los children no caben en el viewport.
- Scrollbar visual coherente con el design system Material 3 (discreta, color `outline-variant`).
- Cero regresiones en gating RBAC, navegación, active state ni layout responsivo del shell.

**Non-Goals:**
- Cambiar la API de `RailItem`, permisos o navegación.
- Refactorizar el shell completo o reordenar items.
- Introducir librerías externas (`react-custom-scrollbars`, `simplebar`, etc.). Tailwind + CSS nativo solamente.
- Drawer móvil o variantes alternativas del rail (fuera de scope).
- TopAppBar (no se modifica).

## Decisions

### Decisión 1: Layout root con `h-screen overflow-hidden` y aside/main con scroll propio

**Elegido**: `app/(private)/layout.tsx` envuelve todo en `<div className="h-screen overflow-hidden flex">` (o estructura equivalente) con `<aside>` (NavigationRail) y `<main>` como hijos con su propio scroll.

**Alternativas consideradas**:
- *Position fixed sobre body con scroll*: produce overlay sobre scroll del documento, complica z-index y sticky headers.
- *CSS Grid `grid-template-rows`*: válido pero el shell actual ya usa flex/padding; cambiar a grid es un refactor mayor.

**Rationale**: La técnica `h-screen` + `overflow-hidden` en root + `overflow-y-auto` en hijos es la forma estándar de tener paneles con scroll independiente en SPAs (también usada en Linear, Notion, GitHub). Cambio mínimo, sin tocar TopAppBar ni `pl-[80px] pt-16` del main.

### Decisión 2: NavigationRail estructurado como `header / scrollable-mid / footer`

**Elegido**: Dentro del `<aside>`, dividir en 3 secciones flex:
- Header fijo (logo Agrisas, no scrollea).
- Sección scrollable (items primarios + items secundarios) con `flex-1 overflow-y-auto`.
- Footer fijo (botón logout) con `flex-shrink-0`.

**Alternativas consideradas**:
- *Todo scrolleable incluyendo logo*: rompe el anclaje visual del branding.
- *Solo scrolleable items primarios, secundarios pegados abajo siempre*: si secundarios + logout > viewport, vuelven a ser inalcanzables.

**Rationale**: Logo siempre visible (anclaje de marca). Logout siempre alcanzable (footer fijo). Resto scrollea. Garantiza alcance universal sin sacrificar UX de marca/acción crítica.

### Decisión 3: Scrollbar estilizada con utilities propias (sin plugin)

**Elegido**: Añadir clase utility `scrollbar-thin` en `app/globals.css` con `::-webkit-scrollbar` (8px), `::-webkit-scrollbar-thumb` (`rgb(var(--md-sys-color-outline-variant))`, `border-radius: 4px`) y fallback `scrollbar-width: thin` para Firefox.

**Alternativas consideradas**:
- *Plugin `tailwind-scrollbar`*: dependencia extra para un caso aislado.
- *Scrollbar nativa*: en macOS está oculta hasta scroll, pero en Windows/Linux es intrusiva sobre 80px.

**Rationale**: Una sola utility CSS (~15 líneas), zero deps, cross-platform consistente.

### Decisión 4: RailFlyout con `max-height` y `overflow-y-auto`

**Elegido**: `RailFlyout` aplica `max-height: calc(100vh - 32px)` y `overflow-y-auto` con la misma clase `scrollbar-thin`. Anclado siempre con un margen vertical mínimo de 16px para no pegarse al borde.

**Rationale**: `catalogs` tiene 6 hijos hoy. En layouts compactos + posible expansión futura, el flyout también debe scrollear. Mismo patrón visual que el rail.

### Decisión 5: Sin guardado de scroll position

**Elegido**: El scroll del rail no se persiste entre navegaciones. Cada vez se reinicia desde el item activo (lógica nativa de `scroll-into-view` opcional, solo si el item activo está fuera del viewport).

**Rationale**: Persistir scroll por navegación es complejidad innecesaria para un menú de ≤12 items. `scrollIntoView({ block: "nearest" })` cuando el active item cambia cubre el caso de "el item activo no es visible".

## Risks / Trade-offs

- **[Riesgo]** Scrollbar nativa de Windows puede romper el ancho efectivo de 80px → Mitigación: `scrollbar-gutter: stable` o reducir padding interno; testear en Windows.
- **[Riesgo]** `h-screen` en root puede romper el comportamiento `Toaster`, modales o `<dialog>` que asuman scroll en body → Mitigación: auditar `Toaster` (sonner) y modales POS; probablemente requieran `position: fixed` ya — si no, ajustar.
- **[Riesgo]** Tests UI existentes pueden assertear estructura DOM concreta del rail → Mitigación: revisar `tests/unit/ui/panel-shell/` y actualizar selectors si rompen.
- **[Trade-off]** Logo y logout siempre visibles cuestan ~140px de alto fijo, reduciendo el área scrollable. Aceptable porque son anchors de UX críticos.

## Migration Plan

1. Cambios CSS son aditivos (utility class `scrollbar-thin`). No requieren migración de datos ni feature flags.
2. Deploy con un solo commit; cambios son visuales/CSS, sin riesgo de runtime backend.
3. Rollback: revert del commit; estado previo era funcional (solo con el bug de overflow).

## Open Questions

- ¿Aplicar también `scroll-into-view` al item activo al cambiar de ruta? **Propuesta**: sí, solo si `getBoundingClientRect()` indica out-of-viewport (cero impacto cuando todo cabe).
- ¿Necesitamos un componente abstraído `ScrollableArea` reutilizable? **Propuesta**: no por ahora; YAGNI. Si surge un tercer caso, abstraer.
