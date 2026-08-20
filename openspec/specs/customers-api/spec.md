# Spec: customers-api

## Purpose

Define the administrative CRUD endpoints for the customers catalog: list, get, create, update, and soft-delete operations under `/api/v1/admin/customers`. Includes fiscal data management (RFC, tax regime, CFDI use), a read-only credit balance field, and an optional structured address used to generate Carta Porte documents (see `waybills-api`).

---
## Requirements
### Requirement: List customers
The system SHALL expose `GET /api/v1/admin/customers` that returns a paginated list of customers. Requires the `customers:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (optional, min 2 chars; matches `name`, `legalName`, or `rfc` via `OR ILIKE`). Response: `{ items: CustomerDto[], total: number, page: number, pageSize: number }`. Each `CustomerDto` includes `id`, `code`, `name`, `rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `creditLimit` (number or `null`), `currentBalance` (number, default `0`), `creditDays` (integer, `>= 0`, default `30`), `isActive`, `createdAt`, `updatedAt`. Ordered by `createdAt DESC`.

#### Scenario: Admin lists active customers
- **WHEN** an authenticated user with `customers:read` sends `GET /api/v1/admin/customers`
- **THEN** the system returns HTTP 200 with active customers only

#### Scenario: Search by name, legal name, or RFC
- **WHEN** the request includes `?search=acme`
- **THEN** the response includes any customer whose `name`, `legalName`, or `rfc` contains `acme` case-insensitively

#### Scenario: Include inactive
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes customers with `isActive = false`

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden without permission
- **WHEN** an authenticated user without `customers:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "customers:read"}`

#### Scenario: List response includes creditDays
- **WHEN** an authenticated user with `customers:read` sends `GET /api/v1/admin/customers`
- **THEN** every item in the response array includes its `creditDays` value

---

### Requirement: Get customer detail
The system SHALL expose `GET /api/v1/admin/customers/:id` that returns a single customer by UUID. Requires `customers:read`. Returns the entity regardless of `isActive`, including its `creditDays` value. Returns HTTP 404 if not found.

#### Scenario: Admin gets customer
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `CustomerDto` including `currentBalance`

#### Scenario: Customer not found
- **WHEN** the `:id` does not match any customer
- **THEN** the system returns HTTP 404 `{"error": "Customer not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400

#### Scenario: Detail includes creditDays for customers created before this change
- **WHEN** an authenticated user with `customers:read` requests a customer created before `creditDays` was exposed by the API
- **THEN** the response includes `creditDays: 30` (the column default already persisted in the database)

---

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

### Requirement: Customer credit days used for sale due-date calculation
The `creditDays` value persisted through `customers-api` SHALL be the same value consumed by `pos-api` to compute `dueDate` on credit sales (`dueDate = addDays(completedAt, customer.creditDays ?? 30)`). Exposing `creditDays` through `customers-api` SHALL NOT alter that calculation.

#### Scenario: Custom creditDays affects sale due date
- **WHEN** a customer has `creditDays: 45` (set via `PATCH /api/v1/admin/customers/:id`) and a credit sale is completed for that customer
- **THEN** the resulting sale's `dueDate` is 45 days after `completedAt`

---

### Requirement: Soft delete customer
The system SHALL expose `DELETE /api/v1/admin/customers/:id` that marks the customer as `isActive=false` without removing the row. Requires `customers:write`. Returns HTTP 204. Existing sales referencing the customer SHALL remain unaffected (the FK keeps pointing to the same row).

#### Scenario: Soft delete success
- **WHEN** the request targets an active customer
- **THEN** the system returns HTTP 204 and the entity has `is_active = false`

#### Scenario: Reactivate via update
- **WHEN** an admin sends `PATCH /api/v1/admin/customers/:id` with `{"isActive": true}` to a previously soft-deleted customer
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: Customer not found
- **WHEN** the `:id` does not match any customer
- **THEN** the system returns HTTP 404

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

### Requirement: Structured address for Carta Porte
`POST /api/v1/admin/customers` and `PATCH /api/v1/admin/customers/:id` SHALL accept 8 additional optional fields, mirroring the structured address already present on `Branch` (see `admin-branches` spec), used exclusively to build the destination `Ubicacion` node when generating a Carta Porte from a sale of this customer (see `waybills-api`): `addressStreet` (max 150), `addressExteriorNumber` (max 20), `addressInteriorNumber` (max 20, nullable), `addressNeighborhood` (max 100), `addressMunicipality` (max 100), `addressState` (max 3, SAT `c_Estado` key), `addressCountry` (max 3, SAT `c_Pais` key, defaults to `"MEX"` when omitted on create), `addressZipCode` (max 5). All are independent of, and do NOT replace or sync with, the existing free-text `address` field (still used for tickets/invoices display). All 8 fields are `null` by default for customers created before this change and for new customers that omit them.

#### Scenario: Structured address captured on creation
- **WHEN** `POST /api/v1/admin/customers` includes `addressStreet`, `addressExteriorNumber`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressZipCode`
- **THEN** the system returns HTTP 201 with those fields persisted, independent of the existing `address` field

#### Scenario: Structured address updated independently of free-text address
- **WHEN** `PATCH /api/v1/admin/customers/:id` includes only `addressZipCode`
- **THEN** the system updates `addressZipCode` and leaves the free-text `address` field and the other 7 structured fields unchanged

#### Scenario: Existing customers default to null structured address
- **WHEN** a customer created before this change is fetched via `GET /api/v1/admin/customers/:id`
- **THEN** all 8 structured address fields are `null` until explicitly set via `PATCH`

#### Scenario: addressCountry defaults to MEX on creation
- **WHEN** `POST /api/v1/admin/customers` omits `addressCountry` but includes the other structured address fields
- **THEN** the system persists `addressCountry: "MEX"`

---

### Requirement: Customer entity in domain
The system SHALL provide a `Customer` domain entity in `src/modules/customers/domain/entities/Customer.ts` with a factory `Customer.create()` that constructs valid instances. The entity SHALL validate `code` and `rfc` via value objects or inline validation at creation. The entity SHALL expose typed errors `CustomerNotFoundError`, `CustomerCodeAlreadyInUseError`, `CustomerRfcAlreadyInUseError`, `InactiveCustomerError`.

#### Scenario: Valid construction
- **WHEN** `Customer.create({ code: "CLI_001", name: "Acme", rfc: "ACM010101AAA" })` is invoked
- **THEN** an instance is returned with `currentBalance = 0`, `isActive = true`, and `id` generated

#### Scenario: Invalid code rejected
- **WHEN** `Customer.create({ code: "cli-001", name: "X", rfc: "ACM010101AAA" })` is invoked (lowercase + hyphen)
- **THEN** the factory throws a domain error

