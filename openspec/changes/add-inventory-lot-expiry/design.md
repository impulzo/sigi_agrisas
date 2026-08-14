## Context

Ver `proposal.md` - Why. Restricción de arquitectura clave: `branch_inventory.quantity` es un agregado por `(branch, product)` — el diseño original del módulo de inventario descartó explícitamente lotes/series por producto (`openspec/changes/archive/2026-05-29-inventory-backend/design.md`). Este cambio NO revierte esa decisión: `inventory_lots` es una tabla de metadata append-only, no una partición del stock. Ventas (`pos-api`), devoluciones (`returns-api`) y ajustes (`inventory-api`) siguen sin conocer lotes y no se tocan en este cambio.

## Goals / Non-Goals

**Goals:**
- Capturar lote + fecha de caducidad, opcionalmente, por línea de compra (Historia #1).
- Exponer un semáforo (`expiryStatus`) por producto+sucursal en las respuestas de inventario, calculado sobre el lote más próximo a vencer (Historia #2).
- Mantener la transacción de compra/cancelación existente como única fuente de verdad — la escritura de lotes vive dentro de esas mismas transacciones, sin nuevos endpoints.

**Non-Goals:**
- No se implementa descuento de inventario por lote específico (FEFO) — `branch_inventory.quantity` sigue siendo el agregado.
- No hay endpoint para editar/eliminar un lote manualmente, ni reportes/kardex por lote.
- No se resuelve la limitación de que el semáforo no sabe si el lote específico ya se vendió (ver Riesgos).

## Decisions

**1. Nueva tabla `inventory_lots`, no columnas en `branch_inventory` ni en `purchase_items`.**
Un producto puede tener múltiples compras con distintas caducidades a lo largo del tiempo; una columna única en `branch_inventory` sólo podría guardar el último dato capturado, perdiendo el resto. `purchase_items` ya es un snapshot inmutable de la línea de compra — mezclar ahí un dato mutable-en-efecto-de-cancelación (el lote se borra al cancelar la compra, el `purchase_item` no) rompería esa semántica. Tabla separada, FK a `purchase_items`, resuelve Historia #1 (AC: "se crea 1 registro en `inventory_lots` por línea") sin tocar el resto del modelo de compras.

**2. `inventory_lots` es append-only ligado a compras, no un tracker de stock por lote.**
La alternativa (inventario real por lote, FEFO) fue explícitamente descartada por el usuario en la fase de planeación — cambio arquitectónico grande que tocaría POS, devoluciones, ajustes y kardex, y el módulo de inventario ya documentó esa exclusión como decisión de diseño. Se acepta la limitación: el `expiryStatus` refleja la caducidad más próxima *registrada*, no la de la mercancía físicamente disponible (ver Riesgos).

**3. `PrismaPurchaseRepository.createCompleted` genera los `id` de `PurchaseItem` explícitamente antes del insert anidado.**
Prisma no devuelve los ids de un `create` anidado (`purchase.items.create`) indexados de forma directa dentro de la misma llamada; para poder referenciar `purchaseItemId` en el insert de `inventory_lots` dentro de la misma transacción, se generan los ids con `randomUUID()` (mismo patrón ya usado para `purchaseId` en la línea 176) antes del `tx.purchase.create`, y se pasan explícitamente en `items.create`.

**4. El cálculo de `expiryStatus` vive en un servicio de dominio puro (`ExpiryStatusCalculator`), no en SQL ni en el controller.**
Mismo patrón que `SaleTotalsCalculator`/`QuoteTotalsCalculator` — lógica de negocio testeable sin I/O. La query a `inventory_lots` sólo trae la fecha más próxima (`MIN(expiration_date)` vía `DISTINCT ON`); el cálculo de umbral (ok/warning/critical) es un `if` puro sobre la diferencia de días, evaluado en el use case con `new Date()` como reloj.

**5. Enriquecimiento de `BranchInventoryDto` ocurre en el use case (`ListBranchInventoryUseCase`/`GetBranchInventoryItemUseCase`), no en el mapper `toBranchInventoryDto`.**
El mapper es puro y sólo conoce `BranchInventoryView`; inyectarle awareness de lotes rompería su forma actual (recibe `{ inventory, productCode, productName }`, no async). El use case ya orquesta repos — pide el mapa de caducidades vía el nuevo puerto `InventoryLotRepository` en batch (todos los `productId` de la página) y post-procesa los DTOs. Evita N+1: una sola query por página, no una por producto.

**6. Validación "par completo o ninguno" duplicada en backend (Zod `.refine()`) y frontend (mismo patrón), backend es la autoridad.**
Igual que el resto del repo (`CLAUDE.md`: "Validación Zod ocurre en el controller"). El frontend replica la regla sólo para UX (feedback inmediato), no como única defensa.

## Riesgos / Trade-offs

- **[Riesgo] `expiryStatus` puede mostrar alerta para stock ya vendido** (metadata simple no descuenta por lote) → Mitigación: documentado explícitamente en Historia #2 y en la spec `inventory-lots` como limitación aceptada; el usuario decidió este trade-off en la fase de planeación a cambio de evitar un cambio arquitectónico mayor (FEFO). Reconciliación queda como proceso manual, igual que ya ocurre con el caso de cancelación de venta + devoluciones vigentes documentado en `CLAUDE.md`.
- **[Riesgo] Cancelar una compra vieja cuyo lote ya fue consultado/mostrado en UI** → Mitigación: la eliminación es transaccional junto con la reversión de inventario, así que el estado queda consistente inmediatamente después de la cancelación; no hay ventana de inconsistencia post-transacción.
- **[Riesgo] N+1 al enriquecer cada item del listado con su caducidad** → Mitigación: `InventoryLotRepository.findNearestExpirationByProducts` recibe el array completo de `productId` de la página y hace una sola query (`DISTINCT ON`), no una por fila.
- **[Trade-off] `expirationDate` se guarda `@db.Date` (sin hora)** — consistente con que "caducidad" es un dato de día, no de instante; evita ambigüedad de timezone en el cálculo de días restantes.

## Migration Plan

1. `npx prisma migrate dev --name add_inventory_lots_table` — crea la tabla, agrega índice `(branchId, productId, expirationDate)`, agrega relación inversa en `PurchaseItem`.
2. Deploy de backend (nuevos campos opcionales en `POST /purchases`, nuevos campos de sólo lectura en `GET /inventory` y `GET /inventory/:productId`) — retrocompatible: compras y listados existentes sin lote siguen funcionando idénticos, los 3 campos nuevos son `null`.
3. Deploy de frontend (inputs opcionales en compras, columna nueva en inventario) — no requiere coordinación estricta con el paso 2 porque los campos nuevos del backend son aditivos y opcionales.
4. Rollback: si es necesario revertir, el rollback de datos es sólo `DROP TABLE inventory_lots` (no hay dependencias entrantes de otras tablas hacia ella); el rollback de código es el revert normal del PR — no hay migración de datos destructiva en compras/inventario existentes.

## Open Questions

Ninguna — nivel de tracking, obligatoriedad de campos y umbrales del semáforo ya fueron confirmados por el usuario en la fase de planeación previa a este proposal.
