## Context

El proyecto ya tiene un módulo `admin-users-crud` (archivado el 2026-05-18) que sigue arquitectura hexagonal estricta: dominio puro → puertos de aplicación → implementaciones de infraestructura → route handlers que delegan a un controller vía DI container. Este change replica exactamente ese patrón para cuatro catálogos administrativos (`PaymentMethod`, `Folio`, `Department`, `Branch`) que aún no existen en la BD ni en la API.

El módulo `rbac` ya proporciona `requirePermission(req, "resource:action")` y un seed idempotente. No hay UI involucrada en este change; el frontend consumirá estos endpoints en un change posterior.

Entidades minimalistas a propósito (decisión validada con el usuario): ni jerarquía de departamentos, ni FK entre folio↔sucursal, ni multi-currency en formas de pago. Cada catálogo es independiente.

## Goals / Non-Goals

**Goals:**

- Cuatro CRUDs REST completos (`GET list`, `GET detail`, `POST create`, `PATCH update`, `DELETE`).
- Cada CRUD vive en su propio módulo hexagonal bajo `src/modules/<recurso>/`.
- Soft delete: `DELETE` marca `isActive = false`; los listados ocultan inactivos por defecto y `?includeInactive=true` los muestra.
- Permisos RBAC granulares por recurso (`resource:read` y `resource:write`), sembrados de forma idempotente.
- Validación Zod en el controller; el dominio no conoce HTTP.
- Tests unitarios con repositorios in-memory + tests de integración contra Supabase Postgres.

**Non-Goals:**

- UI (ningún componente React en este change).
- Relaciones entre los cuatro modelos (no se referencia `branchId` desde `Department` ni desde `Folio`).
- Auto-incremento de `currentNumber` en `Folio` (eso lo hará un servicio transaccional futuro; este change solo gestiona el catálogo).
- Multi-tenant scoping (todos los catálogos son globales).
- Endpoints de bulk import/export.
- Auditoría/historial de cambios.

## Decisions

### Decisión 1 — Cuatro módulos independientes, no un módulo "settings"

Cada uno de los cuatro recursos vive en `src/modules/payment-methods/`, `src/modules/folios/`, `src/modules/departments/`, `src/modules/branches/` con su propio dominio, puerto, use cases, repositorio Prisma, controller y DI container.

**Alternativa descartada:** un único módulo `src/modules/settings/` con cuatro entidades dentro. Acoplaría cuatro agregados sin relación, dificultaría futuros cambios independientes (p.ej. añadir auto-incremento solo a `Folio`) y rompería la coherencia con el patrón `admin-users-crud`.

### Decisión 2 — Soft delete por campo `isActive`, no `deletedAt`

`DELETE` marca `isActive = false` en lugar de eliminar la fila. `GET list` filtra `isActive = true` por defecto y acepta `?includeInactive=true` para incluir inactivos. `GET detail` siempre devuelve la entidad (haya sido desactivada o no), porque el código que la referencia debe poder leer su nombre histórico.

**Alternativa descartada:** columna `deletedAt: DateTime?` con borrado lógico estilo "Paranoid". Requiere reescribir todos los queries en el repositorio para añadir `where: { deletedAt: null }` y obliga a recordar el filtro en cada operación. El campo `isActive` es semánticamente más rico (un catálogo puede estar inactivo sin ser "borrado" — p.ej. una sucursal cerrada temporalmente).

**Alternativa descartada:** hard delete (como en `admin-users-crud`). El catálogo de configuración puede ser referenciado en el futuro desde transacciones; un hard delete violaría integridad referencial. La consistencia con `admin-users` se rompe a propósito porque los usuarios son entidades de identidad y los catálogos son referencias.

### Decisión 3 — `code` único e inmutable a nivel de aplicación

Cada entidad tiene un campo `code: string` con índice único en BD. El `code` se valida con regex `/^[A-Z0-9_]{1,32}$/` (mayúsculas, dígitos y `_`). El use case de update NO permite cambiar `code`: si el body lo incluye, se ignora silenciosamente (no se rechaza para mantener PATCH idempotente). La razón es que `code` es la clave de negocio que terceros sistemas y reports pueden usar para referenciar el catálogo.

**Alternativa descartada:** permitir editar `code`. Generaría inconsistencia en sistemas que cacheen el code. Si un admin necesita "renombrar", puede crear uno nuevo y desactivar el viejo.

### Decisión 4 — `PATCH` parcial con validación "al menos un campo"

Sigue el patrón de `admin-users-crud`: el body de `PATCH` exige al menos un campo presente; cuerpo vacío devuelve `HTTP 400`. Campos no presentes no se tocan; pasar `null` explícito a campos opcionales (`description`, `address`, `phone`, `email`) los borra (los setea a `null` en BD).

### Decisión 5 — Nombres de permisos con guion bajo (`payment_methods:read`)

El formato `PermissionKey` definido en `rbac` es `^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$`. Eso permite guion bajo pero no guion medio. Usamos `payment_methods` (no `payment-methods`) en la clave del permiso. La ruta HTTP sí usa guion medio: `/api/v1/admin/payment-methods` por convención URL.

### Decisión 6 — `Folio.currentNumber` empieza en 0, no en 1

`POST /folios` por defecto crea con `currentNumber: 0`. El primer documento emitido lo incrementará a 1. Esto evita confusión cuando un admin define un folio "FAC-A" pero aún no emite ninguno: el conteo refleja documentos emitidos, no documentos pendientes.

**Alternativa descartada:** `currentNumber: 1` por defecto. Implicaría que existe un documento #1 que en realidad no se ha emitido.

### Decisión 7 — Repositorio Prisma con manejo de errores tipados

`PrismaRepository.create` convierte `P2002` (unique violation en `code`) a `CodeAlreadyInUseError`. `PrismaRepository.update` y `.softDelete` convierten `P2025` (record not found) a `<Entity>NotFoundError`. Esto se hace por módulo (cada uno tiene su propio error de dominio) para no acoplar módulos a errores compartidos.

### Decisión 8 — Una sola migración Prisma para los cuatro modelos

`npx prisma migrate dev --name add_settings_catalog_tables` crea las cuatro tablas en una sola migración. Razón: las cuatro tablas son independientes entre sí, no hay riesgo de fallo parcial, y mantener una sola migración por feature simplifica el deploy y el rollback.

### Decisión 9 — Paginación offset con defaults conservadores

Igual que `admin-users-crud`: `?page=1&pageSize=20` con `pageSize` máx 100. Respuesta `{ items: T[], total, page, pageSize }`. Suficiente para catálogos administrativos con pocos cientos de registros.

### Decisión 10 — `viewer` recibe permisos `:read` por defecto en seed

Los nuevos permisos `*_methods:read`, `folios:read`, `departments:read`, `branches:read` se asignan a los tres roles base (`admin`, `operator`, `viewer`). Los `:write` solo a `admin`. Esto mantiene el patrón actual donde `viewer` puede ver todo pero no modificar nada — lo mínimo que se espera de un "visor".

## Risks / Trade-offs

- **Soft delete sin restauración explícita** → Mitigación: un admin puede reactivar enviando `PATCH /api/v1/admin/<recurso>/:id` con `{ "isActive": true }`. No se expone un endpoint dedicado `/restore` para evitar superficie API extra.
- **Sin FKs entre catálogos** → Trade-off aceptado por scope; si en el futuro `Folio` debe referenciar `Branch`, se añadirá en un change separado con su propia migración.
- **`code` no editable** → Si un admin se equivoca al crear, debe desactivar y crear de nuevo. Documentado como decisión consciente.
- **Cuatro DI containers separados** → Más boilerplate, pero mantiene la coherencia con `admin-users` y aísla módulos.
- **Seed con permisos nuevos en BD ya migradas** → El seed es idempotente (usa `upsert`), por lo que correrlo en un entorno con permisos ya existentes solo añadirá las claves faltantes sin tocar las existentes.

## Migration Plan

Este change incluye una migración: `add_settings_catalog_tables` que crea cuatro tablas (`payment_methods`, `folios`, `departments`, `branches`) con índice único en `code` por tabla.

Deploy:

1. `npm run build` — verifica tipos.
2. `npx prisma migrate deploy` — aplica la migración usando `DIRECT_URL`.
3. `npm run seed` — siembra los 8 nuevos permisos y los asigna a los roles base (idempotente vía `upsert`).
4. Deploy normal (Vercel / Docker). Los nuevos endpoints estarán disponibles automáticamente.

Rollback:

1. Revertir el commit/deploy de código.
2. Migración de rollback manual `DROP TABLE branches, departments, folios, payment_methods;` y eliminar los 8 permisos nuevos. Como ningún módulo existente referencia estas tablas, el rollback es seguro.

## Open Questions

- ¿Debe `DELETE` devolver `204 No Content` o `200` con la entidad ya desactivada? → Se opta por `204` para consistencia con `admin-users-crud`; el cliente debe refrescar el listado.
- ¿Validar formato de `email` en `Branch.email` con Zod `.email()` o aceptar cualquier string? → Se valida con `.email()`; mejor errores tempranos.
- ¿Permitir que `prefix` de `Folio` esté vacío? → Se permite (string opcional); algunos folios pueden ser solo numéricos. Pero si se provee, debe ser solo `[A-Z0-9-]{1,8}`.
