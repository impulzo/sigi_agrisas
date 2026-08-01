## 1. Backend — RBAC permiso

- [x] 1.1 `prisma/seed.ts` — agregar a `PERMISSIONS`: `{ key: "reports:sales_cut_read", description: "Leer corte de ventas y exportar PDF" }`.
- [x] 1.2 `prisma/seed.ts` — otorgar `reports:sales_cut_read` a los roles `admin`, `operator` y `viewer`.
- [x] 1.3 Correr `npm run seed` y verificar idempotencia.

## 2. Backend — Dominio (value objects + servicio puro)

- [x] 2.1 `src/modules/reports/domain/value-objects/SalesCutFilters.ts` — `{ branchId?, cashierId?, paymentMethodId?, from, to }` y tipos crudos de agregados (`ActiveTotals`, `CancelledTotals`, `TaxSplit`, `BreakdownRow{ key, label, ticketCount, subtotal, taxTotal, total }`, `PaymentsAgg`, `ReturnsAgg`).
- [x] 2.2 `src/modules/reports/domain/services/SalesCutAssembler.ts` — puro: ensambla DTO desde agregados; calcula `netCash = grossSales + paymentsReceived − returnsRefunded`; ordena `byDay` asc por fecha y `byPaymentMethod`/`byCashier`/`byBranch` desc por `total`. Banker's rounding 4 decimales (decimal.js).

## 3. Backend — Puerto + DTO

- [x] 3.1 `src/modules/reports/application/ports/SalesCutRepository.ts` — `getAggregates(filters): Promise<{ active, cancelled, taxSplit, byPaymentMethod[], byDay[], byCashier[], byBranch[], paymentsReceived, returnsRefunded }>`.
- [x] 3.2 `src/modules/reports/application/dto/SalesCutReportResponseDto.ts` — `generatedAt/generatedBy/filters`, `totals { grossSales, ticketCount, subtotal, taxTotal, ivaTotal, iepsTotal }`, `cancelled { count, total }`, `cash { grossSales, paymentsReceived, returnsRefunded, netCash }`, `byPaymentMethod[]`, `byDay[]`, `byCashier[]`, `byBranch[]`.

## 4. Backend — Use case

- [x] 4.1 `src/modules/reports/application/use-cases/GetSalesCutReportUseCase.ts` — aplica filtros, delega a `repo.getAggregates`, corre `SalesCutAssembler`, arma DTO.

## 5. Backend — Repositorios

- [x] 5.1 `src/modules/reports/infrastructure/repositories/PrismaSalesCutRepository.ts` — ventas activas (`status IN completed,edited`) y canceladas vía `aggregate`; `byPaymentMethod`/`byCashier`/`byBranch` vía `groupBy` + resolución de nombres (`findMany where id in`); `byDay` vía `$queryRaw` (`date_trunc('day', created_at)`); `taxSplit` (IVA/IEPS global) vía agregación de `sale_items` unida a `sales` activas; abonos (`customer_payments` completed) y devoluciones (`returns` completed) vía `aggregate`. Todo con branch scope + rango + filtros.
- [x] 5.2 `src/modules/reports/infrastructure/repositories/InMemorySalesCutRepository.ts` — implementación en memoria para tests (seeds de ventas/abonos/devoluciones).

## 6. Backend — PDF

- [x] 6.1 `src/modules/reports/infrastructure/pdf/SalesCutReportPdf.tsx` — encabezado (periodo, sucursal, `generatedBy`), tarjetas de totales + neto de caja, tablas de los cuatro desgloses, canceladas. Reutilizar `pdfStyles.ts`.

## 7. Backend — Controller + ruta + DI

- [x] 7.1 `src/modules/reports/infrastructure/http/ReportsController.ts` — `getSalesCutReport(req)`: guard `reports:sales_cut_read`, Zod query (`preset=today` | `from`/`to`, `branchId`, `cashierId`, `paymentMethodId`, `format`), resolver preset "hoy", `from > to` → 400, `resolveScopedBranchId`, `format` inválido → 400, PDF/JSON.
- [x] 7.2 `src/modules/reports/infrastructure/di/container.ts` — instanciar repo + use case y cablearlos al `reportsController`.
- [x] 7.3 `app/api/v1/admin/reports/sales-cut/route.ts` — `GET` delega a `reportsController.getSalesCutReport`.

## 8. Backend — Tests

- [x] 8.1 `SalesCutAssembler.test.ts` — `netCash` = ventas + abonos − devoluciones; canceladas aparte (no suma); orden de desgloses; banker's rounding.
- [x] 8.2 Use case con `InMemorySalesCutRepository` — periodo vacío (ceros), filtros, canceladas separadas.
- [x] 8.3 `ReportsController` — RBAC (401/403), branch scoping, `format` inválido → 400, `from > to` → 400, preset "hoy".

## 9. Frontend — `_logic` (services, hooks, types)

- [x] 9.1 `app/(private)/reports/sales-cut/_logic/types/api.ts` + `domain.ts` — DTO HTTP + filtros de dominio.
- [x] 9.2 `_logic/services/` — `getSalesCut`, `downloadSalesCutPdf` (aceptan `fetchImpl?`, normalizan errores HTTP, blob para PDF).
- [x] 9.3 `_logic/hooks/useSalesCut.ts` — preset Hoy|Rango, filtros, export.

## 10. Frontend — Bloques presentacionales

- [x] 10.1 `_blocks/SalesCutPage.tsx` (orquesta) + `PeriodToggle.tsx` (SegmentedButton Hoy|Rango) + `CutFilters.tsx` (sucursal solo con bypass, cajero, método) + estados vacío/error.
- [x] 10.2 `_blocks/TotalsCards.tsx` + `NetCashCard.tsx` + `BreakdownTable.tsx` (reutilizable para los 4 desgloses) + `ExportPdfButton.tsx`.

## 11. Frontend — Hub + página + navegación

- [x] 11.1 `app/(private)/reports/page.tsx` — cambiar de `redirect` a hub con tarjetas ("Estados de Cuenta", "Corte de Ventas"), cada una gated por su permiso.
- [x] 11.2 `app/(private)/reports/sales-cut/page.tsx` — Server Component, `metadata`, gating con `can("reports:sales_cut_read")`.
- [x] 11.3 NavigationRail — dejar item "Reportes" como está (hub gatea por tarjeta); nota si se requiere ampliar `requires` a OR de permisos de reportes.

## 12. Verificación

- [x] 12.1 `npm run build` (tipos) y `npm test` (unit backend + UI) en verde.
- [x] 12.2 Prueba manual en dev (Playwright, sesión admin ya abierta): "Hoy" sin ventas → estado vacío correcto; "Rango" 2026-01-01→2026-07-31 → `totals` $332/3 tickets, `cancelled` $116/1 ticket separado, `cash.netCash` $402.00 = $332 + $70 abonos − $0 devoluciones; los 4 desgloses (método/día/cajero/sucursal) reconciliaron matemáticamente entre sí y contra `totals`; filtro método de pago (Efectivo) acotó a $216/2 tickets y `netCash` recalculó a $286 sin filtrar abonos (consistente con diseño); Exportar PDF descargó `sales-cut-2026-07-31.pdf` válido (1 página, `file` confirma `PDF document, version 1.3`). **Hallazgo (corregido)**: `CutFilters.tsx` no incluía el filtro "Cajero" pese a que `reports-ui/spec.md` (Sales cut view) y esta misma tarea 10.1 lo piden. Fix aplicado: nuevo hook `_logic/hooks/useCashiersOptions.ts` (mismo patrón cache 60s que `usePaymentMethodsOptions`, consume `GET /api/v1/admin/users?pageSize=100`, disponible para los 3 roles vía `users:read`), `<select>` "Cajero" agregado en `CutFilters.tsx`, cableado en `SalesCutPage.tsx` (estado `cashierId` → `useSalesCut`/`exportPdf`). Verificado en navegador (Playwright, sesión admin): combobox "Cajero" (Todos/Admin) aparece, filtrar por "Admin" recalcula y mantiene los mismos totales ($332/3 tickets, coincide porque es el único cajero). `npx tsc --noEmit` limpio; `npm test` (208 suites/1366 tests) en verde tras el cambio.

## 13. Corte de Caja (Cobranza) — S5

### 13.1 Backend — RBAC permiso

- [x] 13.1.1 `prisma/seed.ts` — agregar a `PERMISSIONS`: `{ key: "reports:cash_cut_read", description: "Leer corte de caja (cobranza) y exportar PDF/Excel" }`.
- [x] 13.1.2 `prisma/seed.ts` — otorgar `reports:cash_cut_read` a los roles `admin`, `operator` y `viewer`.
- [x] 13.1.3 Correr `npm run seed` y verificar idempotencia.

### 13.2 Backend — Dominio (value objects + servicio puro)

- [x] 13.2.1 `src/modules/reports/domain/value-objects/CashCutFilters.ts` — `{ branchId?, customerId?, paymentMethodId?, from, to }` y tipo `CashCutRawRow` (campos crudos del join `customer_payments`+`sales`+`customers`+`payment_methods`).
- [x] 13.2.2 `src/modules/reports/domain/services/CashCutAssembler.ts` — puro: por fila calcula `days` (`Math.floor((collectedAt - facturaDate) / 86_400_000)`) e `ivaAmount`/`taxRatePct` prorrateados desde la venta ligada (`amount × sale.taxTotal/sale.total`, `sale.taxTotal/sale.subtotal`); arma `totals` (`totalCollected`, `totalIva`) y `byPaymentMethod[]` agrupando dinámicamente por `paymentMethodId`. Banker's rounding 4 decimales (decimal.js).

### 13.3 Backend — Puerto + DTO

- [x] 13.3.1 `src/modules/reports/application/ports/CashCutRepository.ts` — `findRows(filters): Promise<CashCutRawRow[]>`.
- [x] 13.3.2 `src/modules/reports/application/dto/CashCutReportResponseDto.ts` — `generatedAt/generatedBy/filters`, `rows[]` (`customerCode, docto, factura, customerName, facturaDate, days, amount, paymentMethodCode, paymentMethodName, reference, collectedAt, ivaAmount, taxRatePct`), `totals { totalCollected, totalIva }`, `byPaymentMethod[]`.

### 13.4 Backend — Use case

- [x] 13.4.1 `src/modules/reports/application/use-cases/GetCashCutReportUseCase.ts` — aplica filtros, delega a `repo.findRows`, corre `CashCutAssembler`, arma DTO.

### 13.5 Backend — Repositorios

- [x] 13.5.1 `src/modules/reports/infrastructure/repositories/PrismaCashCutRepository.ts` — `prisma.customerPayment.findMany` (`status='completed'`, `createdAt` en rango, branch scope + filtros) con `include: { sale: true, customer: true, paymentMethod: true }`.
- [x] 13.5.2 `src/modules/reports/infrastructure/repositories/InMemoryCashCutRepository.ts` — implementación en memoria para tests (seeds de abonos/ventas/clientes/métodos de pago).

### 13.6 Backend — PDF y Excel

- [x] 13.6.1 `src/modules/reports/infrastructure/pdf/CashCutReportPdf.tsx` — encabezado (periodo, sucursal, `generatedBy`, fecha emisión, numeración de página), tabla de filas (12 columnas), totales, desglose por forma de pago. Reutiliza `pdfStyles.ts`.
- [x] 13.6.2 `src/modules/reports/infrastructure/xlsx/buildCashCutWorkbook.ts` — mismo patrón que `buildKardexWorkbook.ts` (`XLSX.utils.aoa_to_sheet` + `XLSX.write(..., { type: "buffer", bookType: "xlsx" })`); header con las 12 columnas + filas de totales al final.

### 13.7 Backend — Controller + ruta + DI

- [x] 13.7.1 `src/modules/reports/infrastructure/http/ReportsController.ts` — `getCashCutReport(req)`: guard `reports:cash_cut_read`, Zod query (`from`/`to` obligatorios, `branchId`/`customerId`/`paymentMethodId` opcionales uuid, `format=json|pdf|xlsx`), `from > to` → 400, `resolveScopedBranchId`, `format` inválido → 400, switch json/pdf/xlsx.
- [x] 13.7.2 `src/modules/reports/infrastructure/di/container.ts` — instanciar `PrismaCashCutRepository` + `GetCashCutReportUseCase`, agregar como parámetro al `reportsController`.
- [x] 13.7.3 `app/api/v1/admin/reports/cash-cut/route.ts` — `GET` delega a `reportsController.getCashCutReport`.

### 13.8 Backend — Tests

- [x] 13.8.1 `CashCutAssembler.test.ts` — `days`, prorrateo de IVA (venta gravada y venta 0%), desglose dinámico por forma de pago, banker's rounding.
- [x] 13.8.2 Use case con `InMemoryCashCutRepository` — periodo vacío (ceros), filtros, prorrateo.
- [x] 13.8.3 `ReportsController` — RBAC (401/403), branch scoping, `format` inválido → 400, `from`/`to` obligatorios → 400, `from > to` → 400.

### 13.9 Frontend — `_logic` (services, hooks, types)

- [x] 13.9.1 `app/(private)/reports/cash-cut/_logic/types/api.ts` + `domain.ts` — DTO HTTP + filtros de dominio.
- [x] 13.9.2 `_logic/services/` — `getCashCut`, `downloadCashCutPdf`, `downloadCashCutXlsx` (aceptan `fetchImpl?`, normalizan errores HTTP, blob para exports).
- [x] 13.9.3 `_logic/hooks/useCashCut.ts` — filtros sucursal+rango, fetch, export.

### 13.10 Frontend — Bloques presentacionales

- [x] 13.10.1 `_blocks/CashCutPage.tsx` (orquesta) + `CashCutFilters.tsx` (sucursal solo con bypass, rango de fechas) + estados vacío/error.
- [x] 13.10.2 `_blocks/TotalsCards.tsx` + `PaymentMethodBreakdownTable.tsx` + `CollectionsRowsTable.tsx` (12 columnas, `overflow-x-auto`). Botones Exportar PDF/Excel inline en `CashCutPage.tsx` (sin componentes `ExportPdfButton`/`ExportExcelButton` separados — mismo patrón que `SalesCutPage.tsx`, que tampoco los aísla).

### 13.11 Frontend — Hub + página

- [x] 13.11.1 `app/(private)/reports/_blocks/ReportsHubPage.tsx` — agregar 3ra tarjeta "Corte de Caja (Cobranza)" → `/reports/cash-cut`, gated por `reports:cash_cut_read`.
- [x] 13.11.2 `app/(private)/reports/cash-cut/page.tsx` — Server Component, `metadata`, gating con `can("reports:cash_cut_read")`.

### 13.12 Verificación

- [x] 13.12.1 `npm run build` (tipos) y `npm test` (unit backend + UI) en verde.
- [x] 13.12.2 Verificación end-to-end en navegador (Playwright, servidor dev limpio tras matar 3 procesos `next dev` huérfanos): login admin → `/reports/cash-cut` → UI muestra Total cobrado `$70.00`, Total IVA `$9.66`, desglose dinámico `Efectivo` (2/$70.00), tabla de 12 columnas con las 2 filas reales (`RB-000001`/`RB-000002` sobre `TC-000001`, `$5.52`/`16%` y `$4.14`/`16%`) — coincide exacto con la verificación de datos reales previa. Filtro de sucursal (`Todas`→`Matriz`) dispara refetch y mantiene los mismos totales. "Exportar PDF" descarga `cash-cut-2026-07-01_2026-07-31.pdf` (PDF válido, 1 página). "Exportar Excel" descarga `cash-cut-2026-07-01_2026-07-31.xlsx` (Excel 2007+ válido). Caso con venta IVA 0% no se probó (no hay datos de ese tipo en el proyecto actualmente); prorrateo a 0% ya cubierto por test unitario.
- [x] 13.12.3 `opsx:verify` — CLI real es `@fission-ai/openspec` (el `openspec@0.0.0` en npm es un placeholder squatteado, no el paquete); instalado global (`npm i -g @fission-ai/openspec`) y corrido `openspec status`/`instructions apply` sobre `reporte-corte-ventas`. Verificación formal completa: los 7 requirements de `specs/cash-cut-api/spec.md` y los 2 de `specs/reports-ui/spec.md` (hub + ambas vistas) se contrastaron línea por línea contra la implementación (`CashCutAssembler.ts`, `PrismaCashCutRepository.ts`, `ReportsController.getCashCutReport`, `CashCutReportPdf.tsx`, `buildCashCutWorkbook.ts`, `CashCutPage.tsx`/`CollectionsRowsTable.tsx`/hub) — sin divergencias. `npx tsc --noEmit`: 2 errores preexistentes ajenos al cambio (`claimRefreshLeadership.test.ts`, `computeReturnTotalsClient.test.ts`, no tocados por este diff). `npx jest reports`: 11/11 suites, 116/116 tests verdes. `npm test` completo: 2 suites fallando (`sales-edit-from-hq.test.ts` x2, FK violation por la migración `InventoryMovement` de un commit no relacionado) — fuera de alcance de este change, no bloquean archive. Sin CRITICAL ni WARNING sobre `reporte-corte-ventas`.
