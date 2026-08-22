## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario del panel con permiso `roles:write` (típicamente `admin`) | Como usuario del panel con permiso `roles:write`, quiero crear un rol nuevo desde `/roles` (botón "Nuevo rol", hoy sin `onClick`) llenando nombre y descripción opcional, para poder definir roles custom más allá de los 3 sembrados (`admin`, `operator`, `viewer`) sin tocar la base de datos directamente | - Click en "Nuevo rol" abre un modal con campos `name` (obligatorio) y `description` (opcional).<br>- `name` se valida en cliente y servidor contra `^[a-z][a-z0-9_]{1,31}$` (mismo regex que `RoleName` value object ya existente en `src/modules/rbac/domain/`); error inline si no cumple.<br>- `POST /api/v1/admin/roles` con `name` duplicado → 409, mensaje inline en el campo `name`.<br>- Éxito → 201, el modal cierra, `RolesList` se refresca y el rol recién creado queda seleccionado en el master pane, con 0 permisos (listo para configurarse vía `RolePermissionsEditor` ya existente).<br>- Body vacío o sin `name` → 400 con error Zod. | - Endpoint gateado por `requirePermission(req, "roles:write")` — 401 si falta `x-user-id`, 403 si el usuario no tiene el permiso (patrón idéntico a `RbacController` existente).<br>- Validación Zod en el controller antes de invocar `CreateRoleUseCase` (dominio no valida formato HTTP).<br>- Unicidad de `name` verificada por el use case/repositorio antes de insertar (constraint único en DB, no sólo chequeo en app).<br>- `CreateRoleUseCase` no otorga ningún permiso automáticamente — el rol nace vacío; asignar permisos sigue siendo un paso explícito y auditable vía `GrantPermissionToRoleUseCase` ya existente. |

Nota: una sola historia — full-stack (endpoint + use case + UI) porque es una feature CRUD-create acotada que sigue un patrón ya probado 9 veces en el repo (mismo molde que Users/Payment Methods/Folios/etc.), sin variación entre "historia de backend" y "de frontend" que justifique separarlas. Sin preguntas pendientes — el regex de `name`, el patrón hexagonal y el guard `requirePermission` ya existen en el código (`RoleName` value object, `RbacController`), no hay ambigüedad de diseño que resolver.

## Why

`RolesPage.tsx:139` renderiza `<CreateButton label="Nuevo rol" />` sin `onClick` desde antes del change `standardize-new-buttons` (verificado: el `<Button icon="add">Crear Nuevo Rol</Button>` original tampoco tenía `onClick`) — el botón nunca hizo nada. La verificación de ese change lo detectó como deuda preexistente. La feature "crear rol" nunca se construyó: no existe `CreateRoleUseCase`, no hay `POST /api/v1/admin/roles`, y el frontend no tiene servicio ni modal para esto. El spec `rbac` ya documenta el requirement "Admin API for role and permission management" con endpoints de asignación de roles/permisos a usuarios, pero nunca incluyó crear el rol en sí — hoy los 3 roles base (`admin`, `operator`, `viewer`) sólo existen porque el seed los inserta directamente en la base de datos. Sin este endpoint, cualquier rol adicional (ej. "supervisor_almacen") requiere una migración manual o acceso directo a Prisma Studio, lo cual no es sostenible para administración de RBAC vía panel.

## What Changes

- **Backend** (`src/modules/rbac/`): nuevo `CreateRoleUseCase` (application/use-cases) que recibe `{ name, description? }`, valida unicidad vía repositorio y persiste. Nuevo método `createRole` en `RbacController`. Nuevo handler `POST` en `app/api/v1/admin/roles/route.ts` (hoy sólo exporta `GET`), gateado por `requirePermission(req, "roles:write")`, validado con Zod (`name` regex `^[a-z][a-z0-9_]{1,31}$`, `description` string opcional).
- **Repositorio**: `RoleRepository` (puerto ya existente para lecturas) gana método `create({ name, description })`; implementación Prisma inserta con `@unique` en `name` (409 en conflicto vía manejo del error de constraint), implementación InMemory para tests.
- **Frontend** (`app/(private)/roles/`): nuevo servicio `_logic/services/createRole.ts` (acepta `fetchImpl?`), nuevo hook de mutación (extiende o agrega a `useRoles`/nuevo `useRoleMutations`), nuevo modal `RoleCreateModal.tsx` en `_blocks/` (campos `name`+`description`, error inline en 409/400).
- `RolesPage.tsx:139` conecta `onClick` del `CreateButton` para abrir `RoleCreateModal`; al crear con éxito, refresca `roles` (`refreshRoles`) y selecciona el rol nuevo (`setSelectedRoleId`).
- Actualiza `openspec/specs/rbac/spec.md` con nuevo requirement "Create role" (escenarios: creación exitosa, nombre inválido → 400, nombre duplicado → 409, forbidden sin `roles:write`).

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `rbac`: nuevo requirement "Create role" bajo el capability existente — agrega `POST /api/v1/admin/roles` al requirement "Admin API for role and permission management" (que hoy sólo cubre asignación de roles/permisos a usuarios existentes, no la creación del rol en sí).

## Impact

- **Archivos nuevos**: `src/modules/rbac/application/use-cases/CreateRoleUseCase.ts`, `src/modules/rbac/domain/errors/RoleAlreadyExistsError.ts` (si no existe ya un error equivalente), `app/(private)/roles/_logic/services/createRole.ts`, `app/(private)/roles/_blocks/RoleCreateModal.tsx`.
- **Archivos modificados**: `src/modules/rbac/application/ports/RoleRepository.ts` (nuevo método `create`), `src/modules/rbac/infrastructure/repositories/PrismaRoleRepository.ts` y `InMemoryRoleRepository.ts`, `src/modules/rbac/infrastructure/http/RbacController.ts`, `app/api/v1/admin/roles/route.ts`, `app/(private)/roles/_blocks/RolesPage.tsx`, `openspec/specs/rbac/spec.md`.
- **Sin impacto en tablas existentes**: `roles.name` ya es `@unique` en el schema actual (verificar en `prisma/schema.prisma`) — no se requiere migración si la columna ya tiene la constraint.
- **Sin impacto en gating existente**: no se toca `AuthorizationService`, `requirePermission`, ni el seed de roles/permisos — sólo se agrega la capacidad de insertar roles adicionales por encima de los 3 sembrados.
- **Riesgo bajo**: cambio aditivo (nuevo endpoint + nuevo use case + nuevo modal), no modifica comportamiento de flujos existentes de asignación/revocación de roles o permisos.
</content>
