## ADDED Requirements

### Requirement: Invoice preview PDF endpoint
The system SHALL expose `POST /api/v1/admin/invoices/preview/pdf`. Requires `billing:write`. The request body SHALL be the client-resolved preview data (mirroring `InvoicePreviewData`): `{ issuer: { name, branchName? }, receiver: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, lines: Array<{ description, productCode, satProductCode?, quantity, unitPrice, discountPct, ivaRate, iepsRate, lineSubtotal, lineTotal }>, paymentForm, paymentMethod, subtotal, taxTotal, total, currency }`. Zod SHALL validate the body's shape (types, required fields) but the system SHALL NOT re-derive totals from a `saleId`, re-validate business rules already enforced client-side (receiver fiscal completeness, price ≥ 0), or persist anything — it renders `InvoiceDocumentPdf` with the data as received and returns it watermarked "BORRADOR — no válido fiscalmente" and folio placeholder "PENDIENTE DE TIMBRAR". No Facturama call occurs. Returns HTTP 200 with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="factura-borrador.pdf"`.

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

## MODIFIED Requirements

### Requirement: Facturama gateway abstraction with mock mode
The system SHALL define a `FacturamaGateway` port with operations `stamp`, `cancel`, `download`, `uploadCsd`, `getCsdStatus`. The REST implementation `FacturamaRestGateway` SHALL authenticate with HTTP Basic Auth built from `FACTURAMA_USER`/`FACTURAMA_PASSWORD`, target `FACTURAMA_BASE_URL` (sandbox default), accept an injectable `fetchImpl` for tests, and normalize Facturama HTTP errors to typed domain errors. When `FACTURAMA_MOCK=true` (default) the DI container SHALL use `FakeFacturamaGateway`, which returns deterministic fake `uuid`/`facturamaCfdiId` and, for `download`, a realistic-looking CFDI document rendered from the same data passed to `stamp()` (see below) instead of a network call. `FacturamaRestGateway` SHALL fail fast at construction only when `FACTURAMA_MOCK=false` and credentials are missing.

`FakeFacturamaGateway.stamp(input)` SHALL retain the received `input` (issuer/receiver/lines data) in an in-memory map keyed by the generated `cfdiId`, for the lifetime of the process. `FakeFacturamaGateway.download(format, cfdiId)` SHALL render that retained input through `InvoiceDocumentPdf` (for `format="pdf"`) — producing a document with issuer, receiver, a concepts table, tax breakdown, and totals, prominently watermarked "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" — or an XML reflecting the same issuer/receiver/concepts data (for `format="xml"`), instead of the fixed placeholder strings used before this change. If `cfdiId` is not found in the map (e.g. process restarted between `stamp` and `download`), the system SHALL fall back to a minimal but still realistically laid-out placeholder document (not the prior single-line stub), still carrying the same watermark.

#### Scenario: Mock mode by default
- **WHEN** `FACTURAMA_MOCK` is unset or `true`
- **THEN** stamping returns a deterministic fake CFDI and performs no network request

#### Scenario: Real mode requires credentials
- **WHEN** `FACTURAMA_MOCK=false` and `FACTURAMA_USER`/`FACTURAMA_PASSWORD` are missing
- **THEN** the gateway construction throws a startup error

#### Scenario: Basic Auth header
- **WHEN** the REST gateway makes a request
- **THEN** it sends `Authorization: Basic base64("<user>:<password>")`

#### Scenario: Mock PDF renders the stamped data
- **WHEN** `stamp()` is called with a given issuer/receiver/lines, then `download("pdf", cfdiId)` is called for that same `cfdiId`
- **THEN** the returned PDF's visible content includes that receiver's name/RFC and the line items' descriptions — not a generic single sentence

#### Scenario: Mock PDF clearly marked as non-fiscal
- **WHEN** `download("pdf", cfdiId)` returns a mock document (whether from retained input or the fallback)
- **THEN** the document prominently displays "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL"

#### Scenario: Mock XML reflects issuer/receiver/concepts
- **WHEN** `download("xml", cfdiId)` is called for a `cfdiId` with retained input
- **THEN** the returned XML includes the receiver's RFC and at least one concept node derived from the stamped lines, not only the minimal `<cfdi:Comprobante Version="4.0" NoCertificado="FAKE"/>` stub

#### Scenario: Unknown cfdiId still returns a realistic-looking fallback
- **WHEN** `download(format, cfdiId)` is called for a `cfdiId` with no retained input
- **THEN** the system returns a placeholder document that still follows the full CFDI layout and watermark, not the prior minimal stub

#### Scenario: Real mode unaffected
- **WHEN** `FACTURAMA_MOCK=false`
- **THEN** `FacturamaRestGateway.download` behaves exactly as before this change, returning Facturama's actual file unmodified
