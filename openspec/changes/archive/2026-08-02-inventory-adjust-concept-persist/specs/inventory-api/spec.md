## MODIFIED Requirements

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
