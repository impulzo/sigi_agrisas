## MODIFIED Requirements

### Requirement: Waybill aggregate model
The system SHALL persist an inter-branch merchandise transfer, or a sale-delivery Carta Porte, as the aggregate `Waybill` (header) + `WaybillItem` (lines) with the following invariants:

- `Waybill.type` is one of `simple`, `carta_porte`. Set at creation, never mutable afterward. Determines which of the fields below are required vs. `null`.
- `Waybill.status` is one of `completed`, `cancelled`. There is no `draft` state — creation persists atomically (and, for `type='carta_porte'` only, stamps the CFDI Traslado atomically). Transitions:
  - `(created) → completed` (at `POST /waybills`, atomically; for `type='carta_porte'` the transaction commits ONLY if Facturama accepts the stamp).
  - `completed → cancelled` (via `POST /waybills/:id/cancel`). Terminal: no further transitions allowed.
- `Waybill.originBranchId` is ALWAYS a FK `ON DELETE RESTRICT` to `branches`, on both types. For `type='simple'` it is the transfer's origin branch (user-selected). For `type='carta_porte'` it is resolved server-side from `Sale.branchId` — the client MUST NOT be able to override it.
- `Waybill.destinationBranchId` is a nullable FK `ON DELETE RESTRICT` to `branches` — REQUIRED (non-null) when `type='simple'`, and MUST be distinct from `originBranchId`; NULL when `type='carta_porte'`.
- `Waybill.destinationCustomerId` is a nullable FK `ON DELETE RESTRICT` to `customers` — REQUIRED (non-null) when `type='carta_porte'`; NULL when `type='simple'`.
- `Waybill.saleId` is a nullable FK `ON DELETE RESTRICT` to `sales` — REQUIRED (non-null) when `type='carta_porte'` (the sale this Carta Porte documents the delivery of); NULL when `type='simple'`. `saleId` is set once at creation and never mutated.
- `Waybill` also references `folioId` (FK `ON DELETE RESTRICT` — MUST resolve to the canonical folio `code='TS'`, `scope='INVENTORY'` when `type='carta_porte'`, or `code='TRI'`, `scope='INVENTORY'` when `type='simple'`), `creatorId` (FK `ON DELETE RESTRICT`), `cancelledBy` (nullable, FK `ON DELETE SET NULL`).
- `Waybill.folioNumber` is an integer assigned atomically at creation via the shared `allocateFolio` helper against the folio resolved by `type`; `(folioId, folioNumber)` is UNIQUE.
- `Waybill.notes` is a nullable free-text field (max 500 chars), settable on both types but primarily used by `type='simple'` to record the transfer's motive.
- `departureAt` is a required timestamp on both types — for `carta_porte` it represents the estimated departure schedule; for `simple` it represents the transfer date (no separate schedule column exists).
- The following fields are REQUIRED (non-null) when `type='carta_porte'` and NULL when `type='simple'`: origin/destination structured address snapshots, `vehiclePlate`, `vehicleConfig` (SAT `c_ConfigAutotransporte` key), `vehiclePermitType`, `vehiclePermitNumber`, `insuranceCompany`, `insurancePolicy`, `driverName`, `driverLicenseNumber`, `distanceKm`, `arrivalAt`. `driverRfc` remains nullable on both types (optional even for `carta_porte`).
- Origin address (`type='carta_porte'`) is SNAPSHOTTED onto `Waybill` at creation time from the sale's branch's structured address fields (see `admin-branches` spec). Destination address (`type='carta_porte'`) is SNAPSHOTTED at creation time from the sale's customer's structured address fields (see `customers-api` spec). Neither is read live on subsequent reads — this preserves the historical Carta Porte record even if the branch's or customer's address is later edited.
- `cfdiUuid`, `facturamaCfdiId`, `xmlUrl`, `pdfUrl` are nullable and remain `null` for the entire lifetime of a `type='simple'` waybill. For `type='carta_porte'`, they stay nullable until the stamp succeeds, and are always populated together with `status='completed'` (never persisted with only a subset).
- `cancelledAt` and `cancellationReason` are populated only when the cancellation occurs, on both types.
- Each `WaybillItem` references `waybillId` (FK `ON DELETE CASCADE`), `productId`. For `type='carta_porte'`, `productId` is nullable (FK `ON DELETE SET NULL` — same nullability pattern as `billing-api`'s `InvoiceItem`), allowing free-text lines. For `type='simple'`, `productId` is REQUIRED — every line MUST resolve to an existing, active catalog product.
- Each `WaybillItem` snapshots `productCodeSnapshot`, `productNameSnapshot` on both types. `satBienesTranspCode` (SAT `c_ClaveProdServCP` transport-goods key), `satUnitCode`, and `weightKg` are REQUIRED when `type='carta_porte'` and `null` when `type='simple'` (a simple transfer has no Carta Porte merchandise node to populate).
- Each `WaybillItem` persists `quantity` (`DECIMAL(14,4)`, strictly `> 0`) on both types, `isHazardousMaterial` (boolean, default `false`), `hazardousMaterialCode` (nullable, required if `isHazardousMaterial=true`) — both meaningful only for `type='carta_porte'`.

#### Scenario: Snapshot survives branch address change
- **WHEN** a `carta_porte` waybill is created with origin branch address `"Calle Reforma 100, Col. Centro"`, and the branch's address is later edited to a different street
- **THEN** `GET /api/v1/admin/waybills/:id` for the prior waybill still returns the original snapshotted origin address

#### Scenario: Snapshot survives customer address change
- **WHEN** a `carta_porte` waybill is created with a customer destination address, and the customer's address is later edited
- **THEN** `GET /api/v1/admin/waybills/:id` for the prior waybill still returns the original snapshotted destination address

#### Scenario: Hazardous material without code rejected
- **WHEN** a `carta_porte` line has `isHazardousMaterial: true` and no `hazardousMaterialCode`
- **THEN** the system returns HTTP 400 before touching inventory or Facturama

#### Scenario: Simple waybill persists with null Carta Porte fields
- **WHEN** a `type='simple'` waybill is created successfully
- **THEN** `vehiclePlate`, `driverName`, `distanceKm`, `arrivalAt`, origin/destination address snapshots, `cfdiUuid`, `facturamaCfdiId`, `destinationCustomerId`, and `saleId` are all `null` in the persisted row, and `destinationBranchId` is populated

#### Scenario: Carta Porte waybill persists with null destinationBranchId
- **WHEN** a `type='carta_porte'` waybill is created successfully
- **THEN** `destinationBranchId` is `null`, and `destinationCustomerId`/`saleId` are populated with the customer and sale the Carta Porte documents

---

### Requirement: Create waybill (simple or Carta Porte from a sale)
The system SHALL expose `POST /api/v1/admin/waybills` accepting a discriminated union on `type: "simple" | "carta_porte"`. Requires `waybills:write` for both types; `type: "carta_porte"` additionally requires `waybills:stamp`, checked after body validation (the discriminant is only known once the body is parsed).

**`type: "simple"`** request body and behavior: UNCHANGED from before this change — `{ type: "simple", originBranchId: string (uuid), destinationBranchId: string (uuid), transferDate: string (ISO), notes?: string | null, items: Array<{ productId: string (uuid), description: string, quantity: number }> }`. Validation order: Zod shape (400) → `originBranchId !== destinationBranchId`, both branches exist and active (400 `InvalidBranchPair`) → every line's `productId` resolves to an active product (400 `ProductNotFound`) → `branch_inventory.quantity` at origin `>= quantity` per line (409 `InsufficientStockAtOrigin`). On success: allocates folio `TRI`, decrements origin, increments destination, persists `Waybill` (`type='simple'`, `destinationBranchId` set, `destinationCustomerId`/`saleId` null).

**`type: "carta_porte"`** request body: `{ type: "carta_porte", saleId: string (uuid), vehicle: {...}, driver: {...}, distanceKm: number, departureAt: string (ISO), arrivalAt: string (ISO), items: Array<{ productId?: string | null, description: string, satBienesTranspCode: string, satUnitCode: string, quantity: number, weightKg: number, isHazardousMaterial?: boolean, hazardousMaterialCode?: string | null }> }`. The body SHALL NOT accept `originBranchId` or `destinationBranchId` (rejected as an unrecognized field, HTTP 400, if present — origin/destination are resolved server-side, never trusted from the client).

**`carta_porte` validation order** (each step short-circuiting before any Facturama call):
1. Zod shape validation (400).
2. `waybills:stamp` permission check.
3. `sale = findSale(saleId)`; 404-equivalent `WaybillSaleNotFound` if it doesn't exist.
4. `sale.status === 'completed'`; 409 `SaleNotCompleted` otherwise.
5. `sale.customerId !== null`; 409 `SaleHasNoCustomer` otherwise (walk-in/cash sales without a customer cannot generate a Carta Porte).
6. `origin = findBranch(sale.branchId)` — resolved server-side, never from the request body.
7. `customer = findCustomer(sale.customerId)`; 404-equivalent `CustomerNotFoundForWaybill` if inactive/missing.
8. Structured-address completeness check on `customer` (same 7 fields as the branch check: street, exterior number, neighborhood, municipality, state, country, zip code) — 400 `CustomerAddressIncomplete` listing missing fields, mirroring `BranchAddressIncomplete`.
9. Structured-address completeness check on `origin` (unchanged from before — 400 `BranchAddressIncomplete`).
10. On success, within a single transaction: allocates folio `TS`, persists `Waybill` (`type='carta_porte'`, `originBranchId=sale.branchId`, `destinationBranchId=null`, `destinationCustomerId=customer.id`, `saleId=sale.id`, address snapshots from `origin`/`customer`) + `WaybillItem[]`, calls `WaybillFacturamaGateway.stampTraslado` atomically (rolls back on Facturama rejection) — **no `branch_inventory` movement occurs for this type** (the sale already decremented origin stock when it completed; there is no destination branch inventory to increment).

Returns HTTP 201 with `WaybillDto` on success for both types.

#### Scenario: Successful simple transfer
- **WHEN** origin has sufficient stock for every line (all resolving to active catalog products) and `type: "simple"`
- **THEN** the system allocates folio `TRI`, decrements origin, increments destination, persists `Waybill` with `type='simple'`, `status='completed'`, no CFDI data, and returns HTTP 201

#### Scenario: Simple transfer rejects a line without a valid product
- **WHEN** `type: "simple"` and a line's `productId` does not resolve to an active product
- **THEN** the system returns HTTP 400 `{"error":"ProductNotFound","productId":"..."}` and does NOT move inventory or allocate a folio

#### Scenario: Insufficient stock at origin (simple only)
- **WHEN** a `type: "simple"` line requests `quantity=50` but origin only has `30` in `branch_inventory`
- **THEN** the system returns HTTP 409 `{"error":"InsufficientStockAtOrigin","productId":"..."}` and does NOT move inventory or allocate a folio

#### Scenario: Same branch as origin and destination (simple only)
- **WHEN** `type: "simple"` and `originBranchId === destinationBranchId`
- **THEN** the system returns HTTP 400 `{"error":"InvalidBranchPair"}` before any other validation

#### Scenario: Successful Carta Porte from a completed sale
- **WHEN** `type: "carta_porte"`, `saleId` resolves to a `completed` sale with a customer whose structured address is complete, and Facturama accepts the stamp
- **THEN** the system resolves `originBranchId` from `sale.branchId`, allocates folio `TS`, persists `Waybill` with `destinationCustomerId`/`saleId` set and the CFDI data, does NOT move `branch_inventory`, and returns HTTP 201

#### Scenario: Carta Porte rejects a sale that isn't completed
- **WHEN** `type: "carta_porte"` and `saleId` resolves to a sale with `status` other than `completed`
- **THEN** the system returns HTTP 409 `{"error":"SaleNotCompleted"}` before resolving the customer or calling Facturama

#### Scenario: Carta Porte rejects a sale without a customer
- **WHEN** `type: "carta_porte"` and `saleId` resolves to a `completed` sale with `customerId: null`
- **THEN** the system returns HTTP 409 `{"error":"SaleHasNoCustomer"}`

#### Scenario: Carta Porte rejects a customer with incomplete address
- **WHEN** `type: "carta_porte"`, the sale's customer has no `addressZipCode` set
- **THEN** the system returns HTTP 400 `{"error":"CustomerAddressIncomplete","customerId":"...","missingFields":["addressZipCode", ...]}`

#### Scenario: Carta Porte ignores a client-supplied originBranchId
- **WHEN** `type: "carta_porte"` and the request body includes an `originBranchId` field
- **THEN** the system returns HTTP 400 (unrecognized field) — origin is always resolved from `sale.branchId`, never accepted from the client

#### Scenario: Origin branch missing structured address (Carta Porte only)
- **WHEN** `type: "carta_porte"` and the sale's origin branch has no `addressZipCode` set
- **THEN** the system returns HTTP 400 `{"error":"BranchAddressIncomplete","branchId":"...","missingFields":["addressZipCode", ...]}`

#### Scenario: Facturama rejects the stamp (Carta Porte only)
- **WHEN** `type: "carta_porte"` and Facturama returns a validation error for the Carta Porte payload
- **THEN** the system returns HTTP 422 with the Facturama error detail, and neither the folio counter nor the `Waybill` row were persisted (verified via a rollback test)

#### Scenario: Free-text line skips stock validation (Carta Porte only)
- **WHEN** `type: "carta_porte"` and a line has no `productId` (goods not in the product catalog)
- **THEN** the system does not check or modify `branch_inventory` for that line (Carta Porte never moves inventory), but still includes it in the Carta Porte `Mercancias` node

#### Scenario: Missing type is rejected
- **WHEN** the request body omits `type`
- **THEN** the system returns HTTP 400 with a validation error before any other check

---

### Requirement: List waybills
The system SHALL expose `GET /api/v1/admin/waybills` that returns a paginated list. Requires `waybills:read`. Query parameters: `page` (default 1), `pageSize` (default 20, max 100), `branchId` (optional UUID — matches EITHER `originBranchId` OR `destinationBranchId`; for `type='carta_porte'` rows `destinationBranchId` is `null` so this effectively becomes an origin-only match for those rows), `status` (optional, comma-separated), `type` (optional, comma-separated — `simple`, `carta_porte`), `from`/`to` (optional ISO date bounds on `createdAt`).

**Branch scoping** (two-sided variant of the standard pattern): callers without `branches:access_all`:
- If `?branchId=` absent → implicit filter `originBranchId = x-user-branch-id OR destinationBranchId = x-user-branch-id`.
- If `?branchId=<X>` present and `X !== x-user-branch-id` → HTTP 403.

Callers with `branches:access_all` see all waybills, optionally filtered by `?branchId=` and/or `?type=`.

#### Scenario: Operator sees waybills where their branch is origin or destination
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/waybills`
- **THEN** the response includes `simple` waybills where `B1` is either origin or destination, and `carta_porte` waybills where `B1` is the origin, and excludes all others

#### Scenario: Operator requests another branch
- **WHEN** an `operator` with `x-user-branch-id: B1` calls `GET /api/v1/admin/waybills?branchId=B2`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"branches:access_all"}`

#### Scenario: Filter by type
- **WHEN** a user calls `GET /api/v1/admin/waybills?type=simple`
- **THEN** the response includes only `type='simple'` waybills matching the other filters

---

### Requirement: Get waybill detail and download CFDI
The system SHALL expose `GET /api/v1/admin/waybills/:id` (full detail including items, and — for `type='carta_porte'` — vehicle, driver, snapshotted addresses, and the linked `saleId`) and `GET /api/v1/admin/waybills/:id/download?format=pdf|xml` (proxy stream from Facturama by `facturamaCfdiId`). Both require `waybills:read` and enforce branch scoping against `originBranchId` — for `type='simple'`, ALSO against `destinationBranchId` (either match is sufficient); for `type='carta_porte'`, `destinationBranchId` is `null` so only `originBranchId` is compared. The caller's branch must match, unless `branches:access_all`.

Download SHALL reject with HTTP 409 `WaybillNotStamped` whenever `facturamaCfdiId` is `null`, whether because the waybill is `type='simple'` (which is never stamped) or because a `type='carta_porte'` waybill defensively lacks it.

#### Scenario: Get detail within scope (simple)
- **WHEN** a user whose branch is the destination of a `type='simple'` waybill requests the detail
- **THEN** the system returns HTTP 200 with the full `WaybillDto`

#### Scenario: Get detail within scope (Carta Porte)
- **WHEN** a user whose branch is the origin of a `type='carta_porte'` waybill requests the detail
- **THEN** the system returns HTTP 200 with the full `WaybillDto`, including `saleId` and the customer destination fields

#### Scenario: Download outside scope
- **WHEN** a user whose branch is neither origin nor destination (or, for `carta_porte`, not the origin) requests `/download`
- **THEN** the system returns HTTP 403

#### Scenario: Download unstamped waybill
- **WHEN** `facturamaCfdiId` is `null` (the normal, permanent state for `type='simple'`; defensively checked for `type='carta_porte'`, which should not normally occur since creation stamps atomically)
- **THEN** the system returns HTTP 409 `{"error":"WaybillNotStamped"}`

### Requirement: Cancel waybill
The system SHALL expose `POST /api/v1/admin/waybills/:id/cancel` that reverses the inventory movement (for `type='simple'` only) and cancels the CFDI (if stamped) in a single transaction. Requires `waybills:cancel`. Body: `{ reason: string (3-500 chars) }`.

- Only `status='completed'` waybills can be cancelled. A `cancelled` waybill returns HTTP 409 `{"error":"WaybillAlreadyCancelled"}` on a second cancellation attempt (NOT idempotent, same as `returns-api` and `payments-api`).
- For `type='simple'`: reverses inventory — increments origin (tolerant, always succeeds, creates the row if absent), decrements destination using the TOLERANT pattern (`returns-api`'s `decrementInventory` — MAY leave destination negative if the transferred stock was already re-consumed downstream, mirroring `CancelSaleUseCase`/`CancelReturnUseCase`).
- For `type='carta_porte'`: does NOT touch `branch_inventory` (see "Sale-linked Carta Porte does not move inventory") — there is nothing to reverse; the linked sale's inventory is managed independently by `sales-api`.
- If `facturamaCfdiId` is set, calls `WaybillFacturamaGateway.cancel(cfdiId, motive)` before committing; if Facturama rejects the cancellation, the transaction rolls back (inventory NOT reversed) and returns HTTP 422.
- Sets `status='cancelled'`, `cancelledAt`, `cancelledBy`, `cancellationReason`.

#### Scenario: Cancel a stamped waybill
- **WHEN** a `completed` waybill with a `facturamaCfdiId` is cancelled
- **THEN** the system cancels the CFDI via Facturama, sets `status='cancelled'`, reverses inventory if `type='simple'` (no inventory effect if `type='carta_porte'`), and returns HTTP 200

#### Scenario: Double cancellation rejected
- **WHEN** a `cancelled` waybill is cancelled again
- **THEN** the system returns HTTP 409 `{"error":"WaybillAlreadyCancelled"}`

#### Scenario: Destination goes negative on cancel (simple only)
- **WHEN** a `type='simple'` waybill's destination branch already sold/moved part of the transferred stock before the waybill is cancelled
- **THEN** the system still reverses the movement, allowing `branch_inventory.quantity` at destination to go negative

## ADDED Requirements

### Requirement: Sale-linked Carta Porte does not move inventory
When `type='carta_porte'`, `POST /api/v1/admin/waybills` SHALL NOT read or modify `branch_inventory` for any line, and SHALL NOT enforce `InsufficientStockAtOrigin` — the sale already decremented origin stock atomically when it completed (see `pos-api`), and the destination is a customer with no `branch_inventory` row to receive stock. This applies regardless of whether a line has a `productId` or is free-text.

#### Scenario: Carta Porte creation leaves branch_inventory untouched
- **WHEN** a `type='carta_porte'` waybill is created successfully for a sale whose origin branch has a given `branch_inventory.quantity` for the sold products
- **THEN** `branch_inventory.quantity` for those products at that branch is identical before and after the Carta Porte is created

#### Scenario: Cancelling a sale-linked Carta Porte does not reverse inventory
- **WHEN** a `type='carta_porte'` waybill is cancelled via `POST /api/v1/admin/waybills/:id/cancel`
- **THEN** the system cancels the CFDI (if stamped) and sets `status='cancelled'` without touching `branch_inventory` — reversing the sale's own inventory decrement (if desired) is a `sales-api` concern (`CancelSaleUseCase`), not a `waybills-api` concern
