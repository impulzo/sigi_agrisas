## MODIFIED Requirements

### Requirement: Convert quote to sale
The system SHALL expose `POST /api/v1/admin/quotes/:id/convert`. Requires `quotes:convert`. Required body:

- `paymentMethodId: string` (UUID of an active payment method)
- `folioId: string` (UUID of an active **fiscal** folio for the resulting sale — distinct from the quote's folio)

Optional body: `notes: string | null` (max 1000 chars; if present, overrides the quote's `notes` in the resulting sale; if absent, the sale inherits `quote.notes`).

Behavior (inside a Prisma transaction):

- If `quote.status === 'converted'` AND `quote.convertedSaleId !== null` → idempotent: return HTTP 200 with the existing `SaleDetailDto` (loaded via `SaleRepository.findByIdWithItems`). No second decrement, no second folio increment.
- If `quote.status !== 'authorized'` → HTTP 409 `{"error": "Quote must be authorized before converting", "status": "<actual>"}`.
- If `quote.expiresAt !== null && quote.expiresAt < NOW()` → HTTP 409 `{"error": "Quote has expired"}`.
- Validate `paymentMethod.isActive` and `folio.isActive` (each → HTTP 400 on inactive).
- Reuse the POS sale-creation pipeline (`SaleRepository.createCompletedFromQuote(input, tx)`) with:
  - `branchId = quote.branchId`
  - `customerId = quote.customerId`
  - `paymentMethodId = body.paymentMethodId`
  - `folioId = body.folioId` (fiscal folio, separate atomic increment from the quote's folio)
  - `cashierId = userId` (from `x-user-id`)
  - `items` constructed by mapping each `quote_item` → `{ productId, productPriceId, quantity, productCodeSnapshot, productNameSnapshot, priceNameSnapshot, unitPrice, discountPct, ivaRate, iepsRate }`. The snapshot fields are passed through directly (NOT re-resolved) to guarantee the cotizado price is what is billed.
  - `notes = body.notes ?? quote.notes`
  - `quoteId = quote.id`
- The created sale follows all POS rules: fiscal folio incremented, `branch_inventory.quantity` decremented per item (allowed to go negative), `sale.status='completed'`, `sale.quoteId = quote.id`.
- **Credit flow (non-blocking)**: if `paymentMethod.isCredit === true`, the system SHALL NOT reject the conversion for lacking a credit line or for exceeding `creditLimit` — the conversion always completes (same rule as `POST /api/v1/admin/sales`, see `pos-api` "Create sale (atomic emission)" § Credit flow auto-activation). The resulting `SaleDetailDto` includes the informational flag `creditLimitExceeded = customer.creditLimit !== null && (customer.currentBalance + sale.total) > customer.creditLimit` (`false` when `creditLimit === null`).
- `UPDATE quotes SET status='converted', converted_at=NOW(), converted_sale_id=<saleId>`.

Branch scoping applies (the quote's `branchId` must match `x-user-branch-id` unless the caller has `branches:access_all`).

Returns HTTP 200 with the resulting `SaleDetailDto` (including `creditLimitExceeded: boolean`).

**BREAKING**: this endpoint no longer returns HTTP 409 for a credit limit or missing credit line on the resulting sale. Callers MUST read `creditLimitExceeded` from the HTTP 200 body instead.

#### Scenario: Convert authorized quote successfully
- **WHEN** an authorized caller converts an `authorized` quote with a valid `paymentMethodId` and fiscal `folioId`
- **THEN** the system returns HTTP 200 with the `SaleDetailDto`, `quote.status='converted'`, `quote.convertedSaleId` populated, `sale.quoteId` populated, fiscal folio incremented by 1, `branch_inventory.quantity` decremented per item

#### Scenario: Idempotent re-convert
- **WHEN** the caller invokes `/convert` a second time on a quote that already has `convertedSaleId` set
- **THEN** the system returns HTTP 200 with the same `SaleDetailDto` as the first call; no second decrement, no second folio increment, no second sale row

#### Scenario: Convert draft rejected
- **WHEN** the quote has `status='draft'`
- **THEN** the system returns HTTP 409 `{"error": "Quote must be authorized before converting", "status": "draft"}`

#### Scenario: Convert cancelled rejected
- **WHEN** the quote has `status='cancelled'`
- **THEN** the system returns HTTP 409

#### Scenario: Convert expired rejected
- **WHEN** the quote is `authorized` and `expires_at < NOW()`
- **THEN** the system returns HTTP 409 `{"error": "Quote has expired"}`

#### Scenario: Inactive payment method
- **WHEN** the body's `paymentMethodId` references a payment method with `isActive=false`
- **THEN** the system returns HTTP 400

#### Scenario: Inactive fiscal folio
- **WHEN** the body's `folioId` references a folio with `isActive=false`
- **THEN** the system returns HTTP 400

#### Scenario: Out-of-branch conversion
- **WHEN** an operator in branch B1 tries to convert a quote whose `branchId=B2` and lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Inventory decrements on conversion
- **WHEN** the quote has an item `{ productId: P, quantity: 10 }` and `branch_inventory.quantity` for P in the target branch is `25`
- **THEN** after a successful conversion, `branch_inventory.quantity` for P is `15`

#### Scenario: Conversion allows negative stock
- **WHEN** the quote has an item `{ productId: P, quantity: 30 }` and `branch_inventory.quantity` for P is `10`
- **THEN** after conversion, `branch_inventory.quantity` is `-20` (same rule as direct POS sales)

#### Scenario: notes inheritance
- **WHEN** the quote has `notes="Cliente prefiere entrega martes"` and the convert body has no `notes`
- **THEN** the resulting `sale.notes = "Cliente prefiere entrega martes"`

#### Scenario: notes override
- **WHEN** the quote has `notes="A"` and the convert body has `notes="B"`
- **THEN** the resulting `sale.notes = "B"`; `quote.notes` is NOT modified

#### Scenario: Forbidden without quotes:convert
- **WHEN** a caller without `quotes:convert` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "quotes:convert"}`

#### Scenario: Quote cancellation after conversion forbidden
- **WHEN** a converted quote is sent to `DELETE /api/v1/admin/quotes/:id`
- **THEN** the system returns HTTP 409 with the related `saleId`, instructing to cancel the sale instead (see "Cancel quote" requirement)

#### Scenario: Credit conversion exceeds creditLimit — conversion still completes with warning flag
- **WHEN** the conversion selects a `paymentMethod` with `isCredit=true` for a customer with `creditLimit=10000`, `currentBalance=8000`, and the resulting sale `total=5000`
- **THEN** the system returns HTTP 200 (NOT 409) with `creditLimitExceeded=true`; the sale, folio increment, and inventory decrement are all persisted; `customer.currentBalance` becomes `13000`

#### Scenario: Credit conversion for customer without credit line — conversion still completes
- **WHEN** the conversion selects a `paymentMethod` with `isCredit=true` for a customer with `creditLimit=null`
- **THEN** the system returns HTTP 200 (NOT 409) with `creditLimitExceeded=false`; the sale is persisted normally
