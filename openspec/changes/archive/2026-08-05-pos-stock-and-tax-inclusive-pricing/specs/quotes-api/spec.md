## MODIFIED Requirements

### Requirement: QuoteTotalsCalculator (domain service)
The system SHALL provide a pure domain service `QuoteTotalsCalculator` in `src/modules/quotes/domain/services/QuoteTotalsCalculator.ts` with a static method:

```
computeTotals(lines: QuoteLineInput[]): QuoteTotalsResult
```

`QuoteLineInput`: `{ quantity, unitPrice, discountPct?, ivaRate?, iepsRate? }` — all decimals; `discountPct` defaults to `0` when absent; `ivaRate`/`iepsRate` default to `0` when `null`/absent.

`QuoteTotalsResult`: `{ lines: QuoteLineTotals[], subtotal, taxTotal, total }`. Each `QuoteLineTotals`: `{ lineSubtotal, lineIva, lineIeps, lineTax, lineTotal }`.

The formula and rounding strategy SHALL match `SaleTotalsCalculator` exactly. `unitPrice` is the final tax-inclusive price; tax is extracted, not added:

```
lineGross    = round(quantity * unitPrice * (1 - discountPct / 100), 4)
divisor      = 1 + ivaRate + iepsRate
lineSubtotal = round(lineGross / divisor, 4)
lineIva      = round(lineSubtotal * ivaRate, 4)
lineIeps     = round(lineSubtotal * iepsRate, 4)
lineTax      = lineIva + lineIeps
lineTotal    = lineGross
```

Header totals = sum across lines. Rounding: banker's rounding (half-to-even) at 4 decimal places. The service SHALL throw if `quantity <= 0`, `unitPrice < 0`, `discountPct < 0 || discountPct > 100`, `ivaRate < 0 || ivaRate > 1`, or `iepsRate < 0 || iepsRate > 1`. No I/O dependencies.

A unit test SHALL include an **equivalence block** that iterates over the same input vectors used by `SaleTotalsCalculator`'s tests and asserts identical outputs, guarding against silent divergence.

#### Scenario: Same fixture as SaleTotalsCalculator
- **WHEN** `computeTotals` is invoked with the same input as a `SaleTotalsCalculator` fixture
- **THEN** the returned `subtotal`, `taxTotal`, `total`, and per-line breakdown (including the tax-extraction formula) are exactly equal

#### Scenario: Invalid input rejected
- **WHEN** `computeTotals([{ quantity: 0, unitPrice: 100 }])` is invoked
- **THEN** the method throws a validation error

#### Scenario: Domain purity
- **WHEN** unit tests run against the calculator
- **THEN** no Prisma, no fetch, no environment access is required
