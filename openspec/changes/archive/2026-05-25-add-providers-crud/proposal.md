## Why

El panel agrícola necesita gestionar el catálogo de proveedores como base para futuros módulos transaccionales (compras, cuentas por pagar, CFDI de recepción). Hoy la BD y la API no tienen ninguna noción de "proveedor". Para operar en México la información de los proveedores tiene un componente fiscal obligatorio (RFC, opcionalmente régimen fiscal SAT, código postal del domicilio fiscal y uso de CFDI), pero solo el RFC es estrictamente necesario para una alta válida; el resto se completa cuando el admin tenga la constancia de situación fiscal a la mano.

Se replica el patrón hexagonal ya validado en `crud-settings-models` (catálogos `payment-methods`, `folios`, `departments`, `branches`) y `admin-users-crud`: dominio puro → puertos → use cases → repositorio Prisma + controller con Zod → route handlers en `app/api/v1/admin/providers/`.

## What Changes

- Nuevo módulo backend `src/modules/providers/` con CRUD admin sobre la entidad `Provider`.
- Nuevos endpoints REST bajo `/api/v1/admin/providers`:
  - `GET    /api/v1/admin/providers` (lista paginada `?page=&pageSize=&includeInactive=`, búsqueda opcional `?search=`)
  - `GET    /api/v1/admin/providers/:id` (detalle)
  - `POST   /api/v1/admin/providers` (crear)
  - `PATCH  /api/v1/admin/providers/:id` (actualizar parcial)
  - `DELETE /api/v1/admin/providers/:id` (soft delete: marca `isActive = false`)
- Nueva migración Prisma `add_providers_table` que crea la tabla `providers` con índice único en `code` y en `rfc`.
- Nuevos permisos RBAC sembrados: `providers:read` y `providers:write`; otorgados al rol `admin` (read+write), `operator` y `viewer` (solo read).
- Validación de RFC en el controller con regex que cubre Persona Moral (12 chars) y Persona Física (13 chars), incluyendo el genérico extranjero `XEXX010101000`.
- Tests unitarios por use case con `InMemoryProviderRepository` + test de integración end-to-end contra Supabase Postgres.

## Capabilities

### New Capabilities

- `admin-providers`: CRUD admin de proveedores vía API REST con soft delete por `isActive`, búsqueda por nombre/RFC, validación de datos fiscales mexicanos (RFC obligatorio; régimen fiscal, CFDI, código postal y razón social opcionales) y permisos `providers:read|write`.

### Modified Capabilities

- `rbac`: el seed de permisos y los `permissionsByRole` por defecto SHALL incluir las 2 nuevas claves `providers:read` y `providers:write` para los roles `admin`, `operator` y `viewer`.

## Impact

- **Backend**: un nuevo módulo hexagonal bajo `src/modules/providers/` (domain → application → infrastructure), con su propio puerto repositorio, 5 use cases (List/Get/Create/Update/SoftDelete), controller, DI container y route handlers en `app/api/v1/admin/providers/`.
- **Base de datos**: una migración que crea la tabla `providers` con índices únicos en `code` y `rfc`; no toca tablas existentes.
- **RBAC**: actualización del seed (`prisma/seed.ts`) con 2 permisos adicionales; los roles existentes se mantienen y se enriquecen vía `upsert` idempotente.
- **Tests**: ~5 archivos de tests unitarios (uno por use case) + 1 archivo de tests de integración.
- **Sin cambios en UI**, en el módulo `auth` ni en el middleware; los endpoints reutilizan `requirePermission` existente.
