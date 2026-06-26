## ADDED Requirements

### Requirement: Full-return action in sale detail
The system SHALL add a "Devolución Total" button to `SaleDetailPage` (route `/sales/[id]`). The button SHALL be visible when ALL of the following are true: `sale.status === 'completed'`, `can("returns:create") === true`, and at least one sale line has `remaining > 0`. Clicking the button opens `FullReturnModal`.

#### Scenario: Button visible for eligible sale
- **WHEN** an operator with `returns:create` views a `completed` sale with unreturned lines
- **THEN** the "Devolución Total" button appears in the actions bar

#### Scenario: Button hidden when all lines returned
- **WHEN** all sale lines have `remaining = 0` (or sale status is `returned_total`)
- **THEN** the "Devolución Total" button is NOT rendered

#### Scenario: Button hidden without permission
- **WHEN** a viewer without `returns:create` views a sale
- **THEN** the "Devolución Total" button is NOT rendered

---

### Requirement: FullReturnModal
The system SHALL provide a `FullReturnModal` dialog that captures the mandatory `reason` (textarea, 3–500 chars) and optional `notes` (textarea, max 1000 chars) before calling `POST /api/v1/admin/sales/:id/full-return`. On success, the modal closes, a toast "Devolución total registrada" appears, and the page re-fetches the sale detail (showing updated status `returned_total`).

#### Scenario: Submit with valid reason
- **WHEN** the user enters a reason of ≥ 3 chars and clicks "Confirmar devolución total"
- **THEN** `POST /sales/:id/full-return` is called and on 201 the modal closes and the sale status badge updates

#### Scenario: Submit with empty reason
- **WHEN** the user submits with an empty `reason` field
- **THEN** an inline error "El motivo es obligatorio (mín. 3 caracteres)" appears and the request is NOT dispatched

#### Scenario: Server error 409 SaleAlreadyFullyReturned
- **WHEN** the server returns HTTP 409 `SaleAlreadyFullyReturned`
- **THEN** the modal shows "Esta venta ya fue devuelta en su totalidad"

---

### Requirement: `returned_total` status badge
The system SHALL update `SaleStatusBadge` (and the equivalent `ReturnStatusBadge` if reused) to render `returned_total` as "Devuelto total" with `bg-error-container text-on-error-container` styling. The `/sales` list SHALL include `returned_total` as a selectable filter option in the "Estado" filter.

#### Scenario: Badge renders returned_total
- **WHEN** a sale row has `status = 'returned_total'`
- **THEN** the badge renders "Devuelto total" with error-container color

#### Scenario: Filter by returned_total in sales list
- **WHEN** the user selects "Devuelto total" in the Estado filter on `/sales`
- **THEN** the request adds `?status=returned_total` and only fully returned sales appear
