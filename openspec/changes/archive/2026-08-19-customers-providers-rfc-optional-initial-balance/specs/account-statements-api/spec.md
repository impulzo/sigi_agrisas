## MODIFIED Requirements

### Requirement: Account statement summary endpoint
El sistema SHALL exponer `GET /api/v1/admin/reports/account-statements` que devuelve, paginado, una fila por cliente con `customerId`, `customerCode`, `customerName`, `totalCharged`, `totalPaid`, `initialBalance`, `currentBalance`, `creditLimit`, `availableCredit`. El endpoint SHALL delegar a `reportsController` y ejecutar `GetAccountStatementsSummaryUseCase`. `pageSize` SHALL tener máximo 100. `currentBalance` SHALL leerse de `customers.current_balance` (fuente de verdad). `initialBalance` SHALL leerse de `customers.initial_balance`. `availableCredit` SHALL ser `null` cuando `creditLimit` es `null`, y `creditLimit − currentBalance` en otro caso.

#### Scenario: Resumen con movimientos
- **WHEN** un usuario con `reports:account_statements_read` llama `GET /api/v1/admin/reports/account-statements`
- **THEN** responde `200 application/json` con `items[]` (una fila por cliente con los campos agregados) más `total`, `page`, `pageSize`

#### Scenario: Filtro solo con saldo
- **WHEN** se envía `?onlyWithBalance=true`
- **THEN** solo aparecen clientes con `currentBalance` distinto de `0`

#### Scenario: Cliente sin movimientos de crédito
- **WHEN** un cliente sin ventas a crédito ni abonos aparece en el resultado
- **THEN** sus `totalCharged` y `totalPaid` son `0` y `availableCredit` es igual a `creditLimit`

#### Scenario: Límite de crédito nulo
- **WHEN** un cliente tiene `creditLimit = null`
- **THEN** su `availableCredit` es `null`

#### Scenario: Saldo inicial en el resumen
- **WHEN** un cliente tiene `initialBalance = 1000` (deuda histórica capturada al migrar)
- **THEN** su fila del resumen incluye `initialBalance: 1000`, distinto de `currentBalance` si hubo movimientos posteriores

---

### Requirement: Opening balance and date range
El endpoint de desglose SHALL aceptar `?from` y `?to`. Con `from` presente, el sistema SHALL calcular `openingBalance` como `customer.initialBalance` más la suma de ventas a crédito vigentes menos abonos `completed` con fecha anterior a `from`, y el `runningBalance` SHALL arrancar en ese `openingBalance` listando solo los movimientos del rango. Sin `from`, `openingBalance` SHALL ser igual a `customer.initialBalance` (no `0` fijo) y se listan todos los movimientos desde el inicio.

#### Scenario: Rango con saldo inicial
- **WHEN** se envía `?from=2026-07-01&to=2026-07-31` y el cliente tenía saldo previo (incluyendo su `initialBalance`)
- **THEN** `openingBalance` refleja `initialBalance` más los movimientos de crédito previos al `from`, y el primer `runningBalance` del rango parte de ese valor

#### Scenario: Histórico completo con initialBalance en cero
- **WHEN** no se envía `from` y el cliente tiene `initialBalance = 0` (comportamiento por defecto para clientes sin deuda migrada)
- **THEN** `openingBalance` es `0` y se listan todos los movimientos desde el primero

#### Scenario: Histórico completo con deuda inicial capturada
- **WHEN** no se envía `from` y el cliente tiene `initialBalance = 1500` (deuda histórica capturada al migrar)
- **THEN** `openingBalance` es `1500` y el `runningBalance` del primer movimiento parte de esa base
