## 1. Color de botones PDF

- [x] 1.1 `app/_components/atoms/Button/Button.tsx`: agregar `"tertiary"` al type `Variant` y a `variantClasses` (`bg-tertiary text-on-tertiary hover:bg-tertiary/90`)
- [x] 1.2 `app/_components/molecules/PdfDownloadButton/PdfDownloadButton.tsx`: cambiar `ExportPdfButton` de `variant="filled"` a `variant="tertiary"`
- [x] 1.3 `app/_components/molecules/PdfDownloadButton/PdfDownloadButton.tsx`: recolorear `DownloadPdfButton` (`variant="outlined"` + `className="border-tertiary text-tertiary hover:bg-tertiary/10"`)
- [x] 1.4 `app/_components/molecules/PdfDownloadButton/PdfDownloadButton.tsx`: agregar prop opcional `size?: "sm" | "md" | "lg"` pass-through a `Button` en `PdfDownloadButtonProps`, `PdfButton`, `ExportPdfButton` y `DownloadPdfButton`

## 2. Cerrar excepción cruda en SaleInvoicesSection

- [x] 2.1 `app/(private)/billing/_blocks/SaleInvoicesSection.tsx`: importar `DownloadPdfButton` desde `../../../_components/molecules/PdfDownloadButton/PdfDownloadButton`
- [x] 2.2 `app/(private)/billing/_blocks/SaleInvoicesSection.tsx`: reemplazar el `<button>` "PDF" (líneas 63-70) por `<DownloadPdfButton onClick={() => download(inv.id, "pdf")} loading={isDownloading} size="sm" />`
- [x] 2.3 Confirmar que el botón "XML" contiguo no se modifica

## 3. Migrar LedgerPage a PageShell

- [x] 3.1 `app/(private)/reports/_blocks/LedgerPage.tsx`: importar `{ PageShell }` desde `"../../../_components/organisms/PageShell"`
- [x] 3.2 Quitar imports `Link` y `Icon` (sólo usados para el back-link manual)
- [x] 3.3 Reemplazar el `<div>` raíz (`flex flex-col gap-lg px-gutter py-lg mx-auto w-full max-w-screen-2xl`) y el bloque de arrow-back manual por `<PageShell title="Estado de cuenta" backHref="/reports/account-statements">`
- [x] 3.4 Anidar el contenido existente (error / loading / `LedgerHeader` / filtros / `LedgerTable` / toast) como `children` de `PageShell`, envuelto en `<div className="flex flex-col gap-lg">`

## 4. Migrar PaymentsHistoryPage a PageShell

- [x] 4.1 `app/(private)/payments/_blocks/PaymentsHistoryPage.tsx`: importar `{ PageShell }` desde `"../../../_components/organisms/PageShell"`
- [x] 4.2 Quitar import `Icon` (sólo usado para el back-link manual); mantener `Link` (se usa también en la celda de folio de venta)
- [x] 4.3 Reemplazar el `<div>` raíz (`space-y-4 max-w-7xl mx-auto px-4 py-6`) y el header manual (Link+Icon+h1) por `<PageShell title="Historial de abonos" backHref="/payments">`
- [x] 4.4 Anidar el contenido existente (toolbar / error / loading / tabla / totales / paginación / toast) como `children` de `PageShell`, envuelto en `<div className="flex flex-col gap-lg">`

## 5. Documentación

- [x] 5.1 `designer.md`: actualizar sección `molecules/PdfDownloadButton` (color `tertiary` en vez de "filled/verde")
- [x] 5.2 `designer.md`: corregir la mención obsoleta en "Página de reporte" (`icon="print"`/`icon="summarize"`)
- [x] 5.3 `designer.md`: cerrar el pendiente de "`ExportPdfButton`, `ExportXlsxButton`... no auditados"

## 6. Verificación

- [x] 6.1 `npm run build`
- [x] 6.2 `npm test -- tests/unit/ui/design-system/tokens.test.ts`
- [x] 6.3 Verificación visual con Playwright: `/reports/purchases` muestra "Exportar a PDF" en `tertiary` (gris-azul), no verde
- [x] 6.4 Verificación visual con Playwright: `/payments/history` (`PaymentsHistoryToolbar` → `DownloadPdfButton`) y `/reports/account-statements/[customerId]` (`ExportPdfButton`) muestran el color `tertiary`
- [x] 6.5 Verificación visual con Playwright: `/billing/[id]` (sección de facturas de una venta) — se completaron datos fiscales (RFC/régimen/CP) del cliente "Pruebas DDDD" y se timbró una factura vía `/billing/new` (mock `FacturamaGateway` local, sin red externa) contra la venta `449f620b-01d4-4485-982a-d25b158e3746`. `SaleInvoicesSection` renderiza la fila con `DownloadPdfButton` (`size="sm"`) en color `tertiary`, icono `picture_as_pdf`, junto al botón "XML" intacto
- [x] 6.6 Verificación visual con Playwright: `/reports/account-statements/[customerId]` tiene arrow-back funcional y mismo padding/margen/ancho que `/reports/purchases`
- [x] 6.7 Verificación visual con Playwright: `/payments/history` tiene arrow-back funcional, ancho (`max-w-screen-2xl`) y padding (`px-gutter py-lg`) igualados al resto de reportes
