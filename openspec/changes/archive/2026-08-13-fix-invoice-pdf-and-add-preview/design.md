## Context

Ver `proposal.md` — Why / Historia de Usuario. Contexto técnico relevante que condiciona el diseño:

- `Invoice.status` (Prisma) sólo admite `"stamped" | "cancelled"` — no existe ni se introduce un estado draft/preview.
- El módulo `billing` ya resuelve exactamente el mismo problema de "factura sin `facturamaCfdiId`" en `SendInvoiceEmailUseCase.ts:18` (lanza `InvoiceNotStampedError`, mapeado por `BillingController.ts:365-367` a `400 {error: err.message}`). El fix de descarga replica ese patrón en vez de inventar uno nuevo.
- El módulo ya tiene un modal de referencia (`CancelInvoiceModal.tsx`, `<dialog>` nativo con `dialogRef`/`showModal()`/`close()`) y un cálculo de totales client-side reutilizable (`computeInvoiceTotalsClient.ts`, ya usado por `PartialInvoiceForm`).
- `StampSaleForm`/`useStampSaleForm.ts` sólo guarda `saleId`, `saleLabel`, `paymentForm/Method`, `cfdiUse` — no tiene items ni datos fiscales del receptor; esos los resuelve hoy el backend dentro de `StampInvoiceUseCase.stampFromSale()`.

## Goals / Non-Goals

**Goals:**
- Eliminar el 200-con-archivo-vacío como respuesta posible de `GET /invoices/:id/download`, reusando el vocabulario de error de dominio ya existente (Historia #1).
- Dar visibilidad previa al operador de los datos que se timbrarán, sin introducir persistencia ni un segundo camino de emisión (Historia #2).
- Cero cambios a `StampInvoiceUseCase`, `InvoiceRepository`, `FacturamaGateway`, Prisma schema.

**Non-Goals:**
- No se busca que la vista previa sea pixel-perfect al PDF real emitido por Facturama (ese PDF lo genera el PAC, con sello/QR/cadena original — fuera del control de la app). La vista previa es una ayuda de verificación de datos, explícitamente marcada como borrador.
- No se agrega un endpoint de "preview" en el backend — toda la Parte B vive en `app/(private)/billing/`.
- No se resuelve el smell preexistente de `FacturamaRestGateway` reutilizando `FacturamaStampError` para timbrado standalone/desde-venta; sólo se evita repetirlo en la ruta nueva de `download`.

## Decisions

### D1 — Reusar `InvoiceNotStampedError` en vez de crear un error nuevo (Historia #1, AC1)
`DownloadInvoiceFileUseCase` lanzará el `InvoiceNotStampedError` de dominio ya existente (`src/modules/billing/domain/errors.ts:81-86`) cuando `!invoice.facturamaCfdiId`, en vez del error nuevo `InvoicePdfNotAvailableError` considerado inicialmente. Alternativa descartada: crear un error dedicado a "descarga" — se descartó porque el dominio ya modela exactamente esta condición ("la factura no está timbrada") en `SendInvoiceEmailUseCase`, y tener dos errores con el mismo significado para el mismo campo (`facturamaCfdiId` null) fragmentaría el manejo en frontend sin beneficio. `BillingController.download` replica el mapeo 400 ya usado en `sendEmail` línea 365-367.

### D2 — Nuevo error dedicado sólo para fallo real del gateway al descargar (Historia #1, AC3)
Se introduce `InvoiceFileDownloadFailedError` (dominio) siguiendo el patrón exacto de `InvoiceEmailSendFailedError` (mismo archivo, líneas 88-94) — constructor con `cause`, mapeado a HTTP 502. Alternativa descartada: reusar `FacturamaStampError` (como hace hoy `FacturamaRestGateway.download()` en su catch) — se descarta porque mezcla semánticamente "error de timbrado" con "error de descarga de un archivo ya timbrado"; el frontend necesita distinguir ambos mensajes (AC3 lo exige explícitamente: mensaje distinto al de "no timbrada").

### D3 — Defensa adicional de blob vacío en frontend (Historia #1, AC4)
Aunque el backend ya no debería responder 200 con contenido vacío tras D1/D2, `downloadInvoiceFile.ts` valida `blob.size === 0` tras un `res.ok` y lo trata igual que `InvoiceNotStampedError`. Es cinturón-y-tirantes explícitamente pedido en la Historia de Usuario (AC4) ante cualquier causa residual (proxy, caché, respuesta parcial) no cubierta por el contrato HTTP.

### D4 — Vista previa como paso intermedio del mismo formulario, no endpoint nuevo (Historia #2)
Decisión ya validada con el usuario antes del propose: botón "Vista previa" → modal client-side → botón "Timbrar ahora" reusa el `submit()` ya existente de cada hook (`usePartialInvoiceForm`/`useStampSaleForm`). Alternativa descartada: endpoint `POST /invoices/preview` que genere el PDF en servidor con `@react-pdf/renderer` (patrón `PaymentHistoryPdf.tsx`) — descartada por mayor costo de implementación sin beneficio funcional adicional (el usuario ya decidió esto en la fase de planificación).

### D5 — Logo fijo `public/logo.png` (Historia #2)
Se usa el asset corporativo fijo ya usado en `NavigationRail`/`TopAppBar`/auth/favicon, no el `TicketSettings.logoUrl` configurable por sucursal (feature de tickets, módulo `settings`). Decisión ya validada con el usuario: simplicidad, sin depender de que cada sucursal tenga el logo de ticket configurado.

### D6 — `PartialInvoiceForm` sin red; `StampSaleForm` con lecturas a endpoints existentes (Historia #2, Criterios de Seguridad)
`PartialInvoiceForm` ya tiene customer + líneas completas en su estado — la vista previa se construye con una función pura (`buildInvoicePreview`), sin fetch. `StampSaleForm` no tiene esos datos (ver Context) — abrir la vista previa ahí dispara `GET /api/v1/admin/sales/:id` + `GET /api/v1/admin/customers/:id`, ambos endpoints ya existentes y ya protegidos por `sales:read`/`customers:read` respectivamente. No se crea ningún endpoint nuevo ni se amplía superficie de exposición de datos (Criterio de Seguridad de la Historia #2): si el usuario de facturación no tiene esos permisos, la llamada falla con 403 y el modal muestra "No tienes permiso para ver los datos fiscales del cliente" en vez de datos parciales.

### D7 — Modal `<dialog>`, no panel inline (Historia #2)
Se replica el patrón visual/interacción de `CancelInvoiceModal.tsx` (`<dialog>` nativo). Alternativa descartada: sección inline dentro del formulario — se descarta porque `PartialInvoiceForm` ya es largo (catálogo expandible + tabla de líneas) y porque un modal comunica mejor la metáfora "así se vería la factura" que una sección más del form.

### D8 — El botón "Timbrar ahora" no crea un atajo de validación (Historia #2, Criterio de Seguridad)
"Timbrar ahora" no llama directamente a Facturama ni construye su propio payload — invoca la misma función `submit()` que ya usa el botón real "Emitir factura"/"Emitir factura parcial", que a su vez sigue pasando por la validación Zod y `StampInvoiceUseCase` sin cambios. Esto garantiza que la vista previa no pueda timbrar con datos que el flujo real rechazaría.

## Risks / Trade-offs

- **[Riesgo] Cambio de contrato HTTP en `download`** (200-vacío → 400/502) podría romper algún consumidor externo no identificado en el repo → **Mitigación**: no se encontró ningún consumidor fuera de `downloadInvoiceFile.ts` (único caller identificado en la exploración); se documenta como único ítem BREAKING en `proposal.md`.
- **[Riesgo] Vista previa de `StampSaleForm` puede confundirse con datos desactualizados** si la venta o el cliente cambian entre abrir el preview y confirmar el timbrado real (ventana de tiempo corta pero no nula) → **Mitigación**: el timbrado real vuelve a resolver todo desde cero en el backend (`StampInvoiceUseCase.stampFromSale`) — el preview es sólo informativo, nunca es la fuente de verdad que se timbra.
- **[Riesgo] Usuario confunde el borrador con un CFDI real** (sin sello/QR/folio fiscal reales) → **Mitigación**: badge "BORRADOR — no válido fiscalmente" + folio "PENDIENTE DE TIMBRAR" siempre visibles, requisito explícito de Historia #2.
- **[Trade-off] Preview de `StampSaleForm` no es 100% sin red** como sí lo es en `PartialInvoiceForm` → aceptado explícitamente (ver D6): sin esas lecturas el preview sería degradado (sin líneas reales, sin datos fiscales), restando valor a la feature.
