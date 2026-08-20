## MODIFIED Requirements

### Requirement: Purchases report endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/purchases` que devuelve un listado filtrado de compras (una fila por `Purchase`, no agregado). SHALL aceptar filtros opcionales `?branchId`, `?providerId` (UUID; `400` si inválidos), `?status` (`completed`\|`cancelled`) y `?from`/`?to` (`YYYY-MM-DD`, acotando `purchasedAt`). Cada fila SHALL incluir folio, proveedor, sucursal, subtotal, impuestos, total, `paidAmount`, `balance` (derivado como `total - paidAmount`, nunca negativo, formateado igual que el resto de campos monetarios), `paymentStatus` y fecha. SHALL aceptar `?format=json|pdf|xlsx` (default `json`). Un dataset que exceda el límite de filas para export (mismo umbral que `payments/history`, 10 000 filas) con `format=pdf` o `format=xlsx` SHALL responder `409 {"error":"ReportTooLarge","limit":10000}`.

#### Scenario: Listado con filtros
- **WHEN** un usuario con permiso llama `GET /api/v1/admin/reports/purchases?providerId=<uuid>&from=2026-01-01&to=2026-01-31`
- **THEN** responde `200 application/json` con las compras de ese proveedor en el rango, con sus totales

#### Scenario: Sin resultados
- **WHEN** el filtro no matchea ninguna compra
- **THEN** responde `200` con un array vacío

#### Scenario: Filtro UUID inválido
- **WHEN** `?providerId` no es un UUID válido
- **THEN** el sistema responde `400`

#### Scenario: Reporte demasiado grande
- **WHEN** el filtro devuelve más de 10 000 compras y `format=pdf` o `format=xlsx`
- **THEN** responde `409 {"error":"ReportTooLarge","limit":10000}`

#### Scenario: Saldo pendiente de una compra a crédito parcialmente pagada
- **WHEN** una compra tiene `total=1000`, `paidAmount=400`
- **THEN** la fila incluye `balance` equivalente a `600`

#### Scenario: Saldo cero en compra liquidada o de contado
- **WHEN** una compra tiene `paymentStatus="paid"` (`total === paidAmount`, sea de contado o crédito ya liquidado)
- **THEN** la fila incluye `balance` equivalente a `0`
