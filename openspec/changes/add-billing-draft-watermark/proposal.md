## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario con `billing:write` que descarga el PDF de una factura borrador (`POST /invoices/preview/pdf`) o de una factura en modo mock (`FACTURAMA_MOCK=true`) | Como usuario que descarga el PDF de una factura borrador, quiero ver la palabra "BORRADOR" como marca de agua gris diagonal de fondo en vez de un banner sólido rojo arriba y abajo de la página, para no confundir el aviso de borrador con un mensaje de error del sistema | El banner actual usa `PDF_COLORS.error` (el mismo rojo que los mensajes de error reales de la UI), lo que hace que un documento perfectamente válido (una vista previa antes de timbrar) se lea como si algo hubiera fallado | - Given el PDF de una factura parcial o de una venta en `POST /invoices/preview/pdf`, When se genera el documento, Then una marca de agua diagonal en gris translúcido con el texto del watermark aparece de fondo, sin bloquear la lectura del contenido (emisor, receptor, tabla de conceptos, totales)<br>- Given el mismo documento, When se compara con el banner anterior, Then ya NO aparece ningún banner sólido en rojo (`PDF_COLORS.error`) arriba ni abajo de la página<br>- Given el modo mock (`FakeFacturamaGateway.download`), When se genera su PDF de prueba, Then su propio texto de watermark ("DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL") también se muestra en gris diagonal, no en rojo<br>- Given una factura ya timbrada (`isDraft=false`), When se genera su PDF real (vía `FacturamaRestGateway`, fuera de este componente), Then no se ve afectada — este cambio solo toca `InvoiceDocumentPdf.tsx` | - El texto exacto del watermark (`"BORRADOR — no válido fiscalmente"` / `"DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL"`), la prop `isDraft` (que sigue ocultando el footer fiscal/QR) y el mecanismo de resolución del `logoUrl` server-side no cambian — el cambio es exclusivamente el estilo visual del watermark |

## Why

`InvoiceDocumentPdf.tsx` (billing) es el único documento del sistema con lógica de "borrador" visual — usado por `BillingController.previewPdf` (vista previa antes de timbrar) y `FakeFacturamaGateway.download` (modo mock, comportamiento default cuando `FACTURAMA_MOCK=true`). Su watermark actual (`watermarkBanner`/`watermarkFooter` en `pdfStyles.ts`) se pinta con `PDF_COLORS.error` — el mismo rojo `#ba1a1a` que usan los banners de error reales en la UI (`bg-error`/`text-on-error`) — haciendo que un documento válido (una vista previa, no un fallo) se perciba como si algo hubiera salido mal. Se verificó que `quotes` (que también tiene un estado `draft`) no tiene este problema: su `QuoteStatusBadge` para `status="draft"` ya es gris neutro por diseño explícito (fijado como requirement en `quotes-ui`), y su PDF no tiene watermark ni mensaje rojo alguno — no hay nada que corregir ahí. El cambio es exclusivamente sobre el patrón de watermark de `billing`.

## What Changes

- `src/modules/billing/infrastructure/pdf/pdfStyles.ts`: se reemplazan `watermarkBanner` (banner sólido rojo arriba de la página) y `watermarkFooter` (banda roja al pie) por un único estilo de marca de agua diagonal de fondo — texto grande, `position: "absolute"`, centrado, rotado (`transform: "rotate(-45deg)"`), color gris translúcido (tono de la paleta `pdfTheme`, ej. `outlineVariant`/`onSurfaceVariant` con opacidad baja), renderizado detrás del resto del contenido de la página.
- `src/modules/billing/infrastructure/pdf/InvoiceDocumentPdf.tsx`: se elimina el `<Text style={s.watermarkBanner}>` del inicio de la página y el `<Text style={s.watermarkFooter}>` del final; se agrega un único `<Text style={s.watermarkDiagonal}>{watermark}</Text>` renderizado antes que el resto del contenido (para quedar visualmente detrás).
- Ningún call site cambia de firma: `BillingController.previewPdf` sigue pasando `watermark: "BORRADOR — no válido fiscalmente"` e `isDraft: true`; `FakeFacturamaGateway.download` sigue pasando su propio texto mock — solo cambia cómo `InvoiceDocumentPdf` estiliza ese texto.
- El resto del layout (bloque emisor/receptor, tabla de conceptos, totales, footer fiscal condicionado a `!isDraft`) no cambia.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `billing-api`: el requirement de watermark de `InvoiceDocumentPdf` (preview PDF endpoint y `FakeFacturamaGateway` en modo mock) cambia de un banner sólido rojo (`PDF_COLORS.error`) a una marca de agua diagonal gris translúcida de fondo, conservando el texto exacto del watermark y el resto del comportamiento (logo, `isDraft`, footer fiscal condicionado).

## Impact

- **Archivos modificados**: `src/modules/billing/infrastructure/pdf/{pdfStyles.ts, InvoiceDocumentPdf.tsx}`.
- **Sin cambios de contrato HTTP**: mismo `Content-Type`, mismo `Content-Disposition`, mismo texto de watermark, misma respuesta de `POST /api/v1/admin/invoices/preview/pdf`.
- **Sin cambios en `BillingController.ts`, `FakeFacturamaGateway.ts`, ni en ningún otro módulo** — el cambio es interno a `InvoiceDocumentPdf.tsx`/`pdfStyles.ts`.
- **Sin cambios de esquema de base de datos ni de permisos RBAC.**
- **Dependencias**: ninguna nueva — reutiliza `@react-pdf/renderer` y `PDF_COLORS` (`pdfTheme`) ya existentes.
