## Context

El módulo `returns` ya implementa `CreateReturnUseCase` que crea una devolución parcial de líneas individuales. `Sale.status` es `completed | cancelled | edited`. El ticket de un cliente pide que cuando se devuelve "todo", el ticket quede en estado `returned_total` diferenciado de `cancelled` (que es cuando la venta se cancela internamente, no por devolución de cliente).

## Goals / Non-Goals

**Goals:**
- Nuevo endpoint `POST /api/v1/admin/sales/:id/full-return` que devuelve todas las líneas restantes en una transacción
- Transición automática `sale.status → returned_total` cuando todas las líneas quedan en `remaining = 0`
- Badge diferenciado en UI; nuevo estado accesible en filtros de ventas

**Non-Goals:**
- Cambiar el flujo de devolución parcial existente (`POST /returns`)
- Revertir abonos asociados (queda diferido a `payments` cancellation manual)
- Invalidar automáticamente cotizaciones vinculadas

## Decisions

### D-1: Endpoint shortcut, no nuevo use case

**Decisión**: `POST /sales/:id/full-return` es un shortcut en `ReturnsController` que:
1. Carga el sale con sus items
2. Para cada `saleItem`, calcula `remaining = ReturnableQuantityCalculator.computeRemaining(soldQty, priorItems)`
3. Construye payload equivalente a `POST /returns` con todas las líneas con `remaining > 0`
4. Delega a `CreateReturnUseCase` existente
5. Tras crear el return, evalúa si todas las líneas quedaron en `remaining = 0` → si sí, actualiza `sale.status = 'returned_total'`

**Alternativa**: Nuevo `FullReturnUseCase`.

**Razón**: Reusar `CreateReturnUseCase` evita duplicar lógica de transacción, snapshot e inventario. La evaluación post-create de "todas devueltas" es simple.

### D-2: `returned_total` como nuevo valor de `sale.status`

**Decisión**: Extender el tipo/enum `SaleStatus` con `returned_total`.

**Alternativa**: Flag booleano `isFullyReturned` en `Sale`.

**Razón**: El cliente específicamente pide un estado diferenciado en CA-6. Los filtros de listado de ventas ya usan `?status=completed,cancelled,edited`; agregar `returned_total` es consistente.

### D-3: Transición de status atómica post-return

La evaluación "¿están todas las líneas devueltas?" ocurre DENTRO de la transacción de `createWithItems`, o en una segunda transacción inmediata en el mismo request. Se prefiere segunda transacción para no modificar `CreateReturnUseCase` (single responsibility).

### D-4: Sale `cancelled` vs `returned_total`

`cancelled` = venta anulada internamente (sin llegada de merncancía al cliente). `returned_total` = venta consumada que fue devuelta íntegramente por el cliente. Son semánticamente distintos; no se fusionan.

## Risks / Trade-offs

- **[Riesgo] `returned_total` con abonos activos**: la venta puede tener `paymentStatus='partial'` y aun así marcarse `returned_total`. La reconciliación de saldo queda pendiente. → Mitigation: documentar en spec; mostrar advertencia en UI si `paymentStatus !== 'paid'` al hacer full-return.
- **[Trade-off] No se valida si ya existe devolución total previa**: la lógica se basa en `remaining = 0`; si todas las líneas ya fueron devueltas en devoluciones parciales previas, el endpoint retornará error "nothing to return" en lugar de 409.

## Migration Plan

1. Migración: `ALTER TABLE sales ALTER COLUMN status TYPE TEXT; UPDATE ... CHECK` o ajuste del ENUM de Postgres para incluir `returned_total`
2. `npx prisma generate` para regenerar tipos
3. Sin rollback crítico: el estado nuevo es aditivo

## Open Questions

- ¿Debe `POST /full-return` fallar (409) si la venta ya tiene `status = 'returned_total'`? (Recomendado: sí, como idempotencia segura)
- ¿Se notifica al operador si la venta tiene abonos activos al hacer full-return?
