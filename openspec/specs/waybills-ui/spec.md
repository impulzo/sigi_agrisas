# Spec: waybills-ui

## Purpose

Define the frontend for inter-branch merchandise transfers: listing, detail, creation (with atomic CFDI stamping), and cancellation, under `/waybills`.

---

## Requirements

### Requirement: Waybills list page
The system SHALL expose a route `/waybills` rendering `WaybillsListPage`, gated by the `waybills:read` permission (optimistic during `"loading"`, hidden when `false`). The page SHALL fetch `GET /api/v1/admin/waybills` with pagination and filters (`branchId`, `status`, `from`/`to`) and render a `WaybillsTable` with columns Folio, Origen, Destino, Estado, Fecha, Acciones.

Users without `branches:access_all` SHALL have the branch filter auto-fixed to their own `x-user-branch-id`, with no UI control to change it. Users with `branches:access_all` SHALL see a branch selector including "Todas".

#### Scenario: List renders paginated waybills
- **WHEN** a user with `waybills:read` navigates to `/waybills`
- **THEN** the page shows a paginated table of waybills matching the current filters

#### Scenario: Scoped user cannot pick another branch
- **WHEN** a user without `branches:access_all` views the toolbar
- **THEN** no branch selector is rendered (or it is locked to their own branch)

#### Scenario: NavigationRail entry hidden without permission
- **WHEN** the current user lacks `waybills:read`
- **THEN** the `waybills` item does not appear in `NavigationRail`

---

### Requirement: Waybill detail page
The system SHALL expose `/waybills/[id]` rendering `WaybillDetailPage`, gated by `waybills:read`. It SHALL display: snapshotted origin/destination addresses, `WaybillItemsTable` (product, quantity, weight, SAT transport key), vehicle and driver data, CFDI status and UUID, and (for `status='completed'`) buttons to download PDF/XML and cancel (gated additionally by `waybills:cancel`).

For `status='cancelled'` waybills, the page SHALL show a cancellation banner with reason and date, and SHALL NOT show the cancel button.

#### Scenario: Detail shows full snapshot
- **WHEN** a completed waybill's detail is opened
- **THEN** origin/destination addresses, merchandise lines, vehicle, driver, and CFDI UUID are all visible

#### Scenario: Cancelled waybill shows banner, no cancel button
- **WHEN** a cancelled waybill's detail is opened
- **THEN** a cancellation banner is shown and the "Cancelar" action is absent

#### Scenario: Download PDF or XML
- **WHEN** the user clicks "Descargar PDF" or "Descargar XML" on a stamped waybill
- **THEN** the file downloads via `GET /waybills/:id/download?format=...`, with the filename derived from `Content-Disposition` (fallback `carta-porte-<uuid>.<ext>`)

---

### Requirement: Create waybill form
The system SHALL expose `/waybills/new` rendering `NewWaybillPage`, gated by `waybills:write`. The form SHALL include: `BranchPairSelector` (origin/destination, mutually exclusive — selecting one as origin removes it from the destination options and vice versa, enforced in the render, not only on submit), merchandise lines added from the product catalog (`ProductCatalogPanel`/`ProductCatalogTable`, reused from POS) with per-line inputs for `weightKg`, `satBienesTranspCode`, `quantity`, and optional `isHazardousMaterial`/`hazardousMaterialCode`, free-text vehicle fields (plate, config, permit type/number, insurance company/policy — no master catalog, no autocomplete), free-text driver fields (name, optional RFC, license number), and schedule fields (`departureAt`, `arrivalAt`, `distanceKm`).

Submission calls `POST /api/v1/admin/waybills`. On success (HTTP 201), the system stamps immediately (no draft) and redirects to `/waybills/[id]` for the created waybill.

#### Scenario: Origin/destination mutual exclusion in UI
- **WHEN** the user selects Branch A as origin
- **THEN** Branch A is removed from the destination selector's options

#### Scenario: Line requires weight and SAT key
- **WHEN** a merchandise line is missing `weightKg` or `satBienesTranspCode`
- **THEN** the form blocks submission with an inline error on that line

#### Scenario: Successful creation redirects to detail
- **WHEN** the backend returns HTTP 201
- **THEN** the UI redirects to `/waybills/[id]` showing the newly stamped waybill

---

### Requirement: Creation error handling
The system SHALL map backend error responses from `POST /api/v1/admin/waybills` to typed errors and render actionable inline feedback WITHOUT clearing any previously entered form data:

- `400 InvalidBranchPair` → inline error on the branch selector.
- `400 BranchAddressIncomplete {branchId, missingFields}` → message listing the missing fields for the named branch, with a link to `/catalogs/branches`.
- `409 InsufficientStockAtOrigin {productId}` → the offending merchandise line is highlighted; other lines and fields remain untouched.
- `422 FacturamaStampError {detail}` → the normalized detail is shown; the form remains editable for retry.

#### Scenario: Branch address incomplete links to catalog
- **WHEN** the backend returns `400 BranchAddressIncomplete` for the destination branch
- **THEN** the UI shows which fields are missing and a link to `/catalogs/branches`

#### Scenario: Insufficient stock highlights the line
- **WHEN** the backend returns `409 InsufficientStockAtOrigin` for a specific `productId`
- **THEN** only the corresponding line in the form is visually flagged; the rest of the form is preserved

#### Scenario: Facturama rejection preserves form state
- **WHEN** the backend returns `422 FacturamaStampError`
- **THEN** the error detail is shown and every previously entered field/line remains populated for the user to retry

---

### Requirement: Cancel waybill
The system SHALL allow cancelling a `status='completed'` waybill from `WaybillActionsBar` via a `ConfirmDialog`-based `CancelWaybillModal` requiring a `reason` (3-500 chars, mirroring backend validation), gated by `waybills:cancel`. On success, the detail page reflects `status='cancelled'` and the cancellation banner.

#### Scenario: Cancel with reason
- **WHEN** the user confirms cancellation with a valid reason
- **THEN** `POST /waybills/:id/cancel` is sent and the page updates to show `cancelled` status

#### Scenario: Cancel button hidden without permission
- **WHEN** the current user lacks `waybills:cancel`
- **THEN** the cancel button is not rendered, even if the waybill is `completed`

#### Scenario: Cancel button hidden for already-cancelled waybill
- **WHEN** a waybill's `status` is already `cancelled`
- **THEN** the cancel button is not rendered (mirrors backend's non-idempotent cancellation)
