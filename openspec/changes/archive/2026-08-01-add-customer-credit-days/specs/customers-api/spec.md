## MODIFIED Requirements

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
- `rfc: string` matching `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` (unique, normalized to uppercase + trim)

Optional fields (all `string | null`, with max length when not null):

- `legalName` (max 200), `taxRegime` (regex `^\d{3}$`), `cfdiUse` (regex `^[A-Z]\d{2}$`), `taxZipCode` (regex `^\d{5}$`)
- `email` (valid email, max 120), `phone` (max 30), `address` (max 300), `contactName` (max 120), `notes` (text)
- `creditLimit: number | null` (decimal `>= 0`, max 12 integer digits + 4 decimals; `null` means "no credit allowed")
- `creditDays: integer` (`>= 0`, no upper bound; defaults to `30` when omitted)
- `isActive: boolean` (default `true`)

`currentBalance` SHALL always start at `0` on creation; it is NOT settable via this endpoint. The controller SHALL normalize `code` (uppercase + trim) and `rfc` (uppercase + trim) before persisting. Returns HTTP 201 with the new `CustomerDto`. Duplicate `code` returns HTTP 409. Duplicate `rfc` returns HTTP 409. A `creditDays` value that is negative or not an integer returns HTTP 400.

#### Scenario: Minimal creation
- **WHEN** the body is `{ "code": "CLI_001", "name": "Acme S.A.", "rfc": "ACM010101AAA" }`
- **THEN** the system returns HTTP 201 with `currentBalance: 0`, `creditLimit: null`, and `creditDays: 30`

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

#### Scenario: Custom creditDays persisted
- **WHEN** the body is `{ "code": "CLI_002", "name": "Beta S.A.", "rfc": "BET010101AAA", "creditDays": 45 }`
- **THEN** the system returns HTTP 201 with `creditDays: 45`

#### Scenario: Negative creditDays rejected
- **WHEN** the body includes `creditDays: -5`
- **THEN** the system returns HTTP 400

#### Scenario: Non-integer creditDays rejected
- **WHEN** the body includes `creditDays: 10.5`
- **THEN** the system returns HTTP 400

---

### Requirement: Update customer
The system SHALL expose `PATCH /api/v1/admin/customers/:id`. Requires `customers:write`. The body MAY include any of `name`, `rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`, `creditDays`, `isActive`. The fields `code` and `currentBalance` MUST NOT be updatable; if present they SHALL be ignored silently. At least one updatable field MUST be present (an update containing only `creditDays` satisfies this). Optional fields set to `null` clear the value. A `creditDays` value that is negative or not an integer returns HTTP 400.

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

#### Scenario: Update creditDays alone
- **WHEN** the body is `{ "creditDays": 60 }`
- **THEN** the system returns HTTP 200, and a subsequent `GET` on the same customer reflects `creditDays: 60`

#### Scenario: Invalid creditDays on update rejected
- **WHEN** the body is `{ "creditDays": -1 }`
- **THEN** the system returns HTTP 400

## ADDED Requirements

### Requirement: Customer credit days used for sale due-date calculation
The `creditDays` value persisted through `customers-api` SHALL be the same value consumed by `pos-api` to compute `dueDate` on credit sales (`dueDate = addDays(completedAt, customer.creditDays ?? 30)`). Exposing `creditDays` through `customers-api` SHALL NOT alter that calculation.

#### Scenario: Custom creditDays affects sale due date
- **WHEN** a customer has `creditDays: 45` (set via `PATCH /api/v1/admin/customers/:id`) and a credit sale is completed for that customer
- **THEN** the resulting sale's `dueDate` is 45 days after `completedAt`
