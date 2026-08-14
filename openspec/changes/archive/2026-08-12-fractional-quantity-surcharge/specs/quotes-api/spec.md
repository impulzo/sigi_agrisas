## MODIFIED Requirements

### Requirement: Create quote
The system SHALL expose `POST /api/v1/admin/quotes` that emits a new quote in `draft` status. Requires `quotes:create`. Required body:

- `branchId: string` (UUID of an active branch)
- `customerId: string` (UUID of an active customer)
- `folioId: string` (UUID of an active folio — typically a folio whose `code` identifies quotes, e.g. "COT")
- `items: QuoteItemInput[]` (at least 1 item)

Each `QuoteItemInput`:

- `productId: string` (UUID of an active product)
- `productPriceId: string` (UUID of a price belonging to `productId`)
- `quantity: number` (decimal `> 0`; max 14 integer + 4 decimal digits)

Optional body: `notes: string | null` (max 1000 chars), `expiresAt: string | null` (ISO 8601; if non-null SHALL be in the future).

**Branch scoping**: callers without `branches:access_all` MUST pass `branchId === x-user-branch-id`; mismatch returns HTTP 403. Callers without an assigned branch (`x-user-branch-id` empty) and without `branches:access_all` return HTTP 403.

**Atomic flow (inside a Prisma transaction)**:

1. Validate `customer.isActive`, `branch.isActive`, `folio.isActive`. Any inactive → HTTP 400.
2. For each item: load the `Product` and `ProductPrice`; verify `productPrice.productId === item.productId` (else `ProductPriceMismatchError` → HTTP 400) and that `productPrice` belongs to a product whose `isActive = true` (else HTTP 400). `quantity > 0` (else HTTP 400 via Zod). If `item.quantity` is NOT an integer (`quantity % 1 !== 0`), resolve the currently configured `dosificationSurchargePct` from `settings-api` (default `5.0` when unconfigured) and compute `unitPrice = price.price * (1 + surchargePct / 100)`; if `item.quantity` IS an integer, `unitPrice = price.price` unchanged. This applies uniformly to every product — no per-product or per-department opt-out — and is the same rule `pos-api` applies to normal-price sale lines.
3. Snapshot `productCodeSnapshot = product.code`, `productNameSnapshot = product.name`, `priceNameSnapshot = price.name`, `unitPrice` per step 2 above (recharged when `quantity` is fractional, else `price.price` unchanged), `discountPct = price.discountPct`, `ivaRate = product.ivaRate`, `iepsRate = product.iepsRate`.
4. Compute totals using `QuoteTotalsCalculator` (domain service) — unchanged by the fractional-quantity surcharge (operates on `quantity * unitPrice`, agnostic to how `unitPrice` was resolved).
5. Allocate the next folio number atomically: `UPDATE folios SET current_number = current_number + 1 WHERE id = ? AND is_active = true RETURNING current_number, code, prefix`. If `RETURNING` is empty (folio inactive) → HTTP 400.
6. `INSERT` the `quotes` row with `status='draft'`, `creator_id=<userId from x-user-id>`, snapshotted folio info, and `expires_at` from the body.
7. `INSERT` the `quote_items` rows.

The endpoint SHALL NOT touch `branch_inventory` at any point. Returns HTTP 201 with the `QuoteDetailDto` (including items).

#### Scenario: Successful quote creation
- **WHEN** an `operator` with `x-user-branch-id: B1` and `quotes:create` sends a valid body for branch B1 with 2 items
- **THEN** the system returns HTTP 201 with the `QuoteDetailDto`, `folios.current_number` incremented by 1, and `branch_inventory.quantity` for the involved products UNCHANGED

#### Scenario: Branch scoping violation
- **WHEN** an `operator` with `x-user-branch-id: B1` posts a body with `branchId: B2`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: Inactive customer
- **WHEN** the body's `customerId` references a customer with `isActive=false`
- **THEN** the system returns HTTP 400 `{"error": "Customer is inactive"}` and the transaction does not commit

#### Scenario: Inactive folio
- **WHEN** the body's `folioId` references a folio with `isActive=false`
- **THEN** the system returns HTTP 400

#### Scenario: Mismatched productPrice
- **WHEN** an item has `productId: A` but `productPriceId: P` where `P.product_id !== A`
- **THEN** the system returns HTTP 400 `{"error": "Product price does not belong to product"}` and the transaction does not commit

#### Scenario: Empty items
- **WHEN** the body has `items: []`
- **THEN** the system returns HTTP 400 `{"error": "Quote must include at least one item"}`

#### Scenario: expiresAt in the past
- **WHEN** the body has `expiresAt: "2020-01-01T00:00:00Z"`
- **THEN** the system returns HTTP 400 `{"error": "expiresAt must be in the future"}`

#### Scenario: Forbidden without quotes:create
- **WHEN** a caller without `quotes:create` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "quotes:create"}`

#### Scenario: Quote can be created for a customer with debt
- **WHEN** the customer's `current_balance > 0` (the customer owes money)
- **THEN** the system still returns HTTP 201 — the quote does not check credit, this is a sales proposal not a sale

#### Scenario: Quote can be created without inventory record
- **WHEN** the target branch has no `branch_inventory` row for the item's `productId`
- **THEN** the system returns HTTP 201 — the quote does not require existing inventory

#### Scenario: Fractional quantity applies the same surcharge as a sale
- **WHEN** the body has an item with `price.price = 100`, `quantity = 0.5`, and `dosificationSurchargePct = 5` (default)
- **THEN** the system returns HTTP 201 with `unitPrice = 105` on that line (`100 * 1.05`), matching what `POST /api/v1/admin/sales` would compute for the same line

#### Scenario: Integer quantity never gets the surcharge
- **WHEN** the body has an item with `price.price = 100`, `quantity = 3`
- **THEN** the system returns HTTP 201 with `unitPrice = 100` (unchanged)

---

### Requirement: Update quote (draft only)
The system SHALL expose `PATCH /api/v1/admin/quotes/:id`. Requires `quotes:write`. The body MAY include `items: QuoteItemInput[]` (full replacement; min 1), `notes: string | null`, `expiresAt: string | null`. Body MUST contain at least one of these fields, else HTTP 400.

The body MUST NOT change `folioId`, `folioNumber`, `branchId`, or `customerId`. Any of these fields present in the body SHALL be ignored silently.

The endpoint SHALL reject any quote whose `status !== 'draft'` with HTTP 409 `{"error": "Quote cannot be edited in current status", "status": "<actual>"}`.

Behavior (inside a Prisma transaction) when `items` is present:

- Validate each item (same rules as creation: active product, matching `productPrice.productId`, `quantity > 0`).
- Snapshot each item (same fields as creation, including the fractional-quantity surcharge resolution: `unitPrice` recharged when `item.quantity` is not an integer, unchanged otherwise).
- Delete all rows from `quote_items` for this `quoteId`.
- Insert new `quote_items`.
- Recompute totals via `QuoteTotalsCalculator` and `UPDATE quotes SET subtotal=?, tax_total=?, total=?, notes=?, expires_at=?`.

When `items` is absent, only `notes` and/or `expires_at` are updated; totals are not recomputed.

Branch scoping applies (cannot edit a quote in another branch without bypass).

#### Scenario: Edit draft items
- **WHEN** an authorized caller PATCHes a `draft` quote with a new `items` array
- **THEN** the system returns HTTP 200 with the recomputed `QuoteDetailDto`

#### Scenario: Update only notes
- **WHEN** the body is `{ "notes": "Cliente solicitó descuento al cerrar" }` on a `draft` quote
- **THEN** the system returns HTTP 200 and `subtotal`/`tax_total`/`total` remain unchanged

#### Scenario: Edit authorized rejected
- **WHEN** the quote has `status='authorized'` and PATCH is called
- **THEN** the system returns HTTP 409 `{"error": "Quote cannot be edited in current status", "status": "authorized"}`

#### Scenario: Edit converted rejected
- **WHEN** the quote has `status='converted'` and PATCH is called
- **THEN** the system returns HTTP 409 `{"error": "Quote cannot be edited in current status", "status": "converted"}`

#### Scenario: Folio invariants preserved
- **WHEN** the body includes `folioId` or `folioNumber`
- **THEN** the system silently ignores those fields and persists the original folio data

#### Scenario: Customer/branch invariants preserved
- **WHEN** the body includes `customerId` or `branchId` different from the quote's persisted values
- **THEN** the system silently ignores them and persists the original values

#### Scenario: Empty body
- **WHEN** the body is `{}` or contains only ignored fields
- **THEN** the system returns HTTP 400 `{"error": "At least one updatable field must be provided"}`

#### Scenario: Edit zeroes out items
- **WHEN** the body has `items: []`
- **THEN** the system returns HTTP 400 `{"error": "Quote must include at least one item"}`

#### Scenario: Edit changes a line from integer to fractional quantity
- **WHEN** the body replaces an item that previously had `quantity=2` (no surcharge) with the same `productPriceId` but `quantity=2.5`
- **THEN** the system recomputes `unitPrice` for that line WITH the configured surcharge applied, and the resulting totals reflect it
