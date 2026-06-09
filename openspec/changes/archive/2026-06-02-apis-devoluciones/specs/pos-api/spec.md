## MODIFIED Requirements

### Requirement: Get sale detail
The system SHALL expose `GET /api/v1/admin/sales/:id` that returns a single sale with its items. Requires `sales:read`. Returns HTTP 404 if not found. Branch scoping applies (a caller without `branches:access_all` can only fetch sales whose `branchId === x-user-branch-id`; otherwise HTTP 403).

`SaleDetailDto` extends `SaleDto` with:

- `items: SaleItemDto[]`, each including `id`, `productId`, `productPriceId` (or `null`), `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `lineSubtotal`, `lineTax`, `lineTotal`.
- `quoteId: string | null` (unchanged from `add-quotes-crud`).
- `returnedQuantityBySaleItem: Record<string, number>` — a map keyed by `sale_item.id` whose value is the SUM of `return_items.quantity` across all returns linked to this sale where `returns.status='completed'`. Keys for `sale_items` with no completed returns are OMITTED (consumers SHALL interpret "absent key" as `0`). Cancelled returns do NOT contribute to this aggregate.

#### Scenario: Authorized fetch
- **WHEN** a caller with `sales:read` and access to the sale's branch fetches a valid `:id`
- **THEN** the system returns HTTP 200 with the `SaleDetailDto` (including `quoteId` and `returnedQuantityBySaleItem`)

#### Scenario: Out-of-branch fetch
- **WHEN** a caller without `branches:access_all` fetches a sale whose `branchId !== x-user-branch-id`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404 `{"error": "Sale not found"}`

#### Scenario: No returns on any line
- **WHEN** the sale has no `returns` rows (or only cancelled ones)
- **THEN** `returnedQuantityBySaleItem` is `{}` (empty record)

#### Scenario: Partial returns reported
- **WHEN** the sale has 3 items A, B, C and one `completed` return that returned 2 of A and 1 of C
- **THEN** `returnedQuantityBySaleItem` is `{ "<itemAId>": 2, "<itemCId>": 1 }` — B is absent (zero)

#### Scenario: Multiple completed returns aggregate per line
- **WHEN** the sale has item A returned twice (3 then 2, both completed)
- **THEN** `returnedQuantityBySaleItem["<itemAId>"] === 5`

#### Scenario: Cancelled return excluded from aggregate
- **WHEN** the sale has item A returned (4, status `completed`) and then that return is cancelled
- **THEN** `returnedQuantityBySaleItem["<itemAId>"]` is absent (cancelled returns contribute zero)

#### Scenario: Aggregate query is not paginated
- **WHEN** the sale has 50 returns across many lines (unusual but legal)
- **THEN** the aggregate still reflects the total per line; the query is a single `SUM`-grouped read against `return_items` joined to `returns`

---

### Requirement: Cancel sale
The system SHALL expose `POST /api/v1/admin/sales/:id/cancel`. Requires `sales:cancel`. Body MAY include `reason: string | null` (max 500 chars). Branch scoping applies (callers without `branches:access_all` can only cancel sales in their assigned branch).

Behavior (inside a Prisma transaction):

- If `sale.status === 'cancelled'`: the operation is idempotent — returns HTTP 200 with the unchanged `SaleDetailDto` and the original `cancelledAt`/`cancellationReason`.
- If `sale.status === 'completed'` or `'edited'`: for each item, `UPDATE branch_inventory SET quantity = quantity + ${qty}, updated_at = NOW() WHERE branch_id = ? AND product_id = ?` (restores stock). Then `UPDATE sales SET status='cancelled', cancelled_at=NOW(), cancellation_reason=?`.

The folio is NOT reusable — the folio number stays consumed.

**Interaction with returns**: cancelling a sale that has one or more `completed` returns DOES NOT cancel those returns and DOES NOT double-restore stock. The cancellation restores ONLY the stock matching the CURRENT `sale_items.quantity` (the original sold quantity). Returns continue to exist as standalone records; the operator who wants a fully clean state can cancel each return separately (which decrements stock back) BEFORE cancelling the sale. **Recommended order documented**: cancel returns first, then cancel the sale. The system does NOT enforce this order in v1 — if the sale is cancelled while completed returns exist, the resulting stock will be inflated relative to the post-return state by exactly the returned amount (the returns previously incremented stock; the cancel sale now also increments stock by the full sold quantity). Operators are expected to reconcile manually until a future change introduces a guard.

#### Scenario: Cancel completed sale
- **WHEN** an authorized caller cancels a `completed` sale with items totalling X units
- **THEN** the system returns HTTP 200, the sale `status` becomes `cancelled`, and `branch_inventory.quantity` for each item is incremented by the respective quantity

#### Scenario: Cancel idempotent
- **WHEN** the same sale is cancelled twice
- **THEN** the second call returns HTTP 200 with no further side effects; `cancelled_at` and `cancellation_reason` remain from the first call

#### Scenario: Cancel edited sale restores edited items
- **WHEN** a sale was previously edited (status `edited`) and is now cancelled
- **THEN** the system restores stock based on the items currently in `sale_items` (the post-edit version) and sets `status='cancelled'`

#### Scenario: Cancel sale with returns (inflation risk documented)
- **WHEN** a `completed` sale had 10 units of product P sold, a `completed` return was registered for 4 units (stock incremented by 4), and the sale is then cancelled
- **THEN** the sale cancellation increments stock by the full 10 sold units; net effect on inventory is `+14` from a pre-sale-pre-return baseline. The two `Return` rows are unaffected. The operator is expected to reconcile (typically by cancelling the return first; v1 does not enforce the order — see design.md Risks).

#### Scenario: Out-of-branch cancellation
- **WHEN** an `operator` in branch B1 tries to cancel a sale whose `branchId = B2` and the operator lacks `branches:access_all`
- **THEN** the system returns HTTP 403

#### Scenario: Sale not found
- **WHEN** the `:id` does not match any sale
- **THEN** the system returns HTTP 404

#### Scenario: Folio stays consumed
- **WHEN** a sale with `folio_number = 1024` is cancelled
- **THEN** the next emitted sale on the same folio takes `folio_number = 1025`, not `1024`
