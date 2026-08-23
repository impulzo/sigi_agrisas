## MODIFIED Requirements

### Requirement: Invoice preview PDF endpoint
The system SHALL expose `POST /api/v1/admin/invoices/preview/pdf`. Requires `billing:write`. The request body SHALL be the client-resolved preview data (mirroring `InvoicePreviewData`): `{ issuer: { name, branchName? }, receiver: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, lines: Array<{ description, productCode, satProductCode?, quantity, unitPrice, discountPct, ivaRate, iepsRate, lineSubtotal, lineTotal }>, paymentForm, paymentMethod, subtotal, taxTotal, total, currency }`. `discountPct`, `ivaRate`, and `iepsRate` per line SHALL be non-nullable numbers at this endpoint's boundary — the client is responsible for normalizing any `null` value coming from the underlying sale (e.g. items without a discount, IEPS-exempt products) to `0` before sending the request. Zod SHALL validate the body's shape (types, required fields) but the system SHALL NOT re-derive totals from a `saleId`, re-validate business rules already enforced client-side (receiver fiscal completeness, price ≥ 0), or persist anything — it renders `InvoiceDocumentPdf` with the data as received and returns it watermarked "BORRADOR — no válido fiscalmente" and folio placeholder "PENDIENTE DE TIMBRAR". No Facturama call occurs. Returns HTTP 200 with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="factura-borrador.pdf"`. Any exception raised while rendering the PDF (e.g. `renderToBuffer` failure) SHALL be caught and returned as HTTP 500 with a JSON body (`{ "error": "PdfRenderError" }` or equivalent), never as an unhandled exception with no JSON body.

#### Scenario: Preview PDF generated from client-resolved data
- **WHEN** an authenticated user with `billing:write` posts a well-formed preview payload
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`, the PDF shows the exact receiver/lines/totals from the body, the "BORRADOR — no válido fiscalmente" watermark, and "PENDIENTE DE TIMBRAR" as the folio

#### Scenario: No persistence or Facturama call
- **WHEN** the preview PDF endpoint is called
- **THEN** no `Invoice` row is created or modified, and no request reaches `FacturamaGateway`

#### Scenario: Malformed body rejected
- **WHEN** the body is missing `receiver` or `lines`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Forbidden without billing:write
- **WHEN** an authenticated user without `billing:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:write"}`

#### Scenario: Null discount/tax rate fields rejected as malformed
- **WHEN** the body contains a line with `discountPct`, `ivaRate`, or `iepsRate` equal to `null` instead of a number
- **THEN** the system returns HTTP 400 with a Zod validation error identifying the field — the client is expected to normalize these to `0` before sending, per this requirement's non-nullable contract

#### Scenario: PDF render failure returns a typed 500
- **WHEN** `renderToBuffer` throws while composing the PDF from an otherwise well-formed body
- **THEN** the system returns HTTP 500 with a JSON error body, not an unhandled exception
