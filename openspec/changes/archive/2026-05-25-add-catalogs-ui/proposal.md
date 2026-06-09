## Why

El backend `crud-settings-models` (archivado el 2026-05-20) expone cuatro CRUDs admin de catálogos —`payment-methods`, `folios`, `departments`, `branches`— pero no hay UI. Hoy los catálogos sólo pueden administrarse vía `curl`. Necesitamos cuatro pantallas administrativas que (a) sigan el blueprint validado en `users-ui` (Atomic + `_blocks` + `_logic` + modal con diff), (b) conecten directamente con los endpoints existentes sin tocar el backend, y (c) se agrupen bajo un submenú "Catálogos" en el `NavigationRail` para evitar saturar la barra primaria con 4 items adicionales.

## What Changes

- Nueva ruta privada hub `app/(private)/catalogs/` con `layout.tsx` + `page.tsx` (índice con 4 tarjetas de acceso por catálogo, sujetas a `<recurso>:read`).
- Cuatro nuevas pantallas privadas bajo el hub:
  - `app/(private)/catalogs/payment-methods/` — gestión de formas de pago.
  - `app/(private)/catalogs/folios/` — gestión de series de numeración (folios).
  - `app/(private)/catalogs/departments/` — gestión de departamentos.
  - `app/(private)/catalogs/branches/` — gestión de sucursales.
- Cada pantalla replica el patrón `users-ui`:
  - Tabla paginada con columnas específicas por recurso + `code`, `isActive` (badge) y acciones.
  - Toolbar con búsqueda client-side, toggle "Mostrar inactivos" (mapea a `?includeInactive=true`) y botón "Nuevo" (gated por `<recurso>:write`).
  - Paginación offset reutilizando el patrón de `UsersPagination`.
  - Modal único en dos modos: `create` (POST con `code` editable) y `edit` (PATCH con diff, `code` deshabilitado por inmutabilidad backend).
  - Acción de soft delete (DELETE → `isActive=false`) con confirmación inline; las filas inactivas muestran badge "Inactivo" y la acción se convierte en "Reactivar" (PATCH `{ isActive: true }`).
- Cada módulo añade su capa `_logic/` con `services/` (`listX`, `getX`, `createX`, `updateX`, `softDeleteX`), `hooks/` (`useX`, `useXMutations`), `types/` (DTOs HTTP + dominio frontend), `schemas/` (Zod para create/update) y `errors.ts` (errores tipados: `XNotFoundError`, `XCodeAlreadyInUseError`).
- Nuevo patrón de submenú en `NavigationRail`: el tipo `RailItem` acepta `children?: RailItem[]`. Cuando un item tiene `children`, hacer hover/click despliega un flyout vertical adyacente al rail con los items hijos. La visibilidad del item padre se calcula como "se muestra si al menos un hijo es visible".
- Nuevo item primario `catalogs` (icono `category`, label "Catálogos", href `/catalogs`) con 4 hijos: `payment-methods` (`payment_methods:read`, icono `payments`), `folios` (`folios:read`, icono `tag`), `departments` (`departments:read`, icono `apartment`), `branches` (`branches:read`, icono `store`). Inserción **antes** del item `users` para mantener juntos los items admin.
- Átomos/moléculas reutilizables nuevos:
  - `app/_components/atoms/Switch/` — toggle de `isActive` y de "Mostrar inactivos".
  - `app/_components/molecules/RailFlyout/` — popover vertical anclado al rail para renderizar los `children` de un `RailItem`.
- Tests unitarios (RTL + jsdom) por módulo: services, hooks, blocks; tests del nuevo `RailFlyout` y de los nuevos comportamientos del `NavigationRail`.
- Documentación de la nueva sección "Administración de catálogos (UI)" en `CLAUDE.md`.

**No-Goals (fuera de scope de este change):**
- Búsqueda server-side por nombre/código (el backend list no acepta `?q=` aún; el filtro vive en cliente sobre la página actual, igual que `users-ui`).
- Bulk actions (crear/editar/eliminar en masa).
- Importación/exportación CSV.
- Auditoría/historial de cambios por entidad.
- Validaciones cruzadas entre catálogos (p.ej. asignar `Department` a `Branch`); cada catálogo se administra de forma independiente, alineado con el contrato actual de la API.

## Capabilities

### New Capabilities

- `catalogs-ui`: Pantallas y flujos completos para que un admin liste, cree, vea, edite y soft-delete las cuatro entidades de catálogo (`payment-methods`, `folios`, `departments`, `branches`), conectadas a los CRUDs ya existentes en `/api/v1/admin/*` y agrupadas bajo un hub navegable `/catalogs`.

### Modified Capabilities

- `panel-shell`: el catálogo de items del `NavigationRail` SHALL aceptar un campo opcional `children?: RailItem[]`. SHALL incluir un nuevo item primario `catalogs` con cuatro hijos (`payment-methods`, `folios`, `departments`, `branches`) colocado entre `billing` y `users`. Cuando un item tiene `children`, el rail SHALL mostrar un flyout vertical adyacente con los hijos visibles según las permisos del usuario actual.

## Impact

- **Código nuevo**:
  - `app/(private)/catalogs/{layout.tsx, page.tsx}` (hub) + 4 subrutas con `{layout.tsx, page.tsx, _blocks/, _logic/}` cada una.
  - Átomos `Switch` y molécula `RailFlyout` en `app/_components/`.
  - Tests en `tests/unit/ui/(private)/catalogs/<módulo>/` y `tests/unit/ui/_components/{atoms/Switch,molecules/RailFlyout}/`.
- **Código modificado**:
  - `app/_components/organisms/NavigationRail/items.ts` — agregar item `catalogs` con `children`.
  - `app/_components/organisms/NavigationRail/NavigationRail.tsx` — soportar render de `children` vía `RailFlyout`.
  - `app/_components/atoms/Icon/icons.ts` — agregar `category`, `payments`, `tag`, `apartment`, `store` si faltan.
- **Sin cambios en backend** ni en migraciones Prisma; consume sólo los endpoints existentes (`/api/v1/admin/payment-methods`, `/api/v1/admin/folios`, `/api/v1/admin/departments`, `/api/v1/admin/branches` y sus rutas `:id`).
- **Documentación**: nueva sección "Administración de catálogos (UI)" en `CLAUDE.md` con la convención de rutas, el listado de campos por módulo y la regla de visibilidad del submenú.
