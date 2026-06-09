## Context

El sistema ya posee:

- 12 módulos hexagonales (`auth`, `rbac`, `users`, `payment-methods`, `folios`, `departments`, `branches`, `providers`, `products`, `inventory`, `customers`, `pos`) más el reciente `quotes` (change `add-quotes-crud`, 2026-06-01).
- RBAC con caché de 60s, `requirePermission` guard, y el bypass `branches:access_all`.
- JWT con `roles[]` y `branchId`, middleware que propaga `x-user-id`, `x-user-email`, `x-user-roles`, `x-user-branch-id`.
- POS atómico: emisión, cancelación, edición — con snapshot por línea y `SaleTotalsCalculator` puro.
- Inventario por sucursal que ya acepta stock negativo originado por venta (la migración `add-pos` eliminó el CHECK `quantity >= 0`); el incremento/decremento se hace vía `UPDATE branch_inventory SET quantity = quantity ± qty ...` atómico.
- Helper compartido `enforceBranchScope(req, resourceBranchId)` ya probado en `pos-api`, `inventory-api` y `quotes-api`.
- Catálogo de `folios` con `current_number` atómico (no se usa en este change — ver Decisión 4).

Las cinco reglas del cliente son claras pero requieren decisiones arquitectónicas:

1. **"Registrar la devolución de un producto"** — implica modelar un agregado `Return` con líneas, no extender `Sale`.
2. **"Quitarse del ticket y reingresar al inventario"** — interpretado como: "al cancelar la devolución, el producto deja de estar devuelto" (el efecto sobre el inventario y el ticket se revierte). La inmutabilidad del ticket original es una ganancia: nunca tocamos `sales`/`sale_items` directamente.
3. **"Enlazado a un ticket + motivo + fecha obligatorios"** — `saleId` NOT NULL en `returns`; `reason` y `returnedAt` NOT NULL.
4. **"Permisos para devoluciones"** — 3 permisos nuevos (`returns:read/create/cancel`); NO se heredan de `sales:*`.
5. **"Operador sólo su sucursal, admin todas"** — branch scoping idéntico al de POS.

El change se construye sobre el patrón ya validado por `add-pos` y `add-quotes-crud`: módulo hexagonal independiente, repositorio Prisma + InMemory, controller Zod, DI container exportando el controller consumido por los route handlers de `app/api/v1/admin/`.

## Goals / Non-Goals

**Goals:**

- Modelar `Return` y `ReturnItem` como agregado independiente que enlaza con `Sale`/`SaleItem` por FK, manteniendo la inmutabilidad del ticket original.
- Validar invariante "suma de devoluciones activas por línea de venta ≤ cantidad vendida" como servicio de dominio puro testeable.
- Operación atómica `crear devolución` que (a) valida líneas contra el ticket, (b) snapshotea, (c) restaura inventario por línea, (d) persiste encabezado + líneas — todo en una sola transacción Prisma.
- Operación atómica `cancelar devolución` que revierte exactamente lo que la creación hizo: re-decrementa inventario y marca el estado como `cancelled`.
- Aplicar el patrón de scoping por sucursal vía helper compartido, sin re-implementarlo.
- Exponer "cantidad ya devuelta por línea" en el `SaleDetailDto` para que la UI del ticket pueda renderizar "Devuelto: X / Y" sin un round-trip extra.

**Non-Goals:**

- Devoluciones sobre tickets `cancelled` o `edited`.
- Generación de notas de crédito CFDI (egreso fiscal).
- Reembolso automático al saldo del cliente.
- Cambios de producto (devolver A + entregar B en un solo flujo).
- Re-activar una devolución cancelada.
- UI/frontend.

## Decisions

### Decisión 1 — Módulo separado `returns`, NO sub-recurso de `pos`

`Return` vive en `src/modules/returns/`, no como sub-recurso de `pos`. Razones:

- La devolución es un **agregado comercial independiente** con ciclo de vida propio (`completed → cancelled`) y motivación distinta (recibir mercancía, no venderla). Mezclarla con `sales` (que ya tiene `completed`/`cancelled`/`edited`) sobrecarga el módulo del POS con una semántica ajena.
- El `Sale` ya está saturado de responsabilidad (folio fiscal, snapshot, decremento, edición en matriz, enlace con cotización). Añadir devoluciones lo vuelve hostil para mantener.
- El test del `ReturnableQuantityCalculator` se diseña como puro y aislado; mantenerlo en otro paquete preserva la regla "lo devolvible nunca excede lo vendido" como contrato.

**Alternativa descartada**: añadir un flag `is_returned` o una columna `returned_quantity` directamente en `sale_items`. Pierde la trazabilidad de QUIÉN devolvió, CUÁNDO, POR QUÉ, y CUÁNTAS devoluciones distintas se hicieron sobre la misma línea. Además complica la cancelación de la devolución (¿cómo distingo de qué devolución revierto el `returned_quantity`?).

### Decisión 2 — Estados de `Return`: `completed → cancelled`

Sólo dos estados, ambos terminales en el grafo:

```
completed (al crear) ──► cancelled (al invocar /cancel)
                            ▲
                            └── no se puede salir de cancelled
```

- `completed`: el momento en que el operador "registra la devolución". El inventario YA se incrementó. NO hay borrador (`draft`) — el carrito de devolución vive en cliente.
- `cancelled`: terminal. La devolución "dejó de estar vigente", el inventario YA se re-decrementó. NO se permite re-cancelar (409) ni re-activar.

**Por qué no añadir `draft`**: el flujo es corto (5-10 segundos en el counter); no aporta valor el ciclo borrador → completado. Si en el futuro se requiere autorización de un supervisor antes de aceptar la devolución, se introduce el estado en una versión posterior.

**Por qué no idempotencia silenciosa en `cancel`**: cancelar dos veces probablemente sea un click duplicado del operador y conviene avisar (409 explícito), igual que `cancel quote`.

### Decisión 3 — Snapshot por línea heredado de `sale_items`

`ReturnItem` referencia el `sale_item_id` original Y snapshotea: `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`, `quantity` (la devuelta), `lineSubtotal`, `lineTax`, `lineTotal`. Razones:

- La devolución debe sobrevivir a una eventual edición de la venta (si la implementación de edición cambia las líneas) o renames del catálogo.
- El reporte "qué se devolvió en marzo" debe ser exacto sin necesidad de JOIN al estado actual de `products`/`product_prices`.
- Los totales de reembolso se calculan localmente sin re-resolver el catálogo.

`saleItemId` (FK `ON DELETE RESTRICT`) sigue siendo obligatorio. `productId` (FK `ON DELETE RESTRICT`) y `productPriceId` (FK `ON DELETE SET NULL`) se conservan para reportes (igual que en `sale_items`).

### Decisión 4 — NO se asigna folio a la devolución

A diferencia de la venta y la cotización, la devolución NO consume un folio del catálogo `folios`. Razones:

- El folio del POS tiene reglas fiscales SAT (consecutivo sin huecos, identifica CFDIs). La devolución no es un CFDI por sí sola — la nota de crédito SAT se construirá en un módulo futuro (`add-credit-notes-cfdi`) y entonces usará su propio folio.
- La referencia humana de la devolución es "Devolución contra ticket COT/A-1024", no un número propio. El frontend lo arma como `RET-<últimos 6 del id>` o muestra `id` directamente — es decisión de UI, no de backend.
- Evita acoplar este change con la creación de un nuevo `code` en `folios` para que el admin lo cree antes del primer deploy.

**Trade-off**: si el cliente decide mañana que necesita "Devolución RET-0001, RET-0002, ...", añadir `folioId/folioNumber/folioCode` a `returns` es una migración aditiva sin romper el contrato actual. El cost-of-deferring es bajo.

### Decisión 5 — `CreateReturnUseCase` orquesta una sola transacción Prisma

```ts
await prisma.$transaction(async (tx) => {
  // 1. Cargar la venta (`saleRepo.findByIdWithItems`); si no existe → ReturnNotFoundError mapeado a 400.
  // 2. Verificar sale.status === 'completed' (sino → SaleNotReturnableError(status)).
  // 3. Branch scoping: verificar sale.branchId === x-user-branch-id (o bypass por branches:access_all).
  //    NOTA: aplicado en el controller, no en el use case.
  // 4. Para cada item del body:
  //    a. Verificar que `saleItemId` pertenece a esta venta (sino → SaleItemNotPartOfSaleError).
  //    b. Cargar devoluciones activas previas de esta sale_item (sumar quantity en returns
  //       cuyos status='completed').
  //    c. remainingQty = saleItem.quantity - sum(activeReturnItems.quantity).
  //    d. Validar item.quantity <= remainingQty (sino → ReturnQuantityExceedsRemainingError).
  // 5. Snapshotear cada línea desde el sale_item correspondiente: code, name, priceName,
  //    unitPrice, discountPct, ivaRate, iepsRate.
  // 6. Calcular totales con ReturnTotalsCalculator (misma fórmula que SaleTotalsCalculator).
  // 7. Para cada item, INCREMENTAR inventario:
  //    UPDATE branch_inventory
  //    SET quantity = quantity + ${qty}, updated_at = NOW()
  //    WHERE branch_id = ? AND product_id = ?
  //    Si afecta 0 filas (no existe el registro): INSERT con quantity=qty.
  // 8. INSERT INTO returns (...) y return_items (...). status='completed', returnedAt=body.returnedAt.
  // 9. customer_id_snapshot = sale.customer_id (puede ser NULL si la venta no tenía cliente).
});
```

**Por qué incremento via UPDATE atómico y NO via el use case del inventario**: el `POST /inventory/.../adjust` admin tiene una protección `WHERE quantity + delta >= 0` que NO aplica aquí (el incremento siempre es positivo). Reusar `adjust` introduciría dependencia entre módulos y un round-trip innecesario. El patrón directo es idéntico al que `CancelSaleUseCase` ya usa para restaurar stock.

**Por qué exigir `saleId` obligatorio y no aceptar "devolución libre sin ticket"**: regla explícita del cliente. Una devolución sin ticket es un alta de inventario disfrazada (usar `POST /inventory` o `POST /inventory/.../adjust`).

### Decisión 6 — `CancelReturnUseCase` re-decrementa inventario (idempotente NO)

```ts
await prisma.$transaction(async (tx) => {
  // 1. Cargar la devolución con items.
  // 2. Si status === 'cancelled' → ReturnAlreadyCancelledError (409, NO idempotente).
  // 3. Para cada item: UPDATE branch_inventory SET quantity = quantity - ${qty} ...
  //    Si quedan filas afectadas: OK. Si NO existe el registro (caso edge: alguien
  //    borró `branch_inventory` entre la devolución y la cancelación), INSERT con
  //    quantity=-qty (consistente con la regla del POS: stock negativo permitido).
  // 4. UPDATE returns SET status='cancelled', cancelled_at=NOW(), cancellation_reason=?.
});
```

**Cancelación NO toca `sales`**. El ticket original sigue intacto (igual que antes y después de la devolución). Lo único que cambia es: (a) `returns.status='cancelled'` y (b) `branch_inventory.quantity` vuelve al valor previo a la devolución.

**Por qué NO es idempotente**: ver Decisión 2 — un re-click es probablemente un error que conviene visibilizar.

**Por qué permitir que cancelación deje stock negativo**: si el operador devolvió 5 unidades a las 10:00 (`branch_inventory.quantity` pasa de 0 a 5), luego a las 10:15 otro vendió esas 5 (`quantity` vuelve a 0), y a las 10:30 alguien cancela la devolución, el resultado sería `quantity = -5`. Eso es semánticamente correcto: "registramos una devolución que no debió suceder, y ya vendimos las unidades que entraron por error". Rechazar la cancelación es peor — deja al sistema con una devolución vigente que el operador ya supo que era inválida. El stock negativo aquí refleja una **deuda real de inventario** que debe corregirse por transferencia o ajuste manual.

**Trade-off declinado**: añadir un flag opcional `force: boolean` al body que sí permita rechazar cancelaciones si dejarían negativo. Se omite en v1 por simplicidad; si el negocio lo requiere se añade después.

### Decisión 7 — `ReturnableQuantityCalculator` (servicio de dominio puro)

```ts
class ReturnableQuantityCalculator {
  static computeRemaining(
    soldQuantity: Decimal,
    priorReturnItems: { quantity: Decimal; returnStatus: 'completed' | 'cancelled' }[]
  ): Decimal {
    const returned = priorReturnItems
      .filter(r => r.returnStatus === 'completed')
      .reduce((sum, r) => sum.plus(r.quantity), new Decimal(0));
    return soldQuantity.minus(returned);
  }
}
```

Servicio puro en `src/modules/returns/domain/services/`. Sin I/O. Test unitario obligatorio cubre: sin devoluciones previas, con una devolución, con varias devoluciones acumulativas, con una devolución cancelada (que no cuenta), con devolución total (remaining = 0), con valores fraccionarios.

**Por qué un servicio y no un método de `SaleItem`**: `SaleItem` vive en `src/modules/pos/domain/` y no debe importar nada de `returns`. Invertir la dirección (importar `SaleItem` desde `returns`) es legítimo y mantiene el dominio del POS limpio.

### Decisión 8 — `ReturnTotalsCalculator` puro y equivalente al de POS

Implementación copia 1:1 de `SaleTotalsCalculator` en `src/modules/returns/domain/services/ReturnTotalsCalculator.ts`. Misma firma, misma fórmula, mismo redondeo half-to-even a 4 decimales. El campo de cabecera se llama `refundSubtotal`/`refundTax`/`refundTotal` (el método retorna las mismas claves `subtotal`/`taxTotal`/`total` para reaprovechar el tipo `SaleTotalsResult`, y el use case las mapea al DTO con esos nombres).

**Test de equivalencia**: en `tests/unit/modules/returns/domain/services/ReturnTotalsCalculator.test.ts` se incluye un bloque que itera sobre los mismos vectores de entrada del fixture compartido `tests/fixtures/totals-vectors.ts` y verifica que los resultados sean **exactamente** iguales a los de `SaleTotalsCalculator` / `QuoteTotalsCalculator`. Si en el futuro alguien cambia uno y olvida el otro, el test rompe.

**Por qué no extraer a un servicio compartido en `src/shared/`**: tres copias todavía no justifican la mudanza (regla "tres similar lines is better than premature abstraction" + el guardrail del test de equivalencia detecta divergencias). Cuando aparezca un cuarto consumidor se evalúa la promoción.

### Decisión 9 — `returnedQuantityBySaleItem` en `SaleDetailDto`

`PrismaSaleRepository.findByIdWithItems` se extiende para, además de cargar `sale_items`, hacer un `SELECT sale_item_id, SUM(quantity) FROM return_items ri JOIN returns r ON r.id = ri.return_id WHERE r.sale_id = ? AND r.status = 'completed' GROUP BY sale_item_id` y armar `returnedQuantityBySaleItem: Record<string, number>` en el DTO. Si la devolución acumulada por una línea es 0, la clave NO aparece en el record (el front interpreta "ausencia → 0").

**Por qué en el DTO de detalle y no en el de lista**: el detalle ya es un round-trip dedicado y este agregado no tiene costo notable (un JOIN); en la lista de ventas tendría que ser un JOIN por cada fila visible y crece con la paginación.

**Por qué un Record y no un array**: facilita el lookup O(1) en el cliente sin construir un Map.

### Decisión 10 — Permisos RBAC (3 nuevos)

| Permiso | admin | operator | viewer |
|---|---|---|---|
| `returns:read` | ✅ | ✅ | ✅ |
| `returns:create` | ✅ | ✅ | ❌ |
| `returns:cancel` | ✅ | ✅ | ❌ |

`operator` recibe `returns:create` Y `returns:cancel` porque en el counter es la misma persona que registra y cancela. Si una empresa quiere segregar (ej. "sólo supervisor cancela"), el admin revoca `returns:cancel` del rol `operator` y crea un rol `sales_supervisor` con sólo ese permiso.

**Por qué no `returns:edit` (análogo a `sales:edit_completed`)**: editar una devolución es semánticamente "cancelar y crear otra" — no compensa la complejidad de revertir/reaplicar inventario. La cancelación + recreación es atómica desde el lado del cliente.

**Por qué NO `branches:access_all` en este change**: ya existe y se reutiliza tal cual.

### Decisión 11 — Branch scoping reutilizando `enforceBranchScope`

El controller `ReturnsController` aplica el patrón:

```ts
// Para POST /returns: el branchId se resuelve desde el sale_id del body.
const sale = await saleRepo.findById(body.saleId);
if (!sale) return 400 "Sale not found";
const bypass = await authz.userCan(userId, "branches:access_all");
if (!bypass && sale.branchId !== req.headers.get("x-user-branch-id")) return 403;

// Para GET /returns/:id, POST /returns/:id/cancel: cargar el return,
// resolver return.branchId, aplicar el mismo guard.

// Para GET /returns sin ?branchId=: resolver via resolveScopedBranchId(req).
```

Mismo patrón que `SalesController`. Para `GET /returns` sin `?branchId=`, el comportamiento es idéntico al de `GET /sales`: usuario sin bypass → filtro implícito por `x-user-branch-id`; sin sucursal asignada → 403.

**El body de `POST /returns` NO acepta `branchId`** — se hereda obligatoriamente de `sale.branchId`. Esto bloquea el ataque "devolver a otra sucursal para inflar mi inventario".

### Decisión 12 — Listado: filtros básicos + búsqueda

`GET /api/v1/admin/returns` acepta:

- `branchId` (sometido a scoping).
- `customerId` (opcional).
- `saleId` (opcional).
- `status` (opcional, comma-separated entre `completed`/`cancelled`).
- `from`/`to` (ISO date, filtra por `returned_at`).
- `search` (opcional, min 2 chars; matchea `sale.folio_code`, `sale.folio_number::text`, `customer.name`/`customer.rfc`).
- `page`/`pageSize` (igual que el resto, máx 100).

Ordenado por `returned_at DESC, created_at DESC`.

### Decisión 13 — `returns_no_inventory_check_on_create` (sólo restaura, no decrementa)

`CreateReturnUseCase` SOLAMENTE incrementa `branch_inventory.quantity`. NO valida nada del estado actual del stock (puede estar negativo, cero, o positivo) — el incremento simplemente lo sube por la cantidad devuelta. Esto es congruente con la asimetría del POS:

- POS / Cancel return → decrementa, permite negativo (regla del POS).
- POS / Cancel sale → incrementa, sin restricción.
- Returns / Create → incrementa, sin restricción (igual que cancel sale).
- Returns / Cancel → decrementa, permite negativo (regla del POS).

### Decisión 14 — Body de `POST /returns` y `POST /returns/:id/cancel`

`POST /returns`:

```json
{
  "saleId": "<uuid>",
  "reason": "Producto en mal estado",
  "returnedAt": "2026-06-02T10:30:00.000Z",
  "items": [
    { "saleItemId": "<uuid>", "quantity": 2.5 },
    { "saleItemId": "<uuid>", "quantity": 1 }
  ],
  "notes": "Cliente prefiere cambio en próxima visita"
}
```

- `saleId`, `reason`, `returnedAt`, `items` son obligatorios.
- `items.length >= 1` (vacío → 400 `EmptyReturnError`).
- `reason: string` (min 3, max 500 chars). Sin enum cerrado — el cliente prefirió texto libre; documentar como mejora futura un catálogo de motivos (`return_reasons`).
- `returnedAt: ISO 8601` con refine `new Date(v) <= new Date()` (no se aceptan fechas futuras). NO se valida que `returnedAt >= sale.completedAt` en v1: el operador puede backdate una devolución (caso real: capturas a destiempo). Documentado.
- `notes?: string | null` max 1000 chars.
- `items[].saleItemId` UUID; `items[].quantity` decimal `> 0` (Decimal(14,4)).

`POST /returns/:id/cancel`:

```json
{
  "reason": "Devolución registrada por error"
}
```

- `reason: string | null` (max 500 chars).

### Decisión 15 — `Return.customerId` es snapshot, no FK live

`returns.customer_id` se persiste con el valor de `sale.customer_id` al momento de crear la devolución. La FK existe (`Customer? @relation(..., onDelete: SetNull)`) para consultas, pero la devolución NO se "des-asigna" si el cliente se vuelve inactivo o se borra. La consulta de listado usa la FK para joins.

**Por qué NO `customerId` en el body**: el cliente de la devolución SIEMPRE es el cliente de la venta (regla de coherencia). Si la venta no tenía cliente (`customer_id` NULL), la devolución tampoco.

## Risks / Trade-offs

- **Duplicación de `ReturnTotalsCalculator` ↔ `SaleTotalsCalculator` ↔ `QuoteTotalsCalculator`** — Mitigación: test de equivalencia obligatorio sobre vectores compartidos. La tercera copia activa el umbral "promover a `src/shared/domain/services/`" en el próximo change que requiera totales (no en este).
- **Cancelación de devolución puede dejar stock negativo** — Aceptado y documentado: refleja una deuda real. Si el cliente se queja, se introduce el flag `force: boolean` en una versión posterior.
- **El `customer_id` snapshot puede divergir del `sale.customer_id` actual si la venta es editada** — Trade-off aceptado: la devolución representa el estado de la venta en el momento de la devolución, no la venta actualmente.
- **El folio NO se asigna a devoluciones** — Trade-off declarado: si surge la necesidad, es una migración aditiva (no breaking).
- **`returnedAt` puede ser anterior a `sale.completedAt`** — Riesgo bajo: el operador podría backdate maliciosamente. Mitigación: la decisión más segura es validar `returnedAt >= sale.completedAt` y `returnedAt <= NOW()`. Se difiere a "Open Question" — preguntar al cliente si exige esta validación o prefiere flexibilidad.
- **Tickets `edited` no son devolvibles en v1** — Trade-off: simplifica la lógica de validación (las líneas pueden haber cambiado entre versiones). Si el cliente lo requiere, se añade en una iteración posterior calculando "cuánto se devolvió antes de la última edición" — no trivial.
- **No hay autoría/aprobación de la cancelación** — Trade-off: `returns:cancel` lo decide cualquiera con el permiso. Si se requiere "sólo el creador o un admin", se añade `cancelledBy` y un check en el use case. Diferido.
- **Sin nota de crédito CFDI** — Diferido a `add-credit-notes-cfdi`. El registro de la devolución en este change es prerrequisito de ese módulo futuro.
- **`returns:create` permite devolver cualquier venta de la sucursal asignada, independientemente de quién la facturó** — Trade-off aceptado por simplicidad. Si se quiere "sólo el cajero original o un supervisor puede devolver", se añade un check de `cashierId` o un permiso `returns:create_others`.

## Migration Plan

1. `npm run build` — verifica tipos.
2. Editar `prisma/schema.prisma`: añadir modelos `Return` y `ReturnItem`. Añadir relaciones inversas en `Sale` (`returns Return[]`), `SaleItem` (`returnItems ReturnItem[]`), `Branch` (`returns Return[]`), `Customer` (`returns Return[]`), `User` (`returnsCreated Return[] @relation("UserReturnsCreated")` y `returnsCancelled Return[] @relation("UserReturnsCancelled")`), `Product` y `ProductPrice` (`returnItems ReturnItem[]`).
3. Crear migración: `npx prisma migrate dev --name add_returns_tables`.
4. Verificar el SQL generado:
   - Tablas `returns` y `return_items` creadas con todos los índices listados.
   - Tipos: `returns.subtotal/tax_total/total` son `DECIMAL(14, 4)`; `return_items.quantity` es `DECIMAL(14, 4)`; `returns.returned_at/created_at/updated_at/cancelled_at` son `TIMESTAMP(3)`; `returns.creator_id/cancelled_by` son `UUID`.
   - Añadir manualmente si Prisma no lo hace: `CHECK (subtotal >= 0)`, `CHECK (tax_total >= 0)`, `CHECK (total >= 0)` en `returns`; `CHECK (quantity > 0)` en `return_items`.
5. Deploy: `npx prisma migrate deploy` (usa `DIRECT_URL`).
6. `npm run seed` — añade los 3 permisos nuevos y los asigna idempotentemente.
7. Validación manual con `curl` desde un operador:
   - Crear una venta vía `POST /sales`.
   - `POST /returns` con `saleId` + 1 item + reason + returnedAt → 201; verificar inventario incrementado.
   - `POST /returns` segundo intento con cantidad mayor a remaining → 409 `ReturnQuantityExceedsRemainingError`.
   - `POST /returns/:id/cancel` → 200, inventario revertido, status='cancelled'.
   - `POST /returns/:id/cancel` segunda llamada → 409 `ReturnAlreadyCancelledError`.
   - Login como operator de OTRA sucursal → `POST /returns` con `saleId` de la primera → 403.
   - Login como admin → mismo intento → 201 (bypass via `branches:access_all`).
   - `GET /sales/:saleId` → 200 con `returnedQuantityBySaleItem` mostrando lo devuelto y NO contando la devolución cancelada.

Rollback:

1. Revertir el commit del código.
2. `DROP TABLE return_items CASCADE;`
3. `DROP TABLE returns CASCADE;`
4. Eliminar los 3 permisos nuevos (`DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE key LIKE 'returns:%');` luego `DELETE FROM permissions WHERE key LIKE 'returns:%';`).

## Open Questions

- **¿`returnedAt` debe estar acotado por `sale.completedAt <= returnedAt <= NOW()`?** → Diferido a aclaración del cliente. Default propuesto: sólo `<= NOW()` (permite backdating de capturas tardías). Cambiarlo a más estricto es trivial.
- **¿Devolver un ticket `edited` debe permitirse?** → No en v1. La regla "qué línea es devolvible" es ambigua tras una edición. Si el cliente lo exige, se añade en una iteración: el sistema usaría sólo los `sale_items` actuales del ticket.
- **¿Debe haber un catálogo de motivos (`return_reasons`)?** → No en v1. `reason: string` libre. Si el cliente lo requiere, se añade en `add-return-reasons-catalog`.
- **¿La devolución debe afectar el `customer.currentBalance`?** → No en este change. `currentBalance` sigue read-only. Se aborda en `add-customer-credit`.
- **¿El operador puede cancelar SU propia devolución sin permiso `returns:cancel`?** → No. La separación de permisos `create` vs. `cancel` es deliberada (segregación opcional).
- **¿La cancelación de la devolución debe ser idempotente (200 silencioso) en lugar de 409?** → No en v1. Decisión simétrica con `cancel quote`. Si causa fricción, se cambia.
- **¿La cancelación debe verificar que `returnedAt + N días < NOW()` (TTL para arrepentirse)?** → No en v1. Sin TTL.
- **¿`reason` debe normalizarse a `trim()` + truncar a max chars?** → Sí, en el controller (Zod `.trim().min(3).max(500)`).
- **¿Cuál es el comportamiento si la sucursal del usuario cambia entre que crea la devolución y la cancela?** → Se aplica scoping en `cancel` también. Si la devolución es de otra sucursal y el usuario perdió el bypass → 403. Consistente con `cancel sale`.
- **¿`POST /returns` debe rechazar si TODOS los items ya están totalmente devueltos en otras devoluciones?** → Sí, vía la validación `quantity <= remainingQty` por línea (si `remaining = 0`, cualquier `quantity > 0` falla).
