## MODIFIED Requirements

### Requirement: `/billing/[id]` invoice detail
The system SHALL expose a private route `/billing/[id]` gated by `billing:read` that fetches `GET /api/v1/admin/invoices/:id` via `getInvoice`. It SHALL render a header with: the title/status row (folio fiscal `uuid` or, if not yet present, an internal `Factura #<últimos 8 de invoice.id>` label, `InvoiceStatusBadge`, and "Total facturado"), the issuer's `issuerEmail` directly below the title when non-null (never inside `InvoiceMetaPanel`), and a two-column meta grid below that: column A shows "Emitida: `<fecha y hora>`" (derivada de `invoice.createdAt`, formateada como fecha larga + hora) plus the link to `/sales/[saleId]` when `saleId` is not null; column B shows "Folio: Factura #`<últimos 8 de invoice.id>`" and "UUID: `<invoice.uuid o "—">`" as explicit labeled fields. Below the header: `InvoiceItemsTable` (snapshots por línea con `lineSubtotal/lineIva/lineIeps/lineTotal` y totales `subtotal/taxTotal/total`), `InvoiceMetaPanel` (una sección "Datos del emisor": `issuerRfc/issuerLegalName/issuerFiscalRegime/issuerZipCode/issuerAddress` — NOT `issuerEmail`, which lives only in the page header —, mostrando el régimen fiscal como "código - descripción" (resuelto vía `SatTaxRegimeRepository`, ver `billing-api`) y "—" para cualquier campo `null`; una sección "Datos del receptor": `receiverRfc/receiverName/receiverCfdiUse/receiverFiscalRegime/receiverTaxZipCode`, con `receiverFiscalRegime` y `receiverCfdiUse` también como "código - descripción"; `paymentForm`/`paymentMethod` como "código - descripción" vía el catálogo compartido `SAT_PAYMENT_FORMS`/`SAT_PAYMENT_METHODS`; banner de cancelación con `cancellationMotive`+`cancelledAt` si `status='cancelled'`), y `InvoiceActionsBar`.

`InvoiceActionsBar` SHALL render "Descargar PDF" (molecule compartido `DownloadPdfButton`, `app/_components/molecules/PdfDownloadButton.tsx`, icono `picture_as_pdf`) y "Descargar XML" siempre, y "Cancelar" sólo cuando `status='stamped'` y `can("billing:cancel")`.

#### Scenario: Render stamped invoice
- **WHEN** a user with `billing:read` opens `/billing/[id]` of a `stamped` invoice
- **THEN** items, totales, emisor (incluyendo correo en la cabecera), receptor, la cabecera de 2 columnas (fecha/hora + link a la venta | Folio + UUID), y los botones de descarga SHALL render; "Cancelar" SHALL render only if the user has `billing:cancel`

#### Scenario: Cancelled invoice shows banner, no cancel
- **WHEN** the invoice `status='cancelled'`
- **THEN** the meta panel SHALL show the cancellation banner (`cancellationMotive`, `cancelledAt`) and the "Cancelar" action SHALL NOT render

#### Scenario: Not found
- **WHEN** the backend responds 404 `InvoiceNotFound`
- **THEN** the service SHALL throw `InvoiceNotFoundError` and the page SHALL render a not-found state

#### Scenario: Branch scope violation
- **WHEN** the backend responds 403 for an invoice outside the user's branch
- **THEN** the page SHALL render an access-denied message

#### Scenario: Download PDF button uses shared icon
- **WHEN** the "Descargar PDF" button renders on `/billing/[id]`
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule

#### Scenario: Issuer section shows dashes for a pre-migration invoice
- **WHEN** the invoice was stamped before the issuer snapshot existed and its `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress` are all `null`
- **THEN** the "Datos del emisor" section SHALL render with "—" in each of those 5 fields instead of a blank space or a crash; a `null` `issuerEmail` simply means the header's correo line is omitted (it is conditional, not rendered as "—")

#### Scenario: Fiscal regime and CFDI use show their description, not just the code
- **WHEN** a stamped invoice has `receiverFiscalRegime="601"` and `receiverCfdiUse="G03"`
- **THEN** the detail page SHALL show "601 - General de Ley Personas Morales" and "G03 - Gastos en general" (or their current catalog descriptions), not the raw codes alone — same treatment for the issuer's fiscal regime

#### Scenario: Issuer section shows the company's correo
- **WHEN** a stamped invoice has `issuerEmail = "contacto@agrisas.mx"`
- **THEN** the page header SHALL show "contacto@agrisas.mx" directly below the invoice title — NOT inside the "Datos del emisor" section, which no longer has a "Correo" field

#### Scenario: Header shows the emission date and time, folio and UUID in two columns
- **WHEN** a stamped invoice has `createdAt = "2026-09-01T14:32:00.000Z"` and `uuid = "5C37017F-217F-45B4-AB8A-6C1013237446"`
- **THEN** the header's left column SHALL show a formatted long date + time (e.g. "Emitida: 1 de septiembre de 2026, 08:32 a.m." in the browser's local time), derived from `createdAt`, and the right column SHALL show "Folio: Factura #`<últimos 8 de invoice.id>`" and "UUID: 5C37017F-217F-45B4-AB8A-6C1013237446" as separate labeled lines

---

### Requirement: Stamp from sale ("Facturar venta")
`StampSaleForm` SHALL let the user pick an existing `completed` sale via `SalePickerField` (server-side search `GET /api/v1/admin/sales?search=&status=completed`, debounce 300 ms, min 2 chars, showing folio + cliente + total), optionally set `paymentForm`, `paymentMethod`, `cfdiUse` (editable selects with sensible defaults), and choose the CFDI receiver via `CustomerPicker` (the same molecule used in `PartialInvoiceForm`/POS/Cotizaciones). Once a sale is selected, the picker SHALL preload with the sale's own customer (or remain empty if the sale has no linked customer); the user MAY replace it with a different customer before stamping. Selecting a different sale SHALL reset the picker back to that new sale's own customer (or empty) — it SHALL NOT carry over the previously selected override.

On submit, the form SHALL call `POST /api/v1/admin/invoices { saleId, customerId?, paymentForm?, paymentMethod?, cfdiUse? }` via `stampInvoice`, where `customerId` is included only when the operator's picker selection differs from doing nothing (i.e. whenever a customer is resolved in the picker, sale's own or replaced) — the backend treats an explicit `customerId` equal to the sale's own customer as a no-op override. On success it SHALL navigate to `/billing/[id]`. Nothing about the underlying `Sale` (its own `customerId`, items, or any other field) is ever modified by this form.

The service SHALL map 409 `SaleAlreadyInvoiced{invoiceId}` → `SaleAlreadyInvoicedError(invoiceId)`, 409 `SaleNotInvoiceable` → `SaleNotInvoiceableError`, 400 `ReceiverFiscalDataIncomplete{missingFields}` → `ReceiverFiscalDataIncompleteError(missingFields)`, 422 `FacturamaStampError{detail}` → `FacturamaStampError(detail)`.

#### Scenario: Stamp a completed sale with its own customer
- **WHEN** the user selects a `completed` sale (whose customer is preloaded in the picker, unchanged) and confirms
- **THEN** `POST /invoices { saleId, customerId: <sale's own customer id> }` SHALL be sent and on 201 the app SHALL navigate to `/billing/[id]`

#### Scenario: Stamp a completed sale with a different receiver
- **WHEN** the user selects a `completed` sale, then replaces the preloaded customer in `CustomerPicker` with a different one, and confirms
- **THEN** `POST /invoices { saleId, customerId: <the replaced customer's id> }` SHALL be sent, the resulting invoice SHALL be linked to the replaced customer, and the sale itself SHALL remain unmodified (verifiable via `GET /sales/:id` still showing its original `customerId`)

#### Scenario: Changing the selected sale resets the customer override
- **WHEN** the user has replaced the customer for sale A, then selects a different sale B via `SalePickerField`
- **THEN** the picker SHALL reset to sale B's own customer (or empty, if B has no customer) — it SHALL NOT keep the customer chosen for sale A

#### Scenario: Sale without a customer requires picking one
- **WHEN** the selected sale has no linked customer (`customerId=null`)
- **THEN** the picker SHALL render empty and the form SHALL require the user to select a customer before "Vista previa"/submit are enabled

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
- The branch used to resolve catalog prices and filter the product catalog SHALL always be the branch marked `isHeadquarters=true` (resolved via `useHeadquarters()`), for every user regardless of permissions. No branch selector (`<select>`) SHALL be rendered under any circumstance — this replaces the previous behavior where users with `branches:access_all` saw a selector. While `useHeadquarters()` is loading, the form SHALL show a loading state and defer catalog/price resolution. If no branch is marked as headquarters, the form SHALL render a blocking message ("No hay sucursal matriz configurada. Contacta a un administrador.") instead of allowing the user to add lines or submit.
- The product catalog (`ProductCatalogPanel`/`ProductCatalogTable`) SHALL be filtered to show only products with inventory/pricing in the headquarters branch — the same `branchId` used for price resolution is passed through to the catalog component.
- One or more lines added either from the product catalog or as **free lines** ("Agregar línea libre", no `productId`, manual `description` + `satProductCode`). A catalog line SHALL be added with its default price preselected: `unitPrice` SHALL be initialized from `prices.find(p => p.isDefault) ?? prices[0]` (same fallback criterion as `pos-ui`'s `PriceTierPicker`) fetched via `getProductPrices(productId, hqBranchId)` — where `hqBranchId` is the headquarters branch's id, resolved once per form session and fixed for its duration. Result is `0` if the resolved query returns no prices at all. Each catalog line (`PartialInvoiceLineRow`) SHALL render a price-tier selector (reusing `PriceTierPicker`) letting the user switch among the product's available `ProductPrice` entries fetched via the same `getProductPrices(productId, hqBranchId)` call — selecting a different tier SHALL update the line's `unitPrice` to that tier's price. Free lines SHALL NOT render a price-tier selector — they keep manual `unitPrice` entry, unchanged. Every line SHALL allow editing `quantity`, `unitPrice` (manually, in addition to the tier selector for catalog lines), `discountPct`, `ivaRate`, `iepsRate`, and each of these 5 numeric fields SHALL support being fully cleared while editing (no forced `0` reappearing on each keystroke) — normalization to a numeric value SHALL occur only on blur. For free lines, `satProductCode` SHALL be validated to be either empty or exactly 8 digits (`^\d{8}$`) — a partially-typed value (non-empty, not matching the full pattern) SHALL block submit with an inline error identifying the line, preventing the equivalent backend Zod rejection from ever being reached.

It SHALL show live totals computed by the shared `computeTotalsClient` (banker's rounding) and a visible note **"La factura parcial no afecta inventario"**. Before submit, the form SHALL block and show an inline error if any line with a non-null `productId` has `unitPrice <= 0` (empty treated as `0` for this check) — free lines are exempt from this check. On submit it SHALL call `POST /api/v1/admin/invoices { customer, items[], branchId: hqBranchId, paymentForm?, paymentMethod? }` via `stampInvoice` and navigate to `/billing/[id]` — `branchId` SHALL always be sent explicitly as the headquarters branch's id, matching the branch already used to resolve catalog prices, so the emitted invoice's branch is never left to an implicit backend fallback.

Because the payload carries no `saleId`, the request SHALL reach the backend standalone path, which performs no inventory movement.

#### Scenario: Build and stamp a partial invoice
- **WHEN** the user picks a fiscally-complete customer, adds two catalog lines (each keeping its preselected default price), and confirms
- **THEN** `POST /invoices` SHALL be sent with `{ customer, items: [...], branchId: <headquarters branch id> }` and **without** `saleId`, and on 201 navigate to `/billing/[id]`

#### Scenario: No branch selector renders regardless of permissions
- **WHEN** any user — including one with `branches:access_all` — opens "Factura parcial"
- **THEN** no branch `<select>` renders anywhere in the form; the branch used is always the headquarters branch, resolved silently via `useHeadquarters()`

#### Scenario: Product catalog filtered to headquarters inventory
- **WHEN** the headquarters branch has resolved and the user opens the product catalog to add a line
- **THEN** `ProductCatalogPanel` SHALL only list products with inventory/pricing in that branch, using the same `branchId` passed to price resolution

#### Scenario: Headquarters not configured blocks the form
- **WHEN** `useHeadquarters()` resolves with `hq === null` (no branch is marked `isHeadquarters=true`)
- **THEN** the form SHALL render a blocking message ("No hay sucursal matriz configurada...") and SHALL NOT allow adding lines, previewing, or submitting

#### Scenario: Catalog line preselects the default price
- **WHEN** the user adds a product that has a `ProductPrice` marked `isDefault: true`
- **THEN** the line is added with `unitPrice` equal to that default price's value, not `0`

#### Scenario: Catalog line without any price falls back to zero, still overridable
- **WHEN** the user adds a product with no `ProductPrice` records at all (global or branch-scoped)
- **THEN** the line is added with `unitPrice: 0` (unchanged fallback behavior) and remains editable manually or blocked at submit per the zero-price validation below

#### Scenario: Switching price tier updates unitPrice
- **WHEN** the user changes the price-tier selector on a catalog line from "Precio público" to "10"
- **THEN** the line's `unitPrice` updates to the "10" tier's price, and the footer totals recompute live, using the same headquarters-scoped price list the catalog "add" step used — no divergence between the two entry points

#### Scenario: Manual price reflected in totals
- **WHEN** the user changes a line `unitPrice` manually
- **THEN** the footer totals (subtotal/iva/ieps/total) SHALL recompute live via `computeTotalsClient`

#### Scenario: Numeric field can be fully cleared while editing
- **WHEN** the user selects all text in the `unitPrice` (or `quantity`/`discountPct`/`ivaRate`/`iepsRate`) input and presses delete
- **THEN** the input shows empty — it does NOT immediately snap back to `0`, and the user can type a new value (e.g. `150`) without first deleting a reappearing `0`

#### Scenario: Empty numeric field normalizes to zero on blur
- **WHEN** the user leaves a numeric field empty and moves focus away (blur)
- **THEN** the field's underlying value normalizes to `0` at that point, not while the field was being edited

#### Scenario: Submit blocked when a catalog line has zero price
- **WHEN** the user tries to submit with at least one catalog line (`productId` set) whose `unitPrice` is `0` or was left empty
- **THEN** the form blocks submission, shows an inline error identifying the offending line, and does NOT call `POST /invoices`

#### Scenario: Free line at zero price is allowed
- **WHEN** a free line (`productId: null`) has `unitPrice: 0`
- **THEN** submission is NOT blocked by the zero-price check (only catalog lines are checked)

#### Scenario: Inventory untouched
- **WHEN** a partial invoice is stamped
- **THEN** no inventory endpoint SHALL be called and the request SHALL omit `saleId` (the backend standalone path leaves `branch_inventory` unchanged)

#### Scenario: Customer fiscal data incomplete blocks submit
- **WHEN** the selected customer lacks `cfdiUse`, `taxRegime`, or `taxZipCode`
- **THEN** the form SHALL block submit and list the missing fiscal fields

#### Scenario: Customer with a null rfc does not crash the page
- **WHEN** the selected customer's `rfc` field is `null` (as returned by the customer search/quick-add API)
- **THEN** the form SHALL normalize it to an empty string, list "RFC" among the missing fiscal fields, and render normally — it SHALL NOT throw an unhandled exception

#### Scenario: Free line without product
- **WHEN** the user clicks "Agregar línea libre" and fills `description`, `unitPrice`, `satProductCode`
- **THEN** the line SHALL be added with `productId` null and included in the `items[]` payload

#### Scenario: Partial SAT product code blocks submit
- **WHEN** a free line's `satProductCode` is non-empty but does not match `^\d{8}$` (e.g. `"1234"`)
- **THEN** the form blocks submission, shows an inline error on that line, and does NOT call `POST /invoices`

---

### Requirement: Invoice preview before stamping
Both emission forms (`StampSaleForm` and `PartialInvoiceForm`, under `/billing/new`) SHALL render a "Vista previa" button. Clicking it SHALL open `InvoicePreviewModal` (a native `<dialog>`, following the same open/close pattern as `CancelInvoiceModal`) showing: the logo, the fixed title "Factura", the branch name when present, and the issuer's correo when present — all in the modal's header block (NOT the company legal name — that identity lives only in the "Datos del emisor" section below), a folio placeholder "PENDIENTE DE TIMBRAR", a visible badge "BORRADOR — no válido fiscalmente", a "Datos del emisor" section (RFC, razón social, régimen fiscal as "code - description", código postal, dirección — resolved as described below; NOT correo, which renders in the header instead), the receiver's fiscal data including its zip code (`taxZipCode`) and its `fiscalRegime`/`cfdiUse` as "code - description", the line items with per-line and aggregate totals computed client-side via `computeInvoiceTotalsClient`, and three actions: "Volver a editar" (closes the modal without side effects), "Descargar PDF" (molecule compartido `DownloadPdfButton`, icono `picture_as_pdf` — downloads the currently-displayed preview as a PDF via `POST /api/v1/admin/invoices/preview/pdf`, sending the same `InvoicePreviewData` already rendered on screen — no side effects, no Facturama call), and "Timbrar ahora" (invokes the same existing `submit()` used by the form's real "Emitir factura" action — it SHALL NOT call Facturama or persist anything on its own). Because this preview represents a borrador, it SHALL NOT show an emission date/time — that only exists once the invoice is actually stamped (see `/billing/[id]`).

The issuer's fiscal identity (`rfc`, `legalName`, `fiscalRegime`, `zipCode`, `address`, `email`) SHALL be resolved by calling `GET /api/v1/admin/billing/emitter-fiscal-settings` (requires only `billing:write`, already held by whoever can open this form — NOT `billing:manage_csd`) when the preview is opened, for BOTH forms. That endpoint's cascade (CSD en vivo → `EmitterFiscalSettings` → `TicketSettings`, ver `billing-api`) draws only from real data the admin has actually captured — it SHALL NEVER return a hardcoded/invented placeholder. A field with no value in any of the sources renders as "—" in the UI; the same "—" also covers the case where the network call itself fails (see below) — the UI cannot distinguish "nothing captured" from "the lookup failed", and SHALL NOT need to. The receiver's `fiscalRegime`/`cfdiUse` descriptions SHALL be resolved client-side by querying the existing search endpoints `GET /api/v1/admin/sat-codes/regimen-fiscal?search=<code>` and `.../uso-cfdi?search=<code>` with the exact code, reusing them as an exact-match lookup. This resolution SHALL happen once per modal open and SHALL NOT block rendering the rest of the preview if any of it fails — a failure to resolve issuer data or a catalog description SHALL NOT prevent "Descargar PDF" or "Timbrar ahora" (the backend independently re-resolves everything server-side for the actual PDF render).

For `PartialInvoiceForm`, the receiver/lines preview data SHALL be built entirely from data already present in the form's local state (customer, lines, payment form/method) — no network request beyond the issuer fiscal lookup above SHALL be made to open the preview.

For `StampSaleForm`, which does not hold line items in its local state, opening the preview SHALL resolve the sale's items by reading `GET /api/v1/admin/sales/:id` (already-existing read endpoint, reused unmodified). The receiver's fiscal data SHALL come from whichever customer is currently resolved in the form's `CustomerPicker` — the sale's own customer by default, or the operator's chosen override — fetched via `GET /api/v1/admin/customers/:id` for that customer's id; it SHALL NEVER silently fall back to the sale's own customer once an override has been made. When mapping the sale's items to preview lines, any `discountPct`, `ivaRate`, or `iepsRate` that is `null` on the source sale item (e.g. a line without a discount, or an IEPS-exempt product) SHALL be normalized to `0` — the preview payload SHALL NEVER carry a `null` for these fields, since the preview PDF endpoint's contract requires non-nullable numbers (see `billing-api`'s "Invoice preview PDF endpoint"). While resolving, the modal SHALL show a loading state. If neither the sale nor the picker resolves to a customer (sale has `customerId=null` and no override has been picked), the modal SHALL show the message "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable "Timbrar ahora" AND "Descargar PDF".

The preview SHALL never introduce a persisted draft state: `Invoice.status` remains only `"stamped" | "cancelled"`, and closing the modal without confirming SHALL leave the form's state untouched. Downloading the PDF SHALL NOT close the modal or alter the form's state.

#### Scenario: Preview from partial invoice form (no network)
- **WHEN** the user has picked a fiscally-complete customer and added at least one line in `PartialInvoiceForm`, then clicks "Vista previa"
- **THEN** the modal SHALL open showing the logo, the "Factura" title, the issuer's correo in the header (when resolved), "BORRADOR" badge, "PENDIENTE DE TIMBRAR" folio, "Datos del emisor" data (resolved via the emitter fiscal settings lookup, including address — NOT correo, which is in the header), receiver data (including zip code and fiscal-regime/CFDI-use descriptions), lines and totals matching the form's live totals, with no emission date/time shown

#### Scenario: Preview from stamp-sale form (resolves sale + customer)
- **WHEN** the user has selected a `completed` sale (customer preloaded, unchanged) in `StampSaleForm`, then clicks "Vista previa"
- **THEN** the modal SHALL show a brief loading state, then render the sale's lines, the sale's own customer's real fiscal data, and the issuer's fiscal data

#### Scenario: Preview reflects the overridden customer, not the sale's original customer
- **WHEN** the user has replaced the sale's own customer with a different one in `CustomerPicker`, then clicks "Vista previa"
- **THEN** the modal SHALL render the replaced customer's fiscal data as the receiver — never the sale's original customer's data

#### Scenario: Sale without customer blocks preview confirmation and download
- **WHEN** the user clicks "Vista previa" in `StampSaleForm` for a sale with no `customerId` and no customer has been picked in `CustomerPicker`
- **THEN** the modal SHALL show "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable both "Timbrar ahora" and "Descargar PDF", without throwing an unhandled error

#### Scenario: Confirm stamps for real
- **WHEN** the user clicks "Timbrar ahora" inside the preview modal (either form)
- **THEN** the modal SHALL close and the form's existing real stamping flow SHALL run unchanged (same `POST /api/v1/admin/invoices` request the "Emitir factura" / "Emitir factura parcial" button already triggers)

#### Scenario: Cancel preview leaves form untouched
- **WHEN** the user clicks "Volver a editar"
- **THEN** the modal SHALL close and no field of the underlying form SHALL be modified

#### Scenario: Download PDF from partial invoice preview
- **WHEN** the user, with a partial-invoice preview open, clicks "Descargar PDF"
- **THEN** the browser downloads a PDF containing the same issuer, receiver, lines, and totals shown in the modal, watermarked "BORRADOR — no válido fiscalmente", without closing the modal or calling `POST /invoices`

#### Scenario: Download PDF from stamp-sale preview
- **WHEN** the user, with a stamp-sale preview open (customer resolved), clicks "Descargar PDF"
- **THEN** the browser downloads a PDF matching the sale's lines and the currently resolved customer's fiscal data (sale's own or overridden), same watermark

#### Scenario: Download PDF succeeds when the sale has null discount/tax fields
- **WHEN** the user opens a stamp-sale preview for a sale whose items include `discountPct`, `ivaRate`, or `iepsRate` equal to `null`, and clicks "Descargar PDF"
- **THEN** the PDF downloads successfully, showing `0%`/`$0` for the normalized fields, instead of failing with a validation error

#### Scenario: Download does not affect modal state
- **WHEN** the user clicks "Descargar PDF" and the download completes (or fails)
- **THEN** the modal remains open with its data unchanged, and "Timbrar ahora"/"Volver a editar" remain available

#### Scenario: Download failure shown inline
- **WHEN** `POST /api/v1/admin/invoices/preview/pdf` fails (network error or non-200)
- **THEN** the modal shows an inline error near the "Descargar PDF" button without closing or clearing the preview, and the error message reflects the backend's actual reason (e.g. a validation detail) rather than a generic connectivity message whenever the backend returned a structured error body

#### Scenario: Preview download button uses shared icon
- **WHEN** the "Descargar PDF" button renders inside `InvoicePreviewModal`
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule, same icon as `/billing/[id]`

#### Scenario: Issuer lookup failure does not block the preview
- **WHEN** `GET /api/v1/admin/billing/emitter-fiscal-settings` fails (network error) while opening the preview
- **THEN** the modal SHALL still open showing "—" for the issuer's RFC/razón social/régimen fiscal/CP/dirección in "Datos del emisor", the header simply omits the correo line (no "—" there, it is conditional), and "Descargar PDF"/"Timbrar ahora" SHALL remain enabled (the actual PDF resolves the issuer server-side regardless, via the same cascade, so it will not be blank there even if it was in the modal)

#### Scenario: Modal header shows "Factura", not the company name
- **WHEN** the preview modal renders (either form)
- **THEN** its header SHALL show the logo, the text "Factura", the branch name and correo when present — it SHALL NOT show the issuer's legal name or "Agrisas" as a title; the issuer's fiscal identity (RFC, razón social, etc.) is shown only inside the "Datos del emisor" section below

#### Scenario: Catalog description lookup failure falls back to raw code
- **WHEN** a search call to `/api/v1/admin/sat-codes/regimen-fiscal` or `.../uso-cfdi` fails or returns no match for the exact code
- **THEN** the modal SHALL display the raw code alone for that field, without blocking the rest of the preview
