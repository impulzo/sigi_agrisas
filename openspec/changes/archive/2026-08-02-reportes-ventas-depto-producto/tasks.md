## 1. Dominio

- [x] 1.1 `src/modules/reports/domain/value-objects/SalesCutFilters.ts` — agrega `ProductBreakdownRow extends BreakdownRow { quantitySold: number }`; agrega `byDepartment: BreakdownRow[]` y `byProduct: ProductBreakdownRow[]` a `SalesCutAggregates`.
- [x] 1.2 `src/modules/reports/domain/services/SalesCutAssembler.ts` — agrega `byDepartment`/`byProduct` a `AssembledSalesCut`, ordenados por `total DESC` (`sortByTotalDesc` generalizado con genérico `<T extends BreakdownRow>`).

## 2. Backend — repositorios

- [x] 2.1 `PrismaSalesCutRepository.getAggregates` — agrega `departmentRows`/`productRows` al `Promise.all` existente: `$queryRaw` agregando `sale_items` join `products`/`departments`, `WHERE` reusando `salesConds`, `ticketCount = COUNT(DISTINCT sale_id)`, `quantitySold = SUM(quantity)` (sólo productos).
- [x] 2.2 `InMemorySalesCutRepository` — `InMemCutSale.items?: InMemCutSaleItem[]` (opcional, backward-compatible con tests existentes), agrega `byDepartment`/`byProduct` acumulando por `saleIds: Set<string>` (ticketCount = tickets distintos).

## 3. Backend — DTO y controller

- [x] 3.1 `src/modules/reports/application/dto/SalesCutReportResponseDto.ts` — agrega `SalesCutProductBreakdownRowDto` (con `quantitySold`), `byDepartment`, `byProduct` a `SalesCutReportResponseDto`.
- [x] 3.2 `GetSalesCutReportUseCase.ts` (mapeo real de dominio → DTO, no `ReportsController` como se anotó originalmente) — agrega `productRowDto` y mapea `byDepartment`/`byProduct`.

## 4. PDF

- [x] 4.1 `SalesCutReportPdf.tsx` — 2 secciones nuevas ("Por departamento", "Por producto"), la segunda con columna de piezas.

## 5. Frontend

- [x] 5.1 `app/(private)/reports/sales-cut/_logic/types/api.ts` — agrega `quantitySold?: string` a `SalesCutBreakdownRowDto`, agrega `byDepartment`, `byProduct` a `SalesCutReportDto`.
- [x] 5.2 `BreakdownTable.tsx` — prop opcional `quantityHeader?: string`; cuando está presente, renderiza columna extra con `row.quantitySold`.
- [x] 5.3 `SalesCutPage.tsx` — agrega `<BreakdownTable title="Por departamento" .../>` y `<BreakdownTable title="Por producto" quantityHeader="Piezas" .../>`.

## 6. Tests

- [x] 6.1 `SalesCutAssembler.test.ts` (existente) — agrega caso para orden de `byDepartment`/`byProduct` preservando `quantitySold`.
- [x] 6.2 `GetSalesCutReportUseCase.test.ts` (existente) — mismo producto en 2 tickets → `quantitySold` sumado en una sola fila (4 = 2+2); venta `cancelled` con 99 piezas no cuenta.
- [x] 6.3 `BreakdownTable.test.tsx` (nuevo, no existía) — con `quantityHeader` muestra columna de piezas; sin él, no la muestra (no rompe las 4 tablas existentes); colSpan correcto en estado vacío.
- [x] 6.4 `SalesCutPage.test.tsx` (nuevo, no existía) — confirma que las 2 tablas nuevas se renderizan con datos mockeados.

## 7. Verificación

- [x] 7.1 `npm run build` OK.
- [x] 7.2 `npx jest` verde en los archivos tocados (122 tests, módulo `reports` completo sin regresiones).
- [x] 7.3 Smoke real contra BD de producción (con datos reales, sin crear datos de prueba): `GET /api/v1/admin/reports/sales-cut?from=2026-01-01&to=2026-08-02` — `byDepartment` agrega correctamente 3 departamentos (OTRAS LINEAS $3490.82, Departamento QA $332.00, TOYO $255.20, orden desc), `byProduct` agrega 5 productos con `quantitySold` correcto (ej. "Producto QA Billing" con `ticketCount=3`/`quantitySold=3.0000` a través de 3 tickets distintos — confirma `COUNT(DISTINCT sale_id)` y `SUM(quantity)` correctos), suma de `byDepartment.total` = `totals.grossSales` exacto ($4078.02). UI en `/reports/sales-cut` renderiza ambas tablas nuevas con columna "Piezas" en Por producto. Export PDF (`?format=pdf`) responde 200 `application/pdf` sin error de render.
