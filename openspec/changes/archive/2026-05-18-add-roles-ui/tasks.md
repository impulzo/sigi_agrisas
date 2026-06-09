## 1. Átomos y moléculas nuevos (Atomic Design)

- [x] 1.1 Crear `app/_components/atoms/Badge/Badge.tsx` con `variant: "read" | "write" | "neutral"`, color y padding según design tokens M3 (`bg-tertiary-container text-on-tertiary-container` para `read`, `bg-secondary-container text-on-secondary-container` para `write`, `bg-surface-container-high text-on-surface` para `neutral`)
- [x] 1.2 Crear `app/_components/atoms/Badge/index.ts` re-exportando `Badge`
- [x] 1.3 Crear `app/_components/atoms/Skeleton/Skeleton.tsx` con `width`, `height` y `rounded` props; animación `animate-pulse` y `bg-surface-container-highest`
- [x] 1.4 Crear `app/_components/atoms/Skeleton/index.ts`
- [x] 1.5 Crear `app/_components/molecules/EmptyState/EmptyState.tsx` con props `icon: IconName`, `title: string`, `description?: string`, `action?: ReactNode`; layout vertical centrado, icon grande (`size-12`), título `text-headline-sm`, descripción `text-body-md text-on-surface-variant`
- [x] 1.6 Crear `app/_components/molecules/EmptyState/index.ts`
- [x] 1.7 Crear `app/_components/molecules/ConfirmDialog/ConfirmDialog.tsx` con props `open: boolean`, `title: string`, `description: string`, `confirmLabel?: string`, `cancelLabel?: string`, `onConfirm: () => void`, `onCancel: () => void`; usa `<dialog>` nativo con `useEffect` para `showModal()`/`close()`; focus trap nativo del `<dialog>`; cierra con `Escape`
- [x] 1.8 Crear `app/_components/molecules/ConfirmDialog/index.ts`
- [x] 1.9 Añadir iconos `"shield_person"`, `"lock"`, `"close"`, `"add"`, `"search"` (verificar que `"search"` ya existe; si sí, mantener) al catálogo `app/_components/atoms/Icon/icons.ts`

## 2. Utilidades transversales

- [x] 2.1 Crear `app/_lib/jwt.ts` con función `decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null` que hace `atob(token.split(".")[1])` con validación: devuelve `null` si el formato es inválido o el JSON no se parsea; sin verificación de firma (documentado en comentario)
- [x] 2.2 Crear `app/_lib/authFetch.ts` con `UnauthenticatedError`, `ForbiddenError(required?: string)`, `NetworkError` exportadas; función `authFetch(input, init?: AuthFetchOptions)` que:
  - Lee `sessionStorage.getItem("accessToken")` (skip si `init.skipAuth === true`)
  - Inyecta `Authorization: Bearer <token>` en headers si hay token
  - Captura excepción de `fetch` → lanza `NetworkError`
  - Si `res.status === 401` → lanza `UnauthenticatedError`
  - Si `res.status === 403` → intenta parsear `body.required` y lanza `ForbiddenError(required)`
  - Devuelve `Response` para que el caller lea body/manejen otros statuses
- [x] 2.3 Crear `app/_hooks/useCurrentUser.ts`:
  - Lee `sessionStorage.getItem("accessToken")` en `useEffect`
  - Decodifica payload con `decodeJwtPayload`
  - Expone `{ userId, email, roles, isLoading, can(permission), refresh() }`
  - `can(permission)` lanza una sola petición a `/api/v1/admin/users/:userId/permissions` (via `authFetch`) la primera vez; mientras está en curso devuelve `"loading"`
  - Cachea en singleton module-level `Map<userId, { permissions: Set<string>; expiresAt: number; promise?: Promise<Set<string>> }>` con TTL 60_000 ms
  - Dedupe de promesa en vuelo: si dos componentes llaman `can(...)` antes de resolver, ambos esperan la misma promesa
  - `refresh()` borra la entrada del cache y fuerza re-fetch

## 3. Feature `_logic/types` y `_logic/schemas`

- [x] 3.1 Crear `app/(private)/roles/_logic/types/api.ts` con DTOs HTTP
- [x] 3.2 Crear `app/(private)/roles/_logic/types/domain.ts` con tipos y errores tipados
- [x] 3.3 Crear `app/(private)/roles/_logic/schemas/grantPermission.schema.ts` con Zod

## 4. Feature `_logic/services`

- [x] 4.1 Crear `app/(private)/roles/_logic/services/listRoles.ts`
- [x] 4.2 Crear `app/(private)/roles/_logic/services/listPermissions.ts`
- [x] 4.3 Crear `app/(private)/roles/_logic/services/listRolePermissions.ts`
- [x] 4.4 Crear `app/(private)/roles/_logic/services/grantPermissionToRole.ts`
- [x] 4.5 Crear `app/(private)/roles/_logic/services/revokePermissionFromRole.ts`
- [x] 4.6 Cada service acepta `fetchImpl?: typeof fetch` opcional para tests

## 5. Feature `_logic/hooks`

- [x] 5.1 Crear `useRoles()` en `_logic/hooks/useRoles.ts`
- [x] 5.2 Crear `usePermissionsCatalog()` en `_logic/hooks/usePermissionsCatalog.ts`
- [x] 5.3 Crear `useRolePermissions(roleId: string | null)` en `_logic/hooks/useRolePermissions.ts`
- [x] 5.4 Crear `useGrantPermission()` en `_logic/hooks/useGrantPermission.ts`
- [x] 5.5 Crear `useRevokePermission()` en `_logic/hooks/useRevokePermission.ts`

## 6. Bloques del feature

- [x] 6.1 Crear `app/(private)/roles/_blocks/RolesList.tsx`
- [x] 6.2 Crear `app/(private)/roles/_blocks/RoleDetailHeader.tsx`
- [x] 6.3 Crear `app/(private)/roles/_blocks/RolePermissionsList.tsx`
- [x] 6.4 Crear `app/(private)/roles/_blocks/AvailablePermissionsList.tsx`
- [x] 6.5 Crear `app/(private)/roles/_blocks/RoleFiltersBar.tsx`
- [x] 6.6 Crear `app/(private)/roles/_blocks/RolesPage.tsx` (client component, `"use client"`)

## 7. Página y layout `/roles`

- [x] 7.1 Crear `app/(private)/roles/layout.tsx`
- [x] 7.2 Crear `app/(private)/roles/page.tsx`

## 8. Integración con NavigationRail

- [x] 8.1 Extender la interfaz `RailItem` en `items.ts` con `requires?: string`
- [x] 8.2 Añadir item `roles` al array `primaryItems`
- [x] 8.3 Modificar `NavigationRail.tsx` para filtrar con `useCurrentUser().can(...)`

## 9. Tests unitarios — utilidades

- [x] 9.1 `tests/unit/ui/_lib/jwt.test.ts`
- [x] 9.2 `tests/unit/ui/_lib/authFetch.test.ts`
- [x] 9.3 `tests/unit/ui/_hooks/useCurrentUser.test.ts`

## 10. Tests unitarios — feature roles

- [x] 10.1 `tests/unit/ui/roles/services/listRoles.test.ts`
- [x] 10.2 `tests/unit/ui/roles/services/grantPermissionToRole.test.ts`
- [x] 10.3 `tests/unit/ui/roles/hooks/useRoles.test.ts`
- [x] 10.4 `tests/unit/ui/roles/blocks/RolesList.test.tsx`
- [x] 10.5 `tests/unit/ui/roles/blocks/RolePermissionsList.test.tsx`
- [x] 10.6 `tests/unit/ui/roles/blocks/RolesPage.test.tsx`

## 11. Tests unitarios — átomos/moléculas nuevos

- [x] 11.1 `tests/unit/ui/atoms/Badge.test.tsx`
- [x] 11.2 `tests/unit/ui/atoms/Skeleton.test.tsx`
- [x] 11.3 `tests/unit/ui/molecules/EmptyState.test.tsx`
- [x] 11.4 `tests/unit/ui/molecules/ConfirmDialog.test.tsx`

## 12. Validación final

- [x] 12.1 Ejecutar `npm run build` y verificar 0 errores de TypeScript
- [x] 12.2 Ejecutar `npm test` y verificar que TODOS los tests pasan (nuevos + suite existente)
- [x] 12.3 Probar manualmente en `npm run dev`
- [x] 12.4 Verificar accesibilidad básica
- [x] 12.5 Documentar en `CLAUDE.md`
