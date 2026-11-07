## MODIFIED Requirements

### Requirement: Customer credit balance is read-only via this API

The `currentBalance` field SHALL be readable through `GET` endpoints but SHALL NOT be independently settable through `POST` or `PATCH` of `customers-api`. The mutation of `currentBalance` is OWNED by the `payments-api` module — whether the payment is tied to a specific sale (`saleId` not null, decremented/incremented via the sale-scoped flow) or registered as an **account payment with no ticket** (`saleId` null, decremented/incremented via `POST /api/v1/admin/customers/:id/payments`, bounded by `accountDebt` so it can never settle a ticket's debt) — by the credit branch of the POS API (`POST /sales` with `isCredit=true`), and by the `initialBalance` field of this very module (`customers-api`) at creation and update time — **the only three owners**. The account-payment path does not introduce a fourth owner: it is still `payments-api` mutating `currentBalance`, just without an associated `Sale`.

- `customers-api` SHALL silently ignore any `currentBalance` field in `POST /customers` and `PATCH /customers/:id` bodies (consistent with prior behavior); it SHALL instead derive `currentBalance` from `initialBalance` as described in the Create/Update requirements above.
- `payments-api` SHALL mutate `currentBalance` atomically when registering or cancelling a `CustomerPayment` (decrement on register, increment on cancel), regardless of whether that `CustomerPayment` is tied to a `Sale` (`saleId` not null) or is an account payment (`saleId` null).
- `pos-api` SHALL mutate `currentBalance` atomically when creating a sale whose `paymentMethod.isCredit=true` (increment by `sale.total`), when cancelling such a credit sale that has no active payments (decrement by remaining due), and when editing a sale (delta computed from old/new `paymentMethod.isCredit` and totals — see `pos-api` for the precise formula).
- `currentBalance` SHALL NEVER be negative; the application enforces the invariant in the payments and POS use cases. (`initialBalance` itself is bounded `>= 0`, so it cannot introduce a negative `currentBalance`.)
- The portion of `currentBalance` that does NOT correspond to any pending credit sale (e.g. `initialBalance` set at customer creation, with no associated ticket) SHALL only be payable through the account-payment path (`saleId` null); it is structurally unreachable through the sale-scoped payment path, which always requires a real, pending credit `Sale`.

#### Scenario: Read shows currentBalance
- **WHEN** an authorized user gets a customer that has `current_balance = 1500`
- **THEN** the response includes `currentBalance: 1500`

#### Scenario: POST silently ignores currentBalance
- **WHEN** a `POST /api/v1/admin/customers` body includes `currentBalance: 9999` and no `initialBalance`
- **THEN** the persisted record has `current_balance = 0` (the submitted `currentBalance` is discarded, not applied)

#### Scenario: PATCH silently ignores currentBalance
- **WHEN** a `PATCH /api/v1/admin/customers/:id` body includes `currentBalance: 50` and no `initialBalance`
- **THEN** the persisted `current_balance` is unchanged

#### Scenario: Completing a cash sale does not change currentBalance
- **WHEN** a sale is successfully completed for a customer whose `current_balance = 2000` using a `paymentMethod` whose `isCredit=false`
- **THEN** the customer's `current_balance` remains `2000` after the sale

#### Scenario: Completing a credit sale increments currentBalance
- **WHEN** a sale is successfully completed for a customer whose `current_balance = 2000` using a `paymentMethod` whose `isCredit=true` and `total=500`
- **THEN** the customer's `current_balance` is `2500` after the sale commits

#### Scenario: Registering a payment decrements currentBalance
- **WHEN** a payment of `amount=300` is registered for a customer whose `current_balance = 2500`
- **THEN** the customer's `current_balance` is `2200` after the payment commits

#### Scenario: Cancelling a payment restores currentBalance
- **WHEN** a payment of `amount=300` is cancelled for a customer whose `current_balance = 2200`
- **THEN** the customer's `current_balance` is `2500` after the cancellation commits

#### Scenario: Cancelling a credit sale without active payments decrements currentBalance by outstanding
- **WHEN** a sale whose `paymentMethod.isCredit=true` with `total=1000`, `paidAmount=0`, no active payments, is cancelled for a customer whose `current_balance = 1000`
- **THEN** the customer's `current_balance` is `0` after the cancellation commits

#### Scenario: currentBalance invariant: never negative
- **WHEN** any operation would result in `current_balance < 0` (defensive check)
- **THEN** the operation aborts with HTTP 409 `{"error":"PaymentWouldOverpay"}` and the transaction does not commit

#### Scenario: Account payment settles debt with no associated ticket
- **WHEN** a customer has `current_balance = 500` consisting of `300` from a pending credit sale and `200` with no associated ticket (e.g. from `initialBalance`), and an account payment (`saleId=null`) of `200` is registered
- **THEN** the customer's `current_balance` is `300` after the payment commits, and the pending credit sale's `paidAmount`/`paymentStatus` are unchanged

#### Scenario: Account payment cannot settle ticketed debt
- **WHEN** a customer's entire `current_balance` corresponds to pending credit sales (`accountDebt = 0`)
- **THEN** any attempt to register an account payment (`saleId=null`) with `amount > 0` is rejected by `payments-api` with HTTP 409 `PaymentExceedsAccountDebt` — that debt can only be settled through the sale-scoped payment path
