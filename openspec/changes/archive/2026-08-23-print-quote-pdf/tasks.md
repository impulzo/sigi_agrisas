## 1. PDF de la cotización (backend)

- [x] 1.1 Crear `src/modules/quotes/infrastructure/pdf/pdfStyles.ts` (estilos propios del módulo, sin compartir con `billing`/`payments`/`inventory`)
- [x] 1.2 Crear `src/modules/quotes/infrastructure/pdf/QuotePdf.tsx` — recibe `QuoteDetailDto` + issuer (`businessName`/`businessRfc`/`businessAddress`/`businessPhone`); header con folio/estado/fecha emisión/vencimiento; bloque cliente ("Cliente general" si `customerId` es `null`); tabla de líneas desde `items[]` (snapshots, cantidad, precio, descuento, IVA, total de línea); totales (subtotal, taxTotal, total). Sin sello digital/UUID/cadena original/QR.

## 2. Wiring del emisor (backend)

- [x] 2.1 En `src/modules/quotes/infrastructure/di/container.ts`, instanciar `PrismaTicketSettingsRepository` + `GetTicketSettingsUseCase` (de `src/modules/settings/`) siguiendo el patrón de reuso cross-módulo ya usado para `pos` (`PrismaSaleRepository`/`PrismaPosLookupService`)
- [x] 2.2 Inyectar `GetTicketSettingsUseCase` como nueva dependencia del constructor de `QuotesController`

## 3. Endpoint `format=pdf` (backend)

- [x] 3.1 En `QuotesController.getById`, agregar validación Zod del query param `format` (`z.enum(["json", "pdf"]).default("json")`); valor inválido → HTTP 400
- [x] 3.2 Tras el `enforceBranchScope` existente: si `format === "pdf"`, llamar `getTicketSettingsUseCase.execute()`, renderizar `QuotePdf` con `renderToBuffer`, devolver `NextResponse` con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="cotizacion-<folioCode>-<folioNumber>.pdf"`
- [x] 3.3 Confirmar que `app/api/v1/admin/quotes/[id]/route.ts` no requiere cambios (el guard `quotes:read` ya cubre ambos formatos)
- [x] 3.4 Tests unitarios de `QuotesController.getById`: `format=pdf` devuelve `Content-Type: application/pdf` con buffer no vacío; `format=pdf` en quote sin cliente asignado no falla; `format=pdf` respeta branch scoping (403) y not-found (404) igual que `format=json`; `format` inválido → 400

## 4. Servicio y hook de descarga (frontend)

- [x] 4.1 Crear `app/(private)/quotes/_logic/services/downloadQuotePdf.ts` (`GET /api/v1/admin/quotes/:id?format=pdf` vía `authFetch`, retorna `Blob`), modelado en `downloadKardexPdf.ts`
- [x] 4.2 Crear `app/(private)/quotes/_logic/hooks/useQuoteExport.ts` con `isExporting` + `downloadPdf(quote)` + `triggerDownload` local (blob → `<a download>` → click → revoke), modelado en `useKardex.exportPdf`

## 5. Botón "Imprimir PDF" (frontend)

- [x] 5.1 Reestructurar `app/(private)/quotes/_blocks/QuoteActionsBar.tsx`: agregar props `onDownloadPdf: () => void` e `isExporting: boolean`; mover el contenido específico de `cancelled` (banner, sin botones) y `converted` (link "Ver venta generada") para que ya no hagan `return` temprano sin oportunidad de agregar más botones; el botón "Imprimir PDF" (icono `print`, mismo estilo que `ExportButtons.tsx` de kardex) SIEMPRE se renderiza, deshabilitado + spinner mientras `isExporting`
- [x] 5.2 En `app/(private)/quotes/_blocks/QuoteDetailPage.tsx`, instanciar `useQuoteExport()` y pasar `onDownloadPdf={() => downloadPdf(quote)}` / `isExporting` a `<QuoteActionsBar>`

## 6. Verificación

- [x] 6.1 `npm test` — suite completa en verde, incluidos los tests nuevos de 3.4
- [x] 6.2 `npm run build` — sin errores de tipos
- [x] 6.3 Verificación manual — Playwright MCP no disponible en la sesión (config `playwright-v24` huérfana en :9224; el `playwright` stdio recién registrado no carga hasta reiniciar sesión) y Claude-in-Chrome reprodujo el timeout no reproducible ya documentado en `CLAUDE.md` incluso en `/auth/login`. Verificado en su lugar por dos vías: (a) backend end-to-end vía curl contra la DB real del dev server — PDF válido con emisor/cliente/líneas/totales correctos, `Content-Disposition` con filename correcto, `format=json` sin regresión, `format` inválido → 400, `:id` inexistente → 404; (b) tests RTL de `QuoteActionsBar` (ver 3.4 y la suite de `modals.test.tsx`) cubren el botón "Imprimir PDF" en los 4 estados y el estado `isExporting`. Verificación 100% en browser queda pendiente para cuando Playwright MCP esté disponible en una sesión nueva.
- [x] 6.4 Correr `opsx:verify` antes de solicitar archivado
