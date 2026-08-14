# sales-ticket-preview-ui Specification

## Purpose
Vista previa en pantalla del ticket de una venta con el diseño de marca de Agrisas (mockup Stitch "Ticket de Venta - Agrisas"), independiente del ticket térmico monospace usado para impresión física. Permite revisar el comprobante con estilo antes de imprimirlo o enviarlo por correo.

---
## Requirements
### Requirement: Ticket preview page
The system SHALL render `/sales/:id/ticket`, gated by the same `sales:read` permission (and branch scoping) that already protects `/sales/:id`. The page SHALL reuse the `SaleDetail` data already available to the sale detail flow (no additional data fetch beyond what `GET /sales/:id` already provides) and render: brand logo (from `GET /settings/ticket`, falling back to the Agrisas default brand mark when `logoUrl` is `null` — with NO header-text tagline fallback of any kind), folio label (labeled "Folio" — NOT "Orden"), date, seller name (labeled "Vendedor", over `cashierName` — NOT "Cajero"), a business info section immediately below the logo (razón social `businessName`, RFC `businessRfc`, address, "Tel. <phone>", and tax regime from `GET /settings/ticket`, omitting `null` fields), a line-item table (product name, quantity × unit price, line total), a financial summary showing Subtotal, IVA, and IEPS (ALWAYS visible, even when `$0.00` — consistent with `pos-ui`'s `TaxBreakdownRows`/`CartTotals` behavior), Total (labeled "Total a pagar"), a customer section (RFC, name, address — ONLY when the sale has `customerId`), credit conditions ("Condiciones: Crédito a <N> días" — ONLY when `customerCreditDays` is non-null), payment method name, footer text (from `GET /settings/ticket`), a decorative barcode-style element rendering `sale.folioCode` (the fully formatted folio, with its prefix — never the bare `folioNumber`) as text (no barcode-generation library), and the legend text (from `GET /settings/ticket.legendText`, omitted when `null`). `headerText` no longer exists as a field of `TicketSettings`; there is no header-text paragraph and no fallback tagline (e.g. the prior "Centro Agrícola Integral" text) anywhere on this page.

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
- **WHEN** `GET /settings/ticket` returns `businessName`, `businessRfc`, `businessAddress`, `businessPhone`, `businessTaxRegime`, and `legendText`
- **THEN** the preview shows the business section immediately under the logo, in this order: razón social (`businessName`), "RFC: <businessRfc>", address, "Tel. <phone>", tax regime, and the legend near the footer; `null` fields are each omitted individually without breaking the layout

#### Scenario: Header text paragraph and fallback tagline no longer rendered
- **WHEN** the preview page renders the brand header block, regardless of whether `GET /settings/ticket` succeeded, is still loading, or every `business*` field is `null`
- **THEN** no header-text paragraph and no fallback tagline (e.g. "Centro Agrícola Integral") is rendered between the logo and the business info section — that slot was removed, not merely left empty

#### Scenario: IVA and IEPS always visible, even at $0
- **WHEN** the sale has no `IEPS`-taxed items (`iepsTotal = 0`)
- **THEN** the preview still shows an "IEPS: $0.00" line — it is never hidden

#### Scenario: Missing logo falls back gracefully
- **WHEN** `GET /settings/ticket` returns `logoUrl: null`
- **THEN** the preview shows the embedded Agrisas logo (`/logo.png`) as the brand mark (same fallback as the printed ticket) — never a broken image, an icon placeholder, or empty space

#### Scenario: Preview logo rendered at 75x105px
- **WHEN** the preview page renders the brand header with a `logoUrl`
- **THEN** the logo `img` is sized to 75px wide × 105px tall with `object-fit: contain` (matching the printed ticket) so both views show the logo at the same size

#### Scenario: Logo bottom margin reduced 40%
- **WHEN** the preview page renders the logo above the business info section
- **THEN** the logo's bottom margin is `mb-[4.8px]` — a 40% reduction from the prior `mb-2` (8px)

#### Scenario: Folio rendered below the decorative barcode
- **WHEN** the preview page renders the folio as a decorative barcode-style element near the footer
- **THEN** the folio label is rendered as plain text immediately below the barcode-style bars — never above it, never omitted

#### Scenario: Folio shown in full with its folio code
- **WHEN** the preview page renders the folio (transaction details header and below the decorative barcode)
- **THEN** it shows `sale.folioCode` — the fully formatted folio (with the folio's prefix, e.g. `TK000042`) — never the bare `folioNumber`

#### Scenario: Ticket card free of Material Symbols icons
- **WHEN** the preview page renders the ticket card (either with or without `logoUrl`)
- **THEN** the logo is always an `<img>` element (never a `material-symbols-outlined` icon) and the payment method chip shows only text — the ticket card contains no `material-symbols-outlined` class (page chrome outside the card may still use icons)

#### Scenario: Forbidden without sales:read
- **WHEN** a user without `sales:read` navigates to `/sales/:id/ticket`
- **THEN** the system applies the same guard as `/sales/:id` (redirect/403 per the existing page-level RBAC pattern)

---

### Requirement: "Ver Ticket" link on sale detail
The system SHALL render a "Ver Ticket" link/button on `/sales/:id`, visible under the same `sales:read` permission, navigating to `/sales/:id/ticket`.

#### Scenario: Link navigates to the preview page
- **WHEN** a user on `/sales/:id` clicks "Ver Ticket"
- **THEN** the browser navigates to `/sales/:id/ticket`

---

### Requirement: Print action on the preview page
The system SHALL render an "Imprimir Ticket" button on `/sales/:id/ticket` that, when clicked, invokes `window.print()` using the EXISTING thermal `PrintableTicket.tsx` component (per `ticket-print-ui`) — NOT the Stitch-styled preview layout. The Stitch design is for on-screen viewing only; it is never sent to the physical printer.

#### Scenario: Print button uses the thermal ticket, not the styled preview
- **WHEN** a user clicks "Imprimir Ticket" on `/sales/:id/ticket`
- **THEN** the print dialog opens with the monospace 80mm/58mm thermal layout (same output as the "Imprimir ticket" button on `/sales/:id`), not the Stitch-branded on-screen layout

---

### Requirement: Send ticket by email action on the preview page
The system SHALL render an "Enviar por Correo" button on `/sales/:id/ticket`, visible under the same `sales:read` permission, that opens a modal (same UX pattern as `billing-ui`'s send-invoice-by-email modal): an optional email input (placeholder guidance: "vacío usa el del cliente"), a "Enviar" button calling `POST /api/v1/admin/sales/:id/send-ticket-email`, and typed error handling for `SaleNoEmailError` (prompts the user to type an email) and `SaleEmailSendFailedError` (generic retry message).

#### Scenario: Send with no override uses the customer's email
- **WHEN** the user clicks "Enviar por Correo" then "Enviar" without typing an email, and the sale's customer has `email` set
- **THEN** the modal shows a success message with the resolved recipient email

#### Scenario: No email available prompts for manual entry
- **WHEN** the sale has no customer or the customer has no email, and the user submits without typing one
- **THEN** the modal shows an inline error asking the user to type an email, and does NOT close

#### Scenario: Send failure shows a retry message
- **WHEN** the backend returns HTTP 502 (SMTP failure)
- **THEN** the modal shows an error message and remains open for retry

