## MODIFIED Requirements

### Requirement: Customer create/edit modal with grouped sections including credit fields
The system SHALL provide a single modal component `CustomerEditModal` handling both creation and edition via a `mode` prop (`"create" | "edit"`). Fields SHALL be grouped into three labelled sections: "Datos básicos" (`code`, `name`, `rfc`), "Datos fiscales" (`legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, collapsible/optional), "Contacto y crédito" (`email`, `phone`, `address`, `contactName`, `notes`, `creditLimit`, `creditDays`). The fields `code` and `rfc` SHALL be uppercase-forced as the user types. The field `code` SHALL be disabled in `edit` mode. The `taxRegime` and `cfdiUse` fields SHALL be rendered as comboboxes backed by the SAT reference catalogs (`GET /api/v1/admin/sat-codes/regimen-fiscal` and `GET /api/v1/admin/sat-codes/uso-cfdi`), using the shared molecule `SatCatalogCombobox` (located in `app/_components/molecules/SatCatalogCombobox/`): they SHALL load in BOTH `mode="create"` and `mode="edit"`; the user SHALL be able to filter options by name (description) or code; selecting an option SHALL store the `code` value in the field. Selection SHALL be enforced: a free-typed value that does not match an option of the catalog SHALL be reverted when the field loses focus, so only catalog codes can be saved. Client-side validation SHALL mirror the backend: `code` `^[A-Z0-9_]{1,32}$`, `rfc` `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$`, `taxRegime` `^\d{3}$`, `cfdiUse` `^[A-Z]{1,2}\d{2}$`, `taxZipCode` `^\d{5}$`, `creditLimit` a non-negative number or empty (maps to `null`), `creditDays` a non-negative integer (left empty on create lets the backend apply its default of 30; left empty on edit is not sent as part of the diff unless explicitly cleared). In `create` mode the save button SHALL be enabled once `code`, `name`, `rfc` are filled and valid. In `edit` mode the save button SHALL be disabled while the diff against the loaded entity is empty.

#### Scenario: Create mode renders all fields editable
- **WHEN** the modal opens in `mode="create"`
- **THEN** all fields across the three sections are editable and `code` is enabled

#### Scenario: Edit mode locks code
- **WHEN** the modal opens in `mode="edit"` with an existing customer
- **THEN** the `code` field renders disabled and pre-filled; the remaining fields are pre-filled and editable

#### Scenario: Tax regime and CFDI use catalogs load on create
- **WHEN** the modal opens in `mode="create"`
- **THEN** the `taxRegime` and `cfdiUse` comboboxes fetch their SAT catalog and the user can search options by name

#### Scenario: Tax regime and CFDI use catalogs load on edit with prefilled code
- **WHEN** the modal opens in `mode="edit"` for a customer with `taxRegime: "612"` and `cfdiUse: "G03"`
- **THEN** both comboboxes load their catalog and render `612` and `G03` as the current selection

#### Scenario: Filter by name and select stores the code
- **WHEN** the user types "general" in the tax regime combobox and selects the `601` option
- **THEN** the field stores `601` (the code, not the description) and the create/update payload carries `taxRegime: "601"`

#### Scenario: Free text not matching the catalog is reverted
- **WHEN** the user types an arbitrary string in the CFDI use combobox that matches no catalog option and the field loses focus
- **THEN** the input reverts to the previous valid selection (or empty) and the arbitrary string is not saved

#### Scenario: Successful creation
- **WHEN** a user with `customers:write` fills `code`, `name`, `rfc` (required) and clicks "Guardar"
- **THEN** the modal calls `POST /api/v1/admin/customers`; on HTTP 201 it closes and the table refreshes

#### Scenario: Creation omitting creditDays lets backend apply default
- **WHEN** the user submits a new customer without touching the `creditDays` field
- **THEN** the request body does not force a `creditDays` value, and the created customer shows `creditDays: 30` (backend default) in the refreshed table

#### Scenario: Invalid RFC client-side
- **WHEN** the user types an RFC that does not match the expected pattern and tries to submit
- **THEN** the modal shows an inline error under the RFC field and does not dispatch the request

#### Scenario: 409 duplicate code shows inline error
- **WHEN** the create request returns HTTP 409 for a duplicate `code`
- **THEN** the modal stays open and shows an inline error under the `code` field

#### Scenario: 409 duplicate RFC shows inline error
- **WHEN** the create or update request returns HTTP 409 for a duplicate `rfc`
- **THEN** the modal stays open and shows an inline error under the `rfc` field

#### Scenario: Empty diff in edit disables save
- **WHEN** the modal is in `edit` mode and the user has not changed any field
- **THEN** the save button is disabled

#### Scenario: Diff-only submit on edit
- **WHEN** the user changes only `creditDays` from 30 to 60 in edit mode
- **THEN** the modal calls `PATCH /api/v1/admin/customers/:id` with body `{ "creditDays": 60 }` exclusively

#### Scenario: Optional field cleared via null
- **WHEN** the user clears the `creditLimit` field in edit mode and submits
- **THEN** the request sends `{ "creditLimit": null }`

## ADDED Requirements

### Requirement: SAT catalogs in the quick-add customer modal (POS / Cotizaciones / Facturación)
The system SHALL reuse the shared `SatCatalogCombobox` molecule for the fiscal fields of the quick-add customer modal `CustomerQuickAddModal` (used by the POS flow and by the CustomerPicker of Cotizaciones/Facturación, exposed via its "Datos fiscales (opcionales)" collapsible section): `taxRegime` SHALL be backed by `GET /api/v1/admin/sat-codes/regimen-fiscal` and `cfdiUse` by `GET /api/v1/admin/sat-codes/uso-cfdi`. The comboboxes SHALL behave identically to the catalog modal — search by name or code, selection stores the code, and free text not matching the catalog is reverted on blur. The quick-add payload SHALL send the selected codes; client-side validation in `customerQuickAdd.schema.ts` SHALL mirror the backend regexes: `taxRegime` `^\d{3}$` and `cfdiUse` `^[A-Z]{1,2}\d{2}$` (accepting `CP01`/`CN01`).

#### Scenario: Fiscal comboboxes available in quick-add
- **WHEN** a user with `customers:write` opens `CustomerQuickAddModal` from the POS, Cotizaciones or Facturación and expands "Datos fiscales"
- **THEN** the `taxRegime` and `cfdiUse` comboboxes render, load their SAT catalog and allow searching options by name

#### Scenario: Selecting a regime in quick-add stores the code
- **WHEN** the user searches "simplificado" in the quick-add tax regime combobox and selects the `626` option
- **THEN** the field stores `626` and the created customer payload carries `taxRegime: "626"`

#### Scenario: 4-character CFDI use accepted in quick-add
- **WHEN** the user selects the `CP01` ("Pagos") option in the quick-add CFDI use combobox and submits
- **THEN** the request payload carries `cfdiUse: "CP01"` and validation does not reject it
