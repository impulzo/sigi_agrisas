## ADDED Requirements

### Requirement: Quote submission queues offline instead of failing
The quotes submission flow (`useQuoteSubmission`, consumed by both `/quotes/new` and the POS "Cotización" mode) SHALL, when `authFetch` throws `NetworkError` (or the app's `isOnline` state is already `false`), enqueue the quote into the `offline-sync` outbox instead of surfacing a submission error.

#### Scenario: Quote submitted while offline is queued, not rejected
- **WHEN** a user submits a completed quote cart while offline
- **THEN** the quote is written to the `outboxQuotes` store with `status: "pending"` and a generated `clientRequestId`, and the confirmation UI shows a provisional state (see "Provisional state display for queued quotes" below) instead of the normal post-creation confirmation

#### Scenario: Genuine validation errors are not swallowed as offline
- **WHEN** a user submits a quote while online and the server responds with an HTTP 400 (e.g. inactive customer)
- **THEN** existing online error-handling behavior applies unchanged — the quote is NOT queued, the error is surfaced as before

### Requirement: Provisional state display for queued quotes
The quote confirmation/detail UI SHALL, for a quote in `outboxQuotes` with `status` other than `"synced"`, display the quote's `provisionalCode` instead of a fiscal folio code, together with copy explaining the quote is pending synchronization.

#### Scenario: Provisional code shown for a queued quote
- **WHEN** a quote was queued offline and has not yet synced
- **THEN** the UI shows the `provisionalCode` and a "pendiente de sincronizar" indicator instead of a real folio

#### Scenario: Quote updates to the real folio once synced
- **WHEN** an outbox quote transitions to `synced`
- **THEN** the UI updates to show the real `serverFolioCode`

### Requirement: Failed offline quote sync is surfaced without silent loss
If a queued quote fails to sync for a business reason (e.g. it expired while offline — see `quotes-api`'s "Quote synced offline discovered expired at sync time"), the quotes UI SHALL surface it in the `offline-sync` queue panel with the server's error, without deleting it from the outbox automatically.

#### Scenario: Expired offline quote surfaces its failure reason
- **WHEN** an offline-queued quote's sync attempt returns HTTP 400 because it expired
- **THEN** the outbox item transitions to `status: "failed"` with the error stored, remains visible in the sync queue panel, and offers the user the option to edit-and-retry (adjusting `expiresAt`) or discard — it is never silently dropped
