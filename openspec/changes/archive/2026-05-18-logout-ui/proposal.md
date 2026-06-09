## Why

El panel no tiene ninguna acción de cierre de sesión en la UI: los usuarios no pueden cerrar su sesión voluntariamente y dependen del vencimiento del access token (15 min) o del refresh token (7 días). El backend `POST /api/v1/auth/logout` ya existe y borra la cookie `refreshToken`; sólo falta conectarlo desde el frontend.

## What Changes

- Nuevo servicio `app/(public)/auth/_logic/services/logout.ts` que llama `POST /api/v1/auth/logout` y limpia `sessionStorage` (elimina `accessToken`).
- Nuevo hook `app/(public)/auth/_logic/hooks/useLogout.ts` que orquesta el servicio y redirige a `/auth/login` usando `useRouter`.
- Botón de logout en el `NavigationRail` (ya es Client Component): icono `logout` Material Symbols al final del grupo secundario, debajo de "Account", con `title="Cerrar sesión"`. Al pulsar invoca `useLogout`.
- Tests unitarios para el servicio y el hook.

## Capabilities

### New Capabilities

- `logout-ui`: Flujo completo de cierre de sesión en cliente — servicio HTTP, hook de orquestación y botón en la barra de navegación.

### Modified Capabilities

- `panel-shell`: El `NavigationRail` incorpora una acción de logout (no un link de navegación) al final del grupo secundario.

## Impact

- `app/(public)/auth/_logic/services/logout.ts` — nuevo
- `app/(public)/auth/_logic/hooks/useLogout.ts` — nuevo
- `app/_components/organisms/NavigationRail/NavigationRail.tsx` — añade botón de logout al final del `<div className="mt-auto">`
- `tests/unit/ui/(public)/auth/_logic/services/logout.test.ts` — nuevo
- `tests/unit/ui/(public)/auth/_logic/hooks/useLogout.test.ts` — nuevo
- Sin cambios de BD, sin nuevos endpoints, sin nuevas dependencias
