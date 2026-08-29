# Spec: pos-ui

## Purpose

Capa de UI del punto de venta (`app/(private)/pos/`) para agregar productos al carrito. Este capability documenta el diálogo de selección de precio/dosificación (`PriceTierPicker`) invocado al hacer click/Enter sobre un producto del catálogo — el resto de la UI del POS (carrito, totales, atajos de teclado) se documenta en otros capabilities (`keyboard-navigation`, etc.) y se irá agregando aquí incrementalmente.

---
## Requirements
### Requirement: Price/dosification selection dialog

Al agregar un producto al carrito, `PriceTierPicker` SHALL listar, en un único diálogo, tanto los precios de catálogo del producto como sus dosificaciones activas (`GET /api/v1/admin/products/:id/dosifications`, ya existente — requiere `products:read`, permiso que el cajero ya posee). Los precios de catálogo SHALL obtenerse con `GET /api/v1/admin/products/:id/prices?branchId=<id>`, usando el `branchId` de la sucursal activa de la pantalla que invoca el diálogo — de forma que la lista muestre los precios efectivos de esa sucursal (su override propio, si existe, más los precios base heredados cuyo nombre no tiene override) en vez de siempre los precios base globales. Cuando la pantalla aún no tiene una sucursal seleccionada (p. ej. un admin en modo bypass antes de elegir), la petición SHALL omitir `branchId` y listar únicamente los precios base, igual que el comportamiento previo a este requirement. Cada dosificación SHALL mostrarse con su `name` y `computedUnitPrice` formateado como moneda, igual que un precio de catálogo. Una dosificación con `requiresDefaultPrice: true` (el producto no tiene precio default) SHALL renderizarse deshabilitada, sin permitir su selección, con un texto indicando la causa ("Requiere precio default"). Al confirmar una dosificación seleccionada, el diálogo SHALL invocar `onConfirm` con `dosificationId` en vez de `productPriceId` (mutuamente excluyentes, igual que en el body de creación de venta). Un producto sin dosificaciones activas SHALL mostrar el diálogo idéntico al comportamiento actual (solo precios), sin regresión visual ni de flujo.

Este diálogo se reutiliza en el flujo de edición de venta completada (`app/(private)/sales/_blocks/EditSalePage.tsx`, ver `pos-api` "Edit completed sale") y en el flujo de cotizaciones (`app/(private)/quotes/_blocks/QuoteCreatePage.tsx` y `QuoteEditPage.tsx`, ver `quotes-ui`). En creación (POS normal, cotización nueva) el `branchId` usado SHALL ser el de la sucursal seleccionada por el operador para esa venta/cotización. En edición (venta completada, cotización en borrador) el `branchId` usado SHALL ser el de la venta/cotización ya persistida (`sale.branchId` / `quote.branchId`, inmutables) — NUNCA el `branchId` de la sesión del usuario logueado, que puede diferir de la sucursal real de ese recurso. Al agregar un producto al carrito durante una edición, el diálogo SHALL igualmente listar dosificaciones activas junto a los precios, permitiendo reemplazar cualquier línea existente por una línea de dosificación o viceversa.

#### Scenario: Producto con precios y dosificaciones
- **WHEN** el cajero agrega al carrito un producto que tiene tanto precios de catálogo como dosificaciones activas
- **THEN** el diálogo muestra ambas listas; seleccionar una dosificación y confirmar agrega una línea al carrito con `dosificationId` establecido

#### Scenario: Dosificación sin precio default deshabilitada
- **WHEN** el producto tiene una dosificación cuyo `requiresDefaultPrice` es `true`
- **THEN** esa dosificación aparece en la lista mostrada pero no es seleccionable, con un mensaje indicando que requiere precio default

#### Scenario: Producto sin dosificaciones — sin regresión
- **WHEN** el producto no tiene dosificaciones activas
- **THEN** el diálogo se comporta exactamente como antes de este cambio (solo lista de precios de catálogo)

#### Scenario: Cantidad de partes vendidas
- **WHEN** el cajero selecciona una dosificación e ingresa una cantidad de partes en el campo "Cantidad" (mismo input que ya usa el diálogo para precios de catálogo, con el fix de UX de `fix-pos-cantidad-input` ya aplicado)
- **THEN** el total mostrado en el diálogo es `cantidad * computedUnitPrice`, consistente con cómo se calcula para precios de catálogo

#### Scenario: Disponible también en edición de venta completada
- **WHEN** un usuario con `sales:edit_completed` (y guard de HQ satisfecho) agrega un producto al carrito desde `/sales/:id/edit`
- **THEN** el diálogo muestra las mismas secciones de precios y dosificaciones que en el POS normal, permitiendo construir una línea de dosificación como parte de la nueva versión de la venta

#### Scenario: Precio de sucursal activa en POS/cotización nueva
- **WHEN** el operador tiene seleccionada la sucursal `B` y agrega al carrito un producto cuyo `ProductPrice` tiene un override para `B` distinto del precio base
- **THEN** la petición dispatchada es `GET .../prices?branchId=B` y el diálogo muestra el precio override de `B`, no el precio base

#### Scenario: Producto sin precio base se lista igual gracias al branchId
- **WHEN** el producto sólo tiene un `ProductPrice` con `branchId: B` (sin ningún precio con `branchId: null`) y el operador tiene seleccionada la sucursal `B`
- **THEN** el diálogo lista ese precio normalmente, en vez de mostrar "Este producto no tiene precios configurados"

#### Scenario: Edición usa el branchId de la venta, no el de la sesión
- **WHEN** un usuario con `branchId` de sesión distinto al de la venta abre `/sales/:id/edit` de una venta cuyo `branchId` es `B`, y agrega un producto al carrito
- **THEN** la petición dispatchada usa `branchId=B` (el de la venta), no el `branchId` de la sesión del usuario

#### Scenario: Cambiar de tier en una línea existente también usa el branchId correcto
- **WHEN** el usuario cambia de tier de precio en una línea ya agregada al carrito (no una línea nueva), tanto en POS/cotización nueva como en edición de venta/cotización
- **THEN** la petición de precios para esa línea usa el mismo `branchId` de contexto que se usaría al agregar un producto nuevo en esa misma pantalla

#### Scenario: Sin sucursal seleccionada, se listan sólo precios base
- **WHEN** un admin en modo bypass agrega un producto al carrito antes de haber seleccionado una sucursal de trabajo
- **THEN** la petición dispatchada es `GET .../prices` sin `branchId`, y el diálogo lista únicamente los precios base (`branchId: null`), igual que el comportamiento previo a este requirement

### Requirement: "Editar venta" button hidden from sale detail UI
`app/(private)/sales/_blocks/SaleDetailPage.tsx` SHALL NOT render the "Editar venta" link/button in the sale detail header, regardless of the existing `canEdit` guard (`sales:edit_completed` permission + headquarters check) evaluating `true`. This is a UI-only restriction implemented via a module-level feature flag (e.g. `SALE_EDIT_UI_ENABLED = false`) that gates the JSX block in addition to the pre-existing `canEdit` check — the guard computation itself (`canEditCompleted`, `isBypass`, `isInHq`, `canEdit`) SHALL remain unchanged and unused for rendering while the flag is `false`. The route `/sales/:id/edit`, its page component (`EditSalePage`), the mutation service, and the backend `PATCH /api/v1/admin/sales/:id` endpoint (requiring `sales:edit_completed`, see `pos-api` "Edit completed sale (headquarters only)") are NOT modified by this requirement and remain fully functional when accessed directly.

#### Scenario: Edit button not shown even when guard passes
- **WHEN** a user with `sales:edit_completed` and headquarters access (or `branches:access_all`) opens the detail of a `completed` sale
- **THEN** the "Editar venta" button/link is NOT rendered anywhere in the page

#### Scenario: Direct navigation to edit route still works
- **WHEN** the same user navigates directly to `/sales/:id/edit` by URL
- **THEN** the edit page loads and functions normally (the underlying feature is not disabled, only its UI entry point)

### Requirement: Product catalog table shows branch stock
`app/(private)/pos/_blocks/ProductCatalogTable.tsx` SHALL render an additional "Existencias" column showing each product's stock (`ProductDto.stock`, sourced from `GET /api/v1/admin/products?branchId=<selected>`, see `products-api` "List products"). The column SHALL render the numeric value when `stock` is a number, and an em dash (`—`) when `stock` is `null` (no branch selected, or no inventory record for that product/branch pair). When `stock` is a number `<= 0`, the cell SHALL be visually highlighted (e.g. error color) to warn the cashier before adding the product to the cart.

#### Scenario: Product with positive stock
- **WHEN** the selected branch has `branch_inventory.quantity = 12` for a listed product
- **THEN** the "Existencias" column shows `12` in default styling

#### Scenario: Product with zero or negative stock highlighted
- **WHEN** the selected branch has `branch_inventory.quantity <= 0` for a listed product
- **THEN** the "Existencias" column shows the value highlighted in an error/warning style

#### Scenario: No branch selected (admin bypass)
- **WHEN** an admin has not selected a branch (bypass mode) and the catalog loads without a `branchId`
- **THEN** every row's "Existencias" column shows `—` and the catalog still loads and functions normally

#### Scenario: Product without inventory record for the branch
- **WHEN** a branch is selected but the product has no `branch_inventory` row for that branch
- **THEN** the "Existencias" column shows `—`

### Requirement: Credit limit exceeded warning toast
When the POS completes a credit sale (or a quote conversion to a credit sale) whose response includes `creditLimitExceeded: true` (see `pos-api` "Create sale (atomic emission)" and `quotes-api` "Convert quote to sale"), the UI SHALL display an additional toast/notification informing the cashier that the customer's credit limit was exceeded, alongside the normal success toast. The sale/conversion SHALL complete normally regardless of this flag — the toast is purely informational and does NOT block or roll back the transaction. When `creditLimitExceeded` is `false` (including all cash sales and credit sales within limit or without a configured credit line), no additional toast is shown.

#### Scenario: Credit sale exceeding limit shows warning toast
- **WHEN** the cashier completes a credit sale and the backend responds HTTP 201 with `creditLimitExceeded: true`
- **THEN** the sale completes (success toast/redirect as usual) AND an additional toast is shown warning that the customer's credit limit was exceeded

#### Scenario: Credit sale within limit shows no warning
- **WHEN** the cashier completes a credit sale and the backend responds with `creditLimitExceeded: false`
- **THEN** only the normal success feedback is shown, with no credit warning toast

#### Scenario: Customer without credit line shows no warning
- **WHEN** the cashier completes a credit sale for a customer with no `creditLimit` configured and the backend responds with `creditLimitExceeded: false`
- **THEN** the sale completes normally with no credit warning toast

#### Scenario: Quote conversion to credit sale exceeding limit shows warning toast
- **WHEN** a quote is converted to a credit sale and the backend responds HTTP 200 with `creditLimitExceeded: true`
- **THEN** the conversion completes (redirect to the resulting sale as usual) AND the same credit warning toast is shown

### Requirement: Cart totals always show IVA and IEPS lines
`CartTotals` (used by the POS cart, sale detail, quote detail, return detail, and quote emit panel) SHALL always render a "IVA" line and an "IEPS" line, regardless of whether their computed value is greater than zero. Previously these lines were hidden when the value equaled `0`.

#### Scenario: Cart with no taxable products
- **WHEN** every line in the cart has `isTaxable=false` (or `ivaRate=iepsRate=0`)
- **THEN** `CartTotals` still renders "IVA: $0.00" and "IEPS: $0.00"

#### Scenario: Cart with IVA only, no IEPS
- **WHEN** all cart lines have `ivaRate > 0` and `iepsRate = 0`
- **THEN** `CartTotals` renders both "IVA: $X.XX" and "IEPS: $0.00" — the IEPS line is not hidden

### Requirement: Consistencia del recargo de dosificación entre pantallas del carrito

Toda pantalla que instancie `useCart` (POS `/pos`, cotizaciones `/quotes/new` y `/quotes/[id]/edit`, edición de venta `/sales/[id]/edit`) SHALL obtener el `dosificationSurchargePct` vigente vía `usePricingSettingsOptions()` y pasarlo como argumento a `useCart(dosificationSurchargePct)`, de modo que el total calculado en cliente para líneas con cantidad fraccionaria o dosificación coincida con el que el backend persiste al guardar. Ninguna pantalla SHALL invocar `useCart()` sin argumentos (lo que produce un recargo de `0`, desalineado del cálculo real).

Adicionalmente, ninguna pantalla que reconstruya el carrito a partir de items ya persistidos (snapshots) SHALL alimentar `useCart`/`addLine` con un precio que YA incluye el recargo aplicado. `computeTotalsClient` aplica el recargo de dosificación una sola vez por línea fraccionaria a partir del precio que recibe como "precio base" — si ese precio ya viene recargado (como el `unitPrice` snapshot de un `SaleItem`/`QuoteItem` persistido), el total mostrado queda recargado dos veces. La reconstrucción del carrito desde un snapshot SHALL producir, para cada línea fraccionaria, el mismo total que ya está persistido para esa línea (sin que el operador haya modificado nada).

#### Scenario: Cotización nueva con línea fraccionaria refleja el recargo vigente
- **WHEN** un operador con `quotes:create` agrega en `/quotes/new` una línea con cantidad fraccionaria
- **THEN** el total de línea y el total del carrito mostrados incluyen el `dosificationSurchargePct` vigente (no `0`), y coinciden con el total que persiste `POST /api/v1/admin/quotes`

#### Scenario: Edición de cotización con línea fraccionaria refleja el recargo vigente (sin duplicarlo)
- **WHEN** un operador con `quotes:write` abre en `/quotes/[id]/edit` una cotización en estado `draft` que ya tiene una línea con cantidad fraccionaria y un `dosificationSurchargePct` vigente distinto de `0`
- **THEN** el total mostrado al cargar coincide exactamente con el `total` ya persistido de esa cotización (recargo aplicado una sola vez, no dos), y si el operador guarda sin modificar nada, el total que persiste `PATCH /api/v1/admin/quotes/:id` es idéntico al que ya se mostraba antes de guardar

#### Scenario: Edición de venta completada con línea fraccionaria refleja el recargo vigente
- **WHEN** un operador con `sales:edit_completed` (y guard de HQ) edita en `/sales/[id]/edit` una venta y agrega o modifica una línea con cantidad fraccionaria
- **THEN** el total mostrado incluye el `dosificationSurchargePct` vigente y coincide con el total que persiste `EditCompletedSaleUseCase`

#### Scenario: Línea con cantidad entera y sin dosificación — sin regresión
- **WHEN** una línea del carrito tiene cantidad entera y no referencia una dosificación, en cualquiera de las 4 pantallas
- **THEN** el recargo de dosificación no se aplica a esa línea, igual que antes del cambio

### Requirement: Creación de venta offline respeta el modo offline habilitado
El flujo de creación de venta en el POS SHALL consultar el estado `offlineEnabled` del contexto de sincronización offline antes de encolar una venta cuando se detecta `NetworkError` o `!isOnline()`. Si `offlineEnabled` es `false`, el sistema SHALL impedir el encolado y mostrar un mensaje explícito indicando que debe fijarse una sucursal de trabajo offline antes de vender sin conexión, en vez de encolar la venta bajo un `ownerBranchId` que no coincide con el contexto offline.

#### Scenario: Venta offline bloqueada para usuario bypass sin sucursal de trabajo fijada
- **WHEN** un usuario con `branches:access_all` que nunca llamó `fixWorkingBranch` intenta finalizar una venta mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema no encola la venta, deshabilita o intercepta el submit, y muestra un mensaje explícito de "fija tu sucursal de trabajo antes de vender offline"

#### Scenario: Venta offline permitida con sucursal de trabajo ya fijada
- **WHEN** un usuario con `branches:access_all` que ya fijó una sucursal de trabajo (o un cajero regular con `branchId` de sesión) intenta finalizar una venta mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema encola la venta normalmente, sin regresión sobre el comportamiento offline existente

#### Scenario: Venta offline bloqueada aunque el formulario tenga otra sucursal seleccionada
- **WHEN** un usuario con `branches:access_all` fijó la sucursal de trabajo A, pero mientras aún online seleccionó la sucursal B en el formulario del POS sin volver a fijarla, y luego intenta finalizar venta mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema bloquea el encolado igual que en el caso sin sucursal fijada — la sucursal de trabajo offline fijada es la única autoridad de scope, no la sucursal seleccionada en el formulario

### Requirement: Registro offline usa el ownerBranchId del contexto de sincronización
El encolado de una venta offline SHALL usar el `ownerBranchId` resuelto por el contexto de sincronización offline como clave de scope del registro persistido, en vez de la sucursal seleccionada en el formulario de venta.

#### Scenario: Ítem encolado siempre visible en el panel de sincronización
- **WHEN** una venta se encola offline con `offlineEnabled=true`
- **THEN** el registro persistido usa el `ownerBranchId` del contexto offline, de forma que aparece siempre en el panel de cola de sincronización y se cuenta en el badge de pendientes, sin excepción

### Requirement: Error al cambiar de sucursal de trabajo offline es visible al usuario
Cuando el sistema rechaza un cambio de sucursal de trabajo offline por existir ventas o cotizaciones sin sincronizar, el error SHALL mostrarse al usuario de forma visible, no como una falla silenciosa.

#### Scenario: Mensaje de error visible tras intento de cambio rechazado
- **WHEN** un usuario con `branches:access_all` intenta fijar una nueva sucursal de trabajo mientras existen ítems `pending`/`failed` sin sincronizar de la sucursal de trabajo anterior
- **THEN** el sistema muestra el mensaje de error ("No se puede cambiar de sucursal de trabajo: hay ventas o cotizaciones sin sincronizar.") de forma visible en la interfaz, y la sucursal de trabajo fijada no cambia

#### Scenario: Sin mensaje de error residual tras un cambio exitoso
- **WHEN** un usuario con `branches:access_all` fija una nueva sucursal de trabajo sin tener ítems pendientes sin sincronizar
- **THEN** el cambio se aplica sin mostrar ningún mensaje de error

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

