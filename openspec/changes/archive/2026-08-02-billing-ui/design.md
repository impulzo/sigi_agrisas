## Context

Backend `billing-api` completo. La UI debe respetar las **reglas de capas frontend** del proyecto: `_blocks/` y `_components/` presentational (sin `fetch`/`storage`/`router`/validación inline); `_logic/services/` encapsulan `authFetch`; `_logic/hooks/` orquestan estado+validación+HTTP+navegación; `page.tsx` Server Components que exportan `metadata` y gatean por permisos en el cliente vía `useCurrentUser().can()`.

Contratos backend relevantes (de `BillingController` + `InvoiceDto`):

- `GET /api/v1/admin/invoices?page&pageSize&branchId?&status?&search?` → `{ items: InvoiceDto[], total, page, pageSize }`.
- `POST /api/v1/admin/invoices` — discrimina por presencia de `saleId`:
  - sale-linked: `{ saleId, paymentForm?, paymentMethod?, cfdiUse? }`.
  - standalone: `{ branchId?, customer:{rfc,name,cfdiUse,fiscalRegime,taxZipCode}, items:[{productId?,productCode,description,satProductCode?,satUnitCode?,unit?,quantity,unitPrice,discountPct?,ivaRate?,iepsRate?}], paymentForm?, paymentMethod? }`. → `201 InvoiceDto`.
- `GET /api/v1/admin/invoices/:id` → `InvoiceDto` (con `items`).
- `POST /api/v1/admin/invoices/:id/cancel` `{ motive: "01"|"02"|"03"|"04", uuidReplacement? }` → `InvoiceDto`.
- `GET /api/v1/admin/invoices/:id/download?format=pdf|xml` → binario (`Content-Disposition: attachment`).
- `GET /api/v1/admin/sales/:id/invoices` → `{ items: InvoiceDto[] }`.
- `POST /api/v1/admin/billing/csd` `{ rfc, certificateBase64, privateKeyBase64, privateKeyPassword }` → status. `GET /api/v1/admin/billing/csd?rfc?` → status.

Errores HTTP a normalizar: `400 ReceiverFiscalDataIncomplete {missingFields}`, `409 SaleAlreadyInvoiced {invoiceId}`, `409 SaleNotInvoiceable`, `422 FacturamaStampError {detail}`, `409 InvoiceAlreadyCancelled`, `422 FacturamaCancelError {detail}`, `422 FacturamaCsdError {detail}`, `404 InvoiceNotFound`, `403 Forbidden`.

## Goals / Non-Goals

**Goals**
- Sección `/billing` con listado/detalle/emisión/cancelación/descarga + gestión CSD.
- Dos modos de emisión: **facturar venta** (saleId) y **factura parcial standalone** (items libres, precio manual, sin inventario).
- Integrar CTA + lista de CFDI en `/sales/[id]`.
- Paridad de patrones con `returns-ui` (listado/detalle/toolbar/branch scoping) y POS (pickers/totales).

**Non-Goals**
- Cambios de backend, schema o migraciones.
- "Factura parcial = subconjunto de una venta" (descartado: backend `stampFromSale` timbra la venta completa; el modo parcial es standalone libre).
- Pagos/complemento de pago (PPD/REP), facturación global, addenda. Fuera de alcance.
- Edición de CFDI (no existe en backend; sólo cancelar + re-emitir).

## Decisions

### Estructura de archivos
```
app/(private)/billing/
├── page.tsx                 # SC, metadata, gate billing:read
├── new/page.tsx             # SC, gate billing:write
├── [id]/page.tsx            # SC, gate billing:read
├── csd/page.tsx             # SC, gate billing:manage_csd
├── _blocks/
│   ├── BillingListPage.tsx  BillingToolbar.tsx  InvoicesTable.tsx
│   ├── InvoiceStatusBadge.tsx  BillingEmpty.tsx
│   ├── InvoiceDetailPage.tsx  InvoiceItemsTable.tsx  InvoiceMetaPanel.tsx  InvoiceActionsBar.tsx
│   ├── CancelInvoiceModal.tsx
│   ├── NewInvoicePage.tsx        # SegmentedButton Venta | Parcial
│   ├── StampSaleForm.tsx  SalePickerField.tsx
│   ├── PartialInvoiceForm.tsx  PartialInvoiceLineRow.tsx  PartialInvoiceFooter.tsx
│   ├── CsdManagerPage.tsx
│   └── SaleInvoicesSection.tsx   # montado en SaleDetailPage
├── _logic/
│   ├── types/{api.ts,domain.ts}
│   ├── schemas/{cancelInvoice.ts,partialInvoice.ts,csdUpload.ts,stampSale.ts}
│   ├── services/{listInvoices,getInvoice,stampInvoice,cancelInvoice,downloadInvoiceFile,listSaleInvoices,uploadCsd,getCsdStatus,index}.ts
│   ├── hooks/{useInvoicesList,useInvoiceDetail,useInvoiceMutations,useSaleInvoices,useStampSaleForm,usePartialInvoiceForm,useCsdManager}.ts
│   ├── lib/computeInvoiceTotalsClient.ts   # reexporta/usa pos computeTotalsClient
│   └── errors.ts
```

### Reuso (no reinventar)
- **Totales en vivo** (preview parcial): `computeTotalsClient` del POS (`app/(private)/pos/_logic/lib/computeTotalsClient.ts`) — banker's rounding, port puro de `SaleTotalsCalculator`. `formatMxCurrency` para render.
- **Cliente fiscal**: `CustomerPicker` del POS. Al elegir, leer `rfc/cfdiUse/taxRegime/taxZipCode/name` del cliente para armar `customer{}`. Si falta algún dato fiscal → bloquear submit con error inline (espejo de `ReceiverFiscalDataIncomplete`).
- **Productos** (parcial): `ProductCatalogPanel`/`ProductCatalogTable` del POS para agregar líneas; además botón "Agregar línea libre" (sin `productId`, descripción + `satProductCode` manuales).
- **Venta** (facturar venta): `SalePickerField` busca `GET /api/v1/admin/sales?search=&status=completed` (server-side, debounce 300 ms, mín 2 chars); muestra folio + cliente + total.
- Shells/UX: `CatalogToolbar` (`searchScope="server"`), `CatalogPagination`, `EmptyState`, `ConfirmDialog`, `SegmentedButton`, `Badge`.

### Errores tipados (`_logic/errors.ts`)
`SaleAlreadyInvoicedError(invoiceId)`, `SaleNotInvoiceableError`, `ReceiverFiscalDataIncompleteError(missingFields)`, `FacturamaStampError(detail)`, `InvoiceAlreadyCancelledError`, `FacturamaCancelError(detail)`, `FacturamaCsdError(detail)`, `InvoiceNotFoundError`. Los services mapean status+body→error; los hooks traducen a mensajes ES en UI.

### Descarga PDF/XML
`downloadInvoiceFile(id, format)` usa `authFetch` (devuelve `Response`), lee `blob()`, deriva filename de `Content-Disposition` (fallback `factura-<uuid>.<ext>`), dispara descarga vía `URL.createObjectURL` + `<a download>`. Sólo el service toca el DOM-bridge mínimo; el block invoca el hook.

### CSD upload
`csd/page.tsx` (admin). `CsdManagerPage` toma 2 `<input type="file">` (`.cer`, `.key`) + RFC + contraseña; convierte archivos a base64 client-side (`FileReader`), llama `uploadCsd`. Muestra estado actual vía `getCsdStatus`. Sin validación de firma (server valida). Contraseña nunca se persiste en cliente.

### Branch scoping (igual a returns/payments)
Listado omite `?branchId=` para callers sin `branches:access_all` (backend filtra por `x-user-branch-id`). Columna/filtro "Sucursal" sólo visibles con bypass. Detalle/cancelar/descarga: backend aplica `enforceBranchScope` (403 → mensaje). Sin guard de matriz (HQ) — facturación no lo requiere.

### Gating por permisos (cliente, defensa en profundidad)
- `/billing`, `/billing/[id]`, `SaleInvoicesSection`: `billing:read`.
- `/billing/new`, CTA "Facturar", ambos formularios submit: `billing:write`.
- Cancelar: `billing:cancel`.
- `/billing/csd` y su entrada: `billing:manage_csd`.
- Optimista durante `"loading"`; oculta/redirige a `/dashboard` cuando `false`.

### NavigationRail
Nuevo `RailItem { key: "billing", href: "/billing", icon: "receipt", label: "Facturación", requires: "billing:read" }`, ubicado tras `returns`. CSD no es item propio del rail; se accede desde un botón dentro de `/billing` (visible con `manage_csd`).

## Risks / Trade-offs

- **Cliente fiscal incompleto en parcial**: muchos `Customer` pueden carecer de `cfdiUse/taxRegime/taxZipCode`. Mitigación: validación client-side previa con mensaje claro de campos faltantes (no depender sólo del 400). Permitir editar el cliente (link a catálogo) queda fuera; el usuario corrige y reintenta.
- **Catálogos SAT** (`paymentForm`, `paymentMethod`, `cfdiUse`): el backend acepta strings con defaults. La UI ofrece selects con un subconjunto común (`paymentForm`: 01/03/04/28/99; `paymentMethod`: PUE/PPD; `cfdiUse`: G01/G03/P01/S01…) + texto editable. No se valida contra catálogo completo (lo hace Facturama → 422 con detalle).
- **Mock Facturama** (`FACTURAMA_MOCK=true`): en dev los UUID/archivos son falsos deterministas; la UI funciona igual (no asume validez fiscal real).
- **Descarga binaria** vía `authFetch`: requiere leer `blob()` y no romper el flujo de refresh 401. `authFetch` ya reintenta; el service no asume JSON.

## Migration Plan

Aditivo y sin estado persistido nuevo. Orden: (1) tipos+schemas+services+errores, (2) hooks, (3) blocks listado/detalle, (4) emisión (venta + parcial), (5) cancelación + descarga, (6) CSD, (7) integración en `SaleDetailPage` + NavigationRail, (8) tests UI (jsdom/RTL). Reversible borrando `app/(private)/billing/` y revirtiendo los 2 puntos de integración.

## Open Questions

- ¿Subconjunto SAT exacto para selects de `cfdiUse`/`paymentForm`? Se arranca con set común editable; refinable sin cambio estructural.
