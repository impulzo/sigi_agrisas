## Why

El backend `admin-users-crud` está completo (`GET`, `PATCH`, `DELETE` en `/api/v1/admin/users`) pero no hay UI para administrar usuarios. Los administradores solo pueden listar/editar/eliminar usuarios vía `curl`. Necesitamos una pantalla `/users` que (a) implemente el diseño de Stitch "Administración de Usuarios", (b) siga las convenciones del proyecto (Atomic + `_blocks` + `_logic`, igual que `roles-ui`), y (c) conecte directamente con los endpoints existentes.

## What Changes

- Nueva ruta privada `app/(private)/users/` con `layout.tsx` + `page.tsx` que renderiza el block `UsersPage`.
- Tabla paginada de usuarios con columnas: avatar + nombre, email, roles, fecha de creación, acciones.
- Buscador por email/nombre (filtrado client-side sobre la página cargada — el backend no soporta search aún).
- Filtro por rol (chips multi-select que cruzan client-side con la lista cargada).
- Paginación offset con controles "Anterior / Siguiente" y selector de `pageSize` (10 / 20 / 50).
- Modal "Editar Usuario" con campos: `name`, `email`, `avatarUrl` (texto URL), asignación de roles (multi-select sobre catálogo).
- Confirmación inline para eliminar usuario (usa `ConfirmDialog` existente).
- Protección frente a auto-edición/eliminación: las acciones aparecen deshabilitadas en la fila del propio admin con tooltip explicativo.
- Capa `_logic` con `services/` para `listUsers`, `getUser`, `updateUser`, `deleteUser`, `assignRoleToUser`, `revokeRoleFromUser`; `hooks/` `useUsers`, `useUserActions`; `types/` para los DTOs HTTP y el dominio del frontend; `schemas/` Zod para validar el body del modal.
- Nuevo item `users` en `NavigationRail` con `requires: "users:read"`, colocado entre `billing` y `roles`.
- Tests unitarios (RTL + jsdom) para `UsersPage`, `UserEditModal`, hooks y servicios. Tests integration-light para flujos de modal y paginación.
- Documentar la nueva pantalla y los servicios del frontend en `CLAUDE.md`.

**No-Goals (fuera de scope de este change):**
- Creación de usuarios desde la UI (registro queda en `/auth/register`; el backend admin no tiene `POST`).
- Cambio de contraseña de otro usuario (backend no lo soporta).
- Subida de archivo para el avatar (sólo URL, alineado con el contrato actual del PATCH).
- Status "activo/inactivo" (el modelo no lo tiene; añadirlo es un change futuro).
- Búsqueda server-side (el backend list no acepta `q` aún; el filtro vive en cliente sobre la página actual).

## Capabilities

### New Capabilities
- `users-ui`: Pantalla y flujo completo para que un admin liste, vea, edite y elimine usuarios, y reasigne sus roles, conectada al CRUD ya existente.

### Modified Capabilities
- `panel-shell`: agregar el item `users` al catálogo del `NavigationRail` con `requires: "users:read"`, colocado entre `billing` y `roles`.

## Impact

- **Código nuevo**:
  - `app/(private)/users/{layout.tsx, page.tsx}` + `_blocks/` + `_logic/{hooks,services,schemas,types}/`
  - Posibles átomos/moléculas reutilizados o ligeramente extendidos: `Badge`, `Avatar` (nuevo), `Skeleton`, `EmptyState`, `ConfirmDialog`, `Icon`.
  - Tests en `tests/unit/ui/(private)/users/` y `tests/unit/ui/_logic/users/`.
- **Código modificado**:
  - `app/_components/organisms/NavigationRail/items.ts` — agregar entrada `users`.
- **Sin cambios en backend** ni en migraciones de Prisma; consume sólo los endpoints existentes (`/api/v1/admin/users`, `/api/v1/admin/users/:id`, `/api/v1/admin/users/:id/roles`, `/api/v1/admin/users/:id/roles/:roleId`, `/api/v1/admin/roles`).
- **Documentación**: nueva sección "Administración de usuarios (UI)" en `CLAUDE.md`.
