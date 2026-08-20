## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador/Contador con acceso a estados de cuenta (`reports:account_statements_read`) | Como Operador, quiero que el estado de cuenta agrupe cada venta a crédito con sus abonos relacionados (venta padre + abonos hijos), en pantalla, PDF y Excel, para identificar de un vistazo qué abonos liquidan cuál ticket sin tener que cruzar folios manualmente en una lista plana | - Given un cliente con una venta a crédito y 2 abonos parciales contra ella, When se consulta el desglose, Then la respuesta incluye `groups[]` con un grupo cuyo `sale` es la venta y `payments` son los 2 abonos, más un `ticketBalance` = total de la venta menos la suma de los abonos.<br>- Given un abono cuya venta cae fuera del rango de fechas consultado (folded en `openingBalance`), When se consulta con `?from=`, Then ese abono aparece en un único grupo final con `sale: null`, no mezclado con los demás grupos.<br>- Given el mismo desglose, When se compara `closingBalance` y `totals` con el comportamiento actual (lista plana), Then los valores numéricos son idénticos — el agrupado es solo de presentación, no reordena ni recalcula el saldo corrido (`AccountLedgerBuilder` sin cambios).<br>- Given `?sort=invoice` o `?sort=serie`, When se consulta, Then los GRUPOS se ordenan por ese criterio (folio de la venta), pero los abonos dentro de cada grupo siempre quedan en orden cronológico, y el grupo de abonos-sin-venta-visible siempre va al final sin importar el `sort`.<br>- Given una venta de contado (sin abonos ligados), When aparece en `groups[]`, Then es un grupo con `sale` poblado, `payments: []` y `ticketBalance: "0.0000"`.<br>- Given el campo `movements[]` plano ya existente, When se consulta el mismo endpoint, Then sigue presente sin cambios — `groups[]` es aditivo, no reemplaza `movements[]`. | - Sin cambios de RBAC/branch scoping — mismo permiso `reports:account_statements_read` y mismo `enforceBranchScope` ya aplicado al endpoint; el agrupado no expone datos de otro cliente ni de otra sucursal que `movements[]` no expusiera ya.<br>- Integridad numérica: `ticketBalance` y `closingBalance` deben derivarse exclusivamente de los mismos `debit`/`credit` ya calculados por `AccountLedgerBuilder` — ninguna ruta nueva de cálculo de saldo que pueda divergir del valor ya validado contra `customers.current_balance`. |

## Why

`GET /api/v1/admin/reports/account-statements/:customerId` devuelve `movements[]` como lista plana: una venta a crédito es una fila, y cada abono contra ella aparece en otra fila sin relación estructural visible entre ambas. El cliente pidió explícitamente "Estado de cuenta agrupar movimientos relacionados por ticket" — hoy el operador tiene que cruzar folios manualmente para saber qué abonos liquidan qué venta. `customer_payments.sale_id` (NOT NULL en BD) ya provee esa relación en los datos; falta exponerla en la respuesta y reflejarla en pantalla/exports.

## What Changes

- `GetAccountStatementLedgerUseCase`: agregar `groups: AccountStatementLedgerGroupDto[]` a la respuesta — computado por un nuevo servicio de dominio puro que agrupa los movimientos ya calculados por `AccountLedgerBuilder` (venta padre + sus abonos, o un grupo final para abonos cuya venta cae fuera del rango visible).
- `AccountStatementLedgerResponseDto` / tipo espejo en frontend (`app/.../_logic/types/api.ts`): nuevo campo `groups[]`, aditivo — `movements[]` se mantiene sin cambios.
- `LedgerTable.tsx`: pasa de renderizar `movements` plano a renderizar `groups` — fila de venta + filas de abonos indentadas debajo, con el saldo del ticket.
- `AccountStatementLedgerPdf` y `buildAccountStatementLedgerWorkbook.ts`: mismo cambio de estructura en PDF y Excel.
- Sin cambios en `AccountLedgerBuilder` (el cálculo de `runningBalance`/`closingBalance` es la fuente de verdad numérica, no se toca) ni en los filtros `history`/`sort` existentes sobre `movements[]` — el `sort` se extiende para ordenar también `groups[]` por el mismo criterio.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `account-statements-api`: el requirement "Account statement ledger endpoint" gana el campo `groups[]` en el cuerpo de la respuesta. El requirement "Ledger sort order (Orden de Información)" se extiende para especificar que `?sort` también ordena `groups[]` (por venta), preservando cronología de los hijos. El requirement "PDF export and format selection" se extiende: el PDF y el Excel del libro mayor pasan de una fila por movimiento a una estructura agrupada venta→abonos.
- `reports-ui`: el requirement "Account statement ledger detail view" se extiende — la tabla de movimientos pasa a mostrar la agrupación venta padre + abonos hijos en vez de la lista plana.

## Impact

- `src/modules/reports/domain/services/` (nuevo servicio de agrupación)
- `src/modules/reports/application/use-cases/GetAccountStatementLedgerUseCase.ts`
- `src/modules/reports/application/dto/AccountStatementLedgerResponseDto.ts`
- `src/modules/reports/infrastructure/pdf/AccountStatementPdf.tsx` (función `AccountStatementLedgerPdf`)
- `src/modules/reports/infrastructure/xlsx/buildAccountStatementLedgerWorkbook.ts`
- `app/(private)/reports/_blocks/LedgerTable.tsx`
- `app/(private)/reports/_blocks/LedgerPage.tsx` (pasa `groups` en vez de `movements` a `LedgerTable`)
- `app/(private)/reports/_logic/types/api.ts`
- Sin cambios de permisos, branch scoping, ni migraciones de BD.
