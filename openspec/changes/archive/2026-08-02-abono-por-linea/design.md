## Context

`RegisterPaymentUseCase`/`CreatePaymentInput` hoy sólo aceptan `{saleId, amount, notes}` — ver `proposal.md - Why`. `SaleItem` no tiene columna `paidAmount`; el patrón existente para "cuánto de una línea ya se consumió" es `returnedQuantityBySaleItem` en `SaleDetailDto`, calculado vía `SUM` sobre `return_items` en `PrismaSaleRepository.findByIdWithItems` (`$queryRaw`), no una columna denormalizada. Este change replica ese patrón para pagos.

## Goals / Non-Goals

**Goals:**
- Reparto de abono por línea con montos independientes, retrocompatible (campo `items` opcional).
- Saldo por línea calculado (no denormalizado) para que cancelaciones lo reviertan gratis.

**Non-Goals:**
- No se toca `sale.paidAmount`/`sale.paymentStatus` — siguen siendo el saldo GLOBAL, calculados igual que hoy vía `SalePaymentApplier`. El desglose por línea es informativo/de trazabilidad, no reemplaza el saldo global.
- No se valida que `SUM(lineBalances[].paidAmount) === sale.paidAmount` como invariante dura — un abono sin `items` incrementa `sale.paidAmount` sin tocar ninguna línea, por lo que ambos totales pueden divergir intencionalmente (abonos "sin desglose" existen fuera del tracking por línea). Ver Risk abajo.

## Decisions

**D1 — Tabla nueva `customer_payment_items`, no columna en `sale_items`**
Igual razón que `return_items`/`returnedQuantityBySaleItem`: el saldo por línea se DERIVA (`SUM` con join, excluyendo abonos `cancelled`), no se persiste. Cancelar un abono revierte el saldo por línea automáticamente sin lógica de reversión adicional — el query simplemente deja de contar esas filas.

**D2 — `items` opcional en `CreatePaymentInput`, no un tipo separado**
Mismo patrón que `WaybillItemInput` con `productId?`. Si `items` está ausente, el flujo es idéntico al actual (ninguna fila nueva, ningún query de saldo por línea). Evita una migración de comportamiento para el 100% de abonos existentes.

**D3 — Validación de saldo por línea usa `SUM` de `customer_payment_items` con join a `customer_payments.status='completed'`, no una columna cacheada**
Consistencia con D1 — un abono cancelado no debe requerir un `UPDATE` adicional a las líneas para "liberar" saldo; el query de validación (`lineDue = lineTotal - SUM(...)`) ya lo excluye por status.

**D4 — Tolerancia de redondeo `0.0001` en `SUM(items[].amount) === amount`**
Mismo patrón que otras comparaciones decimales del proyecto (`Decimal(14,4)`, banker's rounding en `SaleTotalsCalculator`). Evita rechazos espurios por acumulación de redondeo cuando el cliente suma montos ya redondeados a 2 decimales en UI.

**D5 — `lineBalances` se agrega a la respuesta de `GET /sales/:id/payments` (payments-api), no a `SaleDetailDto` (pos-api)**
El endpoint ya agrega totales de venta relacionados a pagos (`saleTotal`, `salePaidAmount`, `saleDueAmount`) — es el lugar natural, mismo capability, sin abrir un nuevo requirement cross-módulo en `pos-api`. `SaleDetailDto.returnedQuantityBySaleItem` (returns) vive en `pos-api` porque returns SÍ está acoplado al detalle de venta por diseño previo; pagos ya tiene su propio endpoint de detalle relacional (`/sales/:id/payments`), así que no hace falta duplicar el acoplamiento.

## Risks / Trade-offs

- **[Riesgo] Divergencia entre `sale.paidAmount` (global) y `SUM(lineBalances[].paidAmount)` (por línea)** cuando se mezclan abonos con y sin `items` en la misma venta — ej. un abono sin desglose de $200 sube `sale.paidAmount` pero ninguna línea individual lo refleja. Mitigado: es el comportamiento pedido explícitamente por el usuario (ambos modos coexisten, "sólo algunos productos" es opcional) — se documenta como comportamiento esperado, no bug, en la UI (tabla de saldo por línea y saldo global son dos vistas independientes, no se pretende que sumen igual si se mezclan modos).
- **[Trade-off] `items[].amount` no es editable después de creado el abono** — para corregir un desglose incorrecto hay que cancelar el abono completo y crear uno nuevo (igual que hoy no se puede editar `amount` de un abono ya registrado).

## Migration Plan

Nueva tabla `customer_payment_items` (`id`, `customer_payment_id` FK `ON DELETE CASCADE`, `sale_item_id` FK `ON DELETE RESTRICT`, `amount Decimal(14,4)` CHECK `> 0`, `created_at`), índice en `(customer_payment_id)` y `(sale_item_id)`. `npx prisma migrate dev --name add_customer_payment_items` (o `migrate deploy` en el flujo de este entorno). Sin backfill — tabla vacía al desplegar, ningún abono existente tenía desglose por línea (era imposible antes de este change).

## Open Questions

_Ninguna pendiente — el mecanismo (monto independiente por línea) fue confirmado explícitamente por el usuario antes de escribir specs._
