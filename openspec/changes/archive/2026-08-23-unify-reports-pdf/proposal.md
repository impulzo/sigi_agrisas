## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Desarrollador | Como desarrollador, quiero migrar `reports/pdfStyles.ts` a `pdfBaseStyles`/`pdfTheme` y crear `<ReportHeader>`/`<ReportFooter>` compartidos que reemplacen el bloque de header/footer duplicado idéntico en los 8 archivos de reportes | Eliminar la mayor concentración de duplicación de código del feature (10 documentos repitiendo el mismo header/footer) y unificar colores | - Los 8 archivos consumen `<ReportHeader title logoUrl>` y `<ReportFooter generatedByEmail>` en vez de JSX hand-rolled<br>- Cada reporte conserva su propio contenido de meta-línea (filtros, período) como children de `ReportHeader`, sin perder ningún dato mostrado hoy<br>- `CashCutReportPdf` normaliza su footer de "Pág. X de Y" a "Página X de Y" (formato ya exigido explícitamente por los specs de stock/payment-history/department-price-list; ningún spec fija "Pág." como correcto)<br>- El `cols` StyleSheet inline de `CashCutReportPdf` se pliega en `reports/pdfStyles.ts` (confirmado que son solo anchos de columna, sin lógica de negocio divergente) | - Cambio puramente de presentación; no debe tocar ningún cálculo de totales/prorrateo de impuestos ni la lógica de agrupación por cliente/ticket/departamento de ningún reporte |
| 2 | Usuario que exporta cualquiera de los 10 reportes en PDF | Como usuario que genera cualquiera de los 10 documentos de reporte en PDF, quiero ver el logo del negocio (chico, secundario) en el encabezado para tener el mismo estándar visual que el resto del sistema | Consistencia de marca en todos los PDFs del sistema | - Los 10 documentos muestran el logo vía `<ReportHeader>`<br>- Si no hay logo configurado, usa el fallback `public/logo.png`<br>- El logo no desplaza ni oculta ningún dato de negocio (títulos, filtros, `generatedBy`, saldos) en ningún reporte | - `GetTicketSettingsUseCase` se agrega al constructor de `ReportsController`, obtenido UNA sola vez por request y reusado en los 12 `renderToBuffer`, después de los checks de `resolveScopedBranchId`/RBAC ya existentes en cada rama |
| 3 | Desarrollador | Como desarrollador, quiero que los colores de tabla (`tableHeader`, `tableRowAlt`, bandas de totales, bordes, grises mutados) en los 10 reportes usen `pdfTheme` en vez de `#e0e0e0`/`#f0f0f0`/`#ccc`/`#999`/`#555`/`#888` | Cerrar la última brecha de color del feature | - `reports/pdfStyles.ts` reconstruido componiendo `pdfBaseStyles`<br>- Ningún reporte cambia su estructura de tabla/columnas, solo sus colores | - Cambio puramente visual, no afecta datos ni permisos |

Nota: dado que los 12 `renderToBuffer` comparten el mismo controller y el mismo tenant, se agrega una sola llamada a `GetTicketSettingsUseCase` reusada — no 12 — para evitar 12 fetches idénticos por request.

**Nota de alcance adicional**: `AnticipoReceiptPdf.tsx` (recibo de anticipo, `reports/infrastructure/pdf/`) también se agrega al alcance — `add-pdf-design-system` (change 1) solo migró su formateador de moneda, sin agregarle logo (confirmado: hoy no usa `PdfLogo`). Es un documento cara-a-cliente según la clasificación original del feature (logo normal, no chico), y cerrar este gap aquí evita dejar un PDF sin logo al terminar la secuencia de 4 changes.

## Why

`reports/infrastructure/pdf/pdfStyles.ts` es compartido por 8 archivos (10 documentos), pero nunca fue actualizado a la paleta de marca — sigue usando `#e0e0e0`/`#f0f0f0`/`#ccc`/`#999`/`#555`/`#888`. Cada uno de los 8 archivos repite un bloque de header y footer estructuralmente idéntico (confirmado en el research inicial), y `CashCutReportPdf.tsx` además mantiene un `StyleSheet.create` inline (`cols`) separado, duplicando patrones ya presentes en `pdfStyles.ts`, y usa "Pág." en vez de "Página" en su footer — inconsistente con los 3 reportes cuyo spec fija explícitamente "Página X de Y". Este es el cuarto y último change de la secuencia: el de mayor volumen (10 documentos, 12 call sites en `ReportsController.ts`), pero el patrón de migración ya está probado 3 veces (`quotes`, `payments`/`inventory`, `billing`).

## What Changes

- `reports/infrastructure/pdf/pdfStyles.ts` se reconstruye componiendo `pdfBaseStyles`/`pdfTheme`; se pliega el `cols` StyleSheet inline de `CashCutReportPdf.tsx` como claves nombradas dentro de este archivo (ej. `cashCutCte`, `cashCutDocto`, etc.).
- Se crean `src/modules/reports/infrastructure/pdf/ReportHeader.tsx` y `ReportFooter.tsx`: componentes compartidos que reemplazan el bloque de header (título + logo chico + meta-líneas custom vía `children`) y footer (`generatedBy.email` + "Página X de Y") duplicado en los 8 archivos.
- Los 8 archivos (`AccountStatementPdf.tsx` con sus 2 documentos, `CashCutReportPdf.tsx`, `CollectionsReportPdf.tsx`, `DepartmentPriceListReportPdf.tsx`, `InventoryStockReportPdf.tsx`, `PaymentHistoryReportPdf.tsx`, `ProviderPaymentsReportPdf.tsx`, `PurchasesReportPdf.tsx`, `SalesByProductReportPdf.tsx`, `SalesCutReportPdf.tsx`) se actualizan para consumir `<ReportHeader>`/`<ReportFooter>`, recibir un nuevo prop `logoUrl`, y usar `pdfTheme` para sus colores propios.
- `CashCutReportPdf.tsx` normaliza su footer a "Página X de Y" (antes "Pág. X de Y").
- `ReportsController.ts`: se agrega `GetTicketSettingsUseCase` (requerido) al constructor; se obtiene `logoUrl` una sola vez al inicio de cada método que genera PDF (o compartido si aplica) y se pasa a cada componente.
- `reports/infrastructure/di/container.ts`: se instancia `GetTicketSettingsUseCase` y se pasa a `reportsController`.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `reports-api`: PDF de stock, historial de abonos y precios por departamento incluyen logo y paleta de marca.
- `cash-cut-api`: PDF de corte de caja incluye logo, paleta de marca, y normaliza su footer a "Página X de Y".
- `sales-cut-api`: PDF de corte de ventas incluye logo y paleta de marca.
- `reports-collections-api`: PDF de cobranza por cliente incluye logo y paleta de marca.
- `reports-purchases-api`: PDF de compras y de pagos a proveedores incluyen logo y paleta de marca.
- `reports-sales-by-product-api`: PDF de ventas por producto incluye logo y paleta de marca.
- `account-statements-api`: PDF de estado de cuenta (resumen y libro mayor) y recibo de anticipo incluyen logo y paleta de marca.

## Impact

- **Archivos nuevos**: `src/modules/reports/infrastructure/pdf/{ReportHeader.tsx, ReportFooter.tsx}`.
- **Archivos modificados**: `src/modules/reports/infrastructure/pdf/{pdfStyles.ts, AccountStatementPdf.tsx, AnticipoReceiptPdf.tsx, CashCutReportPdf.tsx, CollectionsReportPdf.tsx, DepartmentPriceListReportPdf.tsx, InventoryStockReportPdf.tsx, PaymentHistoryReportPdf.tsx, ProviderPaymentsReportPdf.tsx, PurchasesReportPdf.tsx, SalesByProductReportPdf.tsx, SalesCutReportPdf.tsx}`, `src/modules/reports/infrastructure/http/ReportsController.ts`, `src/modules/reports/infrastructure/di/container.ts`.
- **Sin cambios de esquema de base de datos ni de contrato HTTP** — mismos filenames, mismo `Content-Disposition`, mismos query params y límites de 10,000 filas.
- Con este change se completa la secuencia de 4 changes del feature "PDF unificado".
