## Why

El panel agrícola necesita catálogos administrativos básicos —formas de pago, folios, departamentos y sucursales— que hoy no existen en la base de datos ni en la API. Sin estos catálogos no se puede registrar configuración operacional del negocio ni alimentar futuros módulos transaccionales (ventas, compras, nómina). Se replica el patrón ya validado en `admin-users-crud` para entregar cuatro CRUDs homogéneos en un solo change.

## What Changes

- Nuevo módulo backend `src/modules/payment-methods/` con CRUD admin sobre `PaymentMethod { id, code, name, description?, isActive }`.
- Nuevo módulo backend `src/modules/folios/` con CRUD admin sobre `Folio { id, code, name, prefix, currentNumber, isActive }`.
- Nuevo módulo backend `src/modules/departments/` con CRUD admin sobre `Department { id, code, name, description?, isActive }`.
- Nuevo módulo backend `src/modules/branches/` con CRUD admin sobre `Branch { id, code, name, address?, phone?, email?, isActive }`.
- Nuevos endpoints REST por módulo:
  - `GET    /api/v1/admin/<recurso>` (lista paginada `?page=&pageSize=&includeInactive=`)
  - `GET    /api/v1/admin/<recurso>/:id` (detalle)
  - `POST   /api/v1/admin/<recurso>` (crear)
  - `PATCH  /api/v1/admin/<recurso>/:id` (actualizar parcial)
  - `DELETE /api/v1/admin/<recurso>/:id` (soft delete: marca `isActive = false`)
- Nuevos permisos RBAC sembrados: `payment_methods:read|write`, `folios:read|write`, `departments:read|write`, `branches:read|write`; todos otorgados al rol `admin`. `operator` y `viewer` reciben solo los `:read`.
- Nueva migración Prisma que añade las tablas `payment_methods`, `folios`, `departments`, `branches` con `code` único por tabla.
- Tests unitarios por use case con repositorios in-memory + tests de integración por módulo contra Supabase Postgres.

## Capabilities

### New Capabilities

- `admin-payment-methods`: CRUD admin de formas de pago vía API REST con soft delete por `isActive` y permisos `payment_methods:read|write`.
- `admin-folios`: CRUD admin de folios (series de numeración) vía API REST con soft delete por `isActive` y permisos `folios:read|write`.
- `admin-departments`: CRUD admin de departamentos vía API REST con soft delete por `isActive` y permisos `departments:read|write`.
- `admin-branches`: CRUD admin de sucursales vía API REST con soft delete por `isActive` y permisos `branches:read|write`.

### Modified Capabilities

- `rbac`: el seed de permisos y los `permissionsByRole` por defecto SHALL incluir las 8 nuevas claves `payment_methods:*`, `folios:*`, `departments:*`, `branches:*` para los roles `admin`, `operator` y `viewer`.

## Impact

- **Backend**: cuatro nuevos módulos hexagonales bajo `src/modules/` (domain → application → infrastructure), cada uno con su propio puerto repositorio, use cases, controller, DI container y route handlers en `app/api/v1/admin/<recurso>/`.
- **Base de datos**: una migración que crea cuatro tablas nuevas con índice único en `code` por tabla; no toca tablas existentes.
- **RBAC**: actualización del seed (`prisma/seed.ts`) con 8 permisos adicionales; los roles existentes se mantienen y se enriquecen vía `upsert` idempotente.
- **Tests**: nuevos suites unitarias (~16 archivos) y nuevos suites de integración (~4 archivos).
- **Sin cambios en UI ni en el módulo `auth` ni en el middleware**; los endpoints reutilizan `requirePermission` existente.
