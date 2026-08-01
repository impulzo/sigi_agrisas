## Purpose

Impresión del ticket de una venta desde su vista de detalle (`/sales/:id`), vía el diálogo nativo de impresión del navegador (`window.print()`), sin dependencias de hardware/software adicional. Ajustado al ancho de papel configurado globalmente en `settings-api`.

## ADDED Requirements

### Requirement: Print ticket button on sale detail
The system SHALL render a "Imprimir ticket" button on `/sales/:id`, visible under the same `sales:read` permission that already gates the page (no new permission required). Clicking it SHALL render a print-only view (hidden on screen via CSS, visible only under `@media print`) containing: `folioCode`, date, cashier name, branch name, line items (product name, quantity, unit price, line subtotal), totals (subtotal, IVA, IEPS when applicable, total), and the logo/header text/footer text fetched from `GET /settings/ticket`; then invoke `window.print()`.

#### Scenario: Print button available regardless of sale status
- **WHEN** viewing a sale with `status` of `completed`, `cancelled`, or `edited`
- **THEN** the "Imprimir ticket" button is available (printing a record of any historical sale is valid)

#### Scenario: Printable view uses the sale's already-loaded data
- **WHEN** the print view renders
- **THEN** it uses exclusively the data already fetched by the page for that specific sale (no additional sale data is fetched) — folio, items, and totals match exactly what's shown on screen

#### Scenario: Missing logo does not break the layout
- **WHEN** `GET /settings/ticket` returns `logoUrl: null`
- **THEN** the printable view omits the logo space entirely — no broken image icon, no empty gap

#### Scenario: Paper width from settings is applied
- **WHEN** `GET /settings/ticket` returns `paperWidth: "58mm"`
- **THEN** the printable view's `@media print` CSS sets the content width to `58mm` (not the `80mm` default)

#### Scenario: Print view hidden outside of printing
- **WHEN** the page is viewed normally on screen (not printing)
- **THEN** the printable ticket component is not visible and does not affect the normal page layout

#### Scenario: Settings fetch failure degrades gracefully
- **WHEN** `GET /settings/ticket` fails (network error, missing `settings:read`, etc.)
- **THEN** the print view still renders with the sale data, omitting logo/header/footer text (falling back to `80mm` width) rather than blocking the print action entirely
