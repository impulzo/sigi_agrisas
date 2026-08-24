## 1. Infraestructura compartida (sin consumidores)

- [x] 1.1 Crear `src/shared/infrastructure/pdf/pdfTheme.ts` con las constantes hex de marca (`primary`, `tertiary`, `outline`, `outlineVariant`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerLow`, `onSurface`, `onSurfaceVariant`, `error: "#ba1a1a"`, `errorContainer`), verificando cada valor contra `tailwind.config.ts`.
- [x] 1.2 Crear `src/shared/infrastructure/pdf/pdfBaseStyles.ts` como objeto plano con `page`, `tableHeader`, `tableRow`, `tableRowAlt`, banda de totales, `footer`, `badge` y bordes, usando los colores de `pdfTheme`.
- [x] 1.3 Crear `src/shared/infrastructure/pdf/resolvePdfLogoSource.ts`: retorna la URL https sin modificar si `logoUrl` es válida; si no, resuelve `public/logo.png` vía `path.join(process.cwd(), "public", "logo.png")` o `fs.readFileSync` a `Buffer`.
- [x] 1.4 Crear `src/shared/infrastructure/pdf/PdfLogo.tsx`: componente `<Image>` wrapper que consume `resolvePdfLogoSource`, con `objectFit: "contain"` y prop `size`.
- [x] 1.5 Crear `src/shared/infrastructure/pdf/pdfIssuer.ts`: tipo `PdfIssuer` (superset de `QuotePdfIssuer` + `logoUrl: string | null`) y función pura `toPdfIssuer(settings: TicketSettings): PdfIssuer`.
- [x] 1.6 Crear `src/shared/infrastructure/pdf/rowStyle.ts` (o archivo equivalente): función pura `rowStyle(index, base, alt)`.
- [x] 1.7 Crear `src/shared/infrastructure/formatters/formatPdfCurrency.ts` siguiendo el patrón de `formatDate.ts` ya existente.
- [x] 1.8 Confirmar que `npm run build` pasa con los archivos nuevos sin ningún consumidor todavía. (verificado con `npx tsc --noEmit`: cero errores nuevos vs. baseline via `git stash`)

## 2. Reemplazo mecánico de formateo de moneda (4 sitios)

- [x] 2.1 Diff literal de las 4 implementaciones de `Intl.NumberFormat` en `QuotePdf.tsx:25-27`, `InvoiceDocumentPdf.tsx:48-50`, `AnticipoReceiptPdf.tsx:7-13`, `DepartmentPriceListReportPdf.tsx:12-18` — confirmar que son comportacionalmente idénticas (mismo locale, misma moneda default) antes de reemplazar. Confirmado: mismas opciones de `Intl.NumberFormat("es-MX", {style:"currency"})`; los dos de `reports/` reciben `string` y hacen `Number(v)` con `minimumFractionDigits:2` explícito (idéntico al default de MXN), preservado en el wrapper local.
- [x] 2.2 Reemplazar la función local `money()` por `formatPdfCurrency` en `QuotePdf.tsx` (parte del piloto completo del módulo 3).
- [x] 2.3 Reemplazar la función local `money()` por `formatPdfCurrency` en `InvoiceDocumentPdf.tsx` — solo esta línea, sin tocar estilos/colores/logo de billing en este change.
- [x] 2.4 Reemplazar la función local `money()` por `formatPdfCurrency` en `AnticipoReceiptPdf.tsx` — solo esta línea, sin tocar el resto del archivo.
- [x] 2.5 Reemplazar la función local `money()` por `formatPdfCurrency` en `DepartmentPriceListReportPdf.tsx` — solo esta línea, sin tocar el resto del archivo.

## 3. Migración piloto: módulo `quotes`

- [x] 3.1 Reconstruir `quotes/infrastructure/pdf/pdfStyles.ts` componiendo `pdfBaseStyles` + colores de `pdfTheme`, eliminando los hex propios (`#f0f0f0`, `#e0e0e0`, `#ccc`, `#999`, `#eee`, `#555`, `#666`).
- [x] 3.2 Extender la interfaz `QuotePdfIssuer` (`QuotePdf.tsx:6-11`) con `logoUrl: string | null`.
- [x] 3.3 Renderizar `<PdfLogo>` en el header de `QuotePdf.tsx`, junto al bloque de nombre/RFC del emisor, sin desplazar ni ocultar esos datos.
- [x] 3.4 Reemplazar `idx % 2 === 0 ? s.tableRow : s.tableRowAlt` en `QuotePdf.tsx` por `rowStyle(idx, s.tableRow, s.tableRowAlt)`.
- [x] 3.5 Actualizar `QuotesController.ts` (línea ~165) para construir el issuer vía `toPdfIssuer(await this.getTicketSettingsUseCase.execute())`, incluyendo `logoUrl`, en el mismo punto/scope donde hoy se obtiene `businessName`/`businessRfc`.

## 4. Verificación

- [x] 4.1-4.2 Generado el PDF de `QuotePdf` end-to-end con `tsx` (render real de `@react-pdf/renderer`, no mock) usando un `QuoteDetailDto` representativo: buffer válido (`%PDF-`, ~1.1MB con logo fallback embebido), sin errores de render.
- [x] 4.3 Verificado el escenario "Cliente general" (`customerName: null`) — la lógica `data.customerName ?? "Cliente general"` no fue tocada por este cambio y el render con `customerName: null` completa sin error.
- [x] 4.4 Filename/`Content-Disposition` sin cambios — el refactor no tocó ninguna línea de `QuotesController.ts` fuera de la construcción del `issuer`.
- [x] 4.5 Branch scoping sin cambios — `enforceBranchScope` sigue ejecutándose antes de la rama `format=pdf`; test `QuotesController.test.ts` "403 con format=pdf cuando el caller sin bypass consulta cotización de otra sucursal" sigue en verde.
- [x] 4.6 `npx jest` completo: 493 suites / 3583 tests, todos pasan. `npx tsc --noEmit`: cero errores nuevos vs. baseline (mismos 8 errores preexistentes no relacionados, confirmados con `git stash`).
