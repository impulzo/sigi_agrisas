## 1. Estilos base y componentes compartidos

- [x] 1.1 Reconstruir `reports/infrastructure/pdf/pdfStyles.ts` componiendo `pdfBaseStyles`/`pdfTheme`.
- [x] 1.2 Plegar el `cols` StyleSheet inline de `CashCutReportPdf.tsx` dentro de `reports/pdfStyles.ts` con nombres prefijados (`cashCut*`).
- [x] 1.3 Crear `src/modules/reports/infrastructure/pdf/ReportHeader.tsx`.
- [x] 1.4 Crear `src/modules/reports/infrastructure/pdf/ReportFooter.tsx` (formato "Página X de Y" fijo).

## 2. Migración de los 8 archivos (10 documentos) + AnticipoReceiptPdf

- [x] 2.1 `PaymentHistoryReportPdf.tsx` migrado — empty-state y filtros preservados.
- [x] 2.2 `ProviderPaymentsReportPdf.tsx` migrado — empty-state preservado.
- [x] 2.3 `PurchasesReportPdf.tsx` migrado — empty-state preservado.
- [x] 2.4 `SalesByProductReportPdf.tsx` migrado — empty-state preservado.
- [x] 2.5 `CollectionsReportPdf.tsx` migrado — empty-state preservado.
- [x] 2.6 `InventoryStockReportPdf.tsx` migrado — empty-state preservado; se removió el import no usado `pdf` de `@react-pdf/renderer`.
- [x] 2.7 `DepartmentPriceListReportPdf.tsx` migrado — ambos empty-states y `priceColumnNames` sin tocar.
- [x] 2.8 `AccountStatementPdf.tsx` (2 documentos) migrado — meta-líneas de filtros/saldos y empty-states preservados, `MovementRow`/`GroupSection` sin tocar.
- [x] 2.9 `CashCutReportPdf.tsx` migrado — `cols.*` reemplazado por `s.cashCut*`, footer normalizado a "Página X de Y", ambos empty-states preservados.
- [x] 2.10 `SalesCutReportPdf.tsx` migrado — 3 empty-states y todos los desgloses preservados.
- [x] 2.11 `AnticipoReceiptPdf.tsx` migrado — logo tamaño normal (cara-a-cliente), vía `<ReportHeader logoSize={40}>`.

## 3. Wiring en ReportsController

- [x] 3.1 `GetTicketSettingsUseCase` (requerido) agregado al constructor de `ReportsController`.
- [x] 3.2 Los 12 métodos con `renderToBuffer` obtienen `logoUrl` (una vez cada uno) y lo pasan al componente PDF.
- [x] 3.3 `GetTicketSettingsUseCase` instanciado en `reports/infrastructure/di/container.ts` y pasado a `reportsController`.

## 4. Verificación

- [x] 4.1 Render real (vía `tsx`, no mock) de `PaymentHistoryReportPdf`, `CashCutReportPdf`, `AccountStatementLedgerPdf` (sin movimientos) y `AnticipoReceiptPdf`: los 4 buffers `%PDF-` válidos, logo presente, sin errores.
- [x] 4.2 `ReportsController.test.ts` (que ya asertaba textos de empty-state exactos en varios casos) sigue en verde sin modificar sus expectativas — confirma cero cambios de copy salvo el footer de `CashCutReportPdf` (no cubierto por ese test file, verificado por lectura de código).
- [x] 4.3 Ningún filename/`Content-Disposition`/límite de 10,000 filas tocado en `ReportsController.ts` — únicos cambios fueron la inserción de `const { logoUrl } = ...` y el prop `logoUrl` agregado a cada `createElement`.
- [x] 4.4 `npx jest` completo: 493 suites / 3585 tests, todos pasan. `npx tsc --noEmit`: cero errores nuevos vs. baseline (se actualizaron 10 sitios de test en `ReportsController.test.ts` para pasar el nuevo `GetTicketSettingsUseCase`).

Con este change se completa la secuencia de 4 changes del feature "PDF unificado" (logo + colores de marca + reuso de código en los 13 documentos PDF del sistema).
