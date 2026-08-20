## MODIFIED Requirements

### Requirement: Create customer
The system SHALL expose `POST /api/v1/admin/customers`. Requires `customers:write`. Required body fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$` (unique, immutable after creation)
- `name: string` (1–120 chars)

Optional fields:

- `rfc: string | null` matching `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` when present (unique among non-null values, normalized to uppercase + trim; omitted, empty string, or `null` all persist as `null`)
- `legalName` (max 200), `taxRegime` (regex `^\d{3}$`), `cfdiUse` (regex `^[A-Z]{1,2}\d{2}$`), `taxZipCode` (regex `^\d{5}$`)
- `email` (valid email, max 120), `phone` (max 30), `address` (max 300), `contactName` (max 120), `notes` (text)
- `creditLimit: number | null` (decimal `>= 0`, max 12 integer digits + 4 decimals; `null` means "no credit allowed")
- `creditDays: integer` (`>= 0`, no upper bound; defaults to `30` when omitted)
- `initialBalance: number` (decimal `>= 0`, max 12 integer digits + 4 decimals; defaults to `0` when omitted — deuda inicial capturada al dar de alta)
- `isActive: boolean` (default `true`)

`currentBalance` SHALL always be set to `initialBalance` on creation (`0` when `initialBalance` is omitted); it is NOT independently settable via this endpoint. The controller SHALL normalize `code` (uppercase + trim) and, when present, `rfc` (uppercase + trim) before persisting. Returns HTTP 201 with the new `CustomerDto` including `initialBalance`. Duplicate `code` returns HTTP 409. A non-null duplicate `rfc` returns HTTP 409; two customers with `rfc: null` MAY coexist. A `creditDays` value that is negative or not an integer returns HTTP 400. A negative `initialBalance` returns HTTP 400.

#### Scenario: Minimal creation
- **WHEN** the body is `{ "code": "CLI_001", "name": "Acme S.A." }` (no `rfc`)
- **THEN** the system returns HTTP 201 with `rfc: null`, `currentBalance: 0`, `initialBalance: 0`, `creditLimit: null`, and `creditDays: 30`

#### Scenario: Full fiscal creation
- **WHEN** the body includes valid `rfc`, `taxRegime: "612"`, `cfdiUse: "G03"`, `taxZipCode: "06600"`, `creditLimit: 50000`
- **THEN** the system returns HTTP 201 with all fields persisted

#### Scenario: CFDI use with 4-character code accepted
- **WHEN** the body includes `cfdiUse: "CP01"` or `cfdiUse: "CN01"`
- **THEN** the system returns HTTP 201 with the value persisted (the regex `^[A-Z]{1,2}\d{2}$` accepts the 4-character codes present in the official `c_UsoCFDI` catalog)

#### Scenario: Duplicate code
- **WHEN** the body contains a `code` already in use
- **THEN** the system returns HTTP 409 `{"error": "Customer code already in use"}`

#### Scenario: Duplicate RFC
- **WHEN** the body contains a non-null `rfc` already used by another customer
- **THEN** the system returns HTTP 409 `{"error": "Customer RFC already in use"}`

#### Scenario: Two customers without RFC coexist
- **WHEN** two separate `POST` requests each omit `rfc` (or send `rfc: null`)
- **THEN** both customers are created successfully, each with `rfc: null`, with no HTTP 409

#### Scenario: Invalid RFC format
- **WHEN** the body contains `rfc: "XXX"`
- **THEN** the system returns HTTP 400

#### Scenario: Empty string RFC normalized to null
- **WHEN** the body contains `rfc: ""`
- **THEN** the system persists `rfc = null` and returns HTTP 201 (no format validation applied to an empty value)

#### Scenario: currentBalance is not independently settable on create
- **WHEN** the body includes `currentBalance: 5000` (with or without `initialBalance`)
- **THEN** the system ignores the `currentBalance` field silently; `current_balance` is set to `initialBalance` (or `0` if omitted), never to the submitted `currentBalance`

#### Scenario: initialBalance sets currentBalance on creation
- **WHEN** the body includes `initialBalance: 1200`
- **THEN** the system returns HTTP 201 with `initialBalance: 1200` and `currentBalance: 1200`

#### Scenario: Negative initialBalance rejected
- **WHEN** the body includes `initialBalance: -100`
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden
- **WHEN** an authenticated user without `customers:write` calls the endpoint
- **THEN** the system returns HTTP 403

#### Scenario: Custom creditDays persisted
- **WHEN** the body is `{ "code": "CLI_002", "name": "Beta S.A.", "creditDays": 45 }`
- **THEN** the system returns HTTP 201 with `creditDays: 45`

#### Scenario: Negative creditDays rejected
- **WHEN** the body includes `creditDays: -5`
- **THEN** the system returns HTTP 400

#### Scenario: Non-integer creditDays rejected
- **WHEN** the body includes `creditDays: 10.5`
- **THEN** the system returns HTTP 400

---

### Requirement: Update customer
The system SHALL expose `PATCH /api/v1/admin/customers/:id`. Requires `customers:write`. The body MAY include any of `name`, `rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`, `creditDays`, `initialBalance`, `isActive`. The field `code` MUST NOT be updatable; `currentBalance` MUST NOT be independently settable — both are ignored silently if present. At least one updatable field MUST be present (an update containing only `creditDays` satisfies this). Optional fields set to `null` clear the value, except `rfc: null` which clears it to "sin RFC" (allowed, does not consume the unique constraint). A `creditDays` value that is negative or not an integer returns HTTP 400. A negative `initialBalance` returns HTTP 400. The `cfdiUse` field SHALL accept the regex `^[A-Z]{1,2}\d{2}$` (which covers the 4-character codes `CP01` and `CN01` of the official `c_UsoCFDI` catalog). When `initialBalance` changes, the system SHALL atomically adjust `currentBalance` by the delta (`new - old`) within the same request transaction, independent of any concurrent payment/sale mutation.

#### Scenario: Update name and credit limit
- **WHEN** the body is `{ "name": "Acme México S.A.", "creditLimit": 100000 }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Update RFC to an available value
- **WHEN** the body is `{ "rfc": "NEW010101AAA" }` and that RFC is not in use
- **THEN** the system returns HTTP 200 with the new RFC

#### Scenario: Update RFC to a duplicate
- **WHEN** the body contains a non-null `rfc` already in use by another customer
- **THEN** the system returns HTTP 409 `{"error": "Customer RFC already in use"}`

#### Scenario: Clear RFC
- **WHEN** the body is `{ "rfc": null }` on a customer that previously had an `rfc`
- **THEN** the system stores `rfc = null` and returns HTTP 200; the customer no longer occupies that RFC in the unique constraint

#### Scenario: Update cfdiUse to a 4-character code
- **WHEN** the body is `{ "cfdiUse": "CP01" }`
- **THEN** the system returns HTTP 200 with `cfdiUse: "CP01"` persisted

#### Scenario: Clear optional field
- **WHEN** the body is `{ "creditLimit": null }`
- **THEN** the system stores `null` in `credit_limit` and returns HTTP 200

#### Scenario: code and currentBalance in body are ignored
- **WHEN** the body is `{ "code": "NEW", "currentBalance": 99999, "name": "X" }`
- **THEN** the system updates only `name`; `code` and `current_balance` remain unchanged

#### Scenario: Update initialBalance adjusts currentBalance by delta
- **WHEN** a customer has `initialBalance: 1000`, `currentBalance: 1500` (500 acumulado por ventas/abonos posteriores), and the body is `{ "initialBalance": 1300 }`
- **THEN** the system returns HTTP 200 with `initialBalance: 1300` and `currentBalance: 1800` (delta `+300` aplicado atómicamente)

#### Scenario: Negative initialBalance on update rejected
- **WHEN** the body is `{ "initialBalance": -1 }`
- **THEN** the system returns HTTP 400

#### Scenario: Empty body
- **WHEN** the body is `{}` or only contains ignored fields
- **THEN** the system returns HTTP 400 `{"error": "At least one updatable field must be provided"}`

#### Scenario: Customer not found
- **WHEN** the `:id` does not match any customer
- **THEN** the system returns HTTP 404

#### Scenario: Update creditDays alone
- **WHEN** the body is `{ "creditDays": 60 }`
- **THEN** the system returns HTTP 200, and a subsequent `GET` on the same customer reflects `creditDays: 60`

#### Scenario: Invalid creditDays on update rejected
- **WHEN** the body is `{ "creditDays": -1 }`
- **THEN** the system returns HTTP 400

---

### Requirement: Customer credit balance is read-only via this API
The `currentBalance` field SHALL be readable through `GET` endpoints but SHALL NOT be independently settable through `POST` or `PATCH` of `customers-api`. The mutation of `currentBalance` is OWNED by the `payments-api` module, by the credit branch of the POS API (`POST /sales` with `isCredit=true`), and by the `initialBalance` field of this very module (`customers-api`) at creation and update time — the only three owners.

- `customers-api` SHALL silently ignore any `currentBalance` field in `POST /customers` and `PATCH /customers/:id` bodies (consistent with prior behavior); it SHALL instead derive `currentBalance` from `initialBalance` as described in the Create/Update requirements above.
- `payments-api` SHALL mutate `currentBalance` atomically when registering or cancelling a `CustomerPayment` (decrement on register, increment on cancel).
- `pos-api` SHALL mutate `currentBalance` atomically when creating a sale whose `paymentMethod.isCredit=true` (increment by `sale.total`), when cancelling such a credit sale that has no active payments (decrement by remaining due), and when editing a sale (delta computed from old/new `paymentMethod.isCredit` and totals — see `pos-api` for the precise formula).
- `currentBalance` SHALL NEVER be negative; the application enforces the invariant in the payments and POS use cases. (`initialBalance` itself is bounded `>= 0`, so it cannot introduce a negative `currentBalance`.)

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
