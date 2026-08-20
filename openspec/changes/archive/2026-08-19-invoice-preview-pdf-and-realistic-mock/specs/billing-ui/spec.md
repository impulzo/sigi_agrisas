## MODIFIED Requirements

### Requirement: Invoice preview before stamping
Both emission forms (`StampSaleForm` and `PartialInvoiceForm`, under `/billing/new`) SHALL render a "Vista previa" button. Clicking it SHALL open `InvoicePreviewModal` (a native `<dialog>`, following the same open/close pattern as `CancelInvoiceModal`) showing: the Agrisas logo (`/logo.png`), a folio placeholder "PENDIENTE DE TIMBRAR", a visible badge "BORRADOR — no válido fiscalmente", the receiver's fiscal data, the line items with per-line and aggregate totals computed client-side via `computeInvoiceTotalsClient`, and three actions: "Volver a editar" (closes the modal without side effects), "Descargar PDF" (downloads the currently-displayed preview as a PDF via `POST /api/v1/admin/invoices/preview/pdf`, sending the same `InvoicePreviewData` already rendered on screen — no side effects, no Facturama call), and "Timbrar ahora" (invokes the same existing `submit()` used by the form's real "Emitir factura" action — it SHALL NOT call Facturama or persist anything on its own).

For `PartialInvoiceForm`, the preview data SHALL be built entirely from data already present in the form's local state (customer, lines, payment form/method) — no network request SHALL be made to open the preview.

For `StampSaleForm`, which does not hold line items or the receiver's fiscal data in its local state, opening the preview SHALL resolve that data by reading `GET /api/v1/admin/sales/:id` and (when the sale has a `customerId`) `GET /api/v1/admin/customers/:id` — both already-existing read endpoints, reused unmodified. While resolving, the modal SHALL show a loading state. If the selected sale has no `customerId`, the modal SHALL show the message "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable "Timbrar ahora" AND "Descargar PDF".

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

#### Scenario: Download does not affect modal state
- **WHEN** the user clicks "Descargar PDF" and the download completes (or fails)
- **THEN** the modal remains open with its data unchanged, and "Timbrar ahora"/"Volver a editar" remain available

#### Scenario: Download failure shown inline
- **WHEN** `POST /api/v1/admin/invoices/preview/pdf` fails (network error or non-200)
- **THEN** the modal shows an inline error near the "Descargar PDF" button without closing or clearing the preview
