## MODIFIED Requirements

### Requirement: Negative quantity is allowed when originated by a sale
The column `branch_inventory.quantity` SHALL permit negative values. The DB-level CHECK constraint `quantity >= 0` on this column SHALL remain dropped (as established by the `add-pos` migration). Constraints `reserved_quantity >= 0` and `reorder_point >= 0` SHALL be preserved.

A negative `quantity` represents a stock obligation that MUST be settled by an inter-branch waybill (`waybills-api`, capability `waybills-api` — Complemento Carta Porte Traslado between own branches). Negative stock is exclusively produced by the POS sale path (`CreateSaleUseCase` / `EditCompletedSaleUseCase` / `SaleRepository.createCompletedFromQuote` in `pos-api`) AND by the return cancellation path (`CancelReturnUseCase` in `returns-api`, when cancelling a return whose stock has been re-consumed by intervening sales) AND by the waybill cancellation path (`CancelWaybillUseCase` in `waybills-api`, when the destination branch already re-consumed the transferred stock). The admin endpoints `PATCH /inventory/:productId` and `POST /inventory/:productId/adjust` continue to reject negative results.

Unlike the sale path, `waybills-api`'s CREATE path (`POST /waybills`) SHALL NOT tolerate negative results at the origin branch — a waybill moves physical goods that must actually be present, so insufficient stock at origin is rejected with HTTP 409 `InsufficientStockAtOrigin` rather than allowed to go negative. Only the CANCEL path of a waybill (reversing a transfer, decrementing the destination) tolerates negative, mirroring the sale/return cancellation paths.

The return registration path (`CreateReturnUseCase` in `returns-api`) NEVER produces negative stock — it only increments. The return cancellation path and the waybill cancellation path MAY produce negative stock, mirroring the sale path's tolerance.

#### Scenario: Waybill settles negative stock via transfer
- **WHEN** branch B1 has `quantity = -5` for product P (from a prior oversold POS sale) and a waybill transfers `10` units of P from B2 to B1
- **THEN** B1's quantity becomes `5` and the negative obligation is settled

#### Scenario: Waybill creation rejects negative at origin
- **WHEN** a waybill attempts to transfer more units than the origin branch currently holds
- **THEN** the system returns HTTP 409 `InsufficientStockAtOrigin` and does not create the waybill (unlike a POS sale, which would allow the origin to go negative)

#### Scenario: Waybill cancellation may leave destination negative
- **WHEN** a completed waybill transferred stock to a destination branch, some of it was resold via POS, and the waybill is then cancelled
- **THEN** the destination branch's `quantity` is decremented by the full transferred amount, potentially going negative — mirroring `CancelSaleUseCase`'s tolerance
