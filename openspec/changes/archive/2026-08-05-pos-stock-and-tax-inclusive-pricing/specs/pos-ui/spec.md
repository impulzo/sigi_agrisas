## ADDED Requirements

### Requirement: Cart totals always show IVA and IEPS lines
`CartTotals` (used by the POS cart, sale detail, quote detail, return detail, and quote emit panel) SHALL always render a "IVA" line and an "IEPS" line, regardless of whether their computed value is greater than zero. Previously these lines were hidden when the value equaled `0`.

#### Scenario: Cart with no taxable products
- **WHEN** every line in the cart has `isTaxable=false` (or `ivaRate=iepsRate=0`)
- **THEN** `CartTotals` still renders "IVA: $0.00" and "IEPS: $0.00"

#### Scenario: Cart with IVA only, no IEPS
- **WHEN** all cart lines have `ivaRate > 0` and `iepsRate = 0`
- **THEN** `CartTotals` renders both "IVA: $X.XX" and "IEPS: $0.00" — the IEPS line is not hidden
