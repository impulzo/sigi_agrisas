## ADDED Requirements

### Requirement: Product availability gate on sale creation and edit
When the inventory scope mode (`inventory-api` — Configurable inventory scope mode) is `branch`, creating a sale (`POST /api/v1/admin/sales`) or editing a completed sale (`PATCH /api/v1/admin/sales/:id`) SHALL reject any line item whose `productId` has no `branch_inventory` row for the sale's `branchId`, with HTTP 400 and a distinct error identifying the unavailable product (`ProductNotAvailableInBranch`), separate from the existing "product not found or inactive" error. The check runs in the application layer, after the existing active-product check and before price/dosification resolution, so it cannot be bypassed by calling the API directly without going through the UI. The error message SHALL NOT reveal whether or where else the product is available.

When the inventory scope mode is `general`, this gate does not apply — sale creation and edit behave exactly as before this capability.

Cancelling a sale, or restoring stock as part of an edit, is unaffected by this gate — restoration always succeeds regardless of scope mode (see `inventory-api` — Sale movements do not auto-create missing branch inventory rows in branch scope mode).

#### Scenario: Sale rejects unassigned product in branch mode
- **WHEN** the inventory scope mode is `branch` and `POST /api/v1/admin/sales` includes a line item for a product with no `branch_inventory` row in the sale's `branchId`
- **THEN** the system returns HTTP 400 with a `ProductNotAvailableInBranch` error identifying the product, and creates no sale

#### Scenario: Sale succeeds for assigned product with zero stock
- **WHEN** the inventory scope mode is `branch` and the line item's product has a `branch_inventory` row in the sale's branch with `quantity = 0`
- **THEN** the availability gate passes (the sale may still go negative per the existing negative-stock rules in `inventory-api`)

#### Scenario: Gate does not apply in general mode
- **WHEN** the inventory scope mode is `general` and a sale includes a product with no `branch_inventory` row anywhere
- **THEN** the sale is created normally (unchanged behavior — the row is auto-created as before)

#### Scenario: Edit completed sale enforces the same gate
- **WHEN** the inventory scope mode is `branch` and `PATCH /api/v1/admin/sales/:id` replaces the line items with one referencing a product not assigned to the sale's branch
- **THEN** the system returns HTTP 400 `ProductNotAvailableInBranch` and does not apply the edit

#### Scenario: Cancellation is never blocked by this gate
- **WHEN** the inventory scope mode is `branch` and a completed sale is cancelled
- **THEN** the cancellation succeeds and restores stock regardless of whether the product's `branch_inventory` row still exists

#### Scenario: Direct API call cannot bypass the gate
- **WHEN** the inventory scope mode is `branch` and a client calls `POST /api/v1/admin/sales` directly (not through the POS UI) with an unassigned product
- **THEN** the system still returns HTTP 400 `ProductNotAvailableInBranch` — the gate is enforced in the application layer, not only in the client
