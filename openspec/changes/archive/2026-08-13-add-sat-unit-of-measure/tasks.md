## 1. Catálogo SAT — backend

- [x] 1.1 Agregar modelo Prisma `SatUnitOfMeasure` (tabla `sat_units_of_measure`) y migración `20260813000001_add_sat_units_of_measure`
- [x] 1.2 Descargar catálogo oficial `c_ClaveUnidad` (CFDI 4.0) desde `phpcfdi/resources-sat-catalogs`, generar `prisma/seeds/data/sat-units.tsv` + checksums
- [x] 1.3 Crear `prisma/seeds/lib/satUnitCatalog.ts` (parseo + verificación de checksum) y `prisma/seeds/satUnits.ts` (seed idempotente, resync total)
- [x] 1.4 Agregar script `npm run seed:sat-units` y correrlo (2418 filas sembradas)
- [x] 1.5 Extender `src/modules/sat-codes/` con puerto `SatUnitRepository`, `SearchSatUnitsUseCase`, `PrismaSatUnitRepository`, `InMemorySatUnitRepository`, `SatUnitsController`
- [x] 1.6 Registrar `satUnitsController` en el DI container del módulo
- [x] 1.7 Crear ruta `GET /api/v1/admin/sat-codes/clave-unidad`

## 2. Validación de Product.unit

- [x] 2.1 Cambiar validación de `unit` en `ProductsController` (create + update) de texto libre a regex `^[A-Za-z0-9]{2,3}$`
- [x] 2.2 Cambiar validación equivalente en `product.schema.ts` (frontend)

## 3. UI — combobox de Unidad SAT

- [x] 3.1 Agregar `"clave-unidad"` al union type `SatCatalog` de `useSatCatalogSearch`
- [x] 3.2 Reemplazar el input de texto libre de Unidad por `SatCatalogCombobox` en `ProductGeneralTab.tsx` y `ProductEditModal.tsx`
- [x] 3.3 (Descartado) combobox bespoke `SatUnitCombobox.tsx` — reemplazado por el molecule genérico tras fallar el guardrail de design-system

## 4. Resolución de descripción legible (unitDescription)

- [x] 4.1 Crear util compartido `src/shared/infrastructure/sat-codes/resolveUnitDescriptions.ts`
- [x] 4.2 Wiring en `PrismaProductRepository` (`ProductWithDepartment.unitDescription`, `ProductDto`, `toProductDto`)
- [x] 4.3 Wiring en `PrismaInventoryReportRepository` (reporte de stock) y `PrismaDepartmentPriceListRepository` (reporte lista de precios)
- [x] 4.4 Wiring en `GetKardexReportUseCase` (encabezado de producto en kardex)
- [x] 4.5 Cambiar `recordInventoryMovement.ts` para snapshotear la descripción resuelta en vez del código crudo
- [x] 4.6 Actualizar displays: `ProductsTable.tsx`, `InventoryPriceStockTable.tsx`, `KardexReportPdf.tsx`, `InventoryStockReportPdf.tsx`, `DepartmentPriceListReportPdf.tsx`, `buildDepartmentPriceListWorkbook.ts` — mostrar `unitDescription ?? unit`

## 5. Tests y verificación

- [x] 5.1 Actualizar fixtures de tests unitarios afectados por el nuevo campo `unitDescription` (products, reports, inventory)
- [x] 5.2 Agregar `SearchSatUnitsUseCase.test.ts`
- [x] 5.3 Actualizar `ProductEditModal.test.tsx` (mock de `useSatCatalogSearch`, flujo de selección en vez de texto libre)
- [x] 5.4 Correr suite completa (`npx jest`) — verde salvo 1 flakiness preexistente de DB compartida en paralelo, no relacionada
- [x] 5.5 Correr `tsc --noEmit` y `npm run build` — sin errores nuevos
- [x] 5.6 Actualizar y correr e2e Playwright (`admin-products-inventory.spec.ts`) contra servidor y DB reales — combobox de Unidad SAT verificado end-to-end (búsqueda por código, por descripción, selección)

## 6. Documentación OpenSpec

- [x] 6.1 Crear `proposal.md` (historia de usuario vía skill `user-stories`, why, what changes, capabilities, impact)
- [x] 6.2 Crear specs: `sat-unit-of-measure-api` (nueva capability) y delta de `products-api` (requirements modificados)
- [x] 6.3 Crear `design.md`
- [x] 6.4 Crear `tasks.md` (este archivo)
- [x] 6.5 `openspec validate add-sat-unit-of-measure --strict`
- [ ] 6.6 Archivar el change — **NO ejecutar hasta indicación explícita del usuario**
