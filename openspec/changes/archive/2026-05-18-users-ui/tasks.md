## 1. Tipos y servicios `_logic`

- [x] 1.1 Crear `app/(private)/users/_logic/types/api.ts` con `UserDto`, `ListUsersResponse`, `UpdateUserBody`, `UpdateUserResponse`, `AssignRoleBody`
- [x] 1.2 Crear `app/(private)/users/_logic/types/domain.ts` con `User` (mismas claves que `UserDto` pero `createdAt: Date`, `updatedAt: Date`)
- [x] 1.3 Crear errores tipados del feature en `app/(private)/users/_logic/errors.ts`: `UserNotFoundError`, `EmailAlreadyInUseError`, `SelfModificationError` (con `action: "modify"|"delete"`); reutilizar `ForbiddenError`, `NetworkError` de `app/_lib/authFetch.ts`
- [x] 1.4 Crear `app/(private)/users/_logic/services/listUsers.ts` que llama `GET /api/v1/admin/users?page&pageSize`, parsea fechas y devuelve `{ users: User[], total, page, pageSize }`; acepta `fetchImpl` inyectado
- [x] 1.5 Crear `app/(private)/users/_logic/services/updateUser.ts` que llama `PATCH /api/v1/admin/users/:id`; mapea 404→`UserNotFoundError`, 409→`EmailAlreadyInUseError`, 403 con `"own account"`→`SelfModificationError("modify")`
- [x] 1.6 Crear `app/(private)/users/_logic/services/deleteUser.ts` que llama `DELETE /api/v1/admin/users/:id`; mapea 404→`UserNotFoundError`, 403 con `"own account"`→`SelfModificationError("delete")`; devuelve `void` para 204
- [x] 1.7 Crear `app/(private)/users/_logic/services/assignRoleToUser.ts` que llama `POST /api/v1/admin/users/:id/roles` con `{ roleName }`
- [x] 1.8 Crear `app/(private)/users/_logic/services/revokeRoleFromUser.ts` que llama `DELETE /api/v1/admin/users/:id/roles/:roleId`
- [x] 1.9 Crear schema Zod `app/(private)/users/_logic/schemas/updateUser.schema.ts` con `name: z.string().min(1).optional()`, `email: z.string().email().optional()`, `avatarUrl: z.union([z.string().url(), z.literal("")]).optional()`

## 2. Hooks de feature

- [x] 2.1 Crear `app/(private)/users/_logic/hooks/useUsers.ts` que recibe `{ page, pageSize }`, devuelve `{ users, total, isLoading, error, refresh }`; cancela al desmontar
- [x] 2.2 Crear `app/(private)/users/_logic/hooks/useRolesCatalog.ts` que reutiliza `listRoles` (existente en roles/_logic) o lo replica; devuelve `{ roles, isLoading, error }`
- [x] 2.3 Crear `app/(private)/users/_logic/hooks/useUserMutations.ts` que expone `saveUserDiff(userId, original, edited)` y `removeUser(userId)`, encapsulando la lógica de diff PATCH + asignar/revocar roles en paralelo

## 3. Átomos y moléculas reutilizables

- [x] 3.1 Crear átomo `app/_components/atoms/Avatar/Avatar.tsx` con `{ src: string; alt?: string; size?: "sm"|"md"|"lg" }`; fallback a icono `person` si `onError` del `<img>` se dispara
- [x] 3.2 Verificar que `Badge`, `Skeleton`, `EmptyState`, `ConfirmDialog`, `Icon` existen y son consumibles (sin cambios esperados; documentar si requieren extensión)

## 4. Blocks de la pantalla

- [x] 4.1 Crear `app/(private)/users/_blocks/UsersPage.tsx` (orquestador): gestiona `page`, `pageSize`, filtros, modal abierto, confirmación abierta; usa `useCurrentUser` para gating
- [x] 4.2 Crear `app/(private)/users/_blocks/UsersToolbar.tsx` con input de búsqueda y chips de filtro por rol
- [x] 4.3 Crear `app/(private)/users/_blocks/UsersTable.tsx` que renderiza las filas, columnas y acciones; props presentational (recibe `users`, `currentUserId`, `canWrite`, `onEdit`, `onDelete`)
- [x] 4.4 Crear `app/(private)/users/_blocks/UsersPagination.tsx` con "Anterior/Siguiente", indicador "X-Y de N" y selector de pageSize
- [x] 4.5 Crear `app/(private)/users/_blocks/UserEditModal.tsx` con formulario controlado (name, email, avatarUrl + botón "Resetear a Gravatar") y checkboxes de roles; valida con Zod, deshabilita "Guardar" sin cambios o con error
- [x] 4.6 Crear `app/(private)/users/_blocks/UsersEmpty.tsx` (estado vacío) y `UsersError.tsx` (estado de error con retry)

## 5. Route handlers de Next

- [x] 5.1 Crear `app/(private)/users/layout.tsx` (extiende el shell privado igual que `roles/layout.tsx`)
- [x] 5.2 Crear `app/(private)/users/page.tsx` que lee `cookies().get("refreshToken")`, redirige a `/auth/login` si falta, y renderiza `<UsersPage />`

## 6. NavigationRail

- [x] 6.1 Editar `app/_components/organisms/NavigationRail/items.ts` para insertar `{ key: "users", href: "/users", icon: "group", label: "Usuarios", requires: "users:read" }` entre `billing` y `roles`
- [x] 6.2 Verificar que el icono `group` está en `app/_components/atoms/Icon/icons.ts`; agregarlo si falta

## 7. Tests unitarios — servicios y hooks

- [x] 7.1 `tests/unit/ui/(private)/users/services/listUsers.test.ts` — éxito, 401/403/network error mapeados; conversión de `createdAt` a `Date`
- [x] 7.2 `tests/unit/ui/(private)/users/services/updateUser.test.ts` — éxito, 404→UserNotFoundError, 409→EmailAlreadyInUseError, 403→SelfModificationError
- [x] 7.3 `tests/unit/ui/(private)/users/services/deleteUser.test.ts` — 204→void, 404, 403 mapeos
- [x] 7.4 `tests/unit/ui/(private)/users/services/assignRoleToUser.test.ts` y `revokeRoleFromUser.test.ts` — flujo básico y mapeo de errores
- [x] 7.5 `tests/unit/ui/(private)/users/hooks/useUsers.test.ts` — carga inicial, cambio de página, refresh, cancelación al desmontar
- [x] 7.6 `tests/unit/ui/(private)/users/hooks/useUserMutations.test.ts` — diff PATCH-only, diff roles-only, diff combinado, error en uno revierte el modal en el caller

## 8. Tests unitarios — blocks

- [x] 8.1 `tests/unit/ui/(private)/users/UsersPage.test.tsx` — render con `can("users:read")` true/false/loading; integración alta con mocks de hooks
- [x] 8.2 `tests/unit/ui/(private)/users/UsersTable.test.tsx` — render de filas, auto-protección en la fila propia (botones disabled + tooltips), oculta acciones si no hay `users:write`
- [x] 8.3 `tests/unit/ui/(private)/users/UsersToolbar.test.tsx` — filtro search reduce filas, chips de rol filtran correctamente, combinación search+role aplica intersección
- [x] 8.4 `tests/unit/ui/(private)/users/UsersPagination.test.tsx` — botones Anterior/Siguiente, indicador correcto, cambio de pageSize resetea page=1
- [x] 8.5 `tests/unit/ui/(private)/users/UserEditModal.test.tsx` — apertura con pre-fill, validación email/url, botón Guardar deshabilitado sin cambios, dispara saveUserDiff con el diff esperado, muestra mensajes de error tipados, "Resetear a Gravatar" envía `avatarUrl: null`

## 9. Tests del átomo Avatar

- [x] 9.1 `tests/unit/ui/_components/atoms/Avatar.test.tsx` — render con src, tamaños sm/md/lg, fallback a icono cuando `onError` se dispara

## 10. Tests de NavigationRail

- [x] 10.1 Extender `tests/unit/ui/_components/organisms/NavigationRail.test.tsx` (existente) con: muestra `users` cuando `can("users:read")` es true, oculta cuando es false, muestra optimistamente cuando es "loading"

## 11. Verificación final

- [x] 11.1 Ejecutar `npm run build` y verificar 0 errores de TypeScript — 0 errores en código users-ui (errores pre-existentes en rbac/PrismaAuthorizationService.cache.test.ts no relacionados)
- [x] 11.2 Ejecutar `npm test` y verificar que toda la suite (nuevos + existentes) pasa — 54 suites UI / 220 tests pasan; fallos pre-existentes: 2 en requirePermission (rbac) + 4 integration sin DATABASE_URL
- [x] 11.3 Iniciar dev server, login como admin, navegar a `/users`, verificar: tabla carga, paginación funciona, filtros funcionan, modal edita un usuario distinto, eliminación funciona, auto-protección visible en la fila del propio admin
- [x] 11.4 Verificar con un usuario `viewer` (que tiene `users:read` pero no `users:write`) que la columna de acciones desaparece y la tabla sigue mostrándose
- [x] 11.5 Verificar con un usuario sin `users:read` que `/users` muestra el `EmptyState` "Sin acceso"
- [x] 11.6 Actualizar `CLAUDE.md` con la nueva sección "Administración de usuarios (UI)"
