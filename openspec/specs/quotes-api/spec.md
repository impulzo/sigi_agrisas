# Spec: quotes-api

## Purpose

Define the Quotes API: quote lifecycle (draft → authorized → converted | cancelled | expired), atomic emission, conversion to sale (delegating to the POS pipeline), the `QuoteTotalsCalculator` domain service, and branch scoping rules for all quote endpoints under `/api/v1/admin/quotes`. Quotes never touch `branch_inventory` — only conversion does, via the POS sale-creation pipeline.

---

## Requirements

### Requirement: Quote aggregate model
The system SHALL persist a quote as the aggregate `Quote` (header) + `QuoteItem` (lines) with the following invariants:

- `Quote.status` is one of `draft`, `authorized`, `converted`, `cancelled`, `expired`. Transitions are:
  - `draft → authorized` (via `POST /quotes/:id/authorize`)
  - `draft → cancelled` (via `DELETE /quotes/:id`)
  - `authorized → converted` (via `POST /quotes/:id/convert`)
  - `authorized → cancelled` (via `DELETE /quotes/:id`)
  - `authorized → expired` (computed implicitly when `expires_at < NOW()`; persisted only when `ConvertQuoteToSaleUseCase` detects expiry and refuses conversion — the row's `status` MAY remain `authorized` and the system MUST treat `(status='authorized' AND expires_at < NOW())` as logically "expired" on read).
  - `converted` and `cancelled` are terminal — no further transitions allowed.
- `Quote` references `branchId`, `customerId`, `creatorId` (the authenticated user who created the quote), `folioId`. All FKs `ON DELETE RESTRICT`. `customerId` and `branchId` are **immutable** after creation.
- `Quote.folioNumber` is an integer assigned atomically at creation; `(folioId, folioNumber)` is UNIQUE on `quotes`.
- `Quote.folioCode` is a snapshot of the folio's `code` and `prefix` (concatenated consistently with the convention used by `pos-api`).
- `Quote.subtotal`, `Quote.taxTotal`, `Quote.total` are persisted (computed at creation and at edit).
- `Quote.expiresAt` is nullable. `null` means "no expiration".
- `Quote.authorizedAt`, `Quote.authorizedBy` (UUID), `Quote.cancelledAt`, `Quote.cancellationReason`, `Quote.convertedAt`, `Quote.convertedSaleId` are nullable; populated only when the corresponding transition occurs.
- Each `QuoteItem` snapshots `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate` (same fields and semantics as `SaleItem`). `productId` (FK `ON DELETE RESTRICT`) and `productPriceId` (FK `ON DELETE SET NULL`) are retained.
- Each `QuoteItem` persists `lineSubtotal`, `lineTax`, `lineTotal`.
- The quote SHALL NOT touch `branch_inventory` at any point in its lifecycle. Inventory is only affected via the conversion endpoint, which delegates to the existing POS pipeline.

#### Scenario: Snapshot survives product rename
- **WHEN** a quote is created for product `FERT_001 ("Fertilizante NPK")`, and later the product is renamed to `"Fertilizante NPK 16-16-16"`
- **THEN** `GET /api/v1/admin/quotes/:id` for the prior quote still returns `productNameSnapshot: "Fertilizante NPK"` on that line

#### Scenario: Snapshot survives price deletion
- **WHEN** a quote is created using `productPriceId = X`, and later the price `X` is hard-deleted via `DELETE /products/:id/prices/:priceId`
- **THEN** `GET /api/v1/admin/quotes/:id` still returns the persisted `unitPrice`, `discountPct`, and `priceNameSnapshot` from when the quote was emitted, with `productPriceId: null`

#### Scenario: Quote creation does not change inventory
- **WHEN** the inventory record for product P in branch B has `quantity = 50` and a quote with item `{ productId: P, quantity: 30 }` is created in B
- **THEN** the inventory record's `quantity` remains `50` after the POST

---

### Requirement: List quotes
The system SHALL expose `GET /api/v1/admin/quotes` that returns a paginated list of quotes. Requires the `quotes:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `branchId` (optional UUID, subject to scoping), `customerId` (optional UUID), `status` (optional, comma-separated; one or more of `draft`, `authorized`, `converted`, `cancelled`, `expired`), `from` (optional ISO date — inclusive lower bound on `created_at`), `to` (optional ISO date — inclusive upper bound on `created_at`), `search` (optional, min 2 chars; matches `folio_code`, `folio_number::text`, or joined `customer.name`/`customer.rfc`).

`?status=expired` SHALL match quotes whose stored `status` is `expired` OR whose stored `status` is `authorized` AND `expires_at < NOW()`. This avoids requiring a cron to transition states.

Each `QuoteDto` includes `id`, `folioId`, `folioCode`, `folioNumber`, `branchId`, `branchName` (joined), `customerId`, `customerName` (joined), `customerRfc` (joined), `creatorId`, `creatorName` (joined), `status`, `subtotal`, `taxTotal`, `total`, `notes`, `expiresAt`, `authorizedAt`, `authorizedBy` (or null), `cancelledAt`, `cancellationReason`, `convertedAt`, `convertedSaleId`, `createdAt`, `updatedAt`. `items` is NOT included in the list response.

Sorted by `created_at DESC`.

**Branch scoping**: identical to `pos-api`. If the caller does NOT have `branches:access_all`:

- If `?branchId=` is absent → the system implicitly applies `branchId = x-user-branch-id`. If `x-user-branch-id` is empty, returns HTTP 403.
- If `?branchId=<X>` is present and `X !== x-user-branch-id` → HTTP 403.

If the caller HAS `branches:access_all`: `?branchId=` is honored as a filter; absent → returns quotes across all branches.

#### Scenario: Operator lists own branch
- **WHEN** an `operator` with `x-user-branch-id: B1` (no `branches:access_all`) calls `GET /api/v1/admin/quotes`
- **THEN** the system implicitly filters to `branchId = B1` and returns HTTP 200

#### Scenario: Operator tries another branch
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/quotes?branchId=B2`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: Admin lists all branches
- **WHEN** an `admin` (has `branches:access_all`) calls `GET /api/v1/admin/quotes` with no `?branchId=`
- **THEN** the system returns quotes from all branches

#### Scenario: Operator without branch tries to list
- **WHEN** an `operator` with `x-user-branch-id: ""` calls `GET /api/v1/admin/quotes` without `?branchId=`
- **THEN** the system returns HTTP 403

#### Scenario: Filter expired by computed condition
- **WHEN** the request includes `?status=expired` and there exists a quote with `status='authorized'`, `expires_at='2025-01-01T00:00:00Z'`
- **THEN** that quote is included in the response (its persisted status is still `authorized`, but it logically counts as expired)

#### Scenario: Filter by multiple statuses
- **WHEN** the request includes `?status=draft,authorized`
- **THEN** the response excludes quotes whose status is `cancelled`, `converted`, or `expired`

#### Scenario: Search by folio number
- **WHEN** the request includes `?search=42` and there exists a quote with `folio_number = 42` in folio code `COT`
- **THEN** that quote is included (also any quote where `customer.name` or `customer.rfc` contains "42")

#### Scenario: Search shorter than 2 chars rejected
- **WHEN** the request includes `?search=x`
- **THEN** the system returns HTTP 400

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden without permission
- **WHEN** an authenticated user without `quotes:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "quotes:read"}`

---

### Requirement: Get quote detail
The system SHALL expose `GET /api/v1/admin/quotes/:id` that returns a single quote with its items. Requires `quotes:read`. Returns HTTP 404 if not found. Branch scoping applies (callers without `branches:access_all` can only fetch quotes whose `branchId === x-user-branch-id`).

`QuoteDetailDto` extends `QuoteDto` with `items: QuoteItemDto[]`. Each `QuoteItemDto` includes `id`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineTax`, `lineTotal`.

The detail SHALL include `isExpired: boolean` (true if `status='authorized' AND expires_at < NOW()`) as a computed convenience flag for the UI.

#### Scenario: Authorized fetch
- **WHEN** a caller with `quotes:read` and access to the quote's branch fetches a valid `:id`
- **THEN** the system returns HTTP 200 with the `QuoteDetailDto`

#### Scenario: Out-of-branch fetch
- **WHEN** a caller without `branches:access_all` fetches a quote whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403 (after resolving existence: if the quote does not exist, returns HTTP 404 — existence is NOT used as an oracle by 403)

#### Scenario: Quote not found
- **WHEN** the `:id` does not match any quote
- **THEN** the system returns HTTP 404 `{"error": "Quote not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400

#### Scenario: isExpired flag on logically expired quote
- **WHEN** the quote has `status='authorized'` and `expires_at='2025-01-01T00:00:00Z'` (in the past)
- **THEN** the response includes `isExpired: true`

---

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
2. For each item: load the `Product` and `ProductPrice`; verify `productPrice.productId === item.productId` (else `ProductPriceMismatchError` → HTTP 400) and that `productPrice` belongs to a product whose `isActive = true` (else HTTP 400). `quantity > 0` (else HTTP 400 via Zod).
3. Snapshot `productCodeSnapshot = product.code`, `productNameSnapshot = product.name`, `priceNameSnapshot = price.name`, `unitPrice = price.price`, `discountPct = price.discountPct`, `ivaRate = product.ivaRate`, `iepsRate = product.iepsRate`.
4. Compute totals using `QuoteTotalsCalculator` (domain service).
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

---

### Requirement: Update quote (draft only)
The system SHALL expose `PATCH /api/v1/admin/quotes/:id`. Requires `quotes:write`. The body MAY include `items: QuoteItemInput[]` (full replacement; min 1), `notes: string | null`, `expiresAt: string | null`. Body MUST contain at least one of these fields, else HTTP 400.

The body MUST NOT change `folioId`, `folioNumber`, `branchId`, or `customerId`. Any of these fields present in the body SHALL be ignored silently.

The endpoint SHALL reject any quote whose `status !== 'draft'` with HTTP 409 `{"error": "Quote cannot be edited in current status", "status": "<actual>"}`.

Behavior (inside a Prisma transaction) when `items` is present:

- Validate each item (same rules as creation: active product, matching `productPrice.productId`, `quantity > 0`).
- Snapshot each item (same fields as creation).
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

---

### Requirement: Authorize quote
The system SHALL expose `POST /api/v1/admin/quotes/:id/authorize`. Requires `quotes:authorize`. Body MAY be empty or `{ "notes": "..." }` (optional `notes` appended to the quote, max 1000 chars).

Behavior:

- If `quote.status !== 'draft'` → HTTP 409 `{"error": "Quote cannot be authorized in current status", "status": "<actual>"}`.
- If `quote.expiresAt !== null && quote.expiresAt < NOW()` → HTTP 409 `{"error": "Quote has expired"}`. (An expired draft cannot be authorized; the user must extend `expires_at` via PATCH first or cancel and create a new one.)
- Set `status='authorized'`, `authorized_at=NOW()`, `authorized_by=<userId from x-user-id>`. If body includes `notes`, append it to existing `quote.notes` (or set if `notes` was null).

Branch scoping applies.

Returns HTTP 200 with the updated `QuoteDetailDto`.

#### Scenario: Authorize draft
- **WHEN** an authorized caller authorizes a `draft` quote
- **THEN** the system returns HTTP 200 with `status='authorized'` and `authorizedAt`/`authorizedBy` populated

#### Scenario: Authorize already authorized
- **WHEN** the quote is `authorized` (not `draft`)
- **THEN** the system returns HTTP 409

#### Scenario: Authorize cancelled
- **WHEN** the quote is `cancelled`
- **THEN** the system returns HTTP 409

#### Scenario: Authorize expired draft
- **WHEN** the quote has `status='draft'` and `expires_at < NOW()`
- **THEN** the system returns HTTP 409 `{"error": "Quote has expired"}`

#### Scenario: Out-of-branch
- **WHEN** an operator in branch B1 tries to authorize a quote whose `branchId=B2` and lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Forbidden without quotes:authorize
- **WHEN** a caller without `quotes:authorize` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "quotes:authorize"}`

---

### Requirement: Cancel quote
The system SHALL expose `DELETE /api/v1/admin/quotes/:id`. Requires `quotes:cancel`. Body MAY include `{ "reason": string | null }` (max 500 chars).

Behavior:

- If `quote.status === 'cancelled'` → HTTP 409 `{"error": "Quote is already cancelled"}` (NOT silently idempotent — duplicate clicks should warn the operator).
- If `quote.status === 'converted'` → HTTP 409 `{"error": "Converted quotes cannot be cancelled. Cancel the related sale instead.", "saleId": "<convertedSaleId>"}`.
- Otherwise (`draft` or `authorized`) → set `status='cancelled'`, `cancelled_at=NOW()`, `cancellation_reason=<reason>`. The folio number stays consumed (no reuse).

Branch scoping applies.

Returns HTTP 200 with the updated `QuoteDetailDto`.

#### Scenario: Cancel draft
- **WHEN** an authorized caller cancels a `draft` quote
- **THEN** the system returns HTTP 200 with `status='cancelled'`

#### Scenario: Cancel authorized
- **WHEN** an authorized caller cancels an `authorized` quote
- **THEN** the system returns HTTP 200 with `status='cancelled'`

#### Scenario: Cancel already cancelled
- **WHEN** the quote is `cancelled`
- **THEN** the system returns HTTP 409 `{"error": "Quote is already cancelled"}`

#### Scenario: Cancel converted forbidden
- **WHEN** the quote is `converted`
- **THEN** the system returns HTTP 409 with the related `saleId` in the body so the UI can deep-link to the sale-cancellation flow

#### Scenario: Folio stays consumed
- **WHEN** a quote with `folio_number = 42` (folio code "COT") is cancelled
- **THEN** the next created quote on the same folio takes `folio_number = 43`, not `42`

#### Scenario: Quote not found
- **WHEN** the `:id` does not match any quote
- **THEN** the system returns HTTP 404

#### Scenario: Forbidden without quotes:cancel
- **WHEN** a caller without `quotes:cancel` calls the endpoint
- **THEN** the system returns HTTP 403

---

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
- `UPDATE quotes SET status='converted', converted_at=NOW(), converted_sale_id=<saleId>`.

Branch scoping applies (the quote's `branchId` must match `x-user-branch-id` unless the caller has `branches:access_all`).

Returns HTTP 200 with the resulting `SaleDetailDto`.

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

---

### Requirement: QuoteTotalsCalculator (domain service)
The system SHALL provide a pure domain service `QuoteTotalsCalculator` in `src/modules/quotes/domain/services/QuoteTotalsCalculator.ts` with a static method:

```
computeTotals(lines: QuoteLineInput[]): QuoteTotalsResult
```

`QuoteLineInput`: `{ quantity, unitPrice, discountPct?, ivaRate?, iepsRate? }` — all decimals; `discountPct` defaults to `0` when absent; `ivaRate`/`iepsRate` default to `0` when `null`/absent.

`QuoteTotalsResult`: `{ lines: QuoteLineTotals[], subtotal, taxTotal, total }`. Each `QuoteLineTotals`: `{ lineSubtotal, lineIva, lineIeps, lineTax, lineTotal }`.

The formula and rounding strategy SHALL match `SaleTotalsCalculator` exactly:

```
lineSubtotal = round(quantity * unitPrice * (1 - discountPct / 100), 4)
lineIva       = round(lineSubtotal * ivaRate, 4)
lineIeps      = round(lineSubtotal * iepsRate, 4)
lineTax       = lineIva + lineIeps
lineTotal     = lineSubtotal + lineTax
```

Header totals = sum across lines. Rounding: banker's rounding (half-to-even) at 4 decimal places. The service SHALL throw if `quantity <= 0`, `unitPrice < 0`, `discountPct < 0 || discountPct > 100`, `ivaRate < 0 || ivaRate > 1`, or `iepsRate < 0 || iepsRate > 1`. No I/O dependencies.

A unit test SHALL include an **equivalence block** that iterates over the same input vectors used by `SaleTotalsCalculator`'s tests and asserts identical outputs, guarding against silent divergence.

#### Scenario: Same fixture as SaleTotalsCalculator
- **WHEN** `computeTotals` is invoked with the same input as a `SaleTotalsCalculator` fixture
- **THEN** the returned `subtotal`, `taxTotal`, `total`, and per-line breakdown are exactly equal

#### Scenario: Invalid input rejected
- **WHEN** `computeTotals([{ quantity: 0, unitPrice: 100 }])` is invoked
- **THEN** the method throws a validation error

#### Scenario: Domain purity
- **WHEN** unit tests run against the calculator
- **THEN** no Prisma, no fetch, no environment access is required

---

### Requirement: Branch scoping pattern for quote endpoints
Every route handler in `quotes-api` that operates on a quote or on a branch-filtered listing SHALL enforce the branch-scoping pattern via the shared helper `enforceBranchScope(req, resourceBranchId)` from `src/modules/rbac/infrastructure/http/enforceBranchScope.ts`. The pattern matches `pos-api`: callers without `branches:access_all` whose `x-user-branch-id` differs from `resourceBranchId` receive HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`.

For reads (`GET /quotes/:id`, `POST /quotes/:id/authorize|cancel|convert`), the handler SHALL resolve the quote's `branchId` BEFORE applying the check — if the quote does not exist, return HTTP 404 (existence is not leaked as 403 vs 404).

For creates (`POST /quotes`), `resourceBranchId` is the `branchId` in the request body.

For listings (`GET /quotes`), the scoping resolves the implicit `branchId` filter as described in the "List quotes" requirement.

#### Scenario: Existence is not leaked
- **WHEN** an unauthorized user requests `GET /api/v1/admin/quotes/<id-of-quote-in-other-branch>` for a quote that DOES exist
- **THEN** the system returns HTTP 403 (after resolving the quote and finding its `branchId !== x-user-branch-id`); the same path for an ID that does NOT exist returns HTTP 404 — but only to callers who would have been authorized had the quote existed

#### Scenario: Helper reused, not re-implemented
- **WHEN** the `quotes` module is integrated
- **THEN** `QuotesController` imports `enforceBranchScope` from the shared RBAC location; it does NOT duplicate the helper

---

### Requirement: Quote entity in domain
The system SHALL provide `Quote` and `QuoteItem` domain entities in `src/modules/quotes/domain/entities/` with factories `Quote.create()` and `QuoteItem.create()` that construct valid instances. `Quote.create()` SHALL initialize `status='draft'`, `subtotal/taxTotal/total=0` (placeholders before the totals are recomputed), and timestamps. `Quote` SHALL expose typed errors `QuoteNotFoundError`, `QuoteNotEditableError(status)`, `QuoteAlreadyAuthorizedError`, `QuoteNotAuthorizedError(status)`, `QuoteAlreadyConvertedError(saleId)`, `QuoteAlreadyCancelledError`, `QuoteExpiredError`, `EmptyQuoteError`, `ProductPriceMismatchError`.

#### Scenario: Valid construction
- **WHEN** `Quote.create({ branchId, customerId, folioId, folioNumber, folioCode, creatorId, ... })` is invoked
- **THEN** an instance is returned with `status='draft'`, `convertedSaleId=null`, `cancelledAt=null`, and `authorizedAt=null`

#### Scenario: Status transitions enforced
- **WHEN** `quote.markAuthorized(userId)` is invoked on a quote whose `status !== 'draft'`
- **THEN** the method throws `QuoteAlreadyAuthorizedError` or the appropriate transition error

---

### Requirement: No inventory side-effects in quote lifecycle
The system SHALL NOT modify `branch_inventory.quantity`, `branch_inventory.reserved_quantity`, or any other inventory column at any point during quote creation, editing, authorization, or cancellation. The only quote-related operation that modifies inventory is `POST /quotes/:id/convert`, which delegates to the POS sale-creation pipeline (`SaleRepository.createCompletedFromQuote`) — and that decrement is attributed to the resulting sale, not to the quote.

#### Scenario: Quote create does not decrement
- **WHEN** a quote with item `{ productId: P, quantity: 10 }` is created in branch B
- **THEN** `branch_inventory.quantity` for (B, P) is unchanged

#### Scenario: Quote authorize does not reserve
- **WHEN** a `draft` quote is authorized
- **THEN** no `branch_inventory` row is created, modified, or locked; `reserved_quantity` is NOT incremented

#### Scenario: Quote cancel does not restore
- **WHEN** an `authorized` quote is cancelled
- **THEN** `branch_inventory.quantity` is unchanged (since nothing was decremented at any prior step)

#### Scenario: Only conversion touches inventory
- **WHEN** an `authorized` quote is converted to a sale
- **THEN** the inventory decrement happens as part of the POS pipeline (the same SQL UPDATE used by `POST /sales`), driven by the resulting `Sale`, and is reversible only by cancelling that `Sale` via `POST /api/v1/admin/sales/:id/cancel`
