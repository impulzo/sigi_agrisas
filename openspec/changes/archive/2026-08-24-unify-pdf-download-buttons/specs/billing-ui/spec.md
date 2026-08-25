## MODIFIED Requirements

### Requirement: `/billing/[id]` invoice detail

The system SHALL expose a private route `/billing/[id]` gated by `billing:read` that fetches `GET /api/v1/admin/invoices/:id` via `getInvoice`. It SHALL render a header (folio fiscal `uuid`, `InvoiceStatusBadge`, link a `/sales/[saleId]` cuando `saleId` no es null), `InvoiceItemsTable` (snapshots por línea con `lineSubtotal/lineIva/lineIeps/lineTotal` y totales `subtotal/taxTotal/total`), `InvoiceMetaPanel` (receptor: `receiverRfc/receiverName/receiverCfdiUse/receiverFiscalRegime/receiverTaxZipCode`, `cfdiUse`, `paymentForm`, `paymentMethod`; banner de cancelación con `cancellationMotive`+`cancelledAt` si `status='cancelled'`), y `InvoiceActionsBar`.

`InvoiceActionsBar` SHALL render "Descargar PDF" (molecule compartido `DownloadPdfButton`, `app/_components/molecules/PdfDownloadButton.tsx`, icono `picture_as_pdf`) y "Descargar XML" siempre, y "Cancelar" sólo cuando `status='stamped'` y `can("billing:cancel")`.

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

#### Scenario: Download PDF button uses shared icon
- **WHEN** the "Descargar PDF" button renders on `/billing/[id]`
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule

---

### Requirement: Invoice preview before stamping

Both emission forms (`StampSaleForm` and `PartialInvoiceForm`, under `/billing/new`) SHALL render a "Vista previa" button. Clicking it SHALL open `InvoicePreviewModal` (a native `<dialog>`, following the same open/close pattern as `CancelInvoiceModal`) showing: the Agrisas logo (`/logo.png`), a folio placeholder "PENDIENTE DE TIMBRAR", a visible badge "BORRADOR — no válido fiscalmente", the receiver's fiscal data, the line items with per-line and aggregate totals computed client-side via `computeInvoiceTotalsClient`, and three actions: "Volver a editar" (closes the modal without side effects), "Descargar PDF" (molecule compartido `DownloadPdfButton`, icono `picture_as_pdf` — downloads the currently-displayed preview as a PDF via `POST /api/v1/admin/invoices/preview/pdf`, sending the same `InvoicePreviewData` already rendered on screen — no side effects, no Facturama call), and "Timbrar ahora" (invokes the same existing `submit()` used by the form's real "Emitir factura" action — it SHALL NOT call Facturama or persist anything on its own).

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

#### Scenario: Preview download button uses shared icon
- **WHEN** the "Descargar PDF" button renders inside `InvoicePreviewModal`
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule, same icon as `/billing/[id]`
