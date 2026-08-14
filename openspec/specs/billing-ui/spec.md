# Spec: billing-ui

## Purpose

Define la interfaz de usuario del módulo de Facturación (CFDI 4.0 vía Facturama) del panel de Agrisas: listado paginado con filtros y branch scoping, detalle con descarga PDF/XML y cancelación, emisión en dos modos (facturar una venta completa o factura parcial standalone con líneas y precio manual que **no afecta inventario**), gestión de Certificado de Sello Digital (CSD), integración en el detalle de venta, servicios tipados y hooks de estado/mutación. La UI consume la capability backend `billing-api` sin modificarla.

---

## Requirements

### Requirement: `/billing` route (paginated list with filters)
The system SHALL expose a private route `/billing` that lists CFDI invoices in a paginated table. The page SHALL gate behind `billing:read` via `useCurrentUser().can("billing:read")` and SHALL render `null` (or redirect to `/dashboard`) when the permission resolves to `false`. While `"loading"`, the page SHALL render its layout optimistically.

The page SHALL fetch `GET /api/v1/admin/invoices` via the service `listInvoices` and SHALL respect branch scoping: the request SHALL omit `?branchId=` for callers without `branches:access_all` (backend filters by `x-user-branch-id` implicitly).

Toolbar filters:
- **Search** (debounce 300 ms, min 2 chars) → `?search=` (server-side). Toolbar SHALL render badge "Búsqueda en servidor · 2+ caracteres".
- **Estado** (`stamped` → "Vigente", `cancelled` → "Cancelada") → `?status=`.
- **Sucursal** (`<select>`) → `?branchId=`, visible **only** when `can("branches:access_all") === true`.
- **Desde** / **Hasta** (`<input type="date">`) → `?from=` / `?to=`.

The table columns: `Folio fiscal` (`uuid`, mono — "—" si null), `Receptor` (`receiverName` + `receiverRfc` small), `Sucursal` (hidden without bypass), `Total` (MXN, `tabular-nums`), `Fecha` (`createdAt` corto), `Estado` (`InvoiceStatusBadge`), acción "Ver" → `/billing/[id]`. Pagination via `CatalogPagination`. Header actions: "Nueva factura" (visible con `billing:write`) → `/billing/new`; "Configurar CSD" (visible con `billing:manage_csd`) → `/billing/csd`.

Empty result → `<EmptyState icon="receipt_long" title="No hay facturas" />`.

#### Scenario: Authorized user sees the list
- **WHEN** an authenticated user with `billing:read` navigates to `/billing`
- **THEN** the page SHALL fetch `GET /api/v1/admin/invoices` and render the populated table

#### Scenario: Unauthorized user gated out
- **WHEN** an authenticated user without `billing:read` navigates to `/billing`
- **THEN** the page SHALL render `null` (or redirect to `/dashboard`) after the check resolves

#### Scenario: Operator without bypass implicitly filtered
- **WHEN** an `operator` with `x-user-branch-id: B1` (no `branches:access_all`) loads `/billing`
- **THEN** the request SHALL NOT include `?branchId=`; the "Sucursal" column and filter SHALL be hidden

#### Scenario: Admin with bypass sees branch column
- **WHEN** an `admin` loads `/billing`
- **THEN** the "Sucursal" column and filter `<select>` SHALL be rendered

#### Scenario: Search debounced and server-side
- **WHEN** the user types "FAC-1" in search
- **THEN** after 300 ms `GET /api/v1/admin/invoices?search=FAC-1&...` SHALL be sent

#### Scenario: Search ignored under 2 chars
- **WHEN** the user types "F"
- **THEN** the request SHALL NOT include `search`

---

### Requirement: `/billing/[id]` invoice detail
The system SHALL expose a private route `/billing/[id]` gated by `billing:read` that fetches `GET /api/v1/admin/invoices/:id` via `getInvoice`. It SHALL render a header (folio fiscal `uuid`, `InvoiceStatusBadge`, link a `/sales/[saleId]` cuando `saleId` no es null), `InvoiceItemsTable` (snapshots por línea con `lineSubtotal/lineIva/lineIeps/lineTotal` y totales `subtotal/taxTotal/total`), `InvoiceMetaPanel` (receptor: `receiverRfc/receiverName/receiverCfdiUse/receiverFiscalRegime/receiverTaxZipCode`, `cfdiUse`, `paymentForm`, `paymentMethod`; banner de cancelación con `cancellationMotive`+`cancelledAt` si `status='cancelled'`), y `InvoiceActionsBar`.

`InvoiceActionsBar` SHALL render "Descargar PDF" y "Descargar XML" siempre, y "Cancelar" sólo cuando `status='stamped'` y `can("billing:cancel")`.

#### Scenario: Render stamped invoice
- **WHEN** a user with `billing:read` opens `/billing/[id]` of a `stamped` invoice
- **THEN** items, totales, receptor y los botones de descarga SHALL render; "Cancelar" SHALL render only if the user has `billing:cancel`

#### Scenario: Cancelled invoice shows banner, no cancel
- **WHEN** the invoice `status='cancelled'`
- **THEN** the meta panel SHALL show the cancellation banner (`cancellationMotive`, `cancelledAt`) and the "Cancelar" action SHALL NOT render

#### Scenario: Not found
- **WHEN** the backend responds 404 `InvoiceNotFound`
- **THEN** the service SHALL throw `InvoiceNotFoundError` and the page SHALL render a not-found state

#### Scenario: Branch scope violation
- **WHEN** the backend responds 403 for an invoice outside the user's branch
- **THEN** the page SHALL render an access-denied message

---

### Requirement: Download CFDI PDF/XML
The service `downloadInvoiceFile(id, format)` SHALL call `GET /api/v1/admin/invoices/:id/download?format=pdf|xml` via `authFetch`, read the response as `blob()`, derive the filename from `Content-Disposition` (fallback `factura-<uuid>.<format>`), and trigger a browser download via `URL.createObjectURL` + a transient `<a download>`. It SHALL NOT assume a JSON response on success.

The service SHALL map HTTP 400 `{"error":"Invoice has not been stamped"}` → `InvoiceNotStampedError` (mensaje "Esta factura no ha sido timbrada") and HTTP 502 → `InvoiceFileDownloadFailedError` (mensaje "No se pudo descargar el archivo de la factura. Intenta de nuevo."), instead of a generic `NetworkError`. As an additional defense, if the response is `ok` but the resulting blob has `size === 0`, the service SHALL throw `InvoiceNotStampedError` rather than triggering a download of an empty file.

#### Scenario: Download PDF
- **WHEN** the user clicks "Descargar PDF"
- **THEN** the request `...?format=pdf` SHALL be sent and the returned blob SHALL be downloaded with a `.pdf` filename

#### Scenario: Download XML
- **WHEN** the user clicks "Descargar XML"
- **THEN** the request `...?format=xml` SHALL be sent and the blob downloaded with a `.xml` filename

#### Scenario: Invoice not stamped
- **WHEN** the backend responds 400 `{"error":"Invoice has not been stamped"}`
- **THEN** the service SHALL throw `InvoiceNotStampedError` and the UI SHALL show "Esta factura no ha sido timbrada" without triggering any file download

#### Scenario: Facturama download failure surfaced distinctly
- **WHEN** the backend responds 502
- **THEN** the service SHALL throw `InvoiceFileDownloadFailedError` and the UI SHALL show "No se pudo descargar el archivo de la factura. Intenta de nuevo." — a message distinct from the "not stamped" case

#### Scenario: Empty blob defense
- **WHEN** the response is `ok` (200) but the downloaded blob has `size === 0`
- **THEN** the service SHALL throw `InvoiceNotStampedError` instead of downloading a corrupt 0-byte file

---

### Requirement: Cancel invoice
`CancelInvoiceModal` (rendered from the detail) SHALL gate behind `billing:cancel` and collect a SAT `motive` (`01`,`02`,`03`,`04`) and optional `uuidReplacement`. When `motive='01'` it SHALL require `uuidReplacement`. On confirm it SHALL call `POST /api/v1/admin/invoices/:id/cancel` via `cancelInvoice` and refresh the detail.

The service SHALL map 409 `InvoiceAlreadyCancelled` → `InvoiceAlreadyCancelledError` and 422 `FacturamaCancelError{detail}` → `FacturamaCancelError(detail)`.

#### Scenario: Cancel with motive 02
- **WHEN** the user selects motive `02` and confirms
- **THEN** `POST /invoices/:id/cancel { motive: "02" }` SHALL be sent and on success the detail SHALL reflect `status='cancelled'`

#### Scenario: Motive 01 requires replacement
- **WHEN** the user selects motive `01` without `uuidReplacement`
- **THEN** the modal SHALL block submit and prompt for the substitute CFDI UUID

#### Scenario: Already cancelled
- **WHEN** the backend responds 409 `InvoiceAlreadyCancelled`
- **THEN** the UI SHALL surface `InvoiceAlreadyCancelledError` and keep the modal state recoverable

#### Scenario: Facturama cancel failure
- **WHEN** the backend responds 422 `FacturamaCancelError{detail}`
- **THEN** the modal SHALL show a banner with `detail`

---

### Requirement: `/billing/new` with two emission modes
The system SHALL expose a private route `/billing/new` gated by `billing:write` rendering a `SegmentedButton` with two modes: **"Facturar venta"** and **"Factura parcial"**.

#### Scenario: Mode switch
- **WHEN** a user with `billing:write` opens `/billing/new`
- **THEN** "Facturar venta" SHALL be selected by default and switching to "Factura parcial" SHALL swap the form without losing route

#### Scenario: Gated out
- **WHEN** a user without `billing:write` navigates to `/billing/new`
- **THEN** the page SHALL render `null` (or redirect) after the check resolves

---

### Requirement: Stamp from sale ("Facturar venta")
`StampSaleForm` SHALL let the user pick an existing `completed` sale via `SalePickerField` (server-side search `GET /api/v1/admin/sales?search=&status=completed`, debounce 300 ms, min 2 chars, showing folio + cliente + total), optionally set `paymentForm`, `paymentMethod`, `cfdiUse` (editable selects with sensible defaults), and submit `POST /api/v1/admin/invoices { saleId, paymentForm?, paymentMethod?, cfdiUse? }` via `stampInvoice`. On success it SHALL navigate to `/billing/[id]`.

The service SHALL map 409 `SaleAlreadyInvoiced{invoiceId}` → `SaleAlreadyInvoicedError(invoiceId)`, 409 `SaleNotInvoiceable` → `SaleNotInvoiceableError`, 400 `ReceiverFiscalDataIncomplete{missingFields}` → `ReceiverFiscalDataIncompleteError(missingFields)`, 422 `FacturamaStampError{detail}` → `FacturamaStampError(detail)`.

#### Scenario: Stamp a completed sale
- **WHEN** the user selects a `completed` sale and confirms
- **THEN** `POST /invoices { saleId }` SHALL be sent and on 201 the app SHALL navigate to `/billing/[id]`

#### Scenario: Sale already invoiced
- **WHEN** the backend responds 409 `SaleAlreadyInvoiced{invoiceId}`
- **THEN** the form SHALL show a message with a link to `/billing/[invoiceId]`

#### Scenario: Receiver fiscal data incomplete
- **WHEN** the backend responds 400 `ReceiverFiscalDataIncomplete{missingFields}`
- **THEN** the form SHALL list the missing fiscal fields of the receiver

---

### Requirement: Partial standalone invoice ("Factura parcial") does not affect inventory
`PartialInvoiceForm` SHALL build a standalone CFDI **without `saleId`**. It SHALL collect:
- A receiver via `CustomerPicker` (reading `rfc`, `name`, `cfdiUse`, `taxRegime`→`fiscalRegime`, `taxZipCode`). When fiscal data is incomplete the form SHALL block submit and list the missing fields inline.
- One or more lines added either from the product catalog (`ProductCatalogPanel`/`ProductCatalogTable`) or as **free lines** ("Agregar línea libre", no `productId`, manual `description` + `satProductCode`). Each line (`PartialInvoiceLineRow`) SHALL allow editing `quantity`, **`unitPrice` manually**, `discountPct`, `ivaRate`, `iepsRate`.

It SHALL show live totals computed by the shared `computeTotalsClient` (banker's rounding) and a visible note **"La factura parcial no afecta inventario"**. On submit it SHALL call `POST /api/v1/admin/invoices { customer, items[], paymentForm?, paymentMethod? }` via `stampInvoice` and navigate to `/billing/[id]`.

Because the payload carries no `saleId`, the request SHALL reach the backend standalone path, which performs no inventory movement.

#### Scenario: Build and stamp a partial invoice
- **WHEN** the user picks a fiscally-complete customer, adds two lines, edits each `unitPrice` manually, and confirms
- **THEN** `POST /invoices` SHALL be sent with `{ customer, items: [...] }` and **without** `saleId`, and on 201 navigate to `/billing/[id]`

#### Scenario: Manual price reflected in totals
- **WHEN** the user changes a line `unitPrice`
- **THEN** the footer totals (subtotal/iva/ieps/total) SHALL recompute live via `computeTotalsClient`

#### Scenario: Inventory untouched
- **WHEN** a partial invoice is stamped
- **THEN** no inventory endpoint SHALL be called and the request SHALL omit `saleId` (the backend standalone path leaves `branch_inventory` unchanged)

#### Scenario: Customer fiscal data incomplete blocks submit
- **WHEN** the selected customer lacks `cfdiUse`, `taxRegime`, or `taxZipCode`
- **THEN** the form SHALL block submit and list the missing fiscal fields

#### Scenario: Free line without product
- **WHEN** the user clicks "Agregar línea libre" and fills `description`, `unitPrice`, `satProductCode`
- **THEN** the line SHALL be added with `productId` null and included in the `items[]` payload

---

### Requirement: Invoice preview before stamping
Both emission forms (`StampSaleForm` and `PartialInvoiceForm`, under `/billing/new`) SHALL render a "Vista previa" button. Clicking it SHALL open `InvoicePreviewModal` (a native `<dialog>`, following the same open/close pattern as `CancelInvoiceModal`) showing: the Agrisas logo (`/logo.png`), a folio placeholder "PENDIENTE DE TIMBRAR", a visible badge "BORRADOR — no válido fiscalmente", the receiver's fiscal data, the line items with per-line and aggregate totals computed client-side via `computeInvoiceTotalsClient`, and two actions: "Volver a editar" (closes the modal without side effects) and "Timbrar ahora" (invokes the same existing `submit()` used by the form's real "Emitir factura" action — it SHALL NOT call Facturama or persist anything on its own).

For `PartialInvoiceForm`, the preview data SHALL be built entirely from data already present in the form's local state (customer, lines, payment form/method) — no network request SHALL be made to open the preview.

For `StampSaleForm`, which does not hold line items or the receiver's fiscal data in its local state, opening the preview SHALL resolve that data by reading `GET /api/v1/admin/sales/:id` and (when the sale has a `customerId`) `GET /api/v1/admin/customers/:id` — both already-existing read endpoints, reused unmodified. While resolving, the modal SHALL show a loading state. If the selected sale has no `customerId`, the modal SHALL show the message "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable "Timbrar ahora".

The preview SHALL never introduce a persisted draft state: `Invoice.status` remains only `"stamped" | "cancelled"`, and closing the modal without confirming SHALL leave the form's state untouched.

#### Scenario: Preview from partial invoice form (no network)
- **WHEN** the user has picked a fiscally-complete customer and added at least one line in `PartialInvoiceForm`, then clicks "Vista previa"
- **THEN** the modal SHALL open immediately (no HTTP request) showing the logo, "BORRADOR" badge, "PENDIENTE DE TIMBRAR" folio, receiver data, lines and totals matching the form's live totals

#### Scenario: Preview from stamp-sale form (resolves sale + customer)
- **WHEN** the user has selected a `completed` sale with an associated customer in `StampSaleForm`, then clicks "Vista previa"
- **THEN** the modal SHALL show a brief loading state, then render the sale's lines and the customer's real fiscal data

#### Scenario: Sale without customer blocks preview confirmation
- **WHEN** the user clicks "Vista previa" in `StampSaleForm` for a sale with no `customerId`
- **THEN** the modal SHALL show "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable "Timbrar ahora", without throwing an unhandled error

#### Scenario: Confirm stamps for real
- **WHEN** the user clicks "Timbrar ahora" inside the preview modal (either form)
- **THEN** the modal SHALL close and the form's existing real stamping flow SHALL run unchanged (same `POST /api/v1/admin/invoices` request the "Emitir factura" / "Emitir factura parcial" button already triggers)

#### Scenario: Cancel preview leaves form untouched
- **WHEN** the user clicks "Volver a editar"
- **THEN** the modal SHALL close and no field of the underlying form SHALL be modified

---

### Requirement: CSD management `/billing/csd`
The system SHALL expose a private route `/billing/csd` gated by `billing:manage_csd` (admin only). `CsdManagerPage` SHALL display the current CSD status (`GET /api/v1/admin/billing/csd` via `getCsdStatus`) and a form to upload/replace a CSD: `rfc`, a `.cer` file, a `.key` file, and `privateKeyPassword`. Files SHALL be converted to base64 client-side (`FileReader`) and submitted via `POST /api/v1/admin/billing/csd` (`uploadCsd`). The password SHALL NOT be persisted in client storage.

The service SHALL map 422 `FacturamaCsdError{detail}` → `FacturamaCsdError(detail)`.

#### Scenario: Upload CSD
- **WHEN** an admin provides RFC, `.cer`, `.key`, and password and submits
- **THEN** the files SHALL be base64-encoded client-side and `POST /billing/csd` SHALL be sent; on success the status SHALL refresh

#### Scenario: Invalid CSD
- **WHEN** the backend responds 422 `FacturamaCsdError{detail}`
- **THEN** the page SHALL show a banner with `detail`

#### Scenario: Gated out
- **WHEN** a non-admin without `billing:manage_csd` navigates to `/billing/csd`
- **THEN** the page SHALL render `null` (or redirect) after the check resolves

---

### Requirement: Sale detail billing integration
`SaleDetailPage` SHALL mount `SaleInvoicesSection` that lists the sale's CFDI via `useSaleInvoices` (`GET /api/v1/admin/sales/:id/invoices`), showing each invoice's folio fiscal, status, link to `/billing/[id]`, and download. It SHALL render a "Facturar" CTA only when `sale.status === 'completed'`, the sale has no `stamped` invoice (`hasStampedInvoice === false`), and the user has `billing:write`; the CTA SHALL navigate to `/billing/new` with the sale preselected.

#### Scenario: CTA visible for invoiceable sale
- **WHEN** a `completed` sale without a `stamped` CFDI is viewed by a user with `billing:write`
- **THEN** the "Facturar" CTA SHALL render

#### Scenario: CTA hidden when already invoiced
- **WHEN** the sale already has a `stamped` CFDI
- **THEN** the "Facturar" CTA SHALL NOT render and the existing CFDI SHALL be listed with a link to `/billing/[id]`

#### Scenario: CTA hidden for non-completed sale
- **WHEN** the sale `status` is `cancelled` or `edited`
- **THEN** the "Facturar" CTA SHALL NOT render

---

### Requirement: NavigationRail billing entry
The `NavigationRail` SHALL include a primary item `{ key: "billing", href: "/billing", icon: "description", label: "Facturación", requires: "billing:read" }`, placed after `returns`. `description` (distinct from `sales`'s `receipt_long`) avoids icon duplication in the rail. It SHALL show optimistically while the permission check is `"loading"` and hide when `billing:read` resolves to `false`.

#### Scenario: Item visible with permission
- **WHEN** a user with `billing:read` loads the panel
- **THEN** the "Facturación" rail item SHALL render and link to `/billing`

#### Scenario: Item hidden without permission
- **WHEN** a user without `billing:read` loads the panel
- **THEN** the "Facturación" rail item SHALL NOT render once the check resolves

---

### Requirement: Typed services and error normalization
All billing services under `app/(private)/billing/_logic/services/` SHALL use `authFetch`, accept an optional `fetchImpl?: typeof fetch` for tests, and SHALL NOT return raw `Response` (except the download service, which reads `blob()` internally). They SHALL normalize backend HTTP errors to typed module errors (`SaleAlreadyInvoicedError`, `SaleNotInvoiceableError`, `ReceiverFiscalDataIncompleteError`, `FacturamaStampError`, `InvoiceAlreadyCancelledError`, `FacturamaCancelError`, `FacturamaCsdError`, `InvoiceNotFoundError`, `InvoiceNotStampedError`, `InvoiceFileDownloadFailedError`).

#### Scenario: Stamp error mapping
- **WHEN** `stampInvoice` receives 409 `SaleAlreadyInvoiced{invoiceId}`
- **THEN** it SHALL throw `SaleAlreadyInvoicedError` carrying `invoiceId`

#### Scenario: Test injection
- **WHEN** a unit test calls a service with `fetchImpl`
- **THEN** the service SHALL use the injected fetch instead of the global `authFetch` transport
