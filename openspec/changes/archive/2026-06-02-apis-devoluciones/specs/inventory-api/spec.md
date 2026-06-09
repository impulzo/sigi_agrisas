## MODIFIED Requirements

### Requirement: Negative quantity is allowed when originated by a sale
The column `branch_inventory.quantity` SHALL permit negative values. The DB-level CHECK constraint `quantity >= 0` on this column SHALL remain dropped (as established by the `add-pos` migration). Constraints `reserved_quantity >= 0` and `reorder_point >= 0` SHALL be preserved.

A negative `quantity` represents a stock obligation that must be settled by a future inter-branch transfer (the `branch_transfers` module, scoped for a later change). Negative stock is exclusively produced by the POS sale path (`CreateSaleUseCase` / `EditCompletedSaleUseCase` / `SaleRepository.createCompletedFromQuote` in `pos-api`) AND by the return cancellation path (`CancelReturnUseCase` in `returns-api`, when cancelling a return whose stock has been re-consumed by intervening sales). The admin endpoints `PATCH /inventory/:productId` and `POST /inventory/:productId/adjust` continue to reject negative results.

The return registration path (`CreateReturnUseCase` in `returns-api`) NEVER produces negative stock — it only increments. The return cancellation path MAY produce negative stock, mirroring the sale path's tolerance.

#### Scenario: List shows negative quantity
- **WHEN** a POS sale leaves `branch_inventory.quantity = -3` and an authorized user lists the inventory
- **THEN** the response includes the record with `quantity: -3` (no filtering)

#### Scenario: Admin PATCH still rejects negative
- **WHEN** an admin sends `PATCH /api/v1/admin/branches/:branchId/inventory/:productId` with `{ "quantity": -5 }`
- **THEN** the system returns HTTP 400 (the controller validates `quantity >= 0` via Zod; the column accepts the value but the API does not)

#### Scenario: Admin adjust still rejects driving to negative
- **WHEN** an admin sends `POST /api/v1/admin/branches/:branchId/inventory/:productId/adjust` with `{ "delta": -10 }` against a record with `quantity = 5`
- **THEN** the system returns HTTP 409 (the WHERE clause `quantity + delta >= 0` prevents the update; the dropped CHECK does not weaken this path)

#### Scenario: belowReorder includes negative stock
- **WHEN** a record has `quantity = -2` and `reorder_point = 5`, and a list request includes `?belowReorder=true`
- **THEN** the record is included (`-2 < 5`)

#### Scenario: Return creation never produces negative stock
- **WHEN** `CreateReturnUseCase` runs and `branch_inventory.quantity = -5` for the returned product
- **THEN** after the increment, `quantity = -5 + returnedQty` — still negative if `returnedQty < 5`, but the operation succeeds (the return is a refund of physical product entering the warehouse; whatever the prior debt, the inventory rises)

#### Scenario: Return cancellation may drive stock negative
- **WHEN** `CancelReturnUseCase` runs and the inventory available for the returned product is less than the quantity being un-returned (because sales consumed it in the meantime)
- **THEN** the row is updated to a negative `quantity` and the cancellation succeeds — the negative represents the real-world inventory debt to be settled
