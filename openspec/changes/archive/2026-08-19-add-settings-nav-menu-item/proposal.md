## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario autenticado con permiso `settings:read` | Como usuario autenticado, quiero ver "Configuración" en el menú lateral para acceder a `/settings` sin escribir la URL manualmente | Hoy el módulo de settings existe y está gateado por permiso, pero no aparece en la navegación — sólo accesible si conoces la ruta de memoria | - Item "Configuración" visible en `secondaryItems` del NavigationRail, junto a Support/Account.<br>- Click navega a `/settings`.<br>- Ícono `settings` renderiza correctamente (ya existe en `icons.ts`).<br>- Item se muestra activo (`isActive`) cuando `pathname` empieza con `/settings`.<br>- Item se oculta si `can("settings:read") === false` y se muestra optimistamente si es `"loading"`.<br>- No rompe el layout existente del footer del rail (logout, secondaryItems). | - El item del rail SÍ declara `requires: "settings:read"`, consistente con el resto de destinos administrables del rail (`users`, `roles`, `catalogs`) — no es un caso especial como Support/Account.<br>- `NavigationRail.tsx` filtra `secondaryItems` con la misma lógica que ya usa para `primaryItems` (visible si `can(requires)` es `true` o `"loading"`; oculto si `false`); items sin `requires` (Support, Account) se mantienen siempre visibles.<br>- La autorización real sigue viviendo donde ya estaba (defensa en profundidad): `SettingsPage` bloquea con `EmptyState` si `can("settings:read") !== true`; API routes ya validan `settings:read`/`settings:write` vía `requirePermission`.<br>- Ningún usuario sin `settings:read` puede leer ni mutar configuración, y ahora tampoco ve el link en el menú. |

Nota: una sola historia — cambio atómico (1 archivo), no se dividió.

## Why

El módulo de configuración (`/settings`, ticket + pricing) ya está completo de punta a punta: backend, permisos `settings:read`/`settings:write` seedeados para los 3 roles, y gate client-side en `SettingsPage`. Falta el último eslabón — la entrada visible en el `NavigationRail` — sin la cual la única forma de llegar es escribiendo la URL de memoria. El resto de módulos administrables (Usuarios, Roles, Catálogos, etc.) sí tienen su entrada en el rail; Configuración quedó fuera cuando se implementó el módulo (`crud-settings-models`, `dosification-surcharge-settings`).

## What Changes

- Se agrega el item `settings` a `secondaryItems` en `app/_components/organisms/NavigationRail/items.ts`, junto a `support`/`account`, declarando `requires: "settings:read"`.
- `IconName` en `app/_components/atoms/Icon/icons.ts` ya incluye `"settings"` — sin cambios.
- Se modifica `NavigationRail.tsx`: hoy `secondaryItems` se renderiza sin ningún filtro por permiso (`support`/`account` no lo necesitan). Se agrega un filtro `visibleSecondaryItems` análogo al ya existente para `primaryItems` (`can(requires)` → visible si `true`/`"loading"`, oculto si `false`; items sin `requires` siempre visibles), y el render usa esa lista filtrada.
- No se toca backend/permisos/seed — ya están completos (`settings:read` seedeado para admin/operator/viewer).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `panel-shell`: el requirement "NavigationRail organism con destinos primarios y secundarios" (spec.md línea ~189, ~236) documenta la lista fija de destinos secundarios (`Soporte`, `Cuenta`); se amplía para incluir `Configuración` como tercer destino secundario.

## Impact

- **Archivos modificados**: `app/_components/organisms/NavigationRail/items.ts` (agrega 1 entrada a `secondaryItems` con `requires`), `app/_components/organisms/NavigationRail/NavigationRail.tsx` (filtro de `secondaryItems` por permiso).
- **Sin impacto** en `app/_components/atoms/Icon/icons.ts` (`"settings"` ya existe), backend, API routes, seed RBAC, ni en `SettingsPage`/`SettingsController` — todos ya operativos.
- **Spec afectada**: `openspec/specs/panel-shell/spec.md` (delta spec para el requirement de destinos secundarios).
