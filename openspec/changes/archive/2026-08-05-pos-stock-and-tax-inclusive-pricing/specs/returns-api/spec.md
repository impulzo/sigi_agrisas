## MODIFIED Requirements

### Requirement: ReturnTotalsCalculator (domain service)
The system SHALL provide a pure domain service `ReturnTotalsCalculator` in `src/modules/returns/domain/services/ReturnTotalsCalculator.ts` with the same signature, formula, and rounding as `SaleTotalsCalculator` (half-to-even at 4 decimals) — including the tax-extraction formula (`lineSubtotal = round(lineGross / (1 + ivaRate + iepsRate), 4)`, `lineIva`/`lineIeps` computed from that extracted base, `lineTotal = lineGross`). The returned values represent refund amounts. A test of equivalence with `SaleTotalsCalculator` over a shared fixture (`tests/fixtures/totals-vectors.ts`) is required.

#### Scenario: Equivalence with SaleTotalsCalculator
- **WHEN** the same input is passed to both calculators
- **THEN** they return identical results for every line and the aggregated totals, including the extracted subtotal/IVA/IEPS breakdown

#### Scenario: Pure domain
- **WHEN** unit tests run against the calculator
- **THEN** no Prisma, no fetch, no environment access is required
