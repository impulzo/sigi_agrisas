## Why

El `NavigationRail` actual no contempla overflow: en resoluciones con poco alto vertical (laptops 13", tablets en landscape acotado, splits) los items inferiores (`/users`, `/roles`, soporte, logout) quedan inaccesibles porque el rail no scrollea de forma independiente y el scroll del documento no lo alcanza. Esto bloquea el acceso a módulos completos del panel y rompe el contrato de "menú persistente y alcanzable" del shell privado.

## What Changes

- `NavigationRail` introduce scroll vertical interno cuando la altura combinada de items primarios + secundarios + logout excede el alto disponible.
- El rail mantiene su comportamiento sticky/full-height en el layout privado: el scroll del menú es independiente del scroll del contenido principal.
- Scrollbar discreta (estilizada acorde al design system Material 3 "Agro-Systemic"): no intrusiva en idle, visible al hover/scroll.
- `RailFlyout` (submenú de `catalogs`) también scrollea internamente si el listado de hijos excede el viewport vertical.
- El layout privado (`app/(private)/layout.tsx`) garantiza `h-screen` + `overflow-hidden` a nivel contenedor para que el rail y el `<main>` scrolleen de forma independiente.
- Sin cambios en `RailItem` API, permisos, gating ni navegación.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `panel-shell`: añade requirement de scroll vertical independiente en `NavigationRail` y `RailFlyout`; refuerza requirement de persistencia del rail con layout `h-screen` + contenedor `overflow-hidden`.

## Impact

- **Código afectado**:
  - `app/_components/organisms/NavigationRail.tsx` (estructura interna: contenedor flex-col + sección scrollable + footer fijo).
  - `app/_components/molecules/RailFlyout.tsx` (max-height + overflow-y-auto).
  - `app/(private)/layout.tsx` (asegurar `h-screen overflow-hidden` en el wrapper y `overflow-y-auto` en `<main>`).
  - `app/globals.css` o `tailwind.config.ts`: utilidad opcional `scrollbar-thin` para estilizar la barra (sin librerías externas).
- **Sin cambios**: backend, RBAC, permisos, contratos API, tests de hooks.
- **Tests UI**: extender `tests/unit/ui/panel-shell/` con caso de overflow (mock alto reducido) verificando que el contenedor de items tiene `overflow-y-auto` y que el footer queda fijo.
- **Dependencias**: ninguna nueva. Solo Tailwind utilities.
- **Riesgo**: bajo. Cambio CSS + estructura DOM mínima; no toca lógica de routing ni permisos.
