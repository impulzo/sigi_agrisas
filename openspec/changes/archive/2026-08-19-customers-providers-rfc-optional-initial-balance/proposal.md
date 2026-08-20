## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Encargado de catálogo (`customers:write`) | Como encargado de catálogo, quiero crear y editar un cliente sin capturar RFC obligatoriamente para poder registrar clientes de mostrador que no requieren factura | - `POST /customers` acepta el body sin `rfc` o con `rfc: null`<br>- Dos clientes sin RFC pueden coexistir (la unicidad de `rfc` sólo aplica entre valores no nulos)<br>- Si se captura un RFC, sigue validándose el formato mexicano y la unicidad<br>- El formulario ya no marca RFC como obligatorio (`*`)<br>- Facturar una venta de un cliente sin RFC sigue bloqueado por `ReceiverFiscalDataIncompleteError` (comportamiento ya existente, sin cambios) | - Sólo usuarios con `customers:write` crean/editan clientes<br>- La unicidad de RFC se sigue validando en BD (índice único parcial `WHERE rfc IS NOT NULL`), no sólo en la app |
| 2 | Encargado de catálogo (`providers:write`) | Como encargado de catálogo, quiero crear y editar un proveedor sin capturar RFC obligatoriamente para poder registrar proveedores informales que no facturan | - `POST /providers` acepta el body sin `rfc` o con `rfc: null`<br>- Dos proveedores sin RFC pueden coexistir<br>- Si se captura un RFC, sigue validándose formato y unicidad<br>- El formulario ya no marca RFC como obligatorio (`*`) | - Sólo usuarios con `providers:write` crean/editan proveedores<br>- Unicidad de RFC validada en BD con índice único parcial |
| 3 | Encargado de catálogo / cobranza (`customers:write`, `reports:account_statements_read`) | Como encargado de catálogo, quiero capturar el saldo inicial (deuda inicial) de un cliente al darlo de alta para reflejar su deuda histórica al migrar del sistema anterior | - Campo "Saldo inicial" en el modal de cliente, numérico `>= 0`, default `0`<br>- Al crear, `currentBalance` arranca igual a `initialBalance`<br>- Editar el saldo inicial ajusta `currentBalance` por el delta, sin afectar cargos/abonos ya registrados<br>- El estado de cuenta (resumen y libro mayor) usa `initialBalance` como saldo de arranque del corrido, en vez de `0`<br>- La columna "Saldo inicial" aparece en el catálogo de clientes y en el resumen de estado de cuenta | - Sólo `customers:write` edita el saldo inicial<br>- El ajuste de `currentBalance` por delta ocurre de forma atómica (misma transacción del PATCH), sin condiciones de carrera con abonos concurrentes |
| 4 | Encargado de catálogo / compras (`providers:write`, `reports:purchases_read`) | Como encargado de catálogo, quiero capturar el saldo inicial (deuda inicial) de un proveedor al darlo de alta para reflejar la deuda pendiente heredada del sistema anterior | - Campo "Saldo inicial" en el modal de proveedor, numérico `>= 0`, default `0`<br>- Al crear, `currentBalance` arranca igual a `initialBalance`<br>- Editar el saldo inicial ajusta `currentBalance` por el delta<br>- El reporte de pagos a proveedores muestra `initialBalance` y `currentBalance` del proveedor<br>- La columna "Saldo inicial" aparece en el catálogo de proveedores (hoy sólo muestra código/nombre/RFC/régimen/contacto/estado, sin ningún saldo) | - Sólo `providers:write` edita el saldo inicial<br>- El ajuste de `currentBalance` por delta ocurre de forma atómica |

Nota: el ítem "RFC no obligatorio en cliente y proveedor" se dividió en las filas 1 y 2 porque son dos entidades/endpoints independientes con sus propios índices de unicidad y formularios, cada una testeable y desplegable por separado.

## Why

Hoy `Customer.rfc` y `Provider.rfc` son `NOT NULL UNIQUE`, lo que obliga a capturar un RFC incluso para clientes de mostrador o proveedores informales que nunca facturan — el negocio necesita poder registrarlos sin bloquear el alta. Por otro lado, `currentBalance` en ambas entidades siempre arranca en `0` y sólo se mueve por transacciones del sistema (ventas, compras, abonos), sin forma de cargar la deuda histórica al migrar clientes/proveedores desde el sistema anterior — hoy ese historial se pierde o se debe reconstruir manualmente con movimientos artificiales. Adicionalmente, `Provider` ya tiene en base de datos `creditLimit`, `currentBalance` y `creditDays` (columnas existentes, ver `prisma/schema.prisma:186-213`) que nunca se expusieron en `ProviderDto` ni en la UI — se aprovecha este change para cerrar esa asimetría frente a `Customer`, que sí las expone.

## What Changes

- `Customer.rfc` y `Provider.rfc` pasan de `String @unique` a `String?`, con un índice único parcial (`WHERE rfc IS NOT NULL`) que preserva la unicidad sólo entre valores capturados.
- Se agrega `Customer.initialBalance` y `Provider.initialBalance` (Decimal, default `0`). Al crear, `currentBalance = initialBalance`. Al editar (`PATCH`), un cambio en `initialBalance` ajusta `currentBalance` por el delta, dentro de la misma transacción.
- El estado de cuenta de clientes (`AccountLedgerBuilder`, resumen y libro mayor) usa `initialBalance` como saldo base del corrido en vez de `0` fijo.
- Se expone `currentBalance`, `creditLimit`, `creditDays` e `initialBalance` en `ProviderDto` (paridad con `CustomerDto`), y se agregan al reporte de pagos a proveedores.
- UI: el RFC deja de marcarse obligatorio (`*`) en los modales de cliente y proveedor; se agrega el campo "Saldo inicial" en ambos; se agregan columnas de saldo en ambas tablas de catálogo y en el resumen de estado de cuenta.

## Capabilities

### New Capabilities

(ninguna — este change extiende capabilities existentes)

### Modified Capabilities

- `customers-api`: `Create customer`, `Update customer`, `Customer credit balance is read-only via this API` — RFC opcional, `initialBalance`.
- `admin-providers`: `List providers`, `Create provider`, `Update provider` — RFC opcional, exposición de `currentBalance`/`creditLimit`/`creditDays`, `initialBalance`.
- `customers-ui`: `Customer create/edit modal with grouped sections including credit fields` — RFC opcional, campo "Saldo inicial".
- `providers-ui`: `Provider create/edit modal with grouped sections` — RFC opcional, campo "Saldo inicial".
- `account-statements-api`: `Account statement summary endpoint`, `Opening balance and date range` — `initialBalance` en el DTO de resumen; `openingBalance` sin `from` parte de `initialBalance` en vez de `0`.
- `reports-purchases-api`: `Provider payments report endpoint` — `initialBalance`/`currentBalance` del proveedor en la fila del reporte.

## Impact

- **Prisma**: migración `make_rfc_optional_and_add_initial_balance` — `customers.rfc`/`providers.rfc` a nullable + índice único parcial vía SQL crudo; `customers.initial_balance`/`providers.initial_balance` nuevos.
- **Backend**: `src/shared/infrastructure/http/validators.ts`, `src/modules/customers/{domain,application,infrastructure}/*`, `src/modules/providers/{domain,application,infrastructure}/*`, `src/modules/billing/application/use-cases/StampInvoiceUseCase.ts` (ajuste de tipos, sin cambio de comportamiento), `src/modules/reports/{application,domain}/*` (account statements + provider payments).
- **Frontend**: `app/(private)/catalogs/customers/_blocks/CustomerEditModal.tsx`, `app/(private)/catalogs/customers/_blocks/CustomersTable.tsx`, `app/(private)/catalogs/providers/_blocks/{ProviderEditModal,ProvidersTable}.tsx`, schemas Zod de ambos módulos, `app/(private)/reports/_blocks/SummaryTable.tsx`, `app/(private)/reports/purchases/_blocks/ProviderPaymentsTable.tsx`, PDFs/XLSX asociados.
- **Sin impacto** en el flujo de facturación fuera del ajuste de tipos (`rfc: string | null`) — `ReceiverFiscalDataIncompleteError` sigue bloqueando el timbrado de clientes sin RFC, comportamiento ya existente.
