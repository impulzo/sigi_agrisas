## ADDED Requirements

### Requirement: Stamp invoice (CFDI Ingreso)
The system SHALL expose `POST /api/v1/admin/invoices` that issues (timbra) a CFDI 4.0 of type Ingreso (`I`) via Facturama and persists an `Invoice` only on success. Requires `billing:write`. The request body MUST be one of two mutually exclusive shapes:
- **Sale-linked**: `{ saleId: string (uuid), paymentForm?: string, paymentMethod?: string, cfdiUse?: string }` — the system loads the sale (must be `status='completed'`), derives `branchId`, receiver, items and totals from the sale and its customer.
- **Standalone**: `{ branchId?: string, customer: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, items: InvoiceItemInput[], paymentForm?, paymentMethod? }` — the system computes totals with `Decimal(14,4)` banker's rounding. Standalone invoices have `saleId=null`.

`InvoiceItemInput`: `{ productId?: string|null, productCode: string, description: string, satProductCode?: string, satUnitCode?: string, unit?: string, quantity: number, unitPrice: number, discountPct?: number, ivaRate?: number, iepsRate?: number }`. Defaults: `paymentForm='01'`, `paymentMethod='PUE'`, `cfdiUse` from customer. **No inventory movement occurs in any case.** Returns HTTP 201 with `InvoiceDto`.

#### Scenario: Stamp from completed sale
- **WHEN** authenticated user with `billing:write` posts `{ "saleId": "<uuid>" }` for a `completed` sale whose customer has complete fiscal data
- **THEN** the system calls Facturama, persists an `Invoice` with `status='stamped'`, `uuid` (folio fiscal), `facturamaCfdiId`, `saleId` set, and returns HTTP 201 with `InvoiceDto`

#### Scenario: Stamp standalone invoice
- **WHEN** the body contains `customer` + `items[]` and no `saleId`
- **THEN** the system stamps the CFDI, persists `Invoice` with `saleId=null`, and does NOT modify `branch_inventory`

#### Scenario: Sale not completed
- **WHEN** the referenced sale has `status` other than `completed`
- **THEN** the system returns HTTP 409 `{"error":"SaleNotInvoiceable"}`

#### Scenario: Sale already has a stamped invoice
- **WHEN** the sale already has an `Invoice` with `status='stamped'`
- **THEN** the system returns HTTP 409 `{"error":"SaleAlreadyInvoiced","invoiceId":"<uuid>"}`

#### Scenario: Receiver fiscal data incomplete
- **WHEN** the customer is missing `rfc`, `cfdiUse`, `taxRegime` or `taxZipCode`
- **THEN** the system returns HTTP 400 `{"error":"ReceiverFiscalDataIncomplete"}` and does NOT call Facturama

#### Scenario: Facturama rejects the stamp
- **WHEN** Facturama returns an error (invalid CFDI, CSD missing, SAT validation)
- **THEN** the system returns HTTP 422 `{"error":"FacturamaStampError","detail":"<message>"}` and persists NO invoice

#### Scenario: Forbidden without permission
- **WHEN** user lacks `billing:write`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:write"}`

### Requirement: List invoices
The system SHALL expose `GET /api/v1/admin/invoices` returning a paginated list with branch scoping. Requires `billing:read`. Query params: `page` (default 1), `pageSize` (default 20, max 100), `status?` (`stamped`|`cancelled`), `branchId?` (only honored with `branches:access_all`), `search?` (min 2 chars; matches `uuid`, `receiverRfc`, `receiverName`). Response: `{ items: InvoiceDto[], total, page, pageSize }`, ordered `createdAt DESC`. Without `branches:access_all` the list is scoped to the caller's `x-user-branch-id`.

#### Scenario: Scoped listing
- **WHEN** a user without `branches:access_all` lists invoices
- **THEN** only invoices whose `branchId` equals the caller's branch are returned

#### Scenario: Admin filters by branch
- **WHEN** a user with `branches:access_all` passes `?branchId=<id>`
- **THEN** the response is filtered to that branch

### Requirement: Get invoice detail
The system SHALL expose `GET /api/v1/admin/invoices/:id`. Requires `billing:read`. Returns HTTP 404 if not found. Enforces branch scope (403 if out of scope without `branches:access_all`). Response `InvoiceDto` includes header fields and `items: InvoiceItemDto[]`.

#### Scenario: Get existing invoice
- **WHEN** `:id` matches an invoice in the caller's scope
- **THEN** the system returns HTTP 200 with `InvoiceDto` including items

#### Scenario: Not found
- **WHEN** `:id` matches no invoice
- **THEN** the system returns HTTP 404 `{"error":"InvoiceNotFound"}`

#### Scenario: Out of branch scope
- **WHEN** the invoice belongs to another branch and the caller lacks `branches:access_all`
- **THEN** the system returns HTTP 403

### Requirement: List invoices by sale
The system SHALL expose `GET /api/v1/admin/sales/:id/invoices` returning all invoices (including `cancelled`) linked to a sale, ordered `createdAt DESC`. Requires `billing:read`. Enforces branch scope against the sale's branch.

#### Scenario: Sale with one stamped and one cancelled invoice
- **WHEN** the sale has a cancelled invoice and a later stamped one
- **THEN** the system returns HTTP 200 with both, newest first

### Requirement: Cancel invoice
The system SHALL expose `POST /api/v1/admin/invoices/:id/cancel`. Requires `billing:cancel`. Body: `{ motive: '01'|'02'|'03'|'04', uuidReplacement?: string }`. `motive='01'` (comprobante con errores con relación) MAY include `uuidReplacement`. The system calls Facturama to cancel, then sets `status='cancelled'`, `cancellationMotive`, `cancelledAt`, `cancelledBy`. Enforces branch scope. Returns HTTP 200 with updated `InvoiceDto`.

#### Scenario: Cancel a stamped invoice
- **WHEN** a user with `billing:cancel` cancels a `stamped` invoice with `{ "motive": "02" }`
- **THEN** Facturama cancellation is requested, the invoice becomes `status='cancelled'`, and HTTP 200 is returned

#### Scenario: Cancel already-cancelled invoice
- **WHEN** the invoice is already `cancelled`
- **THEN** the system returns HTTP 409 `{"error":"InvoiceAlreadyCancelled"}`

#### Scenario: Invalid motive
- **WHEN** `motive` is not one of `01`–`04`
- **THEN** the system returns HTTP 400

#### Scenario: Forbidden without permission
- **WHEN** user lacks `billing:cancel`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:cancel"}`

### Requirement: Download invoice file (PDF/XML)
The system SHALL expose `GET /api/v1/admin/invoices/:id/download?format=pdf|xml`. Requires `billing:read`. Enforces branch scope. The system retrieves the file from Facturama by `facturamaCfdiId` (or stored URL) and responds with the binary content and the correct `Content-Type` (`application/pdf` or `application/xml`) and a `Content-Disposition` filename based on `uuid`. Default `format=pdf`.

#### Scenario: Download PDF
- **WHEN** `?format=pdf` for an existing invoice in scope
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`

#### Scenario: Download XML
- **WHEN** `?format=xml`
- **THEN** the system returns HTTP 200 with `Content-Type: application/xml`

#### Scenario: Invalid format
- **WHEN** `format` is neither `pdf` nor `xml`
- **THEN** the system returns HTTP 400

### Requirement: Manage CSD (Certificado de Sello Digital)
The system SHALL expose `POST /api/v1/admin/billing/csd` to upload or replace a CSD for an emitter RFC via Facturama, and `GET /api/v1/admin/billing/csd` to read its status. Requires `billing:manage_csd` (admin only). POST body: `{ rfc: string, certificateBase64: string, privateKeyBase64: string, privateKeyPassword: string }`. The CSD material is forwarded to Facturama and **never persisted in the local database**; secrets are redacted from logs. Returns HTTP 200 on success.

#### Scenario: Upload CSD
- **WHEN** an admin posts a valid `.cer`/`.key` pair (base64) with the private key password
- **THEN** the system forwards them to Facturama and returns HTTP 200 with the CSD status

#### Scenario: Get CSD status
- **WHEN** an admin calls `GET /api/v1/admin/billing/csd`
- **THEN** the system returns HTTP 200 with the emitter's CSD status (e.g., expiration, RFC)

#### Scenario: Non-admin forbidden
- **WHEN** a user without `billing:manage_csd` calls either endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:manage_csd"}`

### Requirement: Facturama gateway abstraction with mock mode
The system SHALL define a `FacturamaGateway` port with operations `stamp`, `cancel`, `download`, `uploadCsd`, `getCsdStatus`. The REST implementation `FacturamaRestGateway` SHALL authenticate with HTTP Basic Auth built from `FACTURAMA_USER`/`FACTURAMA_PASSWORD`, target `FACTURAMA_BASE_URL` (sandbox default), accept an injectable `fetchImpl` for tests, and normalize Facturama HTTP errors to typed domain errors. When `FACTURAMA_MOCK=true` (default) the DI container SHALL use `FakeFacturamaGateway`, which returns deterministic fake `uuid`/`facturamaCfdiId` and placeholder PDF/XML without network calls. `FacturamaRestGateway` SHALL fail fast at construction only when `FACTURAMA_MOCK=false` and credentials are missing.

#### Scenario: Mock mode by default
- **WHEN** `FACTURAMA_MOCK` is unset or `true`
- **THEN** stamping returns a deterministic fake CFDI and performs no network request

#### Scenario: Real mode requires credentials
- **WHEN** `FACTURAMA_MOCK=false` and `FACTURAMA_USER`/`FACTURAMA_PASSWORD` are missing
- **THEN** the gateway construction throws a startup error

#### Scenario: Basic Auth header
- **WHEN** the REST gateway makes a request
- **THEN** it sends `Authorization: Basic base64("<user>:<password>")`

### Requirement: Persist invoice with fiscal snapshot
The system SHALL persist `invoices` and `invoice_items` such that each invoice retains a snapshot of receiver fiscal data (`receiverRfc`, `receiverName`, `receiverCfdiUse`, `receiverFiscalRegime`, `receiverTaxZipCode`), monetary totals (`subtotal`, `taxTotal`, `total` as `Decimal(14,4)`), and per-line snapshots (`productCodeSnapshot`, `productNameSnapshot`, `satProductCode`, `satUnitCode`, `unit`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `taxObject`, line totals). `saleId` is nullable with `ON DELETE SET NULL`. Snapshots SHALL survive subsequent changes or deletion of the source sale, customer or products.

#### Scenario: Source sale deleted
- **WHEN** a sale linked to an invoice is deleted
- **THEN** the invoice persists with `saleId=null` and its snapshot intact

#### Scenario: Product renamed after invoicing
- **WHEN** a product's name changes after the invoice is stamped
- **THEN** the invoice's `productNameSnapshot` retains the original name

### Requirement: RBAC permissions for billing
The system SHALL register permissions `billing:read`, `billing:write`, `billing:cancel`, `billing:manage_csd` in the RBAC seed. Role assignments: `admin` → all four; `operator` → `billing:read`, `billing:write`, `billing:cancel`; `viewer` → `billing:read` only.

#### Scenario: Operator can stamp but not manage CSD
- **WHEN** an `operator` calls `POST /api/v1/admin/invoices`
- **THEN** the request is permitted; but `POST /api/v1/admin/billing/csd` returns HTTP 403

#### Scenario: Viewer read-only
- **WHEN** a `viewer` calls `POST /api/v1/admin/invoices`
- **THEN** the system returns HTTP 403
