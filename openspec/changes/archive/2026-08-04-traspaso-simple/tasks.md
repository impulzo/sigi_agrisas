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
- [x] 4.3 `infrastructure/http/WaybillsController.ts` — `createSimpleSchema` + `createCartaPorteSchema` (ambos `ZodObject` puros) + `z.discriminatedUnion("type", [...])` + `.superRefine()` para `arrivalAt>departureAt`; gate `waybills:stamp` tras el parseo cuando `type==="carta_porte"`; mapeo de los 3 errores nuevos; `listQuerySchema.type`. (Nota: origen≠destino se valida en `CreateWaybillUseCase.resolveBranchPair`, no en el `superRefine` del schema — ya era así antes de este change para Carta Porte, y `CreateWaybillUseCase.test.ts`/`CreateSimpleWaybillUseCase.test.ts` ya cubren ese 400 vía `InvalidBranchPairError`. Divergencia de redacción respecto al texto de esta tarea, no de comportamiento observable — HTTP 400 `InvalidBranchPair` se preserva igual.)

## 5. Seeds

- [x] 5.1 `prisma/seeds/folios.ts` — folio `TRI` (`Traspaso interno (sin Carta Porte)`, prefijo `TRI-`, scope `INVENTORY`) en `CANONICAL_FOLIOS`. Fix: agregar `waybills: true` al `_count.select` de la fase de borrado de legacy, sumarlo a `refs`, y al reporte de `AbortedReference`. (Fix adicional: `TRI` estaba duplicado en `CANONICAL_FOLIOS` — un segundo entry idéntico al final del arreglo; eliminado.)
- [x] 5.2 `prisma/seed.ts` — permiso `waybills:stamp`; asignar a `admin`/`operator` (no `viewer`); actualizar descripciones de `waybills:read`/`write`/`cancel`.

## 6. UI traspasos

- [x] 6.1 `_logic/types/api.ts` + `domain.ts` + `_mappers.ts` — `WaybillType`, `type`/`notes`, CP-nullables, unión `CreateWaybillBody`.
- [x] 6.2 `_logic/schemas/createWaybill.ts` — `createSimpleWaybillSchema` + `createCartaPorteWaybillSchema` (ambos objetos puros) + unión con `.superRefine()`.
- [x] 6.3 `_logic/errors.ts` — `WaybillStampForbiddenError`, `ProductRequiredForSimpleTransferError`.
- [x] 6.4 `_logic/services/createWaybill.ts` — rama 403 `required==="waybills:stamp"`, mapeo de los 2 errores 400 nuevos. (Fix: faltaba el mapeo de `ProductRequiredForSimpleTransfer` → `ProductRequiredForSimpleTransferError`; agregado.)
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
- [x] 8.3 `tests/unit/modules/waybills/CreateWaybillSchema.test.ts`. (No existía — creado. Requirió exportar `createWaybillSchema` desde `WaybillsController.ts` para probar la unión discriminada directamente. Cubre: payload simple válido, payload carta_porte válido, discriminante inválido/ausente, `arrivalAt<=departureAt` rechazado por `superRefine`, campos SAT faltantes, mercancía peligrosa sin código, y documenta explícitamente que origen==destino NO se rechaza a nivel de schema — ver nota en 4.3.)
- [x] 8.4 Actualizar `CreateWaybillUseCase.test.ts` (+`type`), `CancelWaybillUseCase.test.ts` (+caso simple), `DownloadWaybillFileUseCase.test.ts` (+caso simple).
- [x] 8.5 Actualizar `WaybillsController.branchScoping.test.ts` (mock +`waybills:stamp`, payloads +`type`).
- [x] 8.6 UI: extender `useCreateWaybillForm.test.ts`, `WaybillsListPage.test.tsx`, `WaybillDetailPage.test.tsx`, `BranchEditModal.test.tsx`; nuevo `WaybillTypeToggle.test.tsx`. (Los 4 existentes ya cubrían el discriminante `type`; `WaybillTypeToggle.test.tsx` no existía — creado con 6 casos de gating por `waybills:stamp`.)

## 9. Verificación

- [x] 9.1 `npm run build` (typecheck) OK. (Requiere Node >=18.17 — este entorno trae Node 18.0.0 por defecto; corrido con `nvm use 20.20.2`. Build completo exitoso, incluye `/waybills`, `/waybills/[id]`, `/waybills/new` y las 4 rutas `/api/v1/admin/waybills*`.)
- [ ] 9.2 `npx jest` verde (backend + UI). (Suite completa de `waybills` 100% verde: 10/10 suites, 56/56 tests. La corrida global tiene 94 tests fallando en 18 suites, TODAS bajo `tests/integration/` de otros módulos — pos, quotes, returns, inventory, products, payment-methods — por timeouts/latencia contra la DB real de Supabase desde este entorno (tiempos de suite de 90-227s), no por regresiones de este change. Ninguna suite de `waybills` ni ninguna suite unit fuera de `tests/integration/` falló. No marcado como verde global porque no lo está; el alcance de este agente (waybills backend) sí está 100% verde.)
- [x] 9.3 Seeds corridos contra la DB real (`TRI` sembrado, `waybills:stamp` asignado). (`npm run seed:folios`: 10 folios canónicos actualizados incl. `TRI`. `npm run seed`: transacción de permisos/roles agotaba el timeout de 60s contra la latencia real de este entorno a Supabase — aumentado a 300000ms en `prisma/seed.ts` para que la transacción entera pueda completar; corrida exitosa en ~3m43s. Verificado por query directa: folio `TRI` activo/scope INVENTORY, permiso `waybills:stamp` existe y asignado a roles `admin`+`operator` únicamente.)
- [x] 9.4 Smoke Playwright parcial: creado `tests/e2e/traspaso-simple-smoke.spec.ts`, 3/3 tests verdes contra la DB real (via `nvm use 20.20.2 && npx playwright test`) — traspaso simple crear+cancelar (folio `TRI-\d+` real, `cfdiUuid: null`, limpieza vía cancelación, no SQL manual), 400 sin `productId` en línea simple, 400 `InvalidBranchPair` origen==destino. Excluido deliberadamente del smoke: (a) crear+cancelar Carta Porte real — un `POST` exitoso con `type:"carta_porte"` timbra un CFDI real ante Facturama/SAT, un side effect fiscal irreversible que no se debe disparar desde un test automatizado; verificar manualmente. (b) 403 sin `waybills:stamp` — el seed sólo tiene roles admin/operator (ambos con el permiso) y viewer (sin `waybills:write` tampoco), no existe un rol seedeado con write-sin-stamp para aislar ese caso sin crear un rol de prueba ad hoc.
