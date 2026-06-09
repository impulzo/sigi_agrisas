# Spec: admin-payment-methods

## Purpose

Define the administrative CRUD endpoints for payment methods catalog: list, get, create, update, and soft-delete operations under `/api/v1/admin/payment-methods`.

---

## Requirements

### Requirement: PaymentMethod has isCredit flag (immutable after creation)
The `PaymentMethod` model SHALL include an `isCredit: boolean NOT NULL DEFAULT false` column. This flag is the sole discriminator the system uses to activate the credit-sale flow on `POST /sales`: when a sale is emitted with a `paymentMethodId` whose `isCredit=true`, the sale becomes a credit sale (see `pos-api` for the full flow). When `isCredit=false`, the sale is treated as paid at the moment of emission.

The flag SHALL be settable ONLY at creation time via `POST /api/v1/admin/payment-methods`. The `PATCH /api/v1/admin/payment-methods/:id` endpoint SHALL silently ignore any `isCredit` field in the body, identical to how it ignores `code`. This invariance prevents inconsistency between historical sales and the current credit flag of their payment method (a sale created when the method was cash SHALL stay treated as cash even if the admin tries to flip the flag).

The `PaymentMethodDto` returned by every endpoint of `admin-payment-methods` SHALL include the `isCredit` field.

#### Scenario: PaymentMethodDto exposes isCredit
- **WHEN** an authorized user fetches `GET /api/v1/admin/payment-methods/:id` for a method with `is_credit=true`
- **THEN** the response includes `isCredit: true`

#### Scenario: PaymentMethodDto exposes isCredit in list
- **WHEN** an authorized user fetches `GET /api/v1/admin/payment-methods`
- **THEN** every `items[i]` includes its `isCredit` value

#### Scenario: Create payment method with isCredit=true
- **WHEN** the body is `{ "code": "CREDITO_30D", "name": "Crédito 30 días", "isCredit": true }` and the caller has `payment_methods:write`
- **THEN** the system returns HTTP 201 with `isCredit: true` and persists `is_credit = true`

#### Scenario: Create payment method without isCredit defaults to false
- **WHEN** the body omits `isCredit`
- **THEN** the persisted record has `is_credit = false` and the response shows `isCredit: false`

#### Scenario: PATCH silently ignores isCredit
- **WHEN** a `PATCH /api/v1/admin/payment-methods/:id` body includes `{ "isCredit": true }` for a method whose current `is_credit=false`
- **THEN** the persisted `is_credit` is unchanged (still `false`) and the response shows `isCredit: false`

#### Scenario: Cannot toggle isCredit to false either
- **WHEN** a `PATCH /api/v1/admin/payment-methods/:id` body includes `{ "isCredit": false }` for a method whose current `is_credit=true`
- **THEN** the persisted `is_credit` is unchanged (still `true`)

---

### Requirement: Seeded CREDITO payment method
`prisma/seed.ts` SHALL upsert idempotently a `PaymentMethod` with `code='CREDITO'`, `name='Crédito'`, `description='Venta a crédito (saldo a cuenta del cliente)'`, `isCredit=true`, `isActive=true`. On re-runs, the seed SHALL update `name`, `description`, `isActive` and SHALL NOT touch `is_credit` (it stays `true`; consistent with the immutability rule).

#### Scenario: Seed creates CREDITO on empty database
- **WHEN** `npm run seed` runs against a database without a payment method whose `code='CREDITO'`
- **THEN** the `payment_methods` table contains a row with `code='CREDITO'`, `name='Crédito'`, `is_credit=true`, `is_active=true`

#### Scenario: Seed remains idempotent (CREDITO)
- **WHEN** the seed runs a second time after `CREDITO` already exists
- **THEN** no duplicate is created and `is_credit` stays `true`

#### Scenario: Admin may create additional credit methods
- **WHEN** the seed is applied and an admin later POSTs `{ "code": "CREDITO_60D", "name": "Crédito 60 días", "isCredit": true }`
- **THEN** the new method is created with `is_credit=true`; the system supports any number of distinct credit payment methods

---

### Requirement: List payment methods
The system SHALL expose `GET /api/v1/admin/payment-methods` that returns a paginated list of payment methods. The endpoint requires the `payment_methods:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100) and `includeInactive` (default `false`) control the result set. By default the system SHALL return only payment methods with `isActive = true`. The response SHALL be `{ items: PaymentMethodDto[], total: number, page: number, pageSize: number }`. Each `PaymentMethodDto` includes `id`, `code`, `name`, `description` (string or `null`), `isActive`, `isCredit`, `createdAt`, `updatedAt`.

#### Scenario: Admin lists active payment methods
- **WHEN** an authenticated user with `payment_methods:read` sends `GET /api/v1/admin/payment-methods`
- **THEN** the system returns HTTP 200 with `{ items: [...], total: N, page: 1, pageSize: 20 }` containing only methods with `isActive = true`

#### Scenario: Admin lists including inactive payment methods
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes both active and inactive payment methods

#### Scenario: Pagination parameters applied
- **WHEN** the request includes `?page=2&pageSize=5`
- **THEN** the system returns the corresponding slice and reflects `page: 2, pageSize: 5`

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `payment_methods:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "payment_methods:read"}`

#### Scenario: Unauthenticated request
- **WHEN** the request has no valid access token
- **THEN** the middleware returns HTTP 401 before reaching the handler

---

### Requirement: Get payment method detail
The system SHALL expose `GET /api/v1/admin/payment-methods/:id` that returns a single payment method by its UUID. Requires `payment_methods:read`. The endpoint SHALL return the entity regardless of its `isActive` flag. Returns HTTP 404 if the payment method does not exist.

#### Scenario: Admin gets active payment method
- **WHEN** an authenticated user with `payment_methods:read` sends `GET /api/v1/admin/payment-methods/:id` with a valid UUID
- **THEN** the system returns HTTP 200 with the `PaymentMethodDto`

#### Scenario: Admin gets inactive payment method
- **WHEN** the request targets a method with `isActive = false`
- **THEN** the system still returns HTTP 200 with the `PaymentMethodDto`

#### Scenario: Payment method not found
- **WHEN** the `:id` does not match any payment method
- **THEN** the system returns HTTP 404 `{"error": "Payment method not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create payment method
The system SHALL expose `POST /api/v1/admin/payment-methods` to create a new payment method. Requires `payment_methods:write`. The request body SHALL include `code: string` (matching `^[A-Z0-9_]{1,32}$`), `name: string` (1–100 chars). Optional: `description: string | null` (max 500 chars), `isActive: boolean` (default `true`), `isCredit: boolean` (default `false` — immutable after creation; see the `isCredit` requirement above). The system SHALL return HTTP 201 with the created `PaymentMethodDto`. If `code` already exists, the system SHALL return HTTP 409.

#### Scenario: Successful creation
- **WHEN** the body is `{ "code": "CASH", "name": "Efectivo" }`
- **THEN** the system returns HTTP 201 with the new entity including a generated UUID and `isActive: true`

#### Scenario: Creation with all fields
- **WHEN** the body is `{ "code": "CARD", "name": "Tarjeta", "description": "Tarjeta crédito/débito", "isActive": false }`
- **THEN** the system persists all fields as provided and returns HTTP 201

#### Scenario: Duplicate code
- **WHEN** the body contains `code: "CASH"` and a payment method with that code already exists
- **THEN** the system returns HTTP 409 `{"error": "Payment method code already in use"}`

#### Scenario: Invalid code format
- **WHEN** the body contains `code: "cash-mxn"` (lowercase and hyphen)
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Missing required field
- **WHEN** the body omits `code` or `name`
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Update payment method
The system SHALL expose `PATCH /api/v1/admin/payment-methods/:id` to partially update a payment method. Requires `payment_methods:write`. The body MAY include any of `name`, `description` (string or `null` to clear), `isActive`. The fields `code` and `isCredit` MUST NOT be updatable; if present in the body they SHALL be ignored silently. At least one updatable field MUST be present; an empty body (or one containing only `code`/`isCredit`) SHALL return HTTP 400.

#### Scenario: Admin updates name
- **WHEN** the body is `{ "name": "Efectivo en caja" }`
- **THEN** the system returns HTTP 200 with the updated entity

#### Scenario: Admin clears description
- **WHEN** the body is `{ "description": null }`
- **THEN** the system stores `null` in the description column and returns HTTP 200

#### Scenario: Admin reactivates inactive payment method
- **WHEN** the body is `{ "isActive": true }` and the entity was inactive
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW_CODE", "name": "Otro" }`
- **THEN** the system updates only `name` and the original `code` remains unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}` or contains only the ignored `code`
- **THEN** the system returns HTTP 400 `{"error": "At least one field (name, description, isActive) must be provided"}`

#### Scenario: Payment method not found
- **WHEN** the `:id` does not match any payment method
- **THEN** the system returns HTTP 404 `{"error": "Payment method not found"}`

---

### Requirement: Soft delete payment method
The system SHALL expose `DELETE /api/v1/admin/payment-methods/:id` that marks the payment method as inactive (`isActive = false`) without removing the row. Requires `payment_methods:write`. Returns HTTP 204 No Content on success. Calling DELETE on an already inactive method SHALL succeed silently (idempotent).

#### Scenario: Admin soft-deletes an active payment method
- **WHEN** an authenticated user with `payment_methods:write` sends `DELETE /api/v1/admin/payment-methods/:id`
- **THEN** the system returns HTTP 204 and the entity now has `isActive = false`

#### Scenario: Admin soft-deletes an already inactive method
- **WHEN** the target entity has `isActive = false`
- **THEN** the system still returns HTTP 204 without throwing

#### Scenario: Payment method not found
- **WHEN** the `:id` does not match any payment method
- **THEN** the system returns HTTP 404 `{"error": "Payment method not found"}`
