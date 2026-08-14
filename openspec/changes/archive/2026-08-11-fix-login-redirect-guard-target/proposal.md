## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario autenticado | Como usuario autenticado, quiero que al visitar `/auth/login` o `/auth/register` con sesión activa me redirija a `/pos` en vez de `/dashboard`, para tener el mismo destino que el resto de flujos post-login (raíz `/` y submit de login) | - Given cookie `refreshToken` presente, When visito `/auth/login`, Then redirect server-side a `/pos` (no `/dashboard`)<br>- Given cookie `refreshToken` presente, When visito `/auth/register`, Then redirect server-side a `/pos`<br>- Given sin cookie `refreshToken`, When visito cualquiera de las dos rutas, Then se renderiza el formulario normalmente (sin redirect) | - No exponer estado de sesión de terceros: el guard sólo lee la cookie propia `refreshToken` (HttpOnly), sin validar su firma en este punto (igual que el comportamiento actual — no se introduce nueva superficie)<br>- Redirect server-side (no client-side) evita parpadeo de formulario con datos de sesión ya autenticada |

## Why

El destino post-login del sistema es `/pos`, no `/dashboard`: la raíz `app/page.tsx` y el hook `useLoginForm` (submit real de login) ya redirigen a `/pos` desde el commit `b90bbda` ("feat: Add Changes Version 1.3"). Sin embargo, los guards server-side de `app/(public)/auth/login/page.tsx` y `app/(public)/auth/register/page.tsx` (que redirigen a un usuario ya autenticado que visita esas rutas) quedaron apuntando a `/dashboard` — no se tocaron en ese commit. Resultado: un usuario ya logueado que navega manualmente a `/auth/login` (ej. escribiendo la URL o con un bookmark viejo) aterriza en `/dashboard` en vez de `/pos`, inconsistente con el resto del sistema.

## What Changes

- `app/(public)/auth/login/page.tsx`: el guard SSR (`if (cookieStore.get("refreshToken")) redirect(...)`) cambia su destino de `"/dashboard"` a `"/pos"`.
- `app/(public)/auth/register/page.tsx`: mismo guard, mismo cambio de destino.
- `openspec/specs/auth-ui/spec.md`: actualiza los dos escenarios ("Usuario autenticado accede a /auth/login" y "Usuario autenticado accede a /auth/register") que documentaban `/dashboard` como destino esperado, para reflejar `/pos`.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `auth-ui`: los requerimientos "Página de login accesible sin autenticación" y "Página de registro accesible sin autenticación" cambian su escenario de usuario ya autenticado — destino de redirect pasa de `/dashboard` a `/pos`.

## Impact

- Archivos: `app/(public)/auth/login/page.tsx`, `app/(public)/auth/register/page.tsx`.
- Spec: `openspec/specs/auth-ui/spec.md` (2 escenarios).
- Sin cambios de API, sin migración, sin impacto en otros módulos. Cambio de 1 línea por archivo.
