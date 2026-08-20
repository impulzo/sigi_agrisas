# Spec: billing-api

## Purpose

Define the Billing API: issuance, cancellation, download and query of CFDI 4.0 electronic invoices via the Facturama PAC, plus CSD (Certificado de Sello Digital) management. Covers stamping from an existing completed sale or as a standalone invoice, with per-line fiscal snapshots that survive later changes to the source sale, customer or product catalog. No flow touches inventory.
## Requirements
### Requirement: Stamp invoice (CFDI Ingreso)
The system SHALL expose `POST /api/v1/admin/invoices` that issues (timbra) a CFDI 4.0 of type Ingreso (`I`) via Facturama and persists an `Invoice` only on success. Requires `billing:write`. The request body MUST be one of two mutually exclusive shapes:
- **Sale-linked**: `{ saleId: string (uuid), paymentForm?: string, paymentMethod?: string, cfdiUse?: string }` — the system loads the sale (must be `status='completed'`), derives `branchId`, receiver, items and totals from the sale and its customer. Since these totals are the sale's already-persisted snapshot (computed by `SaleTotalsCalculator`), they already reflect the tax-inclusive extraction formula — no re-derivation happens here.
- **Standalone**: `{ branchId?: string, customer: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, items: InvoiceItemInput[], paymentForm?, paymentMethod? }` — the system computes totals via `InvoiceTotalsCalculator`, using `Decimal(14,4)` banker's rounding and the same tax-inclusive-price extraction formula as `SaleTotalsCalculator`/`QuoteTotalsCalculator`/`ReturnTotalsCalculator`/`PurchaseTotalsCalculator` (`unitPrice` is the final price including tax; `lineSubtotal = lineGross / (1 + ivaRate + iepsRate)`). Standalone invoices have `saleId=null`.

`InvoiceItemInput`: `{ productId?: string|null, productCode: string, description: string, satProductCode?: string, satUnitCode?: string, unit?: string, quantity: number, unitPrice: number, discountPct?: number, ivaRate?: number, iepsRate?: number }`. Defaults: `paymentForm='01'`, `paymentMethod='PUE'`, `cfdiUse` from customer. **No inventory movement occurs in any case.** Returns HTTP 201 with `InvoiceDto`.

#### Scenario: Stamp from completed sale
- **WHEN** authenticated user with `billing:write` posts `{ "saleId": "<uuid>" }` for a `completed` sale whose customer has complete fiscal data
- **THEN** the system calls Facturama, persists an `Invoice` with `status='stamped'`, `uuid` (folio fiscal), `facturamaCfdiId`, `saleId` set, and returns HTTP 201 with `InvoiceDto`

#### Scenario: Stamp standalone invoice
- **WHEN** the body contains `customer` + `items[]` and no `saleId`
- **THEN** the system stamps the CFDI, persists `Invoice` with `saleId=null`, and does NOT modify `branch_inventory`

#### Scenario: Standalone invoice extracts tax from the final price
- **WHEN** a standalone item has `unitPrice=100`, `ivaRate=0.16`
- **THEN** `lineSubtotal ≈ 86.2069`, `lineIva ≈ 13.7931`, `lineTotal=100` — identical per-line breakdown to `SaleTotalsCalculator` given the same input

#### Scenario: Sale not completed
- **WHEN** the referenced sale has `status` other than `completed`
- **THEN** the system returns HTTP 409 `{"error":"SaleNotInvoiceable"}`

#### Scenario: Sale already has a stamped invoice
- **WHEN** the sale already has an `Invoice` with `status='stamped'`
- **THEN** the system returns HTTP 409 `{"error":"SaleAlreadyInvoiced","invoiceId":"<uuid>"}`

#### Scenario: Receiver fiscal data incomplete
- **WHEN** the customer is missing `rfc`, `cfdiUse`, `taxRegime` or `taxZipCode`
- **THEN** the system returns HTTP 400 `{"error":"ReceiverFiscalDataIncomplete"}` and does NOT call Facturama

#### Scenario: Facturama rejects the stamp
- **WHEN** Facturama returns an error (invalid CFDI, CSD missing, SAT validation)
- **THEN** the system returns HTTP 422 `{"error":"FacturamaStampError","detail":"<message>"}` and persists NO invoice

#### Scenario: Forbidden without permission
- **WHEN** user lacks `billing:write`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:write"}`

### Requirement: List invoices
The system SHALL expose `GET /api/v1/admin/invoices` returning a paginated list with branch scoping. Requires `billing:read`. Query params: `page` (default 1), `pageSize` (default 20, max 100), `status?` (`stamped`|`cancelled`), `branchId?` (only honored with `branches:access_all`), `search?` (min 2 chars; matches `uuid`, `receiverRfc`, `receiverName`). Response: `{ items: InvoiceDto[], total, page, pageSize }`, ordered `createdAt DESC`. Without `branches:access_all` the list is scoped to the caller's `x-user-branch-id`.

#### Scenario: Scoped listing
- **WHEN** a user without `branches:access_all` lists invoices
- **THEN** only invoices whose `branchId` equals the caller's branch are returned

#### Scenario: Admin filters by branch
- **WHEN** a user with `branches:access_all` passes `?branchId=<id>`
- **THEN** the response is filtered to that branch

### Requirement: Get invoice detail
The system SHALL expose `GET /api/v1/admin/invoices/:id`. Requires `billing:read`. Returns HTTP 404 if not found. Enforces branch scope (403 if out of scope without `branches:access_all`). Response `InvoiceDto` includes header fields and `items: InvoiceItemDto[]`.

#### Scenario: Get existing invoice
- **WHEN** `:id` matches an invoice in the caller's scope
- **THEN** the system returns HTTP 200 with `InvoiceDto` including items

#### Scenario: Not found
- **WHEN** `:id` matches no invoice
- **THEN** the system returns HTTP 404 `{"error":"InvoiceNotFound"}`

#### Scenario: Out of branch scope
- **WHEN** the invoice belongs to another branch and the caller lacks `branches:access_all`
- **THEN** the system returns HTTP 403

### Requirement: List invoices by sale
The system SHALL expose `GET /api/v1/admin/sales/:id/invoices` returning all invoices (including `cancelled`) linked to a sale, ordered `createdAt DESC`. Requires `billing:read`. Enforces branch scope against the sale's branch.

#### Scenario: Sale with one stamped and one cancelled invoice
- **WHEN** the sale has a cancelled invoice and a later stamped one
- **THEN** the system returns HTTP 200 with both, newest first

#### Scenario: Out of branch scope
- **WHEN** the sale belongs to another branch and the caller lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** `:id` matches no sale
- **THEN** the system returns HTTP 404 `{"error":"Sale not found"}`

### Requirement: Cancel invoice
The system SHALL expose `POST /api/v1/admin/invoices/:id/cancel`. Requires `billing:cancel`. Body: `{ motive: '01'|'02'|'03'|'04', uuidReplacement?: string }`. `motive='01'` (comprobante con errores con relación) MAY include `uuidReplacement`. The system calls Facturama to cancel, then sets `status='cancelled'`, `cancellationMotive`, `cancelledAt`, `cancelledBy`. Enforces branch scope. Returns HTTP 200 with updated `InvoiceDto`.

#### Scenario: Cancel a stamped invoice
- **WHEN** a user with `billing:cancel` cancels a `stamped` invoice with `{ "motive": "02" }`
- **THEN** Facturama cancellation is requested, the invoice becomes `status='cancelled'`, and HTTP 200 is returned

#### Scenario: Cancel already-cancelled invoice
- **WHEN** the invoice is already `cancelled`
- **THEN** the system returns HTTP 409 `{"error":"InvoiceAlreadyCancelled"}`

#### Scenario: Invalid motive
- **WHEN** `motive` is not one of `01`–`04`
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden without permission
- **WHEN** user lacks `billing:cancel`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:cancel"}`

### Requirement: Download invoice file (PDF/XML)
The system SHALL expose `GET /api/v1/admin/invoices/:id/download?format=pdf|xml`. Requires `billing:read`. Enforces branch scope. The system retrieves the file from Facturama by `facturamaCfdiId` and responds with the binary content and the correct `Content-Type` (`application/pdf` or `application/xml`) and a `Content-Disposition` filename based on `uuid`. Default `format=pdf`.

Cuando la factura no tiene `facturamaCfdiId` (nunca timbrada o inconsistente), el sistema SHALL responder HTTP 400 `{"error":"Invoice has not been stamped"}` en vez de un cuerpo vacío con 200. Cuando la llamada al gateway Facturama falla al recuperar el archivo (timeout, error del proveedor), el sistema SHALL responder HTTP 502 `{"error":"Failed to download invoice file"}` sin filtrar detalle interno del proveedor.

#### Scenario: Download PDF
- **WHEN** `?format=pdf` for an existing, stamped invoice in scope
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`

#### Scenario: Download XML
- **WHEN** `?format=xml`
- **THEN** the system returns HTTP 200 with `Content-Type: application/xml`

#### Scenario: Invalid format
- **WHEN** `format` is neither `pdf` nor `xml`
- **THEN** the system returns HTTP 400

#### Scenario: Invoice not stamped
- **WHEN** the invoice's `facturamaCfdiId` is null (never stamped or inconsistent)
- **THEN** the system SHALL return HTTP 400 `{"error":"Invoice has not been stamped"}` and SHALL NOT return a `200` response with empty content

#### Scenario: Facturama download failure
- **WHEN** the Facturama gateway raises an error while retrieving the stamped file
- **THEN** the system SHALL return HTTP 502 `{"error":"Failed to download invoice file"}` without leaking the underlying provider error detail

---

### Requirement: Send invoice by email
The system SHALL expose `POST /api/v1/admin/invoices/:id/send-email`. Requires `billing:read` (same permission as downloading the invoice; no new permission introduced). Enforces the same branch scope as `GET /invoices/:id`. Optional body: `{ email?: string }` — when omitted, the recipient is `customer.email` (from the sale's linked customer).

Behavior:

1. Load the invoice via the same lookup used by `GET /invoices/:id`; enforce branch scope; not found → HTTP 404.
2. Resolve the recipient: `body.email` if present and non-empty (validated as a well-formed email via Zod `.email()`, else HTTP 400), otherwise `customer.email`. If both are absent/null → HTTP 400 `{"error": "Customer has no email and no override provided"}`.
3. Verify the invoice has a `facturamaCfdiId` (i.e. it was successfully stamped) — if `null`, HTTP 400 `{"error": "Invoice has not been stamped"}`.
4. Fetch PDF and XML buffers by invoking `DownloadInvoiceFileUseCase.execute(id, "pdf")` and `DownloadInvoiceFileUseCase.execute(id, "xml")` (the same use case backing the existing download endpoint — no duplicated Facturama-fetch logic).
5. Send a single email to the resolved recipient with both files attached (`factura-<folio>.pdf`, `factura-<folio>.xml`), subject/body referencing the invoice's folio and total.
6. This send is SYNCHRONOUS — unlike the admin notification emails in `admin-notifications-api`, a failure here (SMTP unreachable, auth failure, etc.) SHALL propagate to the caller as HTTP 502 `{"error": "Failed to send invoice email"}`. Nothing about the invoice record is mutated by this endpoint either way.

Returns HTTP 200 `{"sentTo": "<resolved-email>"}` on success.

#### Scenario: Successful send to customer's email
- **WHEN** an authorized caller POSTs with no body for a stamped invoice whose linked `customer.email = "cliente@ejemplo.com"`
- **THEN** the system returns HTTP 200 `{"sentTo": "cliente@ejemplo.com"}` and an email with PDF+XML attached was sent to that address

#### Scenario: Override recipient
- **WHEN** the body is `{ "email": "otra@direccion.com" }`
- **THEN** the email is sent to `otra@direccion.com` regardless of `customer.email`

#### Scenario: No email available
- **WHEN** `customer.email` is `null` and the body omits `email`
- **THEN** the system returns HTTP 400 `{"error": "Customer has no email and no override provided"}` and no send is attempted

#### Scenario: Malformed override email
- **WHEN** the body is `{ "email": "not-an-email" }`
- **THEN** the system returns HTTP 400 with a Zod validation error, no send is attempted

#### Scenario: Invoice not yet stamped
- **WHEN** the invoice's `facturamaCfdiId` is `null`
- **THEN** the system returns HTTP 400 `{"error": "Invoice has not been stamped"}`

#### Scenario: SMTP failure propagates to caller
- **WHEN** the SMTP server is unreachable or rejects authentication
- **THEN** the system returns HTTP 502 `{"error": "Failed to send invoice email"}`

#### Scenario: Forbidden without billing:read
- **WHEN** a caller without `billing:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "billing:read"}`

#### Scenario: Out-of-branch caller is forbidden
- **WHEN** a caller without `branches:access_all` requests an invoice belonging to a sale in a different branch
- **THEN** the system returns HTTP 403

---

### Requirement: Manage CSD (Certificado de Sello Digital)
The system SHALL expose `POST /api/v1/admin/billing/csd` to upload or replace a CSD for an emitter RFC via Facturama, and `GET /api/v1/admin/billing/csd` to read its status. Requires `billing:manage_csd` (admin only). POST body: `{ rfc: string, certificateBase64: string, privateKeyBase64: string, privateKeyPassword: string, legalName?: string (max 200), fiscalRegime?: string (regex ^\d{3}$, SAT c_RegimenFiscal key), zipCode?: string (regex ^\d{5}$) }`. The CSD cryptographic material (`certificateBase64`, `privateKeyBase64`, `privateKeyPassword`) is forwarded to Facturama and **never persisted in the local database**; secrets are redacted from logs. `rfc`/`legalName`/`fiscalRegime`/`zipCode` are NOT secrets and, on a successful CSD upload, ARE persisted to `EmitterFiscalSettings` (a singleton row) so `FacturamaRestGateway` (both `billing` and `waybills` modules) can resolve the CFDI `Emisor` node from the database instead of environment variables. Persistence happens ONLY after Facturama accepts the CSD (`gateway.uploadCsd` resolves) — if Facturama rejects it, neither the CSD nor the fiscal fields are persisted. Persistence is a partial upsert: omitted optional fields (`legalName`/`fiscalRegime`/`zipCode`) leave the previously stored values unchanged (same semantics as `PATCH /settings/ticket`), while a resend of `rfc` always updates it. Returns HTTP 200 on success.

`GET /api/v1/admin/billing/csd` SHALL return the merge of Facturama's live CSD status (expiration, validity) and the currently persisted `legalName`/`fiscalRegime`/`zipCode` (all `null` if never captured), so the CSD manager UI can pre-fill the form.

#### Scenario: Upload CSD persists fiscal data on success
- **WHEN** an admin posts a valid `.cer`/`.key` pair (base64) with the private key password, RFC, legal name, fiscal regime, and zip code
- **THEN** the system forwards the CSD material to Facturama, and — only after Facturama accepts it — persists `rfc`/`legalName`/`fiscalRegime`/`zipCode` to `EmitterFiscalSettings`, returning HTTP 200 with the CSD status

#### Scenario: Facturama rejects the CSD — nothing persisted
- **WHEN** Facturama rejects the uploaded CSD (invalid certificate/password)
- **THEN** the system returns the existing error response and does NOT write to `EmitterFiscalSettings`, leaving any previously persisted fiscal data unchanged

#### Scenario: Re-upload without fiscal fields preserves previous values
- **WHEN** an admin re-uploads the CSD (e.g., renewal) sending only `rfc`/`certificateBase64`/`privateKeyBase64`/`privateKeyPassword`, omitting `legalName`/`fiscalRegime`/`zipCode`
- **THEN** the system updates the CSD and `rfc`, but leaves the previously persisted `legalName`/`fiscalRegime`/`zipCode` unchanged

#### Scenario: Invalid fiscal regime or zip code format rejected
- **WHEN** the request body includes `fiscalRegime` or `zipCode` not matching their required format
- **THEN** the system returns HTTP 400 before calling Facturama or touching the database

#### Scenario: Get CSD status includes persisted fiscal data
- **WHEN** an admin calls `GET /api/v1/admin/billing/csd`
- **THEN** the system returns HTTP 200 with the emitter's CSD status (e.g., expiration, RFC) merged with the currently persisted `legalName`/`fiscalRegime`/`zipCode` (`null` for any field never captured)

#### Scenario: Non-admin forbidden
- **WHEN** a user without `billing:manage_csd` calls either endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:manage_csd"}`

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

### Requirement: Persist invoice with fiscal snapshot
The system SHALL persist `invoices` and `invoice_items` such that each invoice retains a snapshot of receiver fiscal data (`receiverRfc`, `receiverName`, `receiverCfdiUse`, `receiverFiscalRegime`, `receiverTaxZipCode`), monetary totals (`subtotal`, `taxTotal`, `total` as `Decimal(14,4)`), and per-line snapshots (`productCodeSnapshot`, `productNameSnapshot`, `satProductCode`, `satUnitCode`, `unit`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `taxObject`, line totals). `saleId` is nullable with `ON DELETE SET NULL`. Snapshots SHALL survive subsequent changes or deletion of the source sale, customer or products.

#### Scenario: Source sale deleted
- **WHEN** a sale linked to an invoice is deleted
- **THEN** the invoice persists with `saleId=null` and its snapshot intact

#### Scenario: Product renamed after invoicing
- **WHEN** a product's name changes after the invoice is stamped
- **THEN** the invoice's `productNameSnapshot` retains the original name

### Requirement: RBAC permissions for billing
The system SHALL register permissions `billing:read`, `billing:write`, `billing:cancel`, `billing:manage_csd` in the RBAC seed. Role assignments: `admin` → all four; `operator` → `billing:read`, `billing:write`, `billing:cancel`; `viewer` → `billing:read` only.

#### Scenario: Operator can stamp but not manage CSD
- **WHEN** an `operator` calls `POST /api/v1/admin/invoices`
- **THEN** the request is permitted; but `POST /api/v1/admin/billing/csd` returns HTTP 403

#### Scenario: Viewer read-only
- **WHEN** a `viewer` calls `POST /api/v1/admin/invoices`
- **THEN** the system returns HTTP 403

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

