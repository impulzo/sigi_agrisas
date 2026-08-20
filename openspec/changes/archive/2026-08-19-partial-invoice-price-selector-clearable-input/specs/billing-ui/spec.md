## MODIFIED Requirements

### Requirement: Partial standalone invoice ("Factura parcial") does not affect inventory
`PartialInvoiceForm` SHALL build a standalone CFDI **without `saleId`**. It SHALL collect:
- A receiver via `CustomerPicker` (reading `rfc`, `name`, `cfdiUse`, `taxRegime`→`fiscalRegime`, `taxZipCode`). When fiscal data is incomplete the form SHALL block submit and list the missing fields inline.
- One or more lines added either from the product catalog (`ProductCatalogPanel`/`ProductCatalogTable`) or as **free lines** ("Agregar línea libre", no `productId`, manual `description` + `satProductCode`). A catalog line SHALL be added with its default price preselected: `unitPrice` SHALL be initialized from `prices.find(p => p.isDefault) ?? prices[0]` (same fallback criterion as `pos-ui`'s `PriceTierPicker`) fetched via `getProductPrices(productId)`, or `0` if the product has no prices at all. Each catalog line (`PartialInvoiceLineRow`) SHALL render a price-tier selector (reusing `PriceTierPicker`) letting the user switch among the product's available `ProductPrice` entries — selecting a different tier SHALL update the line's `unitPrice` to that tier's price. Free lines SHALL NOT render a price-tier selector — they keep manual `unitPrice` entry, unchanged. Every line SHALL allow editing `quantity`, `unitPrice` (manually, in addition to the tier selector for catalog lines), `discountPct`, `ivaRate`, `iepsRate`, and each of these 5 numeric fields SHALL support being fully cleared while editing (no forced `0` reappearing on each keystroke) — normalization to a numeric value SHALL occur only on blur.

It SHALL show live totals computed by the shared `computeTotalsClient` (banker's rounding) and a visible note **"La factura parcial no afecta inventario"**. Before submit, the form SHALL block and show an inline error if any line with a non-null `productId` has `unitPrice <= 0` (empty treated as `0` for this check) — free lines are exempt from this check. On submit it SHALL call `POST /api/v1/admin/invoices { customer, items[], paymentForm?, paymentMethod? }` via `stampInvoice` and navigate to `/billing/[id]`.

Because the payload carries no `saleId`, the request SHALL reach the backend standalone path, which performs no inventory movement.

#### Scenario: Build and stamp a partial invoice
- **WHEN** the user picks a fiscally-complete customer, adds two catalog lines (each keeping its preselected default price), and confirms
- **THEN** `POST /invoices` SHALL be sent with `{ customer, items: [...] }` and **without** `saleId`, and on 201 navigate to `/billing/[id]`

#### Scenario: Catalog line preselects the default price
- **WHEN** the user adds a product that has a `ProductPrice` marked `isDefault: true`
- **THEN** the line is added with `unitPrice` equal to that default price's value, not `0`

#### Scenario: Catalog line without any price falls back to zero, still overridable
- **WHEN** the user adds a product with no `ProductPrice` records at all
- **THEN** the line is added with `unitPrice: 0` (unchanged fallback behavior) and remains editable manually or blocked at submit per the zero-price validation below

#### Scenario: Switching price tier updates unitPrice
- **WHEN** the user changes the price-tier selector on a catalog line from "Precio público" to "10"
- **THEN** the line's `unitPrice` updates to the "10" tier's price, and the footer totals recompute live

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

#### Scenario: Free line without product
- **WHEN** the user clicks "Agregar línea libre" and fills `description`, `unitPrice`, `satProductCode`
- **THEN** the line SHALL be added with `productId` null and included in the `items[]` payload
