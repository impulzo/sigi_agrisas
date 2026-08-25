## ADDED Requirements

### Requirement: Installable PWA with offline-capable app shell
The system SHALL expose a `manifest.json` and register a service worker so the app is installable and, once installed and opened at least once online, launches and renders its shell without a network connection.

#### Scenario: App installs and opens offline
- **WHEN** a user installs the app (via the browser's install affordance) while online, then later opens the installed app with no network connection
- **THEN** the app shell (JS/CSS bundle, base layout) loads successfully instead of showing a browser network-error page

#### Scenario: Deep-link navigation without a cached route falls back gracefully
- **WHEN** a user opens a URL that was never precached (e.g. a hard refresh on an uncommon route) with no network connection
- **THEN** the app shows a minimal offline fallback screen instead of the browser's default network-error page

### Requirement: Service worker cache is versioned per build and purges stale versions
The service worker SHALL name its caches using the current Next.js build identifier and, in its `activate` phase, delete caches belonging to previous build identifiers.

#### Scenario: New deploy does not serve a stale shell indefinitely
- **WHEN** a new build is deployed and a previously-installed client reconnects and reloads
- **THEN** the service worker's `activate` handler removes caches from the prior build id, and subsequent loads fetch the new build's assets

### Requirement: Service worker never intercepts API routes
The service worker SHALL NOT cache or intercept responses for any request under `/api/v1/**` — those requests always go to the network or fail with a network error, leaving all data caching to the IndexedDB layer described below.

#### Scenario: API request while offline surfaces a network error, not a stale cached response
- **WHEN** the app calls any `/api/v1/**` endpoint while offline
- **THEN** the request fails as a network error (handled by `authFetch`'s existing `NetworkError` path) — the service worker does not intercept it or return a cached API response

### Requirement: Local offline database scoped to a single branch
The system SHALL persist a local IndexedDB database (`agrisas-offline`) holding cached catalog data, cached inventory data, and outbound mutation queues, all tagged with the `ownerBranchId` of the branch the offline session belongs to.

#### Scenario: Cache purges when the session's branch changes
- **WHEN** the app boots or a user logs in and the resolved session branch differs from the stored `meta.ownerBranchId`
- **THEN** all catalog, inventory, and outbox stores belonging to the previous `ownerBranchId` are purged before any new offline read or write is allowed

#### Scenario: Purge is blocked while unsynced items remain
- **WHEN** the branch-change purge in the previous scenario would discard `outboxSales`/`outboxQuotes` items still in `pending` or `failed` status
- **THEN** the purge is blocked and the user is prompted to synchronize or explicitly discard those items first — no queued sale or quote is silently deleted

### Requirement: Bypass users must fix a working branch before operating offline
A user with the `branches:access_all` permission SHALL NOT be able to enter offline mode (create offline sales/quotes, or read from the offline cache) unless they have explicitly fixed a single working branch while online.

#### Scenario: Offline disabled for bypass user without a fixed branch
- **WHEN** a user with `branches:access_all` who has never fixed a working branch loses connectivity
- **THEN** offline sale/quote creation and offline catalog browsing are disabled for that session, with UI messaging explaining a working branch must be fixed first

#### Scenario: Bypass user fixes a branch while online
- **WHEN** a user with `branches:access_all` explicitly selects and confirms a working branch while online
- **THEN** `meta.ownerBranchId` is set to that branch, and from that point the user's offline experience is identical to a regular cashier scoped to that branch

### Requirement: Catalog and inventory read-only offline cache
The system SHALL cache active products, prices, dosifications, payment methods, POS-scope folios, active customers, and per-product branch stock (`branchInventory`) for the current `ownerBranchId`, refreshed periodically while online, and SHALL expose no write path to this cache while offline.

#### Scenario: Catalog and stock browsable while offline
- **WHEN** a user searches products or views stock levels in POS, Quotes, or Inventory while offline
- **THEN** results come from the cached data for the current `ownerBranchId`, including the last-known `quantity`

#### Scenario: No inventory adjustment available offline
- **WHEN** a user is offline and navigates to any inventory adjustment screen or action
- **THEN** no adjustment/write action is available — the screen renders in a read-only state

#### Scenario: Staleness of cached catalog is visible
- **WHEN** a user is browsing cached catalog/stock data
- **THEN** the UI displays how long ago the cache was last refreshed, with a distinct visual treatment once it exceeds a configured staleness threshold

#### Scenario: Empty cache on first-ever offline use is reported explicitly
- **WHEN** a user goes offline before the catalog cache has ever been successfully populated for their `ownerBranchId`
- **THEN** the UI shows an explicit "sin datos cacheados, conéctate primero" state rather than an empty or broken screen

### Requirement: Offline mutation outbox for sales and quotes
The system SHALL queue sales and quotes created while offline into local `outboxSales`/`outboxQuotes` stores, each record carrying a generated `clientRequestId` (UUID), the request payload, client-computed totals for display, a `provisionalCode`, and a `status` of `pending`, `syncing`, `synced`, or `failed`.

#### Scenario: Offline sale/quote is queued with a provisional code
- **WHEN** a sale or quote is created while offline
- **THEN** it is written to the corresponding outbox store with `status: "pending"`, a fresh `clientRequestId`, and a `provisionalCode` of the form `"OFFLINE-<shortId>"` for display until synced

#### Scenario: Outbox payload never carries client-trusted snapshot data as authoritative
- **WHEN** an outbox record is later sent to the server during sync
- **THEN** the request body includes only IDs and quantities (`productId`, `productPriceId`/`dosificationId`, `quantity`, etc.) — never client-computed snapshot fields as an override, so the server's own catalog resolution (per `pos-api`/`quotes-api`) remains authoritative

### Requirement: Sync engine drains the outbox on reconnect with a single leader tab
The system SHALL detect connectivity restoration, elect a single leader browser tab (reusing the existing `BroadcastChannel`-based leader-election pattern used for token refresh), and have only that tab drain `outboxSales`/`outboxQuotes` in FIFO order, one request in flight at a time, against the existing `POST /api/v1/admin/sales` and `POST /api/v1/admin/quotes` endpoints with `clientRequestId` in the body.

#### Scenario: Reconnection triggers automatic sync
- **WHEN** connectivity is restored (via the `online` event, a periodic connectivity poll, or an opportunistic successful `authFetch` call) while the outbox has pending items
- **THEN** the elected leader tab begins draining the outbox automatically, without requiring manual user action

#### Scenario: Multiple open tabs do not double-submit
- **WHEN** two tabs of the same session are open when connectivity is restored
- **THEN** only the elected leader tab issues sync requests; the other tab(s) observe status updates via the broadcast channel without issuing their own requests

#### Scenario: Successful sync updates the record with the real folio
- **WHEN** an outbox item's sync request returns HTTP 201
- **THEN** the record transitions to `status: "synced"`, stores `serverSaleId`/`serverFolioCode` (or the quote equivalent), and any open UI referencing it updates from the provisional code to the real folio

#### Scenario: Transient failure retries with backoff without blocking the rest of the queue
- **WHEN** a sync request fails with a network error or an HTTP 5xx
- **THEN** the item's `attempts` increments, an exponential backoff delay is applied before its next retry, and the engine proceeds to attempt the next independent outbox item rather than stalling on the failed one

#### Scenario: Business-rule failure does not auto-retry
- **WHEN** a sync request fails with an HTTP 4xx representing a business-rule rejection (e.g. inactive customer, expired quote)
- **THEN** the item transitions to `status: "failed"` with the server's error stored, and is NOT automatically retried — it becomes actionable from the sync queue panel

#### Scenario: Idempotent replay prevents duplicates after a lost response
- **WHEN** the leader tab crashes or reloads after a sync request was sent but before its response was received, and the same `clientRequestId` is retried on the next sync pass
- **THEN** the server's idempotent-replay lookup (per `pos-api`/`quotes-api`) returns the already-created entity, and the outbox record is reconciled to `synced` without a duplicate sale/quote being created

### Requirement: Sync status and queue UI
The system SHALL surface the current sync state persistently in the UI (offline / syncing with progress / N pending / fully synced) and provide a queue panel listing every outbox item with per-item retry, discard, and edit-and-retry actions, plus a persistent warning while the outbox is non-empty against clearing browser data.

#### Scenario: Status badge reflects current state
- **WHEN** the app's connectivity or outbox state changes
- **THEN** the persistent sync status indicator updates to reflect offline, syncing (with an in-progress count), N items pending, or fully synced

#### Scenario: Failed item can be retried, edited, or discarded
- **WHEN** a user opens the sync queue panel and selects a `failed` item
- **THEN** they can retry it as-is, edit its contents and retry (reopening the cart pre-filled for correctable errors), or discard it (always safe pre-sync, since nothing exists server-side yet)

#### Scenario: Persistent warning while unsynced items exist
- **WHEN** the outbox contains any `pending` or `failed` item
- **THEN** the UI displays a persistent warning against closing the browser tab or clearing browser data, since queued items exist only locally until synced
