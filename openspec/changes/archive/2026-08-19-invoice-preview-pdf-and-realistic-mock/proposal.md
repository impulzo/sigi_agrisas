## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Facturista (`billing:write`) | Como facturista, quiero descargar en PDF la vista previa de una factura antes de timbrarla para revisarla fuera del navegador o compartirla para aprobación antes de generar el CFDI real | - Botón "Descargar PDF" en `InvoicePreviewModal`, junto a "Volver a editar"/"Timbrar ahora"<br>- El PDF generado incluye la marca "BORRADOR — no válido fiscalmente" y folio "PENDIENTE DE TIMBRAR" (mismo contenido que ya muestra el modal en pantalla)<br>- No requiere que la factura ya esté timbrada — funciona con los datos en memoria del formulario (venta o parcial), igual que la vista previa en pantalla<br>- Descargar el PDF NO dispara timbrado ni llamada a Facturama | - Sólo `billing:write` puede abrir el formulario que genera esta vista previa (permiso ya existente, sin cambios)<br>- El endpoint que genera el PDF de vista previa valida el mismo payload que ya valida `POST /invoices` (fiscal data del receptor, líneas), sin persistir nada |
| 2 | Facturista (`billing:write`) | Como facturista en modo de desarrollo/pruebas (`FACTURAMA_MOCK=true`), quiero que el PDF descargado de una factura mock simule el layout real de un CFDI para poder probar el flujo completo de descarga sin depender de credenciales reales de Facturama | - El PDF mock reemplaza el texto plano actual ("CFDI de prueba - modo mock") por un layout de factura real: emisor, receptor, tabla de conceptos, desglose de impuestos, totales, folio/UUID<br>- El documento queda marcado de forma visible como "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" para no confundirse con un CFDI real<br>- El XML mock también refleja emisor/receptor/conceptos en vez del stub mínimo actual<br>- El modo real (`FACTURAMA_MOCK=false`) no cambia — sigue descargando el PDF que devuelve Facturama tal cual | - El modo mock nunca debe activarse por accidente en producción — sin cambios al flag `FACTURAMA_MOCK` existente, sólo al contenido que genera `FakeFacturamaGateway` cuando está activo |

Nota: ambas historias comparten el mismo componente PDF de factura (nuevo, reutilizado por las dos), pero se mantienen separadas porque una es una funcionalidad nueva (descarga de vista previa) y la otra es una corrección de fidelidad del modo mock existente.

## Why

`InvoicePreviewModal` ya muestra en pantalla todo lo necesario de una factura antes de timbrar (logo, badge "BORRADOR", receptor, líneas, totales) pero no ofrece forma de llevarse ese contenido fuera del navegador — el usuario no puede compartirlo para aprobación ni archivarlo antes de decidir timbrar. Por otro lado, en modo mock (`FACTURAMA_MOCK=true`, default del proyecto) el PDF que se descarga de una factura ya timbrada es un documento de 300×150pt cuyo único contenido es la cadena `"CFDI de prueba - modo mock"` — no sirve para probar el flujo de descarga con algo que se parezca a un CFDI real, y el aspecto es lo bastante extraño como para percibirse como un bug ("texto de rock") en vez de un mock intencional.

## What Changes

- Nuevo componente PDF compartido `InvoiceDocumentPdf` (`src/modules/billing/infrastructure/pdf/`) con layout de CFDI 4.0: emisor, receptor, tabla de conceptos, desglose de impuestos, totales, folio/UUID, y una marca de agua/badge parametrizable.
- Nuevo endpoint `POST /api/v1/admin/invoices/preview/pdf` (`billing:write`) que recibe el mismo objeto `InvoicePreviewData` ya resuelto en el cliente (emisor, receptor, líneas, totales — el mismo que hoy alimenta `InvoicePreviewModal` en pantalla) y devuelve el PDF de `InvoiceDocumentPdf` marcado "BORRADOR — no válido fiscalmente", sin persistir ni llamar a Facturama. No re-resuelve `saleId` ni recalcula totales server-side — garantiza paridad exacta (WYSIWYG) entre lo que el usuario ve en el modal y lo que descarga.
- `InvoicePreviewModal` gana un botón "Descargar PDF" que llama al endpoint anterior.
- `FakeFacturamaGateway.download("pdf"/"xml")` reemplaza el PDF/XML stub por `InvoiceDocumentPdf` renderizado con datos de ejemplo consistentes, marcado "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL".

## Capabilities

### New Capabilities

(ninguna — se agregan requirements a capabilities existentes)

### Modified Capabilities

- `billing-api`: `Facturama gateway abstraction with mock mode` — PDF/XML mock realista. Se agrega el requirement `Invoice preview PDF endpoint` (nuevo, dentro de la misma capability — no amerita capability propia).
- `billing-ui`: `Invoice preview before stamping` — botón de descarga PDF.

## Impact

- **Backend**: `src/modules/billing/infrastructure/pdf/{InvoiceDocumentPdf.tsx,pdfStyles.ts}` (nuevo, patrón de `src/modules/reports/infrastructure/pdf/`), `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts`, `src/modules/billing/infrastructure/http/BillingController.ts` (nuevo endpoint, valida el body con Zod pero no recalcula totales), `app/api/v1/admin/invoices/preview/pdf/route.ts` (nuevo).
- **Frontend**: `app/(private)/billing/_blocks/InvoicePreviewModal.tsx`, `app/(private)/billing/_logic/services/` (nuevo servicio de descarga, mismo patrón que `downloadInvoiceFile.ts`).
- **De paso**: se corrigen los identificadores con homoglifos cirílicos en `FacturamaStampInput` (`FacturamaGateway.ts`, `StampInvoiceUseCase.ts`, `FacturamaRestGateway.ts`, `FakeFacturamaGateway.ts`) al tocar estos archivos — cambio mecánico de caracteres, sin alterar comportamiento.
- **Sin impacto** en el modo real (`FACTURAMA_MOCK=false`) — `FacturamaRestGateway.download` sigue devolviendo el archivo tal cual lo entrega Facturama.
