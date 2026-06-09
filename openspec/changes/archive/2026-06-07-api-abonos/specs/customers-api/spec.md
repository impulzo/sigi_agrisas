## MODIFIED Requirements

### Requirement: Customer credit balance is read-only via this API
The `currentBalance` field SHALL be readable through `GET` endpoints but SHALL NOT be settable through `POST` or `PATCH` of `customers-api`. The mutation of `currentBalance` is OWNED by the `payments-api` module and by the credit branch of the POS API (`POST /sales` with `isCredit=true`).

- `customers-api` SHALL silently ignore any `currentBalance` field in `POST /customers` and `PATCH /customers/:id` bodies (consistent with prior behavior).
- `payments-api` SHALL mutate `currentBalance` atomically when registering or cancelling a `CustomerPayment` (decrement on register, increment on cancel).
- `pos-api` SHALL mutate `currentBalance` atomically when creating a sale whose `paymentMethod.isCredit=true` (increment by `sale.total`), when cancelling such a credit sale that has no active payments (decrement by remaining due), and when editing a sale (delta computed from old/new `paymentMethod.isCredit` and totals — see `pos-api` MODIFIED for the precise formula).
- `currentBalance` SHALL NEVER be negative; the application enforces the invariant in the payments and POS use cases.

#### Scenario: Read shows currentBalance
- **WHEN** an authorized user gets a customer that has `current_balance = 1500`
- **THEN** the response includes `currentBalance: 1500`

#### Scenario: POST silently ignores currentBalance
- **WHEN** a `POST /api/v1/admin/customers` body includes `currentBalance: 9999`
- **THEN** the persisted record has `current_balance = 0`

#### Scenario: PATCH silently ignores currentBalance
- **WHEN** a `PATCH /api/v1/admin/customers/:id` body includes `currentBalance: 50`
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
