# pos-api

## MODIFIED Requirements

### Requirement: Get sale detail
`SaleDetailDto` extends `SaleDto` with:

- `items: SaleItemDto[]`, each including `id`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineTax`, `lineTotal`.
- `quoteId: string | null` (unchanged from `add-quotes-crud`).
- `returnedQuantityBySaleItem: Record<string, number>` — a map keyed by `sale_item.id` whose value is the SUM of `return_items.quantity` across all returns linked to this sale where `returns.status='completed'`. Keys for `sale_items` with no completed returns are OMITTED (consumers SHALL interpret "absent key" as `0`). Cancelled returns do NOT contribute to this aggregate.
- `customerAddress: string | null` — the customer's `address` joined from the sale's `customerId` (`null` for walk-in sales).
- `customerCreditDays: number | null` — the customer's `creditDays` joined from the sale's `customerId` (`null` for walk-in sales).

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
- **WHEN** a caller fetches a `:id` that does not exist
- **THEN** the system returns HTTP 404
