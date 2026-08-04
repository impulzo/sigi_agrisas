## ADDED Requirements

### Requirement: Structured fiscal address section in the branch modal
The branch catalog's edit modal (`BranchEditModal`) SHALL include a "Domicilio fiscal (Carta Porte)" section, independent of the pre-existing free-text `address` field, exposing the 8 structured address fields already supported by the backend (`admin-branches` spec): `addressStreet`, `addressExteriorNumber`, `addressInteriorNumber`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressCountry`, `addressZipCode`.

The modal SHALL follow the multi-section layout pattern established by `ProviderEditModal` (grouped `<section>` blocks with a bordered separator between them, a wider dialog, and an `h3` section heading), rather than the flat single-column layout `BranchEditModal` currently uses.

`addressZipCode` SHALL be validated client-side against `^\d{5}$` and `addressState` against `^[A-Z]{2,3}$`, mirroring the backend's validation, before the "Guardar" button is enabled.

Saving only the structured address fields (leaving `code`, `name`, `address`, `phone`, `email`, `isActive` unchanged) SHALL compute a diff containing exclusively the changed structured fields and submit `PATCH /api/v1/admin/branches/:id` with that partial body.

#### Scenario: Structured address section renders independently of free-text address
- **WHEN** the branch modal opens in either `create` or `edit` mode
- **THEN** the "Domicilio fiscal (Carta Porte)" section is visible with all 8 fields, separate from the existing "Dirección" free-text field

#### Scenario: Saving only the fiscal address
- **WHEN** the user fills only `addressStreet`, `addressExteriorNumber`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressZipCode` on an existing branch and clicks "Guardar"
- **THEN** the PATCH body contains only those changed fields, not `code`, `name`, `address`, `phone`, or `email`

#### Scenario: Invalid zip code blocks save
- **WHEN** the user enters `addressZipCode: "12"` (not 5 digits)
- **THEN** an inline validation error is shown and "Guardar" remains disabled

#### Scenario: Invalid state key blocks save
- **WHEN** the user enters `addressState: "son"` (lowercase)
- **THEN** an inline validation error is shown and "Guardar" remains disabled

#### Scenario: Completing the fiscal address unblocks Carta Porte transfers
- **WHEN** a branch previously missing structured address fields has all 8 fields saved from this modal
- **THEN** the branch can subsequently be selected as origin or destination of a `type='carta_porte'` waybill without triggering `BranchAddressIncomplete`
