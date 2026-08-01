## 1. Prisma schema + migración

- [x] 1.1 `prisma/schema.prisma`: `Waybill.type String @db.VarChar(20)`, `Waybill.notes String? @db.VarChar(500)`, `@@index([type])`.
- [x] 1.2 Pasar a nullable en `Waybill`: 14 columnas de domicilio origen/destino, `vehiclePlate`, `vehicleConfig`, `vehiclePermitType`, `vehiclePermitNumber`, `insuranceCompany`, `insurancePolicy`, `driverName`, `driverLicenseNumber`, `distanceKm`, `arrivalAt`. `departureAt` se queda `NOT NULL`.
- [x] 1.3 Pasar a nullable en `WaybillItem`: `satBienesTranspCode`, `satUnitCode`, `weightKg`.
- [x] 1.4 Generar migración vía `prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script`, filtrar a mano solo statements de `waybills`/`waybill_items` a `prisma/migrations/<timestamp>_add_waybill_type_simple/migration.sql` (backfill `type='carta_porte'` con DEFAULT transitorio, DROP DEFAULT, DROP NOT NULL ×27, índice). Verificar que no aparece ninguna de `users`/`roles`/`permissions`/`role_permissions`/`user_roles`.
- [x] 1.5 `npx prisma migrate deploy` + `npx prisma generate`.

## 2. Backend domain

- [x] 2.1 `src/modules/waybills/domain/value-objects/WaybillType.ts` — `WAYBILL_TYPES`, `WaybillType`, `isValidWaybillType`.
- [x] 2.2 `domain/entities/Waybill.ts` — `+type`, `+notes`, campos CP a `| null`, `isCartaPorte()`, `isSimple()`.
- [x] 2.3 `domain/entities/WaybillItem.ts` — `satBienesTranspCode`/`satUnitCode`/`weightKg` a `| null`.
- [x] 2.4 `domain/errors.ts` — `ProductRequiredForSimpleTransferError`, `ProductNotFoundForTransferError`, `CanonicalFolioMissingError`.

## 3. Backend application

- [x] 3.1 `application/ports/WaybillRepository.ts` — `CreateWaybillData` como unión por `type`, `createCompleted(data, stamp: StampCallback | null)`, `ListWaybillsOptions.types?`, `WaybillSummary.type`/`arrivalAt: Date | null`.
- [x] 3.2 `application/use-cases/CreateWaybillUseCase.ts` — `resolveBranchPair` privado compartido; `executeSimple` (folio `TRI`, sin domicilio, `productId` obligatorio, `stamp=null`); `executeCartaPorte` (idéntico a hoy).
- [x] 3.3 `application/dto/WaybillDto.ts` — `CreateWaybillRequest` como unión; `WaybillDto`/`WaybillSummaryDto` con `type`/`notes` y CP-nullables.
- [x] 3.4 `application/mappers/toWaybillDto.ts` — propaga `type`/`notes`.

## 4. Backend infrastructure

- [x] 4.1 `infrastructure/repositories/PrismaWaybillRepository.ts` — `stamp` opcional (`stamp ? await stamp() : null`), `data:` con spread condicional por `type`, `mapWaybill`/`toOriginAddress`/`toDestinationAddress` devuelven `| null`, `list` filtra por `types`.
- [x] 4.2 `infrastructure/repositories/InMemoryWaybillRepository.ts` — acepta `stamp: StampCallback | null` SIN reordenar la lógica existente (divergencia deliberada con Prisma, documentada inline).
- [x] 4.3 `infrastructure/http/WaybillsController.ts` — `createSimpleSchema` + `createCartaPorteSchema` (ambos `ZodObject` puros) + `z.discriminatedUnion("type", [...])` + `.superRefine()` para origen≠destino y `arrivalAt>departureAt`; gate `waybills:stamp` tras el parseo cuando `type==="carta_porte"`; mapeo de los 3 errores nuevos; `listQuerySchema.type`.

## 5. Seeds

- [x] 5.1 `prisma/seeds/folios.ts` — folio `TRI` (`Traspaso interno (sin Carta Porte)`, prefijo `TRI-`, scope `INVENTORY`) en `CANONICAL_FOLIOS`. Fix: agregar `waybills: true` al `_count.select` de la fase de borrado de legacy, sumarlo a `refs`, y al reporte de `AbortedReference`.
- [x] 5.2 `prisma/seed.ts` — permiso `waybills:stamp`; asignar a `admin`/`operator` (no `viewer`); actualizar descripciones de `waybills:read`/`write`/`cancel`.

## 6. UI traspasos

- [x] 6.1 `_logic/types/api.ts` + `domain.ts` + `_mappers.ts` — `WaybillType`, `type`/`notes`, CP-nullables, unión `CreateWaybillBody`.
- [x] 6.2 `_logic/schemas/createWaybill.ts` — `createSimpleWaybillSchema` + `createCartaPorteWaybillSchema` (ambos objetos puros) + unión con `.superRefine()`.
- [x] 6.3 `_logic/errors.ts` — `WaybillStampForbiddenError`, `ProductRequiredForSimpleTransferError`.
- [x] 6.4 `_logic/services/createWaybill.ts` — rama 403 `required==="waybills:stamp"`, mapeo de los 2 errores 400 nuevos.
- [x] 6.5 `_logic/hooks/useCreateWaybillForm.ts` — `type`/`setType`/`transferDate`/`notes`; cambio de tipo preserva líneas (bloquea envío si hay línea libre al pasar a simple).
- [x] 6.6 `_blocks/WaybillTypeToggle.tsx` (nuevo) — envuelve `SegmentedButton`, filtra la opción Carta Porte si falta `waybills:stamp`.
- [x] 6.7 `_blocks/SimpleTransferFields.tsx` (nuevo) — fecha de traspaso + notas.
- [x] 6.8 `_blocks/NewWaybillPage.tsx` — toggle + render condicional de secciones + subtítulo/label condicional.
- [x] 6.9 `_blocks/WaybillItemsForm.tsx` + `WaybillLineRow.tsx` — prop `type`, oculta "+ Línea libre" y columnas SAT/peso/peligroso en simple.
- [x] 6.10 `_blocks/WaybillTypeBadge.tsx` (nuevo), `WaybillsTable.tsx` (+columna Tipo), `WaybillsToolbar.tsx` (+filtro tipo), `WaybillsListPage.tsx` (+estado `typeFilter`).
- [x] 6.11 `_blocks/WaybillMetaPanel.tsx` — data-driven según `type`.
- [x] 6.12 `_blocks/WaybillActionsBar.tsx` — fix: PDF/XML condicionados a `type==="carta_porte" && !!cfdiUuid` (bug preexistente).
- [x] 6.13 `_blocks/WaybillDetailPage.tsx` + `WaybillItemsTable.tsx` + `CancelWaybillModal.tsx` — ocultar/condicionar bloques CP, texto de cancelación condicional.

## 7. UI sucursales

- [x] 7.1 `catalogs/branches/_logic/types/api.ts` — +8 `address*` en `BranchDto`/`CreateBranchBody`/`UpdateBranchBody`.
- [x] 7.2 `catalogs/branches/_logic/schemas/branch.schema.ts` — regex `addressState`/`addressZipCode`, longitudes.
- [x] 7.3 `catalogs/branches/_blocks/BranchEditModal.tsx` — reestructurar en 3 secciones (patrón `ProviderEditModal`), colapsar `getDiff`/`isDirty`/`isDiffEmpty` duplicados, `normalizeOptional`, validar sobre el diff en edición.

## 8. Tests

- [x] 8.1 `tests/unit/modules/waybills/CreateSimpleWaybillUseCase.test.ts`.
- [x] 8.2 `tests/unit/modules/waybills/WaybillsController.stampPermission.test.ts`.
- [x] 8.3 `tests/unit/modules/waybills/CreateWaybillSchema.test.ts`.
- [x] 8.4 Actualizar `CreateWaybillUseCase.test.ts` (+`type`), `CancelWaybillUseCase.test.ts` (+caso simple), `DownloadWaybillFileUseCase.test.ts` (+caso simple).
- [x] 8.5 Actualizar `WaybillsController.branchScoping.test.ts` (mock +`waybills:stamp`, payloads +`type`).
- [x] 8.6 UI: extender `useCreateWaybillForm.test.ts`, `WaybillsListPage.test.tsx`, `WaybillDetailPage.test.tsx`, `BranchEditModal.test.tsx`; nuevo `WaybillTypeToggle.test.tsx`.

## 9. Verificación

- [x] 9.1 `npm run build` (typecheck) OK.
- [x] 9.2 `npx jest` verde (backend + UI).
- [x] 9.3 Seeds corridos contra la DB real (`TRI` sembrado, `waybills:stamp` asignado).
- [x] 9.4 Smoke Playwright parcial: `/waybills/new` renderiza toggle Simple/Con Carta Porte (ambas opciones visibles con `waybills:stamp`), modo Simple sin "+ Línea libre" ni campos SAT/vehículo, sólo "+ Catálogo" + fecha + notas — todo conforme a spec. **No se completó create+cancel end-to-end real**: la BD sólo tiene una sucursal ("Matriz") sembrada, insuficiente para un par origen/destino válido; crear una segunda sucursal falsa sólo para la prueba se descartó por ensuciar el catálogo real de forma persistente. Cobertura de la lógica de creación/cancelación (stock insuficiente, par de sucursales inválido, folio `TRI`, reversión de inventario) queda confirmada vía `CreateSimpleWaybillUseCase.test.ts` + `CancelWaybillUseCase.test.ts` (suite completa 1465/1465 verde).
