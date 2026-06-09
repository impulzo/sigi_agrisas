# Spec: returns-ui

## Purpose

Define la interfaz de usuario del módulo de Devoluciones del panel de Agrisas: listado paginado con filtros, detalle con acción de cancelación, formulario de creación de devolución contra un ticket de venta, integración de la sección de devoluciones en el detalle de venta, extensión del componente `SaleItemsTable`, servicios tipados y hooks de estado/mutación.

---

## Requirements

### Requirement: `/returns` route (paginated list with filters)
The system SHALL expose a private route `/returns` that lists returns in a paginated table. The page SHALL gate behind the `returns:read` permission via `useCurrentUser().can("returns:read")` and SHALL render `null` (or redirect to `/dashboard`) when the permission resolves to `false`. While the permission check is `"loading"`, the page SHALL render its layout optimistically to avoid layout shift.

The page SHALL fetch from `GET /api/v1/admin/returns` via the service `listReturns` (under `app/(private)/returns/_logic/services/`) and SHALL respect branch scoping (the request omits `?branchId=` for callers without `branches:access_all`, so the backend filters by `x-user-branch-id` implicitly).

Filters in the toolbar:
- **Search** (`<input>` with 300 ms debounce, min 2 chars) → `?search=` (server-side, matches `sale.folio_code`, `sale.folio_number`, `customer.name`, `customer.rfc`).
- **Estado** (`<select multiple>` with options "Activas" → `completed`, "Canceladas" → `cancelled`) → `?status=completed,cancelled` (default: ambas seleccionadas, equivalente a sin filtro).
- **Sucursal** (`<select>`) → `?branchId=` (visible **sólo** si `can("branches:access_all") === true`).
- **Desde** / **Hasta** (`<input type="date">`) → `?from=` / `?to=` (ISO date, inclusive bounds sobre `returnedAt`).

Pagination via `CatalogPagination` (page, pageSize, max 100 enforced by backend).

The table SHALL include columns: `Folio venta` (mono, link a `/sales/[saleId]`), `Cliente` (avatar con iniciales + name + rfc small), `Sucursal` (hidden when user lacks `branches:access_all`), `Devuelto por` (creatorName), `Reembolso` (refundTotal con `tabular-nums`, formato MXN), `Fecha` (returnedAt corto), `Estado` (`ReturnStatusBadge`), and an action button "Ver" linking to `/returns/[id]`.

If the filtered result is empty, the page SHALL render `<EmptyState icon="assignment_return" title="No hay devoluciones" description="Aún no se han registrado devoluciones con estos filtros." />`.

#### Scenario: Authorized user sees the list
- **WHEN** an authenticated user with `returns:read` navigates to `/returns`
- **THEN** the page SHALL fetch `GET /api/v1/admin/returns` and render the table populated with the response

#### Scenario: Unauthorized user is gated out
- **WHEN** an authenticated user without `returns:read` navigates to `/returns`
- **THEN** the page SHALL render `null` (or redirect to `/dashboard`) after the permission check resolves

#### Scenario: Operator without bypass implicitly filtered
- **WHEN** an `operator` with `x-user-branch-id: B1` (no `branches:access_all`) loads `/returns`
- **THEN** the request SHALL NOT include `?branchId=` and the backend SHALL filter by `B1` implicitly; the "Sucursal" column SHALL be hidden in the table

#### Scenario: Admin with bypass sees branch column
- **WHEN** an `admin` (has `branches:access_all`) loads `/returns`
- **THEN** the table SHALL include the "Sucursal" column and the toolbar SHALL render the "Sucursal" filter `<select>`

#### Scenario: Search debounced and server-side
- **WHEN** the user types "A-10" in the search input
- **THEN** after 300 ms the request `GET /api/v1/admin/returns?search=A-10&...` SHALL be sent, and the toolbar SHALL render a badge "Búsqueda en servidor · 2+ caracteres"

#### Scenario: Search ignored under 2 chars
- **WHEN** the user types "A" in the search input
- **THEN** the request SHALL NOT include the `search` parameter

#### Scenario: Filter by date range
- **WHEN** the user picks "Desde 2026-06-01" y "Hasta 2026-06-30"
- **THEN** the request SHALL include `?from=2026-06-01&to=2026-06-30`

#### Scenario: Empty result
- **WHEN** the filtered result has zero rows
- **THEN** the page SHALL render the `EmptyState` with icon `assignment_return` and friendly copy

---

### Requirement: `/returns/[id]` route (detail with cancel action)
The system SHALL expose a private route `/returns/[id]` that renders the detail of a single return with its items. The page SHALL gate behind `returns:read` and SHALL fetch from `GET /api/v1/admin/returns/:id` via the service `getReturn`. The id SHALL be a UUID; non-UUIDs SHALL trigger an `EmptyState` with "ID inválido".

The page SHALL render:
- **Header**: link "Volver al ticket" → `/sales/[saleId]` (icon `arrow_back`), `Folio devolución` (últimos 6 chars del id como referencia), `ReturnStatusBadge`, `refundTotal` destacado (display-md, tabular-nums), `returnedAt` legible (`02 de junio de 2026, 10:30`).
- **Items table**: tabla con snapshots por línea: `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`, `unitPrice`, `discountPct`, `ivaRate`/`iepsRate`, `lineSubtotal`/`lineTax`/`lineTotal`. Mismo styling que `SaleItemsTable`.
- **Metadata panel**: cliente (avatar + name + rfc + link a `/customers/[id]` si existe la ruta), sucursal (branchName), devuelto por (creatorName), motivo (reason en `<p>` con `whitespace-pre-line`), notas (notes si no null).
- **Cancellation block** (sólo si `status === 'cancelled'`): banner gris con icon `cancel`, `cancelledAt`, `cancelledBy` (nombre si está disponible o id) y `cancellationReason`.
- **Actions bar** (`ReturnActionsBar`): si `status === 'completed'` y `can("returns:cancel") === true`, renderiza botón "Cancelar devolución" (`bg-error-container text-on-error-container`) que abre `CancelReturnModal`. Si `status === 'cancelled'` o el usuario no tiene permiso, no se renderiza ningún botón.

#### Scenario: Authorized user views completed return
- **WHEN** an `operator` con `returns:read` y `returns:cancel` abre `/returns/<id>` para una devolución con `status='completed'` de su sucursal
- **THEN** el detalle se renderiza con todos los datos y el botón "Cancelar devolución" visible

#### Scenario: User without cancel permission
- **WHEN** un `viewer` con `returns:read` (sin `returns:cancel`) abre `/returns/<id>` para una devolución `completed`
- **THEN** el detalle se renderiza pero el botón "Cancelar devolución" NO aparece

#### Scenario: Already cancelled return
- **WHEN** un usuario abre `/returns/<id>` para una devolución `cancelled`
- **THEN** el detalle se renderiza con el banner gris de cancelación y NO aparece ningún botón de acción

#### Scenario: Out of branch
- **WHEN** un `operator` con `x-user-branch-id: B1` abre `/returns/<id>` para una devolución de B2 sin `branches:access_all`
- **THEN** el backend devuelve 403; la página renderiza `EmptyState` con copy "No tienes acceso a esta devolución"

#### Scenario: Return not found
- **WHEN** el `:id` no existe
- **THEN** el backend devuelve 404; la página renderiza `EmptyState` con copy "Devolución no encontrada" y link "Volver a devoluciones"

#### Scenario: Invalid UUID
- **WHEN** el `:id` no es un UUID válido (ej. `not-uuid`)
- **THEN** la página renderiza `EmptyState` "ID inválido" sin hacer fetch

---

### Requirement: `CancelReturnModal` (cancellation flow)
The system SHALL provide a `CancelReturnModal` block (under `app/(private)/returns/_blocks/`) used from `/returns/[id]` to invoke `POST /api/v1/admin/returns/:id/cancel`. The modal SHALL render:

- Header "Cancelar devolución".
- Descriptive copy explaining that cancelling will decrement inventory.
- A generic warning paragraph ("Si las unidades devueltas ya se vendieron, el stock podría quedar negativo. Es válido y se reconcilia manualmente.").
- A `<textarea>` for the optional `reason` (max 500 chars), with character counter.
- Two buttons: "Volver" (cancel close) and "Cancelar devolución" (`bg-error-container`, disabled during submit).

On submit, the modal SHALL call the service `cancelReturn(id, reason)` and SHALL:
- 200 → close the modal, refresh the detail page, and show a toast "Devolución cancelada".
- 409 `ReturnAlreadyCancelledError` → close the modal, refresh the detail, and show a toast "La devolución ya estaba cancelada".
- 403 `ForbiddenError` → close the modal y mostrar toast "No tienes permiso para cancelar esta devolución".
- Otherwise → keep the modal open with an inline error.

#### Scenario: Successful cancellation
- **WHEN** un usuario con `returns:cancel` confirma la cancelación en una devolución `completed`
- **THEN** la modal cierra, el detalle refresca (status `cancelled`, banner con datos de cancelación) y aparece toast "Devolución cancelada"

#### Scenario: Reason persisted
- **WHEN** el usuario escribe "Error de captura" y confirma
- **THEN** el body POST incluye `{ "reason": "Error de captura" }` y el detalle refrescado muestra `cancellationReason: "Error de captura"`

#### Scenario: Reason left blank
- **WHEN** el usuario no escribe motivo y confirma
- **THEN** el body POST se envía con `{}` (o `{ reason: null }`) y la cancelación procede

#### Scenario: Re-cancellation rejected
- **WHEN** el usuario confirma en una devolución que ya fue cancelada en otra pestaña
- **THEN** el backend responde 409 `ReturnAlreadyCancelledError`; la modal cierra, el detalle refresca y aparece toast "La devolución ya estaba cancelada"

#### Scenario: Forbidden
- **WHEN** el usuario perdió el permiso `returns:cancel` entre cargar el detalle y confirmar
- **THEN** el backend responde 403 `ForbiddenError`; la modal cierra y aparece toast "No tienes permiso para cancelar esta devolución"

#### Scenario: Reason exceeds 500 chars
- **WHEN** el usuario escribe 501+ caracteres
- **THEN** el contador se vuelve rojo y el botón "Cancelar devolución" se deshabilita

---

### Requirement: `/sales/[id]/returns/new` route (create return tied to a ticket)
The system SHALL expose a private route `/sales/[id]/returns/new` that renders a form to register a new return against an existing sale. The page SHALL gate behind `returns:create` and SHALL fetch the sale via `GET /api/v1/admin/sales/:id`. If `sale.status !== 'completed'`, the page SHALL render `EmptyState` "Esta venta no acepta devoluciones" + link "Volver al ticket" sin renderizar el formulario.

The form SHALL render:
- **Header**: link "Volver al ticket" → `/sales/[id]`, título "Registrar devolución contra ticket A-1024".
- **Lines table** (reutilizando `SaleItemsTable` con `renderQuantityCell` override): cada fila muestra `productCode`, `productName`, `vendido` (`sale_item.quantity`), `ya devuelto` (de `returnedQuantityBySaleItem[item.id] ?? 0`), `disponible` (`vendido - ya devuelto`), y un `<input type="number">` para `cantidad a devolver` (min 0, max `disponible`, step `0.0001`).
- **Footer**: campo `Motivo` (textarea required, 3–500 chars, contador), `Fecha de devolución` (`<input type="date">`, default hoy, max hoy), `Notas` (textarea opcional, max 1000 chars), CTA "Registrar devolución" (`bg-primary`).

Client-side validation:
- Cada `quantity > 0` debe ser `<= disponible`; sino → error inline en la fila.
- Suma de `quantity > 0` SHALL ser ≥ 1; sino → error en el footer "Selecciona al menos un producto".
- `reason.trim().length` SHALL estar en [3, 500].
- `returnedAt` SHALL ser `<= today` (UTC del cliente).

On submit:
- Filtra líneas con `quantity > 0` y arma el body `{ saleId, reason, returnedAt: ISO, items: [...], notes? }`.
- 201 → navega a `/returns/[id]` con el id retornado.
- 409 `ReturnQuantityExceedsRemainingError` → muestra error inline en la fila del `saleItemId` con copy "Excede disponible actualizado: <remaining>" y refresca `returnedQuantityBySaleItem` desde el sale.
- 409 `SaleNotReturnableError(status)` → toast "El ticket cambió de estado a <status>" + redirige a `/sales/[id]`.
- 400 `SaleItemNotPartOfSaleError` o `EmptyReturnError` → toast con el mensaje.
- 403 → toast "No tienes permiso para registrar devoluciones en esta sucursal" + redirige a `/sales/[id]`.

#### Scenario: Authorized user opens form
- **WHEN** un `operator` con `returns:create` abre `/sales/<id>/returns/new` para una venta `completed` de su sucursal
- **THEN** el formulario se renderiza con la tabla de líneas y los inputs `cantidad a devolver` en 0

#### Scenario: Sale is not completed
- **WHEN** un usuario abre la ruta para una venta `cancelled` o `edited`
- **THEN** la página renderiza `EmptyState` "Esta venta no acepta devoluciones" sin el formulario

#### Scenario: Partial return success
- **WHEN** el usuario ingresa `quantity=2` en una línea con `disponible=5`, escribe motivo "Producto defectuoso", confirma
- **THEN** el body POST incluye `{ saleId, reason: "Producto defectuoso", items: [{ saleItemId, quantity: 2 }], ... }` y tras éxito 201 navega a `/returns/<newId>`

#### Scenario: Quantity exceeds available locally
- **WHEN** el usuario intenta ingresar `quantity=10` en una línea con `disponible=5`
- **THEN** el input clampea o muestra error inline "Excede disponible (5)" y el CTA "Registrar devolución" queda deshabilitado

#### Scenario: All quantities zero
- **WHEN** el usuario no ingresa ninguna cantidad y click "Registrar devolución"
- **THEN** el footer muestra "Selecciona al menos un producto" y el CTA queda deshabilitado

#### Scenario: Reason missing
- **WHEN** el usuario ingresa cantidades pero deja el motivo vacío
- **THEN** el campo motivo muestra "Mínimo 3 caracteres" y el CTA queda deshabilitado

#### Scenario: Backend rejects with exceeds remaining (race)
- **WHEN** entre cargar el sale y submit otro operador creó una devolución para la misma línea
- **THEN** el backend responde 409 `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)`; la fila correspondiente muestra "Excede disponible actualizado: <remaining>", la página refresca el sale para actualizar `disponible` y el usuario corrige

#### Scenario: Sale changed status mid-flow
- **WHEN** el ticket cambió a `cancelled` entre cargar la página y submit
- **THEN** el backend responde 409 `SaleNotReturnableError(status: "cancelled")`; aparece toast "El ticket cambió de estado a cancelado" y se redirige a `/sales/<id>`

#### Scenario: returnedAt in the future
- **WHEN** el usuario intenta seleccionar una fecha posterior a hoy
- **THEN** el `<input type="date">` no permite la selección (atributo `max`) y el cliente no envía la request

---

### Requirement: `SaleReturnsSection` integration in sale detail
The system SHALL extend `SaleDetailPage` (in `app/(private)/sales/_blocks/`) with a `SaleReturnsSection` sub-block that displays the returns linked to a sale and, when applicable, exposes the CTA to create a new return.

The section SHALL fetch via `GET /api/v1/admin/sales/:id/returns` using the service `listSaleReturns(saleId)`. The response body is `{ returns: ReturnDetailDto[] }`; the service unwraps `body.returns`.

The section SHALL render:
- A header "Devoluciones (N)" where N = `returns.length`.
- A CTA "+ Registrar devolución" (`bg-primary`) **visible only when**: `sale.status === 'completed'` AND `can("returns:create") === true` AND at least one `sale.items[i]` satisfies `(item.quantity - (returnedQuantityBySaleItem[item.id] ?? 0)) > 0`. Clicking navigates to `/sales/[saleId]/returns/new`.
- A list of rows, each containing: id corto (últimos 6 chars del UUID), `ReturnStatusBadge`, `returnedAt` formato corto, `refundTotal` en formato MXN, motivo truncado a 60 chars. Click navega a `/returns/[id]`.
- If N = 0 y se cumple el guard del CTA → muestra "Aún no hay devoluciones registradas." debajo del CTA.
- If N = 0 y NO se cumple el guard → la sección entera se oculta (no se renderiza ni el header).
- While loading, render skeleton placeholders.

#### Scenario: Sale with returns
- **WHEN** un usuario carga `/sales/<id>` para un ticket con 3 devoluciones (2 completed, 1 cancelled)
- **THEN** la sección renderiza "Devoluciones (3)" con 3 filas, cada una con su badge y datos

#### Scenario: CTA visible to creator
- **WHEN** un `operator` con `returns:create` abre un ticket `completed` con líneas disponibles
- **THEN** la sección muestra el CTA "+ Registrar devolución" que navega a `/sales/<id>/returns/new`

#### Scenario: CTA hidden when sale not completed
- **WHEN** el ticket está `cancelled` o `edited`
- **THEN** el CTA NO se renderiza, independiente del permiso

#### Scenario: CTA hidden when all lines fully returned
- **WHEN** las líneas del ticket tienen `quantity` igual a `returnedQuantityBySaleItem[id]` para todas (nada disponible)
- **THEN** el CTA NO se renderiza

#### Scenario: Section hidden for viewer on empty sale
- **WHEN** un `viewer` (sin `returns:create`) abre un ticket sin devoluciones
- **THEN** la sección entera se oculta (el viewer no ve ni header ni CTA)

#### Scenario: Viewer sees existing returns
- **WHEN** un `viewer` (sin `returns:create`) abre un ticket con 2 devoluciones existentes
- **THEN** la sección muestra "Devoluciones (2)" con las filas, sin el CTA

#### Scenario: Return row navigates to detail
- **WHEN** el usuario click una fila de la lista
- **THEN** el router navega a `/returns/<id>`

---

### Requirement: `SaleItemsTable` extended with returned quantity sub-note
The system SHALL extend the existing `SaleItemsTable` component in `app/(private)/sales/_blocks/` with two optional props:

```ts
interface SaleItemsTableProps {
  items: SaleItem[];
  returnedQuantityBySaleItem?: Record<string, number>; // default {}
  renderQuantityCell?: (item: SaleItem, returnedQty: number, remaining: number) => ReactNode;
}
```

When `returnedQuantityBySaleItem` is provided and an item has `returnedQty > 0`, the quantity cell SHALL render two lines:
- Line 1: the original `quantity` (existing rendering).
- Line 2: sub-note "Devuelto: <returnedQty>" in `text-label-sm text-on-surface-variant`.

When `renderQuantityCell` is provided, it overrides the entire cell content (used by `CreateReturnPage` to render an editable input). The default cell rendering MUST remain backwards-compatible (no breaking change to existing callers).

#### Scenario: No returns
- **WHEN** `returnedQuantityBySaleItem` is `{}` (or absent)
- **THEN** the table renders exactly as before — sin subnota

#### Scenario: Partial return shown
- **WHEN** una línea tiene `quantity=10` y `returnedQuantityBySaleItem[id]=3`
- **THEN** la celda muestra "10" en la línea principal y "Devuelto: 3" como subnota debajo

#### Scenario: Override cell for create form
- **WHEN** `renderQuantityCell` is provided
- **THEN** la tabla invoca `renderQuantityCell(item, returnedQty, remaining)` y renderiza el JSX devuelto en lugar de la celda default

#### Scenario: Backwards compatible
- **WHEN** un test existente renderiza `<SaleItemsTable items={items} />` sin las props nuevas
- **THEN** el componente renderiza idéntico al estado previo al change

---

### Requirement: Services and typed errors
The system SHALL provide services under `app/(private)/returns/_logic/services/` that wrap `authFetch` and map HTTP errors to typed domain errors. Each service SHALL accept an optional `fetchImpl?: typeof fetch` parameter for tests.

Services and their mappings:
- `listReturns(filters)` → `GET /api/v1/admin/returns?...` returns `ListReturnsResponse`.
- `getReturn(id)` → `GET /api/v1/admin/returns/:id` returns `ReturnDetailDto`; 404 → `ReturnNotFoundError`.
- `listSaleReturns(saleId)` → `GET /api/v1/admin/sales/:id/returns` returns `ReturnDetailDto[]` (unwrapped from `body.returns`); 404 → `SaleNotFoundError`.
- `createReturn(body)` → `POST /api/v1/admin/returns` returns `ReturnDetailDto`; maps:
  - 400 "Sale not found" → `SaleNotFoundError`
  - 400 with `saleItemId` → `SaleItemNotPartOfSaleError(saleItemId)`
  - 400 "Return must include at least one item" → `EmptyReturnError`
  - 409 with `status` → `SaleNotReturnableError(status)`
  - 409 with `saleItemId`, `requested`, `remaining` → `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)`
- `cancelReturn(id, reason)` → `POST /api/v1/admin/returns/:id/cancel` returns `ReturnDetailDto`; maps:
  - 404 → `ReturnNotFoundError`
  - 409 "Return is already cancelled" → `ReturnAlreadyCancelledError`

All services SHALL convert ISO strings to `Date` for `createdAt`, `updatedAt`, `returnedAt`, `cancelledAt` (when not null). `ForbiddenError` from `authFetch` is re-thrown unchanged (the caller maps to feature-specific forbidden errors when needed).

#### Scenario: ListSaleReturns unwraps body.returns
- **WHEN** the backend responde con `{ "returns": [<dto1>, <dto2>] }`
- **THEN** el servicio devuelve `[<dto1>, <dto2>]` (array)

#### Scenario: CreateReturn maps 409 exceeds remaining
- **WHEN** el backend responde 409 `{"error":"Return quantity exceeds remaining","saleItemId":"<id>","requested":7,"remaining":4}`
- **THEN** el servicio lanza `ReturnQuantityExceedsRemainingError(saleItemId, 7, 4)` con esos campos

#### Scenario: CancelReturn maps 409 already cancelled
- **WHEN** el backend responde 409 `{"error":"Return is already cancelled"}`
- **THEN** el servicio lanza `ReturnAlreadyCancelledError`

#### Scenario: Services accept fetchImpl
- **WHEN** un test pasa `fetchImpl: mockFetch` al servicio
- **THEN** el servicio usa `mockFetch` en lugar de `globalThis.fetch`

#### Scenario: ISO strings to Date
- **WHEN** el backend devuelve `returnedAt: "2026-06-02T10:30:00.000Z"`
- **THEN** el DTO retornado por el servicio tiene `returnedAt instanceof Date`

---

### Requirement: Hooks for list, detail, and mutations
The system SHALL provide React hooks under `app/(private)/returns/_logic/hooks/` that mirror the `sales-ui` / `quotes-ui` pattern:

- `useReturnsList(filters)` returns `{ items, total, page, isLoading, error, refresh }`. SHALL debounce search input by 300 ms y SHALL abort previous requests when filters change (`AbortController`).
- `useReturnDetail(id)` returns `{ return, isLoading, error, refresh }`. SHALL cancel the pending request on unmount.
- `useReturnMutations(onChange?)` returns `{ isSaving, create, cancel }`. Cada función llama al servicio correspondiente y, en éxito, dispara `onChange(updatedReturn)`.
- `useSaleReturns(saleId)` returns `{ returns, isLoading, error, refresh }`. Used by `SaleReturnsSection`.
- `useCreateReturnForm(sale)` orchestrates the create-return form state: `{ lines, updateLine, reason, setReason, returnedAt, setReturnedAt, notes, setNotes, validationError, submit, isSubmitting, submissionError }`. The hook SHALL initialize `lines` from `sale.items` con `quantity = 0` por cada línea y SHALL validar `0 <= quantity <= remaining` en cada `updateLine`.

#### Scenario: useReturnsList refreshes on filter change
- **WHEN** el caller actualiza el filtro `status`
- **THEN** el hook aborta el request previo y dispara uno nuevo con los filtros actualizados

#### Scenario: useReturnDetail cancels on unmount
- **WHEN** el componente se desmonta mientras el fetch está en vuelo
- **THEN** el hook llama `controller.abort()` y no actualiza estado tras el desmontaje

#### Scenario: useReturnMutations triggers onChange on success
- **WHEN** `cancel(id, reason)` resuelve con un `ReturnDetailDto` actualizado
- **THEN** el hook invoca `onChange(updatedReturn)` antes de resolver

#### Scenario: useCreateReturnForm validates inline
- **WHEN** el caller invoca `updateLine(saleItemId, quantity=20)` con `remaining=5`
- **THEN** el state interno marca `lines[saleItemId].error = "Excede disponible (5)"` y `validationError = "Hay cantidades inválidas"`

#### Scenario: useCreateReturnForm filters zero quantities
- **WHEN** el formulario tiene 3 líneas con `quantity: 2, 0, 1` y submit
- **THEN** el body POST incluye sólo las líneas con `quantity > 0` (2 items)

---

### Requirement: `ReturnStatusBadge` visual styling
The system SHALL provide a `ReturnStatusBadge` component under `app/(private)/returns/_blocks/` that renders a pill with a colored dot and text following the design system pattern:

```tsx
<span className="inline-flex items-center px-3 py-1 <bg> <fg> rounded-full text-label-sm font-bold">
  <span className="w-1.5 h-1.5 rounded-full <dot-bg> mr-2"></span>
  <text>
</span>
```

Token mapping:

| Status | Bg | Fg | Dot | Text |
|---|---|---|---|---|
| `completed` | `bg-primary-container` | `text-on-primary-container` | `bg-primary` | "Activa" |
| `cancelled` | `bg-surface-container-highest` | `text-on-surface-variant` | `bg-outline-variant` | "Cancelada" |

The component receives `{ status: "completed" | "cancelled" }` and renders the corresponding pill.

#### Scenario: Completed return
- **WHEN** se renderiza `<ReturnStatusBadge status="completed" />`
- **THEN** el badge muestra "Activa" con `bg-primary-container` y un punto `bg-primary`

#### Scenario: Cancelled return
- **WHEN** se renderiza `<ReturnStatusBadge status="cancelled" />`
- **THEN** el badge muestra "Cancelada" con `bg-surface-container-highest` y un punto `bg-outline-variant`
