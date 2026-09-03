## MODIFIED Requirements

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

---

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

---

### Requirement: Resolve issuer fiscal data (cascade)
The system SHALL resolve the issuer's fiscal identity (`rfc`, `legalName`, `fiscalRegime`, `zipCode`, `address`, `email`) via a single shared, pure resolution function consumed by both "Read emitter fiscal settings (lightweight)" and "Persist invoice with fiscal snapshot", using this cascade, per field, drawing only from real data the admin has actually captured — **never a hardcoded/invented placeholder**:
1. **CSD status** — `FacturamaGateway.getCsdStatus()`. If it succeeds and returns a value, it SHALL be used for `rfc` and `legalName` (`issuer` field in the gateway's response) ONLY — `getCsdStatus()` does not expose `fiscalRegime`, `zipCode`, `address`, or `email`, so those fields always fall through to the next tier regardless of whether tier 1 succeeded.
2. **`EmitterFiscalSettings`** (local, `/billing/csd`) — used for any field tier 1 did not resolve. This is where `fiscalRegime`/`zipCode`/`address` normally come from, since the real Facturama CSD-status API doesn't expose them at all. `EmitterFiscalSettings` has no `email` field, so `email` has no tier here.
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

---

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

---

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

---

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
