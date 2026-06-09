## Why

El backend `add-providers-crud` (archivado 2026-05-25) expone un CRUD admin completo sobre `/api/v1/admin/providers` con datos fiscales mexicanos (RFC, régimen, CFDI, etc.), búsqueda server-side y soft delete. Hoy no hay UI: la única forma de administrar proveedores es vía `curl`. Necesitamos una pantalla administrativa que (a) siga el blueprint validado en `add-catalogs-ui` (Atomic + `_blocks` + `_logic` + modal con diff), (b) aproveche la búsqueda server-side que ya provee el backend (a diferencia de los 4 catálogos que filtran client-side), (c) se integre como **quinto elemento del submenú "Catálogos"** en el `NavigationRail` (decisión explícita del usuario para no saturar el rail con un item primario adicional), y (d) maneje la complejidad del formulario (12 campos editables, validación de RFC mexicano).

## What Changes

- Nueva ruta privada `app/(private)/catalogs/providers/` con `layout.tsx`, `page.tsx`, `_blocks/` y `_logic/` siguiendo el patrón establecido para `branches`/`departments`/`payment-methods`/`folios`.
- Capa `_logic/` completa: `services/` (`listProviders`, `getProvider`, `createProvider`, `updateProvider`, `softDeleteProvider`), `hooks/` (`useProviders`, `useProviderMutations`), `types/` (DTOs HTTP + dominio frontend con `Date` parseado), `schemas/` (Zod con regex de RFC, taxRegime, cfdiUse, taxZipCode espejando el backend), `errors.ts` (`ProviderNotFoundError`, `ProviderCodeAlreadyInUseError`, `ProviderRfcAlreadyInUseError`).
- Bloques específicos del módulo: `ProvidersPage` (orquestador con estado de `search`, `page`, `pageSize`, `includeInactive`, `modalState`), `ProvidersTable` (columnas: code, name, rfc, taxRegime, contacto resumido, Activo, acciones), `ProviderEditModal` (modal único con dos modos `create`/`edit` y secciones agrupadas: "Datos básicos", "Datos fiscales", "Contacto").
- **Búsqueda server-side**: a diferencia de los 4 catálogos previos que filtran client-side sobre la página cargada, este módulo enviará `?search=` al backend (que ya implementa `OR ILIKE` sobre `name`/`legalName`/`rfc`). La toolbar muestra un indicador "Búsqueda en servidor" para diferenciar.
- Quinto item en `NavigationRail.items.ts` bajo `children` del `catalogs`: `{ key: "providers", href: "/catalogs/providers", icon: "local_shipping", label: "Proveedores", requires: "providers:read" }`. Inserción al final del array de hijos.
- Quinta tarjeta en el hub `/catalogs`: `CatalogsHubPage` añade `{ icon: "local_shipping", title: "Proveedores", description: "Gestiona los proveedores y sus datos fiscales.", href: "/catalogs/providers", permission: "providers:read" }`.
- Tests unitarios RTL + jsdom: services, hooks, blocks (`ProvidersPage`, `ProvidersTable`, `ProviderEditModal`), validaciones específicas de RFC.
- Documentación: actualizar la sección "Administración de catálogos (UI)" en `CLAUDE.md` para incluir el nuevo módulo (campos, búsqueda server-side, regex de RFC) y la nueva entrada del submenú/hub.

**No-Goals (fuera de scope de este change):**
- Cambios en el backend de proveedores (el contrato ya existe).
- Importación masiva CSV/Excel.
- Histórico de cambios de RFC.
- Bulk actions (desactivar/reactivar en masa).
- Documentos adjuntos (constancia de situación fiscal).
- Catálogos enumerados de `taxRegime`/`cfdiUse` (el frontend usa un `<input>` con regex y placeholder con valores comunes; se puede mejorar a `<select>` con catálogo estático en un change incremental futuro).
- Validación de homoclave del RFC contra el SAT.
- Validación cruzada con otros catálogos.

## Capabilities

### New Capabilities

- `providers-ui`: Pantallas y flujos completos para que un admin liste, busque (server-side), cree, vea, edite y soft-delete proveedores con sus datos fiscales mexicanos, conectados al CRUD existente en `/api/v1/admin/providers` y accesibles desde el submenú "Catálogos" y el hub `/catalogs`.

### Modified Capabilities

- `panel-shell`: el array `children` del item `catalogs` en `NavigationRail.items.ts` SHALL incluir un quinto entry `providers` (icono `local_shipping`, href `/catalogs/providers`, label "Proveedores", `requires: "providers:read"`) al final del array.
- `catalogs-ui`: el hub `/catalogs` (`CatalogsHubPage`) SHALL renderizar una quinta tarjeta para proveedores, gated por `providers:read`, después de la tarjeta de "Sucursales".

## Impact

- **Código nuevo**:
  - `app/(private)/catalogs/providers/{layout.tsx, page.tsx, _blocks/, _logic/}` (≈15 archivos).
  - Tests en `tests/unit/ui/(private)/catalogs/providers/{services,hooks,blocks}/` (≈10 archivos).
- **Código modificado**:
  - `app/_components/organisms/NavigationRail/items.ts` — añadir 1 entry en `catalogs.children`.
  - `app/(private)/catalogs/_blocks/CatalogsHubPage.tsx` — añadir 1 entry en `CATALOG_CARDS`.
  - `app/_components/atoms/Icon/icons.ts` — añadir `local_shipping` si no existe.
  - `tests/unit/ui/_components/organisms/NavigationRail.test.tsx` — extender para cubrir 5 hijos en lugar de 4.
  - `tests/unit/ui/(private)/catalogs/CatalogsHubPage.test.tsx` — extender para cubrir 5 tarjetas.
- **Sin cambios en backend** ni en migraciones Prisma; consume sólo los endpoints existentes (`/api/v1/admin/providers` y `/api/v1/admin/providers/:id`).
- **Documentación**: actualizar la sección "Administración de catálogos (UI)" en `CLAUDE.md` con el módulo Proveedores; mencionar que es el primer módulo con búsqueda server-side dentro del hub de catálogos.
