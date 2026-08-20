## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Encargado de compras (`reports:purchases_read`) | Como encargado de compras, quiero ver el saldo pendiente de cada compra en el reporte de compras para identificar sin cruzar datos qué compras a crédito siguen debiéndose | - Nueva columna "Saldo" (`balance = total - paidAmount`) después de "Pagado", en la tabla web, PDF y Excel<br>- Compra de contado (`paymentStatus="paid"`) muestra saldo `$0.00`<br>- El total de la página no cambia (sigue siendo suma de `total`, no de `balance`) | - Sólo visible con `reports:purchases_read`, mismo gate que el resto del reporte |
| 2 | Encargado de compras (`reports:purchases_read`) | Como encargado de compras, quiero ver el estado de pago y el estado de la compra en español en la tabla web del reporte para no tener que interpretar valores crudos en inglés | - La tabla web traduce `paymentStatus` (`pending`→"Pendiente", `partial`→"Parcial", `paid`→"Pagado") y `status` (`completed`→"Completada", `cancelled`→"Cancelada") con el mismo componente `PurchaseStatusBadge` ya usado en el listado operativo de compras<br>- PDF y Excel no cambian en este punto (ya sólo mostraban los valores crudos en la tabla web) | - Sin impacto de seguridad — cambio de presentación |

Nota: la historia 2 se agrega porque ya estaba contemplada en el plan aprobado como ajuste de paso sobre la misma tabla (`PurchasesTable.tsx` imprime `paymentStatus`/`status` crudos en inglés hoy) — se documenta como historia propia para que sea trazable y testeable por separado de la columna de saldo.

## Why

El reporte de compras (`/reports/purchases`, sección "Compras") ya muestra `paidAmount` ("Pagado") pero no expone el saldo pendiente — el encargado de compras hoy tiene que restar mentalmente `total - paidAmount` fila por fila, o cruzar con `/purchases/[id]` para ver "Pagado X de Y". Además, la tabla web imprime `paymentStatus`/`status` crudos en inglés (`"pending"`, `"completed"`) sin badge ni traducción, a diferencia del listado operativo de compras que ya usa `PurchaseStatusBadge`.

## What Changes

- El reporte de compras (`GetPurchasesReportUseCase`, JSON/PDF/Excel) agrega `balance` por fila, derivado (`total - paidAmount`), no una columna nueva en la tabla `purchases`.
- La tabla web (`PurchasesTable.tsx`) reemplaza el texto crudo de `paymentStatus`/`status` por `PurchaseStatusBadge`, reutilizado del módulo operativo de compras.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `reports-purchases-api`: `Purchases report endpoint` — agrega `balance` por fila.
- `reports-ui`: `Purchases report view` — columna "Saldo" y badges de estado en la sección Compras.

## Impact

- **Sin migración Prisma**: `balance` es siempre derivado (`total - paidAmount`), igual que ya lo hace `ProviderPaymentsSection.tsx:25` en el módulo operativo — no se persiste.
- **Backend**: `src/modules/reports/application/dto/PurchasesReportResponseDto.ts`, `src/modules/reports/application/use-cases/GetPurchasesReportUseCase.ts`, `src/modules/reports/infrastructure/pdf/PurchasesReportPdf.tsx`, `src/modules/reports/infrastructure/xlsx/buildPurchasesReportWorkbook.ts`.
- **Frontend**: `app/(private)/reports/purchases/_blocks/PurchasesTable.tsx`, `app/(private)/reports/purchases/_logic/types/api.ts`.
- **Sin impacto** en la sección "Pagos a Proveedores" del mismo reporte, ni en el listado operativo `/purchases` (ya muestra su propio estado con badge).
