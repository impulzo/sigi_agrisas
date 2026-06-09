## Context

El sistema tiene un módulo `auth` que maneja identidad/sesión (register, login, logout, refresh) y un módulo `rbac` que maneja roles y permisos. La tabla `users` ya existe en Prisma con los campos `id`, `name`, `email`, `passwordHash`, `createdAt`, `updatedAt`. Los permisos `users:read` y `users:write` están en el seed pero no hay ningún endpoint que los use para administración de usuarios.

La arquitectura del proyecto es hexagonal estricta: dominio puro → puertos de aplicación → implementaciones de infraestructura → route handlers que delegan a un controller vía DI container.

## Goals / Non-Goals

**Goals:**
- Endpoints `GET /api/v1/admin/users`, `GET /api/v1/admin/users/:id`, `PATCH /api/v1/admin/users/:id`, `DELETE /api/v1/admin/users/:id`.
- Protección con `requirePermission` (`users:read` o `users:write` según operación).
- Respuestas incluyen el array de roles del usuario (igual que el token JWT).
- No se puede eliminar ni editar el propio usuario autenticado.
- Arquitectura hexagonal idéntica a `rbac`: módulo propio → controller → DI container.

**Non-Goals:**
- UI (ningún componente React en este change).
- Creación de usuarios (eso lo hace `auth/register`).
- Cambio de contraseña (change separado futuro).
- Soft delete o papelera.
- Paginación avanzada con cursores.

## Decisions

### Decisión 1 — Módulo `src/modules/users/` independiente (no extender `auth/`)

El módulo `auth` resuelve identidad y sesión; administración de usuarios es una responsabilidad distinta. Extender `auth` acoplaría dos dominios. Se crea `src/modules/users/` con su propio puerto `AdminUserRepository` y su implementación `PrismaAdminUserRepository`.

**Alternativa descartada**: reutilizar el `UserRepository` de `auth/`. Ese puerto solo tiene `findByEmail`, `findById`, `save` — insuficiente. Añadir `list`/`update`/`delete` a ese puerto violaría ISP y esparciría responsabilidades de admin en el módulo de auth.

### Decisión 2 — Entidad `AdminUser` en el dominio de `users/`

Se define una entidad `AdminUser` con los campos relevantes para administración (`id`, `name`, `email`, `createdAt`, `updatedAt`) más `roles: string[]` calculado al leer. No incluye `passwordHash` — ese campo es privado del dominio `auth`. El mapper en infraestructura transforma el registro Prisma (con `include: { roles: { include: { role: true } } }`) a `AdminUser`.

**Alternativa descartada**: un DTO plano sin entidad de dominio. Rompería la coherencia con el resto del proyecto.

### Decisión 3 — Hard delete en cascada

`DELETE /api/v1/admin/users/:id` elimina el registro de `users`. Las filas en `user_roles` se eliminan por `ON DELETE CASCADE` (ya configurado en la FK de Prisma). No se introduce `deletedAt` (requeriría migración y cambios en todos los queries).

**Riesgo aceptado**: la eliminación es irreversible. El endpoint exige confirmación implícita al no estar expuesto en UI todavía.

### Decisión 4 — Auto-protección sin cambio de specs de auth-middleware

El handler compara `x-user-id` (inyectado por el middleware de autenticación) con el `:id` del parámetro. Si coinciden, devuelve 403 `{"error": "Cannot modify your own account"}`. Esta lógica vive en el use case `DeleteUserUseCase` y `UpdateUserUseCase`, no en el middleware.

### Decisión 5 — Paginación offset con defaults conservadores

`GET /api/v1/admin/users` acepta `?page=1&pageSize=20` (máx 100). Responde con `{ users, total, page, pageSize }`. Suficiente para una lista de administradores; se puede migrar a cursor-based en un change futuro sin romper contratos.

### Decisión 6 — El módulo `users/` no importa de `rbac/`

Para obtener los roles del usuario, `PrismaAdminUserRepository` hace un `prisma.user.findMany({ include: { roles: { include: { role: true } } } })` directamente. No llama a servicios del módulo `rbac`. Esto evita dependencia entre módulos de infraestructura y es más eficiente (una sola query).

## Risks / Trade-offs

- **Hard delete irreversible** → Mitigación: el endpoint solo será accesible desde UI admin (change futuro) donde se añadirá confirmación. La API ya exige `users:write`, que solo tiene el rol `admin`.
- **`users/` duplica algo de lógica de `auth/`** (e.g., query por ID) → Trade-off aceptado; el acoplamiento sería peor. Si en el futuro se quiere un repositorio compartido, se puede mover a `src/shared/`.
- **Sin paginación cursor-based** → Para un sistema agrícola con pocos usuarios, offset es suficiente. Documentado como mejora futura.

## Migration Plan

Este change incluye una migración de base de datos: `20260518000001_add_avatar_url_to_users` añade la columna `avatar_url TEXT` nullable a la tabla `users`.

Deploy:
1. `npm run build` — verifica tipos.
2. `npx prisma migrate deploy` — aplica la migración usando `DIRECT_URL`.
3. Deploy normal (Vercel / Docker). Los nuevos endpoints estarán disponibles automáticamente.

Rollback: revertir el commit y ejecutar una migración manual para eliminar la columna `avatar_url`. El campo es nullable, por lo que puede existir sin romper el comportamiento anterior si el rollback de código se hace primero.

## Open Questions

- ¿Debe `PATCH` poder actualizar el email a uno que ya usa otro usuario? → La spec lo contempla como 409 Conflict; el repositorio verificará unicidad.
- ¿Se expone el `name` como campo opcional o requerido en `PATCH`? → Opcional; se actualiza solo si viene en el body.
