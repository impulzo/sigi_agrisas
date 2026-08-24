## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Desarrollador | Como desarrollador, quiero migrar `billing/pdfStyles.ts` para componer `pdfBaseStyles`/`pdfTheme`, manteniendo `watermarkBanner`/`watermarkFooter` 100% locales (sin heredar de `pdfBaseStyles`) pero usando `PDF_COLORS.error` en vez de `#c00` hardcodeado | Cerrar la brecha de color en el módulo de mayor riesgo, sin arriesgar el elemento visual más crítico del sistema (el watermark fiscal) | - `sectionTitle`, `tableHeader`, `tableRow`/`tableRowAlt`, `totalsBox`, bordes y grises mutados usan la paleta de marca<br>- `watermarkBanner`/`watermarkFooter` conservan exactamente su tamaño de fuente, posición y texto; solo su color cambia de `#c00` a `#ba1a1a`<br>- Comparación visual antes/después confirma que el watermark sigue igual o más visible (mismo contraste o mejor) | - Cambio puramente visual; no debe tocar `folioLabel`, `isDraft`, ni ninguna lógica de negocio del componente |
| 2 | Usuario que previsualiza una factura antes de timbrar | Como usuario con `billing:write` que genera el PDF de borrador (`POST /invoices/preview/pdf`), quiero ver el logo del negocio en el encabezado para verificar cómo se vería la factura final antes de timbrarla | El borrador debe reflejar fielmente cómo se verá el documento real, incluyendo la marca | - `InvoiceDocumentPdf` renderiza `<PdfLogo>` junto al bloque de emisor, sin superponerse ni desplazar el watermark "BORRADOR — no válido fiscalmente"<br>- El `logoUrl` se resuelve server-side vía `GetTicketSettingsUseCase`, nunca desde el body del request<br>- Si no hay logo configurado, usa el fallback `public/logo.png` | - `GetTicketSettingsUseCase` se agrega al constructor de `BillingController` y se invoca después del guard `billing:write` existente, sin alterar el orden de validación Zod/permisos ya descrito en el spec de este endpoint |
| 3 | Usuario en modo mock (`FACTURAMA_MOCK=true`, comportamiento default documentado en spec) | Como usuario que descarga el PDF de una factura timbrada en modo mock, quiero ver el logo del negocio para que el documento de prueba se vea consistente con el resto del sistema | El modo mock es el comportamiento default documentado — su PDF debe mantener el mismo estándar visual que el resto | - `FakeFacturamaGateway.download("pdf", cfdiId)` incluye el logo cuando se le inyecta `GetTicketSettingsUseCase`<br>- El parámetro es opcional en el constructor (sin romper los ~24 sitios de test existentes); si no se provee, el comportamiento es idéntico al actual<br>- El watermark "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" sigue intacto | - El gateway real (`FacturamaRestGateway`, modo no-mock) no se toca — sigue devolviendo el PDF real de Facturama sin pasar por `InvoiceDocumentPdf` |

Nota: se separan las historias 2 y 3 porque tocan puntos de inyección distintos con reglas de opcionalidad de dependencia distintas.

## Why

`billing/infrastructure/pdf/pdfStyles.ts` comparte estructura con `quotes` (ya migrado en `add-pdf-design-system`) pero nunca fue actualizado — sigue usando colores arbitrarios y un rojo `#c00` para el watermark fiscal en vez de la paleta de marca. `InvoiceDocumentPdf.tsx` tiene un estilo `logo` definido pero muerto (nunca referenciado en JSX) desde su creación. Este es el tercer change de la secuencia de 4: el de mayor riesgo porque `InvoiceDocumentPdf` renderiza el watermark "BORRADOR — no válido fiscalmente" / "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL", un requisito de negocio pinneado en `openspec/specs/billing-api/spec.md` que debe sobrevivir intacto. Se migra al final de los módulos "simples" (después de `quotes`, `payments`, `inventory`), con el patrón ya validado 3 veces.

Investigación adicional reveló que `InvoiceDocumentPdf` se usa en dos puntos, no solo en el endpoint de preview: `BillingController.previewPdf` (borrador antes de timbrar) y `FakeFacturamaGateway.download` (el gateway mock, que es el comportamiento **default** del sistema cuando `FACTURAMA_MOCK=true` — documentado explícitamente en `openspec/specs/billing-api/spec.md`, no un simple test double). El gateway real (`FacturamaRestGateway`) no usa `InvoiceDocumentPdf` en absoluto — descarga el PDF ya generado por el PAC externo, fuera de nuestro control.

## What Changes

- `billing/infrastructure/pdf/pdfStyles.ts` se reconstruye componiendo `pdfBaseStyles`/`pdfTheme`. Se elimina el estilo `logo` muerto (superseded por el componente compartido `<PdfLogo>`). `watermarkBanner`/`watermarkFooter` permanecen con su estructura 100% local (no derivada de `pdfBaseStyles`), solo cambiando su color de `#c00` a `PDF_COLORS.error` (`#ba1a1a`).
- `InvoiceDocumentPdf.tsx`: se agrega `logoUrl: string | null` a `InvoiceDocumentPdfData.issuer`, y se renderiza `<PdfLogo>` junto al bloque de emisor en el header, sin tocar la posición/tamaño del watermark banner ni del footer.
- `BillingController.ts`: se agrega `GetTicketSettingsUseCase` (requerido) al constructor; en `previewPdf`, se obtiene `logoUrl` server-side y se inyecta en `data.issuer` antes de renderizar — el cliente no puede controlar el logo vía el body.
- `billing/infrastructure/di/container.ts`: se instancia `GetTicketSettingsUseCase` y se pasa a `BillingController`.
- `FakeFacturamaGateway.ts`: se agrega `GetTicketSettingsUseCase` como parámetro **opcional** del constructor (para no romper los ~24 sitios de test que lo instancian sin argumentos); en `download("pdf", ...)`, si está presente, se obtiene `logoUrl` y se inyecta en `data.issuer`.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `billing-api`: el endpoint de preview PDF (`POST /api/v1/admin/invoices/preview/pdf`) y el comportamiento de descarga en modo mock (`FakeFacturamaGateway.download`) ahora incluyen el logo del negocio y usan la paleta de colores de marca, sin alterar el watermark fiscal.

## Impact

- **Archivos modificados**: `src/modules/billing/infrastructure/pdf/{pdfStyles.ts, InvoiceDocumentPdf.tsx}`, `src/modules/billing/infrastructure/http/BillingController.ts`, `src/modules/billing/infrastructure/di/container.ts`, `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts`.
- **Tests actualizados**: `tests/unit/modules/billing/infrastructure/http/BillingControllerCsd.test.ts`, `tests/unit/modules/billing/infrastructure/http/BillingControllerScoping.test.ts` (agregan el nuevo parámetro requerido de `BillingController`); ningún test de `FakeFacturamaGateway`/`StampInvoiceUseCase`/`CancelInvoiceUseCase` necesita cambios (parámetro opcional).
- **Sin cambios de esquema de base de datos ni de contrato HTTP** — mismo filename, mismo `Content-Disposition`, mismo comportamiento de validación.
- **Fuera de alcance**: `FacturamaRestGateway` (modo real, `FACTURAMA_MOCK=false`) y el módulo `waybills` (tiene su propia copia independiente de `FakeFacturamaGateway`, no relacionada).
