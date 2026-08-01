## MODIFIED Requirements

### Requirement: Waybill aggregate model
The system SHALL persist an inter-branch merchandise transfer as the aggregate `Waybill` (header) + `WaybillItem` (lines) with the following invariants:

- `Waybill.type` is one of `simple`, `carta_porte`. Set at creation, never mutable afterward. Determines which of the fields below are required vs. `null`.
- `Waybill.status` is one of `completed`, `cancelled`. There is no `draft` state — creation persists atomically (and, for `type='carta_porte'` only, stamps the CFDI Traslado atomically). Transitions:
  - `(created) → completed` (at `POST /waybills`, atomically; for `type='carta_porte'` the transaction commits ONLY if Facturama accepts the stamp).
  - `completed → cancelled` (via `POST /waybills/:id/cancel`). Terminal: no further transitions allowed.
- `Waybill` references `originBranchId` and `destinationBranchId` (both FK `ON DELETE RESTRICT` to `branches`; MUST be distinct), `folioId` (FK `ON DELETE RESTRICT` — MUST resolve to the canonical folio `code='TS'`, `scope='INVENTORY'` when `type='carta_porte'`, or `code='TRI'`, `scope='INVENTORY'` when `type='simple'`), `creatorId` (FK `ON DELETE RESTRICT`), `cancelledBy` (nullable, FK `ON DELETE SET NULL`).
- `Waybill.folioNumber` is an integer assigned atomically at creation via the shared `allocateFolio` helper against the folio resolved by `type`; `(folioId, folioNumber)` is UNIQUE.
- `Waybill.notes` is a nullable free-text field (max 500 chars), settable on both types but primarily used by `type='simple'` to record the transfer's motive.
- `departureAt` is a required timestamp on both types — for `carta_porte` it represents the estimated departure schedule; for `simple` it represents the transfer date (no separate schedule column exists).
- The following fields are REQUIRED (non-null) when `type='carta_porte'` and NULL when `type='simple'`: origin/destination structured address snapshots, `vehiclePlate`, `vehicleConfig` (SAT `c_ConfigAutotransporte` key), `vehiclePermitType`, `vehiclePermitNumber`, `insuranceCompany`, `insurancePolicy`, `driverName`, `driverLicenseNumber`, `distanceKm`, `arrivalAt`. `driverRfc` remains nullable on both types (optional even for `carta_porte`).
- Origin and destination address fields, when populated (`type='carta_porte'`), are SNAPSHOTTED onto `Waybill` at creation time from `Branch`'s structured address fields (see `admin-branches` spec) — NOT read live from `Branch` on subsequent reads. This preserves the historical Carta Porte record even if a branch's address is later edited.
- `cfdiUuid`, `facturamaCfdiId`, `xmlUrl`, `pdfUrl` are nullable and remain `null` for the entire lifetime of a `type='simple'` waybill. For `type='carta_porte'`, they stay nullable until the stamp succeeds, and are always populated together with `status='completed'` (never persisted with only a subset).
- `cancelledAt` and `cancellationReason` are populated only when the cancellation occurs, on both types.
- Each `WaybillItem` references `waybillId` (FK `ON DELETE CASCADE`), `productId`. For `type='carta_porte'`, `productId` is nullable (FK `ON DELETE SET NULL` — same nullability pattern as `billing-api`'s `InvoiceItem`), allowing free-text lines. For `type='simple'`, `productId` is REQUIRED — every line MUST resolve to an existing, active catalog product.
- Each `WaybillItem` snapshots `productCodeSnapshot`, `productNameSnapshot` on both types. `satBienesTranspCode` (SAT `c_ClaveProdServCP` transport-goods key), `satUnitCode`, and `weightKg` are REQUIRED when `type='carta_porte'` and `null` when `type='simple'` (a simple transfer has no Carta Porte merchandise node to populate).
- Each `WaybillItem` persists `quantity` (`DECIMAL(14,4)`, strictly `> 0`) on both types, `isHazardousMaterial` (boolean, default `false`), `hazardousMaterialCode` (nullable, required if `isHazardousMaterial=true`) — both meaningful only for `type='carta_porte'`.

#### Scenario: Snapshot survives branch address change
- **WHEN** a `carta_porte` waybill is created with origin branch address `"Calle Reforma 100, Col. Centro"`, and the branch's address is later edited to a different street
- **THEN** `GET /api/v1/admin/waybills/:id` for the prior waybill still returns the original snapshotted origin address

#### Scenario: Hazardous material without code rejected
- **WHEN** a `carta_porte` line has `isHazardousMaterial: true` and no `hazardousMaterialCode`
- **THEN** the system returns HTTP 400 before touching inventory or Facturama

#### Scenario: Simple waybill persists with null Carta Porte fields
- **WHEN** a `type='simple'` waybill is created successfully
- **THEN** `vehiclePlate`, `driverName`, `distanceKm`, `arrivalAt`, origin/destination address snapshots, `cfdiUuid`, and `facturamaCfdiId` are all `null` in the persisted row

---

### Requirement: List waybills
The system SHALL expose `GET /api/v1/admin/waybills` that returns a paginated list. Requires `waybills:read`. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `branchId` (optional UUID — matches EITHER `originBranchId` OR `destinationBranchId`), `status` (optional, comma-separated), `type` (optional, comma-separated — `simple`, `carta_porte`), `from`/`to` (optional ISO date bounds on `createdAt`).

**Branch scoping** (two-sided variant of the standard pattern): callers without `branches:access_all`:
- If `?branchId=` absent → implicit filter `originBranchId = x-user-branch-id OR destinationBranchId = x-user-branch-id`.
- If `?branchId=<X>` present and `X !== x-user-branch-id` → HTTP 403.

Callers with `branches:access_all` see all waybills, optionally filtered by `?branchId=` and/or `?type=`.

#### Scenario: Operator sees waybills where their branch is origin or destination
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/waybills`
- **THEN** the response includes waybills where `B1` is either origin or destination, and excludes all others

#### Scenario: Operator requests another branch
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/waybills?branchId=B2`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"branches:access_all"}`

#### Scenario: Filter by type
- **WHEN** a user calls `GET /api/v1/admin/waybills?type=simple`
- **THEN** the response includes only `type='simple'` waybills matching the other filters

---

### Requirement: Get waybill detail and download CFDI
The system SHALL expose `GET /api/v1/admin/waybills/:id` (full detail including items, and — for `type='carta_porte'` — vehicle, driver, snapshotted addresses) and `GET /api/v1/admin/waybills/:id/download?format=pdf|xml` (proxy stream from Facturama by `facturamaCfdiId`). Both require `waybills:read` and enforce branch scoping against EITHER `originBranchId` OR `destinationBranchId` (the caller's branch must match at least one, unless `branches:access_all`).

Download SHALL reject with HTTP 409 `WaybillNotStamped` whenever `facturamaCfdiId` is `null`, whether because the waybill is `type='simple'` (which is never stamped) or because a `type='carta_porte'` waybill defensively lacks it.

#### Scenario: Get detail within scope
- **WHEN** a user whose branch is the destination of the waybill requests the detail
- **THEN** the system returns HTTP 200 with the full `WaybillDto`

#### Scenario: Download outside scope
- **WHEN** a user whose branch is neither origin nor destination requests `/download`
- **THEN** the system returns HTTP 403

#### Scenario: Download unstamped waybill
- **WHEN** `facturamaCfdiId` is `null` (the normal, permanent state for `type='simple'`; defensively checked for `type='carta_porte'`, which should not normally occur since creation stamps atomically)
- **THEN** the system returns HTTP 409 `{"error":"WaybillNotStamped"}`

---

### Requirement: RBAC permissions
The system SHALL define four permissions: `waybills:read`, `waybills:write`, `waybills:cancel`, `waybills:stamp`. Seed assignment: `admin` → all four; `operator` → all four; `viewer` → `waybills:read` only (identical pattern to `returns-api`'s permission table for the first three; `waybills:stamp` follows the same admin/operator-only split).

`waybills:write` is required to create a waybill of EITHER type. `waybills:stamp` is required IN ADDITION to `waybills:write` only when `type='carta_porte'` — creating a `type='simple'` waybill never requires `waybills:stamp`.

#### Scenario: Viewer cannot create
- **WHEN** a `viewer` calls `POST /api/v1/admin/waybills`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"waybills:write"}`

#### Scenario: Viewer can list and read
- **WHEN** a `viewer` calls `GET /api/v1/admin/waybills` or `GET /api/v1/admin/waybills/:id`
- **THEN** the system returns HTTP 200

#### Scenario: waybills:write alone suffices for a simple transfer
- **WHEN** a user with `waybills:write` but WITHOUT `waybills:stamp` calls `POST /api/v1/admin/waybills` with `type: "simple"`
- **THEN** the system returns HTTP 201

#### Scenario: waybills:stamp required for Carta Porte
- **WHEN** a user with `waybills:write` but WITHOUT `waybills:stamp` calls `POST /api/v1/admin/waybills` with `type: "carta_porte"`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"waybills:stamp"}`

---

## REMOVED Requirements

### Requirement: Create waybill (stamp Carta Porte Traslado atomically)

**Reason**: This requirement described creation as always stamping a CFDI Traslado, with no concept of a non-fiscal transfer. The business now requires two transfer types — a same-city transfer with no fiscal document, and a cross-city transfer that still stamps Carta Porte exactly as before. Keeping this title under `MODIFIED` while changing "always stamps" to "stamps only when `type='carta_porte'`" would leave the requirement title contradicting its own body. There is no `RENAMED` precedent in this repository, so the clean replacement is REMOVED + ADDED.

**Migration**: No data migration for existing rows — every waybill created before this change is backfilled with `type='carta_porte'` (see `prisma/migrations/<timestamp>_add_waybill_type_simple/migration.sql`), so its historical behavior (always stamped) remains accurately described by the new split requirement below. Callers of `POST /api/v1/admin/waybills` MUST add a `type` field to every request body — the field is required with no default; requests omitting it now fail Zod validation with HTTP 400.

---

## ADDED Requirements

### Requirement: Create waybill (simple or Carta Porte)
The system SHALL expose `POST /api/v1/admin/waybills` accepting a discriminated union on `type: "simple" | "carta_porte"`. Requires `waybills:write` for both types; `type: "carta_porte"` additionally requires `waybills:stamp`, checked after body validation (the discriminant is only known once the body is parsed).

**Common validation** (both types, in order, each step short-circuiting before any inventory call):
1. Zod validation of the body against the schema for the given `type` (400 on shape errors, including an unrecognized or missing `type`).
2. `originBranchId !== destinationBranchId`, both branches exist and `isActive=true` (400 `InvalidBranchPair` otherwise).
3. `waybills:stamp` permission check (only for `type='carta_porte'`, after steps 1–2 succeed).

**`type: "simple"`** request body: `{ type: "simple", originBranchId: string (uuid), destinationBranchId: string (uuid), transferDate: string (ISO), notes?: string | null, items: Array<{ productId: string (uuid), description: string, quantity: number }> }`.
- Every line's `productId` MUST resolve to an existing, active product (400 `ProductNotFound` otherwise) — free-text lines are NOT supported for this type.
- For every line, `branch_inventory.quantity` at `originBranchId` for `productId` MUST be `>= quantity` (409 `InsufficientStockAtOrigin` otherwise).
- On success, within a single transaction: aloca folio `TRI` (scope `INVENTORY`) via `allocateFolio`, decrements `branch_inventory` at origin using the atomic reject-if-negative pattern, increments `branch_inventory` at destination (creates the row if absent), persists `Waybill` (`type='simple'`, `status='completed'`, all Carta Porte fields `null`) + `WaybillItem[]`. No Facturama call is made.

**`type: "carta_porte"`** request body and behavior: unchanged from the original single-type implementation — `vehicle`, `driver`, `distanceKm`, `departureAt`/`arrivalAt`, `items` (where lines MAY omit `productId` and skip stock validation), structured-address completeness check on both branches (400 `BranchAddressIncomplete`), folio `TS`, atomic stamp-or-rollback via `WaybillFacturamaGateway.stampTraslado`.

Returns HTTP 201 with `WaybillDto` on success for both types.

#### Scenario: Successful simple transfer
- **WHEN** origin has sufficient stock for every line (all resolving to active catalog products) and `type: "simple"`
- **THEN** the system allocates folio `TRI`, decrements origin, increments destination, persists `Waybill` with `type='simple'`, `status='completed'`, no CFDI data, and returns HTTP 201

#### Scenario: Simple transfer rejects a line without a valid product
- **WHEN** `type: "simple"` and a line's `productId` does not resolve to an active product
- **THEN** the system returns HTTP 400 `{"error":"ProductNotFound","productId":"..."}` and does NOT move inventory or allocate a folio

#### Scenario: Successful Carta Porte transfer with catalog products
- **WHEN** origin has sufficient stock for every line, both branches have complete addresses, `type: "carta_porte"`, and Facturama accepts the stamp
- **THEN** the system allocates folio `TS`, decrements origin, increments destination, persists `Waybill` with `status='completed'` and the CFDI data, and returns HTTP 201

#### Scenario: Insufficient stock at origin (either type)
- **WHEN** a line requests `quantity=50` but origin only has `30` in `branch_inventory`, for either `type`
- **THEN** the system returns HTTP 409 `{"error":"InsufficientStockAtOrigin","productId":"..."}` and does NOT move inventory, allocate a folio, or (for `carta_porte`) call Facturama

#### Scenario: Same branch as origin and destination (either type)
- **WHEN** `originBranchId === destinationBranchId`
- **THEN** the system returns HTTP 400 `{"error":"InvalidBranchPair"}` before any other validation, regardless of `type`

#### Scenario: Origin or destination missing structured address (Carta Porte only)
- **WHEN** `type: "carta_porte"` and the destination branch has no `addressZipCode` set
- **THEN** the system returns HTTP 400 `{"error":"BranchAddressIncomplete","branchId":"...","missingFields":["addressZipCode", ...]}`

#### Scenario: Facturama rejects the stamp (Carta Porte only)
- **WHEN** `type: "carta_porte"` and Facturama returns a validation error for the Carta Porte payload
- **THEN** the system returns HTTP 422 with the Facturama error detail, and neither inventory nor the folio counter were affected (verified via a rollback test)

#### Scenario: Free-text line skips stock validation (Carta Porte only)
- **WHEN** `type: "carta_porte"` and a line has no `productId` (goods not in the product catalog)
- **THEN** the system does not check or modify `branch_inventory` for that line, but still includes it in the Carta Porte `Mercancias` node

#### Scenario: Missing type is rejected
- **WHEN** the request body omits `type`
- **THEN** the system returns HTTP 400 with a validation error before any other check
