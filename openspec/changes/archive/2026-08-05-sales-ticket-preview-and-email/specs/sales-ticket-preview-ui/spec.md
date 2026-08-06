## Purpose

Vista previa en pantalla del ticket de una venta con el diseño de marca de Agrisas (mockup Stitch "Ticket de Venta - Agrisas"), independiente del ticket térmico monospace usado para impresión física. Permite revisar el comprobante con estilo antes de imprimirlo o enviarlo por correo.

---

## ADDED Requirements

### Requirement: Ticket preview page
The system SHALL render `/sales/:id/ticket`, gated by the same `sales:read` permission (and branch scoping) that already protects `/sales/:id`. The page SHALL reuse the `SaleDetail` data already available to the sale detail flow (no additional data fetch beyond what `GET /sales/:id` already provides) and render: brand logo/header text (from `GET /settings/ticket`, falling back to the Agrisas default brand mark when `logoUrl` is `null`), folio label, date, cashier name, a line-item table (product name, quantity × unit price, line total), a financial summary showing Subtotal, IVA, and IEPS (ALWAYS visible, even when `$0.00` — consistent with `pos-ui`'s `TaxBreakdownRows`/`CartTotals` behavior), Total, payment method name, footer text (from `GET /settings/ticket`), and a decorative barcode-style element rendering the folio label as text (no barcode-generation library).

This page is display-only styling on top of existing data — it introduces no new backend endpoint for reading sale data.

#### Scenario: Ticket preview renders with brand design
- **WHEN** an authorized user with `sales:read` navigates to `/sales/:id/ticket` for an existing sale
- **THEN** the page renders the Agrisas-branded layout with folio, date, cashier, items, and totals matching exactly what `/sales/:id` already shows

#### Scenario: IVA and IEPS always visible, even at $0
- **WHEN** the sale has no `IEPS`-taxed items (`iepsTotal = 0`)
- **THEN** the preview still shows an "IEPS: $0.00" line — it is never hidden

#### Scenario: Missing logo falls back gracefully
- **WHEN** `GET /settings/ticket` returns `logoUrl: null`
- **THEN** the preview shows the default Agrisas brand mark instead of a broken image or empty space

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
