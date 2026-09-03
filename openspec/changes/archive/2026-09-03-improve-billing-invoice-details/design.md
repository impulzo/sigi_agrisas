## Context

Ver `proposal.md` (sección Why) para la motivación. Este documento cubre el "cómo" para los 3 grupos de trabajo (A: emisor+fecha, B: sucursal matriz fija, C: cambio de receptor), verificados contra el código real antes de escribir specs:

- `resolveIssuerFiscalData()` (`src/modules/billing/application/services/resolveIssuerFiscalData.ts`) ya resuelve `{rfc, legalName, fiscalRegime, zipCode, address}` con cascada CSD → `EmitterFiscalSettings` → `TicketSettings`; ninguna fuente tiene `email`.
- `Invoice.createdAt: Date` (`src/modules/billing/domain/entities/Invoice.ts`) ya existe pero ningún componente lo renderiza.
- `NewInvoicePage.tsx` muestra un `<Select>` de sucursal para "Factura parcial" (sólo con `branches:access_all`) cuyo valor sólo afecta precios de catálogo (`PartialInvoiceForm.tsx`), nunca el payload real de `stampInvoice` (`usePartialInvoiceForm.ts`) — el backend ya cae a `findHeadquarters()` por fallback implícito.
- `StampInvoiceUseCase.stampFromSale()` deriva el receptor 100% de `sale.customerId`, sin parámetro de override; `Invoice` es tabla separada de `Sale` (FK `saleId` opcional, `ON DELETE SET NULL`), así que la inmutabilidad de la venta ya está garantizada estructuralmente — sólo falta exponer la opción de elegir otro receptor.

## Goals / Non-Goals

**Goals:**
- Agregar el correo de la empresa como dato del emisor, snapshoteado en cada factura igual que los demás campos fiscales del emisor (historia #1).
- Mostrar fecha/hora de emisión en UI y PDF de facturas ya timbradas (historia #2).
- Eliminar la inconsistencia del selector de sucursal en factura parcial, fijando siempre la matriz (historia #3).
- Permitir elegir un receptor CFDI distinto al de la venta al facturarla, sin tocar la `Sale` (historia #4).

**Non-Goals:**
- No se toca `src/shared/infrastructure/pdf/pdfIssuer.ts` ni los PDFs de payments/quotes/kardex/reports — el correo del emisor sólo se propaga al PDF/UI de facturación.
- No se introduce ningún permiso RBAC nuevo — se reutilizan `settings:read/write` y `billing:read/write` existentes.
- No se cambia el comportamiento en `FACTURAMA_MOCK=false` (Facturama real) más allá de lo que el payload de timbrado ya envía — el PDF final en ese modo lo genera Facturama, fuera del control de este repo.

## Decisions

### D1 — Correo del emisor vive en `TicketSettings`, no en `EmitterFiscalSettings` (historia #1)
`EmitterFiscalSettings` es datos fiscales estrictos ligados al CSD (rfc/legalName/fiscalRegime/zipCode/address) y se llena sólo tras una carga de CSD exitosa — el correo de contacto no es un dato fiscal ni algo que Facturama exponga. `TicketSettings` ya es donde vive `businessAddress`/`businessPhone` (datos de contacto de la empresa, no fiscales), así que `businessEmail` sigue ese mismo patrón — mismo archivo, mismo tipo de validación (`z.string().email()`), mismo formulario (`TicketSettingsForm.tsx`). Alternativa descartada: crear una tabla nueva de "datos de contacto de empresa" — over-engineering para un solo campo cuando ya existe un lugar natural.

Consecuencia en la cascada (`resolveIssuerFiscalData`): `email` tiene un solo tier (`TicketSettings.businessEmail`), a diferencia de los demás campos que tienen 2-3 tiers — se documenta explícitamente en el comentario de la función para que no se asuma erróneamente que CSD/`EmitterFiscalSettings` también lo resuelven.

### D2 — `issuerEmail` se snapshotea en `Invoice`, igual que `issuerAddress` (historias #1, #2)
Coherencia con el resto de columnas `issuer*`: si el correo cambiara después en `TicketSettings`, una factura ya timbrada no debe reflejar el nuevo valor retroactivamente (mismo argumento fiscal que ya aplica a `issuerRfc`/`issuerAddress`). Alternativa descartada: no snapshotear y resolver el correo en vivo al leer la factura — rompería la garantía de inmutabilidad fiscal que el resto del emisor ya tiene, y produciría una inconsistencia visual entre campos snapshoteados y uno resuelto en vivo dentro de la misma sección "Datos del emisor".

### D3 — `emittedAt` no se persiste como columna nueva; se deriva de `Invoice.createdAt` (historia #2)
`createdAt` ya es, por diseño, el instante de timbrado exitoso (se setea una sola vez al `createStamped`, nunca se actualiza). No hay necesidad de una columna redundante. El valor se formatea a ISO en el use case/gateway (`DownloadInvoiceFileUseCase.toSnapshot`) antes de pasarlo al PDF — evita usar `Intl.DateTimeFormat` dentro del árbol de render de `@react-pdf/renderer`, donde el comportamiento de locale/timezone no está garantizado igual que en Node puro.

### D4 — Fecha de emisión NO aparece en preview/borrador (historias #2, criterio de aceptación de historia #2)
Un borrador (`isDraft=true`, antes de timbrar) no tiene `createdAt` real — mostrar una fecha ahí sería inventar un dato. Tanto `InvoicePreviewModal` (UI) como el endpoint `POST /invoices/preview/pdf` (backend) omiten la fila de fecha; sólo `/billing/[id]` (factura ya persistida) y su PDF de descarga la muestran.

### D5 — Feature 3 fija la sucursal vía `useHeadquarters()`, eliminando el selector para TODOS los roles (historia #3)
El pedido explícito ("quitar botón de seleccionar sucursal") aplica incluso a usuarios `branches:access_all`, que hoy son los únicos que ven el selector. Esto es una reducción de capacidad intencional, no una regresión: el backend ya normalizaba a HQ por fallback, así que ningún usuario perdía en la práctica la posibilidad de elegir otra sucursal para la *emisión* real — sólo perdía la ilusión de poder hacerlo. `useBypassBranchOptions` (usado también en `QuoteCreatePage`/`PosPage`) no se toca ni se elimina — sólo se retira su uso en `NewInvoicePage.tsx`.

Enviar `branchId` explícitamente en el payload de `usePartialInvoiceForm.ts` (en vez de confiar en el fallback implícito del backend) es una decisión de robustez: documenta la intención en el código y evita que un cambio futuro en la lógica de fallback del backend rompa silenciosamente esta feature.

### D6 — Sin sucursal matriz configurada, el formulario se bloquea explícitamente (historia #3, edge case)
Alternativa descartada: dejar `branchId=null` fluir y que el backend responda `BranchRequired` (ya existe ese error tipado en `billing-ui`'s "Typed services and error normalization"). Se prefiere el bloqueo proactivo en el cliente porque la ausencia de HQ es un problema de configuración global, no un error transitorio de request — mejor mensaje ("Contacta a un administrador") que un error genérico de red.

### D7 — Cambio de receptor via parámetro `customerId` opcional en el request de stamp, no un endpoint nuevo (historia #4)
`POST /invoices` (sale-linked) ya es el único punto de entrada para "Facturar venta"; agregar un campo opcional mantiene retrocompatibilidad total (clientes viejos que no envían `customerId` siguen funcionando exactamente igual) y evita duplicar la lógica de validación/persistencia en un segundo endpoint. La resolución del receptor pasa a ser: `customerId` del body si viene → si no, `sale.customerId` — igual regla en `StampInvoiceUseCase.stampFromSale`, sin tocar `sale.branchId`/`items`/ningún campo de `Sale`.

### D9 — `CustomerPicker` en `StampSaleForm` sí incluye `CustomerQuickAddModal` (historia #4, revisión durante `apply`)
Decisión invertida respecto al plan original (que excluía el quick-add): `CustomerPicker` (`app/(private)/pos/_blocks/CustomerPicker.tsx`) renderiza incondicionalmente el botón "+ Nuevo cliente" para cualquier usuario con `customers:write` — es parte del componente reutilizado, no algo opcional a activar/desactivar por el caller. Omitir `CustomerQuickAddModal` en `StampSaleForm` habría dejado ese botón muerto (sin `onOpenQuickAdd` que hacer). Se agregó siguiendo el mismo patrón que `PartialInvoiceForm.tsx`, sin introducir permisos ni endpoints nuevos — reutiliza el modal ya existente tal cual.

Cliente override inexistente reutiliza `ReceiverFiscalDataIncompleteError` (400) en vez de crear un error de dominio nuevo (`CustomerNotFoundError`): un `findCustomer` que devuelve `null` ya hace que `validateReceiver` falle por falta de `rfc`/`cfdiUse`/etc., mensaje suficientemente claro para este caso y consistente con cómo ya se reporta cualquier receptor con datos incompletos. Si en QA este mensaje resulta confuso specíficamente para "cliente no encontrado", se puede añadir un error más preciso en un cambio posterior sin romper el contrato actual.

### D8 — El picker de cliente en `StampSaleForm` se resetea al cambiar de venta (historia #4, edge case)
Evita el bug silencioso de facturar la venta B con el cliente que el operador había elegido para la venta A. Alternativa descartada (re-precargar automáticamente con el cliente de la nueva venta sin resetear el "modo override"): funcionalmente equivalente en este caso porque el picker siempre muestra el cliente resuelto para la venta actual — resetear es simplemente la forma más simple de expresar "cada venta empieza con su propio cliente por defecto".

### D10 — Corrección post-revisión: el correo se muestra en la cabecera, no en "Datos del emisor" (historia #1, revisión visual del usuario)

D1/D2 seguían vigentes para el snapshot/persistencia (`issuerEmail` sigue viviendo en `Invoice`, cascada de un solo tier sin cambios). Lo que se corrige es únicamente la **superficie de presentación**: tras revisar el resultado real (`/billing/[id]`, PDF y `InvoicePreviewModal`), el usuario pidió que el correo aparezca en la cabecera del documento (junto a la identidad del emisor/branding), no como una fila más dentro de la tarjeta "Datos del emisor". Motivo: el correo es un dato de contacto rápido ("¿a quién le escribo por esta factura?"), más cercano en función al logo/nombre/sucursal que a los datos fiscales tabulares (RFC/régimen/CP/dirección) que sí pertenecen a esa tarjeta. Se retira la fila "Correo" de `InvoiceMetaPanel.tsx` y de `InvoicePreviewModal.tsx` (sección "Datos del emisor" de ambos) y se agrega junto al bloque de identidad: título+badge en `InvoiceDetailPage.tsx`, `issuerBlock` (logo+nombre+sucursal) en `InvoiceDocumentPdf.tsx`, y el bloque de logo+nombre+sucursal en `InvoicePreviewModal.tsx`. No cambia ningún dato ni contrato — sólo dónde se pinta un campo que ya existía.

### D11 — Cabecera de factura en 2 columnas: fecha/hora | folio+UUID (historias #2, revisión visual del usuario)

La cabecera original (una sola línea/bloque con "Emitida: fecha · Ver venta origen" en WEB, y Folio/UUID/Fecha apilados verticalmente en una sola columna en el PDF) se percibió "muy compacta" al revisar el resultado real. Se reestructura en 2 columnas sin agregar ningún dato nuevo:

- **Columna A (fecha y hora)**: "Emitida: `<fecha+hora>`" + el link "Ver venta origen" (WEB); "Fecha de emisión" (PDF, sólo si `!isDraft && emittedAt`, sin cambios respecto a D4).
- **Columna B (folio y UUID)**: en WEB se formaliza como campos explícitos con label ("Folio" = mismo label ya usado como fallback de título, `Factura #<últimos 8 de id>`; "UUID" = `invoice.uuid ?? "—"`) en vez de sólo mostrarlo como título de página; en PDF ya existían como filas separadas ("Folio"/`folioLabel`, "UUID"/`data.uuid`) — sólo se agrupan en su propia columna en vez de compartir columna con la fecha.

No hay concepto de "folio CFDI" distinto del UUID en este sistema (`FacturamaStampResult` sólo retorna `cfdiId`/`uuid`; `FakeFacturamaGateway` ya usa `folioLabel: uuid`) — "Folio" es el identificador de referencia de la factura (uuid una vez timbrada, o el `id` interno como fallback antes/si no hay uuid), consistente con el patrón ya usado en el título de `InvoiceDetailPage.tsx` antes de este cambio. No se agrega ninguna columna a `invoices` ni se cambia ningún DTO.

### D12 — Fix de descuadre en `InvoicePreviewModal`: `grid-template-columns` explícito en vez de `grid-cols-9` parejo (revisión visual del usuario)

`InvoiceItemsTable.tsx` usa una `<table>` nativa (ancho de columna ajustado al contenido); `InvoicePreviewModal.tsx` usa CSS grid con 9 tracks de igual ancho (`grid-cols-9`) para el mismo tipo de contenido (nombre+código+"SAT: ..." de hasta 3 líneas en una columna angosta vs. labels largos como "Total línea"/"Subtotal" en tracks parejos) — de ahí el descuadre reportado. Se reemplaza por un `grid-template-columns` explícito con anchos proporcionales al contenido, definido una sola vez como constante en el archivo y reutilizado igual en el header y en cada fila (evita que header y filas se desalineen entre sí por una discrepancia de clases).

Alternativa descartada — unificar `InvoicePreviewModal` con `InvoiceItemsTable` en un solo componente compartido: los datos de origen tienen escalas distintas para `discountPct` (0-100 en `InvoicePreviewData.lines` vs. fracción 0-1 en `InvoiceItemDto`, ver comentario en `InvoiceDocumentPdf.tsx`) y nombres de campo distintos (`description`/`productCode` vs. `productNameSnapshot`/`productCodeSnapshot`; label de SAT resuelto server-side en uno y client-side en el otro). Forzar una sola implementación arriesgaría alterar comportamiento existente no reportado como roto, sólo para eliminar una duplicación de markup — se corrige únicamente el layout de `InvoicePreviewModal`, sin tocar la lógica de datos de ninguno de los dos componentes.

## Riesgos / Trade-offs

- **Invoices pre-migración con `issuerEmail=null`** → Mitigación: mismo patrón ya validado con `issuerAddress` — se renderiza "—", cubierto por un escenario de spec dedicado (`Pre-existing invoices have null issuer snapshot`).
- **`FACTURAMA_MOCK=false` en producción real** → el PDF final lo genera Facturama externamente; los cambios a `InvoiceDocumentPdf.tsx` sólo garantizan resultado en modo mock/preview (default dev). Mitigación: documentado explícitamente en proposal.md y en este design; no bloquea la implementación ni requiere cambios adicionales.
- **Usuarios `branches:access_all` pierden control manual de sucursal en factura parcial** → Es el comportamiento pedido explícitamente (ver D5); riesgo de percepción de regresión si no se comunica. Mitigación: mencionarlo en el changelog/release notes del PR.
- **Desincronización entre el cliente mostrado en preview y el enviado al timbrar (historia #4)** → Mitigación: el mismo estado `customerId` del formulario alimenta tanto `useInvoicePreview.load()` como el payload real de `stampInvoice` — nunca dos fuentes de verdad distintas (cubierto por specs "Preview reflects the overridden customer").
- **Migración Prisma con 2 columnas nuevas nullable** → riesgo mínimo (no requiere backfill, no bloquea filas existentes). Mitigación: revisar en staging antes de `migrate deploy` en producción, como cualquier migración de este proyecto.

## Migration Plan

1. `npx prisma migrate dev --name add_business_email_and_issuer_email_snapshot` (agrega `ticket_settings.business_email`, `invoices.issuer_email`, ambas nullable).
2. Backend Grupo A (settings → `resolveIssuerFiscalData` → snapshot → gateway/PDF) antes que frontend Grupo A, para poder testear con Postman/unit tests antes de tocar UI.
3. Grupo B y Grupo C no dependen de la migración ni entre sí — pueden implementarse en paralelo o en cualquier orden relativo a Grupo A.
4. `npx prisma migrate deploy` en el pipeline de CI/CD estándar del proyecto — sin pasos manuales adicionales, sin downtime esperado (columnas nullable, sin índices ni constraints nuevos).
5. Rollback: revertir el PR es seguro — las columnas nuevas quedan nullable y sin uso si se revierte el código que las llena; no se requiere una migración de rollback explícita salvo que se quiera limpiar el esquema.
