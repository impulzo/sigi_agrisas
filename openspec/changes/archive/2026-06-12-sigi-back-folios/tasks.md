## 1. Schema & Migración Prisma

- [x] 1.1 Agregar al modelo `Folio` en `prisma/schema.prisma` el campo `scope String @default("OPERATIONS") @db.VarChar(32)` con `@@index([scope])` (para acelerar `?scope=` en list)
- [x] 1.2 Crear la migración con `npx prisma migrate dev --name add_folios_scope_column` *(aplicada vía Supabase MCP `apply_migration` por entorno no-interactivo; archivo en `prisma/migrations/20260611000001_add_folios_scope_column/migration.sql`)*
- [x] 1.3 Verificar el SQL generado: `ALTER TABLE folios ADD COLUMN scope VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS'` + `CREATE INDEX folios_scope_idx ON folios(scope)`
- [x] 1.4 `npx prisma generate` para regenerar el client tipado

## 2. Dominio + DTOs del módulo `folios`

- [x] 2.1 Crear `src/shared/domain/types/FolioScope.ts` con `export type FolioScope = "POS" | "INVENTORY" | "OPERATIONS"` y constante `FOLIO_SCOPES: readonly FolioScope[]`
- [x] 2.2 Agregar `scope: FolioScope` a la entidad `src/modules/folios/domain/entities/Folio.ts`
- [x] 2.3 Agregar `scope: FolioScope` al `FolioDto` y al mapper `toFolioDto` (`src/modules/folios/application/dto/FolioDto.ts`)
- [x] 2.4 Extender `CreateFolioData` y `UpdateFolioData` (`application/ports/FolioRepository.ts`) con `scope` (required en create, opcional en update)
- [x] 2.5 Agregar `FindAllFoliosOptions.scope?: FolioScope` para filtrar en el repo

## 3. Casos de uso `folios`

- [x] 3.1 `CreateFolioUseCase`: aceptar `scope` (required); el use case ya delega al repo, basta con tipar
- [x] 3.2 `UpdateFolioUseCase`: aceptar `scope?` opcional; permitir update; mantener `code` immutable como hoy
- [x] 3.3 `ListFoliosUseCase`: aceptar `scope?` en options y pasarlo al repo
- [x] 3.4 `PrismaFolioRepository`: traducir `scope` en `where` del list, `data` del create/update

## 4. Controller + rutas HTTP de `folios`

- [x] 4.1 En `FoliosController`: importar `FOLIO_SCOPES`; agregar `scope: z.enum([...FOLIO_SCOPES])` a los Zod schemas
- [x] 4.2 `POST /folios`: `scope` es required → si falta, 400 con error de validación
- [x] 4.3 `PATCH /folios/:id`: `scope` opcional, validado; mantener el chequeo de "al menos un campo" (sumar `scope` al conteo)
- [x] 4.4 `GET /folios`: parse del query param `?scope=...`; rechazar con 400 si no está en la enum
- [x] 4.5 Confirmar que el handler de `app/api/v1/admin/folios/route.ts` y `[id]/route.ts` no requieren cambios (delegan al controller)

## 5. Error de dominio compartido

- [x] 5.1 Crear `src/shared/domain/errors/FolioScopeMismatchError.ts` con `constructor(expected: FolioScope, actual: FolioScope)` y propiedades públicas `expected`/`actual`
- [x] 5.2 Cobertura unit: error es `instanceof Error`, properties accesibles, mensaje formateado (`tests/unit/modules/shared/domain/errors/FolioScopeMismatchError.test.ts`)

## 6. Enforcement de scope en POS

- [x] 6.1 `CreateSaleUseCase`: tras `lookups.getFolio(req.folioId)` y antes del check de `isActive`, validar `folio.scope === 'POS'`; sino `throw new FolioScopeMismatchError('POS', folio.scope)`
- [x] 6.2 ~~`EditCompletedSaleUseCase`: idem cuando se recarga el folio durante edit~~ *(no aplica: `EditCompletedSaleUseCase` no acepta cambios de `folioId`; folio inmutable on edit. Delta spec actualizado.)*
- [x] 6.3 `SalesController`: mapear `FolioScopeMismatchError` a HTTP 400 `{ error: 'FolioScopeMismatch', expected, actual }`
- [x] 6.4 Tests unit: `CreateSaleUseCase` rechaza folio con scope `OPERATIONS` o `INVENTORY` antes de tocar inventario o folio counter

## 7. Enforcement de scope en Quotes

- [x] 7.1 `CreateQuoteUseCase`: validar `folio.scope === 'POS'`; sino `throw new FolioScopeMismatchError('POS', folio.scope)`
- [x] 7.2 ~~`UpdateQuoteUseCase` (solo cuando el body cambia `folioId`): idem~~ *(no aplica: `UpdateQuoteUseCase` no acepta cambios de `folioId`; folio inmutable tras creación. En su lugar agregué guard en `ConvertQuoteToSaleUseCase` que sí carga el folio fiscal de la venta resultante. Delta spec actualizado.)*
- [x] 7.3 `QuotesController`: mapear el error a HTTP 400
- [x] 7.4 Tests unit: `CreateQuoteUseCase` y `ConvertQuoteToSaleUseCase` rechazan folio con scope distinto (OPERATIONS/INVENTORY)

## 8. Enforcement de scope en Payments

- [x] 8.1 `RegisterPaymentUseCase`: tras cargar `folio`, validar `folio.scope === 'OPERATIONS'`; sino `throw new FolioScopeMismatchError('OPERATIONS', folio.scope)` *(implementado en `PrismaPaymentRepository.createCompleted` donde se carga el folio dentro de la transacción)*
- [x] 8.2 `PaymentsController`: mapear a HTTP 400
- [x] 8.3 Tests unit: `InMemoryPaymentRepository.seedFolio()` añadido; `RegisterPaymentUseCase` rechaza folio `POS`/`INVENTORY`

## 9. Seed de folios

- [x] 9.1 Crear `prisma/seeds/folios.ts` con shebang/header estándar (`PrismaClient`, sin imports de Next)
- [x] 9.2 Definir constante `CANONICAL_FOLIOS: Array<{ code, name, prefix, scope }>` con los 8 folios listados en el spec `data-seeding`
- [x] 9.3 Implementar `findLegacyFolios(prisma)`: `findMany` con `where: { code: { notIn: canonicalCodes } }`, incluyendo `_count: { select: { sales: true, quotes: true, payments: true } }`
- [x] 9.4 Implementar `partitionLegacy(legacy)`: separa `toDelete` (sin refs) y `aborted` (con refs)
- [x] 9.5 Si `aborted.length > 0`: stderr formatea cada entrada y `process.exit(1)` sin tocar nada
- [x] 9.6 Si `aborted.length === 0`: por cada `toDelete` → `prisma.folio.delete({ where: { id } })`
- [x] 9.7 Por cada `CANONICAL_FOLIO`: `prisma.folio.upsert({ where: { code }, create: { ...fields, currentNumber: 0, isActive: true }, update: { name, prefix, scope, isActive: true } })`
- [x] 9.8 Imprimir resumen `{ canonicalUpserted, canonicalCreated, canonicalUpdated, legacyDeleted, abortedReferences }` y `process.exit(0)`
- [x] 9.9 `prisma.$disconnect()` en `finally`

## 10. RBAC seed y package.json

- [x] 10.1 Remover de `prisma/seed.ts` el bloque `prisma.folio.upsert({ where: { code: "RECIBO" }, ... })`
- [x] 10.2 Verificar que `prisma/seed.ts` ya no importa nada relacionado a folios
- [x] 10.3 Agregar a `package.json` el script `"seed:folios": "ts-node prisma/seeds/folios.ts"` (alineado con `seed:inventory`)
- [x] 10.4 Probar `npm run seed:folios` en dev limpio: corrida 1 crea 8 (canonicalCreated:8), corrida 2 update no-op (canonicalUpdated:8), idempotente

## 11. Frontend — `useFoliosOptions(scope?)`

- [x] 11.1 Tipar `FolioScope` reutilizado desde `src/shared/domain/types/FolioScope.ts` *(duplicado intencionalmente en `app/_hooks/useFoliosOptions.ts` para mantener la frontera src↔app)*
- [x] 11.2 Refactor de `app/_hooks/useFoliosOptions.ts`: signature `useFoliosOptions(opts?: { scope?: FolioScope })`; cache `Map<scope|"_all", CacheEntry>`; URL `?scope=${scope}` cuando se pasa
- [x] 11.3 `FolioOption` agrega campo `scope: FolioScope` (mapeado desde el DTO)
- [x] 11.4 Confirmar que tests existentes del hook siguen pasando (sin scope, cache global "_all") *(el comportamiento sin scope queda inalterado: misma URL, misma forma de cache; pendiente de verificar al correr la suite)*

## 12. Frontend — wiring por flujo

- [x] 12.1 `PosPage.tsx`: invoca `useFoliosOptions({ scope: "POS" })`
- [x] 12.2 `EditSalePage.tsx`: idem
- [x] 12.3 `QuoteCreatePage.tsx`, `QuoteEditPage.tsx`, `ConvertQuoteModal.tsx`: invocan `useFoliosOptions({ scope: "POS" })`
- [x] 12.4 `RegisterPaymentModal.tsx`: invoca `useFoliosOptions({ scope: "OPERATIONS" })`; cambia `code === "RECIBO"` a `code === "RB"` (default selection)
- [x] 12.5 `app/_hooks/useFoliosOptions.ts`: si el caller no pasa scope, deja comportamiento actual (el catálogo `/catalogs/folios` sigue listando todo)

## 13. Frontend — catálogo de folios

- [x] 13.1 `FolioEditModal.tsx`: nuevo `<select>` para `scope` con etiquetas humanas (required en create, editable en edit)
- [x] 13.2 `FoliosTable.tsx`: nueva columna "Ámbito" con badge `bg-secondary-container`
- [x] 13.3 `_logic/schemas/folio.schema.ts`: agrega `scope: z.enum(["POS","INVENTORY","OPERATIONS"])`; `domain.ts` y `api.ts` incluyen `scope: FolioScope`

## 14. Tests

- [x] 14.1 Tests existentes actualizados: fixtures de `Folio`/`FolioLookup`/`FolioOption`/`CreateFolioBody`/`UpdateFolioBody` (~15 archivos) ahora incluyen `scope`. `InMemoryFolioRepository` extendido con filtro por scope.
- [x] 14.2 Nuevo test `ListFoliosUseCase filtra por scope=POS` en `FoliosUseCases.test.ts`
- [x] 14.3 Nuevo test `CreateSaleUseCase rechaza folio scope !== POS` en `CreateSaleUseCase.test.ts`
- [x] 14.4 Nuevo test `CreateQuoteUseCase rechaza folio scope !== POS` en `QuoteLifecycleUseCases.test.ts`
- [x] 14.5 Nuevo test `RegisterPaymentUseCase rechaza folio scope !== OPERATIONS` en `PaymentsUseCases.test.ts`
- [x] 14.6 Nuevo test `useFoliosOptions cache por scope` en `tests/unit/ui/_hooks/useFoliosOptions.test.ts`

## 15. Documentación

- [x] 15.1 Actualizar `CLAUDE.md`:
  - Sección "Comandos frecuentes": agrega `npm run seed:folios`
  - Sección "Reglas específicas" (Folios): nota sobre `scope`, set canónico, enforcement y comportamiento del seed
  - Sección "Abonos": cambia referencia de folio default de `RECIBO` a `RB` y describe el scope check
  - Sección "Migraciones relevantes": agrega `20260611000001_add_folios_scope_column`
- [x] 15.2 Documentación del flujo `useFoliosOptions` queda implícita en el cambio de signature; el hook sigue siendo compatible llamado sin args

## 16. Verificación manual (smoke)

- [x] 16.1 `npm run build` pasa sin errores (Next 14 build limpio con Node 20)
- [x] 16.2 `npm test` unit suite: **1702/1702 ✓** (+10 nuevos tests de scope). Integración requiere `DATABASE_URL` activo (preexistente).
- [x] 16.3 Smoke API en dev verificado vía curl + Supabase MCP: `GET ?scope=POS` → TK/TC/COT ✅, `GET ?scope=OPERATIONS` → RB/AB/DEV/CP ✅, sin scope → 8 folios ✅, POST sin scope → 400 ✅, POST scope inválido → 400 con enum detallado ✅, PATCH body vacío → 400 ✅
- [x] 16.4 Idempotencia del seed validada en DB real: corrida 1 (canonicalCreated:8), corrida 2 (canonicalUpdated:8, currentNumber preservado)
