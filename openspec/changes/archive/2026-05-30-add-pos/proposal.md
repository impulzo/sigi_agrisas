## Why

El backend ya cubre catálogos, RBAC, productos, precios, dosificaciones y stock por sucursal, pero falta el módulo que da sentido operativo a todo el sistema: el **Punto de Venta (POS)**. Sin él la sucursal no puede facturar al cliente, no se mueve el inventario por venta y no hay trazabilidad de quién vendió qué, dónde, ni a quién.

El cliente además fijó cinco reglas de negocio que el POS debe respetar de manera estricta y verificable:

1. Una venta debe seleccionar **cliente + productos (con cantidad) + precio tomado de la lista de precios** del producto.
2. **El ticket sólo se edita en matriz.** En sucursales debe cancelarse y crear uno nuevo; cancelar y completar deben **descontar/restaurar inventario** automáticamente.
3. Se puede **vender a clientes con adeudo** (no se bloquea, sólo se advierte).
4. Se puede **vender con stock 0** dejando el inventario en negativo, a la espera de un traspaso futuro.
5. Cada usuario operativo tiene **una sucursal asignada** y, salvo que sea administrador, sólo puede ver el inventario y las ventas de esa sucursal. Sólo el administrador ve todas las sucursales e inventarios.

Para soportarlo el sistema necesita: una nueva entidad `Customer` con datos fiscales y saldo de crédito, un agregado `Sale` con líneas snapshot (precio, impuesto, descuento congelados al momento de emitir), un mecanismo de **scoping por sucursal** transversal (token, middleware, guards), un concepto de **sucursal matriz** para gobernar la edición de tickets ya completados, y un cambio puntual en `inventory-api` para que la venta pueda dejar el stock por debajo de cero sin violar el `CHECK` actual.

## What Changes

### Migración + esquema

Nueva migración Prisma `add_pos_tables_and_branch_scoping` que:

- Crea las tablas:
  - `customers` (catálogo de clientes con datos fiscales mexicanos y saldo de crédito).
  - `sales` (encabezado del ticket con folio, montos, estado y referencias a sucursal/cliente/usuario/método de pago).
  - `sale_items` (líneas con **snapshot** de `code`, `name`, `price`, `discount_pct`, `iva_rate`, `ieps_rate`).
- Modifica:
  - `users` → añade `branch_id String?` con FK a `branches(id) ON DELETE SET NULL`.
  - `branches` → añade `is_headquarters Boolean default false` con índice **único parcial** `WHERE is_headquarters = TRUE` (a lo más una matriz).
  - `branch_inventory` → **elimina el `CHECK (quantity >= 0)`** sobre `quantity` (los demás CHECK `>= 0` permanecen). Mantiene el resto del esquema intacto.
- Índices: en `customers(code)`, `customers(rfc)`, `customers(name)`, `sales(branch_id)`, `sales(customer_id)`, `sales(status)`, `sales(completed_at)`, `sale_items(sale_id)`, `sale_items(product_id)`. Unicidad `sales(folio_id, folio_number)`.

### Nuevo módulo `src/modules/customers/`

Hexagonal completo. CRUD admin de clientes con código inmutable, RFC editable, `creditLimit` opcional y `currentBalance` rastreable (saldo informativo, no se mueve aún desde el POS — la lógica de crédito completa se difiere).

### Nuevo módulo `src/modules/pos/`

Hexagonal completo. Núcleo del POS:

- **Dominio**: entidades `Sale`, `SaleItem`; value objects `SaleStatus` (`completed`/`cancelled`/`edited`); errores tipados (`SaleNotFoundError`, `SaleAlreadyCancelledError`, `SaleNotEditableHereError`, `ProductPriceMismatchError`, `EmptySaleError`, `FolioExhaustedError`).
- **Servicio de dominio** puro `SaleTotalsCalculator` que, dada la lista de líneas, calcula `subtotal`, `taxTotal` (IVA + IEPS), `total` y `lineSubtotal/lineTax/lineTotal` por línea — sin tocar BD ni HTTP.
- **Aplicación**: puerto `SaleRepository`; use cases `CreateSaleUseCase` (transaccional: valida → snapshotea → descuenta inventario → asigna folio → persiste), `ListSalesUseCase`, `GetSaleUseCase`, `CancelSaleUseCase` (restaura inventario), `EditCompletedSaleUseCase` (matriz, transaccional: restaura líneas viejas → aplica nuevas → recalcula totales → marca `editedAt`).
- **Infraestructura**: `PrismaSaleRepository`; `SalesController`; DI container que importa `branchInventoryRepository`, `productRepository`, `productPriceRepository`, `customerRepository`, `folioRepository`, `branchRepository`.

### Route handlers (todos bajo `/api/v1/admin/`)

**Customers** (`customers:read` / `customers:write`):
- `GET /api/v1/admin/customers` (paginado, `?search=`, `?includeInactive=`)
- `GET /api/v1/admin/customers/:id`
- `POST /api/v1/admin/customers`
- `PATCH /api/v1/admin/customers/:id`
- `DELETE /api/v1/admin/customers/:id` (soft delete)

**Sales / POS**:
- `GET /api/v1/admin/sales` (`sales:read`) — paginado, `?branchId=`, `?customerId=`, `?status=`, `?from=`, `?to=`
- `GET /api/v1/admin/sales/:id` (`sales:read`)
- `POST /api/v1/admin/sales` (`sales:create`) — emite ticket completado en una sola transacción
- `POST /api/v1/admin/sales/:id/cancel` (`sales:cancel`)
- `PATCH /api/v1/admin/sales/:id` (`sales:edit_completed`) — sólo permitido si el usuario pertenece a la sucursal `is_headquarters = TRUE`

### Cambios en módulos existentes

- **`rbac`**: 7 permisos nuevos (`customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:edit_completed`, `branches:access_all`). Reasignación de roles base. `branches:access_all` es el bypass del scoping por sucursal; sólo lo recibe `admin`.
- **`auth-middleware`**: añade el header `x-user-branch-id` al request reenviado (cadena vacía si el usuario no tiene sucursal). Define que los handlers que operan sobre `:branchId` deben rechazar con 403 si el usuario no es el dueño de esa sucursal y no tiene `branches:access_all`.
- **`token-management`**: el access token incorpora el claim `branchId: string | null`. El refresh token también, para que el reissue propague el valor sin tocar BD.
- **`inventory-api`**: define que `branch_inventory.quantity` puede ser negativo cuando lo origina una venta. El endpoint admin `POST /adjust` mantiene la semántica de rechazar deltas que excedan el stock (compatibilidad inalterada). El POS no usa `/adjust`: ejecuta sus propios `$executeRaw` desde el use case `CreateSaleUseCase` sin la cláusula `WHERE quantity + delta >= 0`.
- **`admin-branches`**: añade el campo `isHeadquarters: boolean` al `BranchDto` y al `POST`/`PATCH`. A lo más una sucursal puede tener `isHeadquarters = true`; intentar marcar una segunda devuelve 409.
- **`admin-users`**: añade el campo `branchId: string | null` al `AdminUserDto` y al `PATCH /api/v1/admin/users/:id`. Asignar a una sucursal que no existe → 400. Asignar `null` lo deja sin sucursal (típico para admins).

### Cálculo de totales

Servicio de dominio puro `SaleTotalsCalculator`. Para cada línea:

```
lineSubtotal = round(quantity * unitPrice * (1 - (discountPct ?? 0) / 100), 4)
lineIva       = round(lineSubtotal * (ivaRate  ?? 0), 4)
lineIeps      = round(lineSubtotal * (iepsRate ?? 0), 4)
lineTax       = lineIva + lineIeps
lineTotal     = lineSubtotal + lineTax
```

Totales del ticket: suma simple por columna. Redondeo half-even a 4 decimales (igual escala que las columnas Decimal). UI debe mostrar a 2 decimales por MXN; el backend siempre persiste 4.

### RBAC

- `admin` → los 7 nuevos.
- `operator` → `customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel` (operario de caja).
- `viewer` → `customers:read`, `sales:read`.

### Tests

- Unit tests por use case (in-memory repos) — ~15 archivos.
- Unit tests del `SaleTotalsCalculator` puro (incluye casos sin IVA/IEPS, con descuento, con dosificación, multi-línea).
- Tests de validación Zod en los 2 controllers nuevos.
- Tests de integración Supabase: flujo completo `crear cliente → crear venta → verificar stock decrementado → cancelar → verificar restauración`; flujo `editar ticket en matriz`; flujo `vender con stock 0 → quantity queda negativo`; flujo `admin lista ventas de otra sucursal vs operator forbidden`.

**No-Goals (fuera de scope de este change):**

- UI/frontend del POS (se construirá en `add-pos-ui`).
- Multi-pago en un ticket (un único `paymentMethodId` por venta).
- Generación de PDF/impresión del ticket.
- Integración con SAT/timbrado CFDI 4.0 (sólo se persisten los campos fiscales; el timbrado se difiere).
- Movimientos de traspaso entre sucursales (`branch_transfers`) — se difiere a `add-branch-transfers`.
- Crédito real / cobranza (sólo se expone `currentBalance`; mover el saldo desde una venta se difiere a `add-customer-credit`).
- Devoluciones parciales (cancelar es la única forma de revertir; cancelación parcial llega después).
- Cajas/turnos / corte de caja (`pos_shifts`) — se difiere.
- Promociones complejas o cupones (sólo `discount_pct` por línea de precio).
- Auditoría de stock (`stock_movements`) — sigue diferido como en `inventory-backend`.
- POS móvil/offline.

## Capabilities

### New Capabilities

- `customers-api`: REST admin para gestionar el catálogo de clientes con datos fiscales mexicanos (RFC, régimen, uso CFDI, código postal fiscal), `creditLimit` opcional y `currentBalance` consultable. Soft delete. Búsqueda server-side por `name`/`legalName`/`rfc`.
- `pos-api`: REST admin del Punto de Venta — emisión transaccional de tickets, cancelación con restauración de stock, edición de tickets ya completados (sólo matriz), scoping por sucursal, soporte para stock negativo cuando lo origina una venta. Cálculo de totales como servicio de dominio puro.

### Modified Capabilities

- `rbac`: 7 permisos nuevos (`customers:read`, `customers:write`, `sales:read`, `sales:create`, `sales:cancel`, `sales:edit_completed`, `branches:access_all`) y nuevas asignaciones a roles base. El permiso `branches:access_all` es el único bypass del scoping por sucursal.
- `auth-middleware`: propaga `x-user-branch-id` y especifica el patrón de scoping que los route handlers deben aplicar cuando el path incluye `:branchId`.
- `token-management`: el access token y el refresh token incorporan el claim `branchId: string | null`; los tokens previos (sin `branchId`) se tratan como `branchId = null`.
- `inventory-api`: `branch_inventory.quantity` puede ser negativo cuando lo origina una venta; el admin `POST /adjust` mantiene su validación de stock no negativo intacta.
- `admin-branches`: añade `isHeadquarters: boolean` al CRUD; máximo una sucursal puede ser matriz.
- `admin-users`: añade `branchId: string | null` al CRUD; permite asignar sucursal al usuario.

## Impact

- **Código nuevo**: 2 módulos hexagonales (`customers`, `pos`) — ~50 archivos backend, 9 route handlers, ~25 archivos de tests.
- **Código modificado**: `prisma/schema.prisma` (3 modelos nuevos + 2 modelos modificados), `prisma/seed.ts` (7 permisos nuevos), `src/modules/auth/` (JWT incluye `branchId`), `middleware.ts`/`AuthMiddlewareAdapter` (propaga header), `src/modules/inventory/` (la migración elimina un CHECK; nada cambia en código), `src/modules/users/` (DTO incluye `branchId` + PATCH lo soporta), `src/modules/branches/` (DTO incluye `isHeadquarters` + validación unicidad), `CLAUDE.md` (nueva sección "POS (Backend)" + actualización de las reglas de scoping y de tokens).
- **Migraciones de BD**: una migración (`add_pos_tables_and_branch_scoping`) que crea 3 tablas, añade 2 columnas a tablas existentes y elimina 1 CHECK constraint.
- **Sin cambios en UI/frontend** en este change.
- **Riesgo principal**: el cambio en `branch_inventory` (eliminar CHECK `quantity >= 0`) es semánticamente fuerte. Mitigación: documentado en la migración y en `inventory-api`; sólo el módulo POS aprovecha esta libertad; admin `/adjust` sigue rechazando deltas negativos por encima del stock.
