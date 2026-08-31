## MODIFIED Requirements

### Requirement: Partial standalone invoice ("Factura parcial") does not affect inventory
`PartialInvoiceForm` SHALL build a standalone CFDI **without `saleId`**. It SHALL collect:
- A receiver via `CustomerPicker` (reading `rfc`, `name`, `cfdiUse`, `taxRegime`→`fiscalRegime`, `taxZipCode`). When fiscal data is incomplete the form SHALL block submit and list the missing fields inline.
- When the session user has `branches:access_all`, the form SHALL render a branch selector (`<select>`), populated from `GET /admin/branches?pageSize=100&includeInactive=false` (same endpoint and criterion as `pos-ui`'s `PosPage` branch selector), with no branch preselected. When the session user does NOT have `branches:access_all`, the selector SHALL NOT render — the form uses the user's own `branchId` silently, unchanged from today.
- One or more lines added either from the product catalog (`ProductCatalogPanel`/`ProductCatalogTable`) or as **free lines** ("Agregar línea libre", no `productId`, manual `description` + `satProductCode`). A catalog line SHALL be added with its default price preselected: `unitPrice` SHALL be initialized from `prices.find(p => p.isDefault) ?? prices[0]` (same fallback criterion as `pos-ui`'s `PriceTierPicker`) fetched via `getProductPrices(productId, effectiveBranchId)` — where `effectiveBranchId` resolves to the session's own `branchId` for users without `branches:access_all`, or to the branch explicitly chosen in the selector for users with `branches:access_all` (`null` if nothing has been chosen yet), falling back to `null` when neither resolves — the same `effectiveBranchId` and the same criterion the price-tier selector below already uses, so both call sites see the same effective set of prices (global + the effective branch's overrides). Result is `0` if the resolved query returns no prices at all. Each catalog line (`PartialInvoiceLineRow`) SHALL render a price-tier selector (reusing `PriceTierPicker`) letting the user switch among the product's available `ProductPrice` entries fetched via the same `getProductPrices(productId, effectiveBranchId)` call — selecting a different tier SHALL update the line's `unitPrice` to that tier's price. Free lines SHALL NOT render a price-tier selector — they keep manual `unitPrice` entry, unchanged. Every line SHALL allow editing `quantity`, `unitPrice` (manually, in addition to the tier selector for catalog lines), `discountPct`, `ivaRate`, `iepsRate`, and each of these 5 numeric fields SHALL support being fully cleared while editing (no forced `0` reappearing on each keystroke) — normalization to a numeric value SHALL occur only on blur. For free lines, `satProductCode` SHALL be validated to be either empty or exactly 8 digits (`^\d{8}$`) — a partially-typed value (non-empty, not matching the full pattern) SHALL block submit with an inline error identifying the line, preventing the equivalent backend Zod rejection from ever being reached.

It SHALL show live totals computed by the shared `computeTotalsClient` (banker's rounding) and a visible note **"La factura parcial no afecta inventario"**. Before submit, the form SHALL block and show an inline error if any line with a non-null `productId` has `unitPrice <= 0` (empty treated as `0` for this check) — free lines are exempt from this check. On submit it SHALL call `POST /api/v1/admin/invoices { customer, items[], paymentForm?, paymentMethod? }` via `stampInvoice` and navigate to `/billing/[id]`. The branch selector's value SHALL NOT be sent in this payload — it is a UI-only concern for resolving catalog prices, mirroring that `Invoice` does not persist `branchId`.

Because the payload carries no `saleId`, the request SHALL reach the backend standalone path, which performs no inventory movement.

#### Scenario: Build and stamp a partial invoice
- **WHEN** the user picks a fiscally-complete customer, adds two catalog lines (each keeping its preselected default price), and confirms
- **THEN** `POST /invoices` SHALL be sent with `{ customer, items: [...] }` and **without** `saleId`, and on 201 navigate to `/billing/[id]`

#### Scenario: Branch selector visible for users with branches:access_all
- **WHEN** the session user has `branches:access_all` and opens "Factura parcial"
- **THEN** a branch selector renders, populated with all active branches, with no branch preselected

#### Scenario: Branch selector hidden for users scoped to their own branch
- **WHEN** the session user does NOT have `branches:access_all` and has an own `branchId`
- **THEN** no branch selector renders, and `effectiveBranchId` resolves silently to the user's own `branchId` — unchanged from before this change

#### Scenario: Catalog line preselects the default price
- **WHEN** the user adds a product that has a `ProductPrice` marked `isDefault: true`
- **THEN** the line is added with `unitPrice` equal to that default price's value, not `0`

#### Scenario: Catalog line whose only price is branch-scoped loads once the matching branch is selected
- **WHEN** a user with `branches:access_all` selects a branch in the selector, then adds a product whose only `ProductPrice` row is scoped to that same branch (no accompanying global `branchId: null` row)
- **THEN** `getProductPrices` is called with that branch as `effectiveBranchId`, the branch-scoped price resolves as the line's default, and the form does NOT show "Este producto no tiene precios configurados."

#### Scenario: Catalog line without any price falls back to zero, still overridable
- **WHEN** the user adds a product with no `ProductPrice` records at all (global or branch-scoped)
- **THEN** the line is added with `unitPrice: 0` (unchanged fallback behavior) and remains editable manually or blocked at submit per the zero-price validation below

#### Scenario: Switching price tier updates unitPrice
- **WHEN** the user changes the price-tier selector on a catalog line from "Precio público" to "10"
- **THEN** the line's `unitPrice` updates to the "10" tier's price, and the footer totals recompute live, using the same `effectiveBranchId`-scoped price list the catalog "add" step used — no divergence between the two entry points

#### Scenario: No branch resolves (bypass user has not picked one, or non-bypass user has no own branchId)
- **WHEN** `effectiveBranchId` resolves to `null` — either because a `branches:access_all` user has not yet chosen a branch in the selector, or because a non-bypass user's session has no `branchId`
- **THEN** `getProductPrices` is called without a `branchId`, returning only global (`branchId: null`) prices — same behavior as before this change for this edge case, with no crash

#### Scenario: Changing the selected branch does not retroactively re-price existing lines
- **WHEN** a `branches:access_all` user has already added a line whose price resolved under a first selected branch, then changes the selector to a different branch
- **THEN** the already-added line's `unitPrice` SHALL NOT change — only subsequent catalog additions or tier changes use the newly selected branch

#### Scenario: Manual price reflected in totals
- **WHEN** the user changes a line `unitPrice` manually
- **THEN** the footer totals (subtotal/iva/ieps/total) SHALL recompute live via `computeTotalsClient`

#### Scenario: Numeric field can be fully cleared while editing
- **WHEN** the user selects all text in the `unitPrice` (or `quantity`/`discountPct`/`ivaRate`/`iepsRate`) input and presses delete
- **THEN** the input shows empty — it does NOT immediately snap back to `0`, and the user can type a new value (e.g. `150`) without first deleting a reappearing `0`

#### Scenario: Empty numeric field normalizes to zero on blur
- **WHEN** the user leaves a numeric field empty and moves focus away (blur)
- **THEN** the field's underlying value normalizes to `0` at that point, not while the field was being edited

#### Scenario: Submit blocked when a catalog line has zero price
- **WHEN** the user tries to submit with at least one catalog line (`productId` set) whose `unitPrice` is `0` or was left empty
- **THEN** the form blocks submission, shows an inline error identifying the offending line, and does NOT call `POST /invoices`

#### Scenario: Free line at zero price is allowed
- **WHEN** a free line (`productId: null`) has `unitPrice: 0`
- **THEN** submission is NOT blocked by the zero-price check (only catalog lines are checked)

#### Scenario: Inventory untouched
- **WHEN** a partial invoice is stamped
- **THEN** no inventory endpoint SHALL be called and the request SHALL omit `saleId` (the backend standalone path leaves `branch_inventory` unchanged)

#### Scenario: Customer fiscal data incomplete blocks submit
- **WHEN** the selected customer lacks `cfdiUse`, `taxRegime`, or `taxZipCode`
- **THEN** the form SHALL block submit and list the missing fiscal fields

#### Scenario: Customer with a null rfc does not crash the page
- **WHEN** the selected customer's `rfc` field is `null` (as returned by the customer search/quick-add API)
- **THEN** the form SHALL normalize it to an empty string, list "RFC" among the missing fiscal fields, and render normally — it SHALL NOT throw an unhandled exception

#### Scenario: Free line without product
- **WHEN** the user clicks "Agregar línea libre" and fills `description`, `unitPrice`, `satProductCode`
- **THEN** the line SHALL be added with `productId` null and included in the `items[]` payload

#### Scenario: Partial SAT product code blocks submit
- **WHEN** a free line's `satProductCode` is non-empty but does not match `^\d{8}$` (e.g. `"1234"`)
- **THEN** the form blocks submission, shows an inline error on that line, and does NOT call `POST /invoices`
