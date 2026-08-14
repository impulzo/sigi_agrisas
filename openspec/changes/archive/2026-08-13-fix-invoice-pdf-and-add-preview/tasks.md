## 1. Backend — fix de descarga de PDF/XML (Historia #1)

- [x] 1.1 Agregar `InvoiceFileDownloadFailedError` a `src/modules/billing/domain/errors.ts` (patrón `InvoiceEmailSendFailedError`).
- [x] 1.2 En `DownloadInvoiceFileUseCase.ts`, lanzar `InvoiceNotStampedError` cuando `!invoice.facturamaCfdiId` (reemplaza el bloque de contenido vacío).
- [x] 1.3 En `DownloadInvoiceFileUseCase.ts`, envolver la llamada a `gateway.download()` en try/catch y relanzar como `InvoiceFileDownloadFailedError` cuando el gateway falle.
- [x] 1.4 En `BillingController.ts` (método `download`), extender el catch para mapear `InvoiceNotStampedError` → 400 `{error: err.message}` y `InvoiceFileDownloadFailedError` → 502 `{error: err.message}`, replicando el patrón exacto del método `sendEmail` (líneas 361-371). Agregar los imports correspondientes.

## 2. Backend — tests (Historia #1)

- [x] 2.1 Crear `tests/unit/modules/billing/DownloadInvoiceFileUseCase.test.ts` (node, `InMemoryInvoiceRepository`/repo mock + `FacturamaGateway`): sin `facturamaCfdiId` → lanza `InvoiceNotStampedError`; con `facturamaCfdiId` → retorna filename correcto; gateway lanza error → se relanza como `InvoiceFileDownloadFailedError`.
- [x] 2.2 Extender `tests/unit/modules/billing/infrastructure/http/BillingControllerScoping.test.ts` cubriendo `download`: 400 con `InvoiceNotStampedError`, 502 con `InvoiceFileDownloadFailedError`, 404 regresión con `InvoiceNotFoundError`.

## 3. Frontend — fix de descarga de PDF/XML (Historia #1)

- [x] 3.1 Agregar `InvoiceFileDownloadFailedError` a `app/(private)/billing/_logic/errors.ts` (mensaje: "No se pudo descargar el archivo de la factura. Intenta de nuevo."). `InvoiceNotStampedError` ya existe ahí — no duplicar.
- [x] 3.2 Reescribir el manejo de errores de `app/(private)/billing/_logic/services/downloadInvoiceFile.ts` replicando exactamente el patrón de `sendInvoiceEmail.ts` (branching por status 400/502, lectura de `{error}` del body), y agregar la defensa de `blob.size === 0` → `InvoiceNotStampedError`.
- [x] 3.3 Verificado: `InvoiceDetailPage.tsx:110-112` ya renderiza `mutationError.message` — sin cambios necesarios.

## 4. Frontend — tests (Historia #1)

- [x] 4.1 Extendido `tests/unit/ui/(private)/billing/services.test.ts` con los 3 casos nuevos: 400 → `InvoiceNotStampedError`, 502 → `InvoiceFileDownloadFailedError`, blob vacío con `res.ok` → `InvoiceNotStampedError`. 16/16 tests pasan.

## 5. Verificación manual — Parte A (Historia #1)

- [x] 5.1 Verificado en navegador real (login admin + datos de prueba): factura con `facturama_cfdi_id=NULL` forzado vía SQL → "Descargar PDF" → 400, banner "Esta factura no ha sido timbrada", `downloadCalled=false` (sin archivo corrupto). Dato restaurado tras la prueba.
- [x] 5.2 Verificado: factura recién timbrada (mock) → "Descargar PDF" → 200, blob con filename `<UUID>.pdf` correcto, sin banner de error (regresión OK).

## 6. Frontend — tipos y lógica pura de la vista previa (Historia #2)

- [x] 6.1 Crear `app/(private)/billing/_logic/types/preview.ts` con `InvoicePreviewLine` e `InvoicePreviewData` (issuer, receiver, lines, paymentForm/Method, subtotal/taxTotal/total, currency).
- [x] 6.2 Crear `app/(private)/billing/_logic/lib/buildInvoicePreview.ts`: función pura que arma `InvoicePreviewData` reusando `computeInvoiceTotalsClient` para las cifras (sin red, testeable sin DOM).
- [x] 6.3 Test `buildInvoicePreview.test.ts` (jsdom): valida totales vía `computeInvoiceTotalsClient` sobre un set de líneas de ejemplo. 4/4 tests pasan.

## 7. Frontend — resolución de datos para `StampSaleForm` (Historia #2)

- [x] 7.1 Crear `app/(private)/billing/_logic/services/getInvoicePreviewSource.ts`: `getInvoicePreviewSource(saleId, fetchImpl = authFetch)` llama `GET /api/v1/admin/sales/:id` y, si hay `customerId`, `GET /api/v1/admin/customers/:id`; normaliza a un shape local reducido (sin importar tipos completos del módulo `sales`). Maneja: sale 404 → error claro; sin `customerId` → "Esta venta no tiene cliente asociado, no se puede facturar"; 403 en customer → "No tienes permiso para ver los datos fiscales del cliente".
- [x] 7.2 Crear `app/(private)/billing/_logic/hooks/useInvoicePreview.ts`: encapsula `isLoading`/`data`/`error` sobre `getInvoicePreviewSource` + `buildInvoicePreview`, para que `StampSaleForm` no haga fetch directo.
- [x] 7.3 Test `getInvoicePreviewSource.test.ts` (jsdom, `fetchImpl` mockeado): happy path, sale sin `customerId`, 404 en sale, 403 en customer. 4/4 tests pasan.

## 8. Frontend — componente `InvoicePreviewModal` (Historia #2)

- [x] 8.1 Crear `app/(private)/billing/_blocks/InvoicePreviewModal.tsx` (`"use client"`, patrón `<dialog>` de `CancelInvoiceModal.tsx`). Props: `{ open, onClose, data: InvoicePreviewData | null, isLoading?, loadError?, onConfirmStamp, isSubmitting }`.
- [x] 8.2 Header con `<img src="/logo.png" alt="Agrisas" />` + emisor/sucursal; badge "BORRADOR — no válido fiscalmente" con tokens `bg-secondary-container`/`text-on-secondary-container` (sin hex crudo, sin clases fuera de escala); folio fijo "PENDIENTE DE TIMBRAR". Nota: se usa un layout basado en `<div>`+grid (no `<table>`) para líneas, ya que este archivo es nuevo en `_blocks/` y el guardrail `tests/unit/ui/design-system/tokens.test.ts` prohíbe `<table>`/`<button>`/`<select>` crudos en archivos nuevos; botones usan el átomo `Button`.
- [x] 8.3 Sección receptor con el mismo layout visual que `InvoiceMetaPanel.tsx`; líneas + totales con el mismo layout visual que `InvoiceItemsTable.tsx` (adaptado a divs/grid).
- [x] 8.4 Footer con botones "Volver a editar" (cierra modal sin efectos) y "Timbrar ahora" (`onConfirmStamp`, disabled si `isSubmitting` o `loadError`). Estado de carga simple si `isLoading`.
- [x] 8.5 Test `InvoicePreviewModal.test.tsx` (jsdom): con data mock, verifica presencia de badge "BORRADOR", folio "PENDIENTE DE TIMBRAR", logo, click en "Timbrar ahora"/"Volver a editar", estados loading/error. 5/5 tests pasan. Guardrail `design-system/tokens.test.ts` verificado en verde con el archivo nuevo.

## 9. Integración en `PartialInvoiceForm` (Historia #2)

- [x] 9.1 Agregar botón "Vista previa" (mismas condiciones de disabled que el submit real: hay líneas + customer + sin campos fiscales faltantes) y estado local `showPreview`.
- [x] 9.2 Construir `InvoicePreviewData` con `buildInvoicePreview` a partir del estado ya disponible del hook (sin red) y pasarlo a `InvoicePreviewModal`.
- [x] 9.3 Wiring de "Timbrar ahora": cerrar modal + invocar el `submit()` ya existente (sin duplicar lógica de negocio).
- [x] 9.4 Verificado en navegador real: cliente + línea libre ($250, IVA 16%) → "Vista previa" → modal abre con logo (`naturalWidth=2536`, cargó bien), badge "BORRADOR", folio "PENDIENTE DE TIMBRAR", receptor y totales ($215.52/$34.48/$250.00) coincidentes con el form. "Timbrar ahora" → `POST /invoices 201` real → redirige a `/billing/[id]` con la factura "Vigente".

## 10. Integración en `StampSaleForm` (Historia #2)

- [x] 10.1 Agregar botón "Vista previa" (disabled si `!form.saleId`).
- [x] 10.2 Al click, disparar `useInvoicePreview().load(form.saleId, {...})` y abrir el modal en estado de carga.
- [x] 10.3 Wiring de "Timbrar ahora": cerrar modal + invocar el `submit()` ya existente de `useStampSaleForm` (sin cambios al use case real).
- [x] 10.4 Verificado en navegador real: venta con cliente → "Vista previa" → `GET /sales/:id` + `GET /customers/:id` (confirmado en log) → modal con líneas reales de la venta ("RAFIA GRUESA 1KG", "SUNFIRE 250 LT"...) y datos fiscales reales del cliente + sucursal "Matriz". "Timbrar ahora" → `POST /invoices 201` real → redirige a `/billing/[id]`.
- [x] 10.5 Verificado: venta sin `customerId` (folio TK-12, forzada por búsqueda "Sin cliente") → "Vista previa" → mensaje "Esta venta no tiene cliente asociado, no se puede facturar", sin crash, botón "Timbrar ahora" `disabled=true`.

## 11. Cierre

- [x] 11.1 Suite completa (`npx jest`) en verde: 464 suites, 3265 tests, incluyendo el guardrail `tests/unit/ui/design-system/tokens.test.ts`. `npx tsc --noEmit` también en verde.
- [x] 11.2 `npm run build` exitoso (compilación de producción, incluye rutas `/billing`, `/billing/[id]`, `/billing/new`).
- [x] 11.3 Revisión manual final completa en `npm run dev` con sesión real (admin sembrado): ambos flujos (Parte A + Parte B) verificados end-to-end en navegador, incluyendo timbrado real de 2 facturas de prueba (parcial y desde venta). Dos facturas de prueba quedaron creadas en BD (`114035b6-...`, `b0b07adf-...`) — datos de QA, no se limpiaron (mismo criterio que el resto de datos QA ya presentes en la BD de desarrollo).

## 12. Fix adicional post-QA — PDF stub de `FakeFacturamaGateway` corrupto

Hallazgo durante la verificación manual: al abrir un PDF descargado de una factura sí timbrada (bajo `FACTURAMA_MOCK=true`, modo por defecto en dev), el visor no podía abrirlo. Causa: `FAKE_PDF_BASE64` en `FakeFacturamaGateway.ts` era un PDF truncado a propósito (91 bytes, sin `endstream`/`xref`/`trailer`/`%%EOF`) — nunca fue un archivo válido, independiente del fix de la Parte A (que cubre el caso de factura sin `facturamaCfdiId`, no el contenido del stub). No estaba cubierto por ningún requirement de las specs delta de este change (los requirements sólo hablan del comportamiento HTTP de la ruta de descarga, no de la validez del contenido devuelto por el gateway mock). Se corrige por ser la continuación directa del mismo reporte de usuario ("error al mostrar factura en pdf"), sin cambiar contrato ni specs.

- [x] 12.1 Reemplazar `FAKE_PDF_BASE64` en `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts` por un PDF de una página mínimo pero **estructuralmente válido** (xref/trailer/%%EOF correctos, 610 bytes). `FAKE_XML_BASE64` ya era XML válido — sin cambios.
- [x] 12.2 Test `tests/unit/modules/billing/FakeFacturamaGateway.test.ts` — sin cambios necesarios (ya sólo valida `contentBase64` truthy + `contentType`, no bytes exactos); confirmado en verde (172/172 tests de billing).
- [x] 12.3 Verificación manual: descarga real vía `GET /api/v1/admin/invoices/:id/download?format=pdf` (200, 610 bytes) para la factura de prueba `114035b6-...` (la misma que el usuario reportó rota) → `file` la reconoce como "PDF document, version 1.4, 1 pages" → **abre correctamente en macOS Preview** (antes fallaba).
