# ticket-contenido-ticket — Design

## Context

Ver proposal.md — Why. Estado actual relevante (trazable a las historias 1-8 de la tabla):

- `PrintableTicket.tsx` es el ticket térmico monospace (58/80mm) con `@media print` inline y clase `print-area`. Ya muestra: logo (fallback `/logo.png`), marca "Agrisas", folio, fecha, cajero, sucursal, método de pago, items, Subtotal/IVA/IEPS/Total, header/footer desde `GET /settings/ticket`, y folio como barcode decorativo. Filas 2-4, 6.
- `TicketPreviewPage.tsx` es la tarjeta Stitch de pantalla: etiquetas "Orden:", "Cajero:", "Total". Filas 3-4, 6.
- `SaleDetailDto` expone `customerRfc`, `customerName`, `customerAddress`, `customerCreditDays` tras el work previo de `customerRfc`. Fila 1, 5.
- `ticket_settings` hoy solo tiene `logo_url`, `header_text`, `footer_text`, `paper_width`. Filas 2, 7.
- Specs canónicas que cambian: `ticket-print-ui`, `sales-ticket-preview-ui`, `settings-api`, `pos-api`.

## Goals / Non-Goals

**Goals:**
- Ticket (pantalla e impresión) muestra cliente (RFC/nombre/dirección), negocio (dirección/teléfono/régimen), "Folio", "Vendedor", condiciones de crédito, "Total a pagar" y leyenda (filas 1-8).
- Configuración del negocio y leyenda editables desde `/settings` (fila 2, 7).
- Backend de venta entrega `customerAddress` y `customerCreditDays` (filas 1, 5).
- Se conserva el diseño térmico actual; solo se reordena y agrega información (fila 8).

**Non-Goals:**
- No se cambia el régimen fiscal del negocio como dato transaccional (vive en settings, fila 2).
- No se agrega "orden" como campo separado del folio (decisión: reetiquetar a "Folio", fila 3).
- No se cambia el logo ni los endpoints de logo/upload.
- No se agregan campos de venta nuevos; solo se exponen datos del cliente ya existentes.

## Decisions

**D1 — Backend settings: 4 columnas nuevas en `ticket_settings` (filas 2, 7).** Migración `add_ticket_business_fields`: `business_address VARCHAR(300)`, `business_phone VARCHAR(30)`, `business_tax_regime VARCHAR(120)`, `legend_text VARCHAR(500)`. Todas nullable. Se propagan a `TicketSettings` entity, `DEFAULT_TICKET_SETTINGS` (con dirección Ocotlán de Morelos, Oaxaca, CP 71520; tel 951 292 80 86; régimen "612 Personas Físicas con Actividad Empresarial"; leyenda "Favor de revisar su mercancia. No se hacen cambios ni devoluciones. Gracias por su compra."), port, `PrismaTicketSettingsRepository` (create usa defaults, update merge), `InMemoryTicketSettingsRepository` (spread merge), `UpdateTicketSettingsUseCase` (array `keys` para EmptyUpdateError), y `SettingsController.updateTicketSchema` (max: address 300, phone 30, regime 120, legend 500).

**D2 — Backend venta: exponer datos de cliente (filas 1, 5).** `PrismaSaleRepository` agrega `customer.address` y `customer.creditDays` al select del join; `SaleJoinedFields` extiende con `customerAddress: string | null`, `customerCreditDays: number | null`; `toSaleDto` los mapea; `SaleDetailDto`/`SaleSummary` los exponen. `InMemorySaleRepository.emptyJoined()` los incluye como `null`.

**D3 — Frontend tipos (filas 1, 2, 5, 7).** `sales/_logic/types/api.ts` + `domain.ts`: `SaleSummaryDto`/`SaleSummary` ganan `customerAddress`, `customerCreditDays` (`customerRfc` ya existía). `settings/_logic/types/api.ts`: `TicketSettingsDto` y `UpdateTicketSettingsBody` ganan `businessAddress`, `businessPhone`, `businessTaxRegime`, `legendText`.

**D4 — Settings UI (fila 2, 7).** `TicketSettingsForm.tsx` agrega sección "Información del negocio" con inputs dirección, teléfono, régimen fiscal, y textarea de leyenda. `handleSave` incluye los 4 campos en el PATCH (solo cuando el diff no está vacío).

**D5 — `PrintableTicket` reordenado por secciones (filas 1-8).** Orden: logo+header+negocio (dir/tel/régimen) → datos del ticket (Folio/Fecha/Vendedor/Sucursal/Método pago) → Cliente (RFC/Nombre/Dirección, solo si `customerId`) → Condiciones (si `customerCreditDays != null`) → items → Subtotal/IVA/IEPS → "Total a pagar" → footer → leyenda → barcode. Se cambia "Cajero:" → "Vendedor:" y "Total" → "Total a pagar".

**D6 — `TicketPreviewPage` (filas 3-6).** Reetiqueta "Orden:" → "Folio:", "Cajero:" → "Vendedor:", agrega secciones cliente/condiciones/negocio y leyenda, y renombra "Total" → "Total a pagar". La sección cliente y condiciones solo se renderizan con `customerId`; el negocio y la leyenda solo si los valores settings existen.

## Risks / Trade-offs

- **[Columna "Total" en la tabla de items]** → Existe una columna de encabezado legítima "Total" en la grilla de items; el test unitario distingue el total general (etiqueta "Total a pagar") del encabezado de columna para no romper el aserto.
- **[Datos de negocio en settings vs. por sucursal]** → Decisión explícita: global (singleton), consistente con el resto de `ticket_settings`.
- **[Leyenda editable pero con default]** → El default se aplica solo al crear la fila (primera escritura); un PATCH posterior conserva el valor guardado.
- **[`customerAddress`/`customerCreditDays` pueden ser null en ventas legacy]** → UI degrada omitiendo las secciones; nunca renderiza null.
