## Why

El panel autentica usuarios con JWT custom, pero hoy **cualquier usuario autenticado tiene acceso a cualquier endpoint protegido**. No existe una capa de autorización que distinga entre operadores, administradores, agrónomos u otros perfiles del negocio agrícola. A medida que el panel crezca (CRUD de fincas, lotes, ciclos, dispositivos), necesitamos un mecanismo escalable para decidir *qué* puede hacer *quién*.

Se introduce un módulo **RBAC (Role-Based Access Control)** con modelo `users → roles → permissions` que reutiliza la arquitectura hexagonal del módulo `auth`. Las decisiones de autorización quedan en el dominio (puertos + use cases), Postgres almacena las relaciones, y la verificación se aplica en dos puntos: el middleware Next.js (para gating grueso por ruta) y guards explícitos en los route handlers (para chequeos finos `requirePermission(...)`).

## What Changes

- Nuevo módulo `src/modules/rbac/` con capas `domain/`, `application/`, `infrastructure/` siguiendo el patrón hexagonal de `auth`.
- Entidades de dominio `Role` y `Permission` + value objects `RoleName` y `PermissionKey` (formato `resource:action`, p.ej. `users:read`).
- Puertos `RoleRepository`, `PermissionRepository` y `AuthorizationService` (decisión `userCan(userId, permissionKey)`).
- Use cases de gestión: `AssignRoleToUser`, `RevokeRoleFromUser`, `GrantPermissionToRole`, `RevokePermissionFromRole`, `ListUserPermissions`.
- Use case de decisión: `CheckUserPermission` (cacheable).
- Adaptadores Prisma: `RolePrismaRepository`, `PermissionPrismaRepository` y vista materializada en memoria para el lookup `userId → Set<permissionKey>` con TTL corto.
- Cuatro tablas nuevas en Postgres: `roles`, `permissions`, `role_permissions`, `user_roles` (índices y FKs con `ON DELETE CASCADE`).
- Seed de roles base (`admin`, `operator`, `viewer`) y permisos base (`users:read`, `users:write`, `roles:read`, `roles:write`).
- El JWT access token incluye un nuevo claim `roles: string[]` (nombres de roles, no permisos) para gating UI sin round-trip.
- Los permisos finos NO viajan en el JWT — se consultan vía `AuthorizationService` desde el route handler/server action, con caché en memoria (`userId → permisos`, TTL 60s).
- Guard reutilizable `requirePermission(req, "users:write")` en `src/modules/rbac/infrastructure/http/` que devuelve 403 si falla.
- El middleware Next.js sigue siendo *coarse-grained* (autenticación, no autorización); el gating fino vive en los handlers.
- `RegisterUseCase` asigna automáticamente el rol `viewer` al usuario recién creado.
- Endpoints administrativos versionados: `POST /api/v1/admin/users/:id/roles`, `DELETE /api/v1/admin/users/:id/roles/:roleId`, `POST /api/v1/admin/roles/:id/permissions`, `GET /api/v1/admin/roles`, `GET /api/v1/admin/permissions` — todos protegidos por `requirePermission("roles:write")` o equivalente.
- Migración Prisma: `add_rbac_tables` que crea las 4 tablas y aplica el seed inicial vía `prisma/seed.ts`.
- Suite de tests unitarios (dominio, use cases) e integración (flujo asignar rol → autorizar request).

## Capabilities

### New Capabilities

- `rbac`: Modelo de roles y permisos, asignación a usuarios, decisión de autorización (`userCan`), API de administración y guards de route handlers.

### Modified Capabilities

- `database-persistence`: Nuevas tablas `roles`, `permissions`, `role_permissions`, `user_roles` con sus FKs e índices; migración `add_rbac_tables` y seed inicial.
- `token-management`: El access token añade el claim `roles: string[]`; la firma y TTL no cambian.
- `auth-middleware`: Propaga `x-user-roles` como header además de `x-user-id` y `x-user-email`. No bloquea por permiso (eso es trabajo de los guards).
- `user-auth`: El registro asigna el rol `viewer` por defecto y la respuesta de login/register incluye `user.roles: string[]`.

## Impact

- **Backend nuevo**: `src/modules/rbac/**` completo (domain + application + infrastructure + di), `src/modules/rbac/infrastructure/http/requirePermission.ts` como guard compartido.
- **Backend modificado**:
  - `src/modules/auth/application/use-cases/RegisterUseCase.ts` (asigna rol por defecto vía nuevo puerto `RoleAssigner`).
  - `src/modules/auth/application/ports/TokenService.ts` (`TokenPayload` gana campo opcional `roles`).
  - `src/modules/auth/infrastructure/services/JwtTokenService.ts` (firma y verifica el claim `roles`).
  - `src/modules/auth/application/use-cases/LoginUseCase.ts` y `RefreshTokenUseCase.ts` (cargan roles del usuario al emitir tokens).
  - `src/modules/auth/infrastructure/di/container.ts` (instancia `RbacContainer` y lo inyecta donde corresponda).
  - `middleware.ts` y `AuthMiddlewareAdapter.ts` (propaga `x-user-roles`).
- **Base de datos**: 4 tablas nuevas + seed; sin cambios destructivos sobre `users`. Migración aplicada con `prisma migrate deploy` en Supabase `agrisas`.
- **API expuesta**: 5 endpoints administrativos nuevos bajo `/api/v1/admin/**`, todos protegidos por permiso `roles:write` o `users:write`.
- **Tests**: nuevos suites en `tests/unit/modules/rbac/**` y `tests/integration/modules/rbac/**`; ajustes a `RegisterUseCase.test.ts` y `JwtTokenService.test.ts` por el claim `roles`.
- **Dependencias nuevas**: ninguna — todo se hace con las ya instaladas (`@prisma/client`, `jsonwebtoken`, `jose`, `zod`).
- **Breaking changes**: el payload del access token gana `roles: string[]`. Tokens antiguos siguen siendo válidos (claim opcional), pero clientes que dependan de la forma exacta del payload deberán actualizar tipos.
- **No incluido en este change**: UI de administración de roles/permisos (se aborda en un change posterior `add-rbac-ui`), ABAC/atributos dinámicos, RLS de Supabase (descartado — la auth no usa Supabase Auth).
