## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador de caja / cajero | Como operador de caja, quiero abonar montos independientes a productos específicos de una venta a crédito, para dar trazabilidad de qué mercancía quedó liquidada cuando el cliente paga parcialmente por artículo. | - Given una venta a crédito con líneas A ($100 saldo) y B ($50 saldo)<br>- When el cajero registra un abono seleccionando línea A con $60 y línea B con $50<br>- Then se crean 2 `payment_items` (A:$60, B:$50), `CustomerPayment.amount = 110` (suma), y el saldo por línea se recalcula (A: $40 restante, B: $0 restante)<br>- Given un monto de línea que excede el saldo restante de esa línea específica<br>- When se intenta registrar<br>- Then HTTP 409 `PaymentExceedsLineDueAmount` con la línea ofensora, sin persistir nada<br>- Given no se seleccionan líneas (comportamiento actual)<br>- When se registra un abono sólo con `amount` global<br>- Then funciona exactamente igual que hoy (sin `payment_items`, 100% retrocompatible) | - Requiere `payments:create` (sin cambios)<br>- Suma de `items[].amount` DEBE igualar `amount` del abono (400 si no coincide, evita inconsistencia)<br>- Validación de saldo por línea ocurre en la misma transacción que la validación de saldo total (`PaymentExceedsDueAmountError` general se mantiene como red de seguridad) |
| 2 | Operador de caja / cajero | Como operador de caja, quiero ver el saldo pendiente por línea en el detalle de la venta, para saber qué productos ya se pagaron antes de decidir cómo repartir un nuevo abono. | - Given una venta con abonos previos por línea<br>- When se abre el detalle de la venta o el modal de registrar abono<br>- Then cada línea muestra `lineTotal`, `paidAmount` (suma de `payment_items` completados) y `dueAmount` (resta) | - Sólo lectura, requiere `payments:read` o `sales:read` (ya existente) |
| 3 | Operador de caja / cajero | Como operador de caja, quiero que cancelar un abono con desglose por línea revierta también el saldo pagado por línea, para que el estado de cuenta quede consistente tras una cancelación. | - Given un abono con `payment_items` en líneas A y B<br>- When se cancela el abono<br>- Then los `payment_items` asociados quedan marcados/excluidos del cálculo de saldo por línea (mismo mecanismo que hoy revierte `sale.paidAmount`), y las líneas A/B recuperan su saldo pendiente previo | - Requiere `payments:cancel` (sin cambios)<br>- No idempotente, igual que la cancelación de abonos hoy |

_Nota: se separó en 3 historias porque cubren capas distintas (escritura del abono por línea, lectura del saldo por línea, reversión al cancelar) con criterios de aceptación no solapables — son independientes y testeables por separado._

## Why

Hoy un abono (`RegisterPaymentUseCase`) sólo acepta `{saleId, amount, notes}` — un monto libre contra `sale.total - sale.paidAmount`, sin relación a qué líneas de la venta se están pagando. El usuario necesita poder repartir un abono entre productos específicos de la venta (montos independientes por línea) para llevar trazabilidad de qué mercancía quedó liquidada, especialmente quando el cliente paga por partes según qué productos ya recibió o revisó.

## What Changes

- Nueva tabla `payment_items` (`customer_payment_id`, `sale_item_id`, `amount`) — hijo de `CustomerPayment`, paralelo a `sale_items`.
- `RegisterPaymentUseCase`/`CreatePaymentInput` acepta `items?: Array<{ saleItemId: string, amount: number }>` opcional. Si se omite, comportamiento 100% idéntico al actual (retrocompatible).
- Si se provee `items`, la suma DEBE igualar `amount`; cada línea valida su propio saldo restante (`lineTotal - SUM(payment_items.amount completados para esa línea)`).
- Nuevo error `PaymentExceedsLineDueAmountError` (409) junto al `PaymentExceedsDueAmountError` existente.
- `SaleDetailDto`/`PaymentDetailDto` exponen saldo por línea (`paidAmountBySaleItem` o similar, mismo patrón que `returnedQuantityBySaleItem`).
- `CancelPaymentUseCase` revierte también los `payment_items` asociados (vía join, sin nueva lógica de reversión — se derivan del padre cancelado).
- UI: `RegisterPaymentModal` gana modo opcional "Repartir por producto" con inputs de monto por línea; `SalePaymentsSection`/detalle de venta muestra saldo por línea.

## Capabilities

### New Capabilities
_(ninguna)_

### Modified Capabilities
- `payments-api`: `RegisterPaymentUseCase`, `CreatePaymentInput`, `CustomerPayment` (agregado `payment_items` opcional), `CancelPaymentUseCase`, nuevo error `PaymentExceedsLineDueAmountError`.
- `payments-ui`: `RegisterPaymentModal` con reparto opcional por línea, `SalePaymentsSection` con saldo por línea.

## Impact

- Migración Prisma: tabla `payment_items` nueva (`customer_payment_id` FK `ON DELETE CASCADE`, `sale_item_id` FK `ON DELETE RESTRICT` — igual patrón que `sale_items`/`return_items`).
- Sin cambios breaking: `items` es opcional, todo el flujo actual (abono por monto contra el total) sigue funcionando sin tocar código existente que no lo use.
- No afecta `sale.paidAmount`/`sale.paymentStatus` (siguen calculándose igual, vía `SalePaymentApplier`, agnóstico de si hubo desglose por línea).
