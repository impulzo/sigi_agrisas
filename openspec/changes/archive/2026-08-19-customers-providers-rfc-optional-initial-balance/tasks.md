## 1. Base de datos

- [x] 1.1 `prisma/schema.prisma`: `Customer.rfc` y `Provider.rfc` pasan de `String @unique` a `String?` (quitar `@unique`).
- [x] 1.2 Agregar `Customer.initialBalance Decimal @default(0) @map("initial_balance") @db.Decimal(12,4)` y `Provider.initialBalance Decimal @default(0) @map("initial_balance") @db.Decimal(12,4)`.
- [x] 1.3 Generar migración `make_rfc_optional_and_add_initial_balance`; editar el SQL generado para agregar, tras el `ALTER TABLE ... DROP CONSTRAINT` del unique existente: `CREATE UNIQUE INDEX customers_rfc_key ON customers(rfc) WHERE rfc IS NOT NULL;` y `CREATE UNIQUE INDEX providers_rfc_key ON providers(rfc) WHERE rfc IS NOT NULL;`.
- [x] 1.4 `npx prisma migrate dev` + `npx prisma generate`.

## 2. Backend — Validación compartida de RFC

- [x] 2.1 `src/shared/infrastructure/http/validators.ts`: agregar `optionalRfcSchema` (acepta `undefined`/`null`/`""` → `null`; valor no vacío se valida con el mismo regex que `rfcSchema` y se normaliza a mayúsculas).

## 3. Backend — Clientes

- [x] 3.1 `src/modules/customers/domain/entities/Customer.ts`: `rfc: string | null`, agregar `initialBalance: number`.
- [x] 3.2 `src/modules/customers/application/dto/{CustomerDto,CreateCustomerRequest,UpdateCustomerRequest}.ts`: `rfc: string | null` (opcional en create/update), `initialBalance` (requerido con default `0` en create; opcional en update).
- [x] 3.3 `src/modules/customers/infrastructure/http/CustomersController.ts`: reemplazar `rfc: rfcSchema` por `rfc: optionalRfcSchema` en create (línea ~55) y update (línea ~78); agregar `initialBalance: z.number().min(0).optional()` a ambos schemas.
- [x] 3.4 `src/modules/customers/infrastructure/repositories/PrismaCustomerRepository.ts`: en `create`, `currentBalance = initialBalance ?? 0`; el chequeo de `CustomerRfcAlreadyInUseError` sólo corre cuando `rfc != null`; en `update`, si `initialBalance` viene en el patch, calcular delta contra el valor actual y aplicar `UPDATE customers SET current_balance = current_balance + $delta, initial_balance = $new WHERE id = $id` (o equivalente con Prisma `increment`).
- [x] 3.5 `src/modules/customers/infrastructure/repositories/InMemoryCustomerRepository.ts`: replicar el mismo comportamiento (rfc nullable + unicidad condicional + initialBalance/currentBalance).
- [x] 3.6 `src/modules/customers/application/mappers/toCustomerDto.ts` (o equivalente): incluir `initialBalance`.

## 4. Backend — Proveedores

- [x] 4.1 `src/modules/providers/domain/entities/Provider.ts`: `rfc: string | null`, agregar `creditLimit`, `currentBalance`, `creditDays`, `initialBalance` si no existen ya en la entidad.
- [x] 4.2 `src/modules/providers/application/dto/{ProviderDto,CreateProviderRequest,UpdateProviderRequest}.ts`: `rfc: string | null` (opcional), agregar `creditLimit: number | null`, `currentBalance: number`, `creditDays: number`, `initialBalance: number`.
- [x] 4.3 `src/modules/providers/infrastructure/http/ProviderController.ts`: reemplazar `rfc: rfcSchema` por `rfc: optionalRfcSchema` en create (línea ~37) y update (línea ~61); agregar `creditLimit: z.number().min(0).nullable().optional()`, `creditDays: z.number().int().min(0).optional()`, `initialBalance: z.number().min(0).optional()`.
- [x] 4.4 `src/modules/providers/infrastructure/repositories/PrismaProviderRepository.ts`: incluir `creditLimit`/`currentBalance`/`creditDays`/`initialBalance` en select; en `create`, `currentBalance = initialBalance ?? 0`; el chequeo de `ProviderRfcAlreadyInUseError` sólo corre cuando `rfc != null`; en `update`, mismo ajuste por delta que clientes.
- [x] 4.5 `src/modules/providers/infrastructure/repositories/InMemoryProviderRepository.ts`: replicar el comportamiento para tests.

## 5. Backend — Estado de cuenta (clientes)

- [x] 5.1 `src/modules/reports/application/dto/AccountStatementSummaryResponseDto.ts`: agregar `initialBalance: string`.
- [x] 5.2 `GetAccountStatementsSummaryUseCase` (o el use case correspondiente al resumen): incluir `initialBalance` en cada fila.
- [x] 5.3 `src/modules/reports/application/use-cases/GetAccountStatementLedgerUseCase.ts` líneas ~119,121,124,173: cambiar la base de `openingBalance` de `0` a `customer.initialBalance`.

## 6. Backend — Reporte de pagos a proveedores

- [x] 6.1 `src/modules/reports/application/dto/ProviderPaymentsReportResponseDto.ts`: agregar `providerInitialBalance: string`, `providerCurrentBalance: string` por fila.
- [x] 6.2 `GetProviderPaymentsReportUseCase.ts`: incluir ambos campos leyendo el proveedor de cada pago.
- [x] 6.3 `src/modules/reports/infrastructure/pdf/ProviderPaymentsReportPdf.tsx` e `infrastructure/xlsx/buildProviderPaymentsReportWorkbook.ts`: agregar columnas "Saldo inicial" y "Saldo actual" del proveedor.

## 7. Frontend — Clientes

- [x] 7.1 `app/(private)/catalogs/customers/_logic/schemas/customer.schema.ts`: `rfc` pasa a opcional en `createCustomerSchema` (ya opcional en update); agregar `initialBalance` numérico `>= 0`, opcional (default `0`).
- [x] 7.2 `app/(private)/catalogs/customers/_logic/types/{api,domain}.ts`: `rfc: string | null`, agregar `initialBalance`.
- [x] 7.3 `app/(private)/catalogs/customers/_blocks/CustomerEditModal.tsx`: quitar el `*` del label de RFC (línea ~330); agregar campo "Saldo inicial" en la sección de crédito; estado, hidratación, envío, diff.
- [x] 7.4 `app/(private)/catalogs/customers/_blocks/CustomersTable.tsx`: RFC muestra `—` si `null`; agregar columna "Saldo inicial" antes de "Saldo actual".

## 8. Frontend — Proveedores

- [x] 8.1 `app/(private)/catalogs/providers/_logic/schemas/provider.schema.ts`: `rfc` pasa a opcional en `createProviderSchema`; agregar `initialBalance`, `creditLimit`, `creditDays` si no existen ya en el schema (verificar si el schema actual ya los omite por completo, dado que `ProviderDto` no los exponía).
- [x] 8.2 `app/(private)/catalogs/providers/_logic/types/{api,domain}.ts`: `rfc: string | null`, agregar `creditLimit`, `currentBalance`, `creditDays`, `initialBalance`.
- [x] 8.3 `app/(private)/catalogs/providers/_blocks/ProviderEditModal.tsx`: quitar el `*` del label de RFC (línea ~277); agregar sección/campos "Límite de crédito", "Plazo (días)", "Saldo inicial" (paridad con el modal de clientes).
- [x] 8.4 `app/(private)/catalogs/providers/_blocks/ProvidersTable.tsx`: RFC muestra `—` si `null`; agregar columnas "Saldo inicial" y "Saldo actual".

## 9. Frontend — Reportes

- [x] 9.1 `app/(private)/reports/_blocks/SummaryTable.tsx`: agregar columna "Saldo inicial" entre "Cliente" y "Cargado".
- [x] 9.2 `app/(private)/reports/_logic/types/api.ts` (account-statements): agregar `initialBalance` al DTO espejo.
- [x] 9.3 `app/(private)/reports/purchases/_blocks/ProviderPaymentsTable.tsx`: agregar columnas "Saldo inicial" y "Saldo actual" del proveedor.
- [x] 9.4 `app/(private)/reports/purchases/_logic/types/api.ts`: agregar `providerInitialBalance`/`providerCurrentBalance` al DTO espejo.

## 10. Tests

- [x] 10.1 Test de `CustomersController`/`ProviderController`: crear sin RFC (201, `rfc: null`); dos entidades sin RFC coexisten; RFC duplicado no-nulo sigue rechazado (409); `initialBalance` negativo rechazado (400).
- [x] 10.2 Test de `PrismaCustomerRepository`/`InMemoryCustomerRepository` (o equivalente de integración): `initialBalance` en create fija `currentBalance`; `initialBalance` en update ajusta `currentBalance` por delta sin tocar movimientos previos.
- [x] 10.3 Mismos tests para `Provider`.
- [x] 10.4 Test de `GetAccountStatementLedgerUseCase`/`AccountLedgerBuilder`: `openingBalance` sin `from` parte de `initialBalance`, no de `0`; convergencia `closingBalance === customer.currentBalance` se mantiene con `initialBalance != 0`.
- [x] 10.5 Test de `GetProviderPaymentsReportUseCase`: fila incluye `providerInitialBalance`/`providerCurrentBalance`.
- [x] 10.6 Test RTL de `CustomerEditModal` y `ProviderEditModal`: RFC vacío no bloquea submit; "Saldo inicial" negativo bloquea submit con error inline.
- [x] 10.7 Test de migración/schema: confirmar que dos filas con `rfc = NULL` no violan el índice único (test de integración contra Prisma o verificación manual documentada).

## 11. Verificación manual

- [x] 11.1 Crear cliente sin RFC y proveedor sin RFC → confirmar alta exitosa y que RFC muestra `—` en las tablas.
- [x] 11.2 Crear un segundo cliente sin RFC → confirmar que no hay conflicto 409.
- [x] 11.3 Crear cliente con saldo inicial `1000` → confirmar `Saldo actual = 1000` en el catálogo; editar saldo inicial a `1300` → confirmar `Saldo actual` sube en `300` (no se resetea a `1300`).
- [x] 11.4 Repetir 11.3 para proveedor.
- [x] 11.5 `/reports/account-statements` → confirmar columna "Saldo inicial" en el resumen y que el libro mayor de ese cliente arranca su corrido en el saldo inicial capturado.
- [x] 11.6 `/reports/purchases` → pestaña "Pagos a Proveedores" → confirmar columnas de saldo inicial/actual del proveedor.
