## Why

El backend RBAC ya está completo (módulo `src/modules/rbac/`, endpoints bajo `/api/v1/admin/**`, JWT con claim `roles`, guard `requirePermission`) pero el panel no tiene aún ninguna UI para administrarlo. Un administrador que quiera consultar los roles existentes, ver los permisos asignados a cada rol o conceder/revocar permisos debe hacerlo con `curl` o directamente contra Supabase, lo cual no es viable para el cliente final ni para el operador del panel.

Esta propuesta implementa el **frontend de administración de roles** sobre el design system Material 3 "Agro-Systemic" ya establecido por el change `panel-front`, siguiendo la arquitectura del proyecto (Atomic Design + Route Groups + `_logic` por feature) documentada en `CLAUDE.md`. Además introduce la primera utilidad de **acceso autenticado desde el cliente** (cliente HTTP que adjunta el `accessToken` y maneja `401/403`), pieza que faltaba en el panel y que será reutilizada por todos los futuros módulos privados (POS, Inventario, Facturación).

## Reglas fundamentales del feature

1. **Reusa la arquitectura existente**: Atomic Design (`_components/atoms|molecules|organisms`), Route Group `(private)`, `_logic/` por feature con `hooks/`, `services/`, `schemas/`, `types/`. Los `_components/` y `_blocks/` son presentational puros — sin `fetch`, sin `sessionStorage`, sin `useRouter().push/replace`.
2. **Sigue el design system Stitch Material 3 "Agro-Systemic"**: paleta semántica, tipografía Inter, escala de spacing 8px, Material Symbols Outlined. No se introducen tokens visuales ajenos.
3. **Respeta el modelo de permisos del backend**: la UI consume los endpoints `/api/v1/admin/**` existentes y nunca asume permisos que el usuario no tiene. Las páginas y los menú items relacionados con roles **SHALL** estar ocultos para usuarios sin el permiso `roles:read`.
4. **Solo lectura/edición del catálogo de roles y permisos**: este change cubre roles y permisos (no la asignación de roles a usuarios concretos, que vivirá en el módulo de usuarios). El alcance se limita a: ver roles, ver permisos de un rol, conceder/revocar permisos a un rol, ver el catálogo de permisos.

## What Changes

- Añade ruta `/roles` bajo `app/(private)/` con dos paneles: lista de roles (master) + detalle del rol seleccionado con permisos asignados y disponibles.
- Crea el feature `app/(private)/roles/_logic/` con:
  - `services/`: `listRoles`, `listPermissions`, `listRolePermissions`, `grantPermissionToRole`, `revokePermissionFromRole`
  - `hooks/`: `useRoles`, `useRolePermissions`, `usePermissionsCatalog`, `useGrantPermission`, `useRevokePermission`
  - `schemas/`: Zod schemas para los formularios de grant
  - `types/`: DTOs HTTP (`api.ts`) y tipos de dominio del frontend (`domain.ts`)
- Crea los bloques del feature (`_blocks/`): `RolesList`, `RoleDetailHeader`, `RolePermissionsList`, `AvailablePermissionsList`, `RoleFiltersBar`.
- Añade utilidades globales nuevas:
  - `app/_lib/authFetch.ts`: wrapper de `fetch` que inyecta el `Authorization: Bearer <accessToken>` desde `sessionStorage` y mapea respuestas `401/403` a errores tipados (`UnauthenticatedError`, `ForbiddenError`).
  - `app/_lib/jwt.ts`: helper puro para decodificar el payload del JWT (sin verificar firma) y leer el claim `roles`. Sin dependencias externas más allá del navegador.
  - `app/_hooks/useCurrentUser.ts`: hook que lee `accessToken` del `sessionStorage`, decodifica `roles` y expone `{ userId, email, roles, can(permission) }`. La función `can` consulta `/api/v1/admin/users/:id/permissions` en background y cachea (TanStack-free, mini cache propia con `useState`+ref).
- Añade nuevos átomos/moléculas reutilizables que el feature necesita:
  - `_components/atoms/Badge` — chip pequeño con variantes para `read`/`write`.
  - `_components/atoms/Skeleton` — placeholders de carga.
  - `_components/molecules/EmptyState` — estado vacío con icono + título + descripción + acción opcional.
  - `_components/molecules/ConfirmDialog` — modal accesible (focus trap, ESC para cerrar) para confirmar revocación de permisos.
- Modifica el shell privado para añadir la sesión **Roles** al `NavigationRail`:
  - Añade el item `{ key: "roles", href: "/roles", icon: "shield_person", label: "Roles" }` al array `primaryItems` de `NavigationRail/items.ts`.
  - Añade `"shield_person"` (Material Symbol) al catálogo `_components/atoms/Icon/icons.ts`.
  - El item se renderiza condicionalmente: solo se muestra si el usuario tiene el permiso `roles:read`. La verificación ocurre client-side leyendo los `roles` del JWT.
- Crea redirect server-side: si el usuario llega a `/roles` sin el rol que otorgue `roles:read`, el layout muestra un estado 403 amigable en lugar de un crash o redirect.

## Capabilities

### New Capabilities
- `roles-ui`: feature de administración de roles bajo `/roles` (lista de roles, detalle con permisos, grant/revoke de permisos).

### Modified Capabilities
- `panel-shell`: el `NavigationRail` añade el item **Roles** con guard de permisos client-side.
- `frontend-scaffold`: añade utilidades transversales (`authFetch`, `jwt.decode`, `useCurrentUser`) que el resto del panel reutilizará.

## Impact

- **Código nuevo**:
  - `app/(private)/roles/page.tsx`, `app/(private)/roles/layout.tsx`
  - `app/(private)/roles/_blocks/{RolesList,RoleDetailHeader,RolePermissionsList,AvailablePermissionsList,RoleFiltersBar}.tsx`
  - `app/(private)/roles/_logic/{services,hooks,schemas,types}/`
  - `app/_lib/authFetch.ts`, `app/_lib/jwt.ts`
  - `app/_hooks/useCurrentUser.ts`
  - `app/_components/atoms/{Badge,Skeleton}/`, `app/_components/molecules/{EmptyState,ConfirmDialog}/`
  - `tests/unit/ui/{roles,authFetch,jwt}/...`
- **Código modificado**:
  - `app/_components/organisms/NavigationRail/items.ts`: añade item `roles`.
  - `app/_components/organisms/NavigationRail/NavigationRail.tsx`: filtra `primaryItems` con `useCurrentUser().can("roles:read")`.
  - `app/_components/atoms/Icon/icons.ts`: añade `"shield_person"`.
- **Sin cambios en backend**: el feature consume exclusivamente endpoints existentes (`GET /api/v1/admin/roles`, `GET /api/v1/admin/permissions`, `GET/POST /api/v1/admin/roles/:id/permissions`, `DELETE /api/v1/admin/roles/:id/permissions/:permId`).
