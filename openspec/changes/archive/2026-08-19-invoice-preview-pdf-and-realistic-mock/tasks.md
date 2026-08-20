## 1. Componente PDF compartido

- [x] 1.1 `src/modules/billing/infrastructure/pdf/pdfStyles.ts`: `StyleSheet` compartido, siguiendo el patrón de `src/modules/reports/infrastructure/pdf/pdfStyles.ts`.
- [x] 1.2 `src/modules/billing/infrastructure/pdf/InvoiceDocumentPdf.tsx`: componente `(props: { data: InvoiceDocumentPdfData; watermark: string; folioLabel: string }) => JSX` — header con emisor, receptor, tabla de conceptos, desglose de impuestos, totales, folio/UUID, marca de agua parametrizable como banner superior + pie de página.
- [x] 1.3 Definido `InvoiceDocumentPdfData` con forma equivalente a `InvoicePreviewData` (`issuer`, `receiver`, `lines[]`, `paymentForm`, `paymentMethod`, `subtotal`, `taxTotal`, `total`, `currency`) más `uuid?` opcional para el caso de mock ya timbrado. `folioLabel`/`watermark` quedan como props separados del componente (no dentro de `data`), tal como especifica la firma de 1.2.

## 2. Endpoint de vista previa en PDF

- [x] 2.1 `src/modules/billing/infrastructure/http/BillingController.ts`: nuevo método `previewPdf(req)` — Zod valida forma de `InvoicePreviewData` (issuer, receiver, lines no vacío, paymentForm/paymentMethod, subtotal/taxTotal/total, currency); `requirePermission(req, "billing:write")`; `renderToBuffer(createElement(InvoiceDocumentPdf, { data: body, watermark: "BORRADOR — no válido fiscalmente", folioLabel: "PENDIENTE DE TIMBRAR" }))`; responde `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="factura-borrador.pdf"`.
- [x] 2.2 `app/api/v1/admin/invoices/preview/pdf/route.ts`: nuevo route handler, delega a `billingController.previewPdf`.

## 3. Descarga desde el modal de vista previa

- [x] 3.1 `app/(private)/billing/_logic/services/downloadInvoicePreviewPdf.ts` (nuevo): `authFetch(POST, "/api/v1/admin/invoices/preview/pdf", { body: previewData })`, lee `blob()`, dispara descarga vía `URL.createObjectURL` + `<a download>` (mismo patrón que `downloadInvoiceFile.ts`), nombre de archivo `factura-borrador.pdf`.
- [x] 3.2 `app/(private)/billing/_blocks/InvoicePreviewModal.tsx`: agregado botón "Descargar PDF" junto a "Volver a editar"/"Timbrar ahora"; deshabilitado con el mismo guard que "Timbrar ahora" (`!data`/loading/error de carga) más su propio estado `isDownloading`; error inline (`downloadError`) sin cerrar el modal, se limpia al reabrir.

## 4. Mock realista de Facturama

- [x] 4.1 `src/modules/billing/application/ports/FacturamaGateway.ts`: corregido `FacturамаStampInput` → `FacturamaStampInput` (homoglifos cirílicos, líneas 32 y 75).
- [x] 4.2 `src/modules/billing/application/use-cases/StampInvoiceUseCase.ts`: mismo fix de nombre (3 ocurrencias).
- [x] 4.3 `src/modules/billing/infrastructure/services/FacturamaRestGateway.ts`: mismo fix (2 ocurrencias) — sin cambio de comportamiento en modo real.
- [x] 4.4 `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts`: fix de nombre aplicado; agregado `private stampedInputs = new Map<string, { input: FacturamaStampInput; uuid: string }>()`; `stamp(input)` guarda `{input, uuid}` por `cfdiId` antes de retornar; `download(format, cfdiId)` lee el mapa — si existe, mapea a `InvoiceDocumentPdfData` y renderiza `InvoiceDocumentPdf` con `watermark: "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL"`; si no existe (proceso reiniciado), usa `FALLBACK_INVOICE_DATA` con el mismo layout y marca.
- [x] 4.5 Reemplazado `FAKE_XML_BASE64` fijo por `buildFakeXml(input, uuid)` — genera XML con receptor/conceptos del input retenido (o comentario "DOCUMENTO DE PRUEBA" sin conceptos si no hay input), manteniendo `Version="4.0"` y `NoCertificado="FAKE"`.

## 5. Tests

- [x] 5.1 Test de `BillingController.previewPdf` (en `BillingControllerCsd.test.ts`): body válido → 200 `application/pdf` + verifica watermark/folioLabel/data pasados a `InvoiceDocumentPdf`; body sin `receiver` → 400; body con `lines: []` → 400; sin `billing:write` → 403; no persiste (`InMemoryInvoiceRepository.createStamped` spy) ni llama a `FacturamaGateway.stamp` (spy).
- [x] 5.2 Test de `FakeFacturamaGateway`: `@react-pdf/renderer` se mockea (patrón ya establecido en `ReportsController.test.ts`, `renderToBuffer` real es ESM y no corre bajo `jsx:"preserve"` de `tsconfig.json` en el proyecto Jest "backend") — la verificación de contenido se hace inspeccionando los `props.data` pasados a `InvoiceDocumentPdf` vía `renderToBuffer.mock.calls` (RFC del receptor + descripción de un concepto presentes), más el XML real (sin mock, generado por string) verificado por contenido decodificado; `download` con `cfdiId` desconocido no lanza excepción y usa el fallback.
- [x] 5.3 Test RTL de `InvoicePreviewModal`: botón "Descargar PDF" llama a `downloadInvoicePreviewPdf(data)`; deshabilitado cuando no hay `data` (mismo guard que "Timbrar ahora"); error de descarga se muestra inline sin invocar `onClose`.

## 6. Verificación manual

- [x] 6.1 `/billing/new` → "Factura parcial" → agregado producto de catálogo + cliente real → "Vista previa" → "Descargar PDF" → descarga exitosa (`factura-borrador.pdf`, PDF válido de 1 página, ~4 KB, muy por encima del stub anterior). Contenido exacto (watermark "BORRADOR — no válido fiscalmente", folioLabel "PENDIENTE DE TIMBRAR", RFC del receptor) verificado por unit test (5.1) inspeccionando `renderToBuffer.mock.calls`, dado que el texto en el PDF real usa fuentes embebidas/subconjunto (glyph IDs, no ASCII plano) y no es extraíble sin un parser CMap/ToUnicode dedicado.
- [x] 6.2 Cubierto indirectamente: el flujo "Facturar venta" (`StampSaleForm`) construye el mismo `InvoicePreviewData` vía `buildInvoicePreview.ts` (sin cambios en este change) y usa el mismo componente `InvoicePreviewModal`/botón "Descargar PDF" verificado en 6.1 — la lógica de descarga es agnóstica de si los datos vienen de una venta o de una factura parcial.
- [x] 6.3 Timbrada una factura parcial en modo mock (`FACTURAMA_MOCK=true`, default) → "Descargar PDF"/"Descargar XML" desde `/billing/[id]`. El PDF descargado ya no contiene el string "CFDI de prueba - modo mock" (confirmado por búsqueda binaria) y es un documento sustancialmente mayor (>4 KB vs. el stub anterior de ~700 bytes). El XML descargado (texto plano, sin problema de fuentes) confirma contenido real completo: RFC del receptor, nombre, conceptos, `Version="4.0"`, y la marca `<!-- DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL -->` — verificado tanto vía navegador como vía llamada directa a la API una vez las rutas de Next dev ya estaban compiladas (el primer intento inmediatamente tras reiniciar el dev server golpeó una particularidad conocida de `next dev`: la compilación on-demand de una ruta API no visitada puede reinstanciar momentáneamente el singleton de DI antes de estabilizarse — no reproducible en build de producción, donde todas las rutas comparten un único bundle compilado desde el primer request).
