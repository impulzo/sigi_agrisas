# Spec: customers-api

## Purpose

Define the administrative CRUD endpoints for the customers catalog: list, get, create, update, and soft-delete operations under `/api/v1/admin/customers`. Includes fiscal data management (RFC, tax regime, CFDI use) and a read-only credit balance field.

---

## Requirements

### Requirement: List customers
The system SHALL expose `GET /api/v1/admin/customers` that returns a paginated list of customers. Requires the `customers:read` permission. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `includeInactive` (default `false`), `search` (optional, min 2 chars; matches `name`, `legalName`, or `rfc` via `OR ILIKE`). Response: `{ items: CustomerDto[], total: number, page: number, pageSize: number }`. Each `CustomerDto` includes `id`, `code`, `name`, `rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `creditLimit` (number or `null`), `currentBalance` (number, default `0`), `isActive`, `createdAt`, `updatedAt`. Ordered by `createdAt DESC`.

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

---

### Requirement: Get customer detail
The system SHALL expose `GET /api/v1/admin/customers/:id` that returns a single customer by UUID. Requires `customers:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets customer
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `CustomerDto` including `currentBalance`

#### Scenario: Customer not found
- **WHEN** the `:id` does not match any customer
- **THEN** the system returns HTTP 404 `{"error": "Customer not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400

---

### Requirement: Create customer
The system SHALL expose `POST /api/v1/admin/customers`. Requires `customers:write`. Required body fields:

- `code: string` matching `^[A-Z0-9_]{1,32}$` (unique, immutable after creation)
- `name: string` (1–120 chars)
- `rfc: string` matching `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` (unique, normalized to uppercase + trim)

Optional fields (all `string | null`, with max length when not null):

- `legalName` (max 200), `taxRegime` (regex `^\d{3}$`), `cfdiUse` (regex `^[A-Z]\d{2}$`), `taxZipCode` (regex `^\d{5}$`)
- `email` (valid email, max 120), `phone` (max 30), `address` (max 300), `contactName` (max 120), `notes` (text)
- `creditLimit: number | null` (decimal `>= 0`, max 12 integer digits + 4 decimals; `null` means "no credit allowed")
- `isActive: boolean` (default `true`)

`currentBalance` SHALL always start at `0` on creation; it is NOT settable via this endpoint. The controller SHALL normalize `code` (uppercase + trim) and `rfc` (uppercase + trim) before persisting. Returns HTTP 201 with the new `CustomerDto`. Duplicate `code` returns HTTP 409. Duplicate `rfc` returns HTTP 409.

#### Scenario: Minimal creation
- **WHEN** the body is `{ "code": "CLI_001", "name": "Acme S.A.", "rfc": "ACM010101AAA" }`
- **THEN** the system returns HTTP 201 with `currentBalance: 0` and `creditLimit: null`

#### Scenario: Full fiscal creation
- **WHEN** the body includes valid `rfc`, `taxRegime: "612"`, `cfdiUse: "G03"`, `taxZipCode: "06600"`, `creditLimit: 50000`
- **THEN** the system returns HTTP 201 with all fields persisted

#### Scenario: Duplicate code
- **WHEN** the body contains a `code` already in use
- **THEN** the system returns HTTP 409 `{"error": "Customer code already in use"}`

#### Scenario: Duplicate RFC
- **WHEN** the body contains an `rfc` already used by another customer
- **THEN** the system returns HTTP 409 `{"error": "Customer RFC already in use"}`

#### Scenario: Invalid RFC format
- **WHEN** the body contains `rfc: "XXX"`
- **THEN** the system returns HTTP 400

#### Scenario: currentBalance is not settable on create
- **WHEN** the body includes `currentBalance: 5000`
- **THEN** the system ignores it silently and persists `current_balance = 0`

#### Scenario: Forbidden
- **WHEN** an authenticated user without `customers:write` calls the endpoint
- **THEN** the system returns HTTP 403

---

### Requirement: Update customer
The system SHALL expose `PATCH /api/v1/admin/customers/:id`. Requires `customers:write`. The body MAY include any of `name`, `rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`, `isActive`. The fields `code` and `currentBalance` MUST NOT be updatable; if present they SHALL be ignored silently. At least one updatable field MUST be present. Optional fields set to `null` clear the value.

#### Scenario: Update name and credit limit
- **WHEN** the body is `{ "name": "Acme México S.A.", "creditLimit": 100000 }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Update RFC to an available value
- **WHEN** the body is `{ "rfc": "NEW010101AAA" }` and that RFC is not in use
- **THEN** the system returns HTTP 200 with the new RFC

#### Scenario: Update RFC to a duplicate
- **WHEN** the body contains an `rfc` already in use by another customer
- **THEN** the system returns HTTP 409 `{"error": "Customer RFC already in use"}`

#### Scenario: Clear optional field
- **WHEN** the body is `{ "creditLimit": null }`
- **THEN** the system stores `null` in `credit_limit` and returns HTTP 200

#### Scenario: code and currentBalance in body are ignored
- **WHEN** the body is `{ "code": "NEW", "currentBalance": 99999, "name": "X" }`
- **THEN** the system updates only `name`; `code` and `current_balance` remain unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}` or only contains ignored fields
- **THEN** the system returns HTTP 400 `{"error": "At least one updatable field must be provided"}`

#### Scenario: Customer not found
- **WHEN** the `:id` does not match any customer
- **THEN** the system returns HTTP 404

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
The `currentBalance` field SHALL be readable through `GET` endpoints but SHALL NOT be settable through `POST` or `PATCH` of `customers-api`. The mutation of `currentBalance` is OWNED by the `payments-api` module and by the credit branch of the POS API (`POST /sales` with `isCredit=true`).

- `customers-api` SHALL silently ignore any `currentBalance` field in `POST /customers` and `PATCH /customers/:id` bodies (consistent with prior behavior).
- `payments-api` SHALL mutate `currentBalance` atomically when registering or cancelling a `CustomerPayment` (decrement on register, increment on cancel).
- `pos-api` SHALL mutate `currentBalance` atomically when creating a sale whose `paymentMethod.isCredit=true` (increment by `sale.total`), when cancelling such a credit sale that has no active payments (decrement by remaining due), and when editing a sale (delta computed from old/new `paymentMethod.isCredit` and totals — see `pos-api` for the precise formula).
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

---

### Requirement: Customer entity in domain
The system SHALL provide a `Customer` domain entity in `src/modules/customers/domain/entities/Customer.ts` with a factory `Customer.create()` that constructs valid instances. The entity SHALL validate `code` and `rfc` via value objects or inline validation at creation. The entity SHALL expose typed errors `CustomerNotFoundError`, `CustomerCodeAlreadyInUseError`, `CustomerRfcAlreadyInUseError`, `InactiveCustomerError`.

#### Scenario: Valid construction
- **WHEN** `Customer.create({ code: "CLI_001", name: "Acme", rfc: "ACM010101AAA" })` is invoked
- **THEN** an instance is returned with `currentBalance = 0`, `isActive = true`, and `id` generated

#### Scenario: Invalid code rejected
- **WHEN** `Customer.create({ code: "cli-001", name: "X", rfc: "ACM010101AAA" })` is invoked (lowercase + hyphen)
- **THEN** the factory throws a domain error
