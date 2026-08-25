## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario que descarga cualquiera de los 12 documentos PDF de reportes/pagos/inventario internos (`reports`, `payments`, `inventory`) | Como usuario que descarga un reporte interno en PDF, quiero que su encabezado muestre logo, título, fecha y hora de generación, dirección y RFC del negocio (tomados de `/settings`) para poder usar el documento en trámites administrativos sin tener que anexar los datos fiscales manualmente | Hoy el encabezado de estos 12 documentos solo muestra logo+título; los datos fiscales ya existen en `TicketSettings` (`businessAddress`, `businessRfc`) y ya se editan en `/settings`, pero no se reutilizan en estos PDFs | - Given `TicketSettings.businessAddress`/`businessRfc` con valor, When se genera cualquiera de los 12 documentos (`?format=pdf`), Then el encabezado muestra ambos datos junto al logo y el título, sin desplazar ni ocultar ningún dato de negocio ya mostrado (filtros, período, totales)<br>- Given `businessAddress`/`businessRfc` en `null` (sin configurar), When se genera el PDF, Then el encabezado omite esa línea sin mostrar "null"/"undefined" ni dejar un espacio en blanco roto<br>- Given la fecha/hora de generación (`generatedAt`), When se muestra en el encabezado, Then conserva el formato ya existente con hora incluida (`formatDate`, sin cambio) | - `businessAddress`/`businessRfc` se resuelven server-side vía `GetTicketSettingsUseCase` (ya inyectado en `ReportsController`/`PaymentsController`/`InventoryMovementsController`), nunca desde input del cliente ni con datos de otra sucursal — mismo scope de tenant único que ya aplica al logo |
| 2 | Usuario que descarga un documento PDF de un solo registro (recibo de anticipo, estado de cuenta de un cliente) | Como usuario que descarga el recibo de un anticipo o el estado de cuenta de un cliente en PDF, quiero que el encabezado conserve el folio y los datos del cliente ya visibles hoy, además de ganar dirección y RFC del negocio, para no perder trazabilidad del documento al agregarle los datos fiscales | `AnticipoReceiptPdf` y `AccountStatementPdf` (libro mayor) ya muestran folio/nombre de cliente en su título o cuerpo — el cambio debe extender su encabezado sin remover ese dato ya existente | - Given el recibo de un anticipo, When se genera su PDF, Then el encabezado sigue mostrando el folio del abono (sin regresión) y gana dirección/RFC del negocio<br>- Given el libro mayor de un cliente, When se genera su PDF, Then el encabezado sigue mostrando el nombre del cliente (sin regresión) y gana dirección/RFC del negocio<br>- Given un reporte agregado multi-fila sin un folio/cliente único (corte de ventas, cobranza, compras, ventas por producto, stock, precios por departamento), When se genera su PDF, Then su encabezado NO intenta mostrar folio/cliente (no aplica) — solo gana dirección/RFC | - Mismo criterio de seguridad que la historia 1: datos fiscales resueltos server-side, sin exponer datos de otro tenant/sucursal |

Nota: las dos historias son la misma extensión de encabezado aplicada a dos categorías de documento — la fila 1 cubre los reportes agregados (sin folio/cliente propio), la fila 2 cubre los documentos de un solo registro que ya tienen folio/cliente y deben conservarlos. Ambas quedan trazables al pedido original (que repitió la misma cabecera dos veces, la segunda vez agregando folio/cliente "si aplica").

## Why

La secuencia de 4 changes archivada hoy (`add-pdf-design-system` → `unify-payments-inventory-pdf` → `unify-billing-pdf` → `unify-reports-pdf`) unificó colores y logo en los 13 documentos PDF del sistema, pero dejó explícitamente fuera de alcance la razón social/RFC/dirección del emisor en los reportes internos — solo `QuotePdf` (billing) y `InvoiceDocumentPdf` ya la muestran, vía el tipo `PdfIssuer`/`toPdfIssuer` (`src/shared/infrastructure/pdf/pdfIssuer.ts`) que mapea `TicketSettings` (`businessName`, `businessRfc`, `businessAddress`, `businessPhone`, `logoUrl`) — ya editable en `/settings` y ya con toda la infraestructura de resolución construida. Este change es exactamente el trabajo de seguimiento natural: reutilizar `toPdfIssuer` (sin crear ningún campo ni endpoint nuevo) en los 11 documentos de `reports/infrastructure/pdf/ReportHeader.tsx` y en los 2 headers inline de `PaymentHistoryPdf.tsx` (payments) y `KardexReportPdf.tsx` (inventory), que hoy solo reciben `logoUrl` suelto.

## What Changes

- `src/modules/reports/infrastructure/pdf/ReportHeader.tsx`: el prop `logoUrl?: string | null` se reemplaza por `issuer: PdfIssuer` (superset que ya incluye `logoUrl`); el componente renderiza, junto al logo, `businessName` (si existe), `businessAddress` y `businessRfc` — mismo layout ya usado en `QuotePdf.tsx` (`issuerRow`/`issuerBlock`/`issuerName`/`issuerMeta`).
- Los 11 archivos que consumen `ReportHeader` (`AccountStatementPdf.tsx` ×2, `AnticipoReceiptPdf.tsx`, `CashCutReportPdf.tsx`, `CollectionsReportPdf.tsx`, `DepartmentPriceListReportPdf.tsx`, `InventoryStockReportPdf.tsx`, `PaymentHistoryReportPdf.tsx`, `ProviderPaymentsReportPdf.tsx`, `PurchasesReportPdf.tsx`, `SalesByProductReportPdf.tsx`, `SalesCutReportPdf.tsx`) cambian su prop de `logoUrl` a `issuer: PdfIssuer` y lo pasan a `ReportHeader`.
- `ReportsController.ts`: en los 11 call sites que hoy hacen `const { logoUrl } = await this.getTicketSettingsUseCase.execute()`, se cambia a obtener el `TicketSettings` completo y mapear con `toPdfIssuer(settings)`, pasando `issuer` a cada `createElement(...)`.
- `PaymentHistoryPdf.tsx` (payments) y `KardexReportPdf.tsx` (inventory): añaden `businessName`/`businessAddress`/`businessRfc` junto al logo ya existente en su header inline, reutilizando `toPdfIssuer`. `PaymentsController.ts` e `InventoryMovementsController.ts` cambian de pedir solo `logoUrl` a pasar el `issuer` completo.
- Ningún dato ya mostrado (folio del abono en `AnticipoReceiptPdf`, nombre del cliente en `AccountStatementPdf`) se remueve — el cambio es aditivo sobre el encabezado existente.
- Sin cambios de esquema de base de datos, sin campos nuevos en `TicketSettings` (ya existen todos), sin cambios de contrato HTTP (mismo `?format=pdf`, mismo `Content-Disposition`).

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `reports-api`: el header PDF de stock, historial de abonos y precios por departamento pasa de logo-only a incluir también dirección y RFC del negocio.
- `cash-cut-api`: el header PDF de corte de caja incluye dirección y RFC del negocio.
- `sales-cut-api`: el header PDF de corte de ventas incluye dirección y RFC del negocio.
- `reports-collections-api`: el header PDF de cobranza por cliente incluye dirección y RFC del negocio.
- `reports-purchases-api`: el header PDF de compras y de pagos a proveedores incluye dirección y RFC del negocio.
- `reports-sales-by-product-api`: el header PDF de ventas por producto incluye dirección y RFC del negocio.
- `account-statements-api`: el header PDF de estado de cuenta (resumen y libro mayor) y del recibo de anticipo incluye dirección y RFC del negocio, conservando folio/cliente ya presentes.
- `payments-api`: el header PDF de historial de abonos incluye dirección y RFC del negocio.
- `inventory-kardex-api`: el header PDF del kardex incluye dirección y RFC del negocio.

## Impact

- **Archivos modificados**: `src/shared/infrastructure/pdf/pdfIssuer.ts` (sin cambios de contrato, solo se reutiliza); `src/modules/reports/infrastructure/pdf/{ReportHeader.tsx, pdfStyles.ts, AccountStatementPdf.tsx, AnticipoReceiptPdf.tsx, CashCutReportPdf.tsx, CollectionsReportPdf.tsx, DepartmentPriceListReportPdf.tsx, InventoryStockReportPdf.tsx, PaymentHistoryReportPdf.tsx, ProviderPaymentsReportPdf.tsx, PurchasesReportPdf.tsx, SalesByProductReportPdf.tsx, SalesCutReportPdf.tsx}`, `src/modules/reports/infrastructure/http/ReportsController.ts`; `src/modules/payments/infrastructure/pdf/{PaymentHistoryPdf.tsx, pdfStyles.ts}`, `src/modules/payments/infrastructure/http/PaymentsController.ts`; `src/modules/inventory/infrastructure/pdf/{KardexReportPdf.tsx, pdfStyles.ts}`, `src/modules/inventory/infrastructure/http/InventoryMovementsController.ts`.
- **Sin cambios de esquema de base de datos** — `TicketSettings` ya tiene todos los campos necesarios.
- **Sin cambios de contrato HTTP** — mismo `?format=pdf`, mismo `Content-Disposition`, mismos límites de fila (`ReportTooLarge`).
- **Dependencias**: ninguna nueva — reutiliza `GetTicketSettingsUseCase`, `toPdfIssuer` y `PdfLogo` ya existentes.
