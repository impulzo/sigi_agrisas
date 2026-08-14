## MODIFIED Requirements

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

### Requirement: Typed services and error normalization
All billing services under `app/(private)/billing/_logic/services/` SHALL use `authFetch`, accept an optional `fetchImpl?: typeof fetch` for tests, and SHALL NOT return raw `Response` (except the download service, which reads `blob()` internally). They SHALL normalize backend HTTP errors to typed module errors (`SaleAlreadyInvoicedError`, `SaleNotInvoiceableError`, `ReceiverFiscalDataIncompleteError`, `FacturamaStampError`, `InvoiceAlreadyCancelledError`, `FacturamaCancelError`, `FacturamaCsdError`, `InvoiceNotFoundError`, `InvoiceNotStampedError`, `InvoiceFileDownloadFailedError`).

#### Scenario: Stamp error mapping
- **WHEN** `stampInvoice` receives 409 `SaleAlreadyInvoiced{invoiceId}`
- **THEN** it SHALL throw `SaleAlreadyInvoicedError` carrying `invoiceId`

#### Scenario: Test injection
- **WHEN** a unit test calls a service with `fetchImpl`
- **THEN** the service SHALL use the injected fetch instead of the global `authFetch` transport

## ADDED Requirements

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
