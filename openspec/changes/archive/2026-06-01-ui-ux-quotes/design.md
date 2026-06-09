## Context

El backend `quotes-api` (`add-quotes-crud`, archivado 2026-06-01) deja el ciclo completo de cotizaciones operable desde HTTP:

- `POST /api/v1/admin/quotes` emite una cotización `draft` snapshoteando precio, IVA, IEPS, descuento por línea — **sin tocar inventario**.
- `PATCH /api/v1/admin/quotes/:id` permite editar **sólo si `status === 'draft'`** (409 en otros estados); puede reemplazar items, notas y `expiresAt`.
- `POST /api/v1/admin/quotes/:id/authorize` transiciona `draft → authorized` (409 si ya autorizada o expirada).
- `DELETE /api/v1/admin/quotes/:id` cancela (no idempotente: segundo intento → 409; cotización ya convertida → 409 con `saleId`).
- `POST /api/v1/admin/quotes/:id/convert` emite la venta usando `paymentMethodId` y `folioId` fiscal del body; idempotente vía `convertedSaleId`; expirada → 409.
- `GET /api/v1/admin/quotes` y `/:id` ya devuelven `isExpired` calculado en lectura, sin cron.
- Branch scoping idéntico al POS: `enforceBranchScope` ya integrado.
- 6 permisos nuevos (`quotes:read|create|write|cancel|authorize|convert`) ya asignados a `admin`/`operator`/`viewer` por seed.

Falta la UI. El panel ya tiene el patrón maduro de `_logic/` por feature (heredado de `inventory-ui` / `pos-ui`), bloques POS reutilizables (`ProductCatalogPanel`, `CartLinesList`, `CartPanel`, `CartTotals`, `CustomerPicker`, `PriceTierPicker`, `CustomerQuickAddModal`), un `computeTotalsClient` puro con banker's rounding, y un sistema visual coherente con el design system "Agro-Systemic Design" de Stitch (proyecto `5227157529282603342`). El diseño visual para las pantallas de cotizaciones se ancla en el screen Stitch *"Facturación y Cotizaciones - Agrisas"* (`03b348783f7b46f0ac6f88aaef19a649`): tabla con `Status Chips` con puntito coloreado, encabezado con KPI cards opcionales, búsqueda en toolbar, columna `Tipo` (chip "Quote" sobre `tertiary-fixed`).

Complejidad nueva respecto a `ui-ux-pos`:

1. **Reutilización del carrito POS para dos targets** (sale vs quote): el modo del carrito vive en estado de `PosPage`, no en URL — al alternar el `SegmentedButton` el resto del flujo es idéntico, sólo cambia el submit handler y el botón final.
2. **Ciclo de vida con cinco estados visibles** (`draft`, `authorized`, `converted`, `cancelled`, `expired`) que dictan qué acciones muestra el detalle. `expired` no es persistido — se calcula en lectura como `(status='authorized' AND expires_at < NOW())` y el backend ya lo expone como `isExpired: boolean`.
3. **Conversión a venta**: la UI debe validar `paymentMethodId` y `folioId` **fiscal** (no el folio de la cotización), navegar al ticket resultante, y manejar idempotencia (si vuelve a hacer click recibe la misma venta).
4. **Cliente quick-add reutilizable**: el `CustomerQuickAddModal` ya existe en `pos`, se reusa tal cual desde `/quotes/new`.

## Goals / Non-Goals

**Goals:**

- Pantalla `/quotes` operable por cualquiera con `quotes:read`: filtros (sucursal sólo bypass, estado, rango fechas, search) + tabla paginada con `StatusBadge` por estado + acción "Ver" → `/quotes/[id]`.
- Pantalla `/quotes/new` operable por `quotes:create`: emisión con catálogo/carrito reutilizados del POS + campo `expiresAt` opcional + notas + selectores de sucursal/folio/cliente. Tras éxito `201` navega a `/quotes/[id]`.
- Pantalla `/quotes/[id]` operable por `quotes:read`: detalle con header (folio, estado, total, `isExpired` banner), items, metadatos, acciones contextuales por estado.
- Pantalla `/quotes/[id]/edit` operable por `quotes:write`: editor sólo en `draft`, reutiliza el carrito; rechaza visualmente si el estado cambió (409) y redirige al detalle.
- Modales `AuthorizeQuoteModal`, `CancelQuoteModal`, `ConvertQuoteModal` con sus contratos respectivos.
- **Rama "Cotizar" en el POS**: `SegmentedButton` "Venta · Cotización" en `PosHeader`; el carrito muta su submit y CTA. Visible sólo si `quotes:create`. Tras emitir, navega a `/quotes/[id]`.
- Diseño fiel al Stitch `03b348783f7b46f0ac6f88aaef19a649`: tabla con chips, `tertiary-fixed` para Quote chip, status badges con puntito coloreado, tipografía Inter, primary verde para acciones positivas (`Autorizar`, `Convertir`), `secondary-container` (rojizo) para el CTA "Crear cotización".

**Non-Goals:**

- Cambios en backend, schema o seed (todo está implementado en `add-quotes-crud`).
- Múltiples revisiones de una cotización (`quote_revisions`): editar sobreescribe, igual que el backend.
- Generación de PDF/impresión de cotización (se difiere a un change futuro `add-quote-pdf-ui`).
- Conversión **parcial** de cotización (sólo algunos items): la conversión es total. Para parcial, el usuario cancela y crea otra.
- Notificación al cliente (email/WhatsApp). Se difiere.
- Aprobación multi-nivel / firmas: una sola autorización, un solo `authorized_by`.
- Cambio de `customerId` / `branchId` en una cotización: ambos son inmutables tras crear. La UI bloquea visualmente esos campos en el editor (los inputs muestran el valor pero `disabled`).
- KPI cards financieras del Stitch (`Paid This Month`, `Pending Approval`, `Overdue`) y gráficos `Monthly Billing Projection`: se omiten porque mezclan facturación con cotizaciones; se difieren a `add-billing-dashboard-ui` cuando exista el módulo de facturación.
- Modo carrito persistente en `sessionStorage` que sobreviva entre `mode=sale` y `mode=quote`: cambiar de modo NO transfiere el carrito (limpia el estado). Documentado en la decisión 6.

## Decisions

### Decisión 1 — Cuatro rutas explícitas + rama POS, no un wizard

Se opta por rutas dedicadas: `/quotes`, `/quotes/new`, `/quotes/[id]`, `/quotes/[id]/edit`. Esto:

- Mantiene paridad de URL con `/sales`, `/pos`, `/products` (mental model conocido).
- Permite deep-links a cotizaciones específicas (utilísimo cuando el vendedor manda un link al WhatsApp del cliente o al admin).
- El editor (`/quotes/[id]/edit`) reutiliza los mismos bloques que `/quotes/new` y `/pos`, parametrizado por modo `quote-create`/`quote-edit`/`pos-sale`/`pos-quote`.

**Alternativa descartada**: wizard de 4 pasos (cliente → items → meta → confirmación). Suma fricción para vendedores acostumbrados al patrón POS y obliga a duplicar bloques.

### Decisión 2 — Modo "Cotizar" en el POS via `SegmentedButton` (no nueva ruta)

El cajero/vendedor opera 95% del tiempo en `/pos`. Forzarle a salir a `/quotes/new` para cotizar (mismos productos, mismo cliente, mismo carrito) es operativamente caro. La regla del cliente es explícita: "el proceso es el mismo solo que manda al flujo de cotizar".

Implementación:

```
PosHeader: <SegmentedButton value={mode} onChange={...} options={[
  { value: "sale", label: "Venta", icon: "point_of_sale" },
  { value: "quote", label: "Cotización", icon: "request_quote" }
]} />
```

- Visible **sólo si** `can("quotes:create") === true`. Si el usuario sólo tiene `sales:create`, el segmented no aparece y `mode = "sale"` siempre.
- Cambiar el modo dispara un `ConfirmDialog` cuando hay líneas en el carrito: "Se vaciará el carrito al cambiar de modo. ¿Continuar?" — aceptar limpia el carrito y conmuta; cancelar mantiene el modo previo.
- En modo `quote`:
  - El selector de "Método de pago" se oculta (no aplica).
  - Aparece un campo opcional `expiresAt` (date-picker, mínimo mañana, máximo +180 días — validación cliente).
  - El CTA "Finalizar venta" se reemplaza por "Crear cotización" con clase `bg-secondary-container text-on-secondary-container` (alineado al Stitch).
  - El submit usa `useQuoteSubmission` → `createQuote(body)` → `POST /api/v1/admin/quotes`.
  - Tras éxito `201`, NO muestra el modal `SaleConfirmedModal`; en su lugar `router.push("/quotes/<id>")`.

**Alternativa descartada**: link "Crear cotización" en el header que navegue a `/quotes/new`. Pierde el carrito en construcción. Romper el flujo del cajero contradice la regla del cliente.

### Decisión 3 — Reutilización agresiva de bloques POS

Los bloques nuevos a crear son los **mínimos**:

- **Quotes-list**: `QuotesListPage`, `QuotesToolbar` (filtros), `QuotesTable`, `QuoteStatusBadge`, `QuoteTypeChip` (en futuro mixto con facturas; v1 sólo "Cotización").
- **Quote-detail**: `QuoteDetailPage`, `QuoteItemsTable`, `QuoteMetaPanel`, `QuoteActionsBar`.
- **Quote-create/edit**: reutilizan **al 100%** `ProductCatalogPanel`, `CartLinesList`, `CartLine`, `CartTotals`, `CustomerPicker`, `CustomerQuickAddModal`, `PriceTierPicker`. Un nuevo `QuoteEmitPanel` (paralelo a `CartPanel` del POS) maneja los selectores de folio/cliente/sucursal y el campo `expiresAt`.
- **Modales**: `AuthorizeQuoteModal`, `CancelQuoteModal`, `ConvertQuoteModal`.

**Patrón de reutilización**: extraer el cuerpo común del `CartPanel` (POS) y `QuoteEmitPanel` (quotes) NO se hará en este change. Se prioriza duplicar las ~80 líneas de orquestación local en `QuoteEmitPanel` para mantener `CartPanel` simple. Si en el futuro el carrito quote diverge mucho, se evalúa una factorización a un `CartShell` compartido.

### Decisión 4 — Servicios y errores tipados por feature

Espejo de `pos-ui` / `sales-ui`. Cada `_logic/services/` recibe `fetchImpl?: typeof fetch` inyectable:

- `quotes/_logic/services/listQuotes.ts` — `GET /quotes?...`
- `quotes/_logic/services/getQuote.ts` — `GET /quotes/:id`
- `quotes/_logic/services/createQuote.ts` — `POST /quotes`
- `quotes/_logic/services/updateQuote.ts` — `PATCH /quotes/:id`
- `quotes/_logic/services/authorizeQuote.ts` — `POST /quotes/:id/authorize`
- `quotes/_logic/services/cancelQuote.ts` — `DELETE /quotes/:id`
- `quotes/_logic/services/convertQuote.ts` — `POST /quotes/:id/convert`

Errores en `quotes/_logic/errors.ts`:

- `QuoteNotFoundError`
- `QuoteNotEditableError(status)` — 409 al editar/autorizar/cancelar/convertir en estado incorrecto
- `QuoteAlreadyCancelledError`
- `QuoteAlreadyConvertedError(saleId)` — 409 al cancelar una cotización ya convertida (deep-link al sale)
- `QuoteExpiredError` — 409 al autorizar/convertir una cotización vencida
- `ProductInactiveError`, `ProductPriceMismatchError`, `BranchInactiveError`, `CustomerInactiveError`, `FolioInactiveError`, `PaymentMethodInactiveError` (heredados del patrón POS; idénticos al lado UI del POS).
- `QuoteScopingForbiddenError`, `QuoteWriteForbiddenError`, `QuoteAuthorizeForbiddenError`, `QuoteConvertForbiddenError`, `QuoteCancelForbiddenError`.

Los servicios convierten ISO strings a `Date` para `createdAt`, `updatedAt`, `authorizedAt`, `cancelledAt`, `convertedAt`, `expiresAt` (todos opcionales/nullables salvo `createdAt`/`updatedAt`).

### Decisión 5 — `useQuoteSubmission` reutiliza el shape de `useSaleSubmission`

Para mantener el patrón coherente: idéntica firma `{ status, sale: Quote | null, error, submit, reset }` pero el `submit` recibe `{ branchId, customerId, folioId, lines, notes?, expiresAt? }` (sin `paymentMethodId`) y devuelve `QuoteDetailDto` en `quote`. El hook vive en `app/(private)/pos/_logic/hooks/useQuoteSubmission.ts` para que el PosPage lo importe junto con `useSaleSubmission` sin cross-feature imports incómodos.

Para `/quotes/new` (que NO está bajo `/pos/`), el hook se importa con ruta relativa o se duplica en `app/(private)/quotes/_logic/hooks/useQuoteSubmission.ts`. **Decisión**: duplicar en `quotes/_logic/hooks/` (15 líneas) para evitar acoplar `quotes` con `pos`. El servicio `createQuote` SÍ se centraliza en `app/(private)/quotes/_logic/services/createQuote.ts` y se importa desde ambos lados.

### Decisión 6 — Cambio de modo en POS limpia el carrito

Conservar el carrito al alternar `sale ↔ quote` es atractivo pero introduce ambigüedad:

- En modo `quote` los selectores `paymentMethodId` quedan vacíos al volver a `sale` (el usuario tendría que rellenarlos).
- El folio se selecciona por modo: un folio "fiscal" para venta, típicamente un folio "COT" para cotización. Mantener el folio cruzado de modo invitaría errores.
- El campo `expiresAt` sólo aplica a quotes y debería borrarse al volver a `sale`, perdiendo dato del usuario.

Para evitar este edge case, **cambiar de modo vacía el carrito**. Se confirma con `ConfirmDialog` si hay líneas. Documentado en la UI con un texto pequeño bajo el segmented "Cambiar de modo limpia el carrito actual".

### Decisión 7 — `expiresAt` como `<input type="date">` con normalización a fin de día

El backend acepta ISO 8601. La UI ofrece un date-picker (precisión día). Al submit, convierte `YYYY-MM-DD` a `YYYY-MM-DDT23:59:59Z` (fin de día UTC) para que el día completo cuente como "no vencido". Mostrar `expiresAt` en el detalle como fecha humana (`"Vence el 15 de junio de 2026"`); si `isExpired === true`, banner ámbar "Cotización vencida — autoriza o crea una nueva".

Validación cliente: `expiresAt >= mañana` (no permitir hoy ni pasado). Max +180 días (límite suave para evitar errores tipográficos como "2050"). Empty = sin expiración.

### Decisión 8 — Detalle: acciones contextuales por estado

`QuoteActionsBar` decide qué botones renderizar según `(status, isExpired, can(...))`:

| Estado | `isExpired` | Botones visibles |
|---|---|---|
| `draft` | `false` | Autorizar (`quotes:authorize`), Editar (`quotes:write`), Cancelar (`quotes:cancel`) |
| `draft` | `true` | Editar (`quotes:write`, **único habilitado** — el usuario puede extender `expiresAt`), Cancelar; Autorizar **deshabilitada** con tooltip "Extiende la fecha de vencimiento primero" |
| `authorized` | `false` | Convertir (`quotes:convert`), Cancelar (`quotes:cancel`); Editar **oculta** (no se permite editar autorizada) |
| `authorized` | `true` | Convertir **deshabilitada** con tooltip "Cotización vencida — cancela y crea otra"; Cancelar (`quotes:cancel`) |
| `converted` | n/a | Ver venta generada (link a `/sales/[convertedSaleId]`); el resto oculto |
| `cancelled` | n/a | Banner con `cancellationReason`; el resto oculto |

Cada botón gateado por su permiso vía `useCurrentUser().can()`. Mientras `can()` está en `"loading"`, los botones se renderizan deshabilitados con spinner pequeño.

### Decisión 9 — `ConvertQuoteModal`: selectores cargan vía hooks compartidos

El modal `ConvertQuoteModal` reutiliza `useFoliosOptions` y `usePaymentMethodsOptions` (ya existentes en `app/(private)/pos/_logic/hooks/`). Para evitar el cross-feature import incómodo entre `quotes` y `pos`, se **eleva** ambos hooks a `app/_hooks/` (refactor menor sin cambio de comportamiento) y los consumidores antiguos del POS se actualizan al nuevo path. Aceptable porque los hooks son framework-agnostic y reutilizables en ≥2 módulos, criterio documentado en CLAUDE.md.

**Alternativa descartada**: duplicar los hooks en `quotes/_logic/`. Suma dos archivos casi idénticos y dos cachés de módulo separadas para los mismos endpoints.

### Decisión 10 — Lista `/quotes`: reutiliza `CatalogShell` + filtros server-side

Mismo patrón que `/sales`: `CatalogShell`, `CatalogToolbar` con `SearchInput` debounced 300 ms (mín 2 chars; render badge "Búsqueda en servidor · 2+ caracteres" via `searchScope="server"`), filtros adicionales como `<select>` de estado y rango `<input type="date">` (from/to). Paginación con `CatalogPagination`.

Tabla con columnas:

| Col | Contenido |
|---|---|
| Folio | `folioCode-folioNumber` mono |
| Cliente | avatar circular (iniciales) + `customerName` + `customerRfc` small (estilo Stitch) |
| Vendedor | `creatorName` |
| Sucursal | `branchName` (oculto cuando el usuario NO tiene `branches:access_all`, ya que sólo ve la suya) |
| Total | `total` (tabular-nums, alineado derecha, formato MX) |
| Vence | `expiresAt` corto (`"15 Jun"`); vacío si null; con icono ámbar si `isExpired` |
| Estado | `QuoteStatusBadge` (punto coloreado + texto) |
| Fecha | `createdAt` corto |
| — | Botón "Ver" → `/quotes/[id]` |

Filtros visibles:

- **Estado** `<select>`: "Todas / Borrador / Autorizada / Convertida / Cancelada / Vencida". `Vencida` envía `?status=expired` (el backend matchea `status='expired'` OR `(status='authorized' AND expires_at < NOW())`).
- **Sucursal** `<select>`: oculto sin `branches:access_all`; default vacío (= todas).
- **Desde** / **Hasta** `<input type="date">` mapeados a `?from=` / `?to=` (ISO).
- **Búsqueda** `<input>` debounced.

### Decisión 11 — `QuoteStatusBadge`: punto coloreado + texto (estilo Stitch)

Sigue exactamente el patrón del Stitch `Paid` / `Pending` / `Draft`:

```tsx
<span className="inline-flex items-center px-3 py-1 <bg> <fg> rounded-full text-label-sm font-bold">
  <span className="w-1.5 h-1.5 rounded-full <dot-bg> mr-2"></span>
  <texto>
</span>
```

Tabla de tokens:

| Estado | Bg | Fg | Dot | Texto |
|---|---|---|---|---|
| `draft` | `bg-surface-container-high` | `text-on-surface-variant` | `bg-outline` | "Borrador" |
| `authorized` | `bg-secondary-container` | `text-on-secondary-container` | `bg-secondary` | "Autorizada" |
| `expired` (override visual cuando `isExpired`) | `bg-error-container` | `text-on-error-container` | `bg-error` | "Vencida" |
| `converted` | `bg-primary-fixed-dim/20` | `text-on-primary-fixed-variant` | `bg-primary` | "Convertida" |
| `cancelled` | `bg-surface-container-highest` | `text-on-surface-variant` | `bg-outline-variant` | "Cancelada" |

`QuoteStatusBadge` recibe `{ status, isExpired }`. Si `status === 'authorized' && isExpired === true`, renderiza `Vencida` (no `Autorizada`).

### Decisión 12 — Editor `/quotes/[id]/edit` redirige al detalle si el estado cambió

Si entre la carga de la página y el submit otro usuario autorizó/canceló la cotización, el `PATCH` devuelve 409 `{"error": "Quote cannot be edited in current status", "status": "<actual>"}`. El servicio mapea a `QuoteNotEditableError(status)`. El editor:

1. Muestra un toast "Otro usuario cambió el estado a `<status>`. Redirigiendo al detalle…".
2. Tras 2 segundos navega a `/quotes/[id]` (refresca el detalle, muestra las acciones del nuevo estado).

Defensa en profundidad: aun con el guard cliente (`status === 'draft'`), el backend valida.

### Decisión 13 — Cancelar cotización convertida: deep-link al ticket

El backend devuelve 409 con `saleId` cuando el usuario intenta cancelar una cotización ya convertida. El servicio `cancelQuote` mapea el body a `QuoteAlreadyConvertedError(saleId)`. El modal `CancelQuoteModal` captura el error y muestra:

```
"Esta cotización ya se convirtió en una venta. Para anularla, cancela el ticket #<folio-de-la-venta>."
[Botón secundario: Ir a la venta] → router.push(`/sales/${saleId}`)
```

### Decisión 14 — Idempotencia de conversión en cliente

`POST /quotes/:id/convert` es idempotente backend: la segunda llamada devuelve el mismo `SaleDetailDto`. La UI defiende con dos capas:

1. **Botón deshabilitado** mientras `useQuoteMutations.isConverting === true`.
2. Tras éxito, **deshabilita permanente** (no permite re-convertir) y muestra "Ver venta generada → /sales/<id>".

Si el usuario refresca durante un convert en vuelo y vuelve a hacer click, el backend devuelve la misma venta — la UI navega igual.

### Decisión 15 — `useQuotesList`, `useQuoteDetail`, `useQuoteMutations`

Espejo del patrón sales-ui:

- `useQuotesList(filters)`: maneja paginación, debounced search, cancelación en cambio de filtros (AbortController), devuelve `{ items, total, page, isLoading, error, refresh }`.
- `useQuoteDetail(id)`: carga un quote por id, expone `{ quote, isLoading, error, refresh }`; cancela al desmontar.
- `useQuoteMutations(onChange?)`: expone `{ isSaving, authorize, cancel, convert, update }`. Cada función llama al servicio correspondiente y, en éxito, dispara `onChange(updatedQuote | newSale)` para que el caller refresque.

### Decisión 16 — Iconos nuevos

Añadir a `app/_components/atoms/Icon/icons.ts`:

- `request_quote` — para el rail item Cotizaciones y el segmented "Cotización".
- `task_alt` — para el botón "Autorizar".
- `swap_horiz` — para el botón "Convertir a venta".
- `update` — para el banner "Cotización vencida".

Los demás (`receipt_long`, `point_of_sale`, `person_add`, `local_offer`, `warning`, `arrow_back`, `cancel`, `edit`) ya existen.

### Decisión 17 — NavigationRail: insertar `quotes` entre `sales` e `inventory`

```ts
{ key: "quotes", href: "/quotes", icon: "request_quote", label: "Cotizaciones", requires: "quotes:read" }
```

Posición elegida porque agrupa transaccionales por proximidad: `pos → sales → quotes → inventory`. El viewer (que tiene `sales:read` y `quotes:read` pero no `sales:create`/`quotes:create`) ve los cuatro items pero `pos` queda gateado por `sales:create` (ya implementado) — así el viewer ve sólo `sales` y `quotes`.

### Decisión 18 — Tokens visuales: alineación con Stitch sin migración global

Tailwind ya está configurado con los tokens "Agro-Systemic Design". Los componentes nuevos usan utilitarias existentes (`bg-secondary-container`, `text-on-secondary-container`, `bg-tertiary-fixed`, etc.). El Stitch `03b348783f7b46f0ac6f88aaef19a649` introduce un patrón de avatar con iniciales que **se reutiliza** del `Avatar` atom existente (o se compone inline con `bg-tertiary-fixed text-on-tertiary-fixed rounded-full` si el atom no soporta iniciales). Sin migración de tokens en este change.

### Decisión 19 — Sin guard de matriz para cotizaciones

A diferencia de la edición de ventas (`sales:edit_completed` + matriz), las cotizaciones NO tienen restricción de sucursal matriz. Toda operación se rige sólo por permisos + branch scoping. El `useHeadquarters` no se consulta desde `quotes-ui`. Esto simplifica el flujo: un operador en cualquier sucursal puede autorizar/convertir/cancelar cotizaciones de su sucursal sin pasar por HQ.

## Risks / Trade-offs

- **[Carrito vaciado al cambiar modo en POS]** — Si el usuario arma 10 líneas en modo Venta y por error toca "Cotización", el `ConfirmDialog` lo previene. Pero si confirma por accidente, pierde el carrito. Mitigación: el diálogo es explícito ("Se eliminarán todas las líneas") y el botón "Continuar" es secundario (no primary).
- **[Cotización vencida con stock vendido en otra venta]** — Una cotización autorizada que vence antes de convertirse puede dejar al cliente sin precio acordado. La UI muestra el banner "Vencida" en lista y detalle; el backend rechaza autorizar/convertir vencidas. No hay automatización: si el cliente exige el precio cotizado, el operador debe crear otra cotización (con autorización del admin para honrar el precio).
- **[Conversión que decrementa stock a negativo]** — Idéntico al riesgo del POS: el backend permite stock negativo en ventas, así que convertir una cotización con qty > stock disponible deja el inventario negativo. La UI no lo bloquea; se documenta como comportamiento esperado y la cancelación del sale lo restaura.
- **[Idempotencia visible al usuario]** — Si dos vendedores hacen click "Convertir" cuasi-simultáneamente, ambos navegan al mismo `/sales/[id]`. Aceptable: no hay doble decremento, doble folio, ni doble sale. Lo verifica el test del backend (archivado).
- **[`isExpired` calculado en lectura]** — Una cotización cuyo `expiresAt` cruza el umbral mientras el detalle está abierto **no se actualiza solo**. El usuario tendría que refrescar para ver el banner. Mitigación: se documenta; un refresh manual lo resuelve.
- **[Reutilización del carrito POS expone clases con `mode`]** — `PosPage`/`CartPanel` pasan a tener prop `mode: "sale" | "quote"`. Eso obliga a tests existentes del POS a pasar `mode="sale"` explícitamente. Mitigación: prop con default `"sale"` para retro-compatibilidad.
- **[Cambio de hooks `useFoliosOptions` / `usePaymentMethodsOptions` a `app/_hooks/`]** — El PosPage existente debe actualizar imports. No es ruptura semántica, pero requiere tocar archivos del POS. Riesgo bajo (cambio de path) y los tests existentes detectan errores de import.
- **[Filtro Vencida en lista]** — `?status=expired` en backend matchea **también** las que tienen status `authorized` y `expires_at < NOW()`. El usuario que filtra por "Vencida" verá cotizaciones con `status='authorized'` en la base — la UI muestra el badge "Vencida" (no "Autorizada") gracias a la decisión 11. Coherente.

## Migration Plan

No aplica migración de datos ni de schema. Despliegue puramente de frontend:

1. Mover `useFoliosOptions` y `usePaymentMethodsOptions` de `app/(private)/pos/_logic/hooks/` a `app/_hooks/`; actualizar imports en POS.
2. Crear iconos nuevos en `Icon/icons.ts` (`request_quote`, `task_alt`, `swap_horiz`, `update`).
3. Crear `_logic/` y bloques de `quotes-ui` (lista, detalle, create/edit, modales).
4. Crear `useQuoteSubmission` (duplicado mínimo del de sale) en `app/(private)/quotes/_logic/hooks/` y en `app/(private)/pos/_logic/hooks/`.
5. Modificar `PosPage`/`PosHeader`/`CartPanel` para soportar `mode: "sale" | "quote"`.
6. Actualizar NavigationRail (`items.ts`) con el item `quotes`.
7. Tests unitarios bajo `tests/unit/ui/quotes/` y `tests/unit/ui/pos/` (cobertura de la rama quote).
8. Verificación manual end-to-end en navegador:
   - `admin`: crea cotización en cualquier sucursal, edita en draft, autoriza, convierte → confirma sale creada con `quoteId`, stock decrementado, folio fiscal incrementado.
   - `operator` en su sucursal: cotiza desde `/pos` (modo quote), autoriza, convierte; verifica que la venta resultante respeta scoping.
   - `viewer`: ve `/quotes` con datos de su sucursal; entra al detalle; NO ve botones de escritura.
   - Cancela en `draft`, cancela en `authorized`, intenta cancelar dos veces (toast 409), intenta convertir vencida (toast 409), refresca cotización tras convertir (botón deshabilitado, link a sale).

Rollback: revertir el commit de frontend; el backend no se ve afectado.

## Open Questions

- ¿La lista debería ofrecer un filtro adicional "Sólo mis cotizaciones" (por `creatorId === currentUserId`)? V1 NO — el filtro de sucursal ya acota. Si la sucursal tiene varios vendedores y se vuelve ruidoso, se evalúa.
- ¿El detalle debería mostrar el `creatorId` como link al perfil del vendedor (cuando exista `/users/[id]`)? V1 lo muestra como texto (`creatorName`).
- ¿Conversión debería pre-seleccionar el folio fiscal default (primer folio activo cuyo `code !== 'COT'`)? V1 lista todos los folios activos sin pre-seleccionar; el operador elige. Evaluable tras feedback.
- ¿El editor de cotización debería ofrecer "Guardar borrador" además de "Guardar cambios"? V1 sólo guarda; el estado `draft` ya implica que es borrador. Botón único.
- ¿Cuándo aparece el modal `ConvertQuoteModal`, debería precargar el `notes` con el de la cotización? V1 el campo aparece vacío y un placeholder "Vacío = mantener notas de la cotización"; el operador escribe sólo si quiere sobrescribir.
- ¿`expiresAt` debería tener presets ("+7 días", "+15 días", "+30 días")? V1 sólo input de fecha; los presets se difieren si los usuarios lo piden.
