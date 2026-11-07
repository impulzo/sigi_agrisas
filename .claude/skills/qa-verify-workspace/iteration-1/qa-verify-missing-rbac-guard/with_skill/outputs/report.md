## QA Verify — working tree sin commitear (diff pegado por el usuario, NO aplicado al repo)

Archivo analizado: `app/api/v1/admin/vehicles/[id]/documents/route.ts` (nuevo, 33 líneas), como texto contra el estado actual del repo en `develop`.

### Alcance detectado
- Áreas: Arquitectura Hexagonal (backend), RBAC / branch scoping, Prisma/Supabase, Proceso OpenSpec.
- Specs consultadas: `admin-vehicles` (activa, sin change en `openspec/changes/` — no hay carpeta de change para este endpoint).
- Patrón análogo usado como referencia: subida de foto de gastos (`app/api/v1/admin/expenses/[id]/photo/route.ts` → `ExpensesController.uploadPhoto` → `UploadExpensePhotoUseCase` → `ExpensePhotoStoragePort` → `SupabaseExpensePhotoStorage`), y el módulo hermano ya existente `src/modules/vehicles/` con su propio `vehiclesController`.

### Checklist

#### Arquitectura Hexagonal (backend)
- ❌ "Los route handlers de `app/api/v1/` no contienen lógica; delegan al controller" — el diff entero (`route.ts:9-33`) ejecuta Prisma, lee `FormData`, arma el `path` del storage y llama a Supabase Storage directo en el handler. No existe controller, use case, port ni repositorio para este flujo; compárese con `app/api/v1/admin/vehicles/route.ts:1-11` y `app/api/v1/admin/vehicles/[id]/route.ts:1-13`, que sólo validan permiso y delegan a `vehiclesController`.
- ❌ "El dominio no importa nada de infraestructura ni de Next.js" / "los use cases reciben ports, nunca implementaciones concretas" — no aplica porque no hay capa de dominio ni use case: toda la lógica vive en infraestructura HTTP cruda. El módulo `src/modules/vehicles/` ya tiene `application/ports`, `application/use-cases`, `infrastructure/repositories`, `infrastructure/http`, `infrastructure/di` — el nuevo endpoint no usa ninguno.
- ❌ Falta abstracción de storage (`*StoragePort` + impl Prisma/Supabase + impl InMemory para tests), tal como exige el patrón ya establecido: `src/modules/expenses/application/ports/ExpensePhotoStoragePort.ts` + `SupabaseExpensePhotoStorage.ts` + `InMemoryExpensePhotoStorage.ts`. El diff hace `import("@/shared/infrastructure/supabase/storageClient")` inline en el handler — sin port, sin inyección de dependencias, no testeable con InMemory.
- ❌ Import roto: `@/shared/infrastructure/supabase/storageClient` no existe en el repo (`find` sobre todo el árbol, excluyendo `node_modules`, no encontró ningún archivo `storageClient*`). Cada módulo con Supabase Storage instancia su propio cliente (ver `SupabaseExpensePhotoStorage.ts:1-16`, lee `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` directo). El build fallaría por módulo inexistente.
- ❌ `prisma.vehicleDocument` no existe en `prisma/schema.prisma` — no hay modelo `VehicleDocument`, ni migración asociada. `grep -ni "vehicledocument" prisma/schema.prisma` no arrojó resultados. El código no compila: `PrismaClient` no tiene esa propiedad. Esto es bloqueante por sí solo, antes de cualquier otra consideración.

#### RBAC / branch scoping
- ❌ "todo endpoint nuevo bajo `app/api/v1/admin/**` llama `requirePermission` con el permiso correcto" — el diff NO llama `requirePermission` en ningún punto (`route.ts:7-33`). Comparar con el patrón idéntico y ya existente para `vehicles:write` en `app/api/v1/admin/vehicles/route.ts:10-12` y `app/api/v1/admin/vehicles/[id]/route.ts:11-13`, y con el de fotos de gastos en `app/api/v1/admin/expenses/[id]/photo/route.ts:5-7` (`requirePermission(req, "expenses:write")` antes de delegar). El permiso `vehicles:write` ya existe sembrado (`prisma/seed.ts`, confirmado por grep) — el endpoint nuevo simplemente omite el guard. Cualquier usuario con sesión válida (sin verificar ni siquiera `x-user-id`) podría subir documentos a cualquier vehículo.
- ⚠️ Branch scoping: `Vehicle` no tiene `branchId` en el schema (`prisma/schema.prisma:242-260` — catálogo global, no por sucursal), así que `enforceBranchScope`/`resolveScopedBranchId` probablemente no aplican a este recurso. No se encontró contraevidencia que lo contradiga, pero lo marco ⚠️ porque no hay spec que confirme explícitamente que "documents" hereda ese mismo carácter global.

#### Validación de entrada
- ❌ `params.id` nunca se valida como UUID antes de usarse en `prisma.vehicle.findUnique` — patrón esperado: `uuidSchema.safeParse(id)` antes del use case, como en `ExpensesController.getById` (`ExpensesController.ts:121-124`) y `uploadPhoto` (`ExpensesController.ts:197-199`). Un `:id` malformado llega directo a Prisma.
- ❌ Sin validación de tipo MIME ni tamaño máximo del archivo — el patrón de gastos define `ALLOWED_MIMES` (jpg/png/webp) y `MAX_BYTES = 2MB` con errores tipados `InvalidExpensePhotoFormatError`/`ExpensePhotoTooLargeError` → 400/413 (`UploadExpensePhotoUseCase.ts:5-13,39-40`). El diff acepta cualquier `file.type` y cualquier tamaño, subiéndolo tal cual a Storage.
- ❌ `file.name` se usa sin sanitizar para construir la key del objeto (`path = vehicle-documents/${params.id}/${file.name}`) — riesgo de inyección de caracteres en el object key (`/`, `..`, espacios, unicode) y de colisión/overwrite entre documentos con el mismo nombre de archivo. El patrón de referencia genera un nombre propio con `randomUUID()` + extensión validada (`SupabaseExpensePhotoStorage.ts:19`), nunca reutiliza el nombre de archivo del cliente.
- ⚠️ `label` se toma de `formData.get("label")` sin Zod ni límite de longitud — no hay spec de "vehicle documents" que fije el contrato, así que no puedo afirmar el máximo esperado; señalo como gap de cobertura, no como bloqueante aislado (el patrón general del proyecto sí exige Zod en el controller antes del use case).

#### OpenSpec / proceso
- ⚠️ No existe ninguna carpeta en `openspec/changes/` para esta feature (vehicle documents), y `openspec/specs/admin-vehicles/spec.md` no menciona documentos adjuntos en ningún Requirement — sólo cubre list/get/create/update/soft-delete de `Vehicle` (líneas 6-128). Esto es un endpoint completamente fuera de lo especificado: según CLAUDE.md del repo, toda tarea no trivial requiere `opsx:propose` con aprobación explícita antes de implementar. No hay evidencia de que ese proposal exista. Marco como refusal de proceso, no sólo como gap.

### Verificación automatizada
- Build (`npm run build`): no ejecutado — el diff no está aplicado al repo (instrucción explícita de no aplicarlo), y de aplicarse fallaría de inmediato por `prisma.vehicleDocument` inexistente y el import roto de `storageClient`, así que un build real no aportaría información nueva más allá de lo ya detectado por lectura de código.
- Tests: no aplica — el diff no trae tests, y no hay use case/port que testear con `InMemory*`.
- Lint: no ejecutado (mismo motivo que build).
- Guardarraíl diseño: n/a (no toca `app/(private)` ni UI).

### Resumen
- Cumplidos: 0/9 criterios evaluables como ✅.
- Bloqueantes (❌):
  1. `prisma.vehicleDocument` no existe — no hay modelo `VehicleDocument` ni migración (bloqueante de compilación).
  2. Import a `@/shared/infrastructure/supabase/storageClient`, archivo inexistente en el repo (bloqueante de compilación).
  3. Sin `requirePermission("vehicles:write", ...)` — endpoint admin sin guard RBAC, pese a que el permiso ya existe sembrado y el patrón hermano (`vehicles/route.ts`, `vehicles/[id]/route.ts`) sí lo aplica.
  4. Lógica de negocio completa (Prisma + Storage) embebida en el route handler — viola capas hexagonales; no hay controller/use case/port para este flujo, rompiendo la paridad con el módulo `src/modules/vehicles/` ya existente.
  5. Sin validación de `:id` como UUID, sin whitelist de MIME/tamaño máximo, y `file.name` sin sanitizar usado directo como object key de Storage (riesgo de path/key injection y colisión de archivos).
  6. No hay `openspec/changes/` para esta feature ni cobertura en `openspec/specs/admin-vehicles/spec.md` — se está implementando fuera del protocolo SDD obligatorio del proyecto sin proposal aprobado.
- Gaps de cobertura (⚠️): branch scoping de "documents" (heredado del carácter global de `Vehicle`, no confirmado por spec); validación/longitud de `label` (sin spec que la fije).

### Veredicto
No apto para abrir PR contra `develop` en su estado actual. Antes de continuar: (a) crear el modelo `VehicleDocument` + migración, (b) mover la lógica a `src/modules/vehicles/` (controller + use case + `VehicleDocumentStoragePort` siguiendo el patrón de `expenses`), (c) agregar el guard `requirePermission(req, "vehicles:write")`, (d) validar `id` (UUID), MIME, tamaño y sanear el nombre de archivo, y (e) correr `opsx:propose` para esta feature antes de implementar, dado que no hay spec ni change que la cubra.
