# sales-ticket-preview-ui

## MODIFIED Requirements

### Requirement: Ticket preview page
The system SHALL render `/sales/:id/ticket`, gated by the same `sales:read` permission (and branch scoping) that already protects `/sales/:id`. The page SHALL reuse the `SaleDetail` data already available to the sale detail flow (no additional data fetch beyond what `GET /sales/:id` already provides) and render: brand logo/header text (from `GET /settings/ticket`, falling back to the Agrisas default brand mark when `logoUrl` is `null`), folio label (labeled "Folio" — NOT "Orden"), date, seller name (labeled "Vendedor", over `cashierName` — NOT "Cajero"), a business info section (address, "Tel. <phone>", and tax regime from `GET /settings/ticket`, omitting `null` fields), a line-item table (product name, quantity × unit price, line total), a financial summary showing Subtotal, IVA, and IEPS (ALWAYS visible, even when `$0.00` — consistent with `pos-ui`'s `TaxBreakdownRows`/`CartTotals` behavior), Total (labeled "Total a pagar"), a customer section (RFC, name, address — ONLY when the sale has `customerId`), credit conditions ("Condiciones: Crédito a <N> días" — ONLY when `customerCreditDays` is non-null), payment method name, footer text (from `GET /settings/ticket`), a decorative barcode-style element rendering the folio label as text (no barcode-generation library), and the legend text (from `GET /settings/ticket.legendText`, omitted when `null`).

This page is display-only styling on top of existing data — it introduces no new backend endpoint for reading sale data.

#### Scenario: Ticket preview renders with brand design
- **WHEN** an authorized user with `sales:read` navigates to `/sales/:id/ticket` for an existing sale
- **THEN** the page renders the Agrisas-branded layout with "Folio", "Vendedor", date, items, and totals matching exactly what `/sales/:id` already shows

#### Scenario: Labels use Folio and Vendedor
- **WHEN** the preview page renders the transaction header
- **THEN** the labels read "Folio:" and "Vendedor:" — the labels "Orden:" and "Cajero:" do not appear anywhere on the page

#### Scenario: Total labeled as "Total a pagar"
- **WHEN** the preview page renders the financial summary
- **THEN** the total line is labeled "Total a pagar" (the column header "Total" in the items grid is unaffected)

#### Scenario: Customer section rendered when sale has a customer
- **WHEN** the sale has `customerId` (with `customerRfc`, `customerName`, `customerAddress` populated)
- **THEN** the preview shows a "Cliente" section with RFC, name, and address

#### Scenario: Customer and conditions sections omitted for walk-in sales
- **WHEN** the sale has `customerId: null`
- **THEN** the preview omits the customer section and the conditions line entirely (no empty rows)

#### Scenario: Business info and legend from settings
- **WHEN** `GET /settings/ticket` returns `businessAddress`, `businessPhone`, `businessTaxRegime`, and `legendText`
- **THEN** the preview shows the business section under the header and the legend near the footer; `null` fields are omitted

#### Scenario: IVA and IEPS always visible, even at $0
- **WHEN** the sale has no `IEPS`-taxed items (`iepsTotal = 0`)
- **THEN** the preview still shows an "IEPS: $0.00" line — it is never hidden

#### Scenario: Missing logo falls back gracefully
- **WHEN** `GET /settings/ticket` returns `logoUrl: null`
- **THEN** the preview shows the default Agrisas brand mark instead of a broken image or empty space

#### Scenario: Forbidden without sales:read
- **WHEN** a user without `sales:read` navigates to `/sales/:id/ticket`
- **THEN** the system applies the same guard as `/sales/:id` (redirect/403 per the existing page-level RBAC pattern)
