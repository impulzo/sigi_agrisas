## 1. Dominio — módulo `users/`

- [x] 1.1 Crear `src/modules/users/domain/entities/AdminUser.ts` con campos `id`, `name`, `email`, `roles: string[]`, `createdAt`, `updatedAt`; factory estático `AdminUser.create()`
- [x] 1.2 Crear `src/modules/users/domain/errors/UserNotFoundError.ts`
- [x] 1.3 Crear `src/modules/users/domain/errors/SelfModificationError.ts`

## 2. Puertos de aplicación

- [x] 2.1 Crear `src/modules/users/application/ports/AdminUserRepository.ts` con métodos `findAll({ page, pageSize }): Promise<{ users: AdminUser[]; total: number }>`, `findById(id: string): Promise<AdminUser | null>`, `update(id: string, data: { name?: string; email?: string }): Promise<AdminUser>`, `delete(id: string): Promise<void>`
- [x] 2.2 Crear `src/modules/users/application/dto/ListUsersRequest.ts` con `page: number`, `pageSize: number`
- [x] 2.3 Crear `src/modules/users/application/dto/ListUsersResponse.ts` con `users: AdminUser[]`, `total: number`, `page: number`, `pageSize: number`
- [x] 2.4 Crear `src/modules/users/application/dto/UpdateUserRequest.ts` con `id: string`, `requesterId: string`, `name?: string`, `email?: string`

## 3. Casos de uso

- [x] 3.1 Crear `src/modules/users/application/use-cases/ListUsersUseCase.ts` — llama `repo.findAll()`; valida `pageSize <= 100`
- [x] 3.2 Crear `src/modules/users/application/use-cases/GetUserUseCase.ts` — llama `repo.findById()`; lanza `UserNotFoundError` si null
- [x] 3.3 Crear `src/modules/users/application/use-cases/UpdateUserUseCase.ts` — valida que `requesterId !== id`; verifica que al menos `name` o `email` está presente; delega a `repo.update()`; propaga `UserNotFoundError` y `EmailAlreadyInUseError`
- [x] 3.4 Crear `src/modules/users/application/use-cases/DeleteUserUseCase.ts` — valida que `requesterId !== id`; llama `repo.delete()`; propaga `UserNotFoundError`
- [x] 3.5 Crear `src/modules/users/domain/errors/EmailAlreadyInUseError.ts` (si no puede reutilizarse el de `auth/`)

## 4. Infraestructura — repositorio Prisma

- [x] 4.1 Crear `src/modules/users/infrastructure/repositories/PrismaAdminUserRepository.ts` que implementa `AdminUserRepository`:
  - `findAll`: `prisma.user.findMany({ skip, take, include: { roles: { include: { role: true } } }, orderBy: { createdAt: 'desc' } })` + `prisma.user.count()`
  - `findById`: `prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } })`
  - `update`: `prisma.user.update({ where: { id }, data: { name?, email? } })` — Prisma lanza `P2002` en email duplicado → convierte a `EmailAlreadyInUseError`
  - `delete`: `prisma.user.delete({ where: { id } })` — Prisma lanza `P2025` si no existe → convierte a `UserNotFoundError`
- [x] 4.2 Crear mapper `toAdminUser(prismaUser): AdminUser` dentro de `PrismaAdminUserRepository`

## 5. Controlador HTTP

- [x] 5.1 Crear `src/modules/users/infrastructure/http/UsersController.ts` con métodos:
  - `listUsers(req: NextRequest): Promise<NextResponse>` — parsea `page`/`pageSize` con Zod, llama `listUsersUseCase`
  - `getUser(req: NextRequest, id: string): Promise<NextResponse>` — valida UUID con Zod, llama `getUserUseCase`; 404 si `UserNotFoundError`
  - `updateUser(req: NextRequest, id: string): Promise<NextResponse>` — valida body con Zod; 403 si `SelfModificationError`; 404 si `UserNotFoundError`; 409 si `EmailAlreadyInUseError`
  - `deleteUser(req: NextRequest, id: string): Promise<NextResponse>` — valida UUID; 403 si `SelfModificationError`; 404 si `UserNotFoundError`; devuelve 204
- [x] 5.2 Crear schemas Zod en `UsersController.ts` o archivo hermano: `listUsersQuerySchema`, `updateUserBodySchema`, `uuidParamSchema`

## 6. DI Container

- [x] 6.1 Crear `src/modules/users/infrastructure/di/container.ts` que instancia `PrismaAdminUserRepository`, los cuatro use cases y `UsersController`, y los exporta como `usersController`

## 7. Route Handlers

- [x] 7.1 Crear `app/api/v1/admin/users/route.ts`:
  - `GET` → `requirePermission(req, "users:read")` → `usersController.listUsers(req)`
- [x] 7.2 Crear `app/api/v1/admin/users/[id]/route.ts`:
  - `GET` → `requirePermission(req, "users:read")` → `usersController.getUser(req, params.id)`
  - `PATCH` → `requirePermission(req, "users:write")` → `usersController.updateUser(req, params.id)`
  - `DELETE` → `requirePermission(req, "users:write")` → `usersController.deleteUser(req, params.id)`

## 8. Tests unitarios — casos de uso

- [x] 8.1 `tests/unit/modules/users/application/use-cases/ListUsersUseCase.test.ts` — prueba paginación, max pageSize
- [x] 8.2 `tests/unit/modules/users/application/use-cases/GetUserUseCase.test.ts` — found, not found
- [x] 8.3 `tests/unit/modules/users/application/use-cases/UpdateUserUseCase.test.ts` — éxito, SelfModificationError, UserNotFoundError, EmailAlreadyInUseError, empty body
- [x] 8.4 `tests/unit/modules/users/application/use-cases/DeleteUserUseCase.test.ts` — éxito, SelfModificationError, UserNotFoundError

## 9. Tests de integración

- [x] 9.1 `tests/integration/modules/users/admin-users-crud.test.ts` — crea usuario de prueba, llama a los use cases contra BD real, verifica resultados, limpia al final

## 10. Verificación final (CRUD base)

- [x] 10.1 Ejecutar `npm run build` y verificar 0 errores de TypeScript
- [x] 10.2 Ejecutar `npm test` y verificar que todos los tests pasan (nuevos + suite existente)
- [x] 10.3 Probar manualmente con `curl` o cliente HTTP: login como admin, listar usuarios, actualizar, eliminar
- [x] 10.4 Documentar los nuevos endpoints en `CLAUDE.md`

## 11. Campo avatarUrl — migración y dominio

- [x] 11.1 Añadir `avatarUrl String? @map("avatar_url")` al modelo `User` en `prisma/schema.prisma`
- [x] 11.2 Ejecutar `npx prisma migrate dev --name add_avatar_url_to_users` para generar y aplicar la migración
- [x] 11.3 Añadir `avatarUrl?: string` a `AdminUserProps` y a los campos de `AdminUser`
- [x] 11.4 Crear función `resolveAvatarUrl(email: string, stored: string | null): string` en `src/modules/users/domain/utils/avatarUrl.ts` que devuelve la URL de Gravatar cuando `stored` es `null`: `https://www.gravatar.com/avatar/<md5(email.toLowerCase().trim())>?d=mp&s=200`

## 12. Campo avatarUrl — repositorio e infraestructura

- [x] 12.1 Actualizar `toAdminUser` en `PrismaAdminUserRepository` para llamar `resolveAvatarUrl(u.email, u.avatarUrl)` al construir la entidad
- [x] 12.2 Añadir `avatarUrl?: string | null` al tipo `data` del método `update` en el puerto `AdminUserRepository`
- [x] 12.3 Actualizar `PrismaAdminUserRepository.update` para incluir `avatarUrl` en el `data` de Prisma (pasar `null` explícitamente cuando se quiere resetear)

## 13. Campo avatarUrl — controlador HTTP

- [x] 13.1 Actualizar `UpdateUserRequest` DTO para incluir `avatarUrl?: string | null`
- [x] 13.2 Actualizar `UpdateUserUseCase` para propagar `avatarUrl` al repositorio; actualizar la validación del body vacío para incluir `avatarUrl` como campo válido
- [x] 13.3 Actualizar `updateUserBodySchema` en `UsersController` para aceptar `avatarUrl: z.string().url().nullable().optional()`; actualizar el mensaje del body vacío a `"At least one field (name, email, avatarUrl) must be provided"`

## 14. Tests — avatarUrl

- [x] 14.1 Añadir casos a `UpdateUserUseCase.test.ts`: actualizar `avatarUrl` a URL válida, resetear a null
- [x] 14.2 Añadir caso a `tests/unit/modules/users/domain/utils/avatarUrl.test.ts`: devuelve Gravatar cuando stored es null, devuelve el valor almacenado cuando no es null
- [x] 14.3 Añadir caso al test de integración: verificar que `avatarUrl` aparece en la respuesta (no null), verificar que PATCH con `avatarUrl` URL actualiza correctamente, verificar que PATCH con `avatarUrl: null` devuelve URL de Gravatar

## 15. Verificación final — avatarUrl

- [x] 15.1 Ejecutar `npm run build` — 0 errores de TypeScript
- [x] 15.2 Ejecutar `npm test` — todos los tests pasan
- [x] 15.3 Verificar manualmente con `curl`: GET devuelve `avatarUrl` con Gravatar por defecto, PATCH actualiza campo, PATCH con null resetea a Gravatar
- [x] 15.4 Actualizar `CLAUDE.md` con el nuevo campo en el `AdminUserDto`
