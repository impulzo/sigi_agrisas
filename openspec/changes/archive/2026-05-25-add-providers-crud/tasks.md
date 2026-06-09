## 1. Migración Prisma y modelo

- [x] 1.1 Añadir modelo `Provider` a `prisma/schema.prisma` con campos: `id @id @default(uuid())`, `code @unique @db.VarChar(32)`, `name @db.VarChar(120)`, `rfc @unique @db.VarChar(13)`, `legalName? @db.VarChar(200) @map("legal_name")`, `taxRegime? @db.VarChar(3) @map("tax_regime")`, `cfdiUse? @db.VarChar(3) @map("cfdi_use")`, `taxZipCode? @db.VarChar(5) @map("tax_zip_code")`, `email? @db.VarChar(120)`, `phone? @db.VarChar(30)`, `address? @db.VarChar(300)`, `contactName? @db.VarChar(120) @map("contact_name")`, `notes? @db.Text`, `isActive @default(true) @map("is_active")`, `createdAt`, `updatedAt`; índices en `code`, `rfc`, `name`; `@@map("providers")`
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add_providers_table` para generar y aplicar la migración
- [x] 1.3 Verificar `npx prisma generate` y que el tipo `Provider` existe en `@prisma/client`

## 2. Seed RBAC — 2 permisos nuevos

- [x] 2.1 Actualizar `prisma/seed.ts`: añadir al array `PERMISSIONS` las claves `providers:read` y `providers:write` con descripciones en español ("Leer proveedores" / "Crear/editar proveedores")
- [x] 2.2 Actualizar el rol `admin` para incluir las 2 nuevas claves en `permissions`
- [x] 2.3 Actualizar el rol `operator` para incluir `providers:read`
- [x] 2.4 Actualizar el rol `viewer` para incluir `providers:read`
- [x] 2.5 Ejecutar `npm run seed` y verificar idempotencia (correr 2 veces sin errores)

## 3. Dominio (`src/modules/providers/domain/`)

- [x] 3.1 Crear `domain/entities/Provider.ts` con todos los campos (obligatorios + opcionales + sistema); factory `Provider.create()` que recibe los campos crudos y devuelve la instancia
- [x] 3.2 Crear `domain/errors/ProviderNotFoundError.ts`
- [x] 3.3 Crear `domain/errors/ProviderCodeAlreadyInUseError.ts`
- [x] 3.4 Crear `domain/errors/ProviderRfcAlreadyInUseError.ts`
- [x] 3.5 (Opcional) Crear `domain/value-objects/Rfc.ts` — omitido; validación inline en controller

## 4. Aplicación (`src/modules/providers/application/`)

- [x] 4.1 Crear puerto `application/ports/ProviderRepository.ts` con métodos:
  - `findAll({ page, pageSize, includeInactive, search? }): Promise<{ items: Provider[], total: number }>`
  - `findById(id: string): Promise<Provider | null>`
  - `create(data: CreateProviderData): Promise<Provider>`
  - `update(id: string, data: UpdateProviderData): Promise<Provider>`
  - `softDelete(id: string): Promise<void>`
- [x] 4.2 Crear DTOs en `application/dto/`:
  - `ProviderDto.ts` (forma de respuesta — todos los campos + timestamps)
  - `ListProvidersRequest.ts` (`page`, `pageSize`, `includeInactive`, `search?`)
  - `ListProvidersResponse.ts` (`items`, `total`, `page`, `pageSize`)
  - `CreateProviderRequest.ts` (todos los campos editables; `code`, `name`, `rfc` obligatorios)
  - `UpdateProviderRequest.ts` (todos opcionales excepto que al menos uno debe estar presente)
- [x] 4.3 Crear `application/mappers/toProviderDto.ts` (mapea `Provider` entity → `ProviderDto`)
- [x] 4.4 Crear `application/use-cases/ListProvidersUseCase.ts` (valida límites de paginación, delega al repo)
- [x] 4.5 Crear `application/use-cases/GetProviderUseCase.ts` (lanza `ProviderNotFoundError` si null)
- [x] 4.6 Crear `application/use-cases/CreateProviderUseCase.ts` (delega al repo; propaga `ProviderCodeAlreadyInUseError` y `ProviderRfcAlreadyInUseError`)
- [x] 4.7 Crear `application/use-cases/UpdateProviderUseCase.ts` (verifica al menos un campo válido; ignora `code` si está presente en el body; propaga `ProviderNotFoundError` y `ProviderRfcAlreadyInUseError`)
- [x] 4.8 Crear `application/use-cases/SoftDeleteProviderUseCase.ts` (llama `repo.softDelete`; propaga `ProviderNotFoundError`)

## 5. Infraestructura (`src/modules/providers/infrastructure/`)

- [x] 5.1 Crear `infrastructure/repositories/PrismaProviderRepository.ts` que implementa el puerto:
  - `findAll` aplica `WHERE isActive = true` por defecto; `search` aplica `OR { name, legalName, rfc } ILIKE '%search%'`; orden por `createdAt DESC`
  - `create` mapea `P2002 (target=code)` → `ProviderCodeAlreadyInUseError`, `P2002 (target=rfc)` → `ProviderRfcAlreadyInUseError`
  - `update` mapea `P2025` → `ProviderNotFoundError`, `P2002 (target=rfc)` → `ProviderRfcAlreadyInUseError`
  - `softDelete` ejecuta `prisma.provider.update({ where: { id }, data: { isActive: false } })`; mapea `P2025` → `ProviderNotFoundError`
- [x] 5.2 Crear `infrastructure/repositories/InMemoryProviderRepository.ts` para tests (manejo de unicidad de `code` y `rfc` in-memory)
- [x] 5.3 Crear `infrastructure/http/ProviderController.ts` con métodos `list`, `getById`, `create`, `update`, `softDelete`; schemas Zod inline:
  - `listQuerySchema`: `page`, `pageSize`, `includeInactive`, `search` (min 2 si presente)
  - `createBodySchema`: `code`, `name`, `rfc` requeridos; resto opcionales con validaciones (RFC regex, taxRegime `\d{3}`, cfdiUse `[A-Z]\d{2}`, taxZipCode `\d{5}`, email Zod `.email()`)
  - `updateBodySchema`: todos opcionales con `.refine` que exige al menos un campo distinto de `code`
  - `uuidParamSchema`: `id` UUID
  - Normalización: `code`, `rfc`, `taxRegime`, `cfdiUse` se convierten a `.trim().toUpperCase()` antes de pasar al use case
  - Mapeo de errores: `ProviderNotFoundError` → 404, `ProviderCodeAlreadyInUseError` → 409, `ProviderRfcAlreadyInUseError` → 409
- [x] 5.4 Crear `infrastructure/di/container.ts` que instancia repo Prisma + 5 use cases + controller; exporta `providersController`

## 6. Route Handlers (`app/api/v1/admin/providers/`)

- [x] 6.1 Crear `app/api/v1/admin/providers/route.ts` con `GET` (perm `providers:read`) y `POST` (perm `providers:write`), delegando a `providersController` vía DI
- [x] 6.2 Crear `app/api/v1/admin/providers/[id]/route.ts` con `GET` (read), `PATCH` (write), `DELETE` (write)

## 7. Tests unitarios — use cases

- [x] 7.1 `tests/unit/modules/providers/application/use-cases/ListProvidersUseCase.test.ts` — paginación, filtro `includeInactive`, validación `pageSize`, búsqueda case-insensitive en `name`/`legalName`/`rfc`
- [x] 7.2 `tests/unit/modules/providers/application/use-cases/GetProviderUseCase.test.ts` — found, not found
- [x] 7.3 `tests/unit/modules/providers/application/use-cases/CreateProviderUseCase.test.ts` — éxito (body mínimo: code+name+rfc), éxito con todos los campos fiscales, `ProviderCodeAlreadyInUseError`, `ProviderRfcAlreadyInUseError`
- [x] 7.4 `tests/unit/modules/providers/application/use-cases/UpdateProviderUseCase.test.ts` — éxito (actualiza un campo), ignora `code` en body, empty body rechazado, `ProviderNotFoundError`, `ProviderRfcAlreadyInUseError` (RFC duplicado), clear opcional con `null` (ej. `legalName: null`)
- [x] 7.5 `tests/unit/modules/providers/application/use-cases/SoftDeleteProviderUseCase.test.ts` — éxito (activa → inactiva), idempotente (inactiva → inactiva), `ProviderNotFoundError`

## 8. Tests unitarios — controller (validación Zod)

- [x] 8.1 `tests/unit/modules/providers/infrastructure/http/ProviderController.test.ts` — RFC inválido rechazado (HTTP 400), RFC normalizado a uppercase, code inválido rechazado, taxRegime no-3-dígitos rechazado, cfdiUse formato incorrecto rechazado, email inválido rechazado, search<2 chars rechazado, update con body vacío rechazado, search con solo whitespace ignorado

## 9. Tests de integración

- [x] 9.1 `tests/integration/modules/providers/providers-crud.test.ts` — flujo end-to-end con BD real: create (mínimo) → get → list → update (añadir legalName + taxRegime) → list `?search=` por RFC → list `?includeInactive=false` (visible) → softDelete → list (no aparece) → list `?includeInactive=true` (aparece) → reactivar vía `PATCH { isActive: true }` → cleanup final

## 10. Verificación de RBAC y permisos

- [x] 10.1 Test manual con `curl` (o Playwright MCP): login como `viewer` → `GET /api/v1/admin/providers` 200 OK; `POST` 403 `{"required":"providers:write"}`
- [x] 10.2 Test manual con `curl` (o Playwright MCP): login como `admin` → ciclo completo CRUD (create + read + update + soft delete + reactivate)
- [x] 10.3 Verificar en BD que los 2 nuevos permisos existen y están asignados correctamente (`SELECT * FROM permissions WHERE key LIKE 'providers:%'`)

## 11. Verificación final

- [x] 11.1 Ejecutar `npm run build` — 0 errores de TypeScript
- [x] 11.2 Ejecutar `npm test` — todos los tests pasan (nuevos + suite existente)
- [x] 11.3 Ejecutar `npx tsc --noEmit` adicional si el build no lo cubre
- [x] 11.4 Actualizar `CLAUDE.md`: añadir sección "Administración de proveedores (CRUD)" con los 5 endpoints, permisos requeridos, regla de soft delete vía `isActive`, validación de RFC mexicano, campos obligatorios vs opcionales
