# Spec: waybills-api

## Purpose

Define the backend for inter-branch merchandise transfers (`Waybill` aggregate), stamped as CFDI Traslado with Complemento Carta Porte 3.1 nacional via Facturama, under `/api/v1/admin/waybills`.

---

## Requirements

### Requirement: Waybill aggregate model
The system SHALL persist an inter-branch merchandise transfer as the aggregate `Waybill` (header) + `WaybillItem` (lines) with the following invariants:

- `Waybill.status` is one of `completed`, `cancelled`. There is no `draft` state — creation stamps the CFDI Traslado atomically. Transitions:
  - `(created) → completed` (at `POST /waybills`, atomically; the transaction commits ONLY if Facturama accepts the stamp).
  - `completed → cancelled` (via `POST /waybills/:id/cancel`). Terminal: no further transitions allowed.
- `Waybill` references `originBranchId` and `destinationBranchId` (both FK `ON DELETE RESTRICT` to `branches`; MUST be distinct), `folioId` (FK `ON DELETE RESTRICT`, MUST resolve to the canonical folio `code='TS'`, `scope='INVENTORY'`), `creatorId` (FK `ON DELETE RESTRICT`), `cancelledBy` (nullable, FK `ON DELETE SET NULL`).
- `Waybill.folioNumber` is an integer assigned atomically at creation via the shared `allocateFolio` helper; `(folioId, folioNumber)` is UNIQUE.
- Vehicle data is captured freely per document (no master catalog): `vehiclePlate`, `vehicleConfig` (SAT `c_ConfigAutotransporte` key), `vehiclePermitType`, `vehiclePermitNumber`, `insuranceCompany`, `insurancePolicy` — all required strings.
- Driver/operator data is captured freely per document: `driverName` (required), `driverRfc` (nullable), `driverLicenseNumber` (required).
- `distanceKm` is a required positive decimal (captured, not calculated).
- `departureAt`/`arrivalAt` are required timestamps representing the estimated schedule; `arrivalAt` SHALL be `> departureAt`.
- Origin and destination address fields are SNAPSHOTTED onto `Waybill` at creation time from `Branch`'s structured address fields (see `admin-branches` spec) — NOT read live from `Branch` on subsequent reads. This preserves the historical Carta Porte record even if a branch's address is later edited.
- `cfdiUuid`, `facturamaCfdiId`, `xmlUrl`, `pdfUrl` are nullable until the stamp succeeds; they are always populated together with `status='completed'` (never persisted with only a subset).
- `cancelledAt` and `cancellationReason` are populated only when the cancellation occurs.
- Each `WaybillItem` references `waybillId` (FK `ON DELETE CASCADE`), `productId` (nullable FK `ON DELETE SET NULL` — same nullability pattern as `billing-api`'s `InvoiceItem`).
- Each `WaybillItem` snapshots `productCodeSnapshot`, `productNameSnapshot`, `satBienesTranspCode` (SAT `c_ClaveProdServCP` transport-goods key), `satUnitCode`, so the record survives later catalog changes.
- Each `WaybillItem` persists `quantity` (`DECIMAL(14,4)`, strictly `> 0`), `weightKg` (`DECIMAL(14,4)`, strictly `> 0`), `isHazardousMaterial` (boolean, default `false`), `hazardousMaterialCode` (nullable, required if `isHazardousMaterial=true`).

#### Scenario: Snapshot survives branch address change
- **WHEN** a waybill is created with origin branch address `"Calle Reforma 100, Col. Centro"`, and the branch's address is later edited to a different street
- **THEN** `GET /api/v1/admin/waybills/:id` for the prior waybill still returns the original snapshotted origin address

#### Scenario: Hazardous material without code rejected
- **WHEN** a line has `isHazardousMaterial: true` and no `hazardousMaterialCode`
- **THEN** the system returns HTTP 400 before touching inventory or Facturama

---

### Requirement: Create waybill (stamp Carta Porte Traslado atomically)
The system SHALL expose `POST /api/v1/admin/waybills` that, in a single Prisma transaction, validates preconditions, moves inventory, stamps a CFDI of type Traslado (`T`) with Complemento Carta Porte 3.1 nacional via Facturama, and persists the `Waybill` only on success. Requires `waybills:write`.

Request body: `{ originBranchId: string (uuid), destinationBranchId: string (uuid), vehicle: { plate, config, permitType, permitNumber, insuranceCompany, insurancePolicy }, driver: { name, rfc?, licenseNumber }, distanceKm: number, departureAt: string (ISO), arrivalAt: string (ISO), items: WaybillItemInput[] }`.

`WaybillItemInput`: `{ productId?: string, description: string, satBienesTranspCode: string, satUnitCode: string, quantity: number, weightKg: number, isHazardousMaterial?: boolean, hazardousMaterialCode?: string }`.

Validation order (each step short-circuits before any inventory or Facturama call):
1. Zod validation of the body (400 on shape errors).
2. `originBranchId !== destinationBranchId`, both branches exist and `isActive=true` (400 `InvalidBranchPair` otherwise).
3. Both branches have complete structured address fields (400 `BranchAddressIncompleteError` listing missing fields per branch, per `admin-branches` spec).
4. For every line, `branch_inventory.quantity` at `originBranchId` for `productId` (when `productId` is provided) is `>= quantity` (409 `InsufficientStockAtOrigin` with the offending line otherwise). Lines without `productId` (free-text goods not in the catalog) SKIP stock validation.

On success, within the SAME transaction:
- Aloca folio `TS` via `allocateFolio` (scope `INVENTORY`).
- Decrements `branch_inventory` at origin using the atomic reject-if-negative pattern (`WHERE branch_id=X AND product_id=Y AND quantity - delta >= 0`; the same pattern `PrismaBranchInventoryRepository.adjust` uses for `POST /inventory/:productId/adjust`). Lines without `productId` do NOT touch inventory.
- Increments `branch_inventory` at destination (creates the row if absent, same pattern as `returns-api`'s `incrementInventory`).
- Builds the SAT payload: `CfdiType='T'`, `Currency='XXX'`, no `Taxes`, `Total=0`, `Receiver` = the configured emitter RFC, `CfdiUse='S01'`, Complemento CartaPorte with `Ubicacion` origin/destination (from the snapshotted addresses), `Mercancias` (from `WaybillItem`), `Autotransporte`/`FiguraTransporte` (from the free-captured vehicle/driver fields).
- Calls `WaybillFacturamaGateway.stampTraslado(payload)`.
- If Facturama rejects, the transaction rolls back — no folio consumed, no inventory moved, no row persisted. Returns HTTP 422 with `FacturamaStampError` detail.
- If Facturama accepts, persists `Waybill` + `WaybillItem[]` with `status='completed'`, the returned `cfdiUuid`/`facturamaCfdiId`/`xmlUrl`/`pdfUrl`.

Returns HTTP 201 with `WaybillDto` on success.

#### Scenario: Successful transfer with catalog products
- **WHEN** origin has sufficient stock for every line, both branches have complete addresses, and Facturama accepts the stamp
- **THEN** the system allocates folio `TS`, decrements origin, increments destination, persists `Waybill` with `status='completed'` and the CFDI data, and returns HTTP 201

#### Scenario: Insufficient stock at origin
- **WHEN** a line requests `quantity=50` but origin only has `30` in `branch_inventory`
- **THEN** the system returns HTTP 409 `{"error":"InsufficientStockAtOrigin","productId":"..."}` and does NOT move inventory, allocate a folio, or call Facturama

#### Scenario: Same branch as origin and destination
- **WHEN** `originBranchId === destinationBranchId`
- **THEN** the system returns HTTP 400 `{"error":"InvalidBranchPair"}` before any other validation

#### Scenario: Origin or destination missing structured address
- **WHEN** the destination branch has no `addressZipCode` set
- **THEN** the system returns HTTP 400 `{"error":"BranchAddressIncomplete","branchId":"...","missingFields":["addressZipCode", ...]}`

#### Scenario: Facturama rejects the stamp
- **WHEN** Facturama returns a validation error for the Carta Porte payload
- **THEN** the system returns HTTP 422 with the Facturama error detail, and neither inventory nor the folio counter were affected (verified via a rollback test)

#### Scenario: Free-text line skips stock validation
- **WHEN** a line has no `productId` (goods not in the product catalog)
- **THEN** the system does not check or modify `branch_inventory` for that line, but still includes it in the Carta Porte `Mercancias` node

---

### Requirement: Cancel waybill
The system SHALL expose `POST /api/v1/admin/waybills/:id/cancel` that reverses the inventory movement and cancels the CFDI (if stamped) in a single transaction. Requires `waybills:cancel`. Body: `{ reason: string (3-500 chars) }`.

- Only `status='completed'` waybills can be cancelled. A `cancelled` waybill returns HTTP 409 `{"error":"WaybillAlreadyCancelled"}` on a second cancellation attempt (NOT idempotent, same as `returns-api` and `payments-api`).
- Reverses inventory: increments origin (tolerant, always succeeds, creates the row if absent), decrements destination using the TOLERANT pattern (`returns-api`'s `decrementInventory` — MAY leave destination negative if the transferred stock was already re-consumed downstream, mirroring `CancelSaleUseCase`/`CancelReturnUseCase`).
- If `facturamaCfdiId` is set, calls `WaybillFacturamaGateway.cancel(cfdiId, motive)` before committing; if Facturama rejects the cancellation, the transaction rolls back (inventory NOT reversed) and returns HTTP 422.
- Sets `status='cancelled'`, `cancelledAt`, `cancelledBy`, `cancellationReason`.

#### Scenario: Cancel a stamped waybill
- **WHEN** a `completed` waybill with a `facturamaCfdiId` is cancelled
- **THEN** the system reverses inventory, cancels the CFDI via Facturama, sets `status='cancelled'`, and returns HTTP 200

#### Scenario: Double cancellation rejected
- **WHEN** a `cancelled` waybill is cancelled again
- **THEN** the system returns HTTP 409 `{"error":"WaybillAlreadyCancelled"}`

#### Scenario: Destination goes negative on cancel
- **WHEN** the destination branch already sold/moved part of the transferred stock before the waybill is cancelled
- **THEN** the system still reverses the movement, allowing `branch_inventory.quantity` at destination to go negative

---

### Requirement: List waybills
The system SHALL expose `GET /api/v1/admin/waybills` that returns a paginated list. Requires `waybills:read`. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `branchId` (optional UUID — matches EITHER `originBranchId` OR `destinationBranchId`), `status` (optional, comma-separated), `from`/`to` (optional ISO date bounds on `createdAt`).

**Branch scoping** (two-sided variant of the standard pattern): callers without `branches:access_all`:
- If `?branchId=` absent → implicit filter `originBranchId = x-user-branch-id OR destinationBranchId = x-user-branch-id`.
- If `?branchId=<X>` present and `X !== x-user-branch-id` → HTTP 403.

Callers with `branches:access_all` see all waybills, optionally filtered by `?branchId=`.

#### Scenario: Operator sees waybills where their branch is origin or destination
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/waybills`
- **THEN** the response includes waybills where `B1` is either origin or destination, and excludes all others

#### Scenario: Operator requests another branch
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/waybills?branchId=B2`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"branches:access_all"}`

---

### Requirement: Get waybill detail and download CFDI
The system SHALL expose `GET /api/v1/admin/waybills/:id` (full detail including items, vehicle, driver, snapshotted addresses) and `GET /api/v1/admin/waybills/:id/download?format=pdf|xml` (proxy stream from Facturama by `facturamaCfdiId`). Both require `waybills:read` and enforce branch scoping against EITHER `originBranchId` OR `destinationBranchId` (the caller's branch must match at least one, unless `branches:access_all`).

#### Scenario: Get detail within scope
- **WHEN** a user whose branch is the destination of the waybill requests the detail
- **THEN** the system returns HTTP 200 with the full `WaybillDto`

#### Scenario: Download outside scope
- **WHEN** a user whose branch is neither origin nor destination requests `/download`
- **THEN** the system returns HTTP 403

#### Scenario: Download unstamped waybill
- **WHEN** `facturamaCfdiId` is `null` (should not normally occur, since creation stamps atomically, but is defensively checked)
- **THEN** the system returns HTTP 409 `{"error":"WaybillNotStamped"}`

---

### Requirement: WaybillFacturamaGateway port (module-local, decoupled from billing)
The system SHALL define an application port `WaybillFacturamaGateway` in `src/modules/waybills/application/ports/` with methods `stampTraslado(payload): Promise<{cfdiId, uuid, xmlUrl?, pdfUrl?}>`, `cancel(cfdiId, motive): Promise<{success, acuseBase64?}>`, `download(format, cfdiId): Promise<{contentBase64, contentType}>`. Infrastructure implementations `FacturamaRestGateway` and `FakeFacturamaGateway` SHALL live under `src/modules/waybills/infrastructure/services/` — they SHALL NOT be imported from or re-export `src/modules/billing/`'s `FacturamaGateway`, keeping the two modules decoupled (a waybill is not an invoice). The DI container SHALL select the real vs fake implementation via the `FACTURAMA_MOCK` env var, the same mechanism `billing-api` uses.

#### Scenario: Mock mode used in tests and default env
- **WHEN** `FACTURAMA_MOCK` is unset or `"true"`
- **THEN** the DI container wires `FakeFacturamaGateway`, producing deterministic UUIDs without network calls

#### Scenario: No cross-module import
- **WHEN** static analysis inspects `src/modules/waybills/`
- **THEN** no file imports from `src/modules/billing/`

---

### Requirement: RBAC permissions
The system SHALL define three permissions: `waybills:read`, `waybills:write`, `waybills:cancel`. Seed assignment: `admin` → all three; `operator` → all three; `viewer` → `waybills:read` only (identical pattern to `returns-api`'s permission table).

#### Scenario: Viewer cannot create
- **WHEN** a `viewer` calls `POST /api/v1/admin/waybills`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"waybills:write"}`

#### Scenario: Viewer can list and read
- **WHEN** a `viewer` calls `GET /api/v1/admin/waybills` or `GET /api/v1/admin/waybills/:id`
- **THEN** the system returns HTTP 200
