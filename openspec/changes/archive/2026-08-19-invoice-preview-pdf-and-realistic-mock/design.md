## Context

`InvoicePreviewModal.tsx` ya construye `InvoicePreviewData` (`app/(private)/billing/_logic/types/preview.ts`: `issuer`, `receiver`, `lines[]`, `paymentForm`, `paymentMethod`, `subtotal`, `taxTotal`, `total`, `currency`) enteramente en el cliente — desde el estado local de `PartialInvoiceForm`, o resolviendo `GET /sales/:id` + `GET /customers/:id` en `StampSaleForm` (`app/(private)/billing/_logic/lib/buildInvoicePreview.ts`). Ningún archivo de `billing` usa `@react-pdf/renderer` hoy; el patrón `renderToBuffer(createElement(XxxPdf, {data}))` ya está probado en `src/modules/reports/infrastructure/pdf/*.tsx` y `src/modules/payments/infrastructure/pdf/PaymentHistoryPdf.tsx`. `FakeFacturamaGateway.download()` (`src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts:40-45`) devuelve constantes base64 fijas (`FAKE_PDF_BASE64`, `FAKE_XML_BASE64`) sin parámetro de datos — `stamp()` no guarda el `input` recibido en ningún lado.

## Goals / Non-Goals

**Goals:**
- Descargar como PDF exactamente lo que `InvoicePreviewModal` ya muestra en pantalla, sin re-derivar datos server-side (historia 1).
- PDF/XML mock con layout de CFDI reconocible, marcado inequívocamente como no fiscal (historia 2).

**Non-Goals:**
- No se persiste nada por descargar la vista previa — sigue siendo un documento efímero, `Invoice.status` sigue siendo sólo `"stamped" | "cancelled"` (invariante ya establecido en "Invoice preview before stamping").
- No se cambia el modo real (`FACTURAMA_MOCK=false`) — `FacturamaRestGateway.download` sigue delegando 100% a Facturama.
- No se implementa QR real ni sello digital criptográfico — placeholders visuales únicamente, tanto en el PDF de vista previa como en el mock.
- No se resuelve `saleId` en el nuevo endpoint — el cliente ya resolvió todo a `InvoicePreviewData` antes de pedir el PDF (evita duplicar la lógica de `buildInvoicePreview.ts` en el backend).

## Decisions

**D1 — Endpoint de preview recibe `InvoicePreviewData` ya resuelto, no `saleId`/`customer`+`items` como `POST /invoices`.**
Alternativa descartada: reutilizar el mismo shape discriminado de `POST /invoices` y que el backend resuelva la venta/cliente igual que `StampInvoiceUseCase`. Se descarta porque duplicaría la lógica de resolución que el cliente YA ejecutó para pintar el modal (`buildInvoicePreview.ts`), con riesgo de que ambos caminos diverjan (ej. redondeo). Enviar el objeto ya resuelto garantiza que el PDF sea *exactamente* lo que el usuario vio en pantalla — sin segunda fuente de verdad.

**D2 — `InvoiceDocumentPdf` es un componente puro `(data: InvoiceDocumentPdfData, watermark?: string) => JSX`, reutilizado por 2 llamadores distintos.**
Llamador A: el nuevo endpoint de preview (`watermark="BORRADOR — no válido fiscalmente"`, sin `uuid`/folio real — usa el placeholder "PENDIENTE DE TIMBRAR" ya usado en pantalla). Llamador B: `FakeFacturamaGateway.download()` (`watermark="DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL"`, con el `uuid`/`cfdiId` fake ya generados por `stamp()`). Un solo componente evita mantener 2 layouts de factura ligeramente distintos.

**D3 — `FakeFacturamaGateway.stamp()` guarda el `input` recibido en un `Map<cfdiId, input>` en memoria, para que `download()` tenga datos reales que renderizar.**
Alternativa descartada: que `download()` reciba datos genéricos hardcodeados (como hoy). Se descarta porque el criterio de aceptación pide que el mock "simule una factura real" — sin guardar el input de `stamp()`, `download()` no tiene emisor/receptor/conceptos reales que mostrar. El `Map` es en memoria (no persistido), consistente con que `FakeFacturamaGateway` ya es completamente stateless salvo `cancelledIds` (mismo patrón, `Set` en memoria).

**D4 — Validación del body del endpoint de preview es estructural (Zod), no de reglas de negocio.**
El endpoint no verifica que el cliente exista, que el RFC sea válido contra SAT, etc. — esas reglas ya se aplicaron client-side al construir `InvoicePreviewData` (o se aplicarán en el `POST /invoices` real al timbrar). El endpoint de preview sólo valida la FORMA del body (campos requeridos, tipos) para poder renderizar el PDF sin lanzar una excepción no controlada.

**Amendment (durante apply):** el proyecto Jest "backend" (`testEnvironment: "node"`) usa `tsconfig.json` con `jsx: "preserve"` — cualquier archivo `.tsx` con JSX literal importado transitivamente por un test de ese proyecto falla con `SyntaxError: Unexpected token '<'`, porque ts-jest no transforma JSX bajo esa opción (el patrón ya establecido en `tests/unit/modules/reports/infrastructure/http/ReportsController.test.ts` confirma esto — mockea individualmente cada componente PDF real además de `@react-pdf/renderer`). Se aplicó el mismo patrón: todo test backend que importa `BillingController.ts` o `FakeFacturamaGateway.ts` (ambos ahora importan `InvoiceDocumentPdf.tsx`) agrega `jest.mock(".../InvoiceDocumentPdf", () => ({ InvoiceDocumentPdf: () => null }))`. Esto no compromete la cobertura de 5.1/5.2: como `createElement(InvoiceDocumentPdf, props)` sigue siendo React real (sólo el componente en sí está mockeado), los tests inspeccionan `renderToBuffer.mock.calls[0][0].props.data` para verificar que el RFC/conceptos correctos llegan al componente — la responsabilidad bajo prueba (mapeo de datos) queda cubierta sin necesitar renderizar JSX real en el entorno Node de test.

## Risks / Trade-offs

- **[Riesgo]** Como el endpoint de preview confía en los totales que el cliente ya calculó (no los recalcula), un cliente malicioso podría enviar totales inconsistentes con las líneas → **Mitigación**: el documento resultante es explícitamente un PDF marcado "BORRADOR — no válido fiscalmente", sin ningún efecto legal o transaccional (no se persiste, no se timbra) — el peor caso es un PDF decorativo con números incorrectos, no una factura fiscal fraudulenta.
- **[Trade-off]** El `Map` de `FakeFacturamaGateway` crece con cada `stamp()` en memoria del proceso (nunca se purga) → aceptable porque `FakeFacturamaGateway` sólo se usa en desarrollo/pruebas (`FACTURAMA_MOCK=true`), nunca en producción con tráfico sostenido.
