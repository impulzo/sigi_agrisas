## 1. Verificación y fusión de estilos

- [x] 1.1 Diff literal de `payments/infrastructure/pdf/pdfStyles.ts` vs `inventory/infrastructure/pdf/pdfStyles.ts`, confirmar cero divergencia de comportamiento en las claves compartidas (`page`, `title`, `subtitle`, `table`, `tableHeader`, `tableRow`, `tableRowEven`, `footer`, `emptyMsg`). Confirmado: idénticas; `headerCol` difiere solo en `fontSize` (8 vs 7) y queda local a cada módulo.
- [x] 1.2 Crear `src/shared/infrastructure/pdf/simpleListPdfStyles.ts` componiendo `pdfBaseStyles`/`pdfTheme` con esas claves, usando `pdfTheme.tertiary` para el header de tabla (reemplazo de `#1565C0`).
- [x] 1.3 Reconstruir `payments/infrastructure/pdf/pdfStyles.ts` para importar `simpleListPdfStyles` + mantener sus extras (`col*`, `filtersSection`, `chip`, `ticketHeader`, `totalsSection`, `totalsTitle`, `totalsRow`, `totalsLabel`, `totalsValue`, `headerCol`).
- [x] 1.4 Reconstruir `inventory/infrastructure/pdf/pdfStyles.ts` para importar `simpleListPdfStyles` + mantener sus extras (`col*`, `headerSection`, `headerCard*`, `headerCol`).

## 2. Logo en ambos PDFs

- [x] 2.1 Agregar prop `logoUrl: string | null` a `PaymentHistoryPdf`, renderizar `<PdfLogo>` junto al título.
- [x] 2.2 Agregar prop `logoUrl: string | null` a `KardexReportPdf`, renderizar `<PdfLogo>` junto al título.
- [x] 2.3 Instanciar `GetTicketSettingsUseCase` en `payments/infrastructure/di/container.ts` e inyectarlo en `PaymentsController`.
- [x] 2.4 Instanciar `GetTicketSettingsUseCase` en `inventory/infrastructure/di/container.ts` e inyectarlo en `InventoryMovementsController`.
- [x] 2.5 En `PaymentsController.ts` (línea ~474), obtener `logoUrl` después de los checks RBAC/branch-scope existentes, pasarlo a `PaymentHistoryPdf`.
- [x] 2.6 En `InventoryMovementsController.ts` (línea ~84), obtener `logoUrl` después de `enforceBranchScope`/`resolveScopedBranchId`, pasarlo a `KardexReportPdf`.

## 3. Verificación

- [x] 3.1 Render real (no mock, via `tsx`) de `PaymentHistoryPdf` y `KardexReportPdf` con datos representativos: ambos buffers `%PDF-` válidos, logo presente sin error.
- [x] 3.2 Confirmado escenario "sin datos" (`items: []`) de `PaymentHistoryPdf` renderiza sin error, texto de empty-state (`emptyMsg`) sin tocar.
- [x] 3.3 Filenames/`Content-Disposition` sin cambios — el refactor no tocó esas líneas en ningún controller.
- [x] 3.4 `npx jest` completo: 493 suites / 3583 tests, todos pasan. `npx tsc --noEmit`: cero errores nuevos vs. baseline (se actualizaron los tests de `PaymentsController`/`InventoryMovementsController` para pasar el nuevo `GetTicketSettingsUseCase` en el constructor).
