## ADDED Requirements

### Requirement: Structured fiscal address fields
`BranchDto` SHALL include the following nullable structured address fields, in addition to the existing free-text `address` field (which is preserved unchanged and remains independently editable): `addressStreet: string | null`, `addressExteriorNumber: string | null`, `addressInteriorNumber: string | null`, `addressNeighborhood: string | null` (colonia), `addressMunicipality: string | null`, `addressState: string | null` (SAT `c_Estado` key), `addressCountry: string | null` (default `"MEX"` when any other structured field is set), `addressZipCode: string | null` (5-digit).

`POST /admin/branches` and `PATCH /admin/branches/:id` SHALL accept all of the above as optional fields, independent of `address`. There is no requirement that all structured fields be set together at write time — partial capture is allowed; completeness is enforced only at the point of use (`waybills-api`'s `BranchAddressIncompleteError` when a branch is used as a waybill origin/destination without all fields populated).

`addressZipCode`, when provided, MUST match `^\d{5}$` (400 otherwise). `addressState`, when provided, MUST be a 2-3 uppercase letter SAT state key (format-validated only, not checked against the full SAT catalog in v1).

#### Scenario: Create branch with structured address
- **WHEN** POST body includes `addressStreet`, `addressExteriorNumber`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressZipCode`
- **THEN** the branch is created with those fields populated and `addressCountry` defaulted to `"MEX"`

#### Scenario: Partial structured address allowed
- **WHEN** PATCH body includes only `addressZipCode`
- **THEN** the branch is updated with that single field; other structured address fields remain `null` or unchanged

#### Scenario: Free-text address untouched by structured fields
- **WHEN** a branch has `address: "Sucursal Centro"` and is later updated with structured address fields
- **THEN** `address` remains `"Sucursal Centro"` unless explicitly included in the same PATCH

#### Scenario: Invalid zip code format
- **WHEN** PATCH body includes `addressZipCode: "12"`
- **THEN** the system returns HTTP 400 with a validation error
