## MODIFIED Requirements

### Requirement: Typed services and error normalization
All billing services under `app/(private)/billing/_logic/services/` SHALL use `authFetch`, accept an optional `fetchImpl?: typeof fetch` for tests, and SHALL NOT return raw `Response` (except the download service, which reads `blob()` internally). They SHALL normalize backend HTTP errors to typed module errors (`SaleAlreadyInvoicedError`, `SaleNotInvoiceableError`, `ReceiverFiscalDataIncompleteError`, `FacturamaStampError`, `InvoiceAlreadyCancelledError`, `FacturamaCancelError`, `FacturamaCsdError`, `InvoiceNotFoundError`, `InvoiceNotStampedError`, `InvoiceFileDownloadFailedError`, `BranchRequiredError`). A 400 response whose `error` field does not match any of these typed codes SHALL NOT be collapsed to a generic network/connectivity error — the service SHALL throw a plain `Error` carrying a human-readable message derived from the backend's Zod `fieldErrors`/`formErrors` (or the raw `error` string when no field-level detail is present), so the caller always has an actionable message to display.

#### Scenario: Stamp error mapping
- **WHEN** `stampInvoice` receives 409 `SaleAlreadyInvoiced{invoiceId}`
- **THEN** it SHALL throw `SaleAlreadyInvoicedError` carrying `invoiceId`

#### Scenario: Test injection
- **WHEN** a unit test calls a service with `fetchImpl`
- **THEN** the service SHALL use the injected fetch instead of the global `authFetch` transport

#### Scenario: BranchRequired error mapping
- **WHEN** `stampInvoice` receives 400 `{ "error": "BranchRequired" }` (standalone invoice with no scoped branch and no headquarters branch configured)
- **THEN** it SHALL throw `BranchRequiredError`, not a generic `NetworkError`

#### Scenario: Unrecognized 400 surfaces a readable message
- **WHEN** `stampInvoice` or `downloadInvoicePreviewPdf` receives a 400 whose `error` field is a Zod `fieldErrors`/`formErrors` shape not matching any typed error code
- **THEN** the thrown error's `message` SHALL contain a human-readable description of the validation failure, not the generic `NetworkError` message

### Requirement: Partial standalone invoice ("Factura parcial") does not affect inventory
`PartialInvoiceForm` SHALL build a standalone CFDI **without `saleId`**. It SHALL collect:
- A receiver via `CustomerPicker` (reading `rfc`, `name`, `cfdiUse`, `taxRegime`→`fiscalRegime`, `taxZipCode`). When fiscal data is incomplete the form SHALL block submit and list the missing fields inline.
- One or more lines added either from the product catalog (`ProductCatalogPanel`/`ProductCatalogTable`) or as **free lines** ("Agregar línea libre", no `productId`, manual `description` + `satProductCode`). A catalog line SHALL be added with its default price preselected: `unitPrice` SHALL be initialized from `prices.find(p => p.isDefault) ?? prices[0]` (same fallback criterion as `pos-ui`'s `PriceTierPicker`) fetched via `getProductPrices(productId)`, or `0` if the product has no prices at all. Each catalog line (`PartialInvoiceLineRow`) SHALL render a price-tier selector (reusing `PriceTierPicker`) letting the user switch among the product's available `ProductPrice` entries — selecting a different tier SHALL update the line's `unitPrice` to that tier's price. Free lines SHALL NOT render a price-tier selector — they keep manual `unitPrice` entry, unchanged. Every line SHALL allow editing `quantity`, `unitPrice` (manually, in addition to the tier selector for catalog lines), `discountPct`, `ivaRate`, `iepsRate`, and each of these 5 numeric fields SHALL support being fully cleared while editing (no forced `0` reappearing on each keystroke) — normalization to a numeric value SHALL occur only on blur. For free lines, `satProductCode` SHALL be validated to be either empty or exactly 8 digits (`^\d{8}$`) — a partially-typed value (non-empty, not matching the full pattern) SHALL block submit with an inline error identifying the line, preventing the equivalent backend Zod rejection from ever being reached.

It SHALL show live totals computed by the shared `computeTotalsClient` (banker's rounding) and a visible note **"La factura parcial no afecta inventario"**. Before submit, the form SHALL block and show an inline error if any line with a non-null `productId` has `unitPrice <= 0` (empty treated as `0` for this check) — free lines are exempt from this check. On submit it SHALL call `POST /api/v1/admin/invoices { customer, items[], paymentForm?, paymentMethod? }` via `stampInvoice` and navigate to `/billing/[id]`.

Because the payload carries no `saleId`, the request SHALL reach the backend standalone path, which performs no inventory movement.

#### Scenario: Build and stamp a partial invoice
- **WHEN** the user picks a fiscally-complete customer, adds two catalog lines (each keeping its preselected default price), and confirms
- **THEN** `POST /invoices` SHALL be sent with `{ customer, items: [...] }` and **without** `saleId`, and on 201 navigate to `/billing/[id]`

#### Scenario: Catalog line preselects the default price
- **WHEN** the user adds a product that has a `ProductPrice` marked `isDefault: true`
- **THEN** the line is added with `unitPrice` equal to that default price's value, not `0`

#### Scenario: Catalog line without any price falls back to zero, still overridable
- **WHEN** the user adds a product with no `ProductPrice` records at all
- **THEN** the line is added with `unitPrice: 0` (unchanged fallback behavior) and remains editable manually or blocked at submit per the zero-price validation below

#### Scenario: Switching price tier updates unitPrice
- **WHEN** the user changes the price-tier selector on a catalog line from "Precio público" to "10"
- **THEN** the line's `unitPrice` updates to the "10" tier's price, and the footer totals recompute live

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

### Requirement: Invoice preview before stamping
Both emission forms (`StampSaleForm` and `PartialInvoiceForm`, under `/billing/new`) SHALL render a "Vista previa" button. Clicking it SHALL open `InvoicePreviewModal` (a native `<dialog>`, following the same open/close pattern as `CancelInvoiceModal`) showing: the Agrisas logo (`/logo.png`), a folio placeholder "PENDIENTE DE TIMBRAR", a visible badge "BORRADOR — no válido fiscalmente", the receiver's fiscal data, the line items with per-line and aggregate totals computed client-side via `computeInvoiceTotalsClient`, and three actions: "Volver a editar" (closes the modal without side effects), "Descargar PDF" (downloads the currently-displayed preview as a PDF via `POST /api/v1/admin/invoices/preview/pdf`, sending the same `InvoicePreviewData` already rendered on screen — no side effects, no Facturama call), and "Timbrar ahora" (invokes the same existing `submit()` used by the form's real "Emitir factura" action — it SHALL NOT call Facturama or persist anything on its own).

For `PartialInvoiceForm`, the preview data SHALL be built entirely from data already present in the form's local state (customer, lines, payment form/method) — no network request SHALL be made to open the preview.

For `StampSaleForm`, which does not hold line items or the receiver's fiscal data in its local state, opening the preview SHALL resolve that data by reading `GET /api/v1/admin/sales/:id` and (when the sale has a `customerId`) `GET /api/v1/admin/customers/:id` — both already-existing read endpoints, reused unmodified. When mapping the sale's items to preview lines, any `discountPct`, `ivaRate`, or `iepsRate` that is `null` on the source sale item (e.g. a line without a discount, or an IEPS-exempt product) SHALL be normalized to `0` — the preview payload SHALL NEVER carry a `null` for these fields, since the preview PDF endpoint's contract requires non-nullable numbers (see `billing-api`'s "Invoice preview PDF endpoint"). While resolving, the modal SHALL show a loading state. If the selected sale has no `customerId`, the modal SHALL show the message "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable "Timbrar ahora" AND "Descargar PDF".

The preview SHALL never introduce a persisted draft state: `Invoice.status` remains only `"stamped" | "cancelled"`, and closing the modal without confirming SHALL leave the form's state untouched. Downloading the PDF SHALL NOT close the modal or alter the form's state.

#### Scenario: Preview from partial invoice form (no network)
- **WHEN** the user has picked a fiscally-complete customer and added at least one line in `PartialInvoiceForm`, then clicks "Vista previa"
- **THEN** the modal SHALL open immediately (no HTTP request) showing the logo, "BORRADOR" badge, "PENDIENTE DE TIMBRAR" folio, receiver data, lines and totals matching the form's live totals

#### Scenario: Preview from stamp-sale form (resolves sale + customer)
- **WHEN** the user has selected a `completed` sale with an associated customer in `StampSaleForm`, then clicks "Vista previa"
- **THEN** the modal SHALL show a brief loading state, then render the sale's lines and the customer's real fiscal data

#### Scenario: Sale without customer blocks preview confirmation and download
- **WHEN** the user clicks "Vista previa" in `StampSaleForm` for a sale with no `customerId`
- **THEN** the modal SHALL show "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable both "Timbrar ahora" and "Descargar PDF", without throwing an unhandled error

#### Scenario: Confirm stamps for real
- **WHEN** the user clicks "Timbrar ahora" inside the preview modal (either form)
- **THEN** the modal SHALL close and the form's existing real stamping flow SHALL run unchanged (same `POST /api/v1/admin/invoices` request the "Emitir factura" / "Emitir factura parcial" button already triggers)

#### Scenario: Cancel preview leaves form untouched
- **WHEN** the user clicks "Volver a editar"
- **THEN** the modal SHALL close and no field of the underlying form SHALL be modified

#### Scenario: Download PDF from partial invoice preview
- **WHEN** the user, with a partial-invoice preview open, clicks "Descargar PDF"
- **THEN** the browser downloads a PDF containing the same receiver, lines, and totals shown in the modal, watermarked "BORRADOR — no válido fiscalmente", without closing the modal or calling `POST /invoices`

#### Scenario: Download PDF from stamp-sale preview
- **WHEN** the user, with a stamp-sale preview open (customer resolved), clicks "Descargar PDF"
- **THEN** the browser downloads a PDF matching the sale's lines and the customer's fiscal data, same watermark

#### Scenario: Download PDF succeeds when the sale has null discount/tax fields
- **WHEN** the user opens a stamp-sale preview for a sale whose items include `discountPct`, `ivaRate`, or `iepsRate` equal to `null`, and clicks "Descargar PDF"
- **THEN** the PDF downloads successfully, showing `0%`/`$0` for the normalized fields, instead of failing with a validation error

#### Scenario: Download does not affect modal state
- **WHEN** the user clicks "Descargar PDF" and the download completes (or fails)
- **THEN** the modal remains open with its data unchanged, and "Timbrar ahora"/"Volver a editar" remain available

#### Scenario: Download failure shown inline
- **WHEN** `POST /api/v1/admin/invoices/preview/pdf` fails (network error or non-200)
- **THEN** the modal shows an inline error near the "Descargar PDF" button without closing or clearing the preview, and the error message reflects the backend's actual reason (e.g. a validation detail) rather than a generic connectivity message whenever the backend returned a structured error body
