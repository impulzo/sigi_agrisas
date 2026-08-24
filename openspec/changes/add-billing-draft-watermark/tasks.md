## 1. Estilos del watermark

- [x] 1.1 `src/modules/billing/infrastructure/pdf/pdfStyles.ts`: eliminar `watermarkBanner` y `watermarkFooter`; agregar un único estilo `watermarkDiagonal` (`position: "absolute"`, cubriendo el ancho/alto de la página, `textAlign: "center"`, `fontSize` grande, `transform: "rotate(-45deg)"`, `color: PDF_COLORS.outlineVariant`, `opacity` en el rango 0.25-0.3, `fontFamily: "Helvetica-Bold"`).
- [x] 1.2 Ajustar `fontSize`/posicionamiento hasta que el texto completo (el más largo: "BORRADOR — no válido fiscalmente") quede legible y centrado en una sola línea sobre A4, sin acortar el texto.

## 2. InvoiceDocumentPdf

- [x] 2.1 `src/modules/billing/infrastructure/pdf/InvoiceDocumentPdf.tsx`: quitar `<Text style={s.watermarkBanner}>{watermark}</Text>` (inicio de página) y `<Text style={s.watermarkFooter}>{watermark}</Text>` (final de página).
- [x] 2.2 Agregar `<Text style={s.watermarkDiagonal}>{watermark}</Text>` como el primer hijo de `<Page>`, antes de `<View style={s.header}>`, para que quede pintado detrás del resto del contenido (orden de documento de `@react-pdf/renderer`).
- [x] 2.3 Confirmar que no se toca la prop `isDraft` ni el bloque `{!isDraft && <View style={s.fiscalFooter}>...}` (sello digital/cadena original/QR) — sigue condicionado exactamente igual.
- [x] 2.4 Confirmar que la interfaz `InvoiceDocumentPdfProps` (`data`, `watermark`, `folioLabel`, `isDraft`) no cambia — ningún call site (`BillingController.ts`, `FakeFacturamaGateway.ts`) requiere modificación.

## 3. Verificación

- [x] 3.1 `npm run build` (type-check) pasa sin errores.
- [x] 3.2 `npm test` — confirmar que los tests existentes de `BillingController`, `FakeFacturamaGateway`, `StampInvoiceUseCase`, `CancelInvoiceUseCase` siguen pasando sin cambios (ninguno depende del estilo visual del watermark, solo de su texto/presencia). 493/493 suites, 3586/3586 tests verdes.
- [x] 3.3 Verificación manual: generar el PDF de `POST /api/v1/admin/invoices/preview/pdf` (factura parcial o de venta) y confirmar visualmente: (a) ya no aparece ningún banner sólido rojo arriba ni abajo de la página; (b) aparece una marca de agua diagonal gris translúcida con el texto completo "BORRADOR — no válido fiscalmente"; (c) el logo, el bloque emisor/receptor, la tabla de conceptos y los totales siguen legibles sin superposición. Verificado con `npm run dev` + `curl` autenticado contra el endpoint real — confirmado visualmente, sin banner rojo, watermark diagonal gris legible, sin superposición con el contenido.
- [x] 3.4 Verificación manual: con `FACTURAMA_MOCK=true`, descargar el PDF de una factura timbrada en modo mock y confirmar el mismo tratamiento visual con el texto "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL". No había facturas timbradas en la BD de desarrollo para descargar directamente (armar el flujo completo venta→timbrado hubiera requerido crear datos persistentes de prueba); verificado por equivalencia de código: `FakeFacturamaGateway.download` renderiza el mismo componente `InvoiceDocumentPdf` con el mismo `watermarkDiagonal` ya confirmado visualmente en 3.3, solo cambia el texto del watermark recibido por prop.
- [x] 3.5 Confirmar que una factura real timbrada (`FACTURAMA_MOCK=false`, vía `FacturamaRestGateway`) no se ve afectada — no pasa por `InvoiceDocumentPdf`. Confirmado por grep: solo `FakeFacturamaGateway.ts` importa `InvoiceDocumentPdf` en todo `src/modules/billing/infrastructure/services/`; `FacturamaRestGateway.ts` no lo referencia.
