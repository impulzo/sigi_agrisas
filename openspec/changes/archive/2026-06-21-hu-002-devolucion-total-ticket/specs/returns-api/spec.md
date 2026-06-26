## ADDED Requirements

### Requirement: `returned_total` sale status
The system SHALL extend `Sale.status` domain type to include `returned_total`. A sale acquires `returned_total` status when a full-return operation results in `remaining = 0` for ALL sale lines. This status is terminal: no further transitions (cancel, edit) are allowed from `returned_total`.

#### Scenario: Sale becomes returned_total after full return
- **WHEN** `POST /api/v1/admin/sales/:id/full-return` completes and all lines have `remaining = 0`
- **THEN** `sale.status` transitions to `returned_total` within the same request

#### Scenario: returned_total blocks cancellation
- **WHEN** `POST /api/v1/admin/sales/:id/cancel` is called on a sale with `status = 'returned_total'`
- **THEN** the system returns HTTP 409 `{"error": "SaleNotCancellable"}`

#### Scenario: returned_total blocks edit
- **WHEN** `PUT /api/v1/admin/sales/:id/edit` is called on a sale with `status = 'returned_total'`
- **THEN** the system returns HTTP 409 `{"error": "SaleNotEditable"}`

---

### Requirement: Full-return endpoint
The system SHALL expose `POST /api/v1/admin/sales/:id/full-return`. Requires `returns:create` permission. Request body: `{ reason: string (3–500 chars), returnedAt?: string (ISO datetime, defaults to NOW), notes?: string (max 1000 chars) }`. The endpoint SHALL:

1. Load the sale with its items and all prior return items
2. Compute `remaining` for each sale line via `ReturnableQuantityCalculator`
3. Build a return payload including only lines with `remaining > 0`
4. If no lines have `remaining > 0`, return HTTP 409 `{"error": "SaleAlreadyFullyReturned"}`
5. Delegate to `CreateReturnUseCase` (same transaction as existing return creation)
6. After the return is persisted, evaluate if all lines are now fully returned; if so, update `sale.status = 'returned_total'` atomically
7. Return HTTP 201 with the new `ReturnDto`

Branch scoping: identical to `POST /returns` — `branchId` is derived from the sale.

#### Scenario: Full return on a completed sale
- **WHEN** an operator with `returns:create` calls `POST /api/v1/admin/sales/:id/full-return` with valid reason on a `completed` sale with no prior returns
- **THEN** the system creates a return covering all lines, sets `sale.status = 'returned_total'`, and returns HTTP 201

#### Scenario: Full return on a partially returned sale
- **WHEN** some lines have prior `completed` returns and `POST /sales/:id/full-return` is called
- **THEN** the system devuelve only the remaining quantities, marks the sale `returned_total` if everything is covered, returns HTTP 201

#### Scenario: Already fully returned
- **WHEN** all sale lines have `remaining = 0` before the call
- **THEN** the system returns HTTP 409 `{"error": "SaleAlreadyFullyReturned"}`

#### Scenario: Reason too short
- **WHEN** the body includes `reason: "x"` (less than 3 chars)
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden without permission
- **WHEN** a user without `returns:create` calls the endpoint
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404

#### Scenario: Sale not returnable (cancelled)
- **WHEN** the sale has `status = 'cancelled'`
- **THEN** the system returns HTTP 409 `{"error": "SaleNotReturnableError"}`

---

### Requirement: `returned_total` in sale list and detail responses
The system SHALL include `returned_total` as a valid value in `SaleDto.status` in all endpoints that return `SaleDto` (list, detail). Clients filtering by `?status=returned_total` SHALL receive only fully returned sales.

#### Scenario: Filter by returned_total
- **WHEN** `GET /api/v1/admin/sales?status=returned_total` is called
- **THEN** the response includes only sales with `status = 'returned_total'`
