## MODIFIED Requirements

### Requirement: Provider payments report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/purchases/provider-payments` que devuelve un listado filtrado de pagos a proveedores (una fila por `ProviderPayment`). SHALL aceptar filtros opcionales `?branchId`, `?providerId` (UUID; `400` si inválidos), `?status` (`completed`\|`cancelled`) y `?from`/`?to` (acotando `paidAt`). Cada fila SHALL incluir folio del pago, folio de la compra ligada, proveedor, sucursal, monto, fecha de pago, y el saldo del proveedor al momento de la consulta: `providerInitialBalance` y `providerCurrentBalance` (leídos de `providers.initial_balance` y `providers.current_balance`). SHALL aceptar `?format=json|pdf|xlsx` (default `json`) con el mismo límite de 10 000 filas y respuesta `409 ReportTooLarge` que el endpoint de compras.

#### Scenario: Listado de pagos por proveedor
- **WHEN** un usuario con permiso llama `GET /api/v1/admin/reports/purchases/provider-payments?providerId=<uuid>`
- **THEN** responde `200 application/json` con los pagos a ese proveedor, incluyendo el folio de la compra ligada

#### Scenario: Filtro por estado
- **WHEN** se envía `?status=cancelled`
- **THEN** el listado solo incluye pagos cancelados

#### Scenario: Sin pagos en el periodo
- **WHEN** el filtro no matchea ningún pago
- **THEN** responde `200` con un array vacío

#### Scenario: Saldo del proveedor en cada fila
- **WHEN** un proveedor con `initialBalance = 2000` y `currentBalance = 4500` tiene pagos en el listado
- **THEN** cada fila de ese proveedor incluye `providerInitialBalance: 2000` y `providerCurrentBalance: 4500`
