# Spec: billing-api

## Purpose

Define the Billing API: issuance, cancellation, download and query of CFDI 4.0 electronic invoices via the Facturama PAC, plus CSD (Certificado de Sello Digital) management. Covers stamping from an existing completed sale or as a standalone invoice, with per-line fiscal snapshots that survive later changes to the source sale, customer or product catalog. No flow touches inventory.
## Requirements
### Requirement: Stamp invoice (CFDI Ingreso)
The system SHALL expose `POST /api/v1/admin/invoices` that issues (timbra) a CFDI 4.0 of type Ingreso (`I`) via Facturama and persists an `Invoice` only on success. Requires `billing:write`. The request body MUST be one of two mutually exclusive shapes:
- **Sale-linked**: `{ saleId: string (uuid), customerId?: string (uuid) | null, paymentForm?: string, paymentMethod?: string, cfdiUse?: string }` — the system loads the sale (must be `status='completed'`), derives `branchId`, items and totals from the sale. The receiver (customer) SHALL be resolved as follows: if `customerId` is provided, it SHALL be looked up independently of the sale's own `customerId` and used as the CFDI receiver (an override); if `customerId` is omitted (or `null`), the receiver SHALL be the sale's linked customer (`sale.customerId`), unchanged from before this capability. In both cases the `Sale` record (including its own `customerId`, `branchId`, and items) SHALL NEVER be modified by this endpoint — the override only changes who the resulting `Invoice` is issued to, never the underlying sale/ticket. Since totals are the sale's already-persisted snapshot (computed by `SaleTotalsCalculator`), they already reflect the tax-inclusive extraction formula — no re-derivation happens here.
- **Standalone**: `{ branchId?: string, customer: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, items: InvoiceItemInput[], paymentForm?, paymentMethod? }` — the system computes totals via `InvoiceTotalsCalculator`, using `Decimal(14,4)` banker's rounding and the same tax-inclusive-price extraction formula as `SaleTotalsCalculator`/`QuoteTotalsCalculator`/`ReturnTotalsCalculator`/`PurchaseTotalsCalculator` (`unitPrice` is the final price including tax; `lineSubtotal = lineGross / (1 + ivaRate + iepsRate)`). Standalone invoices have `saleId=null`.

`InvoiceItemInput`: `{ productId?: string|null, productCode: string, description: string, satProductCode?: string, satUnitCode?: string, unit?: string, quantity: number, unitPrice: number, discountPct?: number, ivaRate?: number, iepsRate?: number }`. Defaults: `paymentForm='01'`, `paymentMethod='PUE'`, `cfdiUse` from the resolved customer. **No inventory movement occurs in any case.** Returns HTTP 201 with `InvoiceDto`.

#### Scenario: Stamp from completed sale
- **WHEN** authenticated user with `billing:write` posts `{ "saleId": "<uuid>" }` for a `completed` sale whose customer has complete fiscal data
- **THEN** the system calls Facturama, persists an `Invoice` with `status='stamped'`, `uuid` (folio fiscal), `facturamaCfdiId`, `saleId` set, `customerId` equal to the sale's own customer, and returns HTTP 201 with `InvoiceDto`

#### Scenario: Stamp from completed sale with a different receiver (customer override)
- **WHEN** authenticated user with `billing:write` posts `{ "saleId": "<uuid>", "customerId": "<other-uuid>" }` where the sale's own customer differs from `<other-uuid>`, and the overriding customer has complete fiscal data
- **THEN** the system stamps the CFDI to the overriding customer's fiscal data, persists `Invoice.customerId = "<other-uuid>"` while `Invoice.saleId` remains the original sale's id, and the underlying `Sale` row's `customerId` remains unchanged

#### Scenario: Customer override not found
- **WHEN** the body includes `customerId` referencing a customer that does not exist
- **THEN** the system returns HTTP 400 `{"error":"ReceiverFiscalDataIncomplete"}` (the override resolves to no fiscal data, same as a customer missing required fields) and does NOT call Facturama nor modify the sale

#### Scenario: Sale without its own customer requires an override
- **WHEN** the referenced sale has `customerId=null` and the body omits `customerId`
- **THEN** the system returns HTTP 400 `{"error":"ReceiverFiscalDataIncomplete"}`, unchanged from before this capability — the caller must supply `customerId` to invoice a sale with no linked customer

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
- **WHEN** the resolved receiver (sale's own customer, or the `customerId` override when provided) is missing `rfc`, `cfdiUse`, `taxRegime` or `taxZipCode`
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

`GET /api/v1/admin/billing/csd` SHALL return the merge of Facturama's live CSD status (expiration, validity) and the currently persisted `legalName`/`fiscalRegime`/`zipCode`/`address` (all `null` if never captured), so the CSD manager UI can pre-fill the form. `address` (free text, no format restriction) follows the same partial-upsert semantics as the other optional fields: omitted on `POST` leaves the previously stored value unchanged.

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
- **THEN** the system returns HTTP 200 with the emitter's CSD status (e.g., expiration, RFC) merged with the currently persisted `legalName`/`fiscalRegime`/`zipCode`/`address` (`null` for any field never captured)

#### Scenario: Non-admin forbidden
- **WHEN** a user without `billing:manage_csd` calls either endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:manage_csd"}`

### Requirement: Read emitter fiscal settings (lightweight)
The system SHALL expose `GET /api/v1/admin/billing/emitter-fiscal-settings`. Requires `billing:write` (not `billing:manage_csd`) so that any role able to stamp an invoice (`admin`, `operator`) can resolve the issuer's fiscal identity for previewing an invoice before stamping, without requiring the CSD-management permission. The endpoint SHALL resolve the issuer using the cascade described in "Resolve issuer fiscal data (cascade)" and return `{ rfc: string | null, legalName: string | null, fiscalRegime: string | null, zipCode: string | null, address: string | null, email: string | null }` — a field is `null` when none of the real sources have it. The system SHALL NEVER substitute invented or hardcoded placeholder data for a missing field.

#### Scenario: Operator resolves emitter fiscal data for preview
- **WHEN** a user with `billing:write` (e.g. `operator`, who lacks `billing:manage_csd`) calls `GET /api/v1/admin/billing/emitter-fiscal-settings`
- **THEN** the system returns HTTP 200 with the 6 fields, resolved via the cascade (CSD status → `EmitterFiscalSettings` → `TicketSettings`, with `email` sourced only from `TicketSettings`)

#### Scenario: Nothing captured anywhere — all fields null
- **WHEN** there is no CSD loaded in the Facturama account, `EmitterFiscalSettings` has no row (or all fields `null`), and `TicketSettings`' business fields are also unset
- **THEN** the system returns HTTP 200 with `{ rfc: null, legalName: null, fiscalRegime: null, zipCode: null, address: null, email: null }` — never a fabricated value

#### Scenario: Forbidden without billing:write
- **WHEN** an authenticated user without `billing:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:write"}`

### Requirement: Resolve issuer fiscal data (cascade)
The system SHALL resolve the issuer's fiscal identity (`rfc`, `legalName`, `fiscalRegime`, `zipCode`, `address`, `email`) via a single shared, pure resolution function consumed by both "Read emitter fiscal settings (lightweight)" and "Persist invoice with fiscal snapshot", using this cascade, per field, drawing only from real data the admin has actually captured — **never a hardcoded/invented placeholder**:
1. **CSD status** — `FacturamaGateway.getCsdStatus()`. If it succeeds and returns a value, it SHALL be used for `rfc` and `legalName` (`issuer` field in the gateway's response) ONLY — `getCsdStatus()` does not expose `fiscalRegime`, `zipCode`, `address`, or `email`, so those fields always fall through to the next tier regardless of whether tier 1 succeeded.
2. **`EmitterFiscalSettings`** (local, `/billing/csd`) — used for any field tier 1 did not resolve. This is where `fiscalRegime`/`zipCode`/`address` normally come from, since the real Facturama CSD-status API doesn't expose them at all. `EmitterFiscalSettings` has no `email` field, so `email` has no tier here. The resolution function SHALL read this tier through a port (`EmitterFiscalSettingsStore`, an application-layer interface), never by importing the concrete infrastructure store directly — the same port is used for reading (this requirement) and for writing (CSD upload/status use cases).
3. **`TicketSettings`** (`Configuración > Ticket de venta` — `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress`/`businessEmail`) — used for `rfc`/`legalName`/`fiscalRegime`/`address` when tiers 1–2 leave them unresolved. `TicketSettings` has no zip-code field, so `zipCode` only has tiers 1–2. `email` SHALL be resolved exclusively from `TicketSettings.businessEmail` — it has no tier 1 or tier 2 source, so this is its only tier. `TicketSettings.businessTaxRegime` is a free-text field meant for the printed ticket, captured as a leading SAT code followed by its description (e.g. `"612 — Personas Físicas con Actividad Empresarial"` or, from legacy/seeded data, `"612 Personas Físicas con Actividad Empresarial"` — the separator between code and description is not consistent across capture paths) — it is NOT a raw SAT code by itself. When this tier resolves `fiscalRegime`, the system SHALL extract only the leading numeric code (3–4 digits at the start of the string, followed by whitespace or end-of-string), never the full descriptive string, so the resolved value fits the SAT-code-length constraint that downstream persistence (`Invoice.issuerFiscalRegime`) enforces. If no such leading numeric code can be recognized, the system SHALL resolve `fiscalRegime` to `null` for this tier — it SHALL NOT truncate the description or invent a value.
4. **`null`** — any field still unresolved after all applicable tiers stays `null`. The system SHALL NOT substitute a fixed/synthetic value.

A failure in tier 1 (network error, no CSD loaded, timeout) SHALL be caught and SHALL NOT propagate as an error to the caller — resolution silently continues to tier 2/3.

#### Scenario: CSD loaded — rfc and legalName come from the certificate
- **WHEN** `getCsdStatus()` succeeds and returns `rfc`/`issuer`
- **THEN** the resolved `rfc`/`legalName` SHALL equal those values, while `fiscalRegime`/`zipCode`/`address`/`email` SHALL still come from `EmitterFiscalSettings`/`TicketSettings` where applicable

#### Scenario: No CSD loaded — falls through to EmitterFiscalSettings
- **WHEN** `getCsdStatus()` fails or returns no usable `rfc`/`issuer`
- **THEN** `rfc`/`legalName` SHALL come from `EmitterFiscalSettings`, or from `TicketSettings` if that row is also empty for those fields

#### Scenario: EmitterFiscalSettings empty — falls through to TicketSettings
- **WHEN** `EmitterFiscalSettings` has no row (or the relevant field is `null`) and no CSD is loaded
- **THEN** `rfc`/`legalName`/`fiscalRegime`/`address` SHALL come from `TicketSettings`' `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress` respectively

#### Scenario: Email resolved from TicketSettings only
- **WHEN** `TicketSettings.businessEmail` is set to `"contacto@agrisas.mx"`
- **THEN** the resolved `email` SHALL equal `"contacto@agrisas.mx"`, regardless of what CSD status or `EmitterFiscalSettings` contain (they have no `email` field to consult)

#### Scenario: Nothing resolvable anywhere — field stays null, never invented
- **WHEN** none of CSD, `EmitterFiscalSettings`, and (where applicable) `TicketSettings` have a value for a given field — including `email` when `TicketSettings.businessEmail` is `null`
- **THEN** that field SHALL be `null` in the response — the system never substitutes a hardcoded or synthetic value

#### Scenario: TicketSettings fiscalRegime tier resolves only the SAT code, not the full label
- **WHEN** `EmitterFiscalSettings.fiscalRegime` is `null`, no CSD is loaded, and `TicketSettings.businessTaxRegime` is `"612 — Personas Físicas con Actividad Empresarial"` (em-dash separator) or `"612 Personas Físicas con Actividad Empresarial"` (plain-space separator, as seeded)
- **THEN** the resolved `fiscalRegime` SHALL be `"612"` in both cases — the leading numeric code only, never the full label string

#### Scenario: TicketSettings fiscalRegime without a recognizable leading code
- **WHEN** `businessTaxRegime` does not start with a 3-4 digit numeric code (e.g. it is only a description, with no code captured)
- **THEN** the resolved `fiscalRegime` SHALL be `null` rather than a truncated or oversized value

#### Scenario: Stamping succeeds when only TicketSettings has fiscal-regime data
- **WHEN** an invoice is stamped (`stampFromSale` or `stampStandalone`) with `EmitterFiscalSettings` empty and only `TicketSettings.businessTaxRegime` populated in the `"<código> — <descripción>"` format
- **THEN** the invoice SHALL be created successfully with `issuerFiscalRegime` set to the parsed code, without a database column-overflow error

#### Scenario: Lightweight preview endpoint and stamping resolve the same parsed code
- **WHEN** `GET /billing/emitter-fiscal-settings` (used to render the draft preview) and a real stamp both resolve `fiscalRegime` from the same `TicketSettings.businessTaxRegime` value
- **THEN** both SHALL return the same parsed SAT code — the draft preview and the final stamped invoice stay consistent

#### Scenario: Resolution logic is testable without the real infrastructure store
- **WHEN** the resolution function, `UploadCsdUseCase`, or `GetCsdStatusUseCase` are unit-tested
- **THEN** a test double implementing `EmitterFiscalSettingsStore` can be substituted for the real store — none of the three requires the concrete infrastructure module to be loaded

### Requirement: Resolve SAT catalog descriptions for invoice display
The system SHALL resolve human-readable descriptions for SAT-coded fields shown in the invoice detail (`toInvoiceDto`), the real invoice PDF, and the preview PDF, using the already-existing `SatTaxRegimeRepository`/`SatCfdiUseRepository` (module `sat-codes`, tables `sat_tax_regimes`/`sat_cfdi_uses`):
- Issuer's `fiscalRegime` and receiver's `fiscalRegime` — resolved against `SatTaxRegimeRepository`.
- Receiver's `cfdiUse` — resolved against `SatCfdiUseRepository`.
- `paymentForm` and `paymentMethod` — resolved against the shared, non-database catalog `SAT_PAYMENT_FORMS`/`SAT_PAYMENT_METHODS` (no SAT table exists for these in this project).

Resolution SHALL be an exact-code lookup (reusing each repository's existing `search(code, limit)` method with the exact code as the query — codes are fixed-length, so this is effectively an exact match). If a code has no matching catalog entry, the system SHALL fall back to displaying the raw code alone, without failing the request or the render.

#### Scenario: Known code resolved to description
- **WHEN** `fiscalRegime="601"` is displayed
- **THEN** the system SHALL show "601 - General de Ley Personas Morales" (or the current `sat_tax_regimes` description for that code), not just "601"

#### Scenario: Unknown code falls back to raw code
- **WHEN** a `fiscalRegime`/`cfdiUse` code has no match in the local catalog table
- **THEN** the system SHALL display the raw code alone, without an error

### Requirement: Facturama gateway abstraction with mock mode
The system SHALL define a `FacturamaGateway` port with operations `stamp`, `cancel`, `download`, `uploadCsd`, `getCsdStatus`. The REST implementation `FacturamaRestGateway` SHALL authenticate with HTTP Basic Auth built from `FACTURAMA_USER`/`FACTURAMA_PASSWORD`, target `FACTURAMA_BASE_URL` (sandbox default), accept an injectable `fetchImpl` for tests, and normalize Facturama HTTP errors to typed domain errors. When `FACTURAMA_MOCK=true` (default) the DI container SHALL use `FakeFacturamaGateway`, which returns deterministic fake `uuid`/`facturamaCfdiId` and, for `download`, a realistic-looking CFDI document rendered from the same data passed to `stamp()` (see below) instead of a network call. `FacturamaRestGateway` SHALL fail fast at construction only when `FACTURAMA_MOCK=false` and credentials are missing.

`FakeFacturamaGateway.stamp(input)` SHALL retain the received `input` (issuer/receiver/lines data) in an in-memory map keyed by the generated `cfdiId`, for the lifetime of the process. `FakeFacturamaGateway.download(format, cfdiId, snapshot?)` SHALL accept an optional third parameter — the already-stamped invoice's own persisted data (issuer/receiver/items/payment/totals, the same fields `Invoice`/`InvoiceItem` already store, including `issuer.email` and the invoice's `emittedAt` timestamp). When the caller provides it, `download` SHALL use it as the sole source for the rendered document — resolving SAT catalog descriptions and copying the issuer's `address`/`email` and the `emittedAt` timestamp from it, per "Resolve SAT catalog descriptions for invoice display" — and SHALL NOT fall back to its in-memory `stampedInputs` map or re-read `EmitterFiscalSettings`/`TicketSettings` live for that call. This guarantees the downloaded PDF always matches what the invoice detail screen already rendered from the same persisted row, even across a process restart (the in-memory map is lost on restart; the snapshot is not). `DownloadInvoiceFileUseCase` SHALL always build and pass this snapshot from the `Invoice` it already loaded — including `issuer.email` (from the invoice's `issuerEmail` snapshot column) and `emittedAt` (the invoice's `createdAt`, ISO-formatted) — it is the only caller of `gateway.download` in the system, so both direct PDF/XML download and email attachment go through this path. `FacturamaRestGateway` ignores the parameter (Facturama's own servers are the real gateway's source of truth).

Without a snapshot (e.g. a test exercising the gateway directly, or the `format="xml"` path which does not yet accept one), `FakeFacturamaGateway.download` SHALL render the retained `stamp()` input through `InvoiceDocumentPdf` (for `format="pdf"`) — producing a document with issuer, receiver, a concepts table, tax breakdown, and totals, prominently watermarked "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" as a translucent gray diagonal background watermark (not a solid-colored banner) — or an XML reflecting the same issuer/receiver/concepts data (for `format="xml"`). Since this path has no persisted `Invoice` to draw an `emittedAt` from, the rendered PDF SHALL omit the emission date/time row rather than fabricate one. If `cfdiId` is not found in the map (e.g. process restarted between `stamp` and `download`, and no snapshot given), the system SHALL fall back to a minimal but still realistically laid-out placeholder document, still carrying the same watermark, also without an emission date/time.

#### Scenario: Downloaded PDF matches the detail screen even after a process restart
- **WHEN** an invoice was stamped in a previous process (or the dev server restarted since), and its PDF is downloaded via `DownloadInvoiceFileUseCase`
- **THEN** the rendered PDF's receiver, line items, totals, and issuer data (including resolved SAT descriptions, address, email, and the emission date/time) SHALL exactly match what `GET` on the invoice already returns — never the generic placeholder/fallback data

#### Scenario: Gateway call without a snapshot keeps prior mock behavior
- **WHEN** `gateway.download(format, cfdiId)` is called without a third argument (e.g. a unit test against `FakeFacturamaGateway` directly)
- **THEN** the system behaves as before the snapshot addition — consulting its in-memory `stampedInputs` map, then the fixed mock placeholder if the ID isn't found, and renders no emission date/time in either case

#### Scenario: Mock PDF includes issuer email and emission date/time when available
- **WHEN** `DownloadInvoiceFileUseCase` builds a snapshot from a stamped `Invoice` whose `issuerEmail` is non-null, and calls `gateway.download("pdf", cfdiId, snapshot)`
- **THEN** the rendered PDF's header shows the correo next to the logo/branch name, and — in its own column alongside Folio/UUID — the invoice's emission date/time (`createdAt`)

`FakeFacturamaGateway` SHALL accept an optional `GetTicketSettingsUseCase` dependency via its constructor. When provided, `download("pdf", cfdiId)` SHALL resolve `logoUrl` from it and include the business logo in the rendered PDF's header, following the same positioning rule as the preview PDF endpoint (never overlapping the diagonal watermark). When the dependency is not provided (e.g. existing test call sites constructing `new FakeFacturamaGateway()` with no arguments), the behavior SHALL be unchanged from before this requirement's logo addition — no error, no logo rendered.

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
- **THEN** the document prominently displays "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" as a gray diagonal watermark, not a red banner

#### Scenario: Mock XML reflects issuer/receiver/concepts
- **WHEN** `download("xml", cfdiId)` is called for a `cfdiId` with retained input
- **THEN** the returned XML includes the receiver's RFC and at least one concept node derived from the stamped lines, not only the minimal `<cfdi:Comprobante Version="4.0" NoCertificado="FAKE"/>` stub

#### Scenario: Unknown cfdiId still returns a realistic-looking fallback
- **WHEN** `download(format, cfdiId)` is called for a `cfdiId` with no retained input
- **THEN** the system returns a placeholder document that still follows the full CFDI layout and diagonal watermark, not the prior minimal stub

#### Scenario: Real mode unaffected
- **WHEN** `FACTURAMA_MOCK=false`
- **THEN** `FacturamaRestGateway.download` behaves exactly as before this change, returning Facturama's actual file unmodified

#### Scenario: Mock PDF includes logo when the use case is injected
- **WHEN** `FakeFacturamaGateway` is constructed with a `GetTicketSettingsUseCase` and `download("pdf", cfdiId)` is called
- **THEN** the returned PDF's header includes the resolved business logo, without altering the "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" watermark

#### Scenario: Mock PDF without the optional dependency behaves as before
- **WHEN** `FakeFacturamaGateway` is constructed with no arguments (as in existing test call sites) and `download("pdf", cfdiId)` is called
- **THEN** the returned PDF renders exactly as before this requirement's logo addition, with no error thrown

#### Scenario: Mock watermark renders as a gray diagonal background, not a red banner
- **WHEN** `download("pdf", cfdiId)` returns a mock document
- **THEN** the "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" text renders as a translucent gray diagonal watermark spanning the page background, and no solid red (`PDF_COLORS.error`) banner appears at the top or bottom of the page

### Requirement: Persist invoice with fiscal snapshot
The system SHALL persist `invoices` and `invoice_items` such that each invoice retains a snapshot of receiver fiscal data (`receiverRfc`, `receiverName`, `receiverCfdiUse`, `receiverFiscalRegime`, `receiverTaxZipCode`), a snapshot of the issuer's fiscal identity at stamping time (`issuerRfc`, `issuerLegalName`, `issuerFiscalRegime`, `issuerZipCode`, `issuerAddress`, `issuerEmail`, all nullable at the schema level), monetary totals (`subtotal`, `taxTotal`, `total` as `Decimal(14,4)`), and per-line snapshots (`productCodeSnapshot`, `productNameSnapshot`, `satProductCode`, `satUnitCode`, `unit`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `taxObject`, line totals). `saleId` is nullable with `ON DELETE SET NULL`. Snapshots SHALL survive subsequent changes or deletion of the source sale, customer, products, or the issuer's own fiscal settings. The invoice's `createdAt` timestamp SHALL be treated as its emission date/time — set once at creation and never mutated afterward.

The issuer snapshot (`issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress`/`issuerEmail`) SHALL be resolved server-side, inside the stamping use case (both "stamp from sale" and "stamp standalone" flows), using the cascade described in "Resolve issuer fiscal data (cascade)" — NEVER from a client-supplied value in the stamp request body. Any `issuer*` column the cascade could not resolve from a real source (CSD, `EmitterFiscalSettings`, `TicketSettings`) SHALL be persisted as `null` — the system SHALL NOT invent a value to fill it. `null` therefore appears both on invoices stamped before this capability existed AND on invoices stamped after it when the admin genuinely has not captured that field anywhere.

#### Scenario: Source sale deleted
- **WHEN** a sale linked to an invoice is deleted
- **THEN** the invoice persists with `saleId=null` and its snapshot intact

#### Scenario: Product renamed after invoicing
- **WHEN** a product's name changes after the invoice is stamped
- **THEN** the invoice's `productNameSnapshot` retains the original name

#### Scenario: Issuer fiscal data snapshotted at stamping time
- **WHEN** an invoice is stamped (from sale or standalone)
- **THEN** the created invoice's `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress`/`issuerEmail` SHALL equal the values resolved by the cascade at that instant — each field is `null` if and only if the cascade itself resolved it to `null` (no real source had it), never a fabricated substitute

#### Scenario: Issuer fiscal data changes later, existing invoices unaffected
- **WHEN** `EmitterFiscalSettings`, `TicketSettings`, or the loaded CSD change (e.g. a new CSD upload with a different fiscal regime, or an admin edits `businessEmail`) after an invoice was already stamped
- **THEN** the previously stamped invoice's `issuer*` snapshot (including `issuerEmail`) SHALL remain unchanged, reflecting what the cascade resolved when it was stamped

#### Scenario: Pre-existing invoices have null issuer snapshot
- **WHEN** an invoice stamped before this capability existed is read
- **THEN** its `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress`/`issuerEmail` SHALL be `null` (no retroactive backfill), and reading/mapping it SHALL NOT fail

### Requirement: RBAC permissions for billing
The system SHALL register permissions `billing:read`, `billing:write`, `billing:cancel`, `billing:manage_csd` in the RBAC seed. Role assignments: `admin` → all four; `operator` → `billing:read`, `billing:write`, `billing:cancel`; `viewer` → `billing:read` only.

#### Scenario: Operator can stamp but not manage CSD
- **WHEN** an `operator` calls `POST /api/v1/admin/invoices`
- **THEN** the request is permitted; but `POST /api/v1/admin/billing/csd` returns HTTP 403

#### Scenario: Viewer read-only
- **WHEN** a `viewer` calls `POST /api/v1/admin/invoices`
- **THEN** the system returns HTTP 403

### Requirement: Invoice preview PDF endpoint
The system SHALL expose `POST /api/v1/admin/invoices/preview/pdf`. Requires `billing:write`. The request body SHALL be the client-resolved preview data (mirroring `InvoicePreviewData`): `{ issuer: { name, branchName? }, receiver: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, lines: Array<{ description, productCode, satProductCode?, quantity, unitPrice, discountPct, ivaRate, iepsRate, lineSubtotal, lineTotal }>, paymentForm, paymentMethod, subtotal, taxTotal, total, currency }`. `discountPct`, `ivaRate`, and `iepsRate` per line SHALL be non-nullable numbers at this endpoint's boundary — the client is responsible for normalizing any `null` value coming from the underlying sale (e.g. items without a discount, IEPS-exempt products) to `0` before sending the request. Zod SHALL validate the body's shape (types, required fields) but the system SHALL NOT re-derive totals from a `saleId`, re-validate business rules already enforced client-side (receiver fiscal completeness, price ≥ 0), or persist anything — it renders `InvoiceDocumentPdf` with the data as received and returns it watermarked "BORRADOR — no válido fiscalmente" and folio placeholder "PENDIENTE DE TIMBRAR". No Facturama call occurs. Returns HTTP 200 with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="factura-borrador.pdf"`. Any exception raised while rendering the PDF (e.g. `renderToBuffer` failure) SHALL be caught and returned as HTTP 500 with a JSON body (`{ "error": "PdfRenderError" }` or equivalent), never as an unhandled exception with no JSON body.

Because this endpoint renders a **borrador** (the invoice has not been stamped and has no real `createdAt` yet), the rendered PDF SHALL NOT include an emission date/time row — that is only meaningful for an already-stamped `Invoice` (see "Facturama gateway abstraction with mock mode").

Before rendering, the system SHALL resolve `logoUrl` server-side via `GetTicketSettingsUseCase` (never from the request body) and inject it into the issuer data passed to `InvoiceDocumentPdf`, the issuer's fiscal identity (`rfc`, `fiscalRegime`, `zipCode`, `address`, `email`) via the cascade described in "Resolve issuer fiscal data (cascade)", and the human-readable descriptions for `fiscalRegime` (issuer and receiver) and `receiver.cfdiUse` via "Resolve SAT catalog descriptions for invoice display" — NEVER from the request body for any of these. Any `rfc`/`fiscalRegime`/`zipCode`/`address`/`email` present under `issuer` in the request body SHALL be ignored. The rendered PDF's header SHALL include the business logo (the tenant's uploaded logo when set, falling back to the bundled default logo when not set), the fixed title "Factura" — NOT the issuer's name or "Agrisas" as a title —, the branch name and the issuer's correo when present (both next to the logo/title, NOT inside the "Emisor" section below), and — in a separate column — the Folio/UUID metadata (fecha de emisión omitted here since this is a borrador; see below). The "Emisor" section (below the header) then shows RFC, legal name, fiscal regime, zip code and address — no correo field there — followed by the "Receptor" section. The "BORRADOR — no válido fiscalmente" text SHALL render as a single diagonal watermark of translucent gray text (from the shared brand palette, `pdfTheme`'s `outlineVariant`) spanning the background of the page — NOT as a solid-colored banner — positioned so it never overlaps, shrinks, or repositions the logo or any other content, and so it never renders in the brand error/red color (`PDF_COLORS.error`), which is reserved for genuine error messaging elsewhere in the UI. The PDF's non-watermark colors (section titles, table header, alternating rows, totals band, borders, muted text) SHALL come from the shared brand palette (`pdfTheme`) instead of module-specific arbitrary hex values.

#### Scenario: Preview PDF generated from client-resolved data
- **WHEN** an authenticated user with `billing:write` posts a well-formed preview payload
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`, the PDF shows the exact receiver/lines/totals from the body, the "BORRADOR — no válido fiscalmente" diagonal watermark, and "PENDIENTE DE TIMBRAR" as the folio, with no emission date/time row

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

#### Scenario: Preview PDF includes the business logo
- **WHEN** the preview PDF endpoint is called and `TicketSettings.logoUrl` is set
- **THEN** the generated PDF's header includes that logo, and the watermark's text and diagonal background position are unchanged from before this requirement's logo/color additions

#### Scenario: Preview PDF ignores a client-supplied logo
- **WHEN** the request body includes any field attempting to specify a logo or branding image
- **THEN** the system ignores it — the logo always comes from server-side `TicketSettings`, never from client input

#### Scenario: Watermark renders as a gray diagonal background, not a red banner
- **WHEN** the preview PDF endpoint is called
- **THEN** the "BORRADOR — no válido fiscalmente" text renders as a translucent gray diagonal watermark spanning the page background, and no solid red (`PDF_COLORS.error`) banner appears at the top or bottom of the page

#### Scenario: Issuer fiscal data always server-resolved, never from body
- **WHEN** the request body's `issuer` object includes `rfc`, `fiscalRegime`, `zipCode`, `address`, or `email` with arbitrary client-supplied values
- **THEN** the rendered PDF's issuer section SHALL show the values resolved by the cascade, never the client-supplied values

#### Scenario: Preview PDF shows full issuer breakdown with header "Factura"
- **WHEN** the preview PDF is rendered
- **THEN** the header SHALL show the logo, the title "Factura" (not a company name), and the correo (when resolved); the "Emisor" section below SHALL show RFC, legal name, fiscal regime (code + description), zip code and address — no correo field there — populated from whichever of CSD/`EmitterFiscalSettings`/`TicketSettings` actually has each field; a field with no real source anywhere renders as "—" in "Emisor" (the header's correo simply omits the line instead), never a fabricated value

