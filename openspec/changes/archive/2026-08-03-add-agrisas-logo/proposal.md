## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario autenticado (cualquier rol) | Como usuario autenticado, quiero ver el logo oficial de Agrisas en el NavigationRail y en el TopAppBar para identificar visualmente la aplicación en la que estoy trabajando | - En `NavigationRail`, el header fijo muestra `logo.png` (`/public/logo.png`) en lugar del placeholder tipográfico "A"<br>- En `TopAppBar`, el logo reemplaza el texto "Agrisas" (no coexisten)<br>- El logo mantiene proporción (`object-contain`), sin distorsión, en el tamaño de cada contenedor<br>- Si la imagen no carga, existe `alt` descriptivo (no rompe layout) | - Es asset estático servido desde `/public`, no expone datos ni requiere endpoint autenticado<br>- No afecta gating por permisos existente (`useCurrentUser().can()`) — el logo es visible independientemente del rol |
| 2 | Visitante no autenticado | Como visitante no autenticado, quiero ver el logo de Agrisas en las pantallas de login/registro y en la pestaña del navegador (favicon) para reconocer la marca antes de iniciar sesión | - El panel izquierdo de `/auth/login` y `/auth/register` muestra `logo.png`<br>- `app/layout.tsx` declara `metadata.icons` apuntando a `/logo.png` y se refleja en el tab del navegador<br>- El logo reemplaza la ilustración SVG, el título "Agrisas" y el subtítulo "Gestión agrícola inteligente" — sólo queda el logo<br>- El fondo del panel izquierdo usa tonos de verde más claros para que el logo se distinga | - Asset público, sin autenticación ni exposición de datos sensibles<br>- No se modifica el flujo de login/registro (validación Zod, JWT) — cambio puramente visual |

Nota: se dividió en 2 historias porque el rol/contexto de autenticación difiere (privado vs. público), aunque el motivo raíz es el mismo (branding consistente del sistema con el asset ya provisto en `/public/logo.png`). Ambas trazan a `## What Changes`.

## Why

El sistema actualmente no tiene una identidad visual consistente: el `NavigationRail` muestra un placeholder tipográfico ("A"), el `TopAppBar` sólo tiene texto, y el layout de login/registro usa una ilustración SVG genérica sin logo. Ya existe el asset oficial `/public/logo.png`, subido y disponible, pero no se referencia en ningún punto de la UI ni como favicon del navegador. Reemplazar los placeholders por el logo real cierra ese hueco de branding sin tocar lógica de negocio.

## What Changes

- `NavigationRail`: el header fijo (actualmente `<span>A</span>`) muestra `logo.png` vía `next/image`.
- `TopAppBar`: el logo reemplaza el texto "Agrisas".
- `app/(public)/auth/layout.tsx`: el panel izquierdo del split-panel muestra únicamente el logo (reemplaza la ilustración SVG, el título y el subtítulo existentes).
- `app/(public)/auth/layout.module.css`: el gradiente de `.leftPanel` usa tonos de verde más claros para que el logo se distinga sobre el fondo.
- `app/layout.tsx`: se declara `metadata.icons` apuntando a `/logo.png` para que se use como favicon del navegador en toda la app (rutas públicas y privadas).
- Fuera de alcance explícito: el logo configurable del ticket de venta (`ticketSettings.logoUrl`, módulo `settings`) — es una feature ya existente y separada (logo por sucursal, subido a Supabase), no se toca.

## Capabilities

### New Capabilities
(ninguna — el cambio es puramente visual sobre capacidades ya existentes)

### Modified Capabilities
- `panel-shell`: nuevo requirement — el `NavigationRail` y el `TopAppBar` SHALL mostrar el logo `logo.png` en vez de los placeholders actuales; el `app/layout.tsx` raíz SHALL declarar el favicon global vía `metadata.icons`.
- `auth-ui`: el layout split-panel compartido (`app/(public)/auth/layout.tsx`) SHALL mostrar el logo `logo.png` en el panel izquierdo.

## Impact

- **Archivos de código**: `app/_components/organisms/NavigationRail/NavigationRail.tsx`, `app/_components/organisms/TopAppBar/TopAppBar.tsx`, `app/(public)/auth/layout.tsx`, `app/layout.tsx`.
- **Asset**: `public/logo.png` (ya existe, sin cambios).
- **Sin cambios de API, BD, ni RBAC** — cambio 100% frontend presentational.
- **Tests**: ajustar snapshots/tests unitarios de UI que referencien el placeholder "A" o el SVG del auth layout si existen bajo `tests/unit/ui/`.
