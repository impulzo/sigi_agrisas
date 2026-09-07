## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario recién invitado (cualquier rol RBAC) | Como usuario recién invitado, quiero que al completar mi contraseña vía `/auth/set-password?token=...` el sistema me lleve directo a `/pos` para poder empezar a trabajar sin toparme con una pantalla de error o acceso denegado | Evitar fricción/confusión en el primer acceso: hoy el redirect a `/dashboard` termina en un rebote silencioso a `/pos` (o en "Sin acceso" si el rol no tiene `sales:create`/`quotes:create`), dando la impresión de que el sistema falló justo tras crear la contraseña | - Given token válido y contraseña válida, When se envía el formulario de `/auth/set-password`, Then `router.replace("/pos")` se ejecuta (no `/dashboard`)<br>- Given usuario con rol `admin`, When completa set-password, Then aterriza en `/pos` (no en `/dashboard`, aunque tenga acceso a ambos)<br>- Given usuario con rol `viewer` (sin `sales:create` ni `quotes:create`), When completa set-password, Then aterriza en `/pos` y ve el `EmptyState` "Sin acceso" definido por `PosPage` — comportamiento esperado del guard de permisos, no un error del redirect en sí<br>- Given token expirado/inválido, When se envía el formulario, Then se mantiene en la página con mensaje de error (comportamiento actual sin cambios, fuera de este fix) | - No se introduce ni retira ninguna verificación de permisos: el guard de `/pos` (`can("sales:create")`/`can("quotes:create")`) sigue siendo la única puerta de acceso funcional, este fix sólo cambia el destino de redirect<br>- El `accessToken`/`refreshToken` emitidos por `CompletePasswordSetupUseCase` no cambian; no se toca la sesión ni su emisión<br>- No se expone información adicional del usuario (roles/permisos) en el cliente más allá de lo que `useCurrentUser` ya consulta hoy |

## Why

Tras completar el flujo de establecer/restablecer contraseña, `useSetPasswordForm.ts:65` redirige a `/dashboard`. Ese destino nunca fue pensado como aterrizaje universal: `app/(private)/dashboard/page.tsx:19-22` expulsa server-side a todo usuario sin rol `admin` hacia `/pos`, y `/pos` (`PosPage.tsx`) exige a su vez `sales:create` o `quotes:create`. Un usuario con rol `viewer` (u otro rol de solo lectura) que acaba de establecer su contraseña por primera vez pasa por dos redirects invisibles y termina en una pantalla "Sin acceso" — parece un fallo del sistema justo en el momento de mayor fricción (primer acceso).

`openspec/specs/panel-shell/spec.md` ya declara la garantía de que ningún hook de auth debe usar `/dashboard` como destino post-éxito — los hooks `useLoginForm` y `useRegisterForm` cumplen esto (`router.replace("/pos")`), pero `useSetPasswordForm` quedó fuera del spec y del comportamiento. No es una decisión documentada: es un bug huérfano de spec.

## What Changes

- `app/(public)/auth/_logic/hooks/useSetPasswordForm.ts:65` — cambiar `router.replace("/dashboard")` por `router.replace("/pos")`, alineando el hook con el patrón ya usado en `useLoginForm.ts:73`.
- Ampliar la lista de hooks cubiertos por la garantía "ningún hook de auth redirige a `/dashboard`" en `panel-shell/spec.md` para incluir explícitamente `useSetPasswordForm`.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `panel-shell`: el requirement de destino post-auth (`router.replace("/pos")` como único destino válido tras un flujo de auth exitoso) se extiende para cubrir explícitamente `useSetPasswordForm`, que hoy queda fuera de la redacción actual del spec.

## Impact

- **Código**: 1 línea en `app/(public)/auth/_logic/hooks/useSetPasswordForm.ts`.
- **Specs**: delta en `openspec/specs/panel-shell/spec.md` (capability `panel-shell`).
- **Sin impacto en backend**: no toca `CompletePasswordSetupUseCase`, `AuthController`, JWT, ni RBAC.
- **Sin impacto en otros hooks**: `useLoginForm.ts` y `useRegisterForm.ts` no se modifican, sólo sirven de referencia de patrón ya conforme.
- **Tests**: posible ajuste en tests unitarios de `useSetPasswordForm` (si existen) que aserten el destino de redirect.
