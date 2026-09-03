## MODIFIED Requirements

### Requirement: Get quote detail
The system SHALL expose `GET /api/v1/admin/quotes/:id` that returns a single quote with its items. Requires `quotes:read`. Returns HTTP 404 if not found. Branch scoping applies (callers without `branches:access_all` can only fetch quotes whose `branchId === x-user-branch-id`).

`QuoteDetailDto` extends `QuoteDto` with `items: QuoteItemDto[]`. Each `QuoteItemDto` includes `id`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineIva`, `lineIeps`, `lineTax`, `lineTotal`.

`lineIva` and `lineIeps` are derived fields — `QuoteItem` only persists `lineSubtotal`, `lineTax`, and `lineTotal`. The mapper SHALL compute `lineIva = roundHalfToEven(lineSubtotal * (ivaRate ?? 0), 4)` and `lineIeps = roundHalfToEven(lineSubtotal * (iepsRate ?? 0), 4)`, using the same banker's-rounding function (`roundHalfToEven`, half-to-even at 4 decimals) that `QuoteTotalsCalculator` uses when the line was first computed — never `Math.round` or any other rounding mode — so that `lineIva + lineIeps` always equals the persisted `lineTax` for that line.

The detail SHALL include `isExpired: boolean` (true if `status='authorized' AND expires_at < NOW()`) as a computed convenience flag for the UI.

The endpoint SHALL accept an optional query parameter `format` with allowed values `json` (default) and `pdf`. Any other value SHALL return HTTP 400. When `format=json` (or omitted), the response behaves exactly as described above (`QuoteDetailDto` as JSON). When `format=pdf`:
- The system SHALL render a PDF document (`QuotePdf`, via `@react-pdf/renderer`) built from the same `QuoteDetailDto` that `format=json` would return, plus issuer data (`businessName`, `businessRfc`, `businessAddress`, `businessPhone`, `logoUrl`) resolved server-side from `TicketSettings` (`GetTicketSettingsUseCase` → `toPdfIssuer`) — never from client input.
- The PDF header SHALL render the business logo: the tenant's uploaded logo (`TicketSettings.logoUrl`) when set, falling back to the bundled default logo (`public/logo.png`) when not set, resolved via the shared `resolvePdfLogoSource`/`PdfLogo` infrastructure (never a browser-relative path).
- The PDF's colors (table headers, alternating rows, totals band, borders, muted text) SHALL come from the shared brand palette (`pdfTheme`) instead of module-specific arbitrary hex values.
- The response SHALL have `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="cotizacion-<folioCode>-<folioNumber>.pdf"`.
- All existing checks (UUID validation, `quotes:read`, branch scoping, 404 on not found) SHALL apply identically before the `format` branch, so `format=pdf` cannot be used to bypass authorization or existence checks.
- The `logoUrl` used SHALL be resolved with the same branch-scoping context already used for `businessName`/`businessRfc` — a caller SHALL never receive another branch's/tenant's logo.

#### Scenario: Authorized fetch
- **WHEN** a caller with `quotes:read` and access to the quote's branch fetches a valid `:id`
- **THEN** the system returns HTTP 200 with the `QuoteDetailDto`

#### Scenario: Out-of-branch fetch
- **WHEN** a caller without `branches:access_all` fetches a quote whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403 (after resolving existence: if the quote does not exist, returns HTTP 404 — existence is NOT used as an oracle by 403)

#### Scenario: Quote not found
- **WHEN** the `:id` does not match any quote
- **THEN** the system returns HTTP 404 `{"error": "Quote not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400

#### Scenario: isExpired flag on logically expired quote
- **WHEN** the quote has `status='authorized'` and `expires_at='2025-01-01T00:00:00Z'` (in the past)
- **THEN** the response includes `isExpired: true`

#### Scenario: PDF download of an existing quote
- **WHEN** a caller with `quotes:read` and access to the quote's branch fetches `GET /quotes/:id?format=pdf` for a valid `:id`
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`, a non-empty PDF buffer body, and `Content-Disposition: attachment` naming the file `cotizacion-<folioCode>-<folioNumber>.pdf`

#### Scenario: PDF download of a quote without an assigned customer
- **WHEN** `format=pdf` is requested for a quote whose `customerId` is `null`
- **THEN** the generated PDF renders "Cliente general" in the customer block instead of leaving it blank or failing

#### Scenario: PDF download respects branch scoping
- **WHEN** a caller without `branches:access_all` requests `format=pdf` for a quote whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403, identically to the `format=json` case, without rendering any PDF

#### Scenario: PDF download of a non-existent quote
- **WHEN** `format=pdf` is requested for an `:id` that does not match any quote
- **THEN** the system returns HTTP 404 `{"error": "Quote not found"}`, identically to the `format=json` case

#### Scenario: Invalid format value
- **WHEN** the `format` query parameter is present with a value other than `json` or `pdf` (e.g. `format=xyz`)
- **THEN** the system returns HTTP 400

#### Scenario: PDF shows tenant logo when configured
- **WHEN** `format=pdf` is requested and the resolved `TicketSettings.logoUrl` is a valid `https://` URL
- **THEN** the generated PDF header renders that URL as the business logo

#### Scenario: PDF falls back to default logo when tenant has none configured
- **WHEN** `format=pdf` is requested and the resolved `TicketSettings.logoUrl` is `null`
- **THEN** the generated PDF header renders the bundled default logo (`public/logo.png`) instead of leaving the logo area blank or failing to render

#### Scenario: PDF uses brand color palette
- **WHEN** `format=pdf` is requested
- **THEN** the table header, alternating row, and totals band backgrounds in the generated PDF match the shared `pdfTheme` brand colors, not the previous arbitrary grays

#### Scenario: lineIva and lineIeps use the same rounding as lineTax
- **WHEN** a quote item has `lineSubtotal = 100.0002` and `iepsRate = 0.25` (a value where half-up and half-to-even rounding disagree at the 4th decimal)
- **THEN** the returned `lineIeps` SHALL equal `roundHalfToEven(100.0002 * 0.25, 4) = 25.0000`, and `lineIva + lineIeps` SHALL equal the persisted `lineTax` for that item — never the half-up result `25.0001`
