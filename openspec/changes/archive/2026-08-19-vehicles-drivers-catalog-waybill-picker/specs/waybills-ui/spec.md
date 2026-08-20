## MODIFIED Requirements

### Requirement: Generate Carta Porte from a sale
The system SHALL render a section (`SaleWaybillSection`) on `/sales/[id]` offering a "Generar Carta Porte" call-to-action when `sale.status === 'completed'`, `sale.customerId` is not `null`, and the current user has `waybills:write`. The section SHALL NOT render (or SHALL show nothing actionable) when the sale is not completed, has no customer, or the user lacks the permission.

The CTA SHALL navigate to `/sales/[id]/waybill/new`, rendering `CreateSaleWaybillPage` (also gated by `waybills:write`, additionally requiring `waybills:stamp` to submit). The form SHALL show the origin branch (the sale's branch) and destination customer (name, code) as read-only text — no branch/customer selector is rendered. Merchandise lines SHALL be pre-populated from `sale.items` (one line per `SaleItem`, with `productId`, `productNameSnapshot`, and `quantity` pre-filled and not editable); for each line the user SHALL additionally provide `satBienesTranspCode` and `weightKg` (required before submission) and MAY mark `isHazardousMaterial`/`hazardousMaterialCode`. The form SHALL also collect the same vehicle, driver, and schedule fields (`departureAt`, `arrivalAt`, `distanceKm`) that `type='carta_porte'` required at `/waybills/new` before this change.

`VehicleDriverForm` SHALL render two comboboxes above the vehicle and driver field groups respectively: "Seleccionar vehículo del catálogo" and "Seleccionar operador del catálogo", each backed by `useVehiclesOptions`/`useDriversOptions` (active-only, cached 60s, mirroring `useFoliosOptions`). Selecting an option SHALL populate the corresponding 6 (vehicle) or 3 (driver) text fields with the catalog entry's values while leaving them editable, and SHALL set the hidden `vehicleId`/`driverId` submitted alongside the snapshot. Manually editing any field after a selection SHALL NOT alter the catalog entry — it only changes this waybill's snapshot. The user MAY skip both comboboxes and fill every field manually, exactly as before this change; in that case `vehicleId`/`driverId` are omitted from the submission.

Submission calls `POST /api/v1/admin/waybills` with `type: "carta_porte"` and `saleId` (no `originBranchId`/`destinationBranchId` in the body), including `vehicle.vehicleId`/`driver.driverId` when a catalog entry was selected. On success (HTTP 201), the system stamps immediately (no draft) and redirects to `/waybills/[id]`.

#### Scenario: CTA visible for a completed sale with a customer
- **WHEN** a user with `waybills:write` opens `/sales/[id]` for a `completed` sale that has a `customerId`
- **THEN** the "Generar Carta Porte" CTA is visible

#### Scenario: CTA hidden for a sale without a customer
- **WHEN** the sale is `completed` but has no `customerId` (walk-in sale)
- **THEN** the CTA is not shown

#### Scenario: CTA hidden for a non-completed sale
- **WHEN** the sale's `status` is `cancelled` or `edited`
- **THEN** the CTA is not shown

#### Scenario: Lines pre-filled from the sale, read-only product/quantity
- **WHEN** the user opens `/sales/[id]/waybill/new` for a sale with 2 `SaleItem`s
- **THEN** the form shows 2 pre-filled merchandise lines (product name, quantity, not editable), each requiring the user to fill `satBienesTranspCode` and `weightKg` before submission

#### Scenario: Origin and destination shown read-only
- **WHEN** the form renders
- **THEN** the origin (sale's branch name) and destination (sale's customer name + code) are shown as static text, with no selector to change either

#### Scenario: Successful submission redirects to the waybill detail
- **WHEN** the backend returns HTTP 201
- **THEN** the UI redirects to `/waybills/[id]`, and the created waybill's detail links back to the originating sale

#### Scenario: Selecting a catalog vehicle autofills its fields
- **WHEN** the user selects an entry from "Seleccionar vehículo del catálogo"
- **THEN** the 6 vehicle fields (`plate`, `vehicleConfig`, `permitType`, `permitNumber`, `insuranceCompany`, `insurancePolicy`) are populated with that vehicle's values, remaining editable, and the internal `vehicleId` is set for submission

#### Scenario: Selecting a catalog driver autofills its fields
- **WHEN** the user selects an entry from "Seleccionar operador del catálogo"
- **THEN** the 3 driver fields (`name`, `rfc`, `licenseNumber`) are populated with that driver's values, remaining editable, and the internal `driverId` is set for submission

#### Scenario: Editing an autofilled field does not touch the catalog
- **WHEN** the user selects a vehicle from the combobox and then edits the "Póliza" field
- **THEN** only this waybill's snapshot reflects the edited value; a subsequent `GET /api/v1/admin/vehicles/:id` for that catalog vehicle still returns its original `insurancePolicy`

#### Scenario: Manual capture without selecting from the catalog still works
- **WHEN** the user fills every vehicle/driver field by hand without using either combobox
- **THEN** the form submits successfully with `vehicleId`/`driverId` omitted, identical to the pre-change behavior

#### Scenario: Combobox lists only active catalog entries
- **WHEN** a vehicle or driver has been soft-deleted (`isActive=false`)
- **THEN** it does not appear as an option in the respective combobox

---

### Requirement: Creation error handling (Carta Porte from sale)
The system SHALL map backend error responses from `POST /api/v1/admin/waybills` (submitted from `/sales/[id]/waybill/new`, `type='carta_porte'` only) to typed errors and render actionable inline feedback WITHOUT clearing any previously entered form data:

- `409 SaleNotCompleted` → the form is not reachable in the normal flow (the CTA is hidden for non-completed sales); if reached via stale state, shown as a blocking message with a link back to `/sales/[id]`.
- `409 SaleHasNoCustomer` → same treatment as `SaleNotCompleted` — blocking message, link back to the sale.
- `400 CustomerAddressIncomplete {customerId, missingFields}` → message listing the missing fields for the customer, with a link to `/catalogs/customers`.
- `400 BranchAddressIncomplete {branchId, missingFields}` → message listing the missing fields for the sale's origin branch, with a link to `/catalogs/branches`.
- `400 VehicleNotFound` → inline message near the vehicle combobox ("El vehículo seleccionado ya no existe; vuelve a seleccionarlo o captura los datos manualmente"), form remains editable.
- `400 DriverNotFound` → same treatment as `VehicleNotFound`, scoped to the driver combobox.
- `422 FacturamaStampError {detail}` → the normalized detail is shown; the form remains editable for retry.
- `403 Forbidden {required: "waybills:stamp"}` → shown as a distinct message ("no tienes permiso para timbrar Carta Porte") rather than the generic write-permission error.

#### Scenario: Customer address incomplete links to catalog
- **WHEN** the backend returns `400 CustomerAddressIncomplete` for the sale's customer
- **THEN** the UI shows which fields are missing and a link to `/catalogs/customers`

#### Scenario: Facturama rejection preserves form state
- **WHEN** the backend returns `422 FacturamaStampError`
- **THEN** the error detail is shown and every previously entered field/line remains populated for the user to retry

#### Scenario: Missing stamp permission shown distinctly
- **WHEN** the backend returns `403 {"required":"waybills:stamp"}`
- **THEN** the UI shows a message specific to the missing timbrado permission, not the generic "sin permiso de escritura" message

#### Scenario: Stale vehicle selection reported inline
- **WHEN** the backend returns `400 VehicleNotFound` (the selected vehicle was deleted between page load and submission)
- **THEN** the form shows an inline message near the vehicle combobox and preserves all other entered data
