## ADDED Requirements

### Requirement: Send sale ticket by email
The system SHALL expose `POST /api/v1/admin/sales/:id/send-ticket-email`. Requires `sales:read` (same permission as viewing the sale; no new permission introduced — sending a copy of an already-visible ticket is not a higher-privilege action). Enforces the same branch scope as `GET /sales/:id` (`enforceBranchScope`, loading the sale first). Optional body: `{ email?: string }` — when omitted, the recipient is `sale.customer.email` (via the sale's linked customer, which is nullable for walk-in/"público general" sales).

Behavior:

1. Load the sale via the same lookup used by `GET /sales/:id` (with items); enforce branch scope; not found → HTTP 404.
2. Resolve the recipient: `body.email` if present and non-empty (validated as a well-formed email via Zod `.email()`, else HTTP 400), otherwise `sale.customer?.email`. If both are absent/null → HTTP 400 `{"error": "Customer has no email and no override provided"}`.
3. Compose a single HTML email summarizing the ticket (folio, date, items, subtotal, IVA, IEPS, total, payment method) — no PDF/XML attachment (unlike `billing-api`'s invoice email, there is no generated file to attach; the ticket is a live-rendered summary).
4. Send the email to the resolved recipient via `MailerPort`. This send is SYNCHRONOUS — a failure (SMTP unreachable, auth failure, etc.) SHALL propagate to the caller as HTTP 502 `{"error": "Failed to send ticket email"}`. Nothing about the sale record is mutated by this endpoint either way.

Returns HTTP 200 `{"sentTo": "<resolved-email>"}` on success.

#### Scenario: Successful send to customer's email
- **WHEN** an authorized caller POSTs with no body for a sale whose linked `customer.email = "cliente@ejemplo.com"`
- **THEN** the system returns HTTP 200 `{"sentTo": "cliente@ejemplo.com"}` and a summary email was sent to that address

#### Scenario: Override recipient
- **WHEN** the body is `{ "email": "otra@direccion.com" }`
- **THEN** the email is sent to `otra@direccion.com` regardless of `customer.email`

#### Scenario: Walk-in sale with no customer requires an override
- **WHEN** the sale has `customerId: null` (público general) and the body omits `email`
- **THEN** the system returns HTTP 400 `{"error": "Customer has no email and no override provided"}` and no send is attempted

#### Scenario: Customer exists but has no email on file
- **WHEN** the sale's linked `customer.email` is `null` and the body omits `email`
- **THEN** the system returns HTTP 400 `{"error": "Customer has no email and no override provided"}`

#### Scenario: Malformed override email
- **WHEN** the body is `{ "email": "not-an-email" }`
- **THEN** the system returns HTTP 400 with a Zod validation error, no send is attempted

#### Scenario: SMTP failure propagates to caller
- **WHEN** the SMTP server is unreachable or rejects authentication
- **THEN** the system returns HTTP 502 `{"error": "Failed to send ticket email"}`

#### Scenario: Forbidden without sales:read
- **WHEN** a caller without `sales:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "sales:read"}`

#### Scenario: Branch scoping violation
- **WHEN** a caller without `branches:access_all` requests a sale belonging to a different branch than `x-user-branch-id`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: Sale not found
- **WHEN** `:id` does not reference an existing sale
- **THEN** the system returns HTTP 404
