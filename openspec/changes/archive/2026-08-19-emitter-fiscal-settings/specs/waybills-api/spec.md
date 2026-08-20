## MODIFIED Requirements

### Requirement: WaybillFacturamaGateway port (module-local, decoupled from billing)
The system SHALL define an application port `WaybillFacturamaGateway` in `src/modules/waybills/application/ports/` with methods `stampTraslado(payload): Promise<{cfdiId, uuid, xmlUrl?, pdfUrl?}>`, `cancel(cfdiId, motive): Promise<{success, acuseBase64?}>`, `download(format, cfdiId): Promise<{contentBase64, contentType}>`. Infrastructure implementations `FacturamaRestGateway` and `FakeFacturamaGateway` SHALL live under `src/modules/waybills/infrastructure/services/` — they SHALL NOT be imported from or re-export `src/modules/billing/`'s `FacturamaGateway`, keeping the two modules decoupled (a waybill is not an invoice). The DI container SHALL select the real vs fake implementation via the `FACTURAMA_MOCK` env var, the same mechanism `billing-api` uses.

`FacturamaRestGateway` SHALL authenticate with HTTP Basic Auth built from `FACTURAMA_USER`/`FACTURAMA_PASSWORD` and fail fast at construction only when `FACTURAMA_MOCK=false` and those credentials are missing. The emitter's fiscal identity used to build the CFDI `Emisor` node in `stampTraslado`'s payload (RFC, legal name, fiscal regime, zip code) is NO LONGER read from `process.env.FACTURAMA_EMITTER_*` nor validated at construction; it is resolved from the shared `EmitterFiscalSettings` store (`src/shared/infrastructure/emitter/`, populated via `billing-api`'s CSD upload flow) on each `stampTraslado` call. If that data is incomplete or absent at stamp time (and `FACTURAMA_MOCK=false`), the gateway SHALL throw `EmitterFiscalDataIncompleteError` before calling Facturama. `FakeFacturamaGateway` (used when `FACTURAMA_MOCK=true`, the default) does NOT require `EmitterFiscalSettings` to be populated.

#### Scenario: Mock mode used in tests and default env
- **WHEN** `FACTURAMA_MOCK` is unset or `"true"`
- **THEN** the DI container wires `FakeFacturamaGateway`, producing deterministic UUIDs without network calls, regardless of whether `EmitterFiscalSettings` is populated

#### Scenario: No cross-module import
- **WHEN** static analysis inspects `src/modules/waybills/`
- **THEN** no file imports from `src/modules/billing/`

#### Scenario: Stamping Carta Porte with incomplete emitter fiscal data
- **WHEN** `FACTURAMA_MOCK=false`, Facturama credentials are present, and `EmitterFiscalSettings` has any of `rfc`/`legalName`/`fiscalRegime`/`zipCode` missing
- **THEN** `stampTraslado` throws `EmitterFiscalDataIncompleteError` before making any Facturama HTTP request, and `POST /api/v1/admin/waybills` (type `carta_porte`) maps it to HTTP 409 `{"error":"EmitterFiscalDataIncomplete"}`

#### Scenario: Real mode requires Facturama credentials
- **WHEN** `FACTURAMA_MOCK=false` and `FACTURAMA_USER`/`FACTURAMA_PASSWORD` are missing
- **THEN** the gateway construction throws a startup error
