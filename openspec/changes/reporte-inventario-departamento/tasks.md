## 1. Backend — capa de dominio y aplicación

- [x] 1.1 Crear `src/modules/reports/domain/value-objects/DepartmentPriceListFilters.ts` con `{ departmentId?: string | null }`
- [x] 1.2 Crear `src/modules/reports/application/ports/DepartmentPriceListRepository.ts`: `RawPriceListRow` (departmentId, departmentCode, departmentName, productId, code, name, unit, ivaRate, iepsRate, priceId, priceName, price, minQuantity, discountPct, isDefault) + `findRows(filters)`
- [x] 1.3 Crear `src/modules/reports/application/dto/DepartmentPriceListResponseDto.ts` (departments → products → prices + subtotals/totals)
- [x] 1.4 Crear `src/modules/reports/application/use-cases/GetDepartmentPriceListReportUseCase.ts` que agrupa filas crudas en el DTO, serializa `Decimal` a string, nullable a `null`, y calcula subtotales/totales

## 2. Backend — infraestructura

- [x] 2.1 Crear `src/modules/reports/infrastructure/repositories/PrismaDepartmentPriceListRepository.ts` (`prisma.product.findMany` con include de department + prices, orden depto → producto → precio)
- [x] 2.2 Crear `src/modules/reports/infrastructure/repositories/InMemoryDepartmentPriceListRepository.ts` (filtro por departmentId para tests)
- [x] 2.3 Crear `src/modules/reports/infrastructure/pdf/DepartmentPriceListReportPdf.tsx` (patrón `InventoryStockReportPdf`, grupos por producto con filas de precio)
- [x] 2.4 Crear `src/modules/reports/infrastructure/xlsx/buildDepartmentPriceListWorkbook.ts` (patrón `buildCashCutWorkbook`, una fila por precio + subtotales/totales)
- [x] 2.5 Agregar en `ReportsController.ts` el schema `departmentPriceListQuerySchema` y el método `getDepartmentPriceListReport` (requirePermission → Zod → use case → json/pdf/xlsx)
- [x] 2.6 Cablear repo + use case + método en `src/modules/reports/infrastructure/di/container.ts`
- [x] 2.7 Crear la ruta `app/api/v1/admin/reports/inventory/by-department/route.ts`

## 3. Frontend — hook global y UI del reporte

- [x] 3.1 Promover `useDepartmentsOptions` a `app/_hooks/useDepartmentsOptions.ts` y actualizar imports en `ProductsPage.tsx`, `ProductDetailPage.tsx`, `ProductGeneralTab.tsx`; borrar el archivo de `catalogs/products/_logic/hooks/`
- [x] 3.2 Crear `app/(private)/reports/inventory-by-department/page.tsx` (Server Component con `metadata`)
- [x] 3.3 Crear `_logic/types/api.ts` y `_logic/types/domain.ts`
- [x] 3.4 Crear `_logic/services/index.ts` (`getDepartmentPriceList`, `downloadDepartmentPriceListPdf`, `downloadDepartmentPriceListXlsx`)
- [x] 3.5 Crear `_logic/hooks/useDepartmentPriceList.ts` (fetch + flags de export + `triggerDownload`)
- [x] 3.6 Crear `_blocks/DepartmentFilter.tsx` (select de departamentos activos)
- [x] 3.7 Crear `_blocks/PriceListTable.tsx` (tabla agrupada por producto, presentacional)
- [x] 3.8 Crear `_blocks/InventoryByDepartmentPage.tsx` (orquestación + gating por permiso)
- [x] 3.9 Agregar tarjeta "Inventario por Departamento" en `_blocks/ReportsHubPage.tsx` gated por `reports:inventory_read`

## 4. Tests

- [x] 4.1 `tests/unit/modules/reports/application/use-cases/GetDepartmentPriceListReportUseCase.test.ts`: agrupación, subtotales/totales, producto sin precios, nullable, vacío, filtro departmentId
- [x] 4.2 `tests/unit/modules/reports/infrastructure/repositories/InMemoryDepartmentPriceListRepository.test.ts`: filtro por departmentId
- [x] 4.3 Agregar tests de `getDepartmentPriceListReport` en `tests/unit/modules/reports/infrastructure/http/ReportsController.test.ts` (401/403/400/200 json/pdf/xlsx) con mocks de PDF
- [x] 4.4 Test UI jsdom `tests/unit/ui/(private)/reports/inventory-by-department/` (render, gating sin permiso, tabla con precios, export)

## 5. Verificación

- [x] 5.1 `npm test` en verde
- [x] 5.2 `npm run build` en verde
- [x] 5.3 Verificación manual con Playwright: hub → tarjeta → página → seleccionar departamento → tabla agrupada → exportar PDF y XLSX
