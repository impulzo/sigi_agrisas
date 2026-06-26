---
name: fix-navigation-rail-scroll-report
description: Historial de cambios, pruebas y decisiones — scroll independiente del NavigationRail
metadata:
  type: project
---

# Reporte: fix-navigation-rail-scroll

## Cambios implementados

**`app/globals.css`**
- utility `scrollbar-thin` en `@layer utilities`. webkit 8px thumb `outline-variant`, hover `outline`. Firefox fallback `scrollbar-width: thin`.

**`app/(private)/layout.tsx`**
- Root div: `h-screen overflow-hidden` reemplaza `min-h-screen`. `<main>` gana `h-full overflow-y-auto`. Padding `pl-[80px] pt-16` preservado. `NavigationRail` y `TopAppBar` siguen `position: fixed` — sin conflicto con `overflow: hidden` (fixed relativo al viewport, no al padre).

**`app/_components/organisms/NavigationRail/NavigationRail.tsx`**
- 3 zonas flex verticales:
  - Header fijo: logo `flex-shrink-0`.
  - Nav scrolleable: `flex-1 overflow-y-auto scrollbar-thin gap-md`. Items primarios + secundarios dentro. `mt-auto` en bloque secundario para empujar al fondo cuando sobra espacio.
  - Footer fijo: logout `flex-shrink-0`.
- `useEffect` con `navRef` scrollea item activo a la vista (`scrollIntoView nearest`) si su bounding rect sale del nav.
- Items simples envueltos en `<div data-active>` para targeting del scrollIntoView.
- RBAC, active state, RailFlyout, keyboard: preservados.

**`app/_components/molecules/RailFlyout/RailFlyout.tsx`**
- `maxHeight: calc(100vh - 32px)` vía style inline. `overflow-y-auto scrollbar-thin` en clases. `top` clamped `max(16, min(anchorTop, vh-32))`.

## Decisiones

- `overflow: hidden` en root no rompe `<dialog>` (top layer nativo) ni modales POS.
- Logo y logout fuera del scroll: ancla visual + acción crítica siempre alcanzable.
- `BroadcastChannel` para multi-tab: not in scope — próximo change `inactivity-session-timeout`.
- No introducir librerías de scroll externas.

## Pruebas

| Suite | Estado |
|---|---|
| RailFlyout (scroll: max-height, overflow-y-auto, clamp min 16px) | PASS |
| NavigationRail (scroll: overflow-y-auto en nav, logout en DOM) | PASS |
| Resto NavigationRail existentes | 2 FALLAS PRE-EXISTENTES (label "Inicio" vs "Dashboard" en items.ts; `requires: "reports:read"` en dashboard) — no causadas por este change |
| TS check (archivos cambiados) | 0 errores |
| Build (`next build`) | clean |

## Pre-existing issues detectados

`items.ts` label `"Dashboard"` ≠ test expects `"Inicio"`. Dashboard tiene `requires: "reports:read"` pero test espera sin requires. Pendiente corrección en change separado (fuera de scope de este fix).
