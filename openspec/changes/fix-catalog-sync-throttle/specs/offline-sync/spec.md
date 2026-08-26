## MODIFIED Requirements

### Requirement: Catalog and inventory read-only offline cache
The system SHALL cache active products, prices, dosifications, payment methods, POS-scope folios, active customers, and per-product branch stock (`branchInventory`) for the current `ownerBranchId`, refreshed periodically while online, and SHALL expose no write path to this cache while offline. Refresh SHALL fetch per-product data (prices, dosifications) with a bounded concurrency limit — never issuing an unbounded fan-out of one HTTP request per catalog product simultaneously. An **automatic** refresh trigger (initial mount, the periodic interval, or the tab regaining visibility) SHALL be skipped when the cache is already fresher than a configured minimum interval; an explicit **manual** refresh action (user-triggered "sync now") SHALL NOT be subject to this gate and SHALL always run.

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

#### Scenario: Per-product prefetch respects a concurrency cap
- **WHEN** a catalog refresh runs for a branch with hundreds of products
- **THEN** the number of in-flight `prices`/`dosifications` requests for that batch never exceeds the configured concurrency limit, regardless of how many products are being synced

#### Scenario: Automatic refresh skips when the cache is already fresh
- **WHEN** the periodic refresh interval fires, or the tab regains visibility, or the provider mounts, and the cache was successfully refreshed less than the configured minimum interval ago
- **THEN** no new fetch is issued for that trigger, and the existing cache contents and `catalogSyncedAt` timestamp are left unchanged

#### Scenario: Manual refresh always runs regardless of freshness
- **WHEN** the user explicitly triggers a manual catalog refresh (e.g. via the sync status control) immediately after an automatic refresh already ran
- **THEN** the manual refresh executes anyway, without being skipped by the freshness gate that applies to automatic triggers
