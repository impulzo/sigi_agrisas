## MODIFIED Requirements

### Requirement: Resolve issuer fiscal data (cascade)
The system SHALL resolve the issuer's fiscal identity (`rfc`, `legalName`, `fiscalRegime`, `zipCode`, `address`) via a single shared, pure resolution function consumed by both "Read emitter fiscal settings (lightweight)" and "Persist invoice with fiscal snapshot", using this cascade, per field, drawing only from real data the admin has actually captured — **never a hardcoded/invented placeholder**:
1. **CSD status** — `FacturamaGateway.getCsdStatus()`. If it succeeds and returns a value, it SHALL be used for `rfc` and `legalName` (`issuer` field in the gateway's response) ONLY — `getCsdStatus()` does not expose `fiscalRegime`, `zipCode`, or `address`, so those 3 fields always fall through to tier 2 regardless of whether tier 1 succeeded.
2. **`EmitterFiscalSettings`** (local, `/billing/csd`) — used for any field tier 1 did not resolve. This is where `fiscalRegime`/`zipCode`/`address` normally come from, since the real Facturama CSD-status API doesn't expose them at all.
3. **`TicketSettings`** (`Configuración > Ticket de venta` — `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress`/`businessZipCode`) — used for `rfc`/`legalName`/`fiscalRegime`/`address`/`zipCode` when tiers 1–2 leave them unresolved. `businessTaxRegime` is free text captured as a leading SAT code followed by its description, with an inconsistent separator across capture paths — the system extracts only the leading numeric code, never the full descriptive string. `businessZipCode` is a plain 5-digit code, used as-is.
4. **`null`** — any field still unresolved after all applicable tiers stays `null`. The system SHALL NOT substitute a fixed/synthetic value.

A failure in tier 1 (network error, no CSD loaded, timeout) SHALL be caught and SHALL NOT propagate as an error to the caller — resolution silently continues to tier 2/3.

#### Scenario: CSD loaded — rfc and legalName come from the certificate
- **WHEN** `getCsdStatus()` succeeds and returns `rfc`/`issuer`
- **THEN** the resolved `rfc`/`legalName` SHALL equal those values, while `fiscalRegime`/`zipCode`/`address` SHALL still come from `EmitterFiscalSettings` (or `TicketSettings` where applicable)

#### Scenario: No CSD loaded — falls through to EmitterFiscalSettings
- **WHEN** `getCsdStatus()` fails or returns no usable `rfc`/`issuer`
- **THEN** `rfc`/`legalName` SHALL come from `EmitterFiscalSettings`, or from `TicketSettings` if that row is also empty for those fields

#### Scenario: EmitterFiscalSettings empty — falls through to TicketSettings for all 5 fields
- **WHEN** `EmitterFiscalSettings` has no row (or the relevant field is `null`) and no CSD is loaded, and `TicketSettings.businessZipCode` is populated alongside `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress`
- **THEN** `rfc`/`legalName`/`fiscalRegime`/`address`/`zipCode` SHALL all come from their respective `TicketSettings` fields — the cascade "CSD first, ticket de venta as fallback" now applies uniformly to all 5 issuer fields, not just 4

#### Scenario: TicketSettings has no zip code captured either
- **WHEN** `EmitterFiscalSettings.zipCode` and `TicketSettings.businessZipCode` are both `null` (or the latter was never added by the admin) and no CSD is loaded
- **THEN** the resolved `zipCode` SHALL be `null` — same "never invent" behavior already applied to the other 4 fields, no regression

#### Scenario: Nothing resolvable anywhere — field stays null, never invented
- **WHEN** none of CSD, `EmitterFiscalSettings`, and (where applicable) `TicketSettings` have a value for a given field
- **THEN** that field SHALL be `null` in the response — the system never substitutes a hardcoded or synthetic value

### Requirement: Resolve SAT catalog descriptions for invoice display
The system SHALL resolve human-readable descriptions for SAT-coded fields shown in the invoice detail (`toInvoiceDto`), the real invoice PDF, and the preview PDF, using the already-existing repositories (module `sat-codes`, tables `sat_tax_regimes`/`sat_cfdi_uses`/`sat_product_service_codes`):
- Issuer's `fiscalRegime` and receiver's `fiscalRegime` — resolved against `SatTaxRegimeRepository`.
- Receiver's `cfdiUse` — resolved against `SatCfdiUseRepository`.
- Each line's `satProductCode` — resolved against `SatCodeRepository` (product/service code catalog), the same repository already backing `GET /api/v1/admin/sat-codes`. Resolution SHALL happen once per unique code present across the invoice's lines (not once per line) to avoid redundant lookups when multiple lines share the same code.
- `paymentForm` and `paymentMethod` — resolved against the shared, non-database catalog `SAT_PAYMENT_FORMS`/`SAT_PAYMENT_METHODS` (no SAT table exists for these in this project).

Resolution SHALL be an exact-code lookup (reusing each repository's existing `search(code, limit)` method with the exact code as the query — codes are fixed-length, so this is effectively an exact match). If a code has no matching catalog entry, the system SHALL fall back to displaying the raw code alone, without failing the request or the render. A line whose `satProductCode` is `null` (legacy or standalone-invoice data captured without it) SHALL simply have no label to resolve — it SHALL NOT be treated as an error.

#### Scenario: Known code resolved to description
- **WHEN** `fiscalRegime="601"` is displayed
- **THEN** the system SHALL show "601 - General de Ley Personas Morales" (or the current `sat_tax_regimes` description for that code), not just "601"

#### Scenario: Unknown code falls back to raw code
- **WHEN** a `fiscalRegime`/`cfdiUse`/`satProductCode` code has no match in the local catalog table
- **THEN** the system SHALL display the raw code alone, without an error

#### Scenario: Line item's SAT product/service code resolved to description
- **WHEN** an invoice line has `satProductCode="21102300"`
- **THEN** the system SHALL show `"21102300 - <description>"` (the current `sat_product_service_codes` description for that code) wherever that line is rendered — invoice detail, real PDF, and preview PDF — not just the raw code

#### Scenario: Line with no SAT product code
- **WHEN** an invoice line has `satProductCode=null`
- **THEN** that line renders without a SAT code label, and the render does not fail

### Requirement: Get invoice detail
The system SHALL expose `GET /api/v1/admin/invoices/:id`. Requires `billing:read`. Returns HTTP 404 if not found. Enforces branch scope (403 if out of scope without `branches:access_all`). Response `InvoiceDto` includes header fields and `items: InvoiceItemDto[]`. The response SHALL additionally include `issuerBranchName` (the name of the branch identified by the invoice's `branchId`, resolved via `BillingLookupService.findBranch` at read time — never persisted on `Invoice`) and, per item, `satProductCodeLabel` (resolved per "Resolve SAT catalog descriptions for invoice display", `null` when the line has no `satProductCode` or no catalog match beyond the raw code).

#### Scenario: Get existing invoice
- **WHEN** `:id` matches an invoice in the caller's scope
- **THEN** the system returns HTTP 200 with `InvoiceDto` including items, `issuerBranchName`, and each item's `satProductCodeLabel`

#### Scenario: Not found
- **WHEN** `:id` matches no invoice
- **THEN** the system returns HTTP 404 `{"error":"InvoiceNotFound"}`

#### Scenario: Out of branch scope
- **WHEN** the invoice belongs to another branch and the caller lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Branch deleted after invoicing
- **WHEN** the invoice's `branchId` no longer resolves to an existing branch (deleted after stamping — hypothetical, branches are not currently deletable, but the lookup SHALL be defensive)
- **THEN** `issuerBranchName` SHALL be `null` rather than the endpoint failing

### Requirement: Facturama gateway abstraction with mock mode
The system SHALL define a `FacturamaGateway` port with operations `stamp`, `cancel`, `download`, `uploadCsd`, `getCsdStatus`. The REST implementation `FacturamaRestGateway` SHALL authenticate with HTTP Basic Auth built from `FACTURAMA_USER`/`FACTURAMA_PASSWORD`, target `FACTURAMA_BASE_URL` (sandbox default), accept an injectable `fetchImpl` for tests, and normalize Facturama HTTP errors to typed domain errors. When `FACTURAMA_MOCK=true` (default) the DI container SHALL use `FakeFacturamaGateway`, which returns deterministic fake `uuid`/`facturamaCfdiId` and, for `download`, a realistic-looking CFDI document rendered from the same data passed to `stamp()` (see below) instead of a network call. `FacturamaRestGateway` SHALL fail fast at construction only when `FACTURAMA_MOCK=false` and credentials are missing.

`FakeFacturamaGateway.stamp(input)` SHALL retain the received `input` (issuer/receiver/lines data) in an in-memory map keyed by the generated `cfdiId`, for the lifetime of the process. `FakeFacturamaGateway.download(format, cfdiId, snapshot?)` SHALL accept an optional third parameter — the already-stamped invoice's own persisted data (issuer/receiver/items/payment/totals, the same fields `Invoice`/`InvoiceItem` already store), which now includes `issuer.branchName` (resolved by the caller, `DownloadInvoiceFileUseCase`, via `BillingLookupService.findBranch`). When the caller provides it, `download` SHALL use it as the sole source for the rendered document — resolving SAT catalog descriptions (including each line's `satProductCode`, per "Resolve SAT catalog descriptions for invoice display") and copying the issuer's `address`/`branchName` from it — and SHALL NOT fall back to its in-memory `stampedInputs` map or re-read `EmitterFiscalSettings`/`TicketSettings` live for that call. This guarantees the downloaded PDF always matches what the invoice detail screen already rendered from the same persisted row, even across a process restart (the in-memory map is lost on restart; the snapshot is not). `DownloadInvoiceFileUseCase` SHALL always build and pass this snapshot from the `Invoice` it already loaded — it is the only caller of `gateway.download` in the system, so both direct PDF/XML download and email attachment go through this path. `FacturamaRestGateway` ignores the parameter (Facturama's own servers are the real gateway's source of truth).

The rendered document's line-items table (for `format="pdf"`) SHALL include, per line, its resolved SAT product/service code description, its IEPS rate/amount, and its subtotal (before taxes) — the same per-line granularity already shown in the invoice detail web page's items table, closing the prior gap where the PDF only had per-line IVA and a conditional aggregate IEPS.

Without a snapshot (e.g. a test exercising the gateway directly, or the `format="xml"` path which does not yet accept one), `FakeFacturamaGateway.download` SHALL render the retained `stamp()` input through `InvoiceDocumentPdf` (for `format="pdf"`) — producing a document with issuer, receiver, a concepts table, tax breakdown, and totals, prominently watermarked "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL" as a translucent gray diagonal background watermark (not a solid-colored banner) — or an XML reflecting the same issuer/receiver/concepts data (for `format="xml"`). If `cfdiId` is not found in the map (e.g. process restarted between `stamp` and `download`, and no snapshot given), the system SHALL fall back to a minimal but still realistically laid-out placeholder document, still carrying the same watermark.

#### Scenario: Downloaded PDF matches the detail screen even after a process restart
- **WHEN** an invoice was stamped in a previous process (or the dev server restarted since), and its PDF is downloaded via `DownloadInvoiceFileUseCase`
- **THEN** the rendered PDF's receiver, line items, totals, and issuer data (including resolved SAT descriptions, address, and branch name) SHALL exactly match what `GET` on the invoice already returns — never the generic placeholder/fallback data

#### Scenario: Downloaded PDF's line table matches the web's per-line granularity
- **WHEN** a stamped invoice with lines that have `satProductCode` and `iepsRate > 0` is downloaded as PDF
- **THEN** each line in the rendered table SHALL show its SAT product/service code description, its IEPS amount, and its subtotal — not just IVA and total

#### Scenario: Downloaded PDF includes the issuing branch's name
- **WHEN** a stamped invoice's `branchId` resolves to an existing branch
- **THEN** the rendered PDF's issuer section SHALL show that branch's name as a subtitle, same as the draft preview already does

#### Scenario: Gateway call without a snapshot keeps prior mock behavior
- **WHEN** `gateway.download(format, cfdiId)` is called without a third argument (e.g. a unit test against `FakeFacturamaGateway` directly)
- **THEN** the system behaves as before the snapshot addition — consulting its in-memory `stampedInputs` map, then the fixed mock placeholder if the ID isn't found

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

### Requirement: Invoice preview PDF endpoint
The system SHALL expose `POST /api/v1/admin/invoices/preview/pdf`. Requires `billing:write`. The request body SHALL be the client-resolved preview data (mirroring `InvoicePreviewData`): `{ issuer: { name, branchName? }, receiver: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, lines: Array<{ description, productCode, satProductCode?, quantity, unitPrice, discountPct, ivaRate, iepsRate, lineSubtotal, lineTotal }>, paymentForm, paymentMethod, subtotal, taxTotal, total, currency }`. `discountPct`, `ivaRate`, and `iepsRate` per line SHALL be non-nullable numbers at this endpoint's boundary — the client is responsible for normalizing any `null` value coming from the underlying sale (e.g. items without a discount, IEPS-exempt products) to `0` before sending the request. Zod SHALL validate the body's shape (types, required fields) but the system SHALL NOT re-derive totals from a `saleId`, re-validate business rules already enforced client-side (receiver fiscal completeness, price ≥ 0), or persist anything — it renders `InvoiceDocumentPdf` with the data as received and returns it watermarked "BORRADOR — no válido fiscalmente" and folio placeholder "PENDIENTE DE TIMBRAR". No Facturama call occurs. Returns HTTP 200 with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="factura-borrador.pdf"`. Any exception raised while rendering the PDF (e.g. `renderToBuffer` failure) SHALL be caught and returned as HTTP 500 with a JSON body (`{ "error": "PdfRenderError" }` or equivalent), never as an unhandled exception with no JSON body.

Before rendering, the system SHALL resolve `logoUrl` server-side via `GetTicketSettingsUseCase` (never from the request body) and inject it into the issuer data passed to `InvoiceDocumentPdf`, the issuer's fiscal identity (`rfc`, `fiscalRegime`, `zipCode`, `address`) via the cascade described in "Resolve issuer fiscal data (cascade)", and the human-readable descriptions for `fiscalRegime` (issuer and receiver), `receiver.cfdiUse`, and each line's `satProductCode` via "Resolve SAT catalog descriptions for invoice display" — NEVER from the request body for any of these. Any `rfc`/`fiscalRegime`/`zipCode`/`address` present under `issuer` in the request body SHALL be ignored. The rendered line-items table SHALL include, per line, the resolved SAT product/service code description, IEPS, and subtotal — the same columns "Facturama gateway abstraction with mock mode" now requires for the real invoice PDF, since both share the `InvoiceDocumentPdf` component. The rendered PDF's header SHALL include the business logo (the tenant's uploaded logo when set, falling back to the bundled default logo when not set) and the fixed title "Factura" — NOT the issuer's name or "Agrisas" as a title — followed by the "Emisor" section and then the "Receptor" section. The "BORRADOR — no válido fiscalmente" text SHALL render as a single diagonal watermark of translucent gray text (from the shared brand palette, `pdfTheme`'s `outlineVariant`) spanning the background of the page — NOT as a solid-colored banner — positioned so it never overlaps, shrinks, or repositions the logo or any other content, and so it never renders in the brand error/red color (`PDF_COLORS.error`), which is reserved for genuine error messaging elsewhere in the UI. The PDF's non-watermark colors (section titles, table header, alternating rows, totals band, borders, muted text) SHALL come from the shared brand palette (`pdfTheme`) instead of module-specific arbitrary hex values.

#### Scenario: Preview PDF generated from client-resolved data
- **WHEN** an authenticated user with `billing:write` posts a well-formed preview payload
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`, the PDF shows the exact receiver/lines/totals from the body, the "BORRADOR — no válido fiscalmente" diagonal watermark, and "PENDIENTE DE TIMBRAR" as the folio

#### Scenario: Preview PDF's line table shows SAT code description, IEPS, and subtotal per line
- **WHEN** the request body includes a line with `satProductCode` and `iepsRate > 0`
- **THEN** the rendered line SHALL show the resolved SAT code description, the line's IEPS, and its subtotal — matching what `GET /invoices/:id` already returns for the same data, per "Get invoice detail"

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
- **WHEN** the request body's `issuer` object includes `rfc`, `fiscalRegime`, `zipCode`, or `address` with arbitrary client-supplied values
- **THEN** the rendered PDF's issuer section SHALL show the values resolved by the cascade, never the client-supplied values

#### Scenario: Preview PDF shows full issuer breakdown with header "Factura"
- **WHEN** the preview PDF is rendered
- **THEN** the header SHALL show the logo and the title "Factura" (not a company name), followed by an "Emisor" section with RFC, legal name, fiscal regime (code + description), zip code, and address — populated from whichever of CSD/`EmitterFiscalSettings`/`TicketSettings` actually has each field; a field with no real source anywhere renders as "—", never a fabricated value
