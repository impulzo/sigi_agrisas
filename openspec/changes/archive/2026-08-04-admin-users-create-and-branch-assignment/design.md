## Context

El backend de `admin-users` ya soporta `branchId` en `PATCH /api/v1/admin/users/:id` (validado y persistido, ver `openspec/specs/admin-users/spec.md` — Requirement "Update user" y "User-to-branch assignment"). Sin embargo no existe ningún endpoint de creación de usuario en el panel admin: el único alta disponible es `POST /api/v1/auth/register`, que es público, no acepta `branchId`/`roleIds`, y sirve al flujo de autoregistro, no al de administración. Del lado del frontend, `UserEditModal` sólo cubre edición y nunca expone `branchId` pese a que el backend ya lo acepta.

Esta brecha fue confirmada por auditoría QA + verificación en la base de datos de producción (Supabase `qzzjpyepggwautckqeex`): un único usuario (`admin@example.com`) con `branch_id = null`, sin ningún camino de UI para crear otro usuario o asignarle sucursal.

Historias de referencia (`proposal.md` → Historia de Usuario): #1 (crear usuario backend), #2 (selector de sucursal en el modal), #3 (botón "Crear usuario").

## Goals / Non-Goals

**Goals:**
- Endpoint `POST /api/v1/admin/users` que crea usuarios reutilizando el mismo patrón hexagonal que `UpdateUserUseCase`/`PrismaAdminUserRepository` (Historia #1).
- Selector de sucursal en el modal de usuario, en modo `create` y `edit` (Historia #2).
- Botón "Crear usuario" gateado por `users:write` que abre el modal en modo creación con campo password (Historia #3).

**Non-Goals:**
- No se toca `POST /api/v1/auth/register` (flujo de autoregistro público, sin `branchId`/`roleIds` — queda igual).
- No se añade un permiso RBAC nuevo: la creación reutiliza `users:write` (mismo permiso que editar/eliminar).
- No se implementa selector de sucursal en ningún otro módulo (settings, roles); el alcance es exclusivo del modal de usuario.
- No se migra el esquema Prisma: `User.branchId` ya existe desde una migración previa.
- No se resuelve la verificación en vivo de "Compras" (tratada por separado en el hilo principal, sin código).

## Decisions

### 1. `AdminUserRepository.create()` en el mismo puerto, no un repo nuevo
Se añade `create(data): Promise<AdminUser>` a `AdminUserRepository` (puerto ya usado por `findAll/findById/update/delete`) en vez de crear un repositorio de creación separado. Alternativa descartada: repo dedicado `CreateUserRepository` — se rechazó por fragmentar innecesariamente un puerto que ya modela el ciclo de vida completo de `AdminUser`.

### 2. `CreateAdminUserUseCase` reutiliza `BcryptPasswordHasher` vía el puerto `PasswordHasher` del módulo `auth`
Se importa el puerto `PasswordHasher` (`src/modules/auth/application/ports/PasswordHasher.ts`) y se inyecta la implementación concreta `BcryptPasswordHasher` ya existente, evitando duplicar lógica de hashing entre `auth` y `users`. El use case NO depende de `RegisterUseCase` — son flujos distintos (autoregistro vs. alta administrativa) que comparten sólo el hasher.

### 3. Alta de usuario + roles en una única transacción Prisma
`PrismaAdminUserRepository.create()` ejecuta `prisma.$transaction([user.create, userRole.createMany])` cuando `roleIds` está presente. Alternativa descartada: crear el usuario y asignar roles en pasos HTTP separados (como hace el modal en `edit` con `POST /roles`) — se rechazó para creación porque dejar un usuario sin ningún rol tras un fallo parcial es un estado inconsistente peor que en edición (donde el usuario ya existía y tenía roles previos).

### 4. Validación de `branchId` reutiliza `BranchNotFoundForUserError` existente
`CreateAdminUserUseCase` reutiliza el mismo error de dominio y el mismo repo de branches que ya inyecta `UpdateUserUseCase`, manteniendo un solo punto de verdad para "¿esta sucursal existe y está activa?".

### 5. `UserEditModal` gana una prop `mode` en vez de duplicarse en `UserCreateModal`
Se sigue el patrón ya establecido en catálogos (CLAUDE.md: "un único `<Módulo>EditModal` con prop `mode: 'create' | 'edit'`"). Alternativa descartada: componente separado `UserCreateModal` — se rechazó por divergencia de mantenimiento (dos modales que comparten 90% de los campos: name/email/avatarUrl/branchId/roles).

### 6. `useBranchesOptions` como hook global nuevo, clon de `useHeadquarters`
Ambos hooks consultan el mismo endpoint (`GET /api/v1/admin/branches?pageSize=100`) pero con propósitos distintos: `useHeadquarters` filtra por `isHeadquarters===true` (una sola sucursal matriz), `useBranchesOptions` devuelve todas las activas para un `<select>`. Se decidió no generalizar ambos detrás de un hook paramétrico único para no acoplar dos consumidores con forma de retorno distinta (`Branch | null` vs. `{id,name}[]`) — mantiene cada hook simple y testeable por separado.

## Risks / Trade-offs

- **[Riesgo] Transacción de creación falla a mitad (usuario creado, roles no asignados)** → Mitigación: uso de `prisma.$transaction` (todo o nada); si `userRole.createMany` falla, Prisma revierte el `user.create` completo.
- **[Riesgo] Email duplicado detectado tarde (constraint DB) en vez de validación previa** → Mitigación: mismo patrón que `update()` ya usa — se captura el código `P2002` de Prisma y se mapea a `EmailAlreadyInUseError`, evitando una consulta `findByEmail` extra antes del insert (race-safe).
- **[Trade-off] `branchId` en `create` no valida "activa" en tiempo real desde la UI** → El selector sólo lista sucursales activas al momento de cargar el modal; si se desactiva la sucursal entre que se abrió el modal y se envía el submit, el backend igual rechaza con 400 (carrera cubierta por el escenario "branchId references a non-existent branch" del spec). Aceptable: ventana de carrera muy pequeña y ya hay manejo de error inline.
- **[Riesgo] Exponer un botón de creación sin backend listo (secuencia de trabajo)** → Mitigación: Change A (backend) se implementa y se prueba antes que Change B (frontend); el frontend nunca se despliega apuntando a un endpoint inexistente porque ambos van en el mismo PR/commit set.

## Migration Plan

No aplica migración de datos ni de esquema (columna `branch_id` ya existe). Pasos de entrega:
1. Backend: puerto + use case + repo + controller + route + DI (Change A).
2. Tests unitarios del use case (patrón stub in-memory, igual que `UpdateUserUseCase.test.ts`).
3. Frontend: hook `useBranchesOptions`, modal dual, servicios/schemas/tipos, botón en toolbar (Change B).
4. Tests UI extendiendo `UserEditModal.test.tsx` y `useUserMutations.test.ts`.
5. `npm test` + `npm run build` completos.
6. Verificación manual (Playwright) contra `localhost:3000`: crear usuario end-to-end, asignar sucursal end-to-end, confirmar en DB.

Rollback: revertir el commit/PR; no hay migración de esquema que revertir ni datos que limpiar (los usuarios creados durante pruebas manuales se eliminan vía el propio `DELETE /admin/users/:id` ya existente).

## Open Questions

Ninguna pendiente — los patrones de reutilización (`UpdateUserUseCase`, `PrismaAdminUserRepository`, `useHeadquarters`, permiso `users:write`) ya fijan las decisiones necesarias, según lo confirmado en `user-stories` durante la fase de proposal.
