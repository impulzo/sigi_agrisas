## MODIFIED Requirements

### Requirement: Quotes services with typed errors
The system SHALL provide service modules under `app/(private)/quotes/_logic/services/` for `listQuotes`, `getQuote`, `createQuote`, `updateQuote`, `authorizeQuote`, `cancelQuote`, and `convertQuote`. Each service SHALL accept an injectable `fetchImpl?: typeof fetch` parameter for tests. Each service SHALL map HTTP errors to typed errors defined in `app/(private)/quotes/_logic/errors.ts`: `QuoteNotFoundError`, `QuoteNotEditableError(status)`, `QuoteAlreadyCancelledError`, `QuoteAlreadyConvertedError(saleId)`, `QuoteExpiredError`, plus the reused `ProductInactiveError`, `ProductPriceMismatchError`, `BranchInactiveError`, `CustomerInactiveError`, `FolioInactiveError`, `PaymentMethodInactiveError`, and forbidden variants (`QuoteScopingForbiddenError`, `QuoteWriteForbiddenError`, etc.). Services SHALL convert ISO strings to `Date` for `createdAt`, `updatedAt`, `authorizedAt`, `cancelledAt`, `convertedAt`, and `expiresAt`. Services SHALL NOT return raw `Response` objects.

**Fallback for unmapped 400 errors**: when `createQuote` (and, by the same rule, any other quote service) receives an HTTP 400 whose `error` message does not match any of the known keyword patterns (customer/branch/folio/product/price/empty/items inactive or mismatch), the service SHALL NOT throw a generic `NetworkError`. Instead it SHALL throw a typed error (e.g. `QuoteCreateValidationError`) that carries the backend's original `error` message string, so the UI can display the real validation cause (e.g. an invalid UUID, or an `expiresAt` that is not in the future) instead of a misleading network-failure message. This fallback applies only to true HTTP 400 responses (a real request reaching the server); actual network failures (`fetch` throwing) SHALL continue to throw `NetworkError`.

#### Scenario: createQuote success
- **WHEN** `createQuote(body)` is invoked and the backend returns 201 with a `QuoteDetailDto`
- **THEN** the service returns the parsed `Quote` (domain type) with `Date` instances for date fields

#### Scenario: createQuote 400 inactive customer maps
- **WHEN** the backend returns 400 `{"error": "Customer is inactive"}`
- **THEN** the service throws `CustomerInactiveError`

#### Scenario: authorizeQuote 409 expired maps
- **WHEN** the backend returns 409 `{"error": "Quote has expired"}`
- **THEN** `authorizeQuote(id)` throws `QuoteExpiredError`

#### Scenario: cancelQuote 409 already cancelled maps
- **WHEN** the backend returns 409 `{"error": "Quote is already cancelled"}`
- **THEN** `cancelQuote(id)` throws `QuoteAlreadyCancelledError`

#### Scenario: cancelQuote 409 already converted carries saleId
- **WHEN** the backend returns 409 `{"error": "Converted quotes cannot be cancelled...", "saleId": "S-1"}`
- **THEN** `cancelQuote(id)` throws `QuoteAlreadyConvertedError("S-1")` with `err.saleId === "S-1"`

#### Scenario: convertQuote 200 returns SaleDetailDto
- **WHEN** `convertQuote(id, body)` is invoked and the backend returns 200 with a `SaleDetailDto`
- **THEN** the service returns the parsed `Sale` domain type

#### Scenario: convertQuote 409 expired maps
- **WHEN** the backend returns 409 `{"error": "Quote has expired"}`
- **THEN** the service throws `QuoteExpiredError`

#### Scenario: getQuote 404 maps
- **WHEN** the backend returns 404 for `GET /quotes/:id`
- **THEN** the service throws `QuoteNotFoundError`

#### Scenario: Services accept injected fetch
- **WHEN** a test invokes `listQuotes({ ... }, fetchSpy)` with a stub `fetchSpy`
- **THEN** the service uses `fetchSpy` instead of the global `authFetch` and the test asserts the request payload

#### Scenario: createQuote 400 with unmapped message surfaces real cause
- **WHEN** the backend returns 400 `{"error": "expiresAt must be in the future"}` (a message not covered by any existing keyword mapping)
- **THEN** `createQuote(body)` throws a typed error carrying the message `"expiresAt must be in the future"`, NOT a generic `NetworkError`

#### Scenario: createQuote 400 invalid UUID surfaces real cause
- **WHEN** the backend returns 400 `{"error": "Invalid uuid"}` (e.g. caused by an empty `branchId` sent by an admin in bypass mode who has not selected a branch)
- **THEN** `createQuote(body)` throws a typed error carrying the message `"Invalid uuid"`, NOT a generic `NetworkError`

#### Scenario: Actual network failure still maps to NetworkError
- **WHEN** the underlying `fetch` call throws (e.g. connection refused, offline)
- **THEN** `createQuote(body)` throws `NetworkError` as before — this fallback change does NOT alter true network-failure handling
