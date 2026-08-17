## 1. Servicio de dominio: LedgerGrouper

- [x] 1.1 Creado `src/modules/reports/domain/services/LedgerGrouper.ts` (tipo `LedgerGroup` + `groupLedgerBySale`). Ajuste de diseño no anticipado: `LedgerSort` vivía en `GetAccountStatementLedgerUseCase.ts` (capa `application`) — importarlo desde ahí en un servicio de `domain/` violaría la regla de capas del proyecto ("el dominio no importa de infraestructura/aplicación"). Se reubicó `LedgerSort` a `domain/value-objects/AccountMovement.ts` (junto a `AccountMovementType`) y el use case ahora lo importa de ahí — sin consumidores externos rotos (verificado, nada más importaba `LedgerSort` desde el use case).
- [x] 1.2 Creado `tests/unit/modules/reports/domain/services/LedgerGrouper.test.ts` — 8 tests, todos en verde.

## 2. DTO y use case

- [x] 2.1 Agregado `AccountStatementLedgerGroupDto` y campo `groups` en `AccountStatementLedgerResponseDto`.
- [x] 2.2 Extraída función `toMovementDto()` del mapeo inline, reusada para `movements[]` y `groups[]`.
- [x] 2.3 Wireado `groupLedgerBySale(visible, req.sort)` + `ticketBalance` + `groups` en el retorno.

## 3. Tests de integración (use case + controller)

- [x] 3.1 No existía un archivo dedicado para el use case — cobertura vive en `ReportsController.test.ts` bajo `getAccountStatementLedger` (consistente con el resto del archivo). Agregados: "200 groups agrupa la venta con su abono y calcula ticketBalance" (verifica `groups[0].sale.id`, `payments`, `ticketBalance="300.0000"`, y que `movements[]`/`closingBalance` no cambian) y "200 groups: abono con venta fuera del rango va al grupo sale:null". Los tests unitarios de `LedgerGrouper.test.ts` (1.2) ya cubren `sort=invoice`/`serie` reordenando grupos sin tocar el orden interno de `payments`.

## 4. PDF

- [x] 4.1 `AccountStatementLedgerPdf` reescrito: `MovementRow`/`GroupSection` nuevos, `data.groups.map(...)` en vez de `data.movements.map(...)`. Fila de venta + filas de abono + subtotal "Saldo ticket" por grupo; grupo `sale: null` antecedido de título de sección (`s.departmentTitle`).

## 5. XLSX

- [x] 5.1 `buildAccountStatementLedgerWorkbook.ts` reescrito: `movementRow()` extraído, loop sobre `data.groups` — fila de `sale` (o título de sección si `null`), filas de `payments`, fila `["Saldo ticket", ticketBalance]` cuando aplica. Este endpoint no tenía ningún test xlsx previo (solo PDF/JSON) — agregado "200 xlsx agrupa venta + abono + saldo ticket en filas consecutivas" en `ReportsController.test.ts` parseando el buffer real con `XLSX.read`.

## 6. UI

- [x] 6.1 `LedgerTable.tsx` reescrito: prop `movements` → `groups`; `MovementRow` extraído, `Fragment` por grupo con borde izquierdo (`border-l-primary/30`) + indentación en abonos; fila de encabezado de sección para el grupo `sale: null`. Pie de tabla sin cambio.
- [x] 6.2 Agregado `AccountStatementLedgerGroupDto` y campo `groups` en `AccountStatementLedgerDto` (`_logic/types/api.ts`) — sin mapper/parser intermedio en el frontend (el hook ya consume el DTO crudo directamente), así que no hizo falta tocar otro archivo.
- [x] 6.3 `LedgerPage.tsx`: `<LedgerTable groups={ledger.groups} .../>` en vez de `movements={ledger.movements}`; el chequeo de vacío sigue usando `ledger.movements.length === 0` (sin cambio, sigue siendo válido).

## 7. Verificación

- [x] 7.1 `npm test` — 471/471 suites, 3337/3337 tests en verde.
- [x] 7.2 `npm run build` — sin errores de tipos (Node 20.20.2), `/reports/account-statements/[customerId]` compila con las nuevas props.
- [x] 7.3 Verificado con Playwright real (`tests/e2e/plan-verification.spec.ts`, test "C6 — estado de cuenta agrupa venta a crédito con su abono (padre + hijo)"): sembrada una venta a crédito (folio E2E-PLTK-000001, total $200) con 1 abono parcial ($50, folio E2E-PLRCB-000001) contra `customers.currentBalance=150`. Confirmado en `/reports/account-statements/[customerId]`: fila de la venta visible, fila del abono en la posición `tbody tr` inmediatamente siguiente a la de su venta (padre → hijo), y saldo final "$150.00" visible — coincide con `currentBalance` sembrado. Export PDF/Excel no verificado en este pase (cubierto ya por el test unitario real de `buildAccountStatementLedgerWorkbook` vía `XLSX.read` en tarea 5.1, que ejercita el mismo código de producción).
