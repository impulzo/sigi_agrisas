## 1. Implementación

- [x] 1.1 Agregar `{ key: "settings", href: "/settings", icon: "settings", label: "Configuración", requires: "settings:read" }` a `secondaryItems` en `app/_components/organisms/NavigationRail/items.ts`, después de `account`.
- [x] 1.2 Confirmar que `"settings"` ya existe en `IconName` (`app/_components/atoms/Icon/icons.ts`) — verificado que sí existe, no requiere cambio.
- [x] 1.3 En `NavigationRail.tsx`, agregar `visibleSecondaryItems` con el mismo filtro que ya usa `visiblePrimaryItems` (`!item.requires → true`; con `requires`, visible si `can(requires)` es `true`/`"loading"`, oculto si `false`) y usar esa lista filtrada en el render en vez de `secondaryItems` directo.

## 2. Verificación manual

- [x] 2.1 `npm run build` pasa sin errores de tipos (verificado con `tsc --noEmit` sobre archivos modificados — `NavigationRail.tsx`/`items.ts` sin errores; `next build` no corre en este entorno por Node 18.0.0 < 18.17 requerido por Next.js, preexistente, no relacionado al cambio).
- [x] 2.2 Levantar `npm run dev` (requirió `nvm use 20.20.2`; Node 18.0.0 default del entorno es incompatible con Next.js). Verificación manual en browser bloqueada por fallo del extension/tooling de automatización de Chrome (timeouts persistentes de `document_idle` en 4 intentos con distintas tools, page cargaba bien server-side según logs de `next dev` — GET /auth/login 200). Cubierto en su lugar con tests automatizados equivalentes (ver sección 3) que ejercitan el mismo componente (`NavigationRail`) con RTL.
- [x] 2.3 Cubierto por test automatizado "Configuración activo cuando pathname empieza con /settings" (ver 3.1).
- [x] 2.4 Cubierto por test automatizado "Support y Account siguen visibles sin depender de can()" (ver 3.2).
- [x] 2.5 Sin cambios en `SettingsPage` — su gate (`can("settings:read")` → `EmptyState`) no fue tocado por este change; comportamiento preexistente, no requiere re-verificación.

## 3. Tests

- [x] 3.1 Agregado test unitario de `NavigationRail` (`tests/unit/ui/_components/organisms/NavigationRail.test.tsx`, describe "NavigationRail — item Configuración (secondaryItems)") cubriendo: oculto sin `settings:read`, visible con el permiso, visible optimistamente en `"loading"`, href correcto, active state.
- [x] 3.2 Agregado test "Support y Account siguen visibles sin depender de can()" en el mismo describe block.

## 4. Cierre

- [x] 4.1 `npm test` completo ejecutado: 472/472 suites, 3362/3362 tests, 14/14 snapshots — todos verdes. Sin regresiones.
- [x] 4.2 `opsx:verify` contra proposal/design/specs de este change — item `settings` en `NavigationRail/items.ts:48` confirmado, `NavigationRail.test.tsx` 32/32 en verde. Sin issues.
