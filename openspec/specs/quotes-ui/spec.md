# Spec: quotes-ui

## Purpose

Define las pantallas de gestión de cotizaciones del panel Agrisas: listado paginado con filtros, creación de cotización reutilizando los bloques POS, detalle con barra de acciones contextual por estado, edición de borradores, y los modales de autorización, cancelación y conversión a venta. Incluye el modo "Cotización" en el POS (SegmentedButton) y la elevación de hooks compartidos (`useFoliosOptions`, `usePaymentMethodsOptions`) a `app/_hooks/`.

---

## Requirements

### Requirement: Quotes list screen with filters and pagination
The system SHALL provide a screen at `/quotes` (`QuotesListPage`) that requires the `quotes:read` permission (gated via `useCurrentUser().can("quotes:read")`). The screen SHALL render a `CatalogShell` with a `CatalogToolbar` (`searchScope="server"`), filter controls, a `QuotesTable`, and a `CatalogPagination`. The toolbar SHALL include: a debounced search input (300 ms, min 2 chars) mapped to `?search=`; a state `<select>` with options `Todas | Borrador | Autorizada | Convertida | Cancelada | Vencida` mapped to `?status=`; a branch `<select>` (hidden when the caller does NOT have `branches:access_all`); and two `<input type="date">` fields for `?from=` and `?to=`. Without `quotes:read` the screen SHALL render an empty/forbidden state without dispatching any request.

#### Scenario: Authorized user opens the quotes list
- **WHEN** a user with `quotes:read` navigates to `/quotes`
- **THEN** a `GET /api/v1/admin/quotes?page=1&pageSize=20` request is dispatched and the table renders the response

#### Scenario: User without quotes:read sees no access
- **WHEN** a user without `quotes:read` navigates to `/quotes`
- **THEN** the screen renders an empty/forbidden state without dispatching any request

#### Scenario: State filter "Vencida" maps to ?status=expired
- **WHEN** the user selects the `Vencida` option in the state `<select>`
- **THEN** the next request includes `?status=expired` and the table shows quotes whose persisted `status='expired'` OR `(status='authorized' AND expires_at < NOW())`

#### Scenario: Search debounced
- **WHEN** the user types `"COT-12"` in the search input
- **THEN** after 300 ms a request with `?search=COT-12` is dispatched, replacing any in-flight request

#### Scenario: Search shorter than 2 chars not dispatched
- **WHEN** the user types `"c"` in the search input
- **THEN** no request is dispatched and the table keeps the previous results

#### Scenario: Branch filter hidden without bypass
- **WHEN** the caller does NOT have `branches:access_all`
- **THEN** the branch `<select>` is NOT rendered and requests omit `?branchId=` (the backend implicitly filters by `x-user-branch-id`)

#### Scenario: Branch filter visible for admin
- **WHEN** the caller has `branches:access_all`
- **THEN** the branch `<select>` is rendered, defaults to "Todas" (empty value), and selecting one branch appends `?branchId=<id>` to the next request

#### Scenario: Pagination changes page
- **WHEN** the user clicks page 2 in `CatalogPagination`
- **THEN** the next request includes `?page=2&pageSize=<current>` preserving other filters

#### Scenario: Date range applied
- **WHEN** the user picks `from=2026-05-01` and `to=2026-05-31`
- **THEN** the next request includes `?from=2026-05-01&to=2026-05-31`

#### Scenario: pageSize uses default 20
- **WHEN** the screen mounts
- **THEN** the first request includes `pageSize=20`

---

### Requirement: Quotes table renders status badge and per-row "Ver" action
The `QuotesTable` block SHALL render columns `Folio` (font-mono `folioCode-folioNumber`), `Cliente` (initials avatar + `customerName` + small `customerRfc`), `Vendedor` (`creatorName`), `Sucursal` (`branchName`, only rendered when the caller has `branches:access_all`), `Total` (tabular-nums, MX currency, right-aligned), `Vence` (`expiresAt` short date or empty; with warning icon when `isExpired === true`), `Estado` (`QuoteStatusBadge`), `Fecha` (`createdAt` short date), and a per-row "Ver" link to `/quotes/[id]`. Rows for `expired` (or `authorized` with `isExpired === true`) SHALL render with a subtle warning-tinted left border to flag attention. The empty list SHALL render `CatalogEmpty` with copy "Aún no hay cotizaciones" and a CTA "Nueva cotización" (gated by `quotes:create`).

#### Scenario: Row renders status badge
- **WHEN** the row has `status='authorized'` and `isExpired=false`
- **THEN** the `Estado` cell renders the `Autorizada` badge with `bg-secondary-container` and `bg-secondary` dot

#### Scenario: Authorized but expired renders as Vencida
- **WHEN** the row has `status='authorized'` and `isExpired=true`
- **THEN** the `Estado` cell renders the `Vencida` badge with `bg-error-container`, `text-on-error-container`, and `bg-error` dot

#### Scenario: Converted row links to the sale
- **WHEN** the row has `status='converted'` and `convertedSaleId='SALE-1'`
- **THEN** the `Estado` cell renders the `Convertida` badge and the row action includes a secondary link "Ver venta" to `/sales/SALE-1`

#### Scenario: Branch column hidden without bypass
- **WHEN** the caller does NOT have `branches:access_all`
- **THEN** the `Sucursal` column is NOT rendered (neither header nor cells)

#### Scenario: Empty list shows CTA
- **WHEN** the response has `total=0` and the caller has `quotes:create`
- **THEN** the screen renders `CatalogEmpty` with the "Nueva cotización" button linking to `/quotes/new`

#### Scenario: Empty list without quotes:create hides CTA
- **WHEN** the response has `total=0` and the caller lacks `quotes:create`
- **THEN** the screen renders `CatalogEmpty` without the "Nueva cotización" button

---

### Requirement: Quote create screen reuses POS cart blocks
The system SHALL provide a screen at `/quotes/new` (`QuoteCreatePage`) that requires `quotes:create`. The screen SHALL render the same split-pane layout as `/pos`: a left `ProductCatalogPanel` (search debounced, server-side, paginated) and a right `QuoteEmitPanel`. The `QuoteEmitPanel` SHALL contain selectors for branch (only the user's branch unless the caller has `branches:access_all`), folio (loaded via `useFoliosOptions`), customer (via `CustomerPicker` + `CustomerQuickAddModal` reused from POS), an optional `expiresAt` date input (min: tomorrow; max: +180 days), an optional `notes` textarea, and the `CartLinesList`/`CartTotals` blocks reused from POS. The primary button "Crear cotización" SHALL be disabled until the cart has ≥1 line and branch/folio/customer are selected. On submit it SHALL dispatch `POST /api/v1/admin/quotes` and on 201 navigate to `/quotes/[id]`.

#### Scenario: Authorized user creates a quote
- **WHEN** a user with `quotes:create` fills branch, folio, customer, adds 2 lines via `PriceTierPicker`, and clicks "Crear cotización"
- **THEN** a `POST /api/v1/admin/quotes` is dispatched with `{ branchId, customerId, folioId, items: [...], notes?, expiresAt? }` and on 201 the router navigates to `/quotes/<id>`

#### Scenario: User without quotes:create sees no access
- **WHEN** a user without `quotes:create` navigates to `/quotes/new`
- **THEN** the screen renders an empty/forbidden state without dispatching any request

#### Scenario: Submit disabled until valid
- **WHEN** the cart is empty OR branch/folio/customer are not selected
- **THEN** the "Crear cotización" button is disabled with a tooltip "Selecciona sucursal, folio y cliente, y añade al menos un artículo"

#### Scenario: expiresAt validated client-side
- **WHEN** the user picks a date earlier than tomorrow
- **THEN** the input shows an inline error "La fecha de vencimiento debe ser posterior a hoy" and the submit button is disabled

#### Scenario: Quick-add customer integrates
- **WHEN** the user opens the `CustomerQuickAddModal`, creates a customer, and the modal closes
- **THEN** the new customer is preselected in the `CustomerPicker`

#### Scenario: 400 inactive product
- **WHEN** the backend returns 400 "Product is inactive"
- **THEN** a toast "Hay un producto inactivo en el carrito" appears and the cart stays open

#### Scenario: 403 scoping rejected
- **WHEN** a non-admin operator submits a body with `branchId` other than their own
- **THEN** the backend returns 403 and a toast "No tienes permiso para emitir cotizaciones en esa sucursal" appears

---

### Requirement: Quote detail screen with state-driven action bar
The system SHALL provide a screen at `/quotes/[id]` (`QuoteDetailPage`) that requires `quotes:read`. The screen SHALL render a header (folio mono, `QuoteStatusBadge`, total destacado, expiresAt with banner when `isExpired === true`), a metadata grid (cliente, sucursal, vendedor, fecha de creación, fecha de autorización if any, fecha de conversión if any, fecha de cancelación if any, motivo de cancelación if any), a `QuoteItemsTable` listing items with snapshot fields, a totals block (subtotal, taxTotal, total), and a `QuoteActionsBar`. The `QuoteActionsBar` SHALL render buttons according to `(status, isExpired, can(...))`:

| status | isExpired | Buttons |
|---|---|---|
| `draft` | false | Autorizar (`quotes:authorize`), Editar (`quotes:write`), Cancelar (`quotes:cancel`) |
| `draft` | true | Editar (enabled, `quotes:write`), Cancelar (`quotes:cancel`); Autorizar disabled with tooltip "Extiende la fecha de vencimiento primero" |
| `authorized` | false | Convertir (`quotes:convert`), Cancelar (`quotes:cancel`) |
| `authorized` | true | Convertir disabled with tooltip "Cotización vencida — cancela y crea otra", Cancelar (`quotes:cancel`) |
| `converted` | n/a | Ver venta generada (link `/sales/[convertedSaleId]`) only |
| `cancelled` | n/a | banner only; no buttons |

Buttons whose required permission is `"loading"` SHALL render disabled with a small spinner. Buttons whose required permission is `false` SHALL NOT render.

#### Scenario: Draft quote shows three actions
- **WHEN** the quote has `status='draft'` and the caller has all three permissions
- **THEN** the action bar renders "Autorizar", "Editar" and "Cancelar"

#### Scenario: Expired draft hides Authorize
- **WHEN** the quote has `status='draft'`, `expiresAt < now`, `isExpired=true`
- **THEN** the "Autorizar" button is rendered disabled with the tooltip; "Editar" remains enabled

#### Scenario: Authorized quote shows convert and cancel
- **WHEN** the quote has `status='authorized'` and the caller has both permissions
- **THEN** the action bar renders "Convertir a venta" and "Cancelar"; "Editar" is hidden

#### Scenario: Converted quote deep-links to sale
- **WHEN** the quote has `status='converted'` with `convertedSaleId='S-1'`
- **THEN** the action bar renders only the link "Ver venta generada" pointing to `/sales/S-1`

#### Scenario: Cancelled quote shows reason banner
- **WHEN** the quote has `status='cancelled'` with `cancellationReason='Cliente cambió de proveedor'`
- **THEN** the screen renders a banner with the reason and the cancelled date; no action buttons render

#### Scenario: Permission loading state
- **WHEN** the `quotes:authorize` permission resolves to `"loading"`
- **THEN** the "Autorizar" button renders disabled with a small spinner until the check resolves

#### Scenario: Viewer cannot see write actions
- **WHEN** the caller has only `quotes:read`
- **THEN** the action bar renders no write buttons (authorize/edit/cancel/convert)

#### Scenario: isExpired banner appears
- **WHEN** the detail returns `isExpired=true`
- **THEN** an amber banner "Cotización vencida — el precio podría no estar vigente" renders above the totals block

---

### Requirement: Quote edit screen rejects non-draft state
The system SHALL provide a screen at `/quotes/[id]/edit` (`QuoteEditPage`) that requires `quotes:write`. The page SHALL render the same cart-based editor as `/quotes/new` pre-hydrated with the quote's items, `notes`, and `expiresAt`. The fields `branchId`, `customerId`, and `folioId` SHALL appear as read-only (`disabled` inputs showing the original values). If the loaded quote has `status !== 'draft'`, the page SHALL render an inline error "Esta cotización ya no es editable" and redirect to `/quotes/[id]` after 2 seconds (no PATCH dispatched). On submit it SHALL dispatch `PATCH /api/v1/admin/quotes/:id`. On HTTP 409 the page SHALL show a toast "Otro usuario cambió el estado de la cotización. Redirigiendo al detalle…" and navigate to `/quotes/[id]`.

#### Scenario: Edit a draft quote
- **WHEN** the user opens `/quotes/[id]/edit` for a `draft` quote, replaces the items array, and submits
- **THEN** a `PATCH /api/v1/admin/quotes/[id]` is dispatched with `{ items: [...], notes?, expiresAt? }` and on 200 navigates to `/quotes/[id]`

#### Scenario: Non-draft quote rejected client-side
- **WHEN** the user navigates to `/quotes/[id]/edit` for an `authorized` quote
- **THEN** the page renders "Esta cotización ya no es editable" and after 2 seconds navigates to `/quotes/[id]`; no PATCH is dispatched

#### Scenario: Concurrent state change handled
- **WHEN** the user submits a PATCH and the backend returns 409 `{"error": "Quote cannot be edited in current status", "status": "authorized"}`
- **THEN** a toast "Otro usuario cambió el estado a Autorizada. Redirigiendo al detalle…" appears and after 2 seconds the router navigates to `/quotes/[id]`

#### Scenario: Folio/branch/customer locked
- **WHEN** the editor renders the form
- **THEN** the inputs for `folioId`, `branchId`, and `customerId` are rendered as `disabled` showing the original values; user-issued changes to these fields cannot be dispatched

#### Scenario: User without quotes:write sees no access
- **WHEN** a user without `quotes:write` navigates to `/quotes/[id]/edit`
- **THEN** the page renders an empty/forbidden state without dispatching any request

---

### Requirement: Authorize quote modal
The system SHALL provide an `AuthorizeQuoteModal` opened by the "Autorizar" button in the action bar. The modal SHALL show the folio, the current total, and an optional `notes` textarea (max 1000 chars). On submit it SHALL dispatch `POST /api/v1/admin/quotes/:id/authorize` with `{ notes? }`. On HTTP 409 with body `{"error": "Quote has expired"}` the modal SHALL show an inline error "La cotización ha vencido — extiende la fecha o crea una nueva" and disable the submit button. On HTTP 409 with body `{"error": "Quote cannot be authorized in current status"}` it SHALL close, show a toast, and refresh the detail.

#### Scenario: Authorize a draft
- **WHEN** the user clicks "Autorizar" and confirms in the modal
- **THEN** `POST /api/v1/admin/quotes/[id]/authorize` is dispatched, the modal closes on 200, and the detail refreshes showing `status='authorized'`

#### Scenario: Authorize expired draft
- **WHEN** the modal opens for a `draft` quote with `isExpired=true`
- **THEN** the submit button is disabled with the inline error "La cotización ha vencido — extiende la fecha o crea una nueva"

#### Scenario: Backend 409 race
- **WHEN** the user submits but the backend returns 409 (status changed concurrently)
- **THEN** the modal closes, a toast "El estado cambió mientras autorizabas; refrescando…" appears, and the detail refreshes

---

### Requirement: Cancel quote modal handles converted edge-case
The system SHALL provide a `CancelQuoteModal` opened by the "Cancelar" button. The modal SHALL show the folio and an optional `reason` textarea (max 500 chars). On submit it SHALL dispatch `DELETE /api/v1/admin/quotes/:id` with `{ reason? }`. On HTTP 409 `{"error": "Quote is already cancelled"}` it SHALL close and refresh the detail. On HTTP 409 with `saleId` in the body (`{"error": "Converted quotes cannot be cancelled. Cancel the related sale instead.", "saleId": "..."}`) it SHALL show an inline error "Esta cotización ya se convirtió en una venta — cancela el ticket relacionado" and render a secondary action button "Ir a la venta" linking to `/sales/[saleId]`.

#### Scenario: Cancel a draft
- **WHEN** the user enters `reason="Cliente cambió de proveedor"` and submits
- **THEN** `DELETE /api/v1/admin/quotes/[id]` is dispatched with `{ "reason": "Cliente cambió de proveedor" }` and on 200 the detail refreshes

#### Scenario: Already cancelled
- **WHEN** the user clicks "Cancelar" on a quote that another user cancelled meanwhile
- **THEN** the backend returns 409 "Quote is already cancelled", the modal closes, and the detail refreshes

#### Scenario: Converted quote deep-link
- **WHEN** the user tries to cancel a `converted` quote (race or stale UI)
- **THEN** the backend returns 409 with `saleId`; the modal renders "Ir a la venta" pointing to `/sales/[saleId]` and a primary button "Cerrar"

#### Scenario: User without quotes:cancel sees no Cancel button
- **WHEN** the caller lacks `quotes:cancel`
- **THEN** the "Cancelar" button is not rendered in the action bar

---

### Requirement: Convert quote modal
The system SHALL provide a `ConvertQuoteModal` opened by the "Convertir a venta" button. The modal SHALL show the quote folio + total and SHALL include obligatory selectors for `paymentMethodId` (loaded via `usePaymentMethodsOptions`) and **fiscal** `folioId` (loaded via `useFoliosOptions`, distinct from the quote's folio). The modal SHALL include an optional `notes` textarea (max 1000 chars) with placeholder "Vacío = mantener las notas de la cotización". On submit it SHALL dispatch `POST /api/v1/admin/quotes/:id/convert` with `{ paymentMethodId, folioId, notes? }`. On HTTP 200 it SHALL navigate to `/sales/[saleId]`. On HTTP 409 with `{"error": "Quote has expired"}` it SHALL show an inline error and disable the submit. On HTTP 400 with inactive folio/payment method, it SHALL show inline errors on the corresponding field.

#### Scenario: Convert authorized quote
- **WHEN** the user picks `paymentMethodId="cash"`, `folioId="fiscal-A"`, and submits
- **THEN** `POST /api/v1/admin/quotes/[id]/convert` is dispatched with `{ paymentMethodId, folioId }` and on 200 the router navigates to `/sales/[returned-saleId]`

#### Scenario: Idempotent re-convert
- **WHEN** the user clicks "Convertir a venta" twice in rapid succession on the same already-authorized quote
- **THEN** the submit button is disabled while in flight; on success the router navigates only once to `/sales/[saleId]`; if the user manually clicks again on a converted quote, the action bar shows "Ver venta generada" (no convert)

#### Scenario: Conversion when expired
- **WHEN** the modal opens for an `authorized` quote where `isExpired=true`
- **THEN** the submit button is disabled with the inline message "Cotización vencida — cancela y crea otra"

#### Scenario: Inactive fiscal folio
- **WHEN** the user picks a folio that the backend rejects with 400 "Folio is inactive"
- **THEN** the modal stays open with an inline error "Este folio está inactivo" under the folio selector

#### Scenario: Folio and payment method selectors required
- **WHEN** either `paymentMethodId` or `folioId` is empty
- **THEN** the submit button is disabled with the tooltip "Selecciona método de pago y folio fiscal"

#### Scenario: Notes empty preserves quote notes
- **WHEN** the user submits with `notes=""` and the quote has `notes="Cliente prefiere entrega martes"`
- **THEN** the resulting sale has `notes="Cliente prefiere entrega martes"` (backend behavior); the modal does NOT send `notes` field

---

### Requirement: QuoteStatusBadge component
The system SHALL provide a `QuoteStatusBadge` component (`app/(private)/quotes/_blocks/QuoteStatusBadge.tsx`) that accepts `{ status: "draft" | "authorized" | "converted" | "cancelled" | "expired", isExpired?: boolean }` and renders a pill with a colored dot following the Stitch screen `03b348783f7b46f0ac6f88aaef19a649`. The component is presentational (no fetch, no router, no state). If `status === 'authorized' && isExpired === true`, the badge SHALL render as `Vencida` (not `Autorizada`).

#### Scenario: Draft badge
- **WHEN** `<QuoteStatusBadge status="draft" />` is rendered
- **THEN** the DOM contains a pill with text "Borrador", `bg-surface-container-high`, `text-on-surface-variant`, and an `bg-outline` dot

#### Scenario: Authorized badge
- **WHEN** `<QuoteStatusBadge status="authorized" isExpired={false} />` is rendered
- **THEN** the DOM contains a pill with text "Autorizada", `bg-secondary-container`, `text-on-secondary-container`, and a `bg-secondary` dot

#### Scenario: Authorized but expired renders Vencida
- **WHEN** `<QuoteStatusBadge status="authorized" isExpired={true} />` is rendered
- **THEN** the DOM contains a pill with text "Vencida", `bg-error-container`, `text-on-error-container`, and a `bg-error` dot

#### Scenario: Converted badge
- **WHEN** `<QuoteStatusBadge status="converted" />` is rendered
- **THEN** the DOM contains a pill with text "Convertida", `bg-primary-fixed-dim/20`, `text-on-primary-fixed-variant`, and a `bg-primary` dot

#### Scenario: Cancelled badge
- **WHEN** `<QuoteStatusBadge status="cancelled" />` is rendered
- **THEN** the DOM contains a pill with text "Cancelada", `bg-surface-container-highest`, `text-on-surface-variant`, and a `bg-outline-variant` dot

#### Scenario: Explicit expired status
- **WHEN** `<QuoteStatusBadge status="expired" />` is rendered
- **THEN** the DOM renders the same `Vencida` pill as the `authorized + isExpired=true` case

---

### Requirement: "Cotizar" mode in the POS branches submit to quote creation
The `/pos` screen (`PosPage`) SHALL accept an internal mode `"sale" | "quote"` (default `"sale"`) controlled by a `SegmentedButton` rendered in `PosHeader`. The segmented button SHALL render two options: `{ value: "sale", label: "Venta", icon: "point_of_sale" }` and `{ value: "quote", label: "Cotización", icon: "request_quote" }`. The segmented button SHALL be rendered ONLY when `can("quotes:create") === true`; otherwise the page remains in `mode="sale"` permanently. Switching the mode while the cart has lines SHALL open a `ConfirmDialog` "Se eliminarán las líneas actuales del carrito al cambiar de modo. ¿Continuar?"; on confirm the cart is cleared and the mode switches; on cancel the mode reverts.

When `mode === "quote"`:

- The cart panel SHALL hide the `paymentMethodId` selector (not applicable).
- The cart panel SHALL render an `expiresAt` `<input type="date">` (min: tomorrow, max: +180 days; empty = no expiration).
- The primary CTA SHALL be "Crear cotización" styled as `bg-secondary-container text-on-secondary-container` (Stitch token for "Create Quote"). The "Finalizar venta" button SHALL NOT render.
- The submit SHALL dispatch `POST /api/v1/admin/quotes` with `{ branchId, customerId, folioId, items, notes?, expiresAt? }` and on HTTP 201 SHALL `router.push("/quotes/[id]")` (no `SaleConfirmedModal`).

When `mode === "sale"` the existing POS behavior SHALL be preserved unchanged: `paymentMethodId` selector visible, `expiresAt` hidden, CTA "Finalizar venta" with `bg-primary`, submit `POST /api/v1/admin/sales`, `SaleConfirmedModal` on success.

#### Scenario: Segmented button visible for users with quotes:create
- **WHEN** the user has both `sales:create` and `quotes:create`
- **THEN** the `SegmentedButton` "Venta | Cotización" renders in `PosHeader`

#### Scenario: Segmented button hidden without quotes:create
- **WHEN** the user has `sales:create` but NOT `quotes:create`
- **THEN** the `SegmentedButton` is NOT rendered; the page operates exclusively in `mode="sale"`

#### Scenario: Switching mode confirms when cart is non-empty
- **WHEN** the cart has 2 lines, the user is in `mode="sale"`, and clicks the "Cotización" segment
- **THEN** a `ConfirmDialog` "Se eliminarán las líneas actuales del carrito al cambiar de modo. ¿Continuar?" opens; on confirm the cart is cleared and the mode changes to `quote`; on cancel the mode stays `sale` and the cart is preserved

#### Scenario: Switching mode skips confirmation when cart is empty
- **WHEN** the cart has 0 lines and the user clicks the other mode
- **THEN** the mode changes immediately without a confirm dialog

#### Scenario: Mode quote hides payment method
- **WHEN** the page is in `mode="quote"`
- **THEN** the `paymentMethodId` `<select>` is NOT rendered and the CTA reads "Crear cotización"

#### Scenario: Mode quote shows expiresAt
- **WHEN** the page is in `mode="quote"`
- **THEN** an `<input type="date">` labeled "Vencimiento (opcional)" renders with `min={tomorrow}` and `max={today + 180 days}`

#### Scenario: Mode quote submit dispatches POST /quotes and navigates
- **WHEN** the user submits in `mode="quote"`
- **THEN** a `POST /api/v1/admin/quotes` is dispatched and on 201 the router navigates to `/quotes/<id>` without showing `SaleConfirmedModal`

#### Scenario: Mode sale preserves existing behavior
- **WHEN** the user submits in `mode="sale"`
- **THEN** a `POST /api/v1/admin/sales` is dispatched and on 201 the `SaleConfirmedModal` opens (existing POS behavior preserved)

#### Scenario: Mode quote 403 scoping
- **WHEN** the backend returns 403 to a `POST /quotes` with branch outside scope
- **THEN** a toast "No tienes permiso para emitir cotizaciones en esa sucursal" appears and the form stays open

#### Scenario: Default mode preserved for users without quotes:create
- **WHEN** a user with only `sales:create` opens `/pos`
- **THEN** the page mounts with `mode="sale"` and never changes; no `?mode=` query parameter is honored

---

### Requirement: Branch scoping consistency in quotes UI
All quote screens SHALL respect the backend scoping rules. The `branchId` selector in `/quotes/new` and in the quotes list filter SHALL be hidden (or restricted to the user's single branch) when the caller lacks `branches:access_all`. Quote requests issued by the UI MUST NOT include a `branchId` outside the caller's scope. Server 403 responses SHALL be surfaced as toasts and SHALL NOT cause infinite-loop retries.

#### Scenario: Operator list restricted
- **WHEN** an operator without `branches:access_all` opens `/quotes`
- **THEN** the branch filter is not rendered; requests omit `?branchId=`; the backend returns only the operator's branch quotes

#### Scenario: Operator cannot pick another branch in create
- **WHEN** an operator without `branches:access_all` opens `/quotes/new`
- **THEN** the branch selector shows only their assigned branch (single option, preselected, disabled)

#### Scenario: Server 403 surfaced once
- **WHEN** a 403 happens during conversion
- **THEN** a single toast appears with the message "No tienes permiso para esta operación"; the modal stays open allowing the user to close it; no automatic retry is issued

---

### Requirement: Quotes services with typed errors
The system SHALL provide service modules under `app/(private)/quotes/_logic/services/` for `listQuotes`, `getQuote`, `createQuote`, `updateQuote`, `authorizeQuote`, `cancelQuote`, and `convertQuote`. Each service SHALL accept an injectable `fetchImpl?: typeof fetch` parameter for tests. Each service SHALL map HTTP errors to typed errors defined in `app/(private)/quotes/_logic/errors.ts`: `QuoteNotFoundError`, `QuoteNotEditableError(status)`, `QuoteAlreadyCancelledError`, `QuoteAlreadyConvertedError(saleId)`, `QuoteExpiredError`, plus the reused `ProductInactiveError`, `ProductPriceMismatchError`, `BranchInactiveError`, `CustomerInactiveError`, `FolioInactiveError`, `PaymentMethodInactiveError`, and forbidden variants (`QuoteScopingForbiddenError`, `QuoteWriteForbiddenError`, etc.). Services SHALL convert ISO strings to `Date` for `createdAt`, `updatedAt`, `authorizedAt`, `cancelledAt`, `convertedAt`, and `expiresAt`. Services SHALL NOT return raw `Response` objects.

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

---

### Requirement: useQuotesList, useQuoteDetail and useQuoteMutations hooks
The system SHALL provide `useQuotesList`, `useQuoteDetail`, and `useQuoteMutations` hooks under `app/(private)/quotes/_logic/hooks/` mirroring the patterns of `useSalesList`, `useSaleDetail`, and `useSaleMutations`. `useQuotesList(filters)` SHALL handle pagination, abort in-flight requests on filter changes (via `AbortController`), and expose `{ items, total, page, isLoading, error, refresh }`. `useQuoteDetail(id)` SHALL expose `{ quote, isLoading, error, refresh }` and cancel in-flight on unmount. `useQuoteMutations(onChange?)` SHALL expose `{ isSaving, authorize, cancel, convert, update }`; each function returns a Promise and on success invokes `onChange(updatedEntity)` so callers can refresh views.

#### Scenario: List cancels stale requests
- **WHEN** the user changes the search filter twice in quick succession
- **THEN** the first in-flight request is aborted; only the latest response updates the list

#### Scenario: Detail unmount cancels
- **WHEN** the user navigates away from `/quotes/[id]` while the GET is still in flight
- **THEN** the AbortController aborts the fetch; no state update happens after unmount

#### Scenario: Mutation onChange callback fires
- **WHEN** `useQuoteMutations(onChange)` is invoked and `authorize(id)` resolves with the updated quote
- **THEN** the hook calls `onChange(updatedQuote)` exactly once

#### Scenario: convert callback receives Sale, not Quote
- **WHEN** `convert(id, body)` resolves
- **THEN** the hook calls `onChange(returnedSale)` where `returnedSale` is the `SaleDetailDto`; the caller distinguishes the type via a discriminator field

---

### Requirement: Shared option hooks elevated to app/_hooks/
The hooks `useFoliosOptions` and `usePaymentMethodsOptions` SHALL live under `app/_hooks/` (elevated from their original location in `app/(private)/pos/_logic/hooks/`) so both POS and Quotes UI can consume them without cross-feature imports. The hooks preserve their existing semantics: module-level cache with TTL 60s, returns `{ options, isLoading, refresh }`. All POS imports SHALL be updated to the new path. No behavioral change.

#### Scenario: Hooks exposed globally
- **WHEN** the file `app/_hooks/useFoliosOptions.ts` is inspected
- **THEN** it exports `useFoliosOptions` with the same signature and behavior as the prior `app/(private)/pos/_logic/hooks/useFoliosOptions.ts`

#### Scenario: POS imports updated
- **WHEN** the file `app/(private)/pos/_blocks/CartPanel.tsx` (or its parent `PosPage`) is inspected
- **THEN** the import path for `useFoliosOptions` and `usePaymentMethodsOptions` resolves to `app/_hooks/`

#### Scenario: Module cache shared
- **WHEN** the POS mounts and the Quotes UI mounts later in the same session
- **THEN** the second consumer reads from the cache populated by the first (no duplicated HTTP request within 60s)

---

### Requirement: NavigationRail item for quotes (consumed but defined in panel-shell)
The NavigationRail SHALL include the `quotes` item between `sales` and `inventory`. This requirement is fully specified in `panel-shell`'s modified `Navigation rail item catalogue`. The Quotes UI capability only declares the consumer expectation: navigating from the rail to `/quotes` SHALL render `QuotesListPage` and SHALL be gated by `quotes:read` (rail item not rendered if the permission resolves to `false`).

#### Scenario: Rail item navigates to /quotes
- **WHEN** the user clicks the "Cotizaciones" rail item
- **THEN** the router navigates to `/quotes` and `QuotesListPage` mounts

#### Scenario: Viewer with quotes:read sees the item
- **WHEN** a `viewer` user (has `quotes:read`) loads any private route
- **THEN** the rail renders the "Cotizaciones" item between `sales` and `inventory`

#### Scenario: Operator without quotes permissions hides the item
- **WHEN** an operator without `quotes:read` (hypothetical role) loads the panel
- **THEN** the rail does NOT render the "Cotizaciones" item

---

### Requirement: FolioScopeMismatch error typed in quotes frontend

El módulo frontend de cotizaciones (`app/(private)/quotes/_logic/`) SHALL definir la clase `FolioScopeMismatchError extends Error` con propiedades públicas `expected: string` y `actual: string`. Los servicios `createQuote` y `convertQuote` SHALL detectar la respuesta `{"error":"FolioScopeMismatch","expected":"...","actual":"..."}` (HTTP 400) y lanzar `FolioScopeMismatchError(expected, actual)`. El componente `ConvertQuoteModal` SHALL capturar `FolioScopeMismatchError` y mostrar el error como `inlineError` con un mensaje claro. La `QuoteCreatePage` (vía `useQuoteSubmission`) mostrará el mensaje del error en el toast existente del POS, ya que `useQuoteSubmission` propaga el error sin modificar.

#### Scenario: Backend retorna FolioScopeMismatch al crear cotización

- **WHEN** el servicio `createQuote` recibe HTTP 400 con body `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}`
- **THEN** el servicio lanza `FolioScopeMismatchError` con `expected="POS"` y `actual="OPERATIONS"` (en vez de `NetworkError`), y el POS muestra el mensaje del error en el toast

#### Scenario: Backend retorna FolioScopeMismatch al convertir cotización

- **WHEN** el servicio `convertQuote` recibe HTTP 400 con body `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}`
- **THEN** el servicio lanza `FolioScopeMismatchError` y `ConvertQuoteModal` lo captura mostrando el mensaje como `inlineError` visible sin cerrar el modal

#### Scenario: Otros errores 400 no se ven afectados

- **WHEN** el servicio recibe HTTP 400 con un error que NO es `FolioScopeMismatch` (e.g. `{"error":"Folio inactive"}`)
- **THEN** el comportamiento existente se mantiene sin cambios (otros mapeos de error siguen funcionando)
