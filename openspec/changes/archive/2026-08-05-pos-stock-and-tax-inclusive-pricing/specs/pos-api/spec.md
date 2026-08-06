## MODIFIED Requirements

### Requirement: SaleTotalsCalculator (domain service)
The system SHALL provide a pure domain service `SaleTotalsCalculator` in `src/modules/pos/domain/services/SaleTotalsCalculator.ts` with a static method:

```
computeTotals(lines: SaleLineInput[]): SaleTotalsResult
```

`SaleLineInput`: `{ quantity, unitPrice, discountPct?, ivaRate?, iepsRate? }` — all decimals; `discountPct` defaults to `0` when absent; `ivaRate`/`iepsRate` default to `0` when `null`/absent.

`SaleTotalsResult`: `{ lines: SaleLineTotals[], subtotal, taxTotal, total }`. Each `SaleLineTotals`: `{ lineSubtotal, lineIva, lineIeps, lineTax, lineTotal }`.

`unitPrice` represents the FINAL price the customer pays for that unit — taxes are already included in it. The system SHALL extract (not add) the tax from that price using the standard tax-inclusive-price formula:

```
lineGross    = round(quantity * unitPrice * (1 - discountPct / 100), 4)
divisor      = 1 + ivaRate + iepsRate
lineSubtotal = round(lineGross / divisor, 4)
lineIva      = round(lineSubtotal * ivaRate, 4)
lineIeps     = round(lineSubtotal * iepsRate, 4)
lineTax      = lineIva + lineIeps
lineTotal    = lineGross
```

`lineTotal` (what the customer pays) is unaffected by this change — only the internal subtotal/IVA/IEPS breakdown changes. When `ivaRate = iepsRate = 0`, `divisor = 1` and the formula degenerates to the previous behavior (`lineSubtotal = lineGross = lineTotal`).

Header totals are the sum across lines for `lineSubtotal`, `lineTax`, `lineTotal` respectively (mapped to `subtotal`, `taxTotal`, `total`). Rounding uses banker's rounding (half-to-even) at 4 decimal places. The service SHALL throw if `quantity <= 0`, `unitPrice < 0`, `discountPct < 0 || discountPct > 100`, `ivaRate < 0 || ivaRate > 1`, or `iepsRate < 0 || iepsRate > 1`. No I/O dependencies (no Prisma, no fetch).

#### Scenario: Simple line
- **WHEN** `computeTotals([{ quantity: 2, unitPrice: 100, ivaRate: 0.16 }])` is invoked
- **THEN** the result has `lineSubtotal = 172.4138`, `lineIva = 27.5862`, `lineTax = 27.5862`, `lineTotal = 200`, `subtotal = 172.4138`, `taxTotal = 27.5862`, `total = 200`

#### Scenario: With discount
- **WHEN** `computeTotals([{ quantity: 1, unitPrice: 100, discountPct: 10 }])` is invoked
- **THEN** `lineSubtotal = 90`, `lineTotal = 90` (no tax rates, formula degenerates to gross = subtotal)

#### Scenario: With IVA and IEPS
- **WHEN** `computeTotals([{ quantity: 1, unitPrice: 100, ivaRate: 0.16, iepsRate: 0.08 }])` is invoked
- **THEN** `lineSubtotal = 80.6452`, `lineIva = 12.9032`, `lineIeps = 6.4516`, `lineTax = 19.3548`, `lineTotal = 100` — both taxes are extracted simultaneously from the same base (`divisor = 1.24`), not in cascade

#### Scenario: Null rates treated as zero
- **WHEN** `computeTotals([{ quantity: 1, unitPrice: 100, ivaRate: null, iepsRate: null }])` is invoked
- **THEN** `lineTax = 0`, `lineSubtotal = 100`, `lineTotal = 100`

#### Scenario: Multi-line aggregation
- **WHEN** `computeTotals([{quantity:1,unitPrice:100,ivaRate:0.16}, {quantity:2,unitPrice:50}])` is invoked
- **THEN** `subtotal = 186.2069`, `taxTotal = 13.7931`, `total = 200`

#### Scenario: Domain purity
- **WHEN** unit tests run against the calculator
- **THEN** no Prisma, no fetch, no environment access is required

#### Scenario: Invalid input rejected
- **WHEN** `computeTotals([{ quantity: 0, unitPrice: 100 }])` is invoked
- **THEN** the method throws a validation error
