## MODIFIED Requirements

### Requirement: Get return detail
The system SHALL expose `GET /api/v1/admin/returns/:id` that returns a single return with its items. Requires `returns:read`. Returns HTTP 404 if not found. Branch scoping applies (a caller without `branches:access_all` can only fetch returns whose `branchId === x-user-branch-id`; otherwise HTTP 403).

`ReturnDetailDto` extends `ReturnDto` with `items: ReturnItemDto[]`, each including `id`, `saleItemId`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineIva`, `lineIeps`, `lineTax`, `lineTotal`.

`lineIva` and `lineIeps` are derived fields — `ReturnItem` only persists `lineSubtotal`, `lineTax`, and `lineTotal`. The mapper SHALL compute `lineIva = roundHalfToEven(lineSubtotal * (ivaRate ?? 0), 4)` and `lineIeps = roundHalfToEven(lineSubtotal * (iepsRate ?? 0), 4)`, using the same banker's-rounding function (`roundHalfToEven`, half-to-even at 4 decimals) that `ReturnTotalsCalculator` uses when the line was first computed — never `Math.round` or any other rounding mode — so that `lineIva + lineIeps` always equals the persisted `lineTax` for that line.

#### Scenario: Authorized fetch
- **WHEN** a caller with `returns:read` and access to the return's branch fetches a valid `:id`
- **THEN** the system returns HTTP 200 with the `ReturnDetailDto`

#### Scenario: Out-of-branch fetch
- **WHEN** a caller without `branches:access_all` fetches a return whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403

#### Scenario: Return not found
- **WHEN** the `:id` does not match any return
- **THEN** the system returns HTTP 404 `{"error": "Return not found"}`

#### Scenario: lineIva and lineIeps use the same rounding as lineTax
- **WHEN** a return item has `lineSubtotal = 100.0002` and `iepsRate = 0.25` (a value where half-up and half-to-even rounding disagree at the 4th decimal)
- **THEN** the returned `lineIeps` SHALL equal `roundHalfToEven(100.0002 * 0.25, 4) = 25.0000`, and `lineIva + lineIeps` SHALL equal the persisted `lineTax` for that item — never the half-up result `25.0001`
