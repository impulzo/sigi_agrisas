## MODIFIED Requirements

### Requirement: Waybills list page
The system SHALL expose a route `/waybills` rendering `WaybillsListPage`, gated by the `waybills:read` permission (optimistic during `"loading"`, hidden when `false`). The page SHALL fetch `GET /api/v1/admin/waybills` with pagination and filters (`branchId`, `status`, `type`, `from`/`to`) and render a `WaybillsTable` with columns Folio, Tipo, Origen, Destino, Estado, Fecha, Acciones.

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

---

### Requirement: Waybill detail page
The system SHALL expose `/waybills/[id]` rendering `WaybillDetailPage`, gated by `waybills:read`. For `type='carta_porte'`, it SHALL display: snapshotted origin/destination addresses, `WaybillItemsTable` (product, quantity, weight, SAT transport key), vehicle and driver data, CFDI status and UUID, and (for `status='completed'`) buttons to download PDF/XML and cancel (gated additionally by `waybills:cancel`). For `type='simple'`, it SHALL display: origin/destination branch names (no address snapshot, since none is captured), `WaybillItemsTable` restricted to product/quantity columns (no weight/SAT/hazmat columns, since none apply), the transfer date, and notes — it SHALL NOT display any vehicle, driver, distance, or CFDI section, and SHALL NOT render the PDF/XML download buttons (a `type='simple'` waybill has no CFDI to download).

For `status='cancelled'` waybills of either type, the page SHALL show a cancellation banner with reason and date, and SHALL NOT show the cancel button.

#### Scenario: Carta Porte detail shows full snapshot
- **WHEN** a completed `type='carta_porte'` waybill's detail is opened
- **THEN** origin/destination addresses, merchandise lines, vehicle, driver, and CFDI UUID are all visible

#### Scenario: Simple detail omits Carta Porte sections
- **WHEN** a completed `type='simple'` waybill's detail is opened
- **THEN** no vehicle, driver, or CFDI section is rendered, the download buttons are absent, and the transfer date and notes are shown instead

#### Scenario: Cancelled waybill shows banner, no cancel button
- **WHEN** a cancelled waybill's detail is opened (either type)
- **THEN** a cancellation banner is shown and the "Cancelar" action is absent

#### Scenario: Download PDF or XML (Carta Porte only)
- **WHEN** the user clicks "Descargar PDF" or "Descargar XML" on a stamped `type='carta_porte'` waybill
- **THEN** the file downloads via `GET /waybills/:id/download?format=...`, with the filename derived from `Content-Disposition` (fallback `carta-porte-<uuid>.<ext>`)

---

### Requirement: Create waybill form
The system SHALL expose `/waybills/new` rendering `NewWaybillPage`, gated by `waybills:write`. The form SHALL open a type selector (`WaybillTypeToggle`, Simple / Con Carta Porte) before any other field. The "Con Carta Porte" option SHALL be omitted from the toggle (not merely disabled) when the current user lacks `waybills:stamp`.

Both types SHALL include `BranchPairSelector` (origin/destination, mutually exclusive — selecting one as origin removes it from the destination options and vice versa, enforced in the render, not only on submit) and merchandise lines.

**`type='simple'`** SHALL additionally include: merchandise lines added ONLY from the product catalog (`ProductCatalogPanel`/`ProductCatalogTable`, reused from POS) with `quantity` per line — the "+ Línea libre" affordance SHALL be absent, and per-line SAT/weight/hazmat inputs SHALL NOT be rendered; a transfer date field; an optional notes field. Submission calls `POST /api/v1/admin/waybills` with `type: "simple"`. On success (HTTP 201), the waybill is created with no stamping step and the UI redirects to `/waybills/[id]`.

**`type='carta_porte'`** SHALL include: merchandise lines from the catalog OR added as free-text lines, with per-line inputs for `weightKg`, `satBienesTranspCode`, `quantity`, and optional `isHazardousMaterial`/`hazardousMaterialCode`; free-text vehicle fields (plate, config, permit type/number, insurance company/policy — no master catalog, no autocomplete); free-text driver fields (name, optional RFC, license number); schedule fields (`departureAt`, `arrivalAt`, `distanceKm`). Submission calls `POST /api/v1/admin/waybills` with `type: "carta_porte"`. On success (HTTP 201), the system stamps immediately (no draft) and redirects to `/waybills/[id]`.

Switching from `carta_porte` to `simple` while a free-text (no `productId`) line is present SHALL block the switch with an inline message, rather than silently discarding the line.

#### Scenario: Origin/destination mutual exclusion in UI
- **WHEN** the user selects Branch A as origin
- **THEN** Branch A is removed from the destination selector's options, regardless of the selected type

#### Scenario: Carta Porte option hidden without permission
- **WHEN** the current user has `waybills:write` but lacks `waybills:stamp`
- **THEN** the type toggle only offers "Simple" — "Con Carta Porte" is not rendered as an option

#### Scenario: Simple form has no free-text line option
- **WHEN** the type is "Simple"
- **THEN** the "+ Línea libre" button is not rendered, and every added line requires a catalog product selection

#### Scenario: Line requires weight and SAT key (Carta Porte only)
- **WHEN** the type is "Con Carta Porte" and a merchandise line is missing `weightKg` or `satBienesTranspCode`
- **THEN** the form blocks submission with an inline error on that line

#### Scenario: Switching type preserves catalog lines, blocks on free-text lines
- **WHEN** the user has added a free-text line under "Con Carta Porte" and switches to "Simple"
- **THEN** the switch is blocked with a message explaining that simple transfers only accept catalog products, and no data is silently discarded

#### Scenario: Successful creation redirects to detail
- **WHEN** the backend returns HTTP 201, for either type
- **THEN** the UI redirects to `/waybills/[id]` showing the newly created waybill

---

### Requirement: Creation error handling
The system SHALL map backend error responses from `POST /api/v1/admin/waybills` to typed errors and render actionable inline feedback WITHOUT clearing any previously entered form data:

- `400 InvalidBranchPair` → inline error on the branch selector (either type).
- `400 BranchAddressIncomplete {branchId, missingFields}` → message listing the missing fields for the named branch, with a link to `/catalogs/branches` (Carta Porte only — this error cannot occur for `type='simple'`).
- `400 ProductNotFound {productId}` → the offending line is highlighted (Simple only — this error cannot occur for `type='carta_porte'`, where lines may be free-text).
- `409 InsufficientStockAtOrigin {productId}` → the offending merchandise line is highlighted; other lines and fields remain untouched (either type).
- `422 FacturamaStampError {detail}` → the normalized detail is shown; the form remains editable for retry (Carta Porte only).
- `403 Forbidden {required: "waybills:stamp"}` → shown as a distinct message ("no tienes permiso para timbrar Carta Porte") rather than the generic write-permission error, since the user may well hold `waybills:write`.

#### Scenario: Branch address incomplete links to catalog
- **WHEN** the backend returns `400 BranchAddressIncomplete` for the destination branch
- **THEN** the UI shows which fields are missing and a link to `/catalogs/branches`

#### Scenario: Product not found highlights the line
- **WHEN** the backend returns `400 ProductNotFound` for a specific `productId` in a simple transfer
- **THEN** only the corresponding line in the form is visually flagged; the rest of the form is preserved

#### Scenario: Insufficient stock highlights the line
- **WHEN** the backend returns `409 InsufficientStockAtOrigin` for a specific `productId`
- **THEN** only the corresponding line in the form is visually flagged; the rest of the form is preserved

#### Scenario: Facturama rejection preserves form state
- **WHEN** the backend returns `422 FacturamaStampError`
- **THEN** the error detail is shown and every previously entered field/line remains populated for the user to retry

#### Scenario: Missing stamp permission shown distinctly
- **WHEN** the backend returns `403 {"required":"waybills:stamp"}`
- **THEN** the UI shows a message specific to the missing timbrado permission, not the generic "sin permiso de escritura" message

---

### Requirement: Cancel waybill
The system SHALL allow cancelling a `status='completed'` waybill of either type from `WaybillActionsBar` via a `ConfirmDialog`-based `CancelWaybillModal` requiring a `reason` (3-500 chars, mirroring backend validation), gated by `waybills:cancel`. The confirmation copy SHALL differ by type: for `type='carta_porte'` it SHALL state that the CFDI will be cancelled before the SAT; for `type='simple'` it SHALL state only that the inventory movement will be reversed, with no mention of the SAT. On success, the detail page reflects `status='cancelled'` and the cancellation banner.

#### Scenario: Cancel with reason (Carta Porte)
- **WHEN** the user confirms cancellation of a `type='carta_porte'` waybill with a valid reason
- **THEN** `POST /waybills/:id/cancel` is sent, the confirmation copy mentioned the SAT/CFDI, and the page updates to show `cancelled` status

#### Scenario: Cancel with reason (Simple)
- **WHEN** the user confirms cancellation of a `type='simple'` waybill with a valid reason
- **THEN** `POST /waybills/:id/cancel` is sent, the confirmation copy mentions only the inventory reversal (no SAT/CFDI wording), and the page updates to show `cancelled` status

#### Scenario: Cancel button hidden without permission
- **WHEN** the current user lacks `waybills:cancel`
- **THEN** the cancel button is not rendered, even if the waybill is `completed`

#### Scenario: Cancel button hidden for already-cancelled waybill
- **WHEN** a waybill's `status` is already `cancelled`
- **THEN** the cancel button is not rendered (mirrors backend's non-idempotent cancellation)
