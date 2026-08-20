## MODIFIED Requirements

### Requirement: Manage CSD (Certificado de Sello Digital)
The system SHALL expose `POST /api/v1/admin/billing/csd` to upload or replace a CSD for an emitter RFC via Facturama, and `GET /api/v1/admin/billing/csd` to read its status. Requires `billing:manage_csd` (admin only). POST body: `{ rfc: string, certificateBase64: string, privateKeyBase64: string, privateKeyPassword: string, legalName?: string (max 200), fiscalRegime?: string (regex ^\d{3}$, SAT c_RegimenFiscal key), zipCode?: string (regex ^\d{5}$) }`. The CSD cryptographic material (`certificateBase64`, `privateKeyBase64`, `privateKeyPassword`) is forwarded to Facturama and **never persisted in the local database**; secrets are redacted from logs. `rfc`/`legalName`/`fiscalRegime`/`zipCode` are NOT secrets and, on a successful CSD upload, ARE persisted to `EmitterFiscalSettings` (a singleton row) so `FacturamaRestGateway` (both `billing` and `waybills` modules) can resolve the CFDI `Emisor` node from the database instead of environment variables. Persistence happens ONLY after Facturama accepts the CSD (`gateway.uploadCsd` resolves) — if Facturama rejects it, neither the CSD nor the fiscal fields are persisted. Persistence is a partial upsert: omitted optional fields (`legalName`/`fiscalRegime`/`zipCode`) leave the previously stored values unchanged (same semantics as `PATCH /settings/ticket`), while a resend of `rfc` always updates it. Returns HTTP 200 on success.

`GET /api/v1/admin/billing/csd` SHALL return the merge of Facturama's live CSD status (expiration, validity) and the currently persisted `legalName`/`fiscalRegime`/`zipCode` (all `null` if never captured), so the CSD manager UI can pre-fill the form.

#### Scenario: Upload CSD persists fiscal data on success
- **WHEN** an admin posts a valid `.cer`/`.key` pair (base64) with the private key password, RFC, legal name, fiscal regime, and zip code
- **THEN** the system forwards the CSD material to Facturama, and — only after Facturama accepts it — persists `rfc`/`legalName`/`fiscalRegime`/`zipCode` to `EmitterFiscalSettings`, returning HTTP 200 with the CSD status

#### Scenario: Facturama rejects the CSD — nothing persisted
- **WHEN** Facturama rejects the uploaded CSD (invalid certificate/password)
- **THEN** the system returns the existing error response and does NOT write to `EmitterFiscalSettings`, leaving any previously persisted fiscal data unchanged

#### Scenario: Re-upload without fiscal fields preserves previous values
- **WHEN** an admin re-uploads the CSD (e.g., renewal) sending only `rfc`/`certificateBase64`/`privateKeyBase64`/`privateKeyPassword`, omitting `legalName`/`fiscalRegime`/`zipCode`
- **THEN** the system updates the CSD and `rfc`, but leaves the previously persisted `legalName`/`fiscalRegime`/`zipCode` unchanged

#### Scenario: Invalid fiscal regime or zip code format rejected
- **WHEN** the request body includes `fiscalRegime` or `zipCode` not matching their required format
- **THEN** the system returns HTTP 400 before calling Facturama or touching the database

#### Scenario: Get CSD status includes persisted fiscal data
- **WHEN** an admin calls `GET /api/v1/admin/billing/csd`
- **THEN** the system returns HTTP 200 with the emitter's CSD status (e.g., expiration, RFC) merged with the currently persisted `legalName`/`fiscalRegime`/`zipCode` (`null` for any field never captured)

#### Scenario: Non-admin forbidden
- **WHEN** a user without `billing:manage_csd` calls either endpoint
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:manage_csd"}`

