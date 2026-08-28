## ADDED Requirements

### Requirement: Read emitter fiscal settings (lightweight)
The system SHALL expose `GET /api/v1/admin/billing/emitter-fiscal-settings`. Requires `billing:write` (not `billing:manage_csd`) so that any role able to stamp an invoice (`admin`, `operator`) can resolve the issuer's fiscal identity for previewing an invoice before stamping, without requiring the CSD-management permission. The endpoint SHALL resolve the issuer using the cascade described in "Resolve issuer fiscal data (cascade)" and return `{ rfc: string | null, legalName: string | null, fiscalRegime: string | null, zipCode: string | null, address: string | null }` — a field is `null` when none of the real sources have it. The system SHALL NEVER substitute invented or hardcoded placeholder data for a missing field.

#### Scenario: Operator resolves emitter fiscal data for preview
- **WHEN** a user with `billing:write` (e.g. `operator`, who lacks `billing:manage_csd`) calls `GET /api/v1/admin/billing/emitter-fiscal-settings`
- **THEN** the system returns HTTP 200 with the 5 fields, resolved via the cascade (CSD status → `EmitterFiscalSettings` → `TicketSettings`)

#### Scenario: Nothing captured anywhere — all fields null
- **WHEN** there is no CSD loaded in the Facturama account, `EmitterFiscalSettings` has no row (or all fields `null`), and `TicketSettings`' business fields are also unset
- **THEN** the system returns HTTP 200 with `{ rfc: null, legalName: null, fiscalRegime: null, zipCode: null, address: null }` — never a fabricated value

#### Scenario: Forbidden without billing:write
- **WHEN** an authenticated user without `billing:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:write"}`

### Requirement: Resolve issuer fiscal data (cascade)
The system SHALL resolve the issuer's fiscal identity (`rfc`, `legalName`, `fiscalRegime`, `zipCode`, `address`) via a single shared, pure resolution function consumed by both "Read emitter fiscal settings (lightweight)" and "Persist invoice with fiscal snapshot", using this cascade, per field, drawing only from real data the admin has actually captured — **never a hardcoded/invented placeholder**:
1. **CSD status** — `FacturamaGateway.getCsdStatus()`. If it succeeds and returns a value, it SHALL be used for `rfc` and `legalName` (`issuer` field in the gateway's response) ONLY — `getCsdStatus()` does not expose `fiscalRegime`, `zipCode`, or `address`, so those 3 fields always fall through to tier 2 regardless of whether tier 1 succeeded.
2. **`EmitterFiscalSettings`** (local, `/billing/csd`) — used for any field tier 1 did not resolve. This is where `fiscalRegime`/`zipCode`/`address` normally come from, since the real Facturama CSD-status API doesn't expose them at all.
3. **`TicketSettings`** (`Configuración > Ticket de venta` — `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress`) — used for `rfc`/`legalName`/`fiscalRegime`/`address` when tiers 1–2 leave them unresolved. `TicketSettings` has no zip-code field, so `zipCode` only has tiers 1–2.
4. **`null`** — any field still unresolved after all applicable tiers stays `null`. The system SHALL NOT substitute a fixed/synthetic value.

A failure in tier 1 (network error, no CSD loaded, timeout) SHALL be caught and SHALL NOT propagate as an error to the caller — resolution silently continues to tier 2/3.

#### Scenario: CSD loaded — rfc and legalName come from the certificate
- **WHEN** `getCsdStatus()` succeeds and returns `rfc`/`issuer`
- **THEN** the resolved `rfc`/`legalName` SHALL equal those values, while `fiscalRegime`/`zipCode`/`address` SHALL still come from `EmitterFiscalSettings` (or `TicketSettings` where applicable)

#### Scenario: No CSD loaded — falls through to EmitterFiscalSettings
- **WHEN** `getCsdStatus()` fails or returns no usable `rfc`/`issuer`
- **THEN** `rfc`/`legalName` SHALL come from `EmitterFiscalSettings`, or from `TicketSettings` if that row is also empty for those fields

#### Scenario: EmitterFiscalSettings empty — falls through to TicketSettings
- **WHEN** `EmitterFiscalSettings` has no row (or the relevant field is `null`) and no CSD is loaded
- **THEN** `rfc`/`legalName`/`fiscalRegime`/`address` SHALL come from `TicketSettings`' `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress` respectively

#### Scenario: Nothing resolvable anywhere — field stays null, never invented
- **WHEN** none of CSD, `EmitterFiscalSettings`, and (where applicable) `TicketSettings` have a value for a given field
- **THEN** that field SHALL be `null` in the response — the system never substitutes a hardcoded or synthetic value

### Requirement: Resolve SAT catalog descriptions for invoice display
The system SHALL resolve human-readable descriptions for SAT-coded fields shown in the invoice detail (`toInvoiceDto`), the real invoice PDF, and the preview PDF, using the already-existing `SatTaxRegimeRepository`/`SatCfdiUseRepository` (module `sat-codes`, tables `sat_tax_regimes`/`sat_cfdi_uses`):
- Issuer's `fiscalRegime` and receiver's `fiscalRegime` — resolved against `SatTaxRegimeRepository`.
- Receiver's `cfdiUse` — resolved against `SatCfdiUseRepository`.
- `paymentForm` and `paymentMethod` — resolved against the shared, non-database catalog `SAT_PAYMENT_FORMS`/`SAT_PAYMENT_METHODS` (no SAT table exists for these in this project).

Resolution SHALL be an exact-code lookup (reusing each repository's existing `search(code, limit)` method with the exact code as the query and `limit: 1` — codes are fixed-length, so this is effectively an exact match). If a code has no matching catalog entry, the system SHALL fall back to displaying the raw code alone, without failing the request or the render.

#### Scenario: Known code resolved to description
- **WHEN** `fiscalRegime="601"` is displayed
- **THEN** the system SHALL show "601 - General de Ley Personas Morales" (or the current `sat_tax_regimes` description for that code), not just "601"

#### Scenario: Unknown code falls back to raw code
- **WHEN** a `fiscalRegime`/`cfdiUse` code has no match in the local catalog table
- **THEN** the system SHALL display the raw code alone, without an error

## MODIFIED Requirements

### Requirement: Persist invoice with fiscal snapshot
The system SHALL persist `invoices` and `invoice_items` such that each invoice retains a snapshot of receiver fiscal data (`receiverRfc`, `receiverName`, `receiverCfdiUse`, `receiverFiscalRegime`, `receiverTaxZipCode`), a snapshot of the issuer's fiscal identity at stamping time (`issuerRfc`, `issuerLegalName`, `issuerFiscalRegime`, `issuerZipCode`, `issuerAddress`, all nullable at the schema level), monetary totals (`subtotal`, `taxTotal`, `total` as `Decimal(14,4)`), and per-line snapshots (`productCodeSnapshot`, `productNameSnapshot`, `satProductCode`, `satUnitCode`, `unit`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `taxObject`, line totals). `saleId` is nullable with `ON DELETE SET NULL`. Snapshots SHALL survive subsequent changes or deletion of the source sale, customer, products, or the issuer's own fiscal settings.

The issuer snapshot (`issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress`) SHALL be resolved server-side, inside the stamping use case (both "stamp from sale" and "stamp standalone" flows), using the cascade described in "Resolve issuer fiscal data (cascade)" — NEVER from a client-supplied value in the stamp request body. Any `issuer*` column the cascade could not resolve from a real source (CSD, `EmitterFiscalSettings`, `TicketSettings`) SHALL be persisted as `null` — the system SHALL NOT invent a value to fill it. `null` therefore appears both on invoices stamped before this capability existed AND on invoices stamped after it when the admin genuinely has not captured that field anywhere.

#### Scenario: Source sale deleted
- **WHEN** a sale linked to an invoice is deleted
- **THEN** the invoice persists with `saleId=null` and its snapshot intact

#### Scenario: Product renamed after invoicing
- **WHEN** a product's name changes after the invoice is stamped
- **THEN** the invoice's `productNameSnapshot` retains the original name

#### Scenario: Issuer fiscal data snapshotted at stamping time
- **WHEN** an invoice is stamped (from sale or standalone)
- **THEN** the created invoice's `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress` SHALL equal the values resolved by the cascade at that instant, and none of them SHALL be `null`

#### Scenario: Issuer fiscal data changes later, existing invoices unaffected
- **WHEN** `EmitterFiscalSettings` or the loaded CSD change (e.g. a new CSD upload with a different fiscal regime) after an invoice was already stamped
- **THEN** the previously stamped invoice's `issuer*` snapshot SHALL remain unchanged, reflecting what the cascade resolved when it was stamped

#### Scenario: Pre-existing invoices have null issuer snapshot
- **WHEN** an invoice stamped before this capability existed is read
- **THEN** its `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress` SHALL be `null` (no retroactive backfill), and reading/mapping it SHALL NOT fail

### Requirement: Invoice preview PDF endpoint
The system SHALL expose `POST /api/v1/admin/invoices/preview/pdf`. Requires `billing:write`. The request body SHALL be the client-resolved preview data (mirroring `InvoicePreviewData`): `{ issuer: { name, branchName? }, receiver: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, lines: Array<{ description, productCode, satProductCode?, quantity, unitPrice, discountPct, ivaRate, iepsRate, lineSubtotal, lineTotal }>, paymentForm, paymentMethod, subtotal, taxTotal, total, currency }`. `discountPct`, `ivaRate`, and `iepsRate` per line SHALL be non-nullable numbers at this endpoint's boundary — the client is responsible for normalizing any `null` value coming from the underlying sale (e.g. items without a discount, IEPS-exempt products) to `0` before sending the request. Zod SHALL validate the body's shape (types, required fields) but the system SHALL NOT re-derive totals from a `saleId`, re-validate business rules already enforced client-side (receiver fiscal completeness, price ≥ 0), or persist anything — it renders `InvoiceDocumentPdf` with the data as received and returns it watermarked "BORRADOR — no válido fiscalmente" and folio placeholder "PENDIENTE DE TIMBRAR". Returns HTTP 200 with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="factura-borrador.pdf"`. Any exception raised while rendering the PDF (e.g. `renderToBuffer` failure) SHALL be caught and returned as HTTP 500 with a JSON body (`{ "error": "PdfRenderError" }` or equivalent), never as an unhandled exception with no JSON body.

Before rendering, the system SHALL resolve `logoUrl` server-side via `GetTicketSettingsUseCase`, the issuer's fiscal identity (`rfc`, `fiscalRegime`, `zipCode`, `address`) via the cascade described in "Resolve issuer fiscal data (cascade)" (which MAY call `FacturamaGateway.getCsdStatus()` as its first tier), and the human-readable descriptions for `fiscalRegime` (issuer and receiver) and `receiver.cfdiUse` via the SAT catalog lookups described in "Resolve SAT catalog descriptions for invoice display" — NEVER from the request body for any of these. Any `rfc`/`fiscalRegime`/`zipCode`/`address` present under `issuer` in the request body SHALL be ignored. The rendered PDF's header SHALL show the business logo and the fixed title "Factura" — NOT the issuer's name or "Agrisas" as a title — followed by the "Emisor" section and then the "Receptor" section. The "BORRADOR — no válido fiscalmente" text SHALL render as a single diagonal watermark of translucent gray text (from the shared brand palette, `pdfTheme`'s `outlineVariant`) spanning the background of the page — NOT as a solid-colored banner. The PDF's non-watermark colors SHALL come from the shared brand palette (`pdfTheme`).

#### Scenario: Preview PDF generated from client-resolved data
- **WHEN** an authenticated user with `billing:write` posts a well-formed preview payload
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`, the PDF shows the exact receiver/lines/totals from the body, the "BORRADOR — no válido fiscalmente" diagonal watermark, and "PENDIENTE DE TIMBRAR" as the folio

#### Scenario: No persistence
- **WHEN** the preview PDF endpoint is called
- **THEN** no `Invoice` row is created or modified

#### Scenario: Malformed body rejected
- **WHEN** the body is missing `receiver` or `lines`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Forbidden without billing:write
- **WHEN** an authenticated user without `billing:write` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:write"}`

#### Scenario: Null discount/tax rate fields rejected as malformed
- **WHEN** the body contains a line with `discountPct`, `ivaRate`, or `iepsRate` equal to `null` instead of a number
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Issuer fiscal data always server-resolved, never from body
- **WHEN** the request body's `issuer` object includes `rfc`, `fiscalRegime`, `zipCode`, or `address` with arbitrary client-supplied values
- **THEN** the rendered PDF's issuer section SHALL show the values resolved by the cascade, never the client-supplied values

#### Scenario: Preview PDF shows full issuer breakdown with header "Factura"
- **WHEN** the preview PDF is rendered
- **THEN** the header SHALL show the logo and the title "Factura" (not a company name), followed by an "Emisor" section with RFC, legal name, fiscal regime (code + description), zip code, and address — populated from whichever of CSD/`EmitterFiscalSettings`/`TicketSettings` actually has each field; a field with no real source anywhere renders as "—", never a fabricated value

### Requirement: Manage CSD (Certificado de Sello Digital)
`POST /api/v1/admin/billing/csd` and `GET /api/v1/admin/billing/csd` SHALL accept and return an optional `address` field (free text, no format restriction), alongside the existing `rfc`/`legalName`/`fiscalRegime`/`zipCode`. `address` SHALL follow the same partial-upsert semantics already documented for the other optional fields: omitted on `POST` leaves the previously stored value unchanged; persistence SHALL still only happen after Facturama accepts the CSD.

#### Scenario: Address captured alongside the other fiscal fields
- **WHEN** an admin uploads a CSD including `address` in the body
- **THEN** the system persists it to `EmitterFiscalSettings.address` under the same conditions (only after Facturama accepts the CSD)

#### Scenario: Omitted address leaves the stored value unchanged
- **WHEN** a subsequent CSD upload omits `address`
- **THEN** the previously stored `address` SHALL remain unchanged
