## ADDED Requirements

### Requirement: Configurable inventory scope mode
The system SHALL support a deployment-level inventory scope mode, controlled by the environment variable `INVENTORY_SCOPE_MODE`, with two values: `general` (default — used when the variable is unset or holds any other value) and `branch`. The mode SHALL be read only by the infrastructure layer (repositories, DI containers, HTTP controllers); domain entities and application use cases SHALL receive the mode as an injected value, never read the environment directly.

In `general` mode, the system behaves exactly as before this capability was introduced: the product catalog is not filtered by branch, and any product can be sold, quoted, or moved in any branch regardless of `branch_inventory` rows.

In `branch` mode, a `branch_inventory` row for `(branch_id, product_id)` carries a second meaning beyond quantity: it represents that the product IS ASSIGNED to (available in) that branch. A row with `quantity = 0` means "assigned, no stock." The ABSENCE of a row means the product is not available in that branch. This assignment is consumed by `products-api` (catalog filtering) and by the sale/quote availability gates (`pos-api`, `quotes-api`).

No schema migration is required to introduce this mode — it reinterprets the existing `branch_inventory` table.

#### Scenario: Mode defaults to general when unset
- **WHEN** the environment variable `INVENTORY_SCOPE_MODE` is not set
- **THEN** the system operates in `general` mode — catalog and sales behavior identical to before this capability

#### Scenario: Mode defaults to general on unrecognized value
- **WHEN** `INVENTORY_SCOPE_MODE` is set to a value other than `branch` (e.g. a typo)
- **THEN** the system falls back to `general` mode rather than failing at startup

#### Scenario: Switching the mode requires no data migration
- **WHEN** an operator changes `INVENTORY_SCOPE_MODE` from `general` to `branch` (or back) and restarts the application
- **THEN** the change takes effect immediately with no migration step, and no `branch_inventory` row is created, deleted, or altered as a side effect of the mode switch itself

### Requirement: Sale movements do not auto-create missing branch inventory rows in branch scope mode
Historically, any inventory-affecting operation that found no existing `branch_inventory` row for `(branch_id, product_id)` would silently create one (quantity seeded from the movement's delta). This auto-creation remains the behavior for all inventory-affecting operations EXCEPT: when the inventory scope mode is `branch`, the OUT movements produced by a POS sale (`sale`, `sale_edit_apply` movement types in `pos-api`) SHALL NOT auto-create a missing row — the sale MUST be rejected before reaching this point by the availability gate defined in `pos-api` (Requirement: Product availability gate on sale creation and edit). If that gate is somehow bypassed, the underlying write fails rather than silently materializing an unassigned product into the branch.

Restoration movements — `sale_cancel`, `sale_edit_restore` (`pos-api`), and `return` (`returns-api`) — ALWAYS retain the auto-creation behavior, in both scope modes, so that cancelling a sale or registering a return never fails because the original row was removed in the meantime.

Purchases, waybills (transfers), and admin adjustments/assignments are unaffected by this requirement in either mode — they remain the legitimate ways to introduce a product into a branch's inventory.

#### Scenario: Sale OUT movement does not create a row in branch mode
- **WHEN** the inventory scope mode is `branch` and (hypothetically bypassing the application-level gate) a `sale` movement is recorded for a `(branch_id, product_id)` pair with no existing `branch_inventory` row
- **THEN** the write fails rather than creating the row

#### Scenario: Sale OUT movement still auto-creates in general mode
- **WHEN** the inventory scope mode is `general` and a `sale` movement is recorded for a pair with no existing row
- **THEN** the row is created with the movement's delta, exactly as before this capability (unchanged behavior)

#### Scenario: Sale cancellation always restores, even without a prior row
- **WHEN** the inventory scope mode is `branch`, a sale is cancelled, and its `branch_inventory` row was deleted (e.g. via `DELETE .../inventory/:productId`) after the sale but before the cancellation
- **THEN** the `sale_cancel` restoration movement succeeds and creates the row

#### Scenario: Purchases and waybills remain unaffected
- **WHEN** the inventory scope mode is `branch` and a purchase or a waybill transfer targets a `(branch_id, product_id)` pair with no existing row
- **THEN** the row is created as before — these remain legitimate assignment paths
