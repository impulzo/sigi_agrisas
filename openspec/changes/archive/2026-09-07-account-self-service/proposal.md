## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario autenticado (cualquier rol) | Como usuario autenticado, quiero editar mi propio nombre y correo desde `/account` para mantener mis datos de contacto actualizados sin depender de un administrador | - Given estoy en `/account`, when cambio nombre y/o correo y guardo, then se aplica el PATCH sólo con los campos que cambiaron (diff-gated), igual que el patrón admin<br>- Given dejo el correo con formato inválido, when intento guardar, then error de validación inline antes de enviar al backend<br>- Given el correo ya está en uso por otra cuenta, when guardo, then error 409 se muestra inline en el campo correo, sin aplicar el cambio<br>- Given no modifico ningún campo, when presiono guardar, then el botón está deshabilitado o no se dispara request | - El endpoint deriva el `id` a editar exclusivamente del `x-user-id` propagado por el middleware (JWT), nunca de un `id` en el body o la URL — imposible editar la cuenta de otro usuario desde este flujo<br>- Sin permiso RBAC adicional requerido: basta con estar autenticado<br>- No se exponen ni aceptan campos fuera de alcance (`avatarUrl`, `branchId`, `roles`) por este endpoint — siguen siendo admin-only<br>- Backend valida `name`/`email` con Zod en el adaptador HTTP, no en dominio |
| 2 | Usuario autenticado (cualquier rol) | Como usuario autenticado, quiero solicitar desde `/account` que me envíen un enlace para establecer una nueva contraseña, para poder rotarla sin depender de que un admin me lo reenvíe | - Given estoy en `/account` y presiono "Enviarme link de cambio de contraseña", when la solicitud se procesa, then recibo un correo con el mismo mecanismo de enlace/token que ya usa el admin al crear o resetear a otro usuario (`SendSetPasswordEmailUseCase`)<br>- Given el envío del correo falla (proveedor SMTP caído), when reintento, then veo un error inline claro, sin caída del resto de la página<br>- Given ya había un enlace vigente sin usar, when solicito uno nuevo, then el anterior se invalida (mismo comportamiento que el flujo admin, `IssuePasswordSetupTokenUseCase.invalidateAllForUser`) | - Ningún dato de contraseña (actual ni nueva) se maneja en este flujo — se corrige de la versión anterior de esta historia, que proponía comparar la contraseña actual y aplicar una nueva directamente; **decisión explícita del usuario**: la contraseña propia SIEMPRE se cambia vía enlace de correo, reusando el flujo admin existente, nunca de forma directa<br>- `userId` objetivo viene sólo de `x-user-id` (JWT), nunca de body — el usuario únicamente puede pedir su propio enlace<br>- Sin permiso RBAC adicional: basta con estar autenticado<br>- Token de un solo uso, expira en 24h — mismas garantías que ya tiene `IssuePasswordSetupTokenUseCase`/`CompletePasswordSetupUseCase`, sin código nuevo de dominio |

Nota: la feature se dividió en 2 historias (perfil vs. contraseña) porque tienen criterios de aceptación y de seguridad independientes — ambas caben en el mismo módulo `/account` pero son historias INVEST separadas.

**Corrección de alcance (post-implementación inicial):** la Historia 2 originalmente se implementó como cambio directo (contraseña actual + nueva, con verificación server-side vía `ChangeOwnPasswordUseCase`). El usuario aclaró que la decisión tomada al aprobar el spec original era reusar el flujo existente de enlace por correo (`SendSetPasswordEmailUseCase`), no crear uno directo nuevo. Se corrigió: `ChangeOwnPasswordUseCase` y todo el flujo directo (endpoint, formulario, tests) se eliminaron; `/account` ahora dispara el mismo mecanismo de correo que ya usa el admin.

## Why

Hoy ningún usuario puede editar su propio nombre, correo o contraseña: el panel admin (`/users`) permite a un admin editar a otros, pero bloquea explícitamente la auto-edición (`SelfModificationError` en `UpdateUserUseCase`), y el cambio de contraseña sólo existe vía flujo de correo/token disparado por un admin (`SendSetPasswordEmailUseCase`). Cualquier usuario que quiera corregir su nombre, actualizar su correo o rotar su contraseña por rutina de seguridad depende de pedírselo a un admin. `CLAUDE.md` ya referencia una ruta `/account` en `NavigationRail` como placeholder — este cambio la implementa.

## What Changes

- Nuevo endpoint `GET /api/v1/auth/me` — perfil propio (`id`, `name`, `email`, `avatarUrl`), resuelto desde `x-user-id` (JWT), sin permiso RBAC adicional.
- Nuevo endpoint `PATCH /api/v1/auth/me` — actualiza `name`/`email` propios (≥1 campo), vía nuevo `UpdateOwnProfileUseCase` (sin el guard `SelfModificationError`, que es exclusivo del flujo admin-edita-otros).
- Nuevo endpoint `POST /api/v1/auth/send-password-link` — dispara el envío del correo de cambio de contraseña al propio usuario, reusando `SendSetPasswordEmailUseCase` (el mismo que ya usa el admin), sin use case de dominio nuevo.
- Nueva ruta frontend `app/(private)/account/` con formularios de perfil y contraseña, siguiendo el patrón diff-gated ya usado en `users`/`providers`/`customers`.
- Sin cambios al flujo admin existente (`UserEditModal`, `SendSetPasswordEmailUseCase`, guard `SelfModificationError`).

## Capabilities

### New Capabilities
- `account-self-service`: perfil propio (ver/editar nombre y correo) y cambio de contraseña propia, para cualquier usuario autenticado, independiente del flujo admin de gestión de usuarios.

### Modified Capabilities
- `panel-shell`: el `NavigationRail` gana el destino secundario `/account` ("Mi cuenta"), visible a cualquier usuario autenticado (sin `requires`). El requirement "NavigationRail organism con destinos primarios y secundarios" pasa de exigir *únicamente* `/settings` como secundario a admitir `/account` + `/settings`. El guard de auto-edición admin (`admin-users`) no cambia — sólo se agrega un flujo paralelo distinto.

## Impact

- **Backend**: `src/modules/users/application/use-cases/UpdateOwnProfileUseCase.ts` (nuevo), `src/modules/auth/infrastructure/http/AuthController.ts` (extendido: `me`, `updateMe`, `sendMyPasswordLink` — reusa `SendSetPasswordEmailUseCase`, ya existente; `sendMyPasswordLink` acotado con rate limit de 60s por usuario vía `src/shared/infrastructure/http/rateLimit.ts`), `src/modules/auth/infrastructure/di/container.ts` (nuevas instancias), `app/api/v1/auth/me/route.ts` (nuevo), `app/api/v1/auth/send-password-link/route.ts` (nuevo).
- **Frontend**: `app/(private)/account/` (nuevo módulo completo: page, layout, `_blocks/`, `_logic/`). `NavigationRail/items.ts` gana el ítem `account`.
- **Sin migraciones de BD** — reusa columnas/tablas existentes (`users.name`, `users.email`, `users.password_hash`).
- **Sin nuevos permisos RBAC** — acceso por autenticación únicamente.
