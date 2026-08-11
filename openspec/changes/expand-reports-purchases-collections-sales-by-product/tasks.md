## 1. RBAC / Seed

- [x] 1.1 Agregar 3 permisos nuevos al catálogo en `prisma/seed.ts`: `reports:purchases_read`, `reports:sales_by_product_read`, `reports:customer_collections_read` (junto a los demás `reports:*_read`)
- [x] 1.2 Asignar los 3 permisos a los bloques de rol `admin`, `operator` y `viewer` (mismo patrón que `reports:cash_cut_read`)
- [x] 1.3 Correr `npm run seed` localmente y verificar idempotencia (correr dos veces, sin duplicados)

## 2. Backend — Reporte de Compras (`reports-purchases-api`)

- [x] 2.1 `src/modules/reports/application/use-cases/GetPurchasesReportUseCase.ts` — reutiliza `PurchaseRepository`/`PrismaPurchaseRepository` (importado localmente en el DI de `reports`, patrón `pos/di` con `PrismaQuoteRepository`), filtros `branchId, providerId, status, from, to`, cap de filas tipo `PDF_ROW_LIMIT`/`ReportTooLarge`
- [x] 2.2 `src/modules/reports/infrastructure/repositories/PrismaProviderPaymentReportRepository.ts` — query directa a `prisma.providerPayment` con `include: {purchase, provider, branch}`, filtros `branchId, providerId, status, from, to`
- [x] 2.3 `src/modules/reports/application/use-cases/GetProviderPaymentsReportUseCase.ts` + DTO (`PurchasesReportResponseDto.ts`, `ProviderPaymentsReportResponseDto.ts`)
- [x] 2.4 `src/modules/reports/infrastructure/repositories/InMemoryProviderPaymentReportRepository.ts` (para tests)
- [x] 2.5 PDF: `src/modules/reports/infrastructure/pdf/PurchasesReportPdf.tsx`, `ProviderPaymentsReportPdf.tsx` (patrón `CashCutReportPdf.tsx`)
- [x] 2.6 Excel: `src/modules/reports/infrastructure/xlsx/buildPurchasesReportWorkbook.ts`, `buildProviderPaymentsReportWorkbook.ts` (patrón `buildCashCutWorkbook.ts`)
- [x] 2.7 Endpoints en `ReportsController.ts`: `GET /api/v1/admin/reports/purchases` y `GET /api/v1/admin/reports/purchases/provider-payments`, Zod query schema, `requirePermission("reports:purchases_read")`, `resolveScopedBranchId`, `?format=json|pdf|xlsx`
- [x] 2.8 Rutas Next.js: `app/api/v1/admin/reports/purchases/route.ts`, `app/api/v1/admin/reports/purchases/provider-payments/route.ts`
- [x] 2.9 Wirear en `src/modules/reports/infrastructure/di/container.ts`

## 3. Backend — Reporte de Ventas por Producto (`reports-sales-by-product-api`)

- [x] 3.1 `src/modules/reports/domain/value-objects/SalesByProductFilters.ts` (filtros + tipos de fila `byCustomer`/`byDepartment`/`byProduct` con `currentStock`)
- [x] 3.2 `src/modules/reports/infrastructure/repositories/PrismaSalesByProductRepository.ts` — `$queryRaw` sobre `sale_items JOIN sales JOIN products` (patrón `PrismaSalesCutRepository`) + `byCustomer` (join `customers`) + join `branch_inventory` para `currentStock`
- [x] 3.3 `src/modules/reports/domain/services/SalesByProductAssembler.ts` (puro, sin I/O, banker's rounding)
- [x] 3.4 `src/modules/reports/application/use-cases/GetSalesByProductReportUseCase.ts` + DTO
- [x] 3.5 `src/modules/reports/infrastructure/repositories/InMemorySalesByProductRepository.ts`
- [x] 3.6 PDF: `src/modules/reports/infrastructure/pdf/SalesByProductReportPdf.tsx`
- [x] 3.7 Excel: `src/modules/reports/infrastructure/xlsx/buildSalesByProductReportWorkbook.ts` (hojas Cliente/Departamento/Producto)
- [x] 3.8 Endpoint `GET /api/v1/admin/reports/sales-by-product` en `ReportsController.ts`, `requirePermission("reports:sales_by_product_read")`, `resolveScopedBranchId`
- [x] 3.9 Ruta Next.js `app/api/v1/admin/reports/sales-by-product/route.ts`
- [x] 3.10 Wirear en DI de `reports`

## 4. Backend — Reporte de Cobranza por Cliente (`reports-collections-api`)

- [x] 4.1 Extender `CashCutRawRow` en `src/modules/reports/domain/value-objects/CashCutFilters.ts` con `saleId: string` y `customerId: string`
- [x] 4.2 Extender `PrismaCashCutRepository.findRows` para seleccionar `saleId`/`customerId` (ya hace `include: {sale, customer, paymentMethod}`)
- [x] 4.3 `src/modules/reports/domain/services/CollectionsAssembler.ts` (puro, agrupa por `customerId` → `byCustomer` y por `saleId` → `byTicket`)
- [x] 4.4 `src/modules/reports/application/use-cases/GetCollectionsReportUseCase.ts` (reusa `CashCutRepository` ya wireado) + DTO
- [x] 4.5 Verificar que `InMemoryCashCutRepository.ts` expone `saleId`/`customerId` en sus fixtures (para tests del nuevo use case)
- [x] 4.6 PDF: `src/modules/reports/infrastructure/pdf/CollectionsReportPdf.tsx` (agrupa por cliente, sub-agrupa por ticket — patrón `PaymentHistoryPdf.tsx` de `payments/`)
- [x] 4.7 Excel: `src/modules/reports/infrastructure/xlsx/buildCollectionsReportWorkbook.ts` (hojas: detalle, byCustomer, byTicket)
- [x] 4.8 Endpoint `GET /api/v1/admin/reports/customer-collections` en `ReportsController.ts`, `requirePermission("reports:customer_collections_read")`, `resolveScopedBranchId`, `from`/`to` obligatorios
- [x] 4.9 Ruta Next.js `app/api/v1/admin/reports/customer-collections/route.ts`
- [x] 4.10 Wirear en DI de `reports`

## 5. Backend — Extensión Corte de Ventas (detalle de tickets + Excel)

- [x] 5.1 Agregar `salesList: SaleListRow[]` a `SalesCutAggregates` en `src/modules/reports/domain/value-objects/SalesCutFilters.ts`
- [x] 5.2 Agregar `sale.findMany` (mismos filtros/rango, `status IN completed,edited`) al `Promise.all` de `PrismaSalesCutRepository.getAggregates`, mapear a `saleId, folioCode, customerName, total, paymentMethodName`, orden descendente por fecha
- [x] 5.3 Propagar `salesList` en `SalesCutAssembler`, `SalesCutReportResponseDto` y `GetSalesCutReportUseCase`
- [x] 5.4 Agregar tabla de detalle de tickets a `SalesCutReportPdf.tsx`
- [x] 5.5 `src/modules/reports/infrastructure/xlsx/buildSalesCutWorkbook.ts` (hojas: totales, por método, día, cajero, sucursal, departamento, producto, detalle tickets)
- [x] 5.6 Agregar `xlsx` al `formatEnum` del endpoint `sales-cut` en `ReportsController.ts` y wirear `buildSalesCutWorkbook`
- [x] 5.7 Actualizar `InMemorySalesCutRepository.ts` para incluir `salesList` en sus fixtures de test

## 6. Backend — Extensión Estados de Cuenta (Excel)

- [x] 6.1 `src/modules/reports/infrastructure/xlsx/buildAccountStatementsSummaryWorkbook.ts` (una fila por cliente, columnas de la tabla resumen)
- [x] 6.2 `src/modules/reports/infrastructure/xlsx/buildAccountStatementLedgerWorkbook.ts` (una fila por movimiento, columnas de la tabla de movimientos incl. Serie/Factura/Vencimiento/Referencia/F.Pgo)
- [x] 6.3 Agregar `xlsx` al `formatEnum` de los endpoints `account-statements` (summary) y `account-statements/:customerId` (ledger) en `ReportsController.ts`, respetando `LEDGER_PDF_MAX_ROWS`/`ReportTooLarge` también para `xlsx`

## 7. Frontend — Hub

- [x] 7.1 Agregar 3 tarjetas nuevas a `app/(private)/reports/_blocks/ReportsHubPage.tsx` ("Compras", "Ventas por Producto", "Cobranza por Cliente"), cada una gated por su permiso

## 8. Frontend — Reporte de Compras

- [x] 8.1 `app/(private)/reports/purchases/page.tsx` (Server Component, `metadata`)
- [x] 8.2 `_blocks/PurchasesReportPage.tsx` con `SegmentedButton` "Compras \| Pagos a Proveedores"
- [x] 8.3 `_blocks/PurchasesFilters.tsx`, `_blocks/ProviderPaymentsFilters.tsx`, tablas correspondientes, reusar `CatalogPagination`
- [x] 8.4 `_logic/hooks/usePurchasesReport.ts`, `useProviderPaymentsReport.ts` (patrón `useCashCut.ts`, exponen `exportPdf`/`exportXlsx`)
- [x] 8.5 `_logic/services/index.ts`, `_logic/types/api.ts`, `_logic/types/domain.ts`

## 9. Frontend — Reporte de Ventas por Producto

- [x] 9.1 `app/(private)/reports/sales-by-product/page.tsx`
- [x] 9.2 `_blocks/SalesByProductPage.tsx` con `SegmentedButton` de agrupación Cliente\|Departamento\|Producto y tarjeta de Total
- [x] 9.3 `_blocks/SalesByProductFilters.tsx`, tabla con columna de stock actual en modo Producto
- [x] 9.4 `_logic/hooks/useSalesByProductReport.ts`, `_logic/services/`, `_logic/types/`

## 10. Frontend — Reporte de Cobranza por Cliente

- [x] 10.1 `app/(private)/reports/customer-collections/page.tsx`
- [x] 10.2 `_blocks/CustomerCollectionsPage.tsx` con `SegmentedButton` "Por Cliente \| Por Ticket"
- [x] 10.3 `_blocks/CollectionsFilters.tsx`, tablas `byCustomer`/`byTicket` — evaluar reuso de `CollectionsRowsTable.tsx` (`../cash-cut/_blocks/`) para el detalle plano si el shape de fila coincide
- [x] 10.4 `_logic/hooks/useCustomerCollectionsReport.ts`, `_logic/services/`, `_logic/types/`

## 11. Frontend — Extensión Corte de Ventas

- [x] 11.1 Agregar tabla "Detalle de tickets" (Ticket\|Cliente\|Importe\|Forma de Pago) a `app/(private)/reports/sales-cut/_blocks/SalesCutPage.tsx`
- [x] 11.2 Agregar botón "Exportar Excel" junto al "Exportar PDF" existente; extender `_logic/services/`, `_logic/types/api.ts` con `salesList`

## 12. Frontend — Extensión Estados de Cuenta

- [x] 12.1 Agregar botón "Exportar Excel" a `StatementToolbar.tsx`/`SummaryTable.tsx` (resumen) y a `LedgerControls.tsx`/`LedgerHeader.tsx` (libro mayor)
- [x] 12.2 Extender `_logic/hooks/useAccountStatementsSummary.ts` y `useAccountStatementLedger.ts` con `exportXlsx()`, `_logic/services/index.ts` con `downloadXxxXlsx`

## 13. Tests unitarios

- [x] 13.1 `SalesByProductAssembler.test.ts`, `CollectionsAssembler.test.ts` — vectores de equivalencia con banker's rounding (`tests/unit/modules/reports/domain/`)
- [x] 13.2 Tests de use cases nuevos con InMemory repos (`GetPurchasesReportUseCase`, `GetProviderPaymentsReportUseCase`, `GetSalesByProductReportUseCase`, `GetCollectionsReportUseCase`) en `tests/unit/modules/reports/application/use-cases/`
- [x] 13.3 Extender `ReportsController.test.ts` — 4 endpoints nuevos (formatos, 400 en `format` inválido, 401/403, branch scoping) + endpoints extendidos (`sales-cut` con `xlsx`, `account-statements` con `xlsx`)
- [x] 13.4 Actualizar `GetSalesCutReportUseCase.test.ts` y `SalesCutAssembler.test.ts` para cubrir `salesList`
- [x] 13.5 Tests RTL de las 3 páginas nuevas (patrón `SalesCutPage.test.tsx`) en `tests/unit/ui/(private)/reports/`

## 14. Tests Playwright (UI real)

- [x] 14.1 Flujo `/reports/purchases`: filtros → alternar secciones → export PDF/Excel real (verificar descarga)
- [x] 14.2 Flujo `/reports/sales-by-product`: filtros → alternar agrupación → export PDF/Excel
- [x] 14.3 Flujo `/reports/customer-collections`: filtros → alternar Por Cliente/Por Ticket → export PDF/Excel
- [x] 14.4 Regresión `/reports/sales-cut`: tabla de detalle de tickets visible + export Excel nuevo funciona sin romper el export PDF existente
- [x] 14.5 Regresión `/reports/account-statements` y `/reports/account-statements/[customerId]`: export Excel nuevo funciona
- [x] 14.6 Verificar gating de permisos: usuario sin cada permiso nuevo no ve la tarjeta correspondiente en el hub

## 15. Verificación final

- [x] 15.1 `npm test` en verde
- [x] 15.2 `npm run build` sin errores de tipos
- [x] 15.3 `npm run seed` idempotente (correr 2 veces)
- [x] 15.4 `openspec validate expand-reports-purchases-collections-sales-by-product --strict`
- [x] 15.5 `opsx:verify` sobre el change antes de archivar
