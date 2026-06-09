## ADDED Requirements

### Requirement: PaymentMethod has isCredit flag (immutable after creation)
The `PaymentMethod` model SHALL include an `isCredit: boolean NOT NULL DEFAULT false` column. This flag is the sole discriminator the system uses to activate the credit-sale flow on `POST /sales`: when a sale is emitted with a `paymentMethodId` whose `isCredit=true`, the sale becomes a credit sale (see `pos-api` MODIFIED for the full flow). When `isCredit=false`, the sale is treated as paid at the moment of emission.

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
