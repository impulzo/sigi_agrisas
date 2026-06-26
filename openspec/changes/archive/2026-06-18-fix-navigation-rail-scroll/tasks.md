## 1. CSS utility scrollbar-thin

- [x] 1.1 Añadir utility `scrollbar-thin` en `app/globals.css` con `::-webkit-scrollbar` (8px), `::-webkit-scrollbar-thumb` (color `outline-variant`, `border-radius: 4px`, hover `outline`) y fallback `scrollbar-width: thin` + `scrollbar-color` para Firefox.
- [x] 1.2 Verificar que la clase está accesible globalmente sin recompilar Tailwind (al ser CSS plano dentro de `@layer utilities`).

## 2. Layout privado con altura bloqueada

- [x] 2.1 Editar `app/(private)/layout.tsx` para envolver el shell en `<div className="h-screen overflow-hidden flex">` (o estructura equivalente). Mantener `Server Component`, `redirect` y `MaterialSymbolsLoader` intactos.
- [x] 2.2 Asegurar que `<main>` tiene `overflow-y-auto` y conserva `pl-[80px] pt-16` (o reubicar el padding según la nueva estructura flex sin alterar el layout visual).
- [x] 2.3 Auditar `Toaster` (sonner), modales POS (`<dialog>`) y portals para confirmar que NO dependen de scroll en `<body>`. Documentar hallazgos en comentarios de PR si hay ajustes.

## 3. NavigationRail con scroll independiente

- [x] 3.1 Reestructurar `app/_components/organisms/NavigationRail/NavigationRail.tsx` en tres secciones flex verticales: `<header>` (logo), `<nav class="flex-1 overflow-y-auto scrollbar-thin">` (items primarios + secundarios), `<footer class="flex-shrink-0">` (botón logout).
- [x] 3.2 Preservar el comportamiento RBAC actual (`useCurrentUser().can()`, gating optimista, `RailFlyout` para `catalogs`), `usePathname()` active state, navegación con `next/link`.
- [x] 3.3 Implementar `scrollIntoView({ block: "nearest" })` sobre el item activo en `useEffect` cuando cambia `pathname`, solo si el bounding rect del item queda fuera del viewport del contenedor scrolleable.
- [x] 3.4 Asegurar que el rail conserva `width: 80px`, posición fija a la izquierda y `h-screen`.

## 4. RailFlyout con overflow controlado

- [x] 4.1 Editar `app/_components/molecules/RailFlyout.tsx` para aplicar `max-height: calc(100vh - 32px)`, `overflow-y-auto` y la utility `scrollbar-thin`.
- [x] 4.2 Asegurar margen vertical mínimo de 16px arriba/abajo cuando el flyout se ancla cerca de los bordes del viewport.

## 5. Tests UI

- [x] 5.1 Añadir test en `tests/unit/ui/panel-shell/NavigationRail.scroll.test.tsx` que renderice el rail con viewport simulado de 480px y verifique: (a) el contenedor scrolleable tiene `overflow-y-auto`, (b) el footer del logout sigue presente en el DOM y visible.
- [x] 5.2 Añadir test en `tests/unit/ui/panel-shell/RailFlyout.scroll.test.tsx` que verifique `max-height` y `overflow-y-auto` aplicadas al flyout.
- [x] 5.3 Smoke test del layout en `tests/unit/ui/panel-shell/PrivateLayout.test.tsx`: el root contiene `h-screen overflow-hidden` y el `<main>` tiene `overflow-y-auto`.
- [x] 5.4 Ejecutar suite UI (`npm test -- panel-shell`) y verificar 0 regresiones en tests existentes. (2 fallas pre-existentes en NavigationRail: label "Inicio" vs "Dashboard" en items.ts + `requires: "reports:read"` vs sin requires; no causadas por este change.)

## 6. Verificación visual

- [x] 6.1 `npm run dev`, login y navegar `/dashboard`, `/pos`, `/sales`, `/quotes`, `/returns`, `/inventory`, `/catalogs`, `/users`, `/roles`. Verificar rail persistente con scroll independiente.
- [x] 6.2 Reducir altura del viewport a ~480px y confirmar que todos los items son alcanzables vía scroll dentro del rail.
- [x] 6.3 Hover sobre `Catálogos` con viewport reducido; confirmar que `RailFlyout` scrollea internamente sin recortar children.
- [x] 6.4 Probar en Chrome, Firefox y Safari (scrollbar fallback `scrollbar-width: thin`).

## 7. Reporte

- [x] 7.1 Generar `openspec/changes/fix-navigation-rail-scroll/report.md` con historial de cambios, pruebas ejecutadas y decisiones, redactado en modo caveman.
