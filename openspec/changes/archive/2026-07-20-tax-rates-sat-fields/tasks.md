## 1. Migración Prisma

- [x] 1.1 Agregar a `prisma/schema.prisma` (`model TaxRate`): `satTaxCode String @map("sat_tax_code") @db.VarChar(3)`, `factorType String @map("factor_type") @db.VarChar(10)`, `displayValue Decimal @map("display_value") @db.Decimal(9,4)`, `transferredAccount String? @map("transferred_account") @db.VarChar(20)`, `pendingTransferredAccount String? @map("pending_transferred_account") @db.VarChar(20)`, `creditedAccount String? @map("credited_account") @db.VarChar(20)`, `pendingCreditedAccount String? @map("pending_credited_account") @db.VarChar(20)`; cambiar `rate Decimal @db.Decimal(5,4)` a `rate Decimal @db.Decimal(9,6)`
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add_sat_fields_to_tax_rates`; editar el SQL generado para: (a) columnas nuevas `NOT NULL DEFAULT` transitorio donde aplica (`sat_tax_code DEFAULT '002'`, `factor_type DEFAULT 'Tasa'`, `display_value DEFAULT 0`), (b) `UPDATE tax_rates SET sat_tax_code='002', factor_type='Tasa', display_value=16 WHERE code='IVA_16'` (y análogos para `IEPS_8`→`003`/`8`, `IVA_0`→`002`/`0`), (c) `ALTER COLUMN ... DROP DEFAULT` en las 3 columnas tras el backfill, (d) `ALTER TABLE tax_rates ADD CONSTRAINT tax_rates_factor_type_check CHECK (factor_type IN ('Tasa','Cuota','Exento'))`
- [x] 1.3 `npx prisma generate`

## 2. Dominio y aplicación

- [x] 2.1 `src/modules/tax-rates/domain/entities/TaxRate.ts`: agregar los 7 campos nuevos a `TaxRateProps` y a la clase
- [x] 2.2 `src/modules/tax-rates/application/dto/TaxRateDto.ts`: agregar los 7 campos a `TaxRateDto`, `CreateTaxRateRequest`, `UpdateTaxRateRequest`; actualizar `toTaxRateDto`
- [x] 2.3 `src/modules/tax-rates/application/ports/TaxRateRepository.ts`: agregar los 7 campos a `CreateTaxRateData` (obligatorios: `satTaxCode`, `factorType`, `displayValue`; opcionales: las 4 cuentas) y a `UpdateTaxRateData` (todos opcionales)
- [x] 2.4 `src/modules/tax-rates/application/use-cases/CreateTaxRateUseCase.ts` y `UpdateTaxRateUseCase.ts`: pasar los campos nuevos al repositorio (sin lógica de negocio adicional — la validación de formato vive en el controller)

## 3. Repositorio

- [x] 3.1 `src/modules/tax-rates/infrastructure/repositories/PrismaTaxRateRepository.ts`: incluir los 7 campos nuevos en `create`/`update`/mapeo Prisma→dominio
- [x] 3.2 Crear `src/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository.ts` implementando `TaxRateRepository` completo (incluye `findActiveProductCount` simulado), siguiendo el patrón de otros módulos (ej. `InMemoryReturnRepository`)

## 4. Controller y validación

- [x] 4.1 `src/modules/tax-rates/infrastructure/http/TaxRatesController.ts`: `createBodySchema` — agregar `satTaxCode: z.string().regex(/^\d{3}$/)`, `factorType: z.enum(["Tasa","Cuota","Exento"])`, `displayValue: z.number()`, `rate: z.number().min(0)` (quitar el `.max(1)` fijo — `Cuota` puede superar 1; documentar en comentario si aplica), 4 cuentas `z.string().max(20).nullable().optional()`
- [x] 4.2 `updateBodySchema`: mismos campos, todos `.optional()`; ampliar el `.refine()` de "al menos un campo" para incluir los nuevos

## 5. Seed

- [x] 5.1 `prisma/seeds/taxRates.ts`: agregar `satTaxCode`, `factorType`, `displayValue` a los 3 registros (`IVA_16`→`002`/`Tasa`/`16`, `IEPS_8`→`003`/`Tasa`/`8`, `IVA_0`→`002`/`Tasa`/`0`) en el objeto `TAX_RATES` y en `upsert.update`/`upsert.create`

## 6. Tests backend

- [x] 6.1 `tests/unit/modules/tax-rates/CreateTaxRateUseCase.test.ts`: casos con `InMemoryTaxRateRepository` — creación exitosa con campos SAT, código duplicado
- [x] 6.2 `tests/unit/modules/tax-rates/UpdateTaxRateUseCase.test.ts`: actualización de campos SAT, `code` no se toca

## 7. Frontend

- [x] 7.1 `app/(private)/catalogs/tax-rates/_logic/types/api.ts` y `types/domain.ts`: agregar los 7 campos nuevos a los tipos `TaxRate`/DTO
- [x] 7.2 `app/(private)/catalogs/tax-rates/_logic/schemas/taxRate.schema.ts`: Zod cliente espejo del backend (`satTaxCode` regex, `factorType` enum)
- [x] 7.3 `app/(private)/catalogs/tax-rates/_logic/services/taxRates.ts`: incluir campos nuevos en create/update payloads
- [x] 7.4 `app/(private)/catalogs/tax-rates/_blocks/TaxRateEditModal.tsx`: agregar inputs Clave SAT (text), Tipo Factor (select Tasa/Cuota/Exento), Valor (numeric), 4 cuentas contables (text opcional); mantener Código deshabilitado en edit
- [x] 7.5 `app/(private)/catalogs/tax-rates/_blocks/TaxRatesTable.tsx`: agregar columnas Clave SAT, Tipo Factor, Valor; ajustar formato de "Tasa (%)" a 4 decimales

## 8. Verificación

- [x] 8.1 `npm run build` — verifica tipos end-to-end (schema Prisma, DTOs, UI)
- [x] 8.2 `npm test` — suites nuevas (6.1/6.2) pasan; único fallo restante (`quotes-conversion-edge-cases.test.ts`, RFC de cliente duplicado por dato huérfano en la BD compartida) confirmado no relacionado con `tax_rates` (0 referencias)
- [x] 8.3 Manual (parcial): dev server levantado, migración verificada contra BD real (los 3 registros sembrados tienen `satTaxCode`/`factorType`/`displayValue` backfillados correctamente), rutas `GET /api/v1/admin/tax-rates` (401 sin token) y `/catalogs/tax-rates` (307 redirect sin sesión, sin 500) verificadas. Click-through completo en la UI (crear/editar vía modal, guard de desactivación) NO se hizo — requería credenciales admin; el intento de otorgar rol admin a un usuario de prueba fue bloqueado por el clasificador de permisos (escalación de privilegios no solicitada). Usuario de prueba y scripts temporales limpiados. Pendiente: verificar visualmente con credenciales reales.
