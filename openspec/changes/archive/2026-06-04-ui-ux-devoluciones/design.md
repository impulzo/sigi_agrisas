## Context

El backend `returns-api` (`apis-devoluciones`, archivado 2026-06-02) deja el ciclo completo de devoluciones operable desde HTTP:

- `GET /api/v1/admin/returns` lista paginada con filtros (`branchId`, `customerId`, `saleId`, `status` comma-separated, `from`/`to`, `search` min 2 chars).
- `GET /api/v1/admin/returns/:id` devuelve `ReturnDetailDto` con `items[]` snapshotados.
- `GET /api/v1/admin/sales/:id/returns` devuelve `{ returns: ReturnDetailDto[] }` con TODAS las devoluciones (completed + cancelled) de un ticket — sin paginar (cardinalidad acotada).
- `POST /api/v1/admin/returns` crea devolución atómicamente: snapshotea desde `sale_items`, calcula totales, incrementa `branch_inventory` por cada línea, persiste `returns` + `return_items` con `status='completed'`. Body: `{ saleId, reason, returnedAt, items: [{ saleItemId, quantity }], notes? }`. NO acepta `branchId`/`customerId` (heredados del ticket).
- `POST /api/v1/admin/returns/:id/cancel` decrementa inventario (permite negativo) y marca `status='cancelled'`. NO idempotente (segundo cancel → 409 `ReturnAlreadyCancelledError`).
- Branch scoping idéntico al POS via `enforceBranchScope`.
- 3 permisos (`returns:read|create|cancel`) asignados a `admin`/`operator`/`viewer` por seed (`viewer` sólo `read`).
- `SaleDetailDto.returnedQuantityBySaleItem: Record<string, number>` ya expone "cantidad ya devuelta por línea" (sólo cuenta devoluciones `completed`).

Falta la UI. El panel ya tiene el patrón maduro de `_logic/` por feature (heredado de `inventory-ui` / `pos-ui` / `quotes-ui`), bloques compartidos (`CatalogShell`, `CatalogToolbar`, `CatalogPagination`, `EmptyState`, `ConfirmDialog`, `Combobox`, `SearchInput`, `FormField`), `useCurrentUser().can()` con caché de permisos, `authFetch` con errores tipados (`UnauthenticatedError`, `ForbiddenError`, `NetworkError`), y `SaleItemsTable` ya existente en `sales/_blocks/`. El sistema visual sigue el design system "Agro-Systemic Design" (proyecto Stitch `5227157529282603342`).

Diferencias clave respecto a `ui-ux-quotes`:

1. **La creación nace del detalle de venta**, no de `/returns/new`. La regla del cliente "enlazado a un ticket obligatorio" sugiere que el flujo natural es "abro el ticket, marco qué devolver". Un wizard independiente obligaría a buscar la venta primero.
2. **Sólo dos estados** (`completed`, `cancelled`), sin `draft`/`authorized`/`converted` ni `isExpired`. La lógica de `ReturnActionsBar` se reduce a un único botón "Cancelar" cuando `status='completed'`.
3. **Sin folio fiscal**: las devoluciones no consumen folios. La referencia humana es "Devolución contra ticket A-1024".
4. **No reutiliza carrito POS**: el formulario de creación es una **tabla de líneas del ticket** con inputs `quantity` por fila (no un catálogo libre). Reutiliza `SaleItemsTable` con render extendido.
5. **`returnedQuantityBySaleItem` ya viene en el detalle de venta**: el cálculo `remaining = soldQty - returnedQty` es cliente, sin round-trip extra.

## Goals / Non-Goals

**Goals:**

- Pantalla `/returns` operable por cualquiera con `returns:read`: filtros (sucursal sólo con bypass, estado multi, customer, sale, rango fechas, search) + tabla paginada con `ReturnStatusBadge` por estado + acción "Ver" → `/returns/[id]`.
- Pantalla `/returns/[id]` operable por `returns:read`: detalle con header (status badge, reembolso total, fecha devolución, link al ticket), items snapshotados, metadata, y acción "Cancelar" cuando aplica (`returns:cancel`).
- Pantalla `/sales/[id]/returns/new` operable por `returns:create`: formulario de registro contra un ticket, con tabla de líneas mostrando `vendido / devuelto / disponible`, inputs `quantity` por fila, campos `reason`/`returnedAt`/`notes?`. Submit → `POST /api/v1/admin/returns`. Tras éxito navega a `/returns/[id]`.
- Modal `CancelReturnModal` con `reason?` opcional. Maneja 409 "already cancelled" y refresca el detalle.
- **Integración en `/sales/[id]`**:
  - Sub-bloque `SaleReturnsSection` que lista las devoluciones de un ticket.
  - CTA "Registrar devolución" visible cuando `sale.status='completed'` + `can("returns:create")` + existe ≥1 línea con `remaining > 0`.
  - `SaleItemsTable` muestra subnota "Devuelto: X de Y" por línea con devoluciones completed.
- Diseño alineado con el design system existente: status badges con punto coloreado (`completed → bg-primary-container`, `cancelled → bg-surface-container-highest`), `error-container` para CTA "Cancelar devolución", `primary` para "Registrar devolución".
- NavigationRail añade item `returns` entre `quotes` e `inventory`.

**Non-Goals:**

- Cambios en backend, schema o seed (todo está implementado en `apis-devoluciones`).
- Devoluciones sobre ventas `cancelled` o `edited` (el backend lo bloquea con 409; la UI sólo expone el flujo cuando `status='completed'`).
- Edición de una devolución existente (no existe endpoint backend `PATCH /returns/:id`; cancelar y crear otra es el patrón).
- Re-activación de una devolución cancelada (sin endpoint backend).
- Notificación al cliente, generación de notas de crédito CFDI, ajuste de `customerBalance` (todos diferidos a sus respectivos changes futuros).
- Cambio de producto en una devolución (devolver A + entregar B en un solo flujo).
- Reportes / dashboards / gráficos de devoluciones — fuera de alcance v1.
- Catálogo de motivos (`return_reasons`): el campo `reason` es texto libre en v1, alineado con el backend.
- Filtro `creatorId === currentUserId` ("sólo mis devoluciones"): el branch scoping ya acota; se evalúa si surge ruido.

## Decisions

### Decisión 1 — Creación nace del detalle de venta (`/sales/[id]/returns/new`), no de `/returns/new`

La regla del cliente "enlazado a un ticket obligatorio" hace antinatural una ruta `/returns/new` que primero pediría seleccionar la venta. El backend ya rechaza `branchId`/`customerId` en el body (los hereda del sale). El flujo natural es:

1. Operador abre `/sales/[id]` y ve la sección "Devoluciones" con CTA "Registrar devolución".
2. Click → navega a `/sales/[id]/returns/new` (URL deep-linkable, recargable).
3. Formulario: tabla con las líneas del ticket, columna `cantidad a devolver` editable por fila, campos `reason`/`returnedAt`/`notes?`.
4. Submit → `POST /api/v1/admin/returns` → redirige a `/returns/[id]`.

**Alternativa descartada**: ruta `/returns/new` con búsqueda de ticket dentro del form. Suma fricción y duplica la búsqueda que ya existe en `/sales`.

### Decisión 2 — `SaleItemsTable` extendida con render condicional, no duplicada

`SaleItemsTable` (en `sales/_blocks/`) ya renderiza las líneas con sus snapshots. Se extiende con dos props opcionales:

```ts
interface SaleItemsTableProps {
  items: SaleItem[];
  returnedQuantityBySaleItem?: Record<string, number>;
  renderQuantityCell?: (item: SaleItem, returnedQty: number) => ReactNode;
}
```

- `returnedQuantityBySaleItem`: si está presente y un item tiene `returnedQty > 0`, la celda de cantidad muestra "X · Devuelto: Y" en dos líneas (la subnota en `text-label-sm text-on-surface-variant`).
- `renderQuantityCell`: override total para el formulario de creación de devolución, donde la celda renderiza un `<input type="number">` con `min=0, max=remaining`.

**Alternativa descartada**: crear `ReturnLineRow.tsx` con tabla propia. Duplica 80 líneas y se desfasa de la tabla del ticket si se renombran columnas.

### Decisión 3 — Formulario de creación: cantidades por línea, no por producto

El backend exige `items[].saleItemId` (no `productId`). El formulario itera sobre `sale.items` y NO permite "agrupar por producto si aparece dos veces" — cada línea es independiente. Inputs por fila:

- `quantity: number` (decimal, step 0.0001, min 0, max = `remaining`). Default 0; submit ignora líneas con `quantity === 0`.
- Validación cliente:
  - `quantity > remaining` → error inline "Excede disponible (Y)" + submit disabled.
  - Suma de `quantity > 0` debe ser ≥1 (sino → "Selecciona al menos un producto").
- Footer del formulario:
  - `reason: string` (textarea, 3–500 chars, required).
  - `returnedAt: <input type="date">` con default = hoy, max = hoy (no permite fechas futuras).
  - `notes?: string` (textarea, max 1000 chars, opcional).
- Botón "Registrar devolución" (`bg-primary`) deshabilitado mientras hay validaciones pendientes o el submit está en vuelo.

### Decisión 4 — `returnedAt` como `<input type="date">` con normalización a hora actual

El backend acepta ISO 8601 y exige `returnedAt <= NOW()`. La UI ofrece date-picker (precisión día). Al submit, convierte `YYYY-MM-DD` a:
- Si la fecha es **hoy**: `new Date().toISOString()` (hora actual, evita race con NOW() del servidor).
- Si la fecha es **anterior a hoy**: `${YYYY-MM-DD}T12:00:00.000Z` (mediodía UTC, agnóstico a la TZ del operador).

El backend tiene `+/- 5s` de tolerancia (no estricto), pero esta normalización evita falsos 400 por desfase de relojes.

### Decisión 5 — Detalle: una sola acción contextual ("Cancelar")

`ReturnActionsBar` decide qué renderizar según `(status, can(...))`:

| Estado | Botones visibles |
|---|---|
| `completed` | "Cancelar devolución" (`returns:cancel`); si no tiene permiso, oculto. |
| `cancelled` | Banner gris con `cancellationReason` y `cancelledAt`; ningún botón. |

A diferencia de quotes (5 estados, 4 botones contextuales), aquí la lógica es trivial. Mientras `can("returns:cancel") === "loading"`, el botón se muestra deshabilitado con spinner.

### Decisión 6 — `ReturnStatusBadge`: punto coloreado + texto (estilo Stitch)

Sigue el patrón `QuoteStatusBadge` / `SaleStatusBadge`:

```tsx
<span className="inline-flex items-center px-3 py-1 <bg> <fg> rounded-full text-label-sm font-bold">
  <span className="w-1.5 h-1.5 rounded-full <dot-bg> mr-2"></span>
  <texto>
</span>
```

Tabla de tokens:

| Estado | Bg | Fg | Dot | Texto |
|---|---|---|---|---|
| `completed` | `bg-primary-container` | `text-on-primary-container` | `bg-primary` | "Activa" |
| `cancelled` | `bg-surface-container-highest` | `text-on-surface-variant` | `bg-outline-variant` | "Cancelada" |

Se evita el verbo "Completada" en español porque puede confundirse con "el proceso terminó". "Activa" comunica mejor que la devolución sigue vigente.

### Decisión 7 — Lista `/returns`: reutiliza `CatalogShell` + filtros server-side

Mismo patrón que `/sales` y `/quotes`: `CatalogShell`, `CatalogToolbar` con `SearchInput` debounced 300 ms (mín 2 chars; render badge "Búsqueda en servidor · 2+ caracteres" via `searchScope="server"`), filtros como `<select>` y `<input type="date">`. Paginación con `CatalogPagination`.

Tabla con columnas:

| Col | Contenido |
|---|---|
| Folio venta | `saleFolioCode-saleFolioNumber` mono, link a `/sales/[saleId]` |
| Cliente | avatar circular (iniciales) + `customerName` + `customerRfc` small; "Sin cliente" si null |
| Sucursal | `branchName` (oculto cuando el usuario NO tiene `branches:access_all`) |
| Devuelto por | `creatorName` |
| Reembolso | `refundTotal` (tabular-nums, alineado derecha, formato MX) |
| Fecha | `returnedAt` corto (`"02 Jun"`) |
| Estado | `ReturnStatusBadge` |
| — | Botón "Ver" → `/returns/[id]` |

Filtros visibles:

- **Estado** `<select multiple>`: "Activas / Canceladas" (default todas). Mapea a `?status=completed,cancelled`.
- **Sucursal** `<select>`: oculto sin `branches:access_all`; default vacío.
- **Desde** / **Hasta** `<input type="date">` → `?from=` / `?to=`.
- **Búsqueda** `<input>` debounced.

### Decisión 8 — Sub-bloque `SaleReturnsSection` integrado en `SaleDetailPage`

`SaleDetailPage` se extiende con una sub-sección debajo de los items y antes del bloque de cliente:

```
┌──────────────────────────────────────┐
│ Items                                │
│ ...                                  │
├──────────────────────────────────────┤
│ Devoluciones (3)         [+ Registrar]│
│ ├ Devolución ABC123 · Activa · $250  │
│ │  02 jun 2026 · Producto en mal estado│
│ ├ Devolución XYZ456 · Cancelada · $100│
│ │  01 jun 2026                       │
│ └ ...                                │
└──────────────────────────────────────┘
```

- Header: "Devoluciones (N)" donde N = total (completed + cancelled).
- CTA "+ Registrar devolución" visible sólo si `can("returns:create") === true` y `sale.status === 'completed'` y existe al menos una línea con `(quantity - returnedQuantityBySaleItem[item.id] ?? 0) > 0`.
- Si N = 0 y se cumple el guard: muestra "Aún no hay devoluciones" en lugar de la lista.
- Si N = 0 y NO se cumple el guard: la sección entera se oculta (limpio para `cancelled`/`edited`).
- Cada fila muestra: id corto (últimos 6 chars), `ReturnStatusBadge`, fecha, reembolso, motivo truncado a 60 chars. Click navega a `/returns/[id]`.

### Decisión 9 — `CancelReturnModal`: campo `reason?` + warning de stock negativo

```
┌──────────────────────────────────────┐
│ Cancelar devolución                  │
│ Esta acción descontará el inventario │
│ que se había restaurado al registrar │
│ la devolución.                       │
│                                      │
│ ⚠ El stock de "Saco 50kg" quedará en │
│    -2 tras la cancelación (es válido,│
│    se reconcilia con transferencia o │
│    ajuste manual).                   │
│                                      │
│ Motivo (opcional):                   │
│ [_________________________________]  │
│                                      │
│         [Volver]  [Cancelar devolución] │
└──────────────────────────────────────┘
```

- Campo `reason: string | null` (max 500 chars).
- Warning amarillo cuando hay items cuya cantidad a devolver excedería el stock actual (calculado en cliente via `useBranchInventoryPreview` opcional — ver Decisión 10). Es informativo, no bloquea.
- Submit → `POST /api/v1/admin/returns/:id/cancel`. Éxito → refrescar detalle.
- 409 `ReturnAlreadyCancelledError` → toast "La devolución ya estaba cancelada" + refrescar detalle.

### Decisión 10 — Preview de stock negativo: opcional, fuera del crítico path

El warning de "stock quedará negativo" requiere consultar `GET /api/v1/admin/branches/[branchId]/inventory?productIds=...` para cada item de la devolución. En v1 se omite la consulta y el modal muestra un warning genérico:

> "Si las unidades devueltas ya se vendieron, el stock podría quedar negativo. Es válido y se reconcilia manualmente."

**Alternativa descartada**: hacer fetch al abrir el modal. Suma latencia visible (200-400ms) en un flujo crítico. Si el cliente lo pide, se añade en una iteración (`add-stock-preview-on-cancel-return`).

### Decisión 11 — Servicios y errores tipados por feature

Espejo de `sales-ui` / `quotes-ui`. Cada `_logic/services/` recibe `fetchImpl?: typeof fetch` inyectable:

- `returns/_logic/services/listReturns.ts` — `GET /returns?...`
- `returns/_logic/services/getReturn.ts` — `GET /returns/:id`
- `returns/_logic/services/listSaleReturns.ts` — `GET /sales/:id/returns` (devuelve `ReturnDetailDto[]` extrayendo `body.returns`)
- `returns/_logic/services/createReturn.ts` — `POST /returns`
- `returns/_logic/services/cancelReturn.ts` — `POST /returns/:id/cancel`

Errores en `returns/_logic/errors.ts`:

- `ReturnNotFoundError` (404)
- `ReturnAlreadyCancelledError` (409)
- `SaleNotReturnableError(status)` (409; `status === 'cancelled' | 'edited'`)
- `EmptyReturnError` (400)
- `SaleItemNotPartOfSaleError(saleItemId)` (400)
- `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)` (409)
- `SaleNotFoundError` (400 al crear devolución, 404 al listar por venta)
- `ReturnReadForbiddenError`, `ReturnCreateForbiddenError`, `ReturnCancelForbiddenError`, `ReturnScopingForbiddenError`.

Los servicios convierten ISO strings a `Date` para `createdAt`, `updatedAt`, `returnedAt`, `cancelledAt`.

### Decisión 12 — `useReturnsList`, `useReturnDetail`, `useReturnMutations`, `useSaleReturns`

Espejo del patrón sales-ui / quotes-ui:

- `useReturnsList(filters)`: maneja paginación, debounced search, cancelación en cambio de filtros (`AbortController`), devuelve `{ items, total, page, isLoading, error, refresh }`.
- `useReturnDetail(id)`: carga un return por id, expone `{ return, isLoading, error, refresh }`; cancela al desmontar.
- `useReturnMutations(onChange?)`: expone `{ isSaving, create, cancel }`. Cada función llama al servicio correspondiente y, en éxito, dispara `onChange(updatedReturn)`.
- `useSaleReturns(saleId)`: carga las devoluciones de un ticket, expone `{ returns, isLoading, error, refresh }`. Usado en `SaleReturnsSection`.

### Decisión 13 — `CreateReturnPage` hook orquestador: `useCreateReturnForm`

Hook custom que centraliza el estado del formulario:

```ts
const { 
  lines,           // Record<saleItemId, { quantity: number; error?: string }>
  updateLine,      // (saleItemId, quantity) => void
  reason, setReason,
  returnedAt, setReturnedAt,
  notes, setNotes,
  validationError, // string | null (summary error para CTA)
  submit,          // () => Promise<ReturnDetailDto>
  isSubmitting,
  submissionError, // ServiceError | null
} = useCreateReturnForm(sale);
```

- `lines` inicializa con `quantity = 0` por cada `sale.items[i]`.
- `updateLine` valida `0 <= quantity <= remaining` y guarda el error inline.
- `validationError` es derivado: `"Selecciona al menos un producto" | "Hay cantidades inválidas" | null`.
- `submit` filtra líneas con `quantity > 0`, llama `createReturn(...)`, mapea errores.

### Decisión 14 — Iconos nuevos

Añadir a `app/_components/atoms/Icon/icons.ts`:

- `assignment_return` — para el rail item Devoluciones y el header de detalle.
- `keyboard_return` — alternativa para iconografía secundaria si se necesita.

Los demás (`receipt_long`, `warning`, `arrow_back`, `cancel`, `add`, `person`, `store`) ya existen.

### Decisión 15 — NavigationRail: insertar `returns` entre `quotes` e `inventory`

```ts
{ key: "returns", href: "/returns", icon: "assignment_return", label: "Devoluciones", requires: "returns:read" }
```

Posición elegida porque devoluciones es un módulo transaccional vinculado al ciclo de venta: `pos → sales → quotes → returns → inventory → catalogs`. El viewer (con `returns:read`) ve el item; sin escritura no ve el CTA "Registrar" en `/sales/[id]` pero sí entra a `/returns` y `/returns/[id]`.

### Decisión 16 — `SaleReturnsSection` consulta en mount, no en lazy-tab

Como el detalle de venta ya hace 1 round-trip para `GET /sales/:id`, sumar un segundo round-trip para `GET /sales/:id/returns` en mount es aceptable (≤ 100-150 ms) y simplifica la UI (sin lazy-load). Si la sección crece (KPIs, gráficos) se evalúa lazy-load.

### Decisión 17 — Sin guard de matriz para devoluciones

A diferencia de la edición de ventas (`sales:edit_completed` + matriz), las devoluciones NO tienen restricción de sucursal matriz. Toda operación se rige por permisos + branch scoping. `useHeadquarters` no se consulta desde `returns-ui`. Un operador en cualquier sucursal puede crear/cancelar devoluciones de su sucursal sin pasar por HQ.

### Decisión 18 — Tokens visuales: alineación con design system existente

- CTA "Registrar devolución": `bg-primary text-on-primary` (acción positiva).
- CTA "Cancelar devolución" (modal de confirmación): `bg-error-container text-on-error-container` (acción destructiva, alineado con `CancelSaleModal`).
- Badge `completed`: `bg-primary-container` (consistente con `Sale` completed).
- Badge `cancelled`: `bg-surface-container-highest` (consistente con `Sale`/`Quote` cancelled).
- Warning de stock negativo: `bg-warning-container text-on-warning-container` (si no existe el token, fallback a `bg-error-container`).

Sin migración de tokens en este change.

## Risks / Trade-offs

- **[Crear devolución sólo desde `/sales/[id]/returns/new`]** — Si un operador quiere registrar una devolución y conoce el folio pero no la URL del ticket, debe pasar por `/sales`, buscar el folio, abrir el detalle, y luego "Registrar devolución". Mitigación: la lista `/returns` muestra el folio de la venta y el CTA "Registrar" siempre nace del ticket; no se duplica el flujo. Si causa fricción, se evalúa un quick-action en `/returns` que abra un modal de búsqueda de ticket.
- **[Race entre `returnedQuantityBySaleItem` y el formulario]** — El usuario abre `/sales/[id]/returns/new` y mientras llena el form otro operador crea una devolución para el mismo ticket. Al submit, el backend rechaza con `ReturnQuantityExceedsRemainingError(remaining)`. La UI mapea el error a un inline en la fila correspondiente y refresca `remaining`. Documentado en la UI con un texto pequeño "Las cantidades disponibles pueden cambiar si otro operador registra una devolución".
- **[Sin preview de stock negativo en cancelación]** — El operador podría cancelar una devolución sin saber que dejará stock negativo. Mitigación: warning genérico en el modal + posibilidad de añadir el fetch real en una iteración futura.
- **[`SaleItemsTable` extendida obliga a tests existentes a pasar `returnedQuantityBySaleItem` opcional]** — Mitigación: prop opcional con default `{}`; los tests existentes siguen funcionando sin cambios.
- **[Tabla del formulario con muchas líneas (>20)]** — Tickets con muchas líneas hacen scroll vertical largo. Mitigación: ya existe `max-h` con scroll interno en `SaleItemsTable`; el form `CreateReturnPage` lo respeta.
- **[Devolución cancelada cuya venta también se cancela]** — El detalle de la devolución no muestra el estado actual del ticket. Mitigación: el header del detalle hace fetch en mount y enlaza con la venta; si el operador click en el folio, ve el estado actual. Aceptable.
- **[Cambio de pathname en `NavigationRail` activo]** — `/returns/[id]` debe activar el item `returns`. El componente ya usa `pathname.startsWith(href + "/")` — funciona out-of-the-box.
- **[Hooks `useCurrentUser().can()` en estado `"loading"` para botones de escritura]** — Mismo patrón que el resto del panel: los botones se renderizan deshabilitados con spinner pequeño durante `"loading"`. Sin layout shift.

## Migration Plan

No aplica migración de datos ni de schema. Despliegue puramente de frontend:

1. Crear iconos nuevos en `Icon/icons.ts` (`assignment_return`, `keyboard_return` si no existen).
2. Crear `_logic/` y bloques de `returns-ui` (lista, detalle, modal cancelar).
3. Crear `useCreateReturnForm` y la ruta `app/(private)/sales/[id]/returns/new/page.tsx` con `_blocks/CreateReturnPage.tsx`.
4. Extender `SaleItemsTable` con props opcionales `returnedQuantityBySaleItem` y `renderQuantityCell`.
5. Añadir `SaleReturnsSection` al `SaleDetailPage` y el CTA "+ Registrar devolución".
6. Actualizar NavigationRail (`items.ts`) con el item `returns`.
7. Tests unitarios bajo `tests/unit/ui/returns/`, `tests/unit/ui/sales/` (extensión de `SaleItemsTable` y `SaleReturnsSection`), y `tests/unit/ui/_components/organisms/NavigationRail.test.tsx` (smoke del nuevo item).
8. Verificación manual end-to-end en navegador:
   - `admin`: registra devolución contra un ticket con 3 items, parcialmente; verifica que `/sales/[id]` muestra "Devuelto: X de Y" y el sub-bloque lista la devolución; cancela la devolución; intenta cancelarla de nuevo (toast 409); verifica que `/returns/[id]` se actualiza.
   - `operator` en su sucursal: registra devolución contra ticket de su sucursal (201); intenta sobre ticket de otra (403); cancela devolución de su sucursal; intenta cancelar devolución de otra (403).
   - `viewer`: ve `/returns` con datos de su sucursal; entra al detalle; NO ve botones de escritura ni el CTA en `/sales/[id]`.

Rollback: revertir el commit de frontend; el backend no se ve afectado.

## Open Questions

- ¿La lista debería ofrecer filtro adicional "Sólo mis devoluciones" (por `creatorId === currentUserId`)? V1 NO — branch scoping ya acota.
- ¿El detalle de la devolución debería mostrar el ticket origen embebido (collapsable) en lugar de sólo un link? V1 sólo link; abrir el ticket es 1 click. Se evalúa tras feedback.
- ¿`CancelReturnModal` debería ofrecer presets de motivos ("Error de captura", "Producto reintegrado", "Cliente cambió de opinión")? V1 sólo textarea libre; si los usuarios lo piden, se añade.
- ¿El formulario de creación debería pre-completar la fila con `quantity = remaining` si el operador click "Devolver todo"? V1 inputs vacíos; un atajo "Devolver todo" en footer es viable iteración futura.
- ¿La sub-sección `SaleReturnsSection` debería paginar si N > 10? V1 muestra todas (cardinalidad esperada ≤ 5 por ticket). Si en producción aparece un ticket con 20 devoluciones, se añade scroll vertical.
- ¿El CTA "Registrar devolución" debería desaparecer cuando TODAS las líneas están `remaining = 0`? V1 sí — la regla de visibilidad ya lo contempla.
