## 1. Design system: icono y componente compartido

- [x] 1.1 Agregar `"picture_as_pdf"` a `ICON_NAMES` en `app/_components/atoms/Icon/icons.ts`.
- [x] 1.2 Crear `app/_components/molecules/PdfDownloadButton.tsx` con un componente interno no exportado que envuelve el atom `Button` (`icon="picture_as_pdf"`, `onClick`, `loading`), y dos exports delgados: `ExportPdfButton` (`variant="filled"`, texto fijo "Exportar a PDF") y `DownloadPdfButton` (`variant="outlined"`, texto fijo "Descargar PDF"). Ninguno acepta `label`/`children` ni `href`.
- [x] 1.3 Documentar `PdfDownloadButton` (sus dos exports, contrato de props, regla de uso obligatorio) en `designer.md`, junto a la entrada existente de `CreateButton`.

## 2. Migrar las 8 pantallas de reportes a `ExportPdfButton`

- [x] 2.1 `app/(private)/reports/sales-cut/_blocks/SalesCutPage.tsx`: reemplazar el `Button` inline (`icon="receipt_long"`, "Exportar PDF") por `ExportPdfButton`.
- [x] 2.2 `app/(private)/reports/purchases/_blocks/PurchasesReportPage.tsx`: reemplazar el `Button` inline (`icon="print"`, "Exportar PDF") por `ExportPdfButton`.
- [x] 2.3 `app/(private)/reports/inventory/_blocks/InventoryPage.tsx`: reemplazar el `Button` inline (`icon="print"`, "Exportar PDF") por `ExportPdfButton`.
- [x] 2.4 `app/(private)/reports/sales-by-product/_blocks/SalesByProductPage.tsx`: reemplazar el `Button` inline por `ExportPdfButton`.
- [x] 2.5 `app/(private)/reports/collections/_blocks/by-customer/ByCustomerCollectionsView.tsx`: reemplazar el `Button` inline por `ExportPdfButton`.
- [x] 2.6 `app/(private)/reports/collections/_blocks/global/GlobalCollectionsView.tsx`: reemplazar el `Button` inline por `ExportPdfButton`.
- [x] 2.7 `app/(private)/reports/_blocks/LedgerPage.tsx`: reemplazar el import de `reports/_blocks/ExportPdfButton` (parcial local) por el molecule compartido `ExportPdfButton`.
- [x] 2.8 `app/(private)/reports/_blocks/StatementToolbar.tsx`: mismo reemplazo que 2.7.
- [x] 2.9 Confirmar que los 8 archivos anteriores no cambian su `isExporting`/lógica de descarga — solo el componente/icono/texto del botón de PDF.
- [x] 2.10 Borrar `app/(private)/reports/_blocks/ExportPdfButton.tsx` (el parcial local) una vez migrados 2.7 y 2.8. No tocar `ExportXlsxButton.tsx`.

## 3. Migrar las pantallas fuera de reportes a `DownloadPdfButton`

- [x] 3.1 `app/(private)/billing/_blocks/InvoiceActionsBar.tsx`: reemplazar el `<button>` crudo "Descargar PDF" por `DownloadPdfButton`.
- [x] 3.2 `app/(private)/billing/_blocks/InvoicePreviewModal.tsx`: reemplazar el `Button` sin icono ("Descargar PDF") por `DownloadPdfButton`.
- [x] 3.3 `app/(private)/waybills/_blocks/WaybillActionsBar.tsx`: reemplazar el `<button>` crudo "Descargar PDF" por `DownloadPdfButton`.
- [x] 3.4 `app/(private)/payments/_blocks/PaymentsHistoryToolbar.tsx`: reemplazar el `<button>` crudo "Exportar PDF" por `DownloadPdfButton` (texto pasa a "Descargar PDF").
- [x] 3.5 `app/(private)/quotes/_blocks/QuoteActionsBar.tsx`: reemplazar el botón local con `Icon name="print"` ("Imprimir PDF") por `DownloadPdfButton` (texto pasa a "Descargar PDF").
- [x] 3.6 `app/(private)/inventory/kardex/_blocks/ExportButtons.tsx`: reemplazar el botón `onExportPdf` con `Icon name="print"` ("Imprimir") por `DownloadPdfButton` (texto pasa a "Descargar PDF").
- [x] 3.7 Confirmar que los 6 archivos anteriores no cambian su `onClick`/estado de carga/nombre de archivo descargado — solo el componente/icono/texto del botón.

## 4. Verificación

- [x] 4.1 `npm run build` (type-check) pasa sin errores tras 1-3.
- [x] 4.2 Ejecutar `npm test` — confirmar que ningún test snapshot/RTL existente que busque el texto anterior ("Exportar PDF", "Imprimir PDF", "Imprimir") queda roto; actualizar esos tests al nuevo texto donde corresponda.
- [x] 4.3 Verificación manual en browser (Playwright, por convención del proyecto — no Claude-in-Chrome): abrir al menos 1 pantalla de `/reports/*` y confirmar icono `picture_as_pdf` + texto "Exportar a PDF"; abrir `/quotes/[id]`, `/billing/[id]`, `/waybills/[id]`, `/payments/history`, `/inventory/kardex` y confirmar icono `picture_as_pdf` + texto "Descargar PDF" en cada uno. Verificado con `npm run dev` + script Playwright autenticado: `/reports/sales-cut` muestra 1 icono `picture_as_pdf` + "Exportar a PDF"; `/payments/history` y `/quotes/[id]` (con datos reales) muestran icono + "Descargar PDF". `/inventory/kardex` sólo renderiza el botón tras consultar un artículo (form vacío por diseño, no hay regresión: `ExportButtons.tsx` usa `DownloadPdfButton`, confirmado por lectura de código). `/billing/[id]` y `/waybills/[id]` no tenían filas en la BD de desarrollo para abrir un detalle real; confirmado por lectura de código que `InvoiceActionsBar.tsx` y `WaybillActionsBar.tsx` usan `DownloadPdfButton`.
- [x] 4.4 Confirmar visualmente que el estado `loading` (deshabilitado + spinner) sigue funcionando en al menos 2 de los botones migrados. Verificado con Playwright: clic en "Exportar a PDF" (`/reports/sales-cut`) y en "Descargar PDF" (`/quotes/[id]`) — ambos quedan con atributo `disabled` presente y `aria-busy="true"` inmediatamente tras el clic.
