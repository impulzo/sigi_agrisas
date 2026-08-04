## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador | Como administrador, quiero crear nuevos usuarios desde el panel admin (`POST /api/v1/admin/users`) para dar de alta operadores/viewers sin depender del registro público | - Dado name, email, password (≥8), body válido → 201 con el usuario creado (sin `passwordHash` en la respuesta)<br>- Dado email ya usado → 409 `EmailAlreadyInUseError`<br>- Dado `branchId` que no corresponde a una sucursal activa → 400 `BranchNotFoundForUserError`<br>- `branchId` y `roleIds` son opcionales; ausentes → usuario queda sin sucursal (`null`) y sin roles<br>- `avatarUrl` ausente/`null` → fallback Gravatar (mismo comportamiento que en listado/edición) | - Requiere permiso `users:write` (401 sin `x-user-id`, 403 sin el permiso)<br>- Password se hashea con `BcryptPasswordHasher` antes de persistir; nunca se loguea ni se devuelve en claro<br>- Validación Zod en el controller antes de tocar el use case (name, email, password, avatarUrl, branchId, roleIds)<br>- Creación de usuario + asignación de roles en una sola transacción (evita usuario huérfano sin rol si falla el paso de roles) |
| 2 | Administrador | Como administrador, quiero asignar o cambiar la sucursal de un usuario desde el modal de usuario (crear y editar) para poder aplicar branch scoping sin tocar la base de datos directamente | - El modal (create y edit) muestra un selector de sucursal poblado por `useBranchesOptions` (solo sucursales activas)<br>- Selector incluye opción "Sin sucursal" → envía `branchId: null`<br>- En edición, seleccionar una sucursal inexistente/inactiva no es posible desde la UI (el combo solo lista activas); si el backend igual rechaza (carrera con desactivación) → error 400 se muestra inline en el campo<br>- Cambiar sucursal de un usuario ya logueado no invalida su sesión activa (comportamiento documentado: efecto en próximo refresh/login) | - El selector solo se habilita si el usuario autenticado tiene `users:write` (mismo gate que el resto del formulario)<br>- El `branchId` viaja igual que el resto del diff PATCH (solo se envía si cambió) — no se expone el listado completo de sucursales a roles sin `users:read`/`branches:read` |
| 3 | Administrador | Como administrador, quiero un botón "Crear usuario" en la pantalla de Usuarios para abrir el modal en modo creación sin confundirlo con edición | - Botón visible solo si `can("users:write")` es `true`; oculto si `false`, mostrado optimistamente si `"loading"` (patrón ya usado en el resto del panel)<br>- Click abre `UserEditModal` en `mode="create"`: título "Crear usuario", campo password visible y requerido<br>- En `mode="edit"` el campo password permanece oculto (sin cambios al flujo actual)<br>- Al guardar en modo create exitosamente, el modal cierra y la tabla se refresca mostrando el nuevo usuario | - Sin gate de permiso, un usuario sin `users:write` no debe poder invocar la creación ni por manipulación de UI (el backend igual exige `users:write` — defensa en profundidad, no solo ocultar el botón) |

## Why

Auditoría QA manual detectó que el panel admin no ofrece ningún camino para crear usuarios (la única alta existente es `/auth/register`, público y sin `branchId`/`roleIds`) ni para asignar la sucursal de un usuario ya creado, pese a que el backend de `PATCH /api/v1/admin/users/:id` ya valida y persiste `branchId`. Hoy solo existe un usuario en producción (`admin@example.com`, `branch_id = null`), lo que confirma que el flujo de alta y de asignación de sucursal nunca se completó del lado del panel. Sin esto, el branch scoping (`enforceBranchScope`, claim `branchId` del JWT) no se puede operar desde la UI para ningún operador nuevo.

## What Changes

- Nuevo endpoint `POST /api/v1/admin/users` (permiso `users:write`) que crea usuarios: valida `name`/`email`/`password` con Zod, hashea el password con `BcryptPasswordHasher`, valida `branchId` opcional contra sucursales activas, asigna `roleIds` opcionales en la misma transacción.
- Nuevo `CreateAdminUserUseCase` + método `create()` en el puerto `AdminUserRepository` (implementado en `PrismaAdminUserRepository`).
- Nuevo hook global `useBranchesOptions` (clon del patrón `useHeadquarters`) que expone sucursales activas para selects.
- `UserEditModal` pasa a soportar `mode: "create" | "edit"`: en `create` muestra campo password y habilita alta; en ambos modos agrega selector de sucursal (`branchId`).
- Botón "Crear usuario" en `UsersToolbar`, gateado por `users:write`, que abre el modal en modo creación.
- Nuevos artefactos frontend: `createUser.ts` (service), `createUser.schema.ts`, extensión de `updateUser.schema.ts`/tipos/`useUserMutations` para incluir `branchId`.

## Capabilities

### New Capabilities
(ninguna — el cambio extiende la capability existente `admin-users`, no introduce un dominio nuevo)

### Modified Capabilities
- `admin-users`: se añade el requisito de creación de usuarios vía panel admin (`POST`) y el requisito de que `branchId` sea asignable desde la UI (create y edit), no solo desde el backend.

## Impact

- **Backend**: `src/modules/users/application/{use-cases,ports,dto}/`, `src/modules/users/infrastructure/{http/UsersController.ts,repositories/PrismaAdminUserRepository.ts,di/container.ts}`, `app/api/v1/admin/users/route.ts`.
- **Frontend**: `app/_hooks/useBranchesOptions.ts` (nuevo), `app/(private)/users/_blocks/{UserEditModal.tsx,UsersToolbar.tsx,UsersPage.tsx}`, `app/(private)/users/_logic/{services,schemas,types,hooks}/*`.
- **Tests**: nuevo `tests/unit/modules/users/application/use-cases/CreateAdminUserUseCase.test.ts`; extensión de `tests/unit/ui/(private)/users/{UserEditModal.test.tsx,hooks/useUserMutations.test.ts}`.
- **Sin cambios de esquema Prisma**: `branchId` ya existe en `User` (migración previa); no se requiere nueva migración.
- **RBAC**: reutiliza el permiso existente `users:write` (no se crea permiso nuevo).
