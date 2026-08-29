# Spec: inventory-api

## Purpose

Define the Branch Inventory API: per-branch stock management with absolute-set and atomic-delta adjustment operations. Stock is always tracked per branch; no global aggregation is exposed.

---
## Requirements
### Requirement: List branch inventory
The system SHALL expose `GET /api/v1/admin/branches/:branchId/inventory` that returns a paginated list of products in the branch's inventory. Requires the `inventory:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `search` (optional, min 2 chars; matches `product.code` OR `product.name` via `OR ILIKE`), `belowReorder` (default `false`; when `true` returns only records where `quantity < reorder_point`).

Response: `{ items: BranchInventoryDto[], total: number, page: number, pageSize: number }`. Each `BranchInventoryDto` includes `id`, `branchId`, `productId`, `productCode` (joined), `productName` (joined), `quantity`, `reservedQuantity`, `reorderPoint`, `updatedAt`, `nearestExpirationDate`, `nearestExpirationLotNumber`, `expiryStatus` (the three new fields per capability `inventory-lots`; `null` when the product has no `inventory_lots` records for that branch). Returns HTTP 404 if `:branchId` does not match any branch.

#### Scenario: Admin lists branch inventory
- **WHEN** an authenticated user with `inventory:read` sends `GET /api/v1/admin/branches/<uuid>/inventory`
- **THEN** the system returns HTTP 200 with the inventory rows joined with product info

#### Scenario: Filter products below reorder point
- **WHEN** the request includes `?belowReorder=true`
- **THEN** only rows where `quantity < reorder_point` are returned

#### Scenario: Search by product code or name
- **WHEN** the request includes `?search=arroz`
- **THEN** only rows whose `product.code` or `product.name` contain "arroz" are returned (case-insensitive)

#### Scenario: Branch not found
- **WHEN** the `:branchId` does not match any branch
- **THEN** the system returns HTTP 404

#### Scenario: Forbidden
- **WHEN** an authenticated user without `inventory:read` calls the endpoint
- **THEN** the system returns HTTP 403

#### Scenario: List includes expiry status when lots are registered
- **WHEN** a listed product has one or more `inventory_lots` records for that branch
- **THEN** its `BranchInventoryDto` includes `nearestExpirationDate` (the closest one), `nearestExpirationLotNumber`, and `expiryStatus` computed per capability `inventory-lots`

#### Scenario: List omits expiry status when no lots are registered
- **WHEN** a listed product has no `inventory_lots` records for that branch
- **THEN** its `BranchInventoryDto` returns `nearestExpirationDate: null`, `nearestExpirationLotNumber: null`, `expiryStatus: null`

---

### Requirement: Get branch inventory item
The system SHALL expose `GET /api/v1/admin/branches/:branchId/inventory/:productId`. Requires `inventory:read`. Returns the single `BranchInventoryDto` for the (branch, product) pair, including `nearestExpirationDate`, `nearestExpirationLotNumber`, `expiryStatus` (same semantics as the list endpoint), or HTTP 404 if no record exists.

#### Scenario: Get existing inventory item
- **WHEN** the request targets an existing (branch, product) pair
- **THEN** the system returns HTTP 200 with the dto, including its expiry status fields

#### Scenario: Inventory record not found
- **WHEN** no record exists for the pair
- **THEN** the system returns HTTP 404 `{"error": "Inventory record not found"}`

#### Scenario: Branch or product missing
- **WHEN** either `:branchId` or `:productId` is not a valid UUID
- **THEN** the system returns HTTP 400

---

### Requirement: Create branch inventory item
The system SHALL expose `POST /api/v1/admin/branches/:branchId/inventory`. Requires `inventory:write`. Required body: `productId: string` (UUID of an existing active product). Optional: `quantity` (decimal >= 0, default 0), `reservedQuantity` (decimal >= 0, default 0), `reorderPoint` (decimal >= 0, default 0). The combination `(branch_id, product_id)` SHALL be UNIQUE; duplicate returns HTTP 409.

#### Scenario: Initialize inventory with stock
- **WHEN** the body is `{ "productId": "<uuid>", "quantity": 50, "reorderPoint": 10 }`
- **THEN** the system returns HTTP 201 with the new record

#### Scenario: Initialize with zero stock
- **WHEN** the body is `{ "productId": "<uuid>" }`
- **THEN** the system returns HTTP 201 with `quantity: 0`, `reservedQuantity: 0`, `reorderPoint: 0`

#### Scenario: Duplicate inventory item
- **WHEN** an inventory record already exists for the (branch, product) pair
- **THEN** the system returns HTTP 409

#### Scenario: Product not found or inactive
- **WHEN** the `productId` does not exist or `isActive = false`
- **THEN** the system returns HTTP 400 (do not allow stock for non-sellable products)

#### Scenario: Branch not found
- **WHEN** the URL `:branchId` is invalid or non-existent
- **THEN** the system returns HTTP 404 (when invalid format) or HTTP 400 (when no such branch)

---

### Requirement: Update branch inventory item (absolute set)
The system SHALL expose `PATCH /api/v1/admin/branches/:branchId/inventory/:productId`. Requires `inventory:write`. Body MAY include `quantity`, `reservedQuantity`, `reorderPoint` (each is a decimal >= 0). At least one field required. All provided values are absolute (not deltas). Returns HTTP 200 with the updated dto.

This endpoint is intended for capture corrections and initial setup; for transactional ADD/SUBTRACT operations use the `adjust` endpoint.

#### Scenario: Set absolute quantity
- **WHEN** the body is `{ "quantity": 100 }`
- **THEN** the system overwrites `quantity` and returns HTTP 200

#### Scenario: Negative value rejected
- **WHEN** the body is `{ "quantity": -5 }`
- **THEN** the system returns HTTP 400

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400

---

### Requirement: Adjust stock (atomic delta)
The system SHALL expose `POST /api/v1/admin/branches/:branchId/inventory/:productId/adjust`. Requires `inventory:write`. Body: `delta: number` (any signed decimal). Optional: `reason: string` (max 200 chars) — when provided and `delta !== 0`, it SHALL be persisted as `notes` on the `InventoryMovement` row recorded for this adjustment (see `inventory-movements` spec), making it retrievable via the Kardex (`inventory-kardex-api`/`inventory-kardex-ui`). This endpoint preserves its original semantics: deltas that would cause `quantity` to fall below `0` SHALL be rejected with HTTP 409 `{"error": "Negative stock not allowed"}` WITHOUT modifying the row, EVEN AFTER the database CHECK constraint `quantity >= 0` is removed by the `add-pos` migration. The protection lives in the SQL `WHERE quantity + ${delta} >= 0` clause executed by the controller.

This endpoint is intended for capture corrections and initial setup by administrators. Sale-driven decrements DO NOT use this endpoint; the POS module performs its own atomic updates without the negative-stock guard (see `pos-api`).

Branch scoping applies: callers without `branches:access_all` may only invoke this endpoint when `:branchId === x-user-branch-id`; mismatch returns HTTP 403.

**Low-stock notification**: after a successful adjustment whose `delta < 0` (a decrement), the system SHALL evaluate the low-stock notification trigger per `admin-notifications-api` "Notify admin on low stock" (best-effort, never blocks or fails this endpoint). Positive adjustments (`delta > 0`) never trigger this check. The debounce state for this trigger is persisted on `branch_inventory.lastLowStockNotifiedAt` (nullable `TIMESTAMP(3)`, see `admin-notifications-api`) — read-only via this endpoint's response, never accepted as input.

#### Scenario: Positive adjustment
- **WHEN** the current quantity is `50` and the body is `{ "delta": 10 }`
- **THEN** the system returns HTTP 200 with `quantity: 60`

#### Scenario: Negative adjustment within stock
- **WHEN** the current quantity is `50` and the body is `{ "delta": -10 }`
- **THEN** the system returns HTTP 200 with `quantity: 40`

#### Scenario: Negative adjustment exceeding stock
- **WHEN** the current quantity is `5` and the body is `{ "delta": -10 }`
- **THEN** the system returns HTTP 409 `{"error": "Negative stock not allowed"}` and the row is NOT modified — even though the column-level CHECK constraint has been dropped, the WHERE clause in the controller still enforces non-negativity for the admin path

#### Scenario: Concurrent adjustments
- **WHEN** two concurrent requests both attempt `{ "delta": -3 }` against a row with `quantity = 5`
- **THEN** one returns HTTP 200 (with new quantity `2`) and the other returns HTTP 409 (since the WHERE clause filters atomically); BOTH NEVER succeed if either would produce a negative result

#### Scenario: Inventory record not found
- **WHEN** the (branch, product) pair has no inventory record
- **THEN** the system returns HTTP 404

#### Scenario: Reason field is accepted but not persisted
**Superseded** by the two scenarios below — this behavior no longer applies. `reason` IS now persisted as `notes`; this scenario title is kept only so the archive tooling can detect it was intentionally replaced, not accidentally dropped (there is no `RENAMED` support for scenarios in this repository's OpenSpec tooling).

#### Scenario: Reason field is persisted as the movement's concept
- **WHEN** the body includes `{ "delta": 5, "reason": "Recepción factura 123" }`
- **THEN** the system applies the delta AND persists `reason` as `notes` on the `adjustment_in` `InventoryMovement` row created for this adjustment, retrievable later via `GET /inventory/kardex`

#### Scenario: Adjustment without reason persists a null concept
- **WHEN** the body includes `{ "delta": 5 }` (no `reason`)
- **THEN** the recorded `InventoryMovement` has `notes: null`

#### Scenario: Out-of-branch caller is forbidden
- **WHEN** an `operator` with `x-user-branch-id = B1` calls the endpoint with `:branchId = B2` and does not have `branches:access_all`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: Negative adjustment crossing reorder point triggers admin notification
- **WHEN** the body is `{ "delta": -5 }` and the resulting quantity is below `reorder_point`, with no notification for that (branch, product) sent in the last 24h
- **THEN** the system still returns HTTP 200 as normal, AND — per `admin-notifications-api` — an email is sent to the configured admin address and `lastLowStockNotifiedAt` is updated; a failure to send this email does NOT affect the HTTP 200 response

#### Scenario: Positive adjustment never triggers low-stock notification
- **WHEN** the body is `{ "delta": 10 }` (a positive adjustment), regardless of the resulting quantity relative to `reorder_point`
- **THEN** the system does not evaluate or send a low-stock notification for this request

### Requirement: Negative quantity is allowed when originated by a sale
The column `branch_inventory.quantity` SHALL permit negative values. The DB-level CHECK constraint `quantity >= 0` on this column SHALL remain dropped (as established by the `add-pos` migration). Constraints `reserved_quantity >= 0` and `reorder_point >= 0` SHALL be preserved.

A negative `quantity` represents a stock obligation that MUST be settled by an inter-branch waybill (`waybills-api`, capability `waybills-api` — Complemento Carta Porte Traslado between own branches). Negative stock is exclusively produced by the POS sale path (`CreateSaleUseCase` / `EditCompletedSaleUseCase` / `SaleRepository.createCompletedFromQuote` in `pos-api`) AND by the return cancellation path (`CancelReturnUseCase` in `returns-api`, when cancelling a return whose stock has been re-consumed by intervening sales) AND by the waybill cancellation path (`CancelWaybillUseCase` in `waybills-api`, when the destination branch already re-consumed the transferred stock). The admin endpoints `PATCH /inventory/:productId` and `POST /inventory/:productId/adjust` continue to reject negative results.

Unlike the sale path, `waybills-api`'s CREATE path (`POST /waybills`) SHALL NOT tolerate negative results at the origin branch — a waybill moves physical goods that must actually be present, so insufficient stock at origin is rejected with HTTP 409 `InsufficientStockAtOrigin` rather than allowed to go negative. Only the CANCEL path of a waybill (reversing a transfer, decrementing the destination) tolerates negative, mirroring the sale/return cancellation paths.

The return registration path (`CreateReturnUseCase` in `returns-api`) NEVER produces negative stock — it only increments. The return cancellation path and the waybill cancellation path MAY produce negative stock, mirroring the sale path's tolerance.

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

#### Scenario: Waybill settles negative stock via transfer
- **WHEN** branch B1 has `quantity = -5` for product P (from a prior oversold POS sale) and a waybill transfers `10` units of P from B2 to B1
- **THEN** B1's quantity becomes `5` and the negative obligation is settled

#### Scenario: Waybill creation rejects negative at origin
- **WHEN** a waybill attempts to transfer more units than the origin branch currently holds
- **THEN** the system returns HTTP 409 `InsufficientStockAtOrigin` and does not create the waybill (unlike a POS sale, which would allow the origin to go negative)

#### Scenario: Waybill cancellation may leave destination negative
- **WHEN** a completed waybill transferred stock to a destination branch, some of it was resold via POS, and the waybill is then cancelled
- **THEN** the destination branch's `quantity` is decremented by the full transferred amount, potentially going negative — mirroring `CancelSaleUseCase`'s tolerance

---

### Requirement: List/Get/Create/Update/Delete enforce branch scoping
The endpoints `GET /api/v1/admin/branches/:branchId/inventory`, `GET .../:productId`, `POST .../inventory`, `PATCH .../:productId`, `POST .../:productId/adjust`, and `DELETE .../:productId` SHALL enforce branch scoping per the pattern defined in `auth-middleware` and `rbac` (Requirement: branches:access_all bypass semantics). Callers without `branches:access_all` SHALL be limited to `:branchId === x-user-branch-id`; mismatch returns HTTP 403 `{ "error": "Forbidden", "required": "branches:access_all" }`. This requirement does NOT modify the existing inputs/outputs of these endpoints; it only adds the scoping gate as a precondition.

#### Scenario: Operator lists own branch
- **WHEN** an `operator` with `x-user-branch-id = B1` and `inventory:read` calls `GET /api/v1/admin/branches/B1/inventory`
- **THEN** the system returns HTTP 200

#### Scenario: Operator lists other branch
- **WHEN** an `operator` with `x-user-branch-id = B1` calls `GET /api/v1/admin/branches/B2/inventory`
- **THEN** the system returns HTTP 403 `{ "error": "Forbidden", "required": "branches:access_all" }`

#### Scenario: Admin lists any branch
- **WHEN** an `admin` with `branches:access_all` calls `GET /api/v1/admin/branches/<anyBranchId>/inventory`
- **THEN** the system returns HTTP 200 regardless of the admin's `x-user-branch-id`

#### Scenario: Scoping does not leak existence
- **WHEN** an unauthorized caller targets an inventory record in a branch they cannot access
- **THEN** the handler SHALL resolve the resource and return 404 if it does not exist BEFORE evaluating scoping; existence is revealed only to anyone with permission to look at that branch (HTTP 403 is returned only when the resource exists in another branch)

---

### Requirement: Delete branch inventory item
The system SHALL expose `DELETE /api/v1/admin/branches/:branchId/inventory/:productId`. Requires `inventory:write`. **Hard delete** — the row is removed. Returns HTTP 204. Use cases: a product is discontinued at a specific branch, or the row was created in error.

#### Scenario: Delete success
- **WHEN** the request targets an existing inventory record
- **THEN** the system returns HTTP 204 and the row is removed

#### Scenario: Inventory record not found
- **WHEN** no record exists for the pair
- **THEN** the system returns HTTP 404

---

### Requirement: No global stock
The system SHALL NOT expose any endpoint or query that returns a single "total stock per product" across branches as a primary aggregation. Stock is always reported per branch. A consumer that needs aggregated stock SHALL iterate branches explicitly or use a future analytics module.

#### Scenario: There is no /api/v1/admin/products/:id/stock endpoint
- **WHEN** an authenticated user GETs `/api/v1/admin/products/:id/stock`
- **THEN** the system returns HTTP 404 (the route does not exist)

#### Scenario: Aggregation is the consumer's responsibility
- **WHEN** the POS needs to display "total stock for product X across all branches"
- **THEN** the POS SHALL call `GET /branches/<id>/inventory/<productId>` per branch and aggregate client-side, OR a future analytics endpoint SHALL be added in a subsequent change

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

