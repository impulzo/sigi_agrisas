## Context

`Customer.rfc` y `Provider.rfc` son hoy `String @unique @db.VarChar(13)` (`prisma/schema.prisma:412,190`) — NOT NULL a nivel de columna y de los 3 schemas Zod (compartido `rfcSchema` en `src/shared/infrastructure/http/validators.ts:10-14`, más los espejos en `CustomersController.ts`/`ProviderController.ts`/schemas de UI). `currentBalance` en ambas entidades arranca siempre en `0` al crear y sólo se mueve por triggers transaccionales del sistema (`payments-api`, `pos-api`, `purchases-api`) — la capability `customers-api` documenta esto explícitamente como invariante ("Customer credit balance is read-only via this API"). `Provider` ya tiene en base de datos `creditLimit`, `currentBalance`, `creditDays` (columnas existentes desde una migración previa) que nunca se propagaron a `ProviderDto` — asimetría frente a `Customer`, que sí las expone.

## Goals / Non-Goals

**Goals:**
- RFC opcional en `Customer` y `Provider`, preservando unicidad sólo entre valores capturados (historias 1, 2).
- `initialBalance` persistido que arranca `currentBalance` y se puede reajustar por delta en `PATCH` (historias 3, 4).
- Paridad `ProviderDto` ↔ `CustomerDto` en campos de saldo/crédito (historia 4).
- El estado de cuenta de clientes y el reporte de pagos a proveedores reflejan el saldo inicial (historias 3, 4).

**Non-Goals:**
- No se crea un "estado de cuenta de proveedores" nuevo (equivalente al de clientes) — se usa el reporte de pagos a proveedores existente como superficie mínima pedida (historia 4, AC: "el reporte de pagos a proveedores muestra initialBalance y currentBalance").
- No se permiten valores negativos de `initialBalance` en este change (siempre `>= 0`, igual que `creditLimit`) — una deuda inicial "a favor" del cliente/proveedor no fue pedida.
- No se modifica el flujo de facturación (`StampInvoiceUseCase`) más allá de ajustar el tipo `rfc: string | null` — `ReceiverFiscalDataIncompleteError` sigue siendo la única barrera para facturar sin RFC, sin cambios de comportamiento.

## Decisions

**D1 — Unicidad de RFC vía índice único parcial, no `@unique` de Prisma.**
Prisma no soporta índices únicos parciales (`WHERE ... IS NOT NULL`) en su DSL declarativo. Se quita `@unique` del campo `rfc` en el schema y se agrega el índice con SQL crudo dentro de la misma migración (`CREATE UNIQUE INDEX customers_rfc_key ON customers(rfc) WHERE rfc IS NOT NULL;`, ídem `providers`). Alternativa descartada: `@unique` normal + tratar `""` como "sin RFC" — se descarta porque mezclaría un valor mágico con NULL semántico y complicaría la validación Zod (regex ya asume no-vacío).

**D2 — `rfc` opcional se modela como `string | null`, no `string | undefined`.**
Consistente con el resto de campos opcionales de ambas entidades (`legalName`, `taxRegime`, etc., todos `string | null`). El schema Zod compartido gana `optionalRfcSchema` (`rfcSchema.nullable().optional().transform(v => v === "" ? null : v)`) sin tocar `rfcSchema` (sigue usándose donde el RFC es obligatorio, ej. `providers`/`customers` legacy tests que no cambian, y cualquier flujo que en el futuro sí lo requiera).

**D3 — `initialBalance` afecta `currentBalance` sólo en create (asignación directa) y en update (delta), dentro de la transacción del propio endpoint de `customers-api`/`admin-providers`.**
Esto es una excepción deliberada y acotada a la ownership de `currentBalance` descrita en "Customer credit balance is read-only via this API" — se documenta explícitamente en esa spec como el tercer y único owner adicional (junto a `payments-api` y `pos-api`), activo sólo a través del campo `initialBalance`, nunca escribiendo `currentBalance` directamente desde el cliente. Alternativa descartada: exigir que la carga de saldo histórico se haga con un abono/cargo manual sintético — se descarta porque el usuario pidió explícitamente un campo dedicado, más simple para captura masiva de datos migrados.
Fórmula en `PATCH`: `newCurrentBalance = currentBalance + (newInitialBalance - oldInitialBalance)`, aplicada con `UPDATE ... SET current_balance = current_balance + ($delta)` para evitar condiciones de carrera con abonos/ventas concurrentes (mismo patrón atómico que ya usa `PrismaPaymentRepository`).

**D4 — `AccountLedgerBuilder` recibe `initialBalance` del cliente como base, en vez de `0` fijo.**
`GetAccountStatementLedgerUseCase.ts:119,121,124,173` ya calcula `openingBalance` a partir de un valor base (`0` hoy) más movimientos previos a `from`. Se cambia esa base a `customer.initialBalance`. La convergencia ya documentada ("closingBalance final coincide con customers.current_balance") se preserva sin cambios porque `current_balance` ya incorpora `initialBalance` desde D3 — no se requiere modificar `AccountLedgerBuilder` en sí, sólo el valor base que le pasa el use case.

**D5 — Paridad `ProviderDto`: se exponen los campos ya existentes en BD (`creditLimit`, `currentBalance`, `creditDays`) más el nuevo `initialBalance`, sin agregar lógica de crédito a compras.**
`purchases-api` ya usa `providers.currentBalance` para incrementarlo en compras a crédito (comportamiento preexistente, sin tocar). Este change sólo cierra el gap de que esos valores no eran visibles vía API/UI — no cambia cuándo o cómo se mueven.

## Risks / Trade-offs

- **[Riesgo]** Migrar `rfc` a nullable en una tabla con datos existentes podría romper índices o queries que asuman NOT NULL → **Mitigación**: todos los registros actuales ya tienen `rfc` no nulo (era obligatorio); la migración sólo relaja la restricción hacia adelante, no requiere backfill.
- **[Riesgo]** El ajuste por delta de `initialBalance` en `PATCH` puede solaparse con un abono/venta concurrente sobre el mismo cliente/proveedor → **Mitigación**: `UPDATE ... SET current_balance = current_balance + ($delta)` es atómico a nivel de fila en Postgres, mismo patrón que `payments-api`.
- **[Trade-off]** No se valida que `initialBalance` no exceda `creditLimit` al crear — se acepta que un saldo inicial migrado pueda superar el límite de crédito vigente (la migración de datos históricos es más importante que la coherencia in-app del límite en ese instante único).
