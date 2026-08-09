# ticket-print-ui

## MODIFIED Requirements

### Requirement: Print ticket button on sale detail
The system SHALL render the "Imprimir Ticket" action on `/sales/:id/ticket` (la vista de ticket), visible bajo el mismo permiso `sales:read` que ya gatea `/sales/:id` (sin permiso nuevo). La acción SHALL ubicarse en la parte inferior del ticket. Al hacer clic, el sistema SHALL imprimir únicamente el ticket térmico (`PrintableTicket`) — sin cargar en la impresión la barra de navegación, el back link, los botones de acción ni la tarjeta de vista previa. El contenido impreso SHALL incluir, en orden de secciones: logo de Agrisas (`logoUrl` de `GET /settings/ticket` o el logo embebido `/logo.png` como fallback — el logo nunca se omite), marca "Agrisas", header de negocio (dirección, "Tel. <phone>" y régimen fiscal desde `GET /settings/ticket`, omitiendo los campos nulos), `folioCode`, fecha, vendedor (etiqueta "Vendedor" sobre `cashierName`), sucursal, método de pago, sección cliente (RFC, nombre y dirección — SOLO si la venta tiene `customerId`), condiciones de crédito ("Condiciones: Crédito a <N> días" — SOLO si `customerCreditDays` no es null), items (nombre de producto, cantidad, precio unitario, total de línea), totales (subtotal, IVA e IEPS — ambos SIEMPRE como líneas separadas independientemente de su valor — y "Total a pagar"), footer, leyenda de revisión de mercancía (desde `GET /settings/ticket.legendText`, omitida si es null), y el folio como elemento decorativo tipo código de barras. El sistema NO SHALL renderizar la etiqueta "Cajero" en el ticket impreso (se usa "Vendedor"). La impresión SHALL invocar `window.print()`.

#### Scenario: Print action available regardless of sale status
- **WHEN** viewing a sale with `status` of `completed`, `cancelled`, or `edited` on `/sales/:id/ticket`
- **THEN** the "Imprimir Ticket" action is available (printing a record of any historical sale is valid)

#### Scenario: Customer section rendered when sale has a customer
- **WHEN** the sale has `customerId` (with `customerRfc`, `customerName`, `customerAddress` populated)
- **THEN** the printed ticket shows a "Cliente" section with RFC, name, and address

#### Scenario: Customer section omitted for walk-in sales
- **WHEN** the sale has `customerId: null`
- **THEN** the printed ticket omits the customer section entirely (no empty rows)

#### Scenario: Credit conditions shown when the customer has creditDays
- **WHEN** the sale's customer has `customerCreditDays` set (non-null)
- **THEN** the printed ticket shows "Condiciones: Crédito a <N> días"

#### Scenario: Credit conditions omitted without a customer
- **WHEN** the sale has no customer (`customerCreditDays: null`)
- **THEN** the conditions line is omitted

#### Scenario: Business info section from settings
- **WHEN** `GET /settings/ticket` returns `businessAddress`, `businessPhone`, `businessTaxRegime`
- **THEN** the printed ticket shows the business section under the header (address, "Tel. <phone>", tax regime); when a field is `null`, that line is omitted

#### Scenario: Total labeled as "Total a pagar"
- **WHEN** the ticket renders its totals
- **THEN** the total line is labeled "Total a pagar" (the column header "Total" in the items grid is unaffected)

#### Scenario: Legend shown in the footer
- **WHEN** `GET /settings/ticket` returns `legendText`
- **THEN** the printed ticket shows the legend near the footer; when `legendText` is `null`, the legend is omitted

#### Scenario: IVA and IEPS always shown as separate lines
- **WHEN** the sale has no `IEPS`-taxed items (`iepsTotal = 0`)
- **THEN** the ticket still shows an "IEPS: $0.00" line — it is never hidden
