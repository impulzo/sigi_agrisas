## Why

El módulo de devoluciones actual permite devolver líneas individuales de un ticket (parcial), pero no existe un mecanismo de "devolución total" que revierta todas las líneas de un ticket en una sola operación y marque el ticket con un estado diferenciado (`returned_total`). Los operadores deben seleccionar cada línea manualmente para un retorno completo, lo que genera fricción y riesgo de omisiones.

## What Changes

- Nuevo estado `returned_total` en `Sale.status` (se suma a `completed | cancelled | edited`)
- Endpoint nuevo `POST /api/v1/admin/sales/:id/full-return` (shortcut que construye el payload completo y delega a `CreateReturnUseCase`)
- Transición automática: cuando `POST /full-return` resulta en que todas las líneas del ticket quedan con `remaining = 0`, el sistema actualiza `sale.status = 'returned_total'` en la misma transacción
- Migración: ADD CHECK/ENUM a `sales.status` para incluir `returned_total`
- UI: botón "Devolución Total" en `SaleDetailPage` (requiere `returns:create`) que abre `FullReturnModal` (captura motivo y llama al nuevo endpoint)
- `SaleStatusBadge` incluye nuevo estado `returned_total` con etiqueta "Devuelto total" (color `error-container`)

## Capabilities

### New Capabilities

_(ninguna nueva spec de alto nivel; el comportamiento se añade a specs existentes)_

### Modified Capabilities

- `returns-api`: nuevo endpoint `POST /sales/:id/full-return`; lógica de transición de estado `returned_total` en venta
- `returns-ui`: botón "Devolución Total" en detalle de venta; `SaleStatusBadge` con nuevo estado; `FullReturnModal`

## Impact

- **BD**: nueva migración altera `sales.status` para permitir `returned_total`
- **Backend**: `src/modules/returns/` (nuevo use case `FullReturnUseCase` o lógica en `CreateReturnUseCase`); `src/modules/pos/` (`PrismaSaleRepository` actualiza status)
- **Frontend**: `app/(private)/sales/[id]/` — `SaleDetailPage`, `SaleStatusBadge`, nuevo `FullReturnModal`
- **Breaking**: `Sale.status` amplía su dominio; clientes que enumeren estados deben actualizarse
