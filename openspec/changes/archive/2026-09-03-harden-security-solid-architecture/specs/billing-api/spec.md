## MODIFIED Requirements

### Requirement: Resolve issuer fiscal data (cascade)
The system SHALL resolve the issuer's fiscal identity (`rfc`, `legalName`, `fiscalRegime`, `zipCode`, `address`) via a single shared, pure resolution function consumed by both "Read emitter fiscal settings (lightweight)" and "Persist invoice with fiscal snapshot", using this cascade, per field, drawing only from real data the admin has actually captured — **never a hardcoded/invented placeholder**:
1. **CSD status** — `FacturamaGateway.getCsdStatus()`. If it succeeds and returns a value, it SHALL be used for `rfc` and `legalName` (`issuer` field in the gateway's response) ONLY — `getCsdStatus()` does not expose `fiscalRegime`, `zipCode`, or `address`, so those 3 fields always fall through to tier 2 regardless of whether tier 1 succeeded.
2. **`EmitterFiscalSettings`** (local, `/billing/csd`) — used for any field tier 1 did not resolve. This is where `fiscalRegime`/`zipCode`/`address` normally come from, since the real Facturama CSD-status API doesn't expose them at all. The resolution function SHALL read this tier through a port (`EmitterFiscalSettingsStore`, an application-layer interface), never by importing the concrete infrastructure store directly — the same port is used for reading (this requirement) and for writing (CSD upload/status use cases).
3. **`TicketSettings`** (`Configuración > Ticket de venta` — `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress`) — used for `rfc`/`legalName`/`fiscalRegime`/`address` when tiers 1–2 leave them unresolved. `TicketSettings` has no zip-code field, so `zipCode` only has tiers 1–2. `TicketSettings.businessTaxRegime` is a free-text field meant for the printed ticket, captured as a leading SAT code followed by its description (e.g. `"612 — Personas Físicas con Actividad Empresarial"` or, from legacy/seeded data, `"612 Personas Físicas con Actividad Empresarial"` — the separator between code and description is not consistent across capture paths) — it is NOT a raw SAT code by itself. When this tier resolves `fiscalRegime`, the system SHALL extract only the leading numeric code (3–4 digits at the start of the string, followed by whitespace or end-of-string), never the full descriptive string, so the resolved value fits the SAT-code-length constraint that downstream persistence (`Invoice.issuerFiscalRegime`) enforces. If no such leading numeric code can be recognized, the system SHALL resolve `fiscalRegime` to `null` for this tier — it SHALL NOT truncate the description or invent a value.
4. **`null`** — any field still unresolved after all applicable tiers stays `null`. The system SHALL NOT substitute a fixed/synthetic value.

A failure in tier 1 (network error, no CSD loaded, timeout) SHALL be caught and SHALL NOT propagate as an error to the caller — resolution silently continues to tier 2/3.

#### Scenario: CSD loaded — rfc and legalName come from the certificate
- **WHEN** `getCsdStatus()` succeeds and returns `rfc`/`issuer`
- **THEN** the resolved `rfc`/`legalName` SHALL equal those values, while `fiscalRegime`/`zipCode`/`address` SHALL still come from `EmitterFiscalSettings` (or `TicketSettings` where applicable)

#### Scenario: No CSD loaded — falls through to EmitterFiscalSettings
- **WHEN** `getCsdStatus()` fails or returns no usable `rfc`/`issuer`
- **THEN** `rfc`/`legalName` SHALL come from `EmitterFiscalSettings`, or from `TicketSettings` if that row is also empty for those fields

#### Scenario: EmitterFiscalSettings empty — falls through to TicketSettings
- **WHEN** `EmitterFiscalSettings` has no row (or the relevant field is `null`) and no CSD is loaded
- **THEN** `rfc`/`legalName`/`fiscalRegime`/`address` SHALL come from `TicketSettings`' `businessRfc`/`businessName`/`businessTaxRegime`/`businessAddress` respectively

#### Scenario: Nothing resolvable anywhere — field stays null, never invented
- **WHEN** none of CSD, `EmitterFiscalSettings`, and (where applicable) `TicketSettings` have a value for a given field
- **THEN** that field SHALL be `null` in the response — the system never substitutes a hardcoded or synthetic value

#### Scenario: TicketSettings fiscalRegime tier resolves only the SAT code, not the full label
- **WHEN** `EmitterFiscalSettings.fiscalRegime` is `null`, no CSD is loaded, and `TicketSettings.businessTaxRegime` is `"612 — Personas Físicas con Actividad Empresarial"` (em-dash separator) or `"612 Personas Físicas con Actividad Empresarial"` (plain-space separator, as seeded)
- **THEN** the resolved `fiscalRegime` SHALL be `"612"` in both cases — the leading numeric code only, never the full label string

#### Scenario: TicketSettings fiscalRegime without a recognizable leading code
- **WHEN** `businessTaxRegime` does not start with a 3-4 digit numeric code (e.g. it is only a description, with no code captured)
- **THEN** the resolved `fiscalRegime` SHALL be `null` rather than a truncated or oversized value

#### Scenario: Stamping succeeds when only TicketSettings has fiscal-regime data
- **WHEN** an invoice is stamped (`stampFromSale` or `stampStandalone`) with `EmitterFiscalSettings` empty and only `TicketSettings.businessTaxRegime` populated in the `"<código> — <descripción>"` format
- **THEN** the invoice SHALL be created successfully with `issuerFiscalRegime` set to the parsed code, without a database column-overflow error

#### Scenario: Lightweight preview endpoint and stamping resolve the same parsed code
- **WHEN** `GET /billing/emitter-fiscal-settings` (used to render the draft preview) and a real stamp both resolve `fiscalRegime` from the same `TicketSettings.businessTaxRegime` value
- **THEN** both SHALL return the same parsed SAT code — the draft preview and the final stamped invoice stay consistent

#### Scenario: Resolution logic is testable without the real infrastructure store
- **WHEN** the resolution function, `UploadCsdUseCase`, or `GetCsdStatusUseCase` are unit-tested
- **THEN** a test double implementing `EmitterFiscalSettingsStore` can be substituted for the real store — none of the three requires the concrete infrastructure module to be loaded
