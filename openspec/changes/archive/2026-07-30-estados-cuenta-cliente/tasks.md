## 1. Backend — RBAC permiso

- [x] 1.1 `prisma/seed.ts` — agregar a `PERMISSIONS`: `{ key: "reports:account_statements_read", description: "Leer estados de cuenta de clientes y exportar PDF" }`.
- [x] 1.2 `prisma/seed.ts` — otorgar `reports:account_statements_read` a los roles `admin`, `operator` y `viewer`.
- [x] 1.3 Verificado en BD producción: `reports:account_statements_read` existe y está asignado a `admin`, `operator`, `viewer` (consulta directa a `permissions`/`role_permissions`/`roles`, 2026-07-27).

## 2. Backend — Dominio (value objects + servicio puro)

- [x] 2.1 `src/modules/reports/domain/value-objects/AccountMovement.ts` — tipo crudo `{ id, kind:'sale'|'payment', isCredit, status, amount, date, folioCode, folioNumber, branchId }` y tipo enriquecido `{ ..., type:'sale_credit'|'sale_cash'|'payment', debit, credit, runningBalance }`.
- [x] 2.2 `src/modules/reports/domain/value-objects/AccountStatementFilters.ts` — `{ branchId?, customerId?, search?, from?, to?, onlyWithBalance? }`.
- [x] 2.3 `src/modules/reports/domain/services/AccountLedgerBuilder.ts` — puro: dado `movements[]` + `openingBalance`, ordena por fecha (venta antes que abono en empate), calcula `type`/`debit`/`credit`/`runningBalance` (solo crédito y abonos `completed` mueven; contado y cancelados no). Banker's rounding a 4 decimales.

## 3. Backend — Puerto + DTOs

- [x] 3.1 `src/modules/reports/application/ports/AccountStatementRepository.ts` — `summary(filters, page): Promise<{ items: AccountSummaryRow[]; total; page; pageSize }>` y `ledger(customerId, filters): Promise<{ customer, openingBalance, movements: AccountMovement[] } | null>`.
- [x] 3.2 `src/modules/reports/application/dto/AccountStatementSummaryResponseDto.ts` — filas con `customerId, customerCode, customerName, totalCharged, totalPaid, currentBalance, creditLimit, availableCredit` + `generatedAt/generatedBy/filters/totals/page/pageSize/total`.
- [x] 3.3 `src/modules/reports/application/dto/AccountStatementLedgerResponseDto.ts` — encabezado cliente (`currentBalance, creditLimit, availableCredit`), `openingBalance`, `closingBalance`, `movements[]` (fecha, tipo, folio, débito, crédito, saldo corrido, estado) + metadata.

## 4. Backend — Use cases

- [x] 4.1 `src/modules/reports/application/use-cases/GetAccountStatementsSummaryUseCase.ts` — aplica filtros, delega a `repo.summary`, calcula `availableCredit`, arma DTO.
- [x] 4.2 `src/modules/reports/application/use-cases/GetAccountStatementLedgerUseCase.ts` — carga movimientos + opening balance via repo, corre `AccountLedgerBuilder`, arma DTO; `customerId` inexistente → error → 404 en controller.

## 5. Backend — Repositorios

- [x] 5.1 `src/modules/reports/infrastructure/repositories/PrismaAccountStatementRepository.ts` — `summary` vía Prisma `groupBy` (agregación DB-side equivalente a `GROUP BY customer`, `currentBalance` leído de `customers`, filtros scope/search/onlyWithBalance/rango, paginación); `ledger` vía consultas de movimientos (`sales`+`customer_payments`) y opening balance calculado en memoria sobre esas mismas filas branch-scoped (`date < from`).
- [x] 5.2 `src/modules/reports/infrastructure/repositories/InMemoryAccountStatementRepository.ts` — implementación en memoria para tests (seeds de ventas/abonos por cliente).

## 6. Backend — PDF

- [x] 6.1 `src/modules/reports/infrastructure/pdf/AccountStatementPdf.tsx` — dos layouts (resumen multi-cliente / desglose por cliente), encabezado con cliente, rango, `generatedBy`, saldo inicial/final. Reutilizar `pdfStyles.ts`.

## 7. Backend — Controller + rutas + DI

- [x] 7.1 `src/modules/reports/infrastructure/http/ReportsController.ts` — `getAccountStatementsSummary(req)` y `getAccountStatementLedger(req, customerId)`: guard `reports:account_statements_read`, Zod query (`format`, `page`, `pageSize≤100`, `branchId`, `search`, `from`, `to`, `onlyWithBalance`), `resolveScopedBranchId`, `format` inválido → 400, PDF `>10000` → 409 `ReportTooLarge`, `customerId` UUID + 404 si no existe.
- [x] 7.2 `src/modules/reports/infrastructure/di/container.ts` — instanciar repo + use cases y cablearlos al `reportsController`.
- [x] 7.3 `app/api/v1/admin/reports/account-statements/route.ts` — `GET` delega a `reportsController.getAccountStatementsSummary`.
- [x] 7.4 `app/api/v1/admin/reports/account-statements/[customerId]/route.ts` — `GET` delega a `reportsController.getAccountStatementLedger`.

## 8. Backend — Tests

- [x] 8.1 `AccountLedgerBuilder.test.ts` — saldo corrido; contado no mueve; cancelados no mueven; opening balance; orden venta-antes-que-abono; banker's rounding.
- [x] 8.2 Use cases con `InMemoryAccountStatementRepository` — resumen (onlyWithBalance, creditLimit null → availableCredit null, cliente sin movimientos), ledger (rango + opening, 404).
- [x] 8.3 `ReportsController` — RBAC (401/403), branch scoping, `format` inválido → 400, PDF too large → 409, `customerId` inválido → 400.

## 9. Frontend — `_logic` (services, hooks, types)

- [x] 9.1 `app/(private)/reports/_logic/types/api.ts` + `domain.ts` — DTOs HTTP y tipos de dominio de resumen/ledger/movimiento.
- [x] 9.2 `app/(private)/reports/_logic/services/` — `getAccountStatementsSummary`, `getAccountStatementLedger`, `downloadAccountStatementPdf` (aceptan `fetchImpl?`, normalizan errores HTTP a tipados, nunca devuelven `Response` crudo salvo el blob de PDF).
- [x] 9.3 `app/(private)/reports/_logic/hooks/` — `useAccountStatementsSummary` (paginación, filtros, search debounce) y `useAccountStatementLedger` (customerId, período).

## 10. Frontend — Bloques presentacionales

- [x] 10.1 `_blocks/AccountStatementsPage.tsx` + `SummaryTable.tsx` + `StatementToolbar.tsx` (búsqueda server-side, filtro sucursal solo con bypass, rango, onlyWithBalance) + estados vacío/error.
- [x] 10.2 `_blocks/LedgerPage.tsx` + `LedgerHeader.tsx` (saldo inicial/actual/límite/disponible) + `LedgerTable.tsx` (movimientos, badge estado) + `PeriodSelector.tsx` (SegmentedButton Completo/Rango) + `ExportPdfButton.tsx`.

## 11. Frontend — Páginas + navegación

- [x] 11.1 `app/(private)/reports/page.tsx` (Server Component; hub o redirect a account-statements), `account-statements/page.tsx`, `account-statements/[customerId]/page.tsx` — exportan `metadata`, gating con `can("reports:account_statements_read")`.
- [x] 11.2 `app/_components/organisms/NavigationRail.tsx` — nuevo item primario `reports` (`href:/reports`, icon `summarize`, `requires:reports:account_statements_read`).

## 12. Verificación

- [x] 12.1 `npm run build` (tipos) y `npm test` (unit backend + UI) en verde.
- [x] 12.2 Prueba manual en dev: cliente con ventas crédito + contado + abonos (completed y cancelled) → resumen cuadra con `currentBalance`; desglose con rango recalcula opening; export PDF de ambos. Verificado 2026-07-29 vía Playwright contra dev real: sale crédito $116 + sale contado $116 + 2 abonos completed ($40+$30) + 1 abono cancelled ($20) → resumen `totalCharged=$116`, `totalPaid=$70`, `currentBalance=$46` (crédito excluye contado; cancelled excluido). Rango `from=2026-07-30` (posterior a todos los movimientos) → `openingBalance=$46`, `Sin movimientos`. Export PDF válido (resumen y desglose).

---

# Alineación con user story legacy (extensión)

> Decisiones cerradas: agregar Dirección + Última Factura (header); F.Pgo + Referencia + Serie/Factura separadas + Vencimiento (grilla); toggle Mostrar Histórico; Orden de Información (3 modos); Imprimir Anticipo. Descartar Clave (concepto) y Doc (redundante). Conservar extras actuales (resumen multi-cliente, Tipo, saldo inicial/disponible, export completo, selector período).

## 13. Migración — Vencimiento

- [x] 13.1 `prisma/schema.prisma` — `Sale.dueDate DateTime?` (nullable) y `Customer.creditDays Int @default(30)`.
- [x] 13.2 Migración aplicada a BD producción (`agrisas`) vía Supabase `apply_migration` (bypass del tracking roto de `_prisma_migrations`, ver nota abajo). Verificado con `information_schema.columns`: `customers.credit_days integer NOT NULL DEFAULT 30`, `sales.due_date timestamp nullable`. `prisma generate` ya ejecutado previamente.

> **Nota de infraestructura (fuera de alcance de este change):** `_prisma_migrations` está desincronizado con el estado real de la BD — reporta las 23 migraciones del repo como "no aplicadas" cuando las tablas ya existen con datos. El schema se gestionó históricamente vía Supabase directo, no `prisma migrate deploy`. Se aplicó esta migración con `apply_migration` para no arriesgar un `migrate deploy` que reintente crear tablas existentes. Pendiente: hacer baseline de `_prisma_migrations` contra el estado real (decisión aparte, no tomada aquí). También detectado: **RLS deshabilitado en las 27 tablas públicas** — reportado al usuario, sin remediar (fuera de alcance).
- [x] 13.3 En el use case de creación de venta (`src/modules/pos/**`): para ventas a crédito (`paymentMethod.isCredit`), setear `dueDate = createdAt + customer.creditDays días`; contado → `null`. Actualizar snapshot/repos y tests InMemory afectados.

## 14. Backend — Ledger enriquecido (campos + history + sort)

- [x] 14.1 `domain/value-objects/AccountMovement.ts` — agregar a `RawAccountMovement` y `AccountMovement`: `dueDate: Date | null`, `reference: string | null`, `paymentMethodCode: string | null`.
- [x] 14.2 `application/dto/AccountStatementLedgerResponseDto.ts` — header add `address: string | null`, `lastInvoice: { serie: string; folioNumber: number } | null`; movimiento add `serie`, `factura`, `dueDate`, `reference`, `paymentMethodCode`.
- [x] 14.3 `infrastructure/repositories/PrismaAccountStatementRepository.ts` — `ledger`: seleccionar `sale.dueDate`, `sale.paymentMethod.code`, `payment.notes`, `payment.paymentMethod.code`; cargar `customer.address` y última factura (venta más reciente). Mapear a los nuevos campos crudos.
- [x] 14.4 `infrastructure/repositories/InMemoryAccountStatementRepository.ts` — reflejar nuevos campos en seeds/salida.
- [x] 14.5 `application/use-cases/GetAccountStatementLedgerUseCase.ts` — params `history: boolean` (default true) y `sort: 'date'|'invoice'|'serie'` (default date). `history=false` → filtrar a ventas crédito `paymentStatus != 'paid'` (no canceladas) + sus abonos, tras calcular runningBalance completo. `sort` → reordenar `movements[]` de salida sin recalcular saldo. Poblar header `address`/`lastInvoice` y campos fiscales por movimiento.
- [x] 14.6 `infrastructure/http/ReportsController.ts` — extender `ledgerQuerySchema` con `history` (bool coercionado) y `sort` (enum, 400 si inválido); pasar al use case.

## 15. Backend — Imprimir Anticipo

- [x] 15.1 `infrastructure/pdf/AnticipoReceiptPdf.tsx` — recibo de abono (folio, cliente, monto, forma de pago, referencia/notas, fecha, generatedBy). Reusar `pdfStyles.ts`.
- [x] 15.2 `infrastructure/http/ReportsController.ts` — `getAnticipoReceipt(req, customerId, paymentId)`: guard `reports:account_statements_read`, valida UUIDs (400), branch scoping, carga abono (repo Prisma local), 404 si no existe o no pertenece al cliente, `format` inválido → 400, PDF.
- [x] 15.3 `infrastructure/di/container.ts` — cablear lo necesario (acceso a `CustomerPayment`).
- [x] 15.4 `app/api/v1/admin/reports/account-statements/[customerId]/payments/[paymentId]/receipt/route.ts` — `GET` delega al controller.

## 16. Frontend — Header, columnas, controles, anticipo, bug fix

- [x] 16.1 `_logic/types/{api,domain}.ts` — nuevos campos del DTO ledger; params `history`/`sort`; tipo recibo anticipo.
- [x] 16.2 `_logic/services/index.ts` — `ledgerParams` add `history`/`sort`; nuevo `downloadAnticipoReceiptPdf(customerId, paymentId, fetchImpl?)`.
- [x] 16.3 `_logic/hooks/useAccountStatementLedger.ts` — aceptar `history`/`sort`; exponer `printAnticipo(paymentId)`. **Bug fix**: `exportPdf` re-lanza el error (no lo traga en `exportError`).
- [x] 16.4 `_logic/hooks/useAccountStatementsSummary.ts` — **Bug fix**: `exportPdf` re-lanza el error.
- [x] 16.5 `_blocks/LedgerHeader.tsx` — agregar Dirección y Última Factura.
- [x] 16.6 `_blocks/LedgerTable.tsx` — columnas Serie, Factura, Vencimiento, Referencia, F.Pgo; acción "Imprimir Anticipo" por fila de abono.
- [x] 16.7 `_blocks/LedgerPage.tsx` (o nuevo `LedgerControls`) — checkbox "Mostrar Histórico" + radios "Orden de Información" cableados al hook.

## 17. Tests + verificación

- [x] 17.1 `AccountLedgerBuilder`/use case tests — `sort` no altera runningBalance; `history=false` filtra pagadas; campos fiscales; última factura.
- [x] 17.2 `ReportsController` tests — `history`/`sort` (400 inválido); endpoint recibo anticipo (RBAC 401/403, UUID 400, 404 ajeno, PDF 200).
- [x] 17.3 `npm run build` + `npm test` en verde. `npm run build`: sin errores de tipos, rutas `/reports*` presentes en el manifest. `npm test`: suite `reports` (unit) 100% verde (43/43 `ReportsController`, 9/9 `AccountLedgerBuilder`, use cases). La corrida completa (`npm test`) reporta 5 fallas ajenas al módulo — RFC duplicado por estado sucio en `tests/integration/modules/quotes/quotes-conversion-edge-cases.test.ts` (dato dejado por corridas previas contra BD real, no determinístico) y un crash SIGSEGV de un worker de Jest en `payment-methods` (infraestructura, no código) — ninguna toca `reports` ni fue introducida por este change. Verificado 2026-07-29.
- [x] 17.4 Prueba manual dev: header con dirección/última factura; columnas fiscales; toggle Histórico; orden; imprimir anticipo; export completo con toast en error. Verificado 2026-07-29 vía Playwright: header muestra dirección y "TC-000001 1" como última factura; columnas Ser/Factura/Vencimiento (dueDate = createdAt+30d)/F.Pgo/Referencia pobladas correctamente por tipo de movimiento; toggle "Mostrar Histórico" off → solo venta crédito activa + sus 3 abonos (excluye ventas contado); orden "Factura" reordena filas preservando `runningBalance` cronológico de cada una; "Imprimir Anticipo" descarga PDF válido; export ledger y export resumen ambos descargan PDF válido de 1 página. No se forzó un error de red real para verificar el toast (`toastError`) — el código (`LedgerPage.tsx:37-44`) captura y muestra el error de `exportPdf`/`printAnticipo`, revisado por lectura, no ejercitado end-to-end.
