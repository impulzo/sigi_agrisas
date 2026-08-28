## ADDED Requirements

### Requirement: Product availability gate on quote creation and update
When the inventory scope mode (`inventory-api` — Configurable inventory scope mode) is `branch`, creating a quote (`POST /api/v1/admin/quotes`) or updating a draft quote (`PATCH /api/v1/admin/quotes/:id`) SHALL reject any line item whose `productId` has no `branch_inventory` row for the quote's `branchId`, with the same HTTP 400 `ProductNotAvailableInBranch` error defined in `pos-api` (Requirement: Product availability gate on sale creation and edit). This mirrors the sale-side gate so that a quote is not authorizable/convertible into a sale that would itself be rejected later.

When the inventory scope mode is `general`, this gate does not apply — quote creation and update behave exactly as before this capability.

#### Scenario: Quote creation rejects unassigned product in branch mode
- **WHEN** the inventory scope mode is `branch` and `POST /api/v1/admin/quotes` includes a line item for a product with no `branch_inventory` row in the quote's `branchId`
- **THEN** the system returns HTTP 400 `ProductNotAvailableInBranch` and creates no quote

#### Scenario: Draft quote update enforces the same gate
- **WHEN** the inventory scope mode is `branch` and `PATCH /api/v1/admin/quotes/:id` (status `draft`) replaces line items with one referencing a product not assigned to the quote's branch
- **THEN** the system returns HTTP 400 `ProductNotAvailableInBranch` and does not apply the update

#### Scenario: Gate does not apply in general mode
- **WHEN** the inventory scope mode is `general` and a quote includes a product with no `branch_inventory` row anywhere
- **THEN** the quote is created normally (unchanged behavior)

#### Scenario: Authorize and cancel are unaffected
- **WHEN** the inventory scope mode is `branch` and an already-created quote is authorized or cancelled
- **THEN** neither operation re-evaluates product availability — the gate only applies at creation, draft update, and conversion (see below), consistent with quotes having no inventory side-effects until conversion (`quotes-api` — No inventory side-effects in quote lifecycle)

### Requirement: Product availability gate on quote conversion
When the inventory scope mode is `branch`, converting an authorized quote to a sale (`POST /api/v1/admin/quotes/:id/convert`) SHALL re-check availability for every line item's `productId` against the quote's `branchId`, and reject with the same HTTP 400 `ProductNotAvailableInBranchError` used by sale and quote creation, before allocating a fiscal folio or touching inventory. This re-check exists because availability can change between quote creation/authorization and conversion — e.g. an administrator unassigns the product from the branch via `DELETE /inventory/:productId` after the quote was authorized. Without this requirement, conversion would only be stopped by the low-level write-layer guard in `inventory-api` (Sale movements do not auto-create missing branch inventory rows in branch scope mode), which throws an unhandled internal error instead of a clean 400.

#### Scenario: Conversion rejects a product unassigned since quote creation
- **WHEN** the inventory scope mode is `branch`, a quote was created and authorized while its product was assigned to the branch, the assignment was later removed, and `POST /api/v1/admin/quotes/:id/convert` is called
- **THEN** the system returns HTTP 400 `ProductNotAvailableInBranchError` and does not allocate a folio, decrement inventory, or mark the quote converted

#### Scenario: Conversion succeeds when availability is unchanged
- **WHEN** the inventory scope mode is `branch` and every line item's product remains assigned to the quote's branch at conversion time
- **THEN** conversion proceeds normally (unchanged behavior)

#### Scenario: Gate does not apply in general mode
- **WHEN** the inventory scope mode is `general`
- **THEN** conversion behaves exactly as before this capability, with no availability re-check
