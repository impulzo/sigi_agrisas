## MODIFIED Requirements

### Requirement: `/sales/[id]/returns/new` route (create return form)
The system SHALL expose `/sales/[id]/returns/new` for creating partial returns. Gated by `returns:create` and `sale.status === 'completed'`. The form extends `SaleItemsTable` with `ReturnLineRow` for each sale line. Each `ReturnLineRow` SHALL display the column "Disponible" showing `remainingQuantity` (computed as `soldQty - sum(completed returns)`) alongside the quantity input. Lines where `remainingQuantity = 0` SHALL render the quantity input as disabled with label "Devuelto" instead of a numeric input. The submit button SHALL be disabled when the sum of all entered quantities equals zero. `CreateReturnFooter` SHALL display a real-time preview of `refundSubtotal`, `refundTax`, `refundTotal` computed client-side as quantities change. The `reason` field (textarea, 3–500 chars) is mandatory; client validation fires on submit.

#### Scenario: ReturnLineRow shows available quantity
- **WHEN** a sale item has `soldQty = 10` and a prior completed return of 3
- **THEN** the `ReturnLineRow` shows "Disponible: 7" and the quantity input has `max = 7`

#### Scenario: Fully returned line is disabled
- **WHEN** `remainingQuantity = 0` for a sale item
- **THEN** the quantity input is rendered disabled with label "Devuelto" and no numeric input

#### Scenario: Submit disabled when all quantities zero
- **WHEN** all `ReturnLineRow` inputs are 0 or empty
- **THEN** the "Registrar devolución" button is disabled

#### Scenario: Real-time refund total preview
- **WHEN** the user enters a quantity in any `ReturnLineRow`
- **THEN** `CreateReturnFooter` immediately updates `refundSubtotal`, `refundTax`, `refundTotal` without a server round-trip

#### Scenario: Reason required on submit
- **WHEN** the user submits with empty `reason`
- **THEN** inline error "El motivo es obligatorio (mín. 3 caracteres)" appears and request is NOT dispatched

#### Scenario: Successful submission redirects to return detail
- **WHEN** `POST /returns` returns HTTP 201
- **THEN** the page navigates to `/returns/[newReturnId]`
