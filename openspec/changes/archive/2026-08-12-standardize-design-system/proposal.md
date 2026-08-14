## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario del panel | Como usuario del panel, quiero que todas las pantallas tengan el mismo margen, el mismo tamaño de título y el mismo estilo de tabla, para no percibir el sistema como un conjunto de módulos hechos por manos distintas | - Given cualquier ruta bajo `(private)`, When se renderiza, Then el contenedor de página tiene el mismo `padding-left`/`padding-top` que el resto<br>- Given una página de listado, When se renderiza, Then su `h1` mide 32px<br>- Given cualquier tabla de datos, When se renderiza, Then sus `th` miden 11px en mayúsculas y sus `td` 13px<br>- Given cualquier CTA primario, When se renderiza, Then su fondo es `rgb(13,99,27)` y su radio es pill | - Cambio exclusivamente presentacional: no se tocan handlers, servicios, hooks de datos ni rutas de API<br>- No se altera ningún gating por permisos (`can(...)`) ni la lógica de branch scoping |
| 2 | Desarrollador / agente | Como desarrollador o agente que implementa UI, quiero un `designer.md` y una capability `design-system` que fijen tokens, primitivas y recetas, para no volver a inventar un botón o un shell por módulo | - Given un spec nuevo `*-ui`, When se redacta, Then referencia `design-system` y no redefine tokens<br>- Given código nuevo en `app/`, When usa una clase tipográfica fuera de la escala, un hex crudo o `bg-gray-*`, Then `tokens.test.ts` falla | - El guardarraíl es un test, no una convención escrita: no depende de que alguien recuerde leer el documento |

## Why

El cliente lleva 15 días probando y reporta tres cosas: ventanas con margen y sin margen, botones de distinto color y tamaño, y reportes sin estándar. La auditoría confirma cuatro causas raíz, todas estructurales:

**1. ~582 clases tipográficas muertas.** `tailwind.config.ts` define 8 tokens de `fontSize`. El código usa además `text-body-sm` (450 usos), `text-label-md` (64), `text-title-sm` (38), `text-headline-sm` (23), `text-title-lg` (6), `text-headline-md` (1) y `text-label-large` (1). Ninguna existe — ni en Tailwind ni en el `designMd` de Stitch — así que **emiten cero CSS** y todo cae al 16px heredado. Los títulos de los 9 reportes y el contenido de las 50 tablas renderizan al mismo tamaño que el body. Esta es, literalmente, la queja de "diferentes tamaños". 152 archivos afectados.

**2. Escala de radios corrida un paso respecto a Stitch.** Stitch fija `sm .25 / DEFAULT .5 / md .75 / lg 1rem / xl 1.5rem`; el repo tiene `DEFAULT .25 / lg .5 / xl .75`. Consecuencia: `rounded-2xl` y `rounded-3xl` caen a los defaults de Tailwind y conviven con los tokens propios sin criterio — los paneles usan `rounded-2xl`, las tarjetas `rounded-xl` y los botones `rounded-md`/`rounded-xl`/`rounded-full` según el módulo.

**3. No existe un shell de página.** `app/(private)/layout.tsx` aporta `pl-[90px] pt-[74px] pr-2.5` y ningún padding de página. `CatalogShell` lo suple en 15 módulos; `inventory`, `users`, `roles` y el hub de `catalogs` lo duplican a mano; y las 9 rutas de `reports` se auto-padean con `space-y-4 max-w-{5,6,7}xl mx-auto px-4 py-6`. Dos secciones adyacentes tienen distinto gutter izquierdo y distinto ritmo vertical. Esa es la queja de "ventanas con margen y otras sin él".

**4. No existe un Button, Table, Input ni Select estándar.** El átomo `Button` pinta el hex legacy `#1a4d42` desde un CSS Module (paleta vieja, no `primary #0d631b`) y tiene 2 imports contra ~262 `<button>` crudos. Hay cuatro recetas distintas de CTA primario, tres dialectos de tabla, dos paddings de celda (`px-4 py-3` vs `px-3 py-3`) y cero átomos para los ~50 `<table>` y ~56 `<select>`. `Input` usa `border-gray-300`, `ring-agrisas-medium` y `#ef4444` en lugar de tokens.

Lo que sí está bien y se preserva: la paleta de color ya es fiel a Stitch (verificada hex por hex contra `designTheme.namedColors`) y no hay un solo hex crudo en `app/(private)/`.

## What Changes

**Tokens (`tailwind.config.ts`, `app/globals.css`)**
- `fontSize` gana 8 tokens: `display-md`, `display-sm`, `headline-md`, `headline-sm`, `title-lg`, `title-sm`, `body-sm`, `label-md`. Los 8 existentes no se tocan. `body-sm` se fija en 13px/18px — desviación deliberada de M3 (12px/16px) por legibilidad en tablas de datos, documentada.
- `borderRadius` adopta la escala Stitch: `sm .25rem / DEFAULT .5rem / md .75rem / lg 1rem / xl 1.5rem / full 9999px`.
- `boxShadow` gana `elevation-1..3` (ambientales suaves, según la regla de elevación tonal de Stitch).
- `globals.css` gana un bloque `:root` con el set M3 completo como tripletas RGB. Hoy `--md-sys-color-outline-variant` y `--md-sys-color-outline` se referencian en `.scrollbar-thin` pero no están definidas en ningún lado, así que el scrollbar cae al color del UA.

**Barrido de radios** — 758 ocurrencias en 218 archivos, remapeadas en una sola pasada para preservar el valor en píxeles: `rounded`→`rounded-sm`, `rounded-md`→`rounded`, `rounded-lg`→`rounded`, `rounded-xl`→`rounded-md`, `rounded-2xl`→`rounded-lg`, `rounded-full` intacto.

**Primitivas nuevas**
- `PageShell` + `PageHeader` (`_components/organisms/PageShell/`) — sustituyen a `CatalogShell`, a las 4 duplicaciones a mano y al auto-padding de reports.
- `Button` reescrito — 5 variantes (`filled`, `tonal`, `outlined`, `text`, `destructive`) × 3 tamaños, tokenizado, pill.
- `DataTable` (`Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`) — un solo dialecto de tabla.
- `Select` nuevo, `Input` y `FormField` retokenizados, `PageLoading`.

**Migración** — los 26 módulos adoptan las primitivas: listados, páginas de detalle, las 9 rutas de reports, POS y settings. Se eliminan `CatalogShell.tsx`, `Button.module.css`, `Input.module.css` y `FormField.module.css`, y los tres `layout.tsx` que duplican `px-gutter py-lg max-w-screen-2xl mx-auto`.

**Documentación y enforcement** — `designer.md` en la raíz, capability `design-system` en `openspec/specs/`, sección en `CLAUDE.md`, y `tests/unit/ui/design-system/tokens.test.ts` que falla ante cualquier regresión de token.

**Fuera de alcance** — los `<button>`, `<input>` y `<select>` crudos que viven dentro de modales y formularios internos quedan para una fase posterior, cubiertos por el allowlist del guardarraíl. `/auth/*` conserva la paleta legacy `agrisas-*`.

## Capabilities

### New Capabilities

- `design-system`: tokens canónicos (color, tipografía, spacing, radios, elevación), catálogo de primitivas con su API, recetas cerradas por tipo de pantalla, prohibiciones, y el guardarraíl automatizado que las hace exigibles.

### Modified Capabilities

- `frontend-scaffold`: las tablas de tokens se actualizan (escala tipográfica completa, radios Stitch, sombras); el requirement de Tailwind delega en `design-system` como fuente de verdad.
- `panel-shell`: la geometría de `<main>` pasa a `pl-20 pt-16` (rail 80px + barra 64px exactos, sin el `pr-2.5` asimétrico) y el padding de página pasa a ser responsabilidad de `PageShell`.
- `reports-ui`: las 9 rutas adoptan `PageShell` y `DataTable`; desaparece el auto-padding `px-4 py-6 mx-auto max-w-{5,6,7}xl` y los `th`/`td` const copiados en 4 archivos.

## Impact

- **Tokens**: `tailwind.config.ts`, `app/globals.css`.
- **Primitivas**: 6 componentes nuevos o reescritos bajo `app/_components/`; 3 CSS Modules eliminados.
- **Barrido mecánico**: 218 archivos, sin efecto visual neto.
- **Migración**: ~60 bloques bajo `app/(private)/`, más `app/(private)/layout.tsx` y 3 `layout.tsx` de módulo eliminados.
- **Tests**: 5 snapshots regenerados; 5 suites unitarias nuevas; 1 spec e2e nuevo; `playwright.config.ts` corregido (hoy tiene una ruta nvm absoluta de una máquina concreta) y script `test:e2e` añadido.
- **Sin cambios de API, sin migración de BD, sin impacto en `src/`.** El cambio es presentacional de punta a punta.
- **Efecto visual esperado y deseado**: al resucitar los 582 usos de clases muertas, el texto encoge a su tamaño previsto (tablas 16px→13px, títulos de reportes 16px→24px). Requiere revisión visual con Playwright antes de dar por buena la fase 1.
