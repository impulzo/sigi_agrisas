## Context

`purchases.payment_status` y `purchases.paid_amount` ya existen (`prisma/schema.prisma:939-940`); no hay columna `balance`. El patrón de derivar el saldo ya existe en el módulo operativo: `app/(private)/purchases/_blocks/ProviderPaymentsSection.tsx:25` → `const dueAmount = purchase.total - purchase.paidAmount;`. `PurchaseStatusBadge` (componente ya usado en `app/(private)/purchases/_blocks/PurchasesTable.tsx`) traduce `status`/`paymentStatus` con badges de color — el reporte no lo reutiliza hoy, imprime los valores crudos (`PurchasesTable.tsx` del reporte, en `app/(private)/reports/purchases/_blocks/`).

## Goals / Non-Goals

**Goals:**
- Saldo pendiente visible en las 3 salidas del reporte de compras (web, PDF, Excel) sin nueva migración (historia 1).
- Estados en español con el mismo componente visual que el resto del sistema, evitando duplicar lógica de traducción (historia 2).

**Non-Goals:**
- No se toca la sección "Pagos a Proveedores" del mismo reporte — no tiene noción de saldo pendiente (un pago no tiene saldo, es un movimiento).
- No se persiste `balance` en BD — siempre derivado en el use case, igual que el resto del sistema deriva saldos (`ProviderPaymentsSection`, `PurchaseDetailPage`).
- No se traduce `status`/`paymentStatus` en PDF/Excel — esas salidas nunca mostraron badges de color (son documentos estáticos); el problema de legibilidad es específico de la tabla web sin badge.

## Decisions

**D1 — `balance` calculado en `GetPurchasesReportUseCase`, reutilizando el mismo cálculo que `ProviderPaymentsSection`.**
`total - paidAmount`, formateado con `formatMoney` igual que el resto de columnas monetarias del DTO (`GetPurchasesReportUseCase.ts:26-38`). No se introduce un servicio de dominio nuevo para una resta — sería sobre-ingeniería para una operación de una línea ya replicada en el sistema.

**D2 — Traducción de estado vía el componente ya existente `PurchaseStatusBadge`, no un mapa de traducción nuevo en el reporte.**
`app/(private)/purchases/_blocks/PurchaseStatusBadge.tsx` ya encapsula la traducción + color de `status`. Se importa directamente en `app/(private)/reports/purchases/_blocks/PurchasesTable.tsx` en vez de duplicar el mapa de traducciones — evita que las dos tablas (operativa y reporte) diverjan en el texto mostrado para el mismo estado.

**Amendment (durante apply):** `PurchaseStatusBadge` real sólo tenía prop `status` (no `paymentStatus` como asumía el proposal). Se agregó un componente hermano `PurchasePaymentStatusBadge` en el mismo archivo, en vez de extender la firma de `PurchaseStatusBadge` — evita romper los 2 call-sites operativos existentes (`PurchasesTable.tsx` y `PurchaseDetailPage.tsx` del módulo `purchases`) que sólo pasan `status`. Mismo principio DRY, un solo archivo fuente de verdad para ambos badges.

## Risks / Trade-offs

- **[Trade-off]** `balance` no se expone en el reporte de Pagos a Proveedores ni en un total agregado (`totals.totalBalance`) — el usuario pidió la columna por fila, no un total nuevo; se documenta como alcance explícito, ampliable después si se pide.
