## MODIFIED Requirements

### Requirement: List product dosifications with computed unit price
The system SHALL expose `GET /api/v1/admin/products/:id/dosifications`. Requires `products:read`. Returns `{ items: ProductDosificationDto[] }`. Each `ProductDosificationDto` includes `id`, `productId`, `name`, `numParts`, `isActive`, `computedUnitPrice: number | null`, `requiresDefaultPrice: boolean`, `createdAt`, `updatedAt`.

The `computedUnitPrice` is computed by the domain service `DosificationPriceCalculator` using the product's default price (`is_default = true`) as `basePrice`, and the surcharge percentage currently configured in `settings-api` (`GET /settings/pricing` → `dosificationSurchargePct`, default `5.0` when unconfigured). Formula: `basePrice / numParts * (1 + dosificationSurchargePct / 100)`. If the product has no default price, `computedUnitPrice` is `null` and `requiresDefaultPrice` is `true`.

#### Scenario: With default price
- **WHEN** the product has a default price of `100.00`, a dosification with `numParts=10`, and no `pricing_settings` row exists yet
- **THEN** the response includes that dosification with `computedUnitPrice ≈ 10.50` (100 / 10 * 1.05, using the 5% default) and `requiresDefaultPrice: false`

#### Scenario: With a configured surcharge
- **WHEN** an admin has configured `dosificationSurchargePct = 8` via `PATCH /settings/pricing`, and the product has a default price of `100.00` with a dosification of `numParts=10`
- **THEN** the response includes `computedUnitPrice ≈ 10.80` (100 / 10 * 1.08)

#### Scenario: Without default price
- **WHEN** the product has no `is_default = true` price
- **THEN** the response includes each dosification with `computedUnitPrice: null` and `requiresDefaultPrice: true`

#### Scenario: Inactive dosifications included by default
- **WHEN** the product has dosifications with `is_active = false`
- **THEN** the response includes them (no filtering in the list endpoint; UI filters as needed)

---

### Requirement: Dosification price calculator (domain service)
The system SHALL provide a pure domain service `DosificationPriceCalculator` with a single static method `computeUnitPrice(basePrice: number, numParts: number, surchargePct: number): number` that returns `(basePrice / numParts) * (1 + surchargePct / 100)`. The surcharge percentage is NOT a hardcoded constant — the caller resolves it from the current `pricing_settings` configuration (default `5.0`) and passes it explicitly. The method SHALL throw if `numParts < 1`. The service SHALL have no I/O dependencies (no DB, no HTTP) — resolving the configured percentage happens in the caller, not inside this pure function.

#### Scenario: Standard calculation
- **WHEN** `computeUnitPrice(100, 10, 5)` is invoked
- **THEN** the result is `10.5` (within floating-point precision)

#### Scenario: Standard calculation with a custom surcharge
- **WHEN** `computeUnitPrice(100, 10, 7)` is invoked
- **THEN** the result is `10.7` (within floating-point precision) — the same numeric behavior as the old fixed-7% formula, now parameterized

#### Scenario: With decimals
- **WHEN** `computeUnitPrice(99.99, 7, 5)` is invoked
- **THEN** the result is approximately `14.9985` (`99.99 / 7 * 1.05`)

#### Scenario: Zero base price
- **WHEN** `computeUnitPrice(0, 10, 5)` is invoked
- **THEN** the result is `0`

#### Scenario: Reject invalid numParts
- **WHEN** `computeUnitPrice(100, 0, 5)` or `computeUnitPrice(100, -1, 5)` is invoked
- **THEN** the method throws an Error

#### Scenario: Domain purity
- **WHEN** unit tests are run against the calculator
- **THEN** no Prisma, no fetch, no environment access is required
