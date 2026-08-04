## 1. Backend — puerto y DTO

- [x] 1.1 Añadir `create(data: { name, email, passwordHash, avatarUrl?, branchId?, roleIds? }): Promise<AdminUser>` al puerto `AdminUserRepository` (`src/modules/users/application/ports/AdminUserRepository.ts`)
- [x] 1.2 Crear `src/modules/users/application/dto/CreateUserRequest.ts` con `{ name, email, password, avatarUrl?, branchId?, roleIds? }`

## 2. Backend — use case

- [x] 2.1 Crear `src/modules/users/application/use-cases/CreateAdminUserUseCase.ts`: recibe `AdminUserRepository`, `PasswordHasher` (puerto de `auth`), y el mismo repo de branches que inyecta `UpdateUserUseCase`
- [x] 2.2 Validar `branchId` (si viene) contra sucursal activa → lanzar `BranchNotFoundForUserError` si no existe
- [x] 2.3 Hashear `password` con `PasswordHasher.hash()` antes de delegar al repo
- [x] 2.4 Delegar a `repo.create()` con el hash y demás campos

## 3. Backend — persistencia

- [x] 3.1 Implementar `create()` en `PrismaAdminUserRepository.ts` usando `prisma.$transaction` (user.create + userRole.createMany si `roleIds` presente)
- [x] 3.2 Capturar `P2002` (email duplicado) → `EmailAlreadyInUseError`, siguiendo el mismo helper `isPrismaUniqueError` ya usado en `update()`
- [x] 3.3 Reutilizar `toAdminUser()` para mapear el resultado de vuelta a `AdminUser`

## 4. Backend — HTTP

- [x] 4.1 Añadir `createUserBodySchema` (Zod) en `UsersController.ts`: `name` min 1, `email`, `password` min 8, `avatarUrl?` url|null, `branchId?` uuid|null, `roleIds?` uuid[]
- [x] 4.2 Añadir método `createUser(req)` en `UsersController`: parsea body, llama al use case, mapea `EmailAlreadyInUseError`→409, `BranchNotFoundForUserError`→400, éxito→201 con `AdminUserDto`
- [x] 4.3 Añadir `POST` en `app/api/v1/admin/users/route.ts` con `requirePermission(req, "users:write")` → `usersController.createUser`

## 5. Backend — DI

- [x] 5.1 Cablear `CreateAdminUserUseCase` en `src/modules/users/infrastructure/di/container.ts` con `BcryptPasswordHasher` (de `src/modules/auth/infrastructure/services/BcryptPasswordHasher.ts`) y el repo de branches existente
- [x] 5.2 Exponer el nuevo use case en `usersController`

## 6. Backend — tests

- [x] 6.1 `tests/unit/modules/users/application/use-cases/CreateAdminUserUseCase.test.ts` con stub inline de `AdminUserRepository`/`PasswordHasher`/branch repo (patrón de `UpdateUserUseCase.test.ts`)
- [x] 6.2 Caso: alta exitosa con campos mínimos (branchId/roleIds ausentes → null/[])
- [x] 6.3 Caso: alta exitosa con branchId y roleIds
- [x] 6.4 Caso: email duplicado → `EmailAlreadyInUseError`
- [x] 6.5 Caso: branchId inexistente → `BranchNotFoundForUserError`
- [x] 6.6 Caso: password corto rechazado por validación Zod del controller (test de integración o del controller si existe suite)

## 7. Frontend — hook de sucursales

- [x] 7.1 Crear `app/_hooks/useBranchesOptions.ts` clonando el patrón de `useHeadquarters.ts`: fetch `GET /api/v1/admin/branches?pageSize=100`, filtrar activas, devolver `{id,name}[]`, caché 60s

## 8. Frontend — tipos y schemas

- [x] 8.1 Añadir `branchId`/`branchName` a `User` en `app/(private)/users/_logic/types/domain.ts`
- [x] 8.2 Añadir `CreateUserBody`, `CreateUserResponse`, y `branchId?` en `UpdateUserBody` en `app/(private)/users/_logic/types/api.ts`
- [x] 8.3 Crear `app/(private)/users/_logic/schemas/createUser.schema.ts` (name/email/password min 8/avatarUrl?/branchId?/roleIds?)
- [x] 8.4 Añadir `branchId?` a `app/(private)/users/_logic/schemas/updateUser.schema.ts`
- [x] 8.5 Añadir clase de error `BranchNotFoundError` en el módulo (junto a `EmailAlreadyInUseError`/`SelfModificationError` existentes)

## 9. Frontend — servicio

- [x] 9.1 Crear `app/(private)/users/_logic/services/createUser.ts`: `POST /api/v1/admin/users`, acepta `fetchImpl?`, mapea 409→`EmailAlreadyInUseError`, 400 branch→`BranchNotFoundError`

## 10. Frontend — modal dual

- [x] 10.1 Añadir prop `mode: "create" | "edit"` a `UserEditModal.tsx`; quitar el guard `if (!user) return null` para `create`
- [x] 10.2 Título dinámico: "Crear usuario" (create) / "Editar Usuario" (edit)
- [x] 10.3 Campo password: sólo visible y requerido en `create`, con validación de longitud mínima inline
- [x] 10.4 Selector de sucursal (poblado por `useBranchesOptions`) visible en ambos modos, con opción "Sin sucursal" → `branchId: null`
- [x] 10.5 Botón "Resetear a Gravatar" sólo visible en `edit`
- [x] 10.6 Footer: "Crear usuario" (create, deshabilitado hasta que name/email/password sean válidos) / "Guardar Cambios" (edit, deshabilitado sin diff)

## 11. Frontend — mutaciones y wiring de página

- [x] 11.1 Añadir `createUser` a `useUserMutations.ts` (invoca el nuevo service, expone estado de loading/error)
- [x] 11.2 Incluir `branchId` en el cálculo del diff del PATCH existente en `useUserMutations.ts`
- [x] 11.3 Añadir botón "Crear usuario" en `UsersToolbar.tsx` gateado por `can("users:write")`
- [x] 11.4 Añadir estado `creating` en `UsersPage.tsx`, abrir modal en `mode="create"`, refrescar tabla (`useUsers().refresh()`) al éxito

## 12. Frontend — tests

- [x] 12.1 Extender `tests/unit/ui/(private)/users/UserEditModal.test.tsx`: modo create renderiza password y selector de sucursal; modo edit renderiza selector de sucursal sin password
- [x] 12.2 Test: validación de password corto en modo create deshabilita submit
- [x] 12.3 Extender `tests/unit/ui/(private)/users/hooks/useUserMutations.test.ts`: `createUser` llama al service correcto; `branchId` se incluye en el diff del PATCH cuando cambia

## 13. Verificación

- [x] 13.1 Correr `npm test` (suites unit backend + UI) — todo verde
- [x] 13.2 Correr `npm run build` — sin errores de tipos
- [x] 13.3 `opsx:verify` contra este change antes de considerarlo listo para archivar
