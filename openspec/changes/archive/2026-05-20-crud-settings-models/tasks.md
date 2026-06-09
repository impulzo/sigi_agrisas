## 1. Migración Prisma y modelos

- [x] 1.1 Añadir modelos `PaymentMethod`, `Folio`, `Department`, `Branch` a `prisma/schema.prisma` con campos definidos en design.md (cada uno con `id @id @default(uuid())`, `code @unique @db.VarChar(32)`, `isActive @default(true) @map("is_active")`, `createdAt`, `updatedAt`, `@@map` a snake_case)
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add_settings_catalog_tables` para generar y aplicar la migración (4 tablas, índice único en `code` por tabla)
- [x] 1.3 Verificar `npx prisma generate` y que los tipos `PaymentMethod`, `Folio`, `Department`, `Branch` existen en `@prisma/client`

## 2. Seed RBAC — 8 permisos nuevos

- [x] 2.1 Actualizar `prisma/seed.ts`: añadir al array `PERMISSIONS` las claves `payment_methods:read`, `payment_methods:write`, `folios:read`, `folios:write`, `departments:read`, `departments:write`, `branches:read`, `branches:write` con descripciones en español
- [x] 2.2 Actualizar el rol `admin` para incluir las 8 nuevas claves en `permissions`
- [x] 2.3 Actualizar el rol `operator` para incluir las 4 nuevas `:read`
- [x] 2.4 Actualizar el rol `viewer` para incluir las 4 nuevas `:read`
- [x] 2.5 Ejecutar `npm run seed` y verificar idempotencia (correr 2 veces sin errores)

## 3. Shared — utilidades reutilizables

- [x] 3.1 (Opcional) Si surge duplicación al implementar, extraer helper `parseListQuery(searchParams)` que parsea `page`, `pageSize` (1–100), `includeInactive` con Zod en `src/shared/infrastructure/http/`. Si no es claramente reutilizable, mantenerlo inline en cada controller.

## 4. Módulo `payment-methods` — dominio

- [x] 4.1 Crear `src/modules/payment-methods/domain/entities/PaymentMethod.ts` con campos `id`, `code`, `name`, `description: string | null`, `isActive`, `createdAt`, `updatedAt`; factory `PaymentMethod.create()`
- [x] 4.2 Crear `src/modules/payment-methods/domain/errors/PaymentMethodNotFoundError.ts`
- [x] 4.3 Crear `src/modules/payment-methods/domain/errors/PaymentMethodCodeAlreadyInUseError.ts`
- [x] 4.4 Crear `src/modules/payment-methods/domain/value-objects/CatalogCode.ts` (o helper inline) que valida el regex `^[A-Z0-9_]{1,32}$`

## 5. Módulo `payment-methods` — aplicación

- [x] 5.1 Crear puerto `src/modules/payment-methods/application/ports/PaymentMethodRepository.ts` con métodos `findAll({ page, pageSize, includeInactive }): Promise<{ items, total }>`, `findById(id): Promise<PaymentMethod | null>`, `create(data): Promise<PaymentMethod>`, `update(id, data): Promise<PaymentMethod>`, `softDelete(id): Promise<void>`
- [x] 5.2 Crear DTOs en `src/modules/payment-methods/application/dto/`: `ListPaymentMethodsRequest.ts`, `ListPaymentMethodsResponse.ts`, `CreatePaymentMethodRequest.ts`, `UpdatePaymentMethodRequest.ts`, `PaymentMethodDto.ts`
- [x] 5.3 Crear `application/use-cases/ListPaymentMethodsUseCase.ts`
- [x] 5.4 Crear `application/use-cases/GetPaymentMethodUseCase.ts` (lanza `PaymentMethodNotFoundError` si null)
- [x] 5.5 Crear `application/use-cases/CreatePaymentMethodUseCase.ts` (delega a `repo.create`; propaga `PaymentMethodCodeAlreadyInUseError`)
- [x] 5.6 Crear `application/use-cases/UpdatePaymentMethodUseCase.ts` (verifica al menos un campo `name|description|isActive`; ignora `code`; propaga `PaymentMethodNotFoundError`)
- [x] 5.7 Crear `application/use-cases/SoftDeletePaymentMethodUseCase.ts` (llama `repo.softDelete`; propaga `PaymentMethodNotFoundError`)

## 6. Módulo `payment-methods` — infraestructura

- [x] 6.1 Crear `src/modules/payment-methods/infrastructure/repositories/PrismaPaymentMethodRepository.ts` que implementa el puerto: maneja `P2002` → `PaymentMethodCodeAlreadyInUseError`, `P2025` → `PaymentMethodNotFoundError`; `softDelete` ejecuta `prisma.paymentMethod.update({ where: { id }, data: { isActive: false } })`
- [x] 6.2 Crear `src/modules/payment-methods/infrastructure/repositories/InMemoryPaymentMethodRepository.ts` para tests
- [x] 6.3 Crear `src/modules/payment-methods/infrastructure/http/PaymentMethodsController.ts` con métodos `list`, `getById`, `create`, `update`, `softDelete`; schemas Zod inline (`listQuerySchema`, `createBodySchema`, `updateBodySchema`, `uuidParamSchema`)
- [x] 6.4 Crear `src/modules/payment-methods/infrastructure/di/container.ts` que instancia repo Prisma + 5 use cases + controller; exporta `paymentMethodsController`

## 7. Módulo `payment-methods` — route handlers

- [x] 7.1 Crear `app/api/v1/admin/payment-methods/route.ts` con `GET` (perm `payment_methods:read`) y `POST` (perm `payment_methods:write`)
- [x] 7.2 Crear `app/api/v1/admin/payment-methods/[id]/route.ts` con `GET` (read), `PATCH` (write), `DELETE` (write)

## 8. Módulo `folios` — dominio + aplicación + infra + handlers

- [x] 8.1 Replicar pasos 4.x para `Folio` con campos `id`, `code`, `name`, `prefix: string | null`, `currentNumber: number`, `isActive`, `createdAt`, `updatedAt`
- [x] 8.2 Replicar pasos 5.x para `folios/application/` (DTOs y 5 use cases). `CreateFolioRequest` incluye `prefix?: string | null`, `currentNumber?: number` (default 0); `UpdateFolioRequest` incluye `name?`, `prefix?: string | null`, `currentNumber?`, `isActive?`; el body schema rechaza `currentNumber < 0` y valida `prefix` con `^[A-Z0-9-]{1,8}$` si no es null
- [x] 8.3 Replicar pasos 6.x: `PrismaFolioRepository`, `InMemoryFolioRepository`, `FoliosController`, DI container `foliosController`
- [x] 8.4 Crear route handlers `app/api/v1/admin/folios/route.ts` y `app/api/v1/admin/folios/[id]/route.ts` con permisos `folios:read`/`folios:write`

## 9. Módulo `departments` — dominio + aplicación + infra + handlers

- [x] 9.1 Replicar pasos 4.x para `Department` con campos `id`, `code`, `name`, `description: string | null`, `isActive`, `createdAt`, `updatedAt`
- [x] 9.2 Replicar pasos 5.x: DTOs y 5 use cases para `departments/application/`
- [x] 9.3 Replicar pasos 6.x: `PrismaDepartmentRepository`, `InMemoryDepartmentRepository`, `DepartmentsController`, DI container `departmentsController`
- [x] 9.4 Crear route handlers `app/api/v1/admin/departments/route.ts` y `[id]/route.ts` con permisos `departments:read`/`departments:write`

## 10. Módulo `branches` — dominio + aplicación + infra + handlers

- [x] 10.1 Replicar pasos 4.x para `Branch` con campos `id`, `code`, `name`, `address: string | null`, `phone: string | null`, `email: string | null`, `isActive`, `createdAt`, `updatedAt`
- [x] 10.2 Replicar pasos 5.x: DTOs y 5 use cases para `branches/application/`; `CreateBranchRequest` / `UpdateBranchRequest` validan `email` con Zod `.email()` cuando no es null
- [x] 10.3 Replicar pasos 6.x: `PrismaBranchRepository`, `InMemoryBranchRepository`, `BranchesController`, DI container `branchesController`
- [x] 10.4 Crear route handlers `app/api/v1/admin/branches/route.ts` y `[id]/route.ts` con permisos `branches:read`/`branches:write`

## 11. Tests unitarios — `payment-methods`

- [x] 11.1 `tests/unit/modules/payment-methods/application/use-cases/ListPaymentMethodsUseCase.test.ts` — paginación, filtro `includeInactive`, validación `pageSize`
- [x] 11.2 `tests/unit/modules/payment-methods/application/use-cases/GetPaymentMethodUseCase.test.ts` — found, not found
- [x] 11.3 `tests/unit/modules/payment-methods/application/use-cases/CreatePaymentMethodUseCase.test.ts` — éxito (body mínimo), éxito con todos los campos, `PaymentMethodCodeAlreadyInUseError`
- [x] 11.4 `tests/unit/modules/payment-methods/application/use-cases/UpdatePaymentMethodUseCase.test.ts` — éxito, ignora `code`, empty body rechazado, `PaymentMethodNotFoundError`, clear description con null
- [x] 11.5 `tests/unit/modules/payment-methods/application/use-cases/SoftDeletePaymentMethodUseCase.test.ts` — éxito (activa → inactiva), idempotente (inactiva → inactiva), `PaymentMethodNotFoundError`

## 12. Tests unitarios — `folios`, `departments`, `branches`

- [x] 12.1 Replicar suites 11.1–11.5 para `folios` (añadir: `currentNumber` negativo rechazado, prefix inválido rechazado, prefix=null clears)
- [x] 12.2 Replicar suites 11.1–11.5 para `departments`
- [x] 12.3 Replicar suites 11.1–11.5 para `branches` (añadir: email inválido rechazado, email=null clears)

## 13. Tests de integración

- [x] 13.1 `tests/integration/modules/payment-methods/payment-methods-crud.test.ts` — flujo end-to-end con BD real: create → get → list → update → list `?includeInactive=false` (no aparece) → list `?includeInactive=true` (aparece) → softDelete → reactivar vía PATCH; limpia al final
- [x] 13.2 `tests/integration/modules/folios/folios-crud.test.ts` — flujo análogo + verificar persistencia de `prefix`, `currentNumber`
- [x] 13.3 `tests/integration/modules/departments/departments-crud.test.ts` — flujo análogo
- [x] 13.4 `tests/integration/modules/branches/branches-crud.test.ts` — flujo análogo + verificar persistencia de `address`, `phone`, `email`

## 14. Verificación de RBAC y permisos

- [x] 14.1 Test manual con `curl`: login como `viewer` → `GET /api/v1/admin/payment-methods` 200 OK; `POST` 403 `{"required":"payment_methods:write"}`
- [x] 14.2 Test manual con `curl`: login como `admin` → ciclo completo CRUD en los 4 endpoints
- [x] 14.3 Verificar en BD que los 8 nuevos permisos existen y están asignados a los roles correctos (`SELECT * FROM permissions WHERE key LIKE '%_methods:%' OR key LIKE 'folios:%' OR key LIKE 'departments:%' OR key LIKE 'branches:%'`)

## 15. Verificación final

- [x] 15.1 Ejecutar `npm run build` — 0 errores de TypeScript
- [x] 15.2 Ejecutar `npm test` — todos los tests pasan (nuevos + suite existente)
- [x] 15.3 Ejecutar `npx tsc --noEmit` adicional si el build no lo cubre
- [x] 15.4 Actualizar `CLAUDE.md`: añadir sección "Catálogos administrativos (CRUD)" con los 4 endpoints, permisos requeridos, regla de soft delete vía `isActive`, y formato `code`
- [x] 15.5 Ejecutar `openspec validate crud-settings-models --strict` — 0 errores
