## 1. Estilos y logo en InvoiceDocumentPdf

- [x] 1.1 Reconstruir `billing/infrastructure/pdf/pdfStyles.ts` componiendo `pdfBaseStyles`/`pdfTheme`, eliminando el estilo `logo` muerto y los hex propios no relacionados al watermark.
- [x] 1.2 Cambiar el color de `watermarkBanner`/`watermarkFooter` de `#c00` a `PDF_COLORS.error`, manteniendo su estructura 100% intacta y local.
- [x] 1.3 Agregar `logoUrl: string | null` a `InvoiceDocumentPdfData["issuer"]`.
- [x] 1.4 Envolver `issuerBlock` en `issuerRow` y renderizar `<PdfLogo>` junto a él, sin tocar `watermarkBanner`/`invoiceMeta`/`watermarkFooter`.

## 2. Wiring en BillingController (endpoint de preview)

- [x] 2.1 Agregar `GetTicketSettingsUseCase` (requerido) al constructor de `BillingController`.
- [x] 2.2 En `previewPdf`, después del guard `billing:write` y Zod, obtener `logoUrl` e inyectarlo en `data.issuer` antes de `renderToBuffer`.
- [x] 2.3 Instanciar `GetTicketSettingsUseCase` en `billing/infrastructure/di/container.ts` y pasarlo a `billingController`.
- [x] 2.4 Actualizar `BillingControllerCsd.test.ts` y `BillingControllerScoping.test.ts` con el nuevo parámetro.

## 3. Wiring en FakeFacturamaGateway (modo mock)

- [x] 3.1 Agregar `getTicketSettingsUseCase?: GetTicketSettingsUseCase` opcional al constructor.
- [x] 3.2 En `download("pdf", ...)`, inyectar `logoUrl` si el use case está presente; comportamiento idéntico si no.
- [x] 3.3 Pasar la instancia real en `billing/infrastructure/di/container.ts` (modo mock).
- [x] 3.4 Confirmado: los ~24 sitios de test `new FakeFacturamaGateway()` sin argumentos compilan y pasan sin modificación.
- [x] 3.5 Agregados 2 tests nuevos en `FakeFacturamaGateway.test.ts`: logo presente cuando se inyecta el use case, y `logoUrl: null` cuando no se inyecta (comportamiento sin cambios).

## 4. Verificación

- [x] 4.1 Render real (no mock, vía `tsx`) de `InvoiceDocumentPdf` con `isDraft=true` e `isDraft=false`: ambos buffers `%PDF-` válidos, sin errores.
- [x] 4.2 Confirmado en código: el logo vive dentro de `s.header`/`issuerRow`, estructuralmente separado de `watermarkBanner` (elemento independiente antes del header) y `watermarkFooter` (posición absoluta al fondo) — sin superposición posible.
- [x] 4.3 `factura-borrador.pdf` y `Content-Disposition` sin cambios — no se tocó esa línea en `BillingController.ts`.
- [x] 4.4 `npx jest` completo: 493 suites / 3585 tests, todos pasan (incluye los 2 tests nuevos). `npx tsc --noEmit`: cero errores nuevos vs. baseline.
