## Context

`add-pdf-design-system` (change 1) creó la infraestructura compartida y migró `quotes`; `unify-payments-inventory-pdf` (change 2) migró `payments`/`inventory`. Este change (3 de 4) migra `billing`, el módulo de mayor riesgo porque `InvoiceDocumentPdf` renderiza el watermark fiscal "BORRADOR — no válido fiscalmente" / "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL", requisito pinneado en `openspec/specs/billing-api/spec.md` (requerimientos "Invoice preview PDF endpoint" y "Facturama gateway abstraction with mock mode").

Investigación durante el diseño reveló que `InvoiceDocumentPdf` tiene DOS consumidores, no uno: `BillingController.previewPdf` (borrador antes de timbrar, datos del body validados con Zod) y `FakeFacturamaGateway.download` (el gateway mock — comportamiento **default** del sistema, no un test double, según el spec ya citado). El gateway real (`FacturamaRestGateway`) descarga el PDF ya generado por el PAC Facturama — no pasa por `InvoiceDocumentPdf`, así que queda fuera de alcance (no hay forma de inyectarle un logo).

## Goals / Non-Goals

**Goals:**
- Migrar `billing/pdfStyles.ts` a `pdfBaseStyles`/`pdfTheme`, con el watermark 100% intacto salvo el color.
- Activar el logo en `InvoiceDocumentPdf` sin interferir con el watermark.
- Wireear `logoUrl` en ambos consumidores reales de `InvoiceDocumentPdf` (`BillingController.previewPdf` y `FakeFacturamaGateway.download`).

**Non-Goals:**
- No se toca `FacturamaRestGateway` ni el flujo de descarga en modo real.
- No se toca el módulo `waybills` (tiene su propia copia independiente de `FakeFacturamaGateway`, confirmado que es un archivo separado, no la misma clase).
- No se cambia ninguna validación Zod, ni la lógica de cálculo de impuestos/totales.
- No se persiste ni se envía el logo a Facturama — es puramente visual, del lado de nuestro renderizado.

## Decisions

**1. `watermarkBanner`/`watermarkFooter` permanecen 100% locales a `billing/pdfStyles.ts`, nunca compuestos desde `pdfBaseStyles`.** — Decisión ya sentada en `add-pdf-design-system`; se reafirma aquí. Solo se cambia el valor de color (`#c00` → `PDF_COLORS.error`), referenciando la constante directamente, sin depender de ningún fragmento compartido de estructura/posición. Esto minimiza el blast radius de cualquier futuro cambio a `pdfBaseStyles` sobre el elemento más crítico del sistema.

**2. El logo se inserta en el header (bloque de emisor), nunca cerca del watermark banner/footer.** — El watermark banner es el primer elemento de la página (`<Text style={s.watermarkBanner}>`), separado estructuralmente del `<View style={s.header}>` que sigue. Se envuelve el bloque de emisor existente en un `issuerRow` (mismo patrón ya usado en `quotes`/`payments`/`inventory`) con `<PdfLogo>` + el bloque de nombre/RFC/sucursal, sin tocar `watermarkBanner`, `invoiceMeta`, ni `watermarkFooter`.

**3. `GetTicketSettingsUseCase` es requerido en `BillingController`, pero opcional en `FakeFacturamaGateway`.** — `BillingController` tiene solo 2 sitios de test que lo instancian directamente (`BillingControllerCsd.test.ts`, `BillingControllerScoping.test.ts`), mismo patrón que `PaymentsController`/`InventoryMovementsController` en change 2: parámetro requerido, tests actualizados. `FakeFacturamaGateway` tiene ~24 sitios de test que lo instancian sin argumentos (`new FakeFacturamaGateway()`) a través de módulos de test de `StampInvoiceUseCase`, `CancelInvoiceUseCase`, `BillingControllerCsd`, `BillingControllerScoping`, y su propio archivo de test — hacer el parámetro requerido rompería los 24 sitios para un cambio puramente cosmético (agregar un logo). Se hace opcional (`getTicketSettingsUseCase?: GetTicketSettingsUseCase`); cuando está ausente, `logoUrl` queda `undefined` y `PdfLogo`/`resolvePdfLogoSource` ya manejan ese caso (cae al fallback local) sin lanzar error.

**4. No se modifica el gateway real (`FacturamaRestGateway`) ni `waybills`.** — Confirmado que `waybills/infrastructure/services/FakeFacturamaGateway.ts` es un archivo/clase completamente separado de `billing/infrastructure/services/FakeFacturamaGateway.ts` (mismo nombre, distinta ubicación/módulo) — no hay blast radius cruzado. `FacturamaRestGateway` obtiene el PDF de un tercero (Facturama PAC); no hay forma de inyectarle un logo desde este código sin modificar el documento fiscal real, lo cual está explícitamente fuera de alcance del feature.

## Risks / Trade-offs

- **[Riesgo] El logo desplaza visualmente el bloque de emisor y hace que el watermark banner (que va justo arriba) parezca desalineado.** → Mitigación: verificación visual explícita del render completo (no solo que compile), comparando la posición vertical del watermark antes/después — debe ser idéntica porque `watermarkBanner` sigue siendo el primer elemento de la página, ajeno al `header`.
- **[Riesgo] Cambiar el color del watermark (`#c00`→`#ba1a1a`) reduce su visibilidad en el documento fiscal más sensible del sistema.** → Mitigación: `#ba1a1a` es más oscuro/saturado que `#c00` (contraste igual o mejor sobre fondo blanco); decisión ya validada explícitamente con el usuario en Plan Mode antes de iniciar el feature.
- **[Riesgo] `FakeFacturamaGateway` con parámetro opcional crea dos code paths (con/sin logo) que podrían divergir silenciosamente.** → Mitigación: el "sin logo" path es simplemente el comportamiento actual sin cambios (regresión imposible); el "con logo" path se prueba explícitamente con un test nuevo que sí inyecta el use case.
- **[Riesgo] La dependencia nueva en `BillingController` podría insertarse antes del guard `billing:write` en `previewPdf`, alterando el orden de checks.** → Mitigación: la llamada a `GetTicketSettingsUseCase.execute()` se agrega inmediatamente antes de `renderToBuffer`, después de `requirePermission` y de la validación Zod existentes — nunca antes.

## Migration Plan

1. Migrar `billing/pdfStyles.ts` a `pdfBaseStyles`/`pdfTheme`, eliminar el estilo `logo` muerto, cambiar color de watermark a `PDF_COLORS.error`.
2. Agregar `logoUrl` a `InvoiceDocumentPdfData.issuer`, renderizar `<PdfLogo>` en el header sin tocar watermark/footer.
3. `BillingController`: agregar `GetTicketSettingsUseCase` requerido, wireear en `previewPdf`.
4. `billing/infrastructure/di/container.ts`: instanciar y pasar el nuevo use case.
5. `FakeFacturamaGateway`: agregar `GetTicketSettingsUseCase` opcional, wireear en `download("pdf", ...)`.
6. Actualizar los 2 tests que instancian `BillingController` directamente.
7. Verificación manual (render real) + `npm test`/`npx tsc --noEmit`.

**Rollback**: revertir el commit — sin migración de datos, reversible sin efectos secundarios.

## Open Questions

Ninguna pendiente.
