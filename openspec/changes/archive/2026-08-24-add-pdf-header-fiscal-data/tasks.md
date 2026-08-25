## 1. Reports: ReportHeader compartido

- [x] 1.1 `src/modules/reports/infrastructure/pdf/ReportHeader.tsx`: reemplazar el prop `logoUrl?: string | null` por `issuer: PdfIssuer`; renderizar `businessName` (si existe), `businessAddress` (si existe) y `businessRfc` (si existe) junto al logo, con el mismo layout de `issuerRow`/`issuerBlock`/`issuerName`/`issuerMeta` ya usado en `QuotePdf.tsx`. Omitir cada línea cuando su campo sea `null` — no renderizar "null"/"undefined".
- [x] 1.2 `src/modules/reports/infrastructure/pdf/pdfStyles.ts`: agregar los estilos `issuerRow`/`issuerBlock`/`issuerName`/`issuerMeta` (o reutilizar los ya existentes en `quotes/infrastructure/pdf/pdfStyles.ts` como referencia), componiendo `pdfBaseStyles`/`pdfTheme` igual que el resto del archivo.
- [x] 1.3 Actualizar los 11 archivos consumidores para pasar `issuer: PdfIssuer` en vez de `logoUrl` a `ReportHeader`: `AccountStatementPdf.tsx` (ambos exports, `AccountStatementSummaryPdf` y `AccountStatementLedgerPdf`), `AnticipoReceiptPdf.tsx`, `CashCutReportPdf.tsx`, `CollectionsReportPdf.tsx`, `DepartmentPriceListReportPdf.tsx`, `InventoryStockReportPdf.tsx`, `PaymentHistoryReportPdf.tsx`, `ProviderPaymentsReportPdf.tsx`, `PurchasesReportPdf.tsx`, `SalesByProductReportPdf.tsx`, `SalesCutReportPdf.tsx` — en cada uno, el prop del componente cambia de `logoUrl?: string | null` a `issuer: PdfIssuer`.
- [x] 1.4 Confirmar que `AnticipoReceiptPdf.tsx` conserva el folio en su título (`Recibo de Anticipo — {payment.folio}`) y el bloque de cliente en el cuerpo, sin moverlos al header.
- [x] 1.5 Confirmar que `AccountStatementPdf.tsx` (`AccountStatementLedgerPdf`) conserva el nombre del cliente en su título (`Estado de Cuenta — {customer.name}`).

## 2. Reports: controller

- [x] 2.1 `src/modules/reports/infrastructure/http/ReportsController.ts`: en los 11 call sites que hoy hacen `const { logoUrl } = await this.getTicketSettingsUseCase.execute()`, cambiar a `const settings = await this.getTicketSettingsUseCase.execute(); const issuer = toPdfIssuer(settings);` y pasar `issuer` (en vez de `logoUrl`) a cada `createElement(...)`.
- [x] 2.2 Importar `toPdfIssuer` desde `@/shared/infrastructure/pdf/pdfIssuer` en `ReportsController.ts`.

## 3. Payments: header inline

- [x] 3.1 `src/modules/payments/infrastructure/pdf/PaymentHistoryPdf.tsx`: cambiar el prop `logoUrl?: string | null` por `issuer: PdfIssuer`; agregar `businessName`/`businessAddress`/`businessRfc` junto al `<PdfLogo>` ya existente, omitiendo líneas con valor `null`.
- [x] 3.2 `src/modules/payments/infrastructure/pdf/pdfStyles.ts`: agregar los estilos necesarios para el bloque de emisor extendido, componiendo `pdfBaseStyles`/`pdfTheme` (o `simpleListPdfStyles`) como el resto del archivo.
- [x] 3.3 `src/modules/payments/infrastructure/http/PaymentsController.ts`: en el call site del PDF de historial, cambiar de pedir solo `logoUrl` a construir `issuer` vía `toPdfIssuer(settings)` y pasarlo al componente.

## 4. Inventory: header inline

- [x] 4.1 `src/modules/inventory/infrastructure/pdf/KardexReportPdf.tsx`: cambiar el prop `logoUrl?: string | null` por `issuer: PdfIssuer`; agregar `businessName`/`businessAddress`/`businessRfc` junto al `<PdfLogo>` ya existente, sin alterar el layout de las 4 tarjetas de resumen (existencia total/almacén/saldo anterior/saldo final).
- [x] 4.2 `src/modules/inventory/infrastructure/pdf/pdfStyles.ts`: agregar los estilos necesarios, componiendo `pdfBaseStyles`/`pdfTheme` (o `simpleListPdfStyles`).
- [x] 4.3 `src/modules/inventory/infrastructure/http/InventoryMovementsController.ts`: en el call site del PDF de kardex, cambiar de pedir solo `logoUrl` a construir `issuer` vía `toPdfIssuer(settings)` y pasarlo al componente.

## 5. Verificación

- [x] 5.1 `npm run build` (type-check) pasa sin errores tras 1-4 — el cambio de firma de `ReportHeader`/`PaymentHistoryPdf`/`KardexReportPdf` de `logoUrl` a `issuer` debe compilar en los 13 archivos afectados a la vez.
- [x] 5.2 `npm test` — confirmar que los tests existentes de `ReportsController`, `PaymentsController`, `InventoryMovementsController` que mockean `GetTicketSettingsUseCase` siguen pasando (mismo shape de retorno, solo cambia cómo el controller lo consume internamente).
- [x] 5.3 Verificación manual: generar al menos un PDF por módulo (`/reports/sales-cut`, `/reports/account-statements/[customerId]`, `/payments/history`, `/inventory/kardex`) con `TicketSettings.businessAddress`/`businessRfc` configurados, y confirmar visualmente que ambos aparecen junto al logo sin desplazar tablas/totales/filtros ya existentes. Verificado con datos reales vía `npm run dev` + `curl` autenticado en los 4 endpoints — dirección y RFC aparecen junto al logo en los 4, sin desplazar tablas/totales/filtros.
- [x] 5.4 Verificación manual: repetir 5.3 con `businessAddress`/`businessRfc` en `null` (o sin fila en `ticket_settings`) y confirmar que el header no muestra líneas vacías ni "null". Verificado: se limpiaron temporalmente ambos campos vía `PATCH /settings/ticket`, se regeneró `sales-cut.pdf` (ambas líneas se omiten limpiamente, `businessName` se sigue mostrando), y se restauraron los valores originales al terminar.
- [x] 5.5 Confirmar visualmente que `AnticipoReceiptPdf` sigue mostrando el folio del abono y `AccountStatementLedgerPdf` el nombre del cliente, sin regresión. Verificado en `AccountStatementLedgerPdf` con datos reales (título "Estado de Cuenta — Cliente QA sin RFC" intacto); `AnticipoReceiptPdf` comparte el mismo `ReportHeader` ya verificado y su folio/cliente viven en el título/cuerpo sin tocar, confirmado por lectura de código (no había abonos de prueba disponibles para generar el PDF real).
