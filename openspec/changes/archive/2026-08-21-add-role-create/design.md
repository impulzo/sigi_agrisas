## Context

`RolesPage.tsx:139` renderiza `<CreateButton label="Nuevo rol" />` sin `onClick` — nunca existió una forma de crear roles vía panel; los 3 roles base (`admin`, `operator`, `viewer`) sólo existen por el seed idempotente (`prisma/seed.ts`). El módulo `src/modules/rbac/` ya tiene el resto del ciclo de vida de un rol (listar, asignar/revocar a usuario, otorgar/revocar permisos) pero nunca el alta del rol en sí. El value object `RoleName` (regex `^[a-z][a-z0-9_]{1,31}$`) y la columna `roles.name @unique` ya existen — el gap es puramente de "falta el endpoint/use case/UI", no de modelo de datos.

Este diseño responde a la Historia 1 de `proposal.md`: full-stack (endpoint + use case + modal) siguiendo el mismo molde hexagonal que el resto de `src/modules/rbac/` y el mismo patrón de modal create/edit descrito en CLAUDE.md § "UI por feature — Convenciones compartidas".

## Goals / Non-Goals

**Goals:**
- `POST /api/v1/admin/roles` gateado por `roles:write`, valida `name` (regex `RoleName`) y unicidad, crea el rol con 0 permisos.
- `CreateRoleUseCase` en `application/use-cases/`, consumiendo `RoleRepository` (puerto ya existente, se le agrega `create`).
- UI: `RoleCreateModal` conectado al `onClick` de `CreateButton` en `RolesPage.tsx`; éxito refresca la lista y selecciona el rol nuevo.
- Nuevo requirement en `openspec/specs/rbac/spec.md` cubriendo los 4 escenarios de la Historia 1 (éxito, nombre inválido, duplicado, forbidden).

**Non-Goals:**
- No se toca `AuthorizationService`, `requirePermission`, ni el seed — el rol nuevo no obtiene permisos automáticamente (Criterio de Seguridad de la Historia 1: "no otorga ningún permiso automáticamente").
- No se agrega edición (`PATCH`) ni borrado de roles — fuera de alcance de esta historia, sólo creación. Renombrar/eliminar un rol es un cambio separado si se pide.
- No se cambia `RolesList`/`RoleDetailHeader` más allá de reflejar el rol recién creado tras el refresh — no se rediseña el master/detail pane.

## Decisions

**1. `RoleRepository.create(props)` en vez de reusar `save(role)` (que hace upsert).**
El puerto actual expone `save(role: Role): Promise<void>` implementado como `prisma.role.upsert`. Reusarlo para creación funcionaría (genera un id nuevo con `Role.create(uuid(), props)` y llama `save`), pero el use case necesita distinguir "ya existe otro rol con ese `name`" ANTES de intentar persistir, para devolver 409 con un mensaje claro en vez de depender de que el `upsert` por `id` (no por `name`) ni siquiera detecte el conflicto — un `upsert` con `where: { id }` inserta igual si el `id` es nuevo, y el conflicto real está en la constraint única de `name`, que Prisma lanzaría como `P2002` genérico sin contexto de dominio. Por eso `CreateRoleUseCase` hace `findByName` primero (mismo patrón que `AssignRoleToUserUseCase` verifica duplicados antes de insertar) y sólo entonces llama a `save` — no se agrega un método `create` nuevo al puerto, se reusa `save` + el chequeo explícito de duplicado en el use case. Se mantiene `RoleAlreadyExistsError` como bloque `catch` adicional del `P2002` de Prisma como defensa en profundidad ante condición de carrera entre el `findByName` y el `save`.

**2. Nuevo error `RoleAlreadyExistsError` en `domain/errors/`, no reusar `RoleAlreadyAssignedError`.**
`RoleAlreadyAssignedError` significa "este usuario ya tiene este rol asignado" — semántica distinta a "ya existe un rol con este nombre". Mismo patrón de nombres de error ya usado en el módulo (`RoleNotFoundError`, `PermissionNotFoundError`, etc., cada semántica con su propia clase).

**3. `CreateRoleUseCase.execute({ name, description })` valida `RoleName.create(name)` (lanza `InvalidRoleNameError` si el formato es inválido) antes de tocar el repositorio.**
Reusa el value object existente en vez de duplicar el regex — mismo objeto que ya usa `assignRoleSchema`/`RbacController`. El controller YA hace validación Zod con el mismo regex antes de esto (defensa en dos capas, igual que el resto del módulo: Zod en HTTP, value object en dominio).

**4. `RbacController.createRole` sigue el mismo molde que `grantPermissionToRole`/`assignRoleToUser`**: Zod schema `createRoleSchema = z.object({ name: z.string().regex(ROLE_NAME_REGEX), description: z.string().optional() })`, `try/catch` delegando a `handleError` (que gana un nuevo `if (err instanceof RoleAlreadyExistsError) → 409`).

**5. `POST /api/v1/admin/roles/route.ts` agrega el método `POST` junto al `GET` existente, gateado por `requirePermission(req, "roles:write")`** — mismo archivo, no una ruta nueva (consistente con cómo otros catálogos exponen `GET`+`POST` en el mismo `route.ts`).

**6. Frontend: nuevo hook, no extender `useRoles`.**
`useRoles` (lectura + `refresh`) se mantiene como está; se agrega un hook de mutación separado (`useCreateRole` o método adicional en un nuevo `useRoleMutations`) que llama al servicio y devuelve `{ createRole, isSaving, error }` — mismo patrón que `useInventoryMutations`/`useUserMutations` (mutaciones separadas de la lectura). `RolesPage.tsx` orquesta: abre modal → `useRoleMutations().createRole(...)` → en éxito, `refreshRoles()` + `setSelectedRoleId(nuevoRol.id)` + cierra modal.

**7. `RoleCreateModal` sigue el patrón "modal create/edit con diff" de CLAUDE.md, en su variante `mode="create"` únicamente** (no hay modo `edit` en esta historia — Non-Goal). Campos: `name` (input, lowercase forzado en `onChange` o normalizado antes de submit — consistente con cómo otros catálogos uppercasean `code`; aquí es lowercase porque el regex de `RoleName` exige minúsculas) + `description` (textarea opcional). Error 409 → mensaje inline bajo el campo `name` ("Ya existe un rol con este nombre").

## Risks / Trade-offs

- **[Riesgo] Condición de carrera entre `findByName` y `save`** (dos requests concurrentes con el mismo `name`) — el segundo `save` podría violar la constraint única de Prisma y lanzar `P2002` sin que el use case lo traduzca. Mitigación: `CreateRoleUseCase` captura el código `P2002` de Prisma (vía el repositorio, que ya conoce el shape del error) y lo relanza como `RoleAlreadyExistsError`, igual que el 409 del chequeo previo — dos caminos al mismo resultado.
- **[Riesgo] `description` como `string` vacío vs `undefined`**: el schema Zod usa `.optional()`, no `.nullable()` — un `description: ""` se persiste tal cual (no se normaliza a `undefined`), consistente con cómo el resto del dominio maneja campos de texto opcionales (ningún catálogo normaliza string vacío a null salvo que el requirement lo pida explícitamente).
- **[Trade-off] No se valida en UI ni backend que el rol nuevo no colisione con nombres reservados futuros** (ej. si el proyecto algún día reserva prefijos) — no hay tal regla hoy, fuera de alcance inventar una.

## Migration Plan

Cambio aditivo de una sola pasada, sin migración de BD (la constraint `@unique` en `roles.name` ya existe en el schema actual).

1. `RoleAlreadyExistsError` (domain/errors) + `CreateRoleUseCase` (application/use-cases), con `InMemoryRoleRepository` de prueba si no existe ya uno para este puerto (verificar `tests/unit/modules/rbac/` antes de crear uno nuevo).
2. `RbacController.createRole` + wiring en `di/container.ts`.
3. `POST` en `app/api/v1/admin/roles/route.ts`.
4. `createRole.ts` (servicio frontend) + hook de mutación.
5. `RoleCreateModal.tsx` + conectar `onClick` en `RolesPage.tsx:139`.
6. Delta spec en `openspec/specs/rbac/spec.md`.
7. `npm test` (unit + integration del módulo rbac) + verificación manual en `/roles`.

Rollback: revert de commit único — no hay dato migrado ni contrato de API removido.

## Open Questions

Ninguna — el patrón hexagonal, el value object `RoleName`, y la constraint única de `name` ya existen en el repo; no hay decisión de diseño pendiente de confirmar con el usuario.
</content>
