## ADDED Requirements

### Requirement: Send invoice by email
The system SHALL expose `POST /api/v1/admin/invoices/:id/send-email`. Requires `billing:read` (same permission as downloading the invoice; no new permission introduced). Enforces the same branch scope as `GET /invoices/:id`. Optional body: `{ email?: string }` — when omitted, the recipient is `customer.email` (from the sale's linked customer).

Behavior:

1. Load the invoice via the same lookup used by `GET /invoices/:id`; enforce branch scope; not found → HTTP 404.
2. Resolve the recipient: `body.email` if present and non-empty (validated as a well-formed email via Zod `.email()`, else HTTP 400), otherwise `customer.email`. If both are absent/null → HTTP 400 `{"error": "Customer has no email and no override provided"}`.
3. Verify the invoice has a `facturamaCfdiId` (i.e. it was successfully stamped) — if `null`, HTTP 400 `{"error": "Invoice has not been stamped"}`.
4. Fetch PDF and XML buffers by invoking `DownloadInvoiceFileUseCase.execute(id, "pdf")` and `DownloadInvoiceFileUseCase.execute(id, "xml")` (the same use case backing the existing download endpoint — no duplicated Facturama-fetch logic).
5. Send a single email to the resolved recipient with both files attached (`factura-<folio>.pdf`, `factura-<folio>.xml`), subject/body referencing the invoice's folio and total.
6. This send is SYNCHRONOUS — unlike the admin notification emails in `admin-notifications-api`, a failure here (SMTP unreachable, auth failure, etc.) SHALL propagate to the caller as HTTP 502 `{"error": "Failed to send invoice email"}`. Nothing about the invoice record is mutated by this endpoint either way.

Returns HTTP 200 `{"sentTo": "<resolved-email>"}` on success.

#### Scenario: Successful send to customer's email
- **WHEN** an authorized caller POSTs with no body for a stamped invoice whose linked `customer.email = "cliente@ejemplo.com"`
- **THEN** the system returns HTTP 200 `{"sentTo": "cliente@ejemplo.com"}` and an email with PDF+XML attached was sent to that address

#### Scenario: Override recipient
- **WHEN** the body is `{ "email": "otra@direccion.com" }`
- **THEN** the email is sent to `otra@direccion.com` regardless of `customer.email`

#### Scenario: No email available
- **WHEN** `customer.email` is `null` and the body omits `email`
- **THEN** the system returns HTTP 400 `{"error": "Customer has no email and no override provided"}` and no send is attempted

#### Scenario: Malformed override email
- **WHEN** the body is `{ "email": "not-an-email" }`
- **THEN** the system returns HTTP 400 with a Zod validation error, no send is attempted

#### Scenario: Invoice not yet stamped
- **WHEN** the invoice's `facturamaCfdiId` is `null`
- **THEN** the system returns HTTP 400 `{"error": "Invoice has not been stamped"}`

#### Scenario: SMTP failure propagates to caller
- **WHEN** the SMTP server is unreachable or rejects authentication
- **THEN** the system returns HTTP 502 `{"error": "Failed to send invoice email"}`

#### Scenario: Forbidden without billing:read
- **WHEN** a caller without `billing:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "billing:read"}`

#### Scenario: Out-of-branch caller is forbidden
- **WHEN** a caller without `branches:access_all` requests an invoice belonging to a sale in a different branch
- **THEN** the system returns HTTP 403
