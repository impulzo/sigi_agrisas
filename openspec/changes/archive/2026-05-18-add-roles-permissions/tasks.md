## 1. Prisma schema y migración

- [x] 1.1 Extender `prisma/schema.prisma` con los modelos `Role`, `Permission`, `RolePermission`, `UserRole` y la relación inversa `User.roles UserRole[]` (ver D2)
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add_rbac_tables` y revisar el SQL generado en `prisma/migrations/<timestamp>_add_rbac_tables/migration.sql`
- [x] 1.3 Verificar que el SQL incluye: 4 tablas, índices (`roles_name_idx`, `permissions_key_idx`, `role_permissions_permission_idx`, `user_roles_role_idx`), FKs con `ON DELETE CASCADE` y PKs compuestas en las tablas pivote
- [x] 1.4 Crear `prisma/seed.ts` que hace `upsert` idempotente de los roles `admin`, `operator`, `viewer` y los permisos base `users:read`, `users:write`, `roles:read`, `roles:write`; conectar via `prisma.$transaction` y mapear según la tabla del seed en D2
- [x] 1.5 Añadir script `"seed": "tsx prisma/seed.ts"` y entrada `"prisma": { "seed": "tsx prisma/seed.ts" }` en `package.json` (instalar `tsx` como devDependency)
- [x] 1.6 Ejecutar `npm run seed` en local y verificar en `prisma studio` que las filas existen
- [x] 1.7 Añadir `RBAC_DEFAULT_ROLE=viewer` a `.env.local` y `.env.example`
- [x] 1.8 Ejecutar `npx prisma generate` para regenerar los tipos de Prisma Client

## 2. Estructura del módulo `rbac` (esqueleto)

- [x] 2.1 Crear directorios bajo `src/modules/rbac/`:
  - `domain/entities/`, `domain/value-objects/`, `domain/errors/`
  - `application/ports/`, `application/use-cases/`, `application/dto/`, `application/mappers/`
  - `infrastructure/repositories/`, `infrastructure/services/`, `infrastructure/http/`, `infrastructure/di/`
- [x] 2.2 Verificar que ningún archivo bajo `src/modules/rbac/domain/` o `src/modules/rbac/application/` importa de `infrastructure/`, `next/server` ni `@prisma/client`

## 3. Dominio RBAC

- [x] 3.1 Implementar value object `RoleName` en `domain/value-objects/RoleName.ts` con validación regex `^[a-z][a-z0-9_]{1,31}$` (32 chars max)
- [x] 3.2 Implementar value object `PermissionKey` en `domain/value-objects/PermissionKey.ts` con validación formato `resource:action` (`^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$`)
- [x] 3.3 Implementar entidad `Role` en `domain/entities/Role.ts` (id, name, description?, createdAt, updatedAt) extendiendo `shared/domain/Entity`
- [x] 3.4 Implementar entidad `Permission` en `domain/entities/Permission.ts` (id, key, description?, createdAt, updatedAt)
- [x] 3.5 Crear errores tipados en `domain/errors/`:
  - `RoleNotFoundError.ts`
  - `PermissionNotFoundError.ts`
  - `RoleAlreadyAssignedError.ts`
  - `PermissionAlreadyGrantedError.ts`
  - `InvalidPermissionKeyError.ts`
  - `InvalidRoleNameError.ts`

## 4. Puertos (Application Layer)

- [x] 4.1 Definir `application/ports/RoleRepository.ts` con `findById`, `findByName`, `list`, `save`
- [x] 4.2 Definir `application/ports/PermissionRepository.ts` con `findById`, `findByKey`, `list`, `save`
- [x] 4.3 Definir `application/ports/UserRoleRepository.ts` con `assign(userId, roleId)`, `revoke(userId, roleId)`, `listByUser(userId): Promise<Role[]>`, `listUsersOfRole(roleId): Promise<string[]>`
- [x] 4.4 Definir `application/ports/RolePermissionRepository.ts` con `grant(roleId, permissionId)`, `revoke(roleId, permissionId)`, `listByRole(roleId): Promise<Permission[]>`
- [x] 4.5 Definir `application/ports/AuthorizationService.ts` con `userCan(userId, key): Promise<boolean>`, `listUserPermissions(userId): Promise<string[]>`, `invalidate(userId)`, `invalidateByRole(roleId)`
- [x] 4.6 Definir `application/ports/RoleAssigner.ts` con `assignDefaultRole(userId): Promise<void>` (consumido por `auth.RegisterUseCase`)
- [x] 4.7 Definir DTOs en `application/dto/`: `AssignRoleRequest.ts`, `GrantPermissionRequest.ts`, `PermissionListResponse.ts`
- [x] 4.8 Definir mappers `application/mappers/RoleMapper.ts` y `application/mappers/PermissionMapper.ts` para conversión Prisma model ↔ entidad de dominio

## 5. Use Cases (Application Layer)

- [x] 5.1 Implementar `AssignRoleToUserUseCase` (verifica rol existe, llama a `userRoleRepo.assign`, invalida cache, lanza `RoleAlreadyAssignedError` si ya asignado)
- [x] 5.2 Implementar `RevokeRoleFromUserUseCase` (verifica rol existe, llama a `userRoleRepo.revoke`, invalida cache; idempotente: no falla si no estaba asignado)
- [x] 5.3 Implementar `GrantPermissionToRoleUseCase` (verifica rol y permiso existen, llama a `rolePermissionRepo.grant`, invalida cache de todos los usuarios con ese rol)
- [x] 5.4 Implementar `RevokePermissionFromRoleUseCase` (idem inverso)
- [x] 5.5 Implementar `ListUserPermissionsUseCase` (delega a `authorizationService.listUserPermissions`)
- [x] 5.6 Implementar `ListRolesUseCase` (delega a `roleRepo.list`)
- [x] 5.7 Implementar `ListPermissionsUseCase` (delega a `permissionRepo.list`)
- [x] 5.8 Implementar `CheckUserPermissionUseCase` (delega a `authorizationService.userCan`)

## 6. Infraestructura — adaptadores Prisma

- [x] 6.1 Implementar `RolePrismaRepository` en `infrastructure/repositories/` (usa `prisma.role`, mapea con `RoleMapper`)
- [x] 6.2 Implementar `PermissionPrismaRepository` en `infrastructure/repositories/`
- [x] 6.3 Implementar `UserRolePrismaRepository` en `infrastructure/repositories/`; captura `P2002` en `assign` y lanza `RoleAlreadyAssignedError`; usa `prisma.userRole.findMany({ include: { role: true } })` para `listByUser`
- [x] 6.4 Implementar `RolePermissionPrismaRepository`; captura `P2002` en `grant` y lanza `PermissionAlreadyGrantedError`
- [x] 6.5 Implementar `PrismaAuthorizationService` en `infrastructure/services/` con:
  - Cache `Map<userId, { permissions: Set<string>; expiresAt: number }>` con TTL 60s
  - `fetchUserPermissions(userId)` que ejecuta una sola SQL: `SELECT DISTINCT p.key FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = $1`
  - `invalidate(userId)` borra entrada
  - `invalidateByRole(roleId)` busca usuarios con ese rol y borra cada entrada
- [x] 6.6 Implementar `PrismaRoleAssigner` en `infrastructure/services/` (lee `RBAC_DEFAULT_ROLE`, busca rol, hace `upsert` en `user_roles`; fail-fast si el rol no existe)
- [x] 6.7 Crear `infrastructure/di/container.ts` que instancia repositories, services, use cases y los expone como `rbacContainer.{authorizationService, roleAssigner, rbacController, ...}`

## 7. Controller HTTP y guard

- [x] 7.1 Implementar `RbacController` en `infrastructure/http/RbacController.ts` con métodos:
  - `listRoles(req)`
  - `listRolePermissions(req, roleId)`
  - `grantPermissionToRole(req, roleId)` (body Zod `{ permissionKey: string }`)
  - `revokePermissionFromRole(req, roleId, permId)`
  - `listPermissions(req)`
  - `assignRoleToUser(req, userId)` (body Zod `{ roleName: string }`)
  - `revokeRoleFromUser(req, userId, roleId)`
  - `listUserPermissions(req, userId)`
- [x] 7.2 Implementar guard `infrastructure/http/requirePermission.ts`:
  - Firma: `requirePermission(req: NextRequest, key: string, authzService?: AuthorizationService): Promise<NextResponse | null>`
  - Lee `x-user-id` del header; si falta → 401
  - Llama `authzService.userCan(userId, key)`; si false → 403 con `{ error: "Forbidden", required: key }`
  - Si true → devuelve `null`
- [x] 7.3 Errores tipados en respuesta: 404 para `RoleNotFoundError`/`PermissionNotFoundError`, 409 para `RoleAlreadyAssignedError`/`PermissionAlreadyGrantedError`, 400 para validación Zod

## 8. Route handlers `/api/v1/admin/**`

- [x] 8.1 Crear `app/api/v1/admin/roles/route.ts` con `GET` → `rbacController.listRoles` protegido por `requirePermission("roles:read")`
- [x] 8.2 Crear `app/api/v1/admin/roles/[id]/permissions/route.ts` con `GET` (`roles:read`) y `POST` (`roles:write`)
- [x] 8.3 Crear `app/api/v1/admin/roles/[id]/permissions/[permId]/route.ts` con `DELETE` (`roles:write`)
- [x] 8.4 Crear `app/api/v1/admin/permissions/route.ts` con `GET` (`roles:read`)
- [x] 8.5 Crear `app/api/v1/admin/users/[id]/roles/route.ts` con `POST` (`users:write`)
- [x] 8.6 Crear `app/api/v1/admin/users/[id]/roles/[roleId]/route.ts` con `DELETE` (`users:write`)
- [x] 8.7 Crear `app/api/v1/admin/users/[id]/permissions/route.ts` con `GET` (`users:read`)

## 9. Integración con `auth`

- [x] 9.1 Añadir campo opcional `roles?: string[]` a `TokenPayload` en `src/modules/auth/application/ports/TokenService.ts`
- [x] 9.2 Actualizar `JwtTokenService.generateAccessToken` para firmar el claim `roles`; `verifyAccessToken` para devolver `roles: payload.roles ?? []`
- [x] 9.3 Actualizar `RegisterUseCase`:
  - Aceptar nuevo puerto `RoleAssigner` por constructor
  - Tras `userRepo.save(user)`: `await roleAssigner.assignDefaultRole(user.id)`
  - Tras asignar: cargar roles del usuario (`authorizationService.listUserRoles(userId)` o nuevo puerto si necesario) y emitir tokens con `roles` poblado
- [x] 9.4 Actualizar `LoginUseCase` para cargar roles antes de emitir tokens (inyectar puerto `UserRoleReader` que devuelve `string[]` de nombres de roles)
- [x] 9.5 Actualizar `RefreshTokenUseCase` para re-cargar roles al refrescar (esto cierra la ventana de staleness de UI cuando el access token rota)
- [x] 9.6 Actualizar `AuthResponse` DTO: añadir `user.roles: string[]`
- [x] 9.7 Actualizar `auth/infrastructure/di/container.ts` para inyectar `rbacContainer.roleAssigner` y `rbacContainer.userRoleReader` en los use cases de auth
- [x] 9.8 Actualizar `AuthMiddlewareAdapter.ts`:
  - Tras `jwtVerify` en rama `/api/**`: propagar `x-user-roles` con `(payload.roles ?? []).join(",")`
  - Idem rama de página privada (verificación de refresh token)

## 10. Schemas Zod en Controller

- [x] 10.1 Definir `assignRoleSchema = z.object({ roleName: z.string().regex(/^[a-z][a-z0-9_]{1,31}$/) })`
- [x] 10.2 Definir `grantPermissionSchema = z.object({ permissionKey: z.string().regex(/^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$/) })`
- [x] 10.3 Aplicar `.safeParse` en cada handler de `RbacController`; en error devolver 400 con `parsed.error.flatten().fieldErrors`

## 11. Tests unitarios — Dominio

- [x] 11.1 `tests/unit/modules/rbac/domain/value-objects/RoleName.test.ts` (válido, mayúsculas rechazadas, vacío rechazado, >32 chars rechazado)
- [x] 11.2 `tests/unit/modules/rbac/domain/value-objects/PermissionKey.test.ts` (válido `users:read`, sin `:` rechazado, doble `:` rechazado)
- [x] 11.3 `tests/unit/modules/rbac/domain/entities/Role.test.ts` (creación, igualdad por id)
- [x] 11.4 `tests/unit/modules/rbac/domain/entities/Permission.test.ts`

## 12. Tests unitarios — Use Cases (con repos in-memory)

- [x] 12.1 Implementar `InMemoryRoleRepository`, `InMemoryPermissionRepository`, `InMemoryUserRoleRepository`, `InMemoryRolePermissionRepository` en `tests/unit/modules/rbac/_fixtures/` (no en `src/`)
- [x] 12.2 Implementar `InMemoryAuthorizationService` (computa permisos desde los repos in-memory, sin cache)
- [x] 12.3 `AssignRoleToUserUseCase.test.ts`: asignación exitosa, rol inexistente, duplicado lanza `RoleAlreadyAssignedError`
- [x] 12.4 `RevokeRoleFromUserUseCase.test.ts`: revocación exitosa, idempotencia, rol inexistente
- [x] 12.5 `GrantPermissionToRoleUseCase.test.ts`: grant exitoso, rol inexistente, permiso inexistente, duplicado
- [x] 12.6 `RevokePermissionFromRoleUseCase.test.ts`
- [x] 12.7 `CheckUserPermissionUseCase.test.ts`: usuario con rol, usuario sin rol, permiso inexistente
- [x] 12.8 `ListUserPermissionsUseCase.test.ts`: usuario con múltiples roles, deduplicación de permisos compartidos

## 13. Tests unitarios — Servicios

- [x] 13.1 `tests/unit/modules/rbac/infrastructure/PrismaAuthorizationService.cache.test.ts`: dos llamadas consecutivas con cache hit, expiración tras TTL, invalidación manual borra entrada
- [x] 13.2 `tests/unit/modules/rbac/infrastructure/requirePermission.test.ts`: header `x-user-id` ausente → 401, `userCan` false → 403, `userCan` true → null
- [x] 13.3 `tests/unit/modules/auth/application/use-cases/RegisterUseCase.test.ts`: ajustar para mockear `RoleAssigner` y verificar que se llama tras `userRepo.save`
- [x] 13.4 `tests/unit/modules/auth/infrastructure/services/JwtTokenService.test.ts`: ajustar para verificar el claim `roles`

## 14. Tests de integración

- [x] 14.1 `tests/integration/modules/rbac/rbac-flow.test.ts`: flujo completo `seed → register user → assign role → request con permiso → 200; revoke role → request misma → 403`
- [x] 14.2 `tests/integration/modules/rbac/cache-invalidation.test.ts`: tras `GrantPermissionToRole`, verifica que `userCan` devuelve `true` sin esperar 60s
- [x] 14.3 `tests/integration/modules/auth/register-with-default-role.test.ts`: tras registrarse, `GET /api/v1/admin/users/:id/permissions` (con token de admin) lista los permisos del rol `viewer`

## 15. Validación final

- [x] 15.1 Ejecutar `npx prisma migrate deploy` en CI/CD contra Supabase y confirmar que las 4 tablas existen
- [x] 15.2 Ejecutar `npm run seed` en el entorno (idempotente) y verificar las filas en Supabase
- [x] 15.3 Ejecutar `npm run build` y verificar que no hay errores de TypeScript
- [x] 15.4 Ejecutar `npm test` y verificar que TODOS los tests pasan (incluyendo los ajustes de `auth`)
- [x] 15.5 Probar manualmente con `curl`:
  - Registrar usuario nuevo → `accessToken` decodificado contiene `roles: ["viewer"]`
  - `GET /api/v1/admin/roles` con ese token → 403 (viewer no tiene `roles:read`)
  - Asignar rol `admin` al usuario (a mano en Supabase o con un seed de admin temporal)
  - `POST /api/v1/auth/refresh` → nuevo access token con `roles: ["viewer", "admin"]`
  - `GET /api/v1/admin/roles` con el nuevo token → 200 con la lista de roles
- [x] 15.6 Verificar que `npm test:watch` no reporta tests obsoletos en `auth/`
- [x] 15.7 Documentar en `CLAUDE.md` la nueva sección "Autorización (RBAC)" con: tablas, formato de `PermissionKey`, ubicación del guard, variable `RBAC_DEFAULT_ROLE`
