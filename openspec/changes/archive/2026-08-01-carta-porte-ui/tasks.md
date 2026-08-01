## 1. Tipos, schemas, errores

- [x] 1.1 `_logic/types/api.ts` — `WaybillDto`, `WaybillItemDto`, `CreateWaybillRequest`, `CancelWaybillRequest`, `WaybillListResponse` (espejo de `src/modules/waybills/application/dto/WaybillDto.ts` una vez exista en `add-carta-porte`).
- [x] 1.2 `_logic/types/domain.ts` — tipos de dominio frontend (`Waybill`, `WaybillItem`, `WaybillStatus = 'completed'|'cancelled'`, `VehicleInput`, `DriverInput`).
- [x] 1.3 `_logic/errors.ts` — `InvalidBranchPairError`, `BranchAddressIncompleteError(branchId, missingFields)`, `InsufficientStockAtOriginError(productId)`, `FacturamaStampError(detail)`, `WaybillAlreadyCancelledError`, `WaybillNotFoundError`, `WaybillNotStampedError`.
- [x] 1.4 `_logic/schemas/createWaybill.ts` — Zod cliente: `originBranchId`/`destinationBranchId` uuid distintos, `vehicle{}` requerido, `driver{}` requerido, `distanceKm>0`, `arrivalAt > departureAt`, `items[]≥1` con `weightKg>0`, `quantity>0`, `satBienesTranspCode`, `hazardousMaterialCode` requerido si `isHazardousMaterial`.
- [x] 1.5 `_logic/schemas/cancelWaybill.ts` — Zod: `reason` 3-500 chars.

## 2. Servicios

- [x] 2.1 `_logic/services/listWaybills.ts`, `getWaybill.ts`, `createWaybill.ts`, `cancelWaybill.ts`, `downloadWaybillFile.ts` — `authFetch`, mapean errores HTTP a `_logic/errors.ts`, aceptan `fetchImpl?`.
- [x] 2.2 `_logic/services/index.ts` — barrel.

## 3. Hooks

- [x] 3.1 `_logic/hooks/useWaybillsList.ts` — paginación, filtros, branch scoping (auto-fija `branchId` sin `branches:access_all`).
- [x] 3.2 `_logic/hooks/useWaybillDetail.ts`.
- [x] 3.3 `_logic/hooks/useWaybillMutations.ts` — cancelar, refresca detalle.
- [x] 3.4 `_logic/hooks/useCreateWaybillForm.ts` — orquesta estado del formulario completo (sucursales, líneas, vehículo, operador, horario), validación Zod, submit, manejo de errores tipados sin limpiar el formulario.

## 4. Listado y detalle

- [x] 4.1 `_blocks/WaybillsListPage.tsx`, `WaybillsToolbar.tsx`, `WaybillsTable.tsx`, `WaybillStatusBadge.tsx`, `WaybillsEmpty.tsx`.
- [x] 4.2 `_blocks/WaybillDetailPage.tsx`, `WaybillItemsTable.tsx`, `WaybillMetaPanel.tsx` (ubicaciones+vehículo+operador), `WaybillActionsBar.tsx`.
- [x] 4.3 `app/(private)/waybills/page.tsx` (SC, metadata, gate `waybills:read`), `app/(private)/waybills/[id]/page.tsx` (SC, gate `waybills:read`).

## 5. Creación

- [x] 5.1 `_blocks/BranchPairSelector.tsx` — exclusión mutua origen/destino en el render.
- [x] 5.2 `_blocks/WaybillItemsForm.tsx`, `WaybillLineRow.tsx` — reusa `ProductCatalogPanel`/`ProductCatalogTable` del POS + inputs propios (`weightKg`, `satBienesTranspCode`, `isHazardousMaterial`).
- [x] 5.3 `_blocks/VehicleDriverForm.tsx` — campos libres.
- [x] 5.4 `_blocks/ScheduleFields.tsx` — salida/llegada/distancia.
- [x] 5.5 `_blocks/NewWaybillPage.tsx` — orquesta los bloques anteriores vía `useCreateWaybillForm`.
- [x] 5.6 `app/(private)/waybills/new/page.tsx` (SC, gate `waybills:write`).

## 6. Cancelación y descarga

- [x] 6.1 `_blocks/CancelWaybillModal.tsx` — `ConfirmDialog` + campo `reason`.
- [x] 6.2 Botón descarga PDF/XML en `WaybillActionsBar` vía `downloadWaybillFile`.

## 7. Navegación

- [x] 7.1 Agregado `RailItem { key: "waybills", href: "/waybills", icon: "swap_horiz", label: "Traspasos", requires: "waybills:read" }` a `app/_components/organisms/NavigationRail/items.ts`, ubicado tras `inventory`. **Desviación deliberada del ícono propuesto en `design.md`** (`local_shipping`) — ese ícono ya lo usa el item `providers`; `swap_horiz` evita la duplicación visual y comunica mejor "traspaso" que "camión".

## 8. Tests

- [x] 8.1 `tests/unit/ui/(private)/waybills/useCreateWaybillForm.test.ts` — validación Zod, submit exitoso, manejo de cada error tipado sin limpiar el formulario.
- [x] 8.2 `tests/unit/ui/(private)/waybills/WaybillsListPage.test.tsx` — render paginado, branch scoping en filtros.
- [x] 8.3 `tests/unit/ui/(private)/waybills/BranchPairSelector.test.tsx` — exclusión mutua origen/destino.
- [x] 8.4 `tests/unit/ui/(private)/waybills/WaybillDetailPage.test.tsx` — banner de cancelación, botones gated por permiso y por estado.

## 9. Verificación

- [x] 9.1 `npm run build` OK — `/waybills`, `/waybills/[id]`, `/waybills/new` compilan. `npx jest` completo: 2360/2365 verdes (los 5 fallos son la misma colisión de RFC de fixture pre-existente en tests de integración de `pos`/`quotes` al correr la suite repetidamente contra la misma DB — no relacionado a este cambio). 25 tests nuevos de `tests/unit/ui/(private)/waybills/` todos verdes.
- [x] 9.2 Smoke manual en navegador vía Playwright (claude-in-chrome quedó descartado por timeouts): login real con `admin@example.com`, `/waybills` renderiza listado + item "Traspasos" en NavigationRail (icon `swap_horiz`) + toolbar con filtro de sucursal (bypass) + CTA "+ Nuevo traspaso" + empty state — 0 errores de consola. `/waybills/new` renderiza las 4 secciones completas (origen/destino, mercancías, vehículo/operador, horario) — 0 errores de consola. Exclusión mutua origen/destino confirmada en vivo: al elegir "Matriz" como origen, el combo de destino queda solo con el placeholder. "+ Catálogo" abre `ProductCatalogPanel` con productos reales, sin errores. **No cubierto**: ciclo completo de creación+cancelación en vivo — la DB de desarrollo solo tiene una sucursal ("Matriz"), y crear una segunda sucursal solo para esta prueba excede el consentimiento ya dado (migración+seed); el ciclo completo de creación/cancelación/rollback ya está cubierto exhaustivamente por los 27 tests unitarios de `add-carta-porte` contra la misma lógica de `PrismaWaybillRepository`.
