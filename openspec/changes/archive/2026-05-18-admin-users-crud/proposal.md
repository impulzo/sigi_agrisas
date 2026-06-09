## Why

El panel no tiene forma de que un administrador gestione los usuarios registrados: no puede listarlos, ver su perfil, corregir datos ni eliminar cuentas. Los permisos `users:read` y `users:write` ya existen en el seed de RBAC pero no hay endpoints que los consuman.

## What Changes

- Nuevo endpoint `GET /api/v1/admin/users` — lista paginada de usuarios con sus roles asignados (requiere `users:read`).
- Nuevo endpoint `GET /api/v1/admin/users/:id` — detalle de un usuario (requiere `users:read`).
- Nuevo endpoint `PATCH /api/v1/admin/users/:id` — actualiza `name` y/o `email` de un usuario (requiere `users:write`).
- Nuevo endpoint `DELETE /api/v1/admin/users/:id` — elimina un usuario y sus asignaciones de rol (requiere `users:write`).
- No se expone `passwordHash` en ninguna respuesta.
- No se puede eliminar ni editar el propio usuario autenticado (previene auto-lockout accidental).

## Capabilities

### New Capabilities

- `admin-users`: CRUD de usuarios para administradores vía API REST; incluye listado paginado, detalle, actualización de perfil y eliminación con limpieza de roles.

### Modified Capabilities

<!-- ninguna -->

## Impact

- **Backend**: nuevo módulo `src/modules/users/` con arquitectura hexagonal (domain → application → infrastructure). Los route handlers `app/api/v1/admin/users/` delegan a un `UsersController`.
- **Base de datos**: sin migraciones nuevas; se reutiliza la tabla `users` y la relación `UserRole`.
- **RBAC**: los permisos `users:read` / `users:write` ya están en seed; se consumen vía `requirePermission`.
- **Auth module**: `UserRepository` (puerto) ya existe en `src/modules/auth/application/ports/`; el módulo `users/` crea su propia implementación Prisma para no acoplar módulos.
