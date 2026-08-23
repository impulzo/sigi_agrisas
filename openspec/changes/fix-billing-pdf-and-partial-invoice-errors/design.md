## Context

Los dos bugs reportados por el usuario ("error al generar prefactura en pdf", "error al crear factura parcial") comparten el mismo patrón de causa raíz: los servicios frontend de facturación (`app/(private)/billing/_logic/services/`) sólo reconocen un shape de error 400 (`ReceiverFiscalDataIncomplete`) y colapsan cualquier otro 400 del backend a `NetworkError` genérico — violando el requirement ya vigente "Typed services and error normalization" (`billing-ui`). Investigación hecha leyendo código fuente real (no sólo grep), con la causa raíz de cada uno confirmada:

- **Historia 1** (prefactura PDF): `getInvoicePreviewSource.ts` adapta `SaleItemDto` (que declara `discountPct`/`ivaRate`/`iepsRate` como `number | null`) a un tipo interno (`InvoicePreviewSaleItemSource`) que promete no-nullable, sin normalizar el dato — el `null` real llega intacto hasta el POST. El backend (`previewLineSchema`) exige `z.number()` no-nullable → 400 → el cliente lo traduce a "Network error" sin explicación.
- **Historia 2** (factura parcial): dos 400 reales no reconocidos por `stampInvoice.ts` — `BranchRequired` (usuario sin `branchId` y sin sucursal matriz configurada) y errores de validación Zod sobre `satProductCode` capturado a mano (el input UI en `PartialInvoiceLineRow.tsx` sólo limita `maxLength={8}` sin exigir formato completo).
- **Historia 3** (hallazgo adicional, confirmado con el usuario): `InvoiceDocumentPdf.tsx` usa la misma función `pct()` (asume escala 0–1, multiplica ×100) para `discountPct` (escala 0–100 real, ver `CLAUDE.md` § "Cálculo de totales") e `ivaRate`/`iepsRate` (escala 0–1 real) — infla el descuento mostrado.

## Goals / Non-Goals

**Goals:**
- Historia 1: que la descarga de PDF de vista previa funcione con líneas que tengan campos `null` en la venta origen, y que un fallo del backend (cualquiera) se muestre con un mensaje accionable, no "Network error".
- Historia 2: que los dos disparadores reales de 400 en factura parcial (`BranchRequired`, `satProductCode` inválido) se traduzcan a mensajes específicos, y que el segundo se prevenga en el propio formulario antes de llegar al backend.
- Historia 3: corregir el cálculo de porcentaje de descuento en el PDF sin afectar el cálculo de IVA/IEPS que ya es correcto.
- Cerrar el patrón general: ningún 400 del backend de facturación debe colapsar silenciosamente a un error genérico — extiende (no reemplaza) el mecanismo de "Typed services and error normalization" ya vigente.

**Non-Goals:**
- No se rediseña el flujo de timbrado real ni la persistencia de `Invoice` — cero cambios en `StampInvoiceUseCase`, Facturama gateway, o el modelo de datos.
- No se agrega un tipo de error nuevo por cada posible fallo de validación Zod — sólo `BranchRequired` obtiene una clase de error dedicada (es un caso semántico distinto, accionable con un mensaje específico); el resto de errores de validación Zod usa un mensaje genérico derivado del `fieldErrors` real, no un catálogo de errores por campo.
- No se toca el branch scoping ni el gating de permisos (`billing:write`) — Criterio de Seguridad de la Historia 1 y 2 de `proposal.md` se cumple por construcción: ningún archivo de este cambio toca `requirePermission`/`resolveScopedBranchId`.
- No se corrige aquí el hecho de que `StampInvoiceUseCase`/`InvoiceTotalsCalculator` lanzan `Error` planos (no subclases de dominio) en invariantes internas — está fuera del alcance reportado; si se detecta como bug futuro, es un cambio separado.

## Decisions

**1. Normalizar `null → 0` en `getInvoicePreviewSource.ts`, no relajar el schema Zod del backend (`previewLineSchema`).**
El schema Zod ya exige `number` no-nullable para `discountPct`/`ivaRate`/`iepsRate`, y esa exigencia es correcta — el PDF y los cálculos de totales necesitan números reales, no `null`. El bug está en el punto de adaptación cliente (`getInvoicePreviewSource.ts`), donde el DTO real del API (que sí es nullable, `SaleItemDto`) se reinterpreta sin normalizar. Fix mínimo: mapear explícitamente cada item con `discountPct: item.discountPct ?? 0` (mismo criterio para `ivaRate`/`iepsRate`), en el mismo lugar donde ya se adaptan otros campos (`branchName`, `customerId`). Alternativa descartada: relajar `previewLineSchema` a `.nullable()` y normalizar en el backend — movería la responsabilidad de normalización lejos de donde realmente se origina la discrepancia de tipos, y dejaría el mismo tipo mentiroso (`InvoicePreviewSaleItemSource`) sin corregir para cualquier otro consumidor futuro.

**2. Errores 400 no reconocidos: mensaje derivado del `fieldErrors`, no un catálogo de errores tipados por campo.**
Zod's `.flatten()` ya produce un shape `{ fieldErrors: Record<string, string[]>, formErrors: string[] }` legible. En vez de crear una clase de error por cada posible campo inválido (`SatProductCodeInvalidError`, etc. — combinatoria innecesaria), `stampInvoice.ts` y `downloadInvoicePreviewPdf.ts` extraen el primer mensaje disponible de `fieldErrors`/`formErrors` y lo envuelven en un `Error(mensaje)` genérico. Esto es consistente con cómo el resto de errores de validación en el proyecto ya se muestran (`err.message` renderizado directo en el formulario) — no se necesita un tipo por campo para que el usuario vea un mensaje útil.

**3. `BranchRequired` sí obtiene una clase de error dedicada (`BranchRequiredError`), a diferencia de los demás 400.**
Es un caso semántico distinto y accionable — el mensaje no es "corrige este campo", es "falta configuración a nivel sucursal" (requiere navegar a `/catalogs/branches`, no editar el formulario actual). Mismo molde que los demás errores tipados ya en `errors.ts` (`InvoiceNoEmailError`, `BillingForbiddenError`) — constructor sin parámetros, mensaje fijo en español.

**4. Prevenir el 400 de `satProductCode` en el formulario, no sólo mostrar mejor su error.**
`PartialInvoiceLineRow.tsx` ya usa `maxLength={8}` como único límite — insuficiente porque permite longitudes intermedias (1-7 dígitos) que sí llegan al submit. Se agrega validación de formato completo (regex `^\d{8}$` o vacío) antes de permitir el submit, replicando el patrón ya usado en el mismo formulario para el chequeo de precio cero (`usePartialInvoiceForm.ts`, bloqueo con mensaje inline antes de llamar al servicio) — consistente con "Criterios de Seguridad"/UX del resto del formulario: fallar rápido en cliente en vez de depender sólo del error del servidor.

**5. `try/catch` en `BillingController.previewPdf` alrededor de `renderToBuffer`, igual patrón que los demás handlers del controller.**
Es una capa de defensa (no la causa raíz de la Historia 1) — cierra el mismo antipatrón de "excepción no manejada = 500 sin body JSON" que hizo más difícil diagnosticar el bug original. Mismo molde que `stamp`/`cancel`/`download`/`email`/`uploadCsd`, que ya envuelven su lógica core y traducen excepciones a `NextResponse.json({error, ...}, {status})`.

**6. Corrección de `pct()` en `InvoiceDocumentPdf.tsx` Y `InvoicePreviewModal.tsx`: no reusar la misma función para `discountPct` e `ivaRate`/`iepsRate`.**
Ambos campos comparten hoy `pct(n) = (n*100).toFixed(0)+"%"`, correcto sólo para `ivaRate`/`iepsRate` (escala 0–1). Fix: en la línea que renderiza `discountPct`, usar directamente `${line.discountPct.toFixed(0)}%` (ya está en escala 0–100) — no una función nueva compartida, evita over-engineering para un solo call site. `pct()` se mantiene sin cambios para `ivaRate`. Como `InvoiceDocumentPdf` es el único componente PDF usado tanto para la prefactura (`BillingController.previewPdf`) como para el PDF de factura ya timbrada (`FakeFacturamaGateway`), el fix cubre ambos casos con un solo cambio.
**Ampliación confirmada con el usuario durante implementación**: `InvoicePreviewModal.tsx` (la vista previa en pantalla, no sólo el PDF descargado) tiene el mismo bug con el mismo `pct()` — y un comentario en `InvoiceDocumentPdf.tsx` declara explícitamente que el PDF debe ser WYSIWYG respecto a la pantalla. Corregir sólo el PDF rompería esa paridad (pantalla mostraría el descuento inflado, PDF descargado el correcto). Se corrige el mismo patrón en ambos archivos.

**7. `PartialInvoiceForm.tsx`: `rfc` gana el mismo fallback `?? ""` que ya tenían `cfdiUse`/`fiscalRegime`/`taxZipCode`.**
Hallazgo confirmado con el usuario durante la verificación manual (Historia 2, task 6.3): `handleCustomerSelect` y el callback `onCreated` de `CustomerQuickAddModal` (dos call sites en el mismo archivo) construían el objeto `CustomerFiscal` con `rfc: dto.rfc` sin normalizar, mientras los otros tres campos fiscales sí usaban `?? ""` — asimetría injustificada dentro de la misma llamada. Con un cliente real de la BD de desarrollo con `rfc: null` (reproducible, no un caso sintético), esto tumbaba toda la página con `TypeError: Cannot read properties of null (reading 'trim')` dentro de `missingFiscalFields` (`usePartialInvoiceForm.ts:42`), en vez de listar "RFC" como campo fiscal faltante (que es el comportamiento correcto — `missingFiscalFields` ya sabe tratar string vacío como "falta este campo"). Fix: mismo patrón `?? ""` en los dos call sites — sin tocar `missingFiscalFields`, que ya maneja el caso correctamente una vez que recibe un string.

## Risks / Trade-offs

- **[Riesgo] Normalizar `null → 0` en `getInvoicePreviewSource.ts` podría ocultar un caso legítimo donde el `null` debería bloquear la vista previa (ej. venta con datos corruptos).** Mitigación: `null` en estos tres campos es un estado válido y esperado del dominio (documentado en `CLAUDE.md`: `iva_rate`/`ieps_rate` nullable en `Product`, líneas sin descuento) — no es un caso de error, es el mismo criterio que ya usa `computeTotalsClient.ts` para el cálculo en pantalla. No hay pérdida de detección de errores reales.
- **[Riesgo] El mensaje genérico derivado de `fieldErrors` para errores Zod no traducidos podría mostrar nombres de campo en inglés/técnicos (ej. `"satProductCode"`) en vez de una etiqueta amigable.** Mitigación: aceptable como mejora incremental sobre el estado actual (que no mostraba nada útil); no bloquea esta historia — si se requiere una traducción de labels por campo, es un refinamiento de UX separado.
- **[Trade-off] La validación de `satProductCode` en el cliente (Decisión 4) duplica parcialmente la regla ya validada en el backend (`^\d{8}$`)** — trade-off aceptado, mismo patrón que el resto del proyecto (Zod en HTTP + validación de dominio, más validación de UX en cliente para fallar rápido) — no es una fuente de verdad nueva, sólo un guard adicional.

## Migration Plan

Cambio de una sola pasada, sin migración de datos ni cambio de contrato de API público (los códigos `BranchRequired` y `fieldErrors` de Zod ya existen en el backend hoy).

1. `getInvoicePreviewSource.ts` (Historia 1, causa raíz).
2. `downloadInvoicePreviewPdf.ts` (Historia 1, error surfacing).
3. `BillingController.previewPdf` — `try/catch` (Historia 1, defensa).
4. `InvoiceDocumentPdf.tsx` — fix `discountPct` (Historia 3).
5. `errors.ts` — `BranchRequiredError` (Historia 2).
6. `stampInvoice.ts` — reconocer `BranchRequired` + fallback con mensaje real (Historia 2, causa raíz).
7. `PartialInvoiceLineRow.tsx` — validación de `satProductCode` (Historia 2, prevención).
8. Specs `billing-api`/`billing-ui` sincronizadas.
9. `npm test` (unit del módulo billing + UI billing) + verificación manual en `/billing/new` (ambos modos) y `/pos`/`/sales` → `/billing/new`.

Rollback: revert de commit único — no hay dato migrado ni contrato de API removido.

## Open Questions

Ninguna — ambas causas raíz y la corrección de escala están confirmadas leyendo el código fuente real (Zod schemas, DTOs, fórmulas de `SaleTotalsCalculator`/`InvoiceTotalsCalculator`), no inferidas. El alcance de la Historia 3 (hallazgo adicional) ya se confirmó con el usuario antes de este proposal.
