## MODIFIED Requirements

### Requirement: Get sale detail
The system SHALL expose `GET /api/v1/admin/sales/:id` that returns a single sale with its items. Requires `sales:read`. Returns HTTP 404 if not found. Branch scoping applies (a caller without `branches:access_all` can only fetch sales whose `branchId === x-user-branch-id`; otherwise HTTP 403).

 `SaleDetailDto` extends `SaleDto` with:

- `items: SaleItemDto[]`, each including `id`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineIva`, `lineIeps`, `lineTax`, `lineTotal`.
- `quoteId: string | null` (unchanged from `add-quotes-crud`).
- `returnedQuantityBySaleItem: Record<string, number>` — a map keyed by `sale_item.id` whose value is the SUM of `return_items.quantity` across all returns linked to this sale where `returns.status='completed'`. Keys for `sale_items` with no completed returns are OMITTED (consumers SHALL interpret "absent key" as `0`). Cancelled returns do NOT contribute to this aggregate.
- `customerAddress: string | null` — the customer's `address` joined from the sale's `customerId` (`null` for walk-in sales).
- `customerCreditDays: number | null` — the customer's `creditDays` joined from the sale's `customerId` (`null` for walk-in sales).

`lineIva` and `lineIeps` are derived fields — `SaleItem` only persists `lineSubtotal`, `lineTax`, and `lineTotal` (see "Sale aggregate model"). The mapper SHALL compute `lineIva = roundHalfToEven(lineSubtotal * (ivaRate ?? 0), 4)` and `lineIeps = roundHalfToEven(lineSubtotal * (iepsRate ?? 0), 4)`, using the same banker's-rounding function (`roundHalfToEven`, half-to-even at 4 decimals) that `SaleTotalsCalculator` uses when the line was first computed — never `Math.round` or any other rounding mode — so that `lineIva + lineIeps` always equals the persisted `lineTax` for that line.

Each `SaleDto` in the list response (`GET /api/v1/admin/sales`) SHALL also include `customerAddress` and `customerCreditDays` (same joined semantics, `null` for walk-in sales).

#### Scenario: Authorized fetch
- **WHEN** a caller with `sales:read` and access to the sale's branch fetches a valid `:id`
- **THEN** the system returns HTTP 200 with the `SaleDetailDto` (including `quoteId`, `returnedQuantityBySaleItem`, `customerAddress`, and `customerCreditDays`)

#### Scenario: Sale with customer exposes credit data
- **WHEN** a sale has `customerId` and the customer has `address` and `creditDays` set
- **THEN** the returned `SaleDetailDto` includes `customerAddress` and `customerCreditDays` with those values

#### Scenario: Walk-in sale exposes null credit data
- **WHEN** a sale has `customerId: null`
- **THEN** the returned `SaleDetailDto` includes `customerAddress: null` and `customerCreditDays: null`

#### Scenario: Out-of-branch fetch
- **WHEN** a caller without `branches:access_all` fetches a sale whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404 `{"error": "Sale not found"}`

#### Scenario: No returns on any line
- **WHEN** the sale has no `returns` rows (or only cancelled ones)
- **THEN** `returnedQuantityBySaleItem` is `{}` (empty record)

#### Scenario: Partial returns reported
- **WHEN** the sale has 3 items A, B, C and one `completed` return that returned 2 of A and 1 of C
- **THEN** `returnedQuantityBySaleItem` is `{ "<itemAId>": 2, "<itemCId>": 1 }` — B is absent (zero)

#### Scenario: Multiple completed returns aggregate per line
- **WHEN** the sale has item A returned twice (3 then 2, both completed)
- **THEN** `returnedQuantityBySaleItem["<itemAId>"] === 5`

#### Scenario: Cancelled return excluded from aggregate
- **WHEN** the sale has item A returned (4, status `completed`) and then that return is cancelled
- **THEN** `returnedQuantityBySaleItem["<itemAId>"]` is absent (cancelled returns contribute zero)

#### Scenario: Aggregate query is not paginated
- **WHEN** the sale has 50 returns across many lines (unusual but legal)
- **THEN** the aggregate still reflects the total per line; the query is a single `SUM`-grouped read against `return_items` joined to `returns`

#### Scenario: lineIva and lineIeps use the same rounding as lineTax
- **WHEN** a sale item has `lineSubtotal = 100.0002` and `iepsRate = 0.25` (a value where half-up and half-to-even rounding disagree at the 4th decimal)
- **THEN** the returned `lineIeps` SHALL equal `roundHalfToEven(100.0002 * 0.25, 4) = 25.0000`, and `lineIva + lineIeps` SHALL equal the persisted `lineTax` for that item — never the half-up result `25.0001`
