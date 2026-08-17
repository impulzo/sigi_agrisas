## MODIFIED Requirements

### Requirement: Waybills list page
The system SHALL expose a route `/waybills` rendering `WaybillsListPage`, gated by the `waybills:read` permission (optimistic during `"loading"`, hidden when `false`). The page SHALL fetch `GET /api/v1/admin/waybills` with pagination and filters (`branchId`, `status`, `type`, `from`/`to`) and render a `WaybillsTable` with columns Folio, Tipo, Origen, Destino, Estado, Fecha, Acciones. The "Destino" column SHALL render the destination branch name for `type='simple'` rows, and the destination customer's name + code for `type='carta_porte'` rows (never a branch name for that type).

Users without `branches:access_all` SHALL have the branch filter auto-fixed to their own `x-user-branch-id`, with no UI control to change it. Users with `branches:access_all` SHALL see a branch selector including "Todas". The type filter (Simple / Con Carta Porte) SHALL be available to all users with `waybills:read` regardless of `waybills:stamp`.

#### Scenario: List renders paginated waybills
- **WHEN** a user with `waybills:read` navigates to `/waybills`
- **THEN** the page shows a paginated table of waybills matching the current filters, each row showing its `type` as a badge

#### Scenario: Scoped user cannot pick another branch
- **WHEN** a user without `branches:access_all` views the toolbar
- **THEN** no branch selector is rendered (or it is locked to their own branch)

#### Scenario: NavigationRail entry hidden without permission
- **WHEN** the current user lacks `waybills:read`
- **THEN** the `waybills` item does not appear in `NavigationRail`

#### Scenario: Filtering by type
- **WHEN** the user selects "Simple" in the type filter
- **THEN** the table shows only `type='simple'` waybills, combinable with the other active filters

#### Scenario: Carta Porte row shows customer as destination
- **WHEN** the list includes a `type='carta_porte'` row
- **THEN** its "Destino" cell shows the linked sale's customer name and code, not a branch name

---

### Requirement: Waybill detail page
The system SHALL expose `/waybills/[id]` rendering `WaybillDetailPage`, gated by `waybills:read`. For `type='carta_porte'`, it SHALL display: the origin branch and the destination CUSTOMER (name, code, snapshotted address), a link to the originating sale (`/sales/[saleId]`), `WaybillItemsTable` (product, quantity, weight, SAT transport key), vehicle and driver data, CFDI status and UUID, and (for `status='completed'`) buttons to download PDF/XML and cancel (gated additionally by `waybills:cancel`). For `type='simple'`, it SHALL display: origin/destination branch names (no address snapshot, since none is captured), `WaybillItemsTable` restricted to product/quantity columns (no weight/SAT/hazmat columns, since none apply), the transfer date, and notes — it SHALL NOT display any vehicle, driver, distance, CFDI, or sale-link section, and SHALL NOT render the PDF/XML download buttons (a `type='simple'` waybill has no CFDI to download).

For `status='cancelled'` waybills of either type, the page SHALL show a cancellation banner with reason and date, and SHALL NOT show the cancel button.

#### Scenario: Carta Porte detail shows customer destination and sale link
- **WHEN** a completed `type='carta_porte'` waybill's detail is opened
- **THEN** origin branch, destination customer (name/code/snapshotted address), a link to the originating sale, merchandise lines, vehicle, driver, and CFDI UUID are all visible

#### Scenario: Simple detail omits Carta Porte sections
- **WHEN** a completed `type='simple'` waybill's detail is opened
- **THEN** no vehicle, driver, CFDI, or sale-link section is rendered, the download buttons are absent, and the transfer date and notes are shown instead

#### Scenario: Cancelled waybill shows banner, no cancel button
- **WHEN** a cancelled waybill's detail is opened (either type)
- **THEN** a cancellation banner is shown and the "Cancelar" action is absent

#### Scenario: Download PDF or XML (Carta Porte only)
- **WHEN** the user clicks "Descargar PDF" or "Descargar XML" on a stamped `type='carta_porte'` waybill
- **THEN** the file downloads via `GET /waybills/:id/download?format=...`, with the filename derived from `Content-Disposition` (fallback `carta-porte-<uuid>.<ext>`)

---

### Requirement: Create waybill form (simple only)
The system SHALL expose `/waybills/new` rendering `NewWaybillPage`, gated by `waybills:write`, restricted EXCLUSIVELY to `type='simple'` transfers — the Carta Porte option is no longer offered here (see "Generate Carta Porte from a sale" for its replacement entry point). No type toggle is rendered.

The form SHALL include `BranchPairSelector` (origin/destination, mutually exclusive — selecting one as origin removes it from the destination options and vice versa, enforced in the render, not only on submit), merchandise lines added ONLY from the product catalog (`ProductCatalogPanel`/`ProductCatalogTable`, reused from POS) with `quantity` per line (the "+ Línea libre" affordance SHALL be absent), a transfer date field, and an optional notes field. Submission calls `POST /api/v1/admin/waybills` with `type: "simple"`. On success (HTTP 201), the waybill is created with no stamping step and the UI redirects to `/waybills/[id]`.

#### Scenario: Origin/destination mutual exclusion in UI
- **WHEN** the user selects Branch A as origin
- **THEN** Branch A is removed from the destination selector's options

#### Scenario: No free-text line option
- **WHEN** the user opens `/waybills/new`
- **THEN** the "+ Línea libre" button is not rendered, and every added line requires a catalog product selection

#### Scenario: Successful creation redirects to detail
- **WHEN** the backend returns HTTP 201
- **THEN** the UI redirects to `/waybills/[id]` showing the newly created waybill

#### Scenario: No Carta Porte option available
- **WHEN** any user (regardless of `waybills:stamp`) opens `/waybills/new`
- **THEN** no type selector is shown and no Carta Porte fields (vehicle, driver, schedule, SAT/weight) are rendered anywhere on the page

---

### Requirement: Creation error handling (simple transfers)
The system SHALL map backend error responses from `POST /api/v1/admin/waybills` (submitted from `/waybills/new`, `type='simple'` only) to typed errors and render actionable inline feedback WITHOUT clearing any previously entered form data:

- `400 InvalidBranchPair` → inline error on the branch selector.
- `400 ProductNotFound {productId}` → the offending line is highlighted.
- `409 InsufficientStockAtOrigin {productId}` → the offending merchandise line is highlighted; other lines and fields remain untouched.

#### Scenario: Product not found highlights the line
- **WHEN** the backend returns `400 ProductNotFound` for a specific `productId`
- **THEN** only the corresponding line in the form is visually flagged; the rest of the form is preserved

#### Scenario: Insufficient stock highlights the line
- **WHEN** the backend returns `409 InsufficientStockAtOrigin` for a specific `productId`
- **THEN** only the corresponding line in the form is visually flagged; the rest of the form is preserved

## ADDED Requirements

### Requirement: Generate Carta Porte from a sale
The system SHALL render a section (`SaleWaybillSection`) on `/sales/[id]` offering a "Generar Carta Porte" call-to-action when `sale.status === 'completed'`, `sale.customerId` is not `null`, and the current user has `waybills:write`. The section SHALL NOT render (or SHALL show nothing actionable) when the sale is not completed, has no customer, or the user lacks the permission.

The CTA SHALL navigate to `/sales/[id]/waybill/new`, rendering `CreateSaleWaybillPage` (also gated by `waybills:write`, additionally requiring `waybills:stamp` to submit). The form SHALL show the origin branch (the sale's branch) and destination customer (name, code) as read-only text — no branch/customer selector is rendered. Merchandise lines SHALL be pre-populated from `sale.items` (one line per `SaleItem`, with `productId`, `productNameSnapshot`, and `quantity` pre-filled and not editable); for each line the user SHALL additionally provide `satBienesTranspCode` and `weightKg` (required before submission) and MAY mark `isHazardousMaterial`/`hazardousMaterialCode`. The form SHALL also collect the same vehicle, driver, and schedule fields (`departureAt`, `arrivalAt`, `distanceKm`) that `type='carta_porte'` required at `/waybills/new` before this change.

Submission calls `POST /api/v1/admin/waybills` with `type: "carta_porte"` and `saleId` (no `originBranchId`/`destinationBranchId` in the body). On success (HTTP 201), the system stamps immediately (no draft) and redirects to `/waybills/[id]`.

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

### Requirement: Creation error handling (Carta Porte from sale)
The system SHALL map backend error responses from `POST /api/v1/admin/waybills` (submitted from `/sales/[id]/waybill/new`, `type='carta_porte'` only) to typed errors and render actionable inline feedback WITHOUT clearing any previously entered form data:

- `409 SaleNotCompleted` → the form is not reachable in the normal flow (the CTA is hidden for non-completed sales); if reached via stale state, shown as a blocking message with a link back to `/sales/[id]`.
- `409 SaleHasNoCustomer` → same treatment as `SaleNotCompleted` — blocking message, link back to the sale.
- `400 CustomerAddressIncomplete {customerId, missingFields}` → message listing the missing fields for the customer, with a link to `/catalogs/customers`.
- `400 BranchAddressIncomplete {branchId, missingFields}` → message listing the missing fields for the sale's origin branch, with a link to `/catalogs/branches`.
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
