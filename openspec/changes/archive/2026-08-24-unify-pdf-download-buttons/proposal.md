## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario que exporta un reporte a PDF (cualquiera de las 8 pantallas de `/reports/*`) | Como usuario que exporta un reporte a PDF, quiero que el botón de exportación use siempre el mismo icono y la leyenda "Exportar a PDF" para reconocer la acción de forma consistente sin importar qué reporte esté viendo | Hoy conviven 3 iconos (`receipt_long`, `print`, ninguno) y textos ligeramente distintos entre reportes hermanos, lo que rompe la percepción de un sistema coherente | - Given cualquiera de las 8 pantallas de `/reports/*`, When se renderiza el botón de exportar PDF, Then muestra el icono `picture_as_pdf` y el texto exacto "Exportar a PDF"<br>- Given una exportación en curso (`isExporting=true`), When el usuario mira el botón, Then está deshabilitado con spinner y no dispara una segunda descarga si se hace click de nuevo<br>- Given el botón "Exportar Excel" de la misma pantalla, When se compara con el de PDF, Then el de Excel no cambia (fuera de alcance) | - No se modifica ningún guard de permiso (`can(...)`) ya existente por reporte — el cambio es puramente de presentación, el mismo `authFetch`/endpoint sigue detrás del botón |
| 2 | Desarrollador que mantiene los módulos de reportes y el resto de pantallas con descarga de PDF (billing, waybills, quotes, payments, inventory/kardex) | Como desarrollador, quiero un componente React compartido en `app/_components/molecules/` (envolviendo el atom `Button` ya existente) con dos variantes de leyenda fija — "Exportar a PDF" para reportes, "Descargar PDF" para el resto — en vez de que cada módulo reimplemente su propio botón | Hoy hay al menos 4 patrones de implementación distintos (botón compartido parcial en `reports/_blocks/`, `Button` inline con icono ad-hoc, `<button>` crudo sin icono) repitiendo el mismo problema en `billing`, `waybills`, `payments`, `quotes` e `inventory/kardex`, violando la regla de arquitectura de reutilizar átomos/moléculas en vez de duplicar markup | - Given cualquier pantalla fuera de `/reports/*` con descarga de PDF (`InvoiceActionsBar`, `InvoicePreviewModal`, `WaybillActionsBar`, `PaymentsHistoryToolbar`, `QuoteActionsBar`, `ExportButtons` de kardex), When se renderiza su botón de PDF, Then usa el mismo componente compartido con icono `picture_as_pdf` y texto exacto "Descargar PDF" (reemplazando "Exportar PDF", "Imprimir" e "Imprimir PDF" actuales)<br>- Given el componente compartido, When se inspecciona su implementación, Then envuelve el atom `Button` (`icon`/`loading`/`variant`), no un `<button>` a mano<br>- Given `app/_components/atoms/Icon/icons.ts`, When se agrega el nuevo icono, Then `"picture_as_pdf"` queda en `ICON_NAMES` y es usado por ambas variantes del componente | - Ningún endpoint ni contrato HTTP cambia; el nombre de archivo descargado (`Content-Disposition`) de cada módulo no se toca — solo cambia el botón que dispara la descarga ya existente |

Nota: las dos historias comparten un único componente con dos variantes de leyenda (no dos componentes separados) — la fila 1 cubre el comportamiento visible en reportes, la fila 2 cubre la reutilización del mismo componente en el resto del sistema. Ambas quedan trazables a los cambios de "Botones para PDF en reportes" y "Botones para PDF fuera de reportes" del pedido original.

## Why

Los botones de exportación/descarga de PDF del panel se implementaron de forma independiente en cada módulo a medida que se fue agregando la capacidad de generar PDFs (`quotes`, `billing`, `payments`, `waybills`, `inventory/kardex`, y los 8 reportes de `reports-ui`). El resultado, verificado leyendo el código actual (no solo las specs), son al menos 4 patrones de implementación, 3 iconos distintos y 4 leyendas distintas para la misma acción ("Exportar PDF", "Descargar PDF", "Imprimir", "Imprimir PDF"), incluyendo un caso mal etiquetado (`inventory/kardex` dice "Imprimir" pero descarga un blob PDF real, no abre el diálogo de impresión del navegador). Existe ya un componente parcialmente compartido (`app/(private)/reports/_blocks/ExportPdfButton.tsx`) pero solo lo consumen 2 de las 8 pantallas de reportes; el resto reimplementa el mismo botón inline con un icono elegido ad-hoc (incluso entre reportes hermanos, `SalesCutPage` usa un icono distinto al resto). El proyecto ya tiene el atom `Button` (`app/_components/atoms/Button/Button.tsx`) con soporte nativo para `icon`/`loading`/`variant` — el patrón correcto según la arquitectura de Atomic Design del repo es envolverlo en un molecule reutilizable, no seguir duplicando `<button>` a mano.

## What Changes

- Se agrega `"picture_as_pdf"` a `ICON_NAMES` (`app/_components/atoms/Icon/icons.ts`) — no existe hoy ningún icono semánticamente "PDF" en el catálogo.
- Se crea `app/_components/molecules/PdfDownloadButton.tsx` con dos exports, ambos envolviendo el atom `Button` con `icon="picture_as_pdf"`:
  - `ExportPdfButton` — leyenda fija "Exportar a PDF", para las 8 pantallas de `/reports/*`.
  - `DownloadPdfButton` — leyenda fija "Descargar PDF", para el resto del sistema.
- Se migran a `ExportPdfButton` las 8 pantallas de reportes: `SalesCutPage.tsx`, `PurchasesReportPage.tsx`, `InventoryPage.tsx`, `SalesByProductPage.tsx`, `ByCustomerCollectionsView.tsx`, `GlobalCollectionsView.tsx`, `LedgerPage.tsx`, `StatementToolbar.tsx`. Se elimina `reports/_blocks/ExportPdfButton.tsx` (el parcial local) una vez migrados sus 2 consumidores actuales.
- Se migran a `DownloadPdfButton` las pantallas no-reporte: `InvoiceActionsBar.tsx` y `InvoicePreviewModal.tsx` (billing), `WaybillActionsBar.tsx` (waybills), `PaymentsHistoryToolbar.tsx` (payments, renombrando de "Exportar PDF"), `QuoteActionsBar.tsx` (quotes, renombrando de "Imprimir PDF"), `ExportButtons.tsx` (inventory/kardex, renombrando de "Imprimir").
- **BREAKING** (solo de percepción visual, no de contrato): el texto visible de los botones de PDF cambia en `payments`, `quotes` e `inventory/kardex` (de "Exportar PDF"/"Imprimir PDF"/"Imprimir" a "Descargar PDF"). Ningún endpoint, permiso ni nombre de archivo descargado cambia.
- Los botones "Exportar Excel" (icono `summarize`) quedan fuera de alcance — no se tocan.

## Capabilities

### New Capabilities
(ninguna — este cambio no introduce un dominio nuevo, extiende el design system ya existente)

### Modified Capabilities
- `design-system`: nuevo requirement `PdfDownloadButton como único componente para descarga/exportación de PDF` (mismo patrón que el `CreateButton` ya existente), y el requirement `Button como única fuente de botones` extiende su prohibición de instanciar `Button` directamente para incluir también los botones de PDF.
- `reports-ui`: los botones "Exportar PDF" de las 8 pantallas de reportes pasan a usar el componente compartido `ExportPdfButton` con icono `picture_as_pdf` y leyenda "Exportar a PDF" (antes "Exportar PDF" con iconos inconsistentes).
- `payments-ui`: el botón de exportación PDF de `PaymentsHistoryPage` cambia su leyenda de "Exportar PDF" a "Descargar PDF" y gana el icono `picture_as_pdf`.
- `billing-ui`: los botones "Descargar PDF" de `InvoiceActionsBar` e `InvoicePreviewModal` ganan el icono `picture_as_pdf` (la leyenda ya era correcta).
- `waybills-ui`: el botón "Descargar PDF" de `WaybillActionsBar` gana el icono `picture_as_pdf`.
- `quotes-ui`: el botón "Imprimir PDF" de `QuoteActionsBar` cambia su leyenda a "Descargar PDF" y gana el icono `picture_as_pdf`.
- `inventory-kardex-ui`: el botón "Imprimir" de kardex cambia su leyenda a "Descargar PDF" (corrige el mislabel: siempre descargó un blob PDF) y gana el icono `picture_as_pdf`.

## Impact

- **Archivos nuevos**: `app/_components/molecules/PdfDownloadButton.tsx`.
- **Documentación**: `designer.md` (catálogo de primitivas) documenta `PdfDownloadButton` junto a `CreateButton`.
- **Archivos modificados**: `app/_components/atoms/Icon/icons.ts`; las 8 pantallas de reportes listadas arriba; `app/(private)/reports/_blocks/{ExportPdfButton.tsx,ExportXlsxButton.tsx}` (el primero se elimina, el segundo no se toca); `app/(private)/billing/_blocks/{InvoiceActionsBar.tsx,InvoicePreviewModal.tsx}`; `app/(private)/waybills/_blocks/WaybillActionsBar.tsx`; `app/(private)/payments/_blocks/PaymentsHistoryToolbar.tsx`; `app/(private)/quotes/_blocks/QuoteActionsBar.tsx`; `app/(private)/inventory/kardex/_blocks/ExportButtons.tsx`.
- **Sin cambios de backend**: ningún endpoint, DTO, o `Content-Disposition` cambia — el cambio es exclusivamente de presentación (icono + texto + componente).
- **Sin cambios de esquema de base de datos ni de permisos RBAC.**
- **Dependencias**: ninguna nueva — reutiliza el atom `Button` y `Icon` ya existentes.
