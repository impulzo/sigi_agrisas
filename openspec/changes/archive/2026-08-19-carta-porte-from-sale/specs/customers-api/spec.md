## ADDED Requirements

### Requirement: Structured address for Carta Porte
`POST /api/v1/admin/customers` and `PATCH /api/v1/admin/customers/:id` SHALL accept 8 additional optional fields, mirroring the structured address already present on `Branch` (see `admin-branches` spec), used exclusively to build the destination `Ubicacion` node when generating a Carta Porte from a sale of this customer (see `waybills-api`): `addressStreet` (max 150), `addressExteriorNumber` (max 20), `addressInteriorNumber` (max 20, nullable), `addressNeighborhood` (max 100), `addressMunicipality` (max 100), `addressState` (max 3, SAT `c_Estado` key), `addressCountry` (max 3, SAT `c_Pais` key, defaults to `"MEX"` when omitted on create), `addressZipCode` (max 5). All are independent of, and do NOT replace or sync with, the existing free-text `address` field (still used for tickets/invoices display). All 8 fields are `null` by default for customers created before this change and for new customers that omit them.

#### Scenario: Structured address captured on creation
- **WHEN** `POST /api/v1/admin/customers` includes `addressStreet`, `addressExteriorNumber`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressZipCode`
- **THEN** the system returns HTTP 201 with those fields persisted, independent of the existing `address` field

#### Scenario: Structured address updated independently of free-text address
- **WHEN** `PATCH /api/v1/admin/customers/:id` includes only `addressZipCode`
- **THEN** the system updates `addressZipCode` and leaves the free-text `address` field and the other 7 structured fields unchanged

#### Scenario: Existing customers default to null structured address
- **WHEN** a customer created before this change is fetched via `GET /api/v1/admin/customers/:id`
- **THEN** all 8 structured address fields are `null` until explicitly set via `PATCH`

#### Scenario: addressCountry defaults to MEX on creation
- **WHEN** `POST /api/v1/admin/customers` omits `addressCountry` but includes the other structured address fields
- **THEN** the system persists `addressCountry: "MEX"`
