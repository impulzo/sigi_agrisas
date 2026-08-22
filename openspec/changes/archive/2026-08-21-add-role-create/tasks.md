## 1. Dominio y errores

- [x] 1.1 Crear `src/modules/rbac/domain/errors/RoleAlreadyExistsError.ts` (mismo patrón que `RoleNotFoundError`/`RoleAlreadyAssignedError`), mensaje "Ya existe un rol con este nombre".

## 2. Application — CreateRoleUseCase

- [x] 2.1 Crear `src/modules/rbac/application/use-cases/CreateRoleUseCase.ts`: `execute({ name, description }: { name: string; description?: string })`. Valida `RoleName.create(name)` (lanza `InvalidRoleNameError` si formato inválido), llama `roleRepo.findByName(name)` → si existe, lanza `RoleAlreadyExistsError`; si no, construye `Role.create(uuid(), { name, description, createdAt: new Date(), updatedAt: new Date() })` y llama `roleRepo.save(role)`. Captura `P2002` de Prisma en el `catch` (condición de carrera) y relanza `RoleAlreadyExistsError`.
- [x] 2.2 Test unitario `tests/unit/modules/rbac/application/use-cases/CreateRoleUseCase.test.ts` usando `InMemoryRoleRepository` (ya existe en `tests/unit/modules/rbac/_fixtures/`): casos éxito, nombre inválido → `InvalidRoleNameError`, nombre duplicado → `RoleAlreadyExistsError`.

## 3. HTTP — Controller y endpoint

- [x] 3.1 En `src/modules/rbac/infrastructure/http/RbacController.ts`: agregar `createRoleSchema = z.object({ name: z.string().regex(/^[a-z][a-z0-9_]{1,31}$/), description: z.string().optional() })`, método `createRole(req: NextRequest)` (mismo molde que `grantPermissionToRole`: parse Zod → 400 si falla → `try { await this.createRoleUC.execute(parsed.data); return 201 } catch handleError`), y constructor recibe `createRoleUC: CreateRoleUseCase` como nuevo parámetro.
- [x] 3.2 En `handleError`, agregar rama `if (err instanceof RoleAlreadyExistsError) return NextResponse.json({ error: err.message }, { status: 409 })`.
- [x] 3.3 En `app/api/v1/admin/roles/route.ts`, agregar `export async function POST(req: NextRequest)`: `requirePermission(req, "roles:write")` → si guard, retornarlo; sino `rbacController.createRole(req)`.
- [x] 3.4 En `src/modules/rbac/infrastructure/di/container.ts`: instanciar `const createRole = new CreateRoleUseCase(roleRepo)` y pasarlo al constructor de `RbacController` (agregar el parámetro en la posición que corresponda).

## 4. Frontend — servicio y hook

- [x] 4.1 Agregar `RoleAlreadyExistsError` a `app/(private)/roles/_logic/types/domain.ts` (mismo patrón que `PermissionAlreadyGrantedError`/`RoleNotFoundError`), mensaje "Ya existe un rol con este nombre".
- [x] 4.2 Crear `app/(private)/roles/_logic/services/createRole.ts`: `createRole({ name, description }: { name: string; description?: string }, fetchImpl = authFetch): Promise<Role>` — `POST /api/v1/admin/roles`, mapea 409 → `RoleAlreadyExistsError`, 400 → `ValidationError`, no-ok → `NetworkError` (mismo molde que `grantPermissionToRole.ts`).
- [x] 4.3 Crear `app/(private)/roles/_logic/hooks/useRoleMutations.ts`: expone `{ createRole, isSaving, error }` — llama al servicio 4.2, maneja `isSaving`/`error` (mismo patrón que otros hooks de mutación del proyecto, ej. `useInventoryMutations`).

## 5. Frontend — modal y wiring en RolesPage

- [x] 5.1 Crear `app/(private)/roles/_blocks/RoleCreateModal.tsx`: campos `name` (input, normaliza a lowercase antes de submit) + `description` (textarea opcional). Error inline bajo `name` si `RoleAlreadyExistsError`/`ValidationError` (regex). Props: `open`, `isSaving`, `error`, `onSubmit({ name, description })`, `onClose`.
- [x] 5.2 En `app/(private)/roles/_blocks/RolesPage.tsx`: importar `RoleCreateModal` y `useRoleMutations`; agregar estado `isCreateModalOpen`; conectar `onClick` de `<CreateButton label="Nuevo rol" onClick={() => setIsCreateModalOpen(true)} />` (línea 139); al submit exitoso: `refreshRoles()`, `setSelectedRoleId(nuevoRol.id)`, cerrar modal.

## 6. Spec y verificación

- [x] 6.1 Confirmar que `openspec/changes/add-role-create/specs/rbac/spec.md` (ya creado en la fase de propose) queda sincronizado con la implementación final antes de archivar.
- [x] 6.2 `npx jest tests/unit/modules/rbac` — confirmar que el test nuevo (2.2) y los existentes siguen en verde.
- [x] 6.3 `npx jest tests/unit/ui/roles` (o el path equivalente de tests UI de roles) — agregar/confirmar test para `RoleCreateModal`/`useRoleMutations` si el proyecto ya tiene convención de testear estos hooks (ver `tests/unit/ui/(private)/...` de otros módulos).
- [x] 6.4 Recorrido manual en dev server: `/roles` → click "Nuevo rol" → crear rol con nombre válido → aparece seleccionado en el master pane con 0 permisos → intentar crear un rol con nombre duplicado → error inline 409 → intentar con nombre inválido (mayúsculas/espacios) → error de validación.
- [x] 6.5 `npm run build` (o `npx tsc --noEmit` si el entorno de build tiene la limitación de versión de Node ya documentada en el verify de `standardize-new-buttons`) para confirmar tipado correcto.
</content>
