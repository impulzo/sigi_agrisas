## Context

El sistema ya posee:

- 8 módulos hexagonales (`auth`, `rbac`, `users`, `payment-methods`, `folios`, `departments`, `branches`, `providers`) más los recientes `products` e `inventory` (change `inventory-backend`, 2026-05-29).
- RBAC con caché de 60s y `requirePermission` guard.
- JWT con `roles[]` y middleware que propaga `x-user-id`, `x-user-email`, `x-user-roles`.
- `branch_inventory` con CHECK `quantity >= 0` y operaciones atómicas vía SQL condicional.

Faltan los pilares operativos del negocio: el **cliente** al que se le emite el ticket, la **venta** propiamente dicha, y el **scoping por sucursal** del usuario operativo (cajero/almacenista). Cuatro reglas del cliente fuerzan decisiones arquitectónicas no triviales:

1. **Ticket sólo editable en matriz** — exige distinguir una sucursal "matriz" y enrutar la autorización por una combinación de permiso + ubicación de la sucursal del usuario.
2. **Stock negativo permitido por venta** — viola el CHECK actual de `branch_inventory`; obliga a relajar el invariante de columna y mover la responsabilidad al use case.
3. **Vender a clientes con adeudo (sin bloquear)** — fuerza modelar `currentBalance` en `customers` y a documentar quién lo mueve.
4. **Scoping por sucursal del usuario** — fuerza un campo `branchId` en `users` propagado vía JWT, un header `x-user-branch-id`, y un permiso de bypass (`branches:access_all`).

Este change se construye sobre el patrón ya validado por `inventory-backend`: módulos hexagonales independientes, repositorios Prisma + InMemory, controllers Zod, DI container exportando los controllers consumidos por los route handlers de `app/api/v1/admin/`.

## Goals / Non-Goals

**Goals:**

- Modelar `Customer` y `Sale`/`SaleItem` con esquema relacional limpio que preserve snapshots de precio + impuesto + descuento por línea.
- Operación atómica `crear venta` que en una transacción Prisma: valide entradas, snapshotee precios, asigne folio incremental, descuente inventario (permitiendo negativo) y persista el ticket.
- Operación atómica `cancelar venta` que restaure inventario y marque el ticket; idempotente para reintentos.
- Operación atómica `editar venta completada` que sólo procede si la sucursal del usuario es la matriz; restaura líneas viejas, aplica nuevas, recalcula totales.
- Scoping por sucursal **transversal** y verificable: token → header → guard → repo. Sin filtros silenciosos en el repo (los handlers gobiernan).
- Cálculo de totales como dominio puro testeable.
- Mantener intacto el contrato actual de `inventory-api` para admin; sólo el POS aprovecha el stock negativo.

**Non-Goals:**

- Multi-pago, multi-folio dinámico por sucursal, devolución parcial.
- Cobranza/crédito: `currentBalance` se expone pero no se mueve desde una venta en este change.
- CFDI 4.0/SAT timbrado real (sólo se guardan los campos fiscales).
- Traspasos entre sucursales (`branch_transfers`) — referenciados conceptualmente pero diferidos.
- UI/PDF/impresora física.
- Caja/turnos (cortes, fondo, recálculo).
- Modelo de promociones más allá del `discount_pct` por línea de precio.

## Decisions

### Decisión 1 — Dos módulos hexagonales: `customers` y `pos`

`Customer` vive en `src/modules/customers/` porque conceptualmente es un catálogo administrativo independiente — el cliente existe aunque nunca compre. Mismo patrón que `providers`. `Sale` y `SaleItem` viven en `src/modules/pos/` porque son un agregado transaccional cuyo ciclo de vida (crear/cancelar/editar) requiere orquestar cuatro recursos externos (`Product`, `ProductPrice`, `BranchInventory`, `Folio`).

**Alternativa descartada**: un único módulo `sales` que también gestione clientes. Mezcla CRUD administrativo (clientes) con flujo transaccional (POS); además el módulo de crédito futuro consumirá `customers` sin tocar `pos`.

### Decisión 2 — `Customer` con datos fiscales mexicanos + saldo de crédito

Tabla `customers` con los mismos campos fiscales que `providers` más:

- `credit_limit DECIMAL(12, 4) NULL` — límite de crédito (NULL = sin crédito permitido).
- `current_balance DECIMAL(12, 4) DEFAULT 0` — saldo actual adeudado por el cliente; positivo = debe; 0 = al corriente.

`rfc` es editable (a diferencia del `code`) y único. `code` inmutable y único, regex `^[A-Z0-9_]{1,32}$` consistente con el resto del sistema.

**Por qué `current_balance` se persiste pero NO se mueve desde el POS en este change**:

El crédito es un dominio amplio (vencimientos, intereses, abonos, conciliación). Modelarlo dentro de la primera versión del POS arrastra requisitos no resueltos. Decisión: el campo existe y se expone en `GET /api/v1/admin/customers/:id` para que la UI del POS pueda mostrar el aviso "este cliente tiene un adeudo de $X" en la pantalla de checkout, pero el backend **no incrementa** `current_balance` al completar una venta. Mover el saldo se difiere a `add-customer-credit`.

Esto cumple la regla del cliente ("mostrar mensaje de adeudo") sin implementar a medias el crédito.

### Decisión 3 — `Sale` como agregado con líneas snapshot

Tabla `sales` (encabezado) + `sale_items` (líneas). Decisiones clave:

- **Snapshot por línea**: `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate` se guardan **congelados** en cada `sale_item`. Si después se renombra el producto o se borra el precio, el ticket conserva la información histórica. `productId` y `productPriceId` siguen siendo FKs (con `productId ON DELETE RESTRICT` y `productPriceId ON DELETE SET NULL`) para reportes y trazabilidad.
- **Totales calculados y persistidos**: `lineSubtotal`, `lineTax`, `lineTotal` por línea; `subtotal`, `taxTotal`, `total` por encabezado. Persistir el cálculo evita recalcular en reportes y permite cambiar la fórmula sin re-escribir el histórico.
- **Estado**: `status VARCHAR(20)` con tres valores: `completed`, `cancelled`, `edited`. No hay estado `open`/`draft`: el carrito vive en el cliente; el `POST /sales` emite el ticket completo en una transacción.
- **Folio inmutable**: `folioId`, `folioNumber`, `folioCode` (snapshot del code del folio) se asignan al emitir y NO cambian al editar ni al cancelar (el folio sigue "consumido").

**Alternativa descartada**: estados `open → completed` con carrito persistido en BD. Sumaría latencia (1 round-trip por línea), requeriría limpieza de carritos abandonados y bloquearía folios en draft.

### Decisión 4 — `CreateSaleUseCase` ejecuta todo en una transacción Prisma

```ts
await prisma.$transaction(async (tx) => {
  // 1. Validar customer activo, branch activa, paymentMethod activo, folio activo.
  // 2. Para cada item: cargar product + productPrice; verificar consistencia
  //    (price.productId === item.productId, price activo, quantity > 0).
  // 3. Snapshotear: code, name, priceName, unitPrice, discountPct, ivaRate, iepsRate.
  // 4. Calcular totales con SaleTotalsCalculator (dominio puro).
  // 5. Asignar folio: UPDATE folios SET current_number = current_number + 1
  //    WHERE id = ? RETURNING current_number, code, prefix. (Atómico).
  // 6. Descontar inventario: por cada item, ejecutar
  //    UPDATE branch_inventory SET quantity = quantity - ${qty}, updated_at = NOW()
  //    WHERE branch_id = ? AND product_id = ?.
  //    Si afecta 0 filas → falta el registro de inventario para ese (branch, product)
  //    → CREATE inventory record con quantity = -qty (regla 4: stock negativo permitido).
  // 7. INSERT INTO sales (...) y sale_items (...).
});
```

Notas:

- El paso 6 **no** lleva la cláusula `WHERE quantity + delta >= 0` que sí tiene el admin `/adjust`. Esa es la implementación de la regla "vender con stock 0".
- El paso 5 es atómico aunque dos POS lleguen al mismo tiempo: Postgres serializa el UPDATE sobre la misma fila `folios.id`.
- Si cualquier paso falla, la transacción revierte todo: ni folio, ni stock, ni ticket.

**Alternativa descartada**: dos endpoints (`POST /sales` para crear draft, `POST /sales/:id/complete` para emitir). Inserta complejidad sin beneficio para la regla del cliente (la edición vive en `PATCH`, no en draft).

### Decisión 5 — `CancelSaleUseCase` restaura stock, no devuelve el folio

```ts
await prisma.$transaction(async (tx) => {
  // 1. Cargar sale; si status === 'cancelled' → idempotente: 200 sin tocar nada.
  // 2. Si status === 'completed' o 'edited': por cada item,
  //    UPDATE branch_inventory SET quantity = quantity + ${qty} WHERE id = ?
  //    (devolver al stock). El registro siempre existe porque la venta lo creó si faltaba.
  // 3. UPDATE sales SET status = 'cancelled', cancelled_at = NOW(),
  //    cancellation_reason = ?.
});
```

El folio NO se "libera": la numeración queda con el hueco. Razón: la regla fiscal mexicana exige folios consecutivos sin reuso. Reusar un folio cancelado para una venta nueva podría romper auditorías.

Cancelar una venta ya `cancelled` es idempotente (200 sin efectos). Cancelar una venta `edited` se permite (la edición se considera la última versión vigente; cancelar la cancela completa).

### Decisión 6 — `EditCompletedSaleUseCase`: solamente desde matriz

La regla del cliente dice "El ticket sólo debe poder editarse en la matriz". Modelado en dos capas:

1. **Permiso RBAC**: `sales:edit_completed` (sólo `admin`).
2. **Verificación de matriz**: en el controller, antes de invocar el use case:
   ```ts
   const userBranchId = req.headers.get('x-user-branch-id');
   const userHasAccessAll = await authz.userCan(userId, 'branches:access_all');
   const hq = await branchRepo.findHeadquarters();
   if (!userHasAccessAll && (!userBranchId || !hq || userBranchId !== hq.id)) {
     return 403 { error: 'Sales can only be edited from the headquarters branch' };
   }
   ```

Es decir, un admin sin `branchId` asignado (típico) que tenga `branches:access_all` puede editar desde donde sea; un operador que casualmente esté asignado a la sucursal matriz también podría — pero como no tiene `sales:edit_completed`, el guard previo lo rechaza con 403 antes.

`EditCompletedSaleUseCase` (transaccional):

```ts
await prisma.$transaction(async (tx) => {
  // 1. Cargar la venta; si status === 'cancelled' → 409 No editable.
  // 2. Cargar items viejos; restaurar el stock línea por línea
  //    (UPDATE branch_inventory ... SET quantity = quantity + qty).
  // 3. Borrar sale_items viejos.
  // 4. Reaplicar el flujo de Decisión 4 sobre los items nuevos
  //    (validar, snapshotear, decrementar stock, INSERT sale_items).
  // 5. Recalcular totales y UPDATE sales SET subtotal, tax_total, total,
  //    status = 'edited', edited_at = NOW().
});
```

El folio NO cambia. Si la edición deja el ticket vacío (`items.length === 0`) → 400 (eso se considera cancelación, debe usarse el endpoint correspondiente).

### Decisión 7 — Scoping por sucursal: token → middleware → guard → controller

| Capa | Responsabilidad |
|---|---|
| JWT | Claim `branchId: string \| null` en access y refresh. Login y register lo emiten desde `user.branchId`. |
| Middleware | Lee el claim verificado y propaga header `x-user-branch-id` (cadena vacía si null). |
| Permiso `branches:access_all` | Concedido a `admin`. Bypass del scoping: el usuario puede operar sobre cualquier `:branchId`. |
| Controller | Para cada handler que recibe `:branchId` en path **o** filtra por `branchId` en query: lee `x-user-branch-id`, evalúa `userCan(userId, 'branches:access_all')`. Si NO tiene bypass y el `branchId` solicitado ≠ `x-user-branch-id` → 403 `{"error": "Forbidden", "required": "branches:access_all"}`. |

Esto implica que en `GET /api/v1/admin/branches/:id/inventory`, `POST /api/v1/admin/sales`, `GET /api/v1/admin/sales?branchId=…` (entre otros), el controller aplica el chequeo **antes** de delegar al use case. El repo no filtra silenciosamente: si llega allí, ya está autorizado.

`GET /api/v1/admin/sales` sin `?branchId=` se interpreta como "ventas de mi sucursal" para usuarios sin bypass y "todas las sucursales" para usuarios con bypass. Esto se documenta en `pos-api`.

**Alternativa descartada**: un filtro automático en el repo (todas las consultas inyectan `WHERE branch_id = userBranchId`). Es opaco y dificulta tests; además, el admin necesita ver todo y se vuelve enrevesado activar el bypass.

### Decisión 8 — Sucursal matriz: `isHeadquarters` con índice único parcial

Una columna `is_headquarters BOOLEAN DEFAULT FALSE` en `branches` + `CREATE UNIQUE INDEX branches_hq_idx ON branches(is_headquarters) WHERE is_headquarters = TRUE`. Garantía: a lo más una sucursal puede ser matriz a la vez.

Crear/actualizar branch con `isHeadquarters: true` cuando ya existe otra → 409 `{"error": "Another branch is already marked as headquarters"}`.

**Alternativa descartada**: tabla `system_settings` con `hq_branch_id`. Más burocracia para una sola configuración. El boolean en `branches` es lo natural.

### Decisión 9 — `users.branchId String? @map("branch_id")` con FK SET NULL

Los admins habitualmente no pertenecen a una sucursal específica (`branchId = null`). Operarios sí. La FK `ON DELETE SET NULL` evita borrar usuarios cuando se elimina una sucursal (improbable pero posible si una sucursal cierra).

Asignar/limpiar `branchId` se hace vía `PATCH /api/v1/admin/users/:id` con campo `branchId: string | null`. La auto-protección (no editarse a sí mismo) se mantiene. Cambiar el `branchId` invalida la caché de permisos del usuario y obliga a refrescar el token para que el claim quede actualizado — esto se documenta en `admin-users`.

**Alternativa descartada**: tabla `user_branches` M:N. Sobreingeniería para v1. Si en el futuro un usuario debe rotar entre sucursales se evalúa migrar.

### Decisión 10 — `JWT.branchId` y backward-compat con tokens viejos

Access y refresh tokens incorporan `branchId: string | null`. La función de verificación devuelve `branchId: null` cuando el claim está ausente (tokens emitidos antes del deploy del change). El middleware propaga `x-user-branch-id: ""` en ese caso. Los controllers tratan cadena vacía como "sin sucursal asignada" — exactamente igual que `null` en BD.

El refresh token incluye `branchId` para que la rotación del access token no requiera consultar `users` al refrescar — el claim sobrevive la rotación. Cuando el admin reasigna `branchId` a un usuario, el cambio entra en vigor en el próximo login completo (max 15 min de access + 7 días de refresh), no inmediatamente. Esto se documenta como trade-off aceptable; si se requiere efecto inmediato, el admin invalida la sesión (logout forzado, fuera del scope).

### Decisión 11 — `branch_inventory.quantity` puede ser negativo, sólo desde el POS

La migración elimina el CHECK `quantity >= 0` de `branch_inventory`. El admin `POST /adjust` mantiene la cláusula `WHERE quantity + delta >= 0` y el error `NegativeStockNotAllowedError` — su contrato no cambia. El POS no usa `/adjust`: el `CreateSaleUseCase` ejecuta directamente `UPDATE ... SET quantity = quantity - ${qty}` dentro de la transacción.

Para registros que no existen (primera venta de un producto en esa sucursal), el use case crea el registro con `quantity = -qty`, dejando el `(branch_id, product_id)` inicializado en negativo. Esto cubre el caso "vender con stock 0" cuando ni siquiera había registro.

**Alternativa descartada**: flag `allow_negative` por registro de inventario. Mover la decisión a una columna es opaco — el contexto (POS vs admin) gobierna.

### Decisión 12 — Cálculo de totales como dominio puro

Servicio `SaleTotalsCalculator` en `src/modules/pos/domain/services/SaleTotalsCalculator.ts`. Sin dependencias de I/O. Recibe un array de `SaleLineInput { quantity, unitPrice, discountPct, ivaRate, iepsRate }` y devuelve `SaleTotalsResult { lines: SaleLineTotals[], subtotal, taxTotal, total }`.

Redondeo a 4 decimales por valor monetario (escala de la columna `Decimal(14, 4)`). Estrategia: convertir a centavos × 10000 (entero), operar, dividir, redondear half-even. Se entrega como función pura testeable; la UI hace su propio redondeo a 2 decimales para mostrar.

**Alternativa descartada**: calcular totales en el repo Prisma. Acopla cálculo a infraestructura y dificulta el test sin BD.

### Decisión 13 — Permisos RBAC (7 nuevos)

| Permiso | admin | operator | viewer |
|---|---|---|---|
| `customers:read` | ✅ | ✅ | ✅ |
| `customers:write` | ✅ | ✅ | ❌ |
| `sales:read` | ✅ | ✅ | ✅ |
| `sales:create` | ✅ | ✅ | ❌ |
| `sales:cancel` | ✅ | ✅ | ❌ |
| `sales:edit_completed` | ✅ | ❌ | ❌ |
| `branches:access_all` | ✅ | ❌ | ❌ |

- `operator` puede crear clientes "al vuelo" en la pantalla del POS (regla práctica: si el cajero nota un cliente nuevo, lo da de alta sin esperar a un admin).
- `sales:edit_completed` requiere además que el usuario esté en la matriz (chequeo combinado, ver Decisión 6).
- `branches:access_all` es el único permiso que rompe el scoping; admin lo necesita para ver dashboards multi-sucursal.

### Decisión 14 — Folio: snapshot del code en `sales.folio_code`

Al asignar el folio en `CreateSaleUseCase`, se guarda `folioId` (FK), `folioNumber` (número emitido) y `folioCode` (snapshot del `code` del folio, ej. `"VENTA"`). El folio se puede renombrar luego en el catálogo sin que el ticket pierda la identificación legible.

`sales(folio_id, folio_number)` es UNIQUE — protege contra emisión duplicada del mismo número en el mismo folio (red de seguridad ante condiciones de carrera en `current_number`).

### Decisión 15 — Métodos de pago: un único `paymentMethodId` por venta

El v1 modela un solo método de pago por venta. Si la realidad es múltiples (parte efectivo + parte tarjeta), se difiere a una tabla `sale_payments` futura sin romper el actual: el campo en `sales` quedará como "método dominante" o se migrará.

El método debe estar `isActive = true` al emitir; inactivo → 400.

### Decisión 16 — Listado de ventas: filtros por fecha + búsqueda por folio/cliente

`GET /api/v1/admin/sales` acepta:

- `branchId` (sometido a scoping; ver Decisión 7).
- `customerId` (opcional).
- `status` (`completed`/`cancelled`/`edited` — separados por coma para `IN`).
- `from`/`to` (ISO date, filtra por `completed_at` o, si null, por `created_at`).
- `search` (opcional, min 2 chars; matchea `folio_code || folio_number::text` y `customer.name`/`customer.rfc`).
- `page`/`pageSize` (igual que el resto).

Ordenado por `created_at DESC`. Default sin filtros devuelve los últimos 20.

## Risks / Trade-offs

- **Eliminar CHECK `quantity >= 0`** — Mitigación: documentado en migración + spec `inventory-api`; admin `/adjust` sigue rechazando; única ruta que puede dejar negativo es la venta; tests de integración cubren ambos comportamientos.
- **`current_balance` no se mueve desde el POS** — Mitigación: documentado como diferido a `add-customer-credit`. La UI muestra el saldo (lectura). Si esto resulta insuficiente para el cliente al usarlo, se prioriza el módulo de crédito.
- **Folio con huecos por cancelaciones** — Aceptado por regla fiscal mexicana. UI debe explicarlo al operador.
- **Concurrencia en `current_number` del folio** — Postgres serializa el `UPDATE folios SET current_number = current_number + 1 WHERE id = ?`. Bajo carga alta podría volverse cuello de botella, pero para tráfico admin v1 es aceptable. Si más adelante se requiere sharding por sucursal, se introduce `branch_folios` o `folios_per_branch`.
- **Edición de ticket pierde el "original"** — Al editar, la versión vieja se sobreescribe. Si se requiere historial, se introduce una tabla `sale_revisions` futura. Documentado.
- **Stock negativo de larga duración** — Si nadie hace traspaso, el inventario queda en rojo indefinidamente. El reporte `?belowReorder=true` no lo detecta porque `reorder_point >= 0 > quantity` también es cierto, pero conceptualmente "stock negativo" merece su propia consulta. Se difiere; en v1, la UI puede filtrar con `quantity < 0` sobre el `BranchInventoryDto`.
- **`branchId` en JWT requiere re-login para tomar efecto** — Trade-off documentado (Decisión 10). Para producción se puede acortar el TTL del refresh si resulta crítico.
- **No hay protección contra venta a cliente inactivo** — El use case rechaza `customer.isActive = false` con 400. Mismo trato para producto/sucursal/folio/método de pago inactivos.

## Migration Plan

1. `npm run build` — verifica tipos.
2. Crear migración: `npx prisma migrate dev --name add_pos_tables_and_branch_scoping`.
3. Editar manualmente el SQL generado para añadir/quitar lo que Prisma no expresa nativamente:
   - `ALTER TABLE branch_inventory DROP CONSTRAINT IF EXISTS branch_inventory_quantity_check;` (el nombre exacto depende del nombrado de Prisma; verificar con `\d+ branch_inventory`).
   - `CREATE UNIQUE INDEX branches_hq_idx ON branches(is_headquarters) WHERE is_headquarters = TRUE;`.
   - Mantener `CHECK (reserved_quantity >= 0)` y `CHECK (reorder_point >= 0)`.
4. Deploy: `npx prisma migrate deploy` (usa `DIRECT_URL`).
5. `npm run seed` — añade los 7 permisos nuevos y los asigna idempotentemente.
6. Validación manual con `curl` desde un admin:
   - Marcar una branch existente como matriz: `PATCH /api/v1/admin/branches/<id>` con `{ "isHeadquarters": true }`.
   - Crear un cliente: `POST /api/v1/admin/customers`.
   - Crear una venta con 2 líneas, una con descuento y otra con IVA 16% → verificar totales calculados.
   - Verificar `branch_inventory.quantity` decrementó.
   - Cancelar la venta → verificar `quantity` restaurado.
   - Crear otra venta de un producto sin registro de inventario → verificar `quantity = -qty` después.
   - Login como `operator` asignado a una sucursal distinta → `GET /api/v1/admin/sales?branchId=<otra>` → 403.
   - Login como `operator` en sucursal matriz → `PATCH /api/v1/admin/sales/:id` → 403 (le falta `sales:edit_completed`).
   - Login como `admin` → mismo PATCH → 200.

Rollback:

1. Revertir el commit del código.
2. `ALTER TABLE branch_inventory ADD CONSTRAINT branch_inventory_quantity_check CHECK (quantity >= 0);` (sólo si todas las filas son >= 0 — auditar antes con `SELECT COUNT(*) FROM branch_inventory WHERE quantity < 0`; si hay filas negativas, decidir si normalizar a 0 o abortar rollback).
3. `DROP TABLE sale_items, sales, customers CASCADE;`.
4. `ALTER TABLE users DROP COLUMN branch_id;`.
5. `ALTER TABLE branches DROP COLUMN is_headquarters;`.
6. `DROP INDEX branches_hq_idx;`.
7. Eliminar los 7 permisos nuevos.

## Open Questions

- **¿`current_balance` se inicializa con un valor distinto a 0 para clientes migrados desde legacy?** → Sí, vía SQL puntual; documentar en el script de migración brownfield (cuando llegue).
- **¿Múltiples folios por sucursal?** → No en v1. Una sucursal usa el folio que le indica el cliente al emitir. La UI puede recordar el último usado.
- **¿`sales:edit_completed` permite cambiar el cliente del ticket?** → Sí. La edición es "matriz puede ajustar todo": items, cliente y método de pago. Folio NO cambia.
- **¿Cancelar un ticket editado restaura el stock de la versión vigente?** → Sí. Las líneas vigentes son las que están en `sale_items` después de la edición; ésas se devuelven al inventario.
- **¿Operator puede cancelar una venta hecha por otro operator de la misma sucursal?** → Sí. La cancelación está sujeta al scoping de sucursal y al permiso `sales:cancel`, no a la identidad del cajero original. Si se quiere restringir a "sólo quien la creó", se añade en versión posterior.
- **¿`creditLimit` se valida contra `currentBalance` al vender?** → No en v1 (la regla es "no bloquear"; sólo advertir). Cuando llegue `add-customer-credit`, se podrá configurar bloqueo opcional.
- **¿Stock negativo dispara alerta automática?** → No en v1. Se reservará para `add-stock-alerts` cuando exista el módulo de notificaciones.
- **¿Necesitamos un endpoint `POST /api/v1/admin/branches/headquarters` para clarificar la operación?** → No; se gestiona vía PATCH normal. Si la UI lo necesita explícito, se añade luego.
