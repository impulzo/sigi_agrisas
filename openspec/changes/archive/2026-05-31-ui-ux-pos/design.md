## Context

El backend de POS (`add-pos`, archivado 2026-05-30) deja todo listo para que el cliente emita ventas:

- `POST /api/v1/admin/sales` emite un ticket en una transacción atómica (folio + stock + sale + items).
- `GET /api/v1/admin/sales` lista con scoping por sucursal (sin `?branchId=` → sucursal del usuario; admin con `branches:access_all` → todas).
- `POST /api/v1/admin/sales/:id/cancel` y `PATCH /api/v1/admin/sales/:id` (sólo matriz) cierran el ciclo de vida.
- `/api/v1/admin/customers` permite crear clientes "al vuelo" desde el POS (regla del cliente: el operador da de alta al instante).
- El JWT ya transporta `branchId` (claim) y el middleware propaga `x-user-branch-id` en cada request.

Faltan únicamente las pantallas. El panel ya tiene un patrón maduro de `_logic/` por feature (heredado de providers-ui / inventory-ui) y un set de átomos/moléculas (`Badge`, `Skeleton`, `ConfirmDialog`, `EmptyState`, `SearchInput`, `Switch`, `Chip`, `Card`, `FormField`) suficiente para construir el POS sin introducir nuevos primitivos. El diseño visual sigue el Stitch *"Punto de Venta - Agrisas"* (proyecto `5227157529282603342`, screen `3b7ab57a14944ac99f12f421db512076`), que usa los tokens del design system "Agro-Systemic Design" — los mismos del proyecto.

Complejidad nueva respecto a `ui-ux-inventory`:

1. **Estado del carrito**: el POS exige un agregado en cliente (selección de items + tier + descuento + cantidad) que se valida y totaliza antes del POST.
2. **Cálculo de totales en cliente**: portar `SaleTotalsCalculator` (banker's rounding a 4 decimales) para que la UI muestre subtotal/IVA/IEPS/total en vivo SIN romper el contrato con el backend (que recalcula al persistir).
3. **Guard de matriz en cliente**: la UI debe ocultar/deshabilitar "Editar venta" cuando el usuario no está en HQ y no tiene bypass — sin filtrar el guard del backend (defensa en profundidad).
4. **Branch scoping visual**: el selector de sucursal sólo debe ofrecer la sucursal del usuario (cuando no hay bypass) o todas (cuando hay bypass).

## Goals / Non-Goals

**Goals:**

- Pantalla `/pos` operable por un cajero (`operator`) en su sucursal: selecciona cliente → arma carrito (search/grid de productos + elección de tier de precio + cantidad + descuento opcional) → elige folio y método de pago → emite. Confirmación con resumen del ticket emitido.
- Pantalla `/sales` (lista) y `/sales/[id]` (detalle) operables por cualquiera con `sales:read`. Detalle expone botones cancelar (perm) y editar (perm + matriz) condicionalmente.
- Reutilizar al máximo los bloques presentacionales y el patrón `_logic/`; introducir bloques nuevos solo donde el dominio del POS lo exige (`CartLine`, `CartTotals`, `PriceTierPicker`, `ProductCatalogGrid`, `SaleStatusBadge`, `SaleItemsTable`).
- Incorporar la estética del Stitch: layout split-pane catálogo/carrito, tipografía Inter, primary verde para acciones principales (Finalizar venta), totales con números tabulares.
- Implementar el guard de matriz en cliente sin filtrar al backend (defensa en profundidad).

**Non-Goals:**

- Cambios en backend, schema o seed (todo está implementado en `add-pos`).
- CRUD completo de clientes en `/catalogs/customers` — se difiere a `add-customers-ui`. El POS sólo expone búsqueda y quick-add (modal mínimo).
- Multi-pago por venta (UI con varios métodos de pago divididos). El v1 mantiene un solo `paymentMethodId`.
- Devoluciones parciales, traspasos entre sucursales, modo "draft/hold" del carrito persistido en backend.
- Impresión física de tickets (la confirmación es web; PDF/printer queda fuera).
- Caja/turnos (cortes, fondo).
- Carga del catálogo SAT real para sugerencias.

## Decisions

### Decisión 1 — `/pos` con layout split-pane catálogo/carrito (vs. wizard por pasos)

El Stitch propone (y se adopta) un **layout split-pane**: catálogo a la izquierda (60% ancho desktop, columna principal de la mascarilla), carrito + totales + acciones a la derecha (40%, sticky). En mobile (<768px) se colapsa: catálogo arriba, carrito en un BottomSheet expandible con el contador de items visible siempre.

El catálogo es una **tabla densa** (no grid de tarjetas) — el Stitch lo muestra como `[SKU mono][Nombre][Precio][Acción +]` para favorecer escaneo rápido de catálogos grandes y alineación tabular de precios. Búsqueda server-side debounced 300ms (mín 2 chars) por `name`/`code` (usa `GET /api/v1/admin/products?search=`).

**Alternativa descartada**: wizard de 4 pasos (cliente → items → pago → confirmación). Suma fricción para el cajero recurrente, que abre el POS y dispara una venta cada minuto.

### Decisión 2 — Selección de sucursal: sticky en el header, no en URL

El POS opera siempre sobre UNA sucursal. Se persiste en `sessionStorage` (clave `pos.branchId`) tras la primera elección — el operador típicamente trabaja en la misma sucursal toda la jornada. Sin sucursal seleccionada el carrito está deshabilitado y se muestra un prompt "Selecciona una sucursal para empezar".

Para usuarios sin `branches:access_all`, el `<select>` sólo lista la sucursal asignada (`useCurrentUser().branchId`); para admins lista todas las activas (vía `useBranchesOptions()` ya disponible desde inventory-ui).

**Alternativa descartada**: sucursal en URL (`/pos/[branchId]`). Suma routing sin beneficio claro para el flujo de un solo paso del cajero.

### Decisión 3 — Cálculo de totales en cliente con `computeTotalsClient`

Portar `SaleTotalsCalculator` (de `src/modules/pos/domain/services/`) a un módulo cliente puro `app/(private)/pos/_logic/lib/computeTotalsClient.ts` con la misma fórmula y banker's rounding a 4 decimales. El POS muestra totales en vivo (por línea + agregado) usando este cálculo; el backend recalcula al persistir, así que la fuente de verdad sigue siendo el servidor — la UI sólo da feedback inmediato.

La UI redondea **visualmente** a 2 decimales (formato MX `$1,234.56`) pero opera internamente a 4 para coincidir con el cálculo del backend.

**Alternativa descartada**: pedir totales al backend antes de emitir (preview). Latencia visible y red de seguridad innecesaria — el cliente puede calcular determinísticamente la misma fórmula.

### Decisión 4 — `PriceTierPicker`: modal superpuesto al añadir item, no inline

Como muestra el Stitch ("Retail (Default) $12.50", "Wholesale $10.00", "Promotional $11.25", "Volume Discount (100+) $8.75"), al añadir un producto al carrito el sistema:

1. Si el producto tiene UN solo precio activo → lo usa directamente, sin modal.
2. Si tiene varios → abre un modal `PriceTierPicker` con la lista de `ProductPrice` ordenada por `isDefault DESC`, mostrando `name` + `price` + `minQuantity` + `discountPct`. El default queda preseleccionado.

El picker ofrece también cantidad inicial y un input de descuento manual (0–100%, no acumula con el `discountPct` del tier — sobrescribe). Tras confirmar, la línea se añade al carrito con sus snapshots de tier.

**Alternativa descartada**: dropdown inline en cada fila del catálogo. Distrae visualmente cuando hay muchos productos con un solo precio (mayoría) y desordena la tabla.

### Decisión 5 — `CartLine`: snapshot del tier al añadir, no referencia viva

Una vez añadida la línea, el `CartLine` guarda en estado los snapshots (`productId`, `productPriceId`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `quantity`). Editar la cantidad o el descuento NO re-consulta el backend. Cambiar de tier requiere "Cambiar precio" en la fila → reabre el `PriceTierPicker` para esa línea.

Esto refleja el modelo del backend (el `SaleItem` se snapshotea al emitir) y previene que un cambio remoto del precio del catálogo se cuele a mitad de un ticket en curso.

### Decisión 6 — `computeTotalsClient` se importa también desde `_logic/lib/`, no del módulo backend `src/`

El frontend (`app/`) NO puede importar de `src/modules/pos/...` porque el dominio backend no debe filtrarse a la build cliente (incluiría tipos de Prisma, conexiones, etc.). En su lugar se duplica la fórmula como módulo puro en `app/(private)/pos/_logic/lib/computeTotalsClient.ts` (sin dependencias). Un test unitario `computeTotalsClient.test.ts` valida que produce los mismos resultados que el oráculo del backend con el set de casos del spec `pos-api > SaleTotalsCalculator`.

**Alternativa descartada**: extraer `SaleTotalsCalculator` a `src/shared/domain/` para que ambos lo importen. Razonable a largo plazo, pero el dominio POS aún es nuevo y mover ahora rompe el aislamiento hexagonal sin beneficio inmediato. Se documenta como deuda.

### Decisión 7 — Cliente: combobox con búsqueda server-side + quick-add modal

El selector de cliente es un combobox: typeahead debounced 300ms (mín 2 chars) contra `GET /api/v1/admin/customers?search=` mostrando `name` + `rfc` + `currentBalance`. Si el cliente tiene `currentBalance > 0` se muestra un badge ámbar "Adeudo $X" — la venta NO se bloquea (regla del cliente: sólo avisar).

Si la búsqueda no devuelve resultados, el dropdown muestra un botón "+ Nuevo cliente" que abre `CustomerQuickAddModal` con campos:

- Obligatorios: `code` (uppercase + auto), `name`, `rfc` (uppercase + regex MX).
- Opcionales (colapsable "Datos fiscales"): `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`.

POST → `/api/v1/admin/customers` con permiso `customers:write`. Tras éxito el cliente queda seleccionado en el carrito. Sin `customers:write` el botón no se renderiza (el cajero verá un mensaje "Pide a un admin que dé de alta al cliente").

### Decisión 8 — Folio y método de pago: selects en el panel del carrito

El backend exige `folioId` y `paymentMethodId` activos. La UI carga ambos al mount con caché de módulo (TTL 60s, mismo patrón que `useBranchesOptions`/`useDepartmentsOptions`):

- `useFoliosOptions()` → `GET /api/v1/admin/folios?pageSize=100&includeInactive=false`
- `usePaymentMethodsOptions()` → `GET /api/v1/admin/payment-methods?pageSize=100&includeInactive=false`

Los `<select>` viven en el panel del carrito (encima de los totales) y son obligatorios. Sin selección, el botón "Finalizar venta" está deshabilitado con un tooltip "Selecciona folio y método de pago".

### Decisión 9 — Finalizar venta: confirmación modal + reset opcional

Al hacer click en "Finalizar venta" (gateado por `sales:create`):

1. Validación cliente: ≥1 item, customer/branch/folio/paymentMethod seleccionados, totales > 0.
2. POST → `/api/v1/admin/sales` con `{ branchId, customerId, paymentMethodId, folioId, items, notes? }`.
3. Estados:
   - 201 → modal `SaleConfirmedModal` con folio emitido, total, cliente, items, y dos botones: "Nueva venta" (resetea carrito, mantiene branch/folio/paymentMethod) y "Ver ticket" (navega a `/sales/[id]`).
   - 400 (item inválido, customer/producto inactivo, mismatch precio) → toast inline con el mensaje.
   - 403 (scoping) → toast `"No tienes permiso para emitir ventas en esta sucursal"`.
   - 500 → toast genérico + opción "Reintentar".
4. El folio del select se refresca tras éxito (`refresh()` del hook) para reflejar el nuevo `current_number`.

### Decisión 10 — Sales list (`/sales`) reutiliza `CatalogShell`/`CatalogToolbar`/`CatalogPagination`

Mismo patrón que los catálogos: shell, toolbar (con `SearchInput` debounced + filtros `<select>` de estado y de sucursal, y `<input type="date">` para from/to) y paginación. Tabla con columnas:

| Col | Contenido |
|---|---|
| Folio | `folioCode + "-" + folioNumber` mono |
| Cliente | `customerName` + `customerRfc` (small) |
| Cajero | `cashierName` |
| Sucursal | `branchName` |
| Total | `total` (number-tabular, alineado derecha, formato MX) |
| Estado | `SaleStatusBadge` |
| Fecha | `completedAt ?? createdAt` (ISO corto) |
| — | Botón "Ver" → `/sales/[id]` |

El filtro de sucursal está **oculto** para usuarios sin `branches:access_all` (backend filtra implícitamente; mostrar el filtro sería confuso). Para admin se muestra y por defecto vacío (= todas).

### Decisión 11 — Sales detail (`/sales/[id]`): header + items + acciones, no tabs

A diferencia de productos (3 tabs por sub-recursos), una venta es atómica: items + metadatos + acciones. Layout vertical:

1. **Header**: folio gigante (`headline-lg`), `SaleStatusBadge`, fecha completada/cancelada/editada, total destacado.
2. **Meta**: 2 columnas con cliente (link a futuro `/catalogs/customers/[id]`), RFC, sucursal, cajero, método de pago, notes.
3. **Items table**: `SaleItemsTable` con columnas `Código` (mono), `Producto`, `Precio (snapshot)`, `Cant.`, `Desc.`, `IVA`, `IEPS`, `Subtotal`, `Total línea`.
4. **Totales**: subtotal + impuestos + total.
5. **Acciones** (sticky bottom o panel lateral):
   - "Cancelar venta" → `CancelSaleModal` con `reason?`. Sólo visible si `status !== 'cancelled'` y `can("sales:cancel")`.
   - "Editar venta" → navega a `/sales/[id]/edit` (o abre modal a pantalla completa con `EditSaleEditor`). Sólo visible si `can("sales:edit_completed")` AND (`can("branches:access_all")` OR `userBranchId === hq.id`).
   - Si `status === 'cancelled'`, se muestra "Venta cancelada" con `cancellationReason` y se ocultan ambos botones.

### Decisión 12 — `EditSaleEditor`: reutiliza `CartLine`/`PriceTierPicker` pero arranca con los items actuales

Editar una venta completada es operativamente "reemplazar todos los items + recalcular". La UI carga `/sales/:id`, hidrata el carrito con los items vigentes (cada línea recupera `productId`, `productPriceId`, `unitPrice`, etc. del snapshot, marcadas con un badge "Original" hasta que el usuario las modifique) y permite añadir/quitar/cambiar líneas exactamente como en `/pos`. El submit hace `PATCH /api/v1/admin/sales/:id`. Si el backend devuelve 409 (`Cancelled sales cannot be edited`), toast + redirect al detalle.

`customerId` y `paymentMethodId` son editables; `folioId`/`branchId` están bloqueados visualmente y el backend los ignora si se mandan.

**Alternativa descartada**: editor diferente del POS. Duplicaría componentes y diverge UX. Reusar es directo y consistente.

### Decisión 13 — Guard de matriz en cliente: `useHeadquarters()`

Nuevo hook módulo `app/_hooks/useHeadquarters.ts` que consulta `GET /api/v1/admin/branches?pageSize=100&includeInactive=false` y filtra client-side `isHeadquarters === true`. Cache TTL 60s. Devuelve `{ hq: BranchOption | null, isLoading }`.

El detalle de venta calcula:

```ts
const canEdit = useMemo(() => {
  if (can("sales:edit_completed") === "loading" || hqLoading) return "loading";
  if (!can("sales:edit_completed")) return false;
  if (can("branches:access_all")) return true;
  return hq && userBranchId === hq.id;
}, [...]);
```

Durante `"loading"` el botón se renderiza deshabilitado con spinner. El backend mantiene la verificación auténtica — el cliente sólo refleja el estado para no engañar al usuario.

### Decisión 14 — `useCurrentUser` añade `branchId` derivado del JWT

El JWT ya incluye `branchId` (claim añadido en `add-pos`). `useCurrentUser` ya decodifica el payload con `decodeJwtPayload`. Se extiende para exponer `branchId: string | null` (lectura del claim; `null` si ausente o cadena vacía). Sin cambios en el caché de permisos.

### Decisión 15 — Errores tipados por feature (espejo de providers-ui / inventory-ui)

Cada feature define su `_logic/errors.ts`:

- **pos**: `CustomerInactiveError`, `BranchInactiveError`, `FolioInactiveError`, `PaymentMethodInactiveError`, `ProductInactiveError`, `ProductPriceMismatchError`, `EmptyCartError`, `SaleScopingForbiddenError`, `SaleCreateForbiddenError`.
- **sales**: `SaleNotFoundError`, `CancelledSaleNotEditableError`, `SaleNotInHeadquartersError`, `SaleScopingForbiddenError`.
- **customers (mínimo)**: `CustomerCodeAlreadyInUseError`, `CustomerRfcAlreadyInUseError` (sólo para el quick-add modal).

Los servicios aceptan `fetchImpl?` inyectable para tests y convierten `createdAt`/`updatedAt`/`completedAt`/`cancelledAt`/`editedAt` a `Date`.

### Decisión 16 — NavigationRail: `pos` gateado, `billing` reemplazado por `sales`

El item `pos` ya existe en el rail sin `requires`. Se le añade `requires: "sales:create"` para que el cajero (`operator`) y admin lo vean y el viewer no.

El item `billing` (placeholder sin ruta implementada) se reemplaza por:

```ts
{ key: "sales", href: "/sales", icon: "receipt_long", label: "Ventas", requires: "sales:read" }
```

`viewer` tiene `sales:read` → ve "Ventas" pero NO ve "POS". `operator`/`admin` ven ambos.

### Decisión 17 — Tokens visuales del Stitch sin importar nuevas dependencias

Tailwind ya está configurado (v3). El Stitch propone tokens (primary `#0d631b`, surfaces `#f9f9f7`/`#eeeeec`, `rounded` `0.5rem`/`1rem`, tipografía Inter 600 para headlines). Se reutilizan los tokens **existentes** del `tailwind.config.ts` del proyecto sin migrar a tokens nuevos en este change — el sistema visual del panel ya es coherente con la paleta agro. Los componentes nuevos siguen las clases utilitarias del proyecto (`bg-surface-container`, `text-on-surface`, `rounded-md`, `rounded-lg`) sin tokens custom.

**Alternativa descartada**: migrar `tailwind.config.ts` a los tokens exactos del Stitch (`#0d631b`, etc.). Aplica a TODA la UI y excede el scope; se difiere a un change `design-tokens-sync` futuro si se decide.

## Risks / Trade-offs

- **[Discrepancia visible entre totales cliente y backend]** — Si la fórmula del `computeTotalsClient` se desincroniza del `SaleTotalsCalculator`, el cliente verá un total y recibirá otro tras emitir. Mitigación: test paramétrico `computeTotalsClient.test.ts` con el set completo de casos del spec `pos-api`. CI debe ejecutarse para detectar drift.
- **[Carga de catálogo grande]** — Si una sucursal tiene >1000 productos, el listado con `pageSize=20` requiere paginación; la búsqueda compensa. Sin scroll infinito en v1 — se usan los controles de paginación existentes.
- **[Pérdida del carrito al recargar]** — El carrito vive en estado del componente, no en sessionStorage. Cerrar pestaña o F5 lo pierde. Mitigación: confirmación `beforeunload` cuando hay items + opción "Limpiar carrito" explícita. Persistir el carrito se difiere — riesgo de mostrar precios obsoletos al recargar horas después.
- **[Concurrencia de folios]** — Dos cajeros emitiendo en paralelo: el backend serializa el `UPDATE folios`; el cliente ve el `folioNumber` final tras 201. Si el folio cargado en el `<select>` se "quema" entre el select y el submit, el backend igual atómicamente toma el siguiente. La UI sólo refresca el contador tras éxito.
- **[Quick-add de cliente sin todos los campos fiscales]** — El cajero puede crear un cliente con sólo `code`/`name`/`rfc` y dejar el resto para un admin después. El backend acepta esto (los campos fiscales son opcionales). Documentar en CLAUDE.md: el quick-add es para emitir ya; un módulo administrativo posterior completa los datos.
- **[`useHeadquarters` consulta `/branches` con `pageSize=100`]** — Si hay >100 sucursales, podría no incluir la matriz. Improbable en el contexto agro (decenas de sucursales máximo) pero se documenta. Si la matriz no se encuentra, `hq = null` → el botón "Editar venta" queda deshabilitado para no-admins (defensa).
- **[Cambio de sucursal a mitad de un carrito en curso]** — Cambiar la sucursal seleccionada (operador con bypass) con el carrito lleno: el stock referenciado puede cambiar. Mitigación: confirmar el cambio con un diálogo que advierte "Se vaciará el carrito"; al confirmar, reset.
- **[Modal de edición es operativamente intrusivo]** — Editar una venta completada es raro (sólo admin/HQ). La UI muestra una banda amarilla "Estás editando una venta ya emitida — folio Y, total $X" para mantener consciente al editor.

## Migration Plan

No aplica migración de datos ni de schema. Despliegue puramente de frontend:

1. Extender `useCurrentUser` para exponer `branchId` y crear `useHeadquarters`.
2. Crear `_logic/` y bloques de `pos-ui`, incluyendo `computeTotalsClient` y `CustomerQuickAddModal`.
3. Crear `_logic/` y bloques de `sales-ui` (lista, detalle, cancelación, editor reutilizando el del POS).
4. Actualizar NavigationRail (`pos.requires`, reemplazar `billing` por `sales`).
5. Tests unitarios bajo `tests/unit/ui/`.
6. Verificación manual end-to-end en navegador:
   - `admin`: emite venta, cancela, edita (desde cualquier sucursal), ve listado completo.
   - `operator` en HQ: emite y cancela ventas; **no** ve botón editar (le falta `sales:edit_completed`).
   - `operator` fuera de HQ: emite y cancela en su sucursal; el listado muestra sólo su sucursal; `/sales/[id]` de otra sucursal → 403.
   - `viewer`: ve listado de ventas (de su sucursal), entra al detalle, no ve botones de escritura.

Rollback: revertir el commit de frontend; el backend no se ve afectado.

## Open Questions

- ¿El folio seleccionado en el `<select>` debería persistir entre sesiones (`sessionStorage`) además de la sucursal? V1 mantiene sólo branch persistente; folio se selecciona cada sesión. Reevaluar tras feedback.
- ¿La confirmación post-emisión debería ofrecer "Imprimir" (incluso si abre una vista print-CSS)? V1 sólo navega/resetea; impresión se difiere a `pos-print-ui`.
- ¿El descuento por línea debería tener un máximo configurable por permiso (`sales:apply_full_discount`)? V1 permite 0–100% sin perm extra; el backend ya valida el rango.
- ¿`useHeadquarters` debería consultarse al login y guardarse en `sessionStorage`? V1 caché de módulo es suficiente; si se requiere snappier UX en pantallas de venta concurridas, se evalúa.
- ¿Mostrar inventario actual del producto en la fila del catálogo (`branch_inventory.quantity`)? V1 NO — añadiría un fetch por producto o un join server-side no expuesto. Se difiere a `pos-stock-hint`.
