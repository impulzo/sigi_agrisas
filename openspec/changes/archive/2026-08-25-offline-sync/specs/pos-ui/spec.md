## ADDED Requirements

### Requirement: POS branch selector locked while offline
While the app is in offline mode (per `offline-sync`'s connectivity detection), the branch selector in the POS screen SHALL be read-only, pinned to the cached `ownerBranchId` of the current offline session, regardless of whether the current user has `branches:access_all`. This includes users who would otherwise be able to freely change branch when online.

#### Scenario: Bypass user branch selector disabled offline
- **WHEN** a user with `branches:access_all` who has already fixed a working branch (per `offline-sync`'s "Fix a working branch before going offline" requirement) is in the POS screen while offline
- **THEN** the branch selector is rendered disabled/read-only, showing the fixed `ownerBranchId`'s name, with no way to switch branch until connectivity returns

#### Scenario: Regular cashier branch selector unaffected
- **WHEN** a cashier without `branches:access_all` (whose branch selector is already read-only online, per existing behavior) goes offline
- **THEN** no visible change occurs — the selector remains showing their assigned branch, same as online

### Requirement: Sale submission queues offline instead of failing
The POS sale submission flow (`useSaleSubmission`) SHALL, when `authFetch` throws `NetworkError` (or the app's `isOnline` state is already `false` before attempting the request), enqueue the sale into the `offline-sync` outbox instead of surfacing a submission error to the cashier.

#### Scenario: Sale submitted while offline is queued, not rejected
- **WHEN** a cashier submits a completed cart while offline
- **THEN** the sale is written to the `outboxSales` store with `status: "pending"` and a generated `clientRequestId`, the cart resets as it would on a successful online sale, and the confirmation UI shows a provisional ticket state (see "Provisional ticket display for queued sales" below) instead of the normal post-sale confirmation

#### Scenario: Genuine validation errors are not swallowed as offline
- **WHEN** a cashier submits a cart while online and the server responds with an HTTP 400 (e.g. inactive customer)
- **THEN** the existing online error-handling behavior applies unchanged — the sale is NOT queued, the error is surfaced to the cashier as before

### Requirement: Provisional ticket display for queued sales
`SaleConfirmedModal` (or its offline equivalent) SHALL, for a sale in `outboxSales` with `status` other than `"synced"`, display the sale's `provisionalCode` (format `"OFFLINE-<shortId>"`) instead of a fiscal folio code, together with explanatory copy that the real folio will be assigned once the sale synchronizes and MAY NOT follow the chronological order of creation.

#### Scenario: Provisional code shown for a queued sale
- **WHEN** a sale was queued offline and has not yet synced
- **THEN** the confirmation UI shows the `provisionalCode`, an indicator that the sale is pending synchronization, and copy stating the folio is not yet final

#### Scenario: Ticket updates to the real folio once synced
- **WHEN** an outbox sale transitions from `pending`/`syncing` to `synced` while its confirmation UI is still open, or when the cashier revisits it from the sync queue panel afterward
- **THEN** the UI updates to show the real `serverFolioCode` in place of the provisional code

### Requirement: Sync status badge in POS header
`PosHeader` SHALL render a persistent sync status indicator reflecting the current `offline-sync` state: offline, syncing (with progress count), N items pending, or fully synced.

#### Scenario: Badge reflects offline state
- **WHEN** the app detects no connectivity
- **THEN** the POS header shows a badge reading something equivalent to "Sin conexión — modo offline"

#### Scenario: Badge reflects pending queue count
- **WHEN** the app is online but the outbox has unsynced items (e.g. still draining, or a previous offline stretch left items behind)
- **THEN** the badge shows the count of pending items, updating live as items sync

### Requirement: Product search and price lookups fall back to offline cache
`searchProducts`, `getProductPrices`, and `getProductDosifications` (POS `_logic/services`) SHALL, on `NetworkError` from `authFetch`, fall back to querying the `offline-sync` catalog cache (`catalogProducts`, `catalogPrices`, `catalogDosifications`) for the current `ownerBranchId`, instead of surfacing a network error to the cashier.

#### Scenario: Product search falls back to cache offline
- **WHEN** a cashier searches for a product while offline
- **THEN** results come from `catalogProducts` filtered by code/name, including the cached `stock` value from `branchInventory`

#### Scenario: Product not found in cache is reported distinctly from a network error
- **WHEN** a cashier searches for a product offline that was never cached (e.g. added to the catalog after the last sync)
- **THEN** the UI shows an explicit "no encontrado en catálogo offline" state, not a generic network-error message
