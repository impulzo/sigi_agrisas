## 1. Backend — ports, DTOs, mapper

- [x] 1.1 `PaymentRepository.ts`: agregar `saleTotal`, `salePaidAmount`, `salePaymentStatus` a `PaymentDisplayJoins` y a `PaymentHistoryItem`.
- [x] 1.2 `PaymentDto.ts`: agregar `saleTotal`, `salePaidAmount`, `salePaymentStatus`, `saleDueAmount` a `PaymentDto` y a `PaymentHistoryRowDto`.
- [x] 1.3 `toPaymentDto.ts`: extender `JoinedFields` con los 3 campos nuevos; `toPaymentDto()` calcula `saleDueAmount`; crear `toPaymentHistoryRowDto()` (mapper nuevo, centraliza el mapeo hoy duplicado inline en el controller).

## 2. Backend — repositorios

- [x] 2.1 `PrismaPaymentRepository.ts`: agregar los 3 campos en los 5 puntos de construcción de `joins` (`createCompleted`, `markCancelled`, `findById`, `list`, `listBySale`).
- [x] 2.2 `PrismaPaymentRepository.ts` `findHistory()`: agregar `s.total`, `s.paid_amount`, `s.payment_status` al SELECT raw; extender `ItemRow`; mapear a `PaymentHistoryItem`.
- [x] 2.3 `InMemoryPaymentRepository.ts`: replicar exactamente los mismos 6 puntos de construcción (5 de `joins` + `findHistory`) para no romper la compilación de los tests de use-cases.

## 3. Backend — use cases y controller

- [x] 3.1 `RegisterPaymentUseCase.ts` y `CancelPaymentUseCase.ts`: pasar los 3 campos nuevos al objeto `joined`.
- [x] 3.2 `PaymentsController.ts`: `historyQuerySchema.format` gana `"xlsx"`.
- [x] 3.3 `PaymentsController.ts` `list()` y `getById()`: agregar los 4 campos nuevos al mapeo inline.
- [x] 3.4 `PaymentsController.ts` `history()`: `isExport = format === "pdf" || format === "xlsx"`; reemplazar los 2 bloques de mapeo manual por `toPaymentHistoryRowDto`; branch nueva para `format === "xlsx"` con `Content-Type` de spreadsheet.

## 4. Backend — exports agrupados

- [x] 4.1 Crear `src/modules/payments/infrastructure/xlsx/buildPaymentsHistoryWorkbook.ts` (patrón `buildCashCutWorkbook.ts`): agrupa `items` por `saleId`, encabezado de ticket + filas de abonos + totales globales.
- [x] 4.2 `PaymentHistoryPdf.tsx`: reestructurar el bloque de filas para agrupar por `saleId` con encabezado de ticket antes de sus abonos; mantener filtros/totales/footer sin cambios.

## 5. Backend — tests

- [x] 5.1 Extender `PaymentsUseCases.test.ts`: 3 escenarios (abono parcial, abono que liquida 100%, abono cancelado) verificando `saleTotal`/`salePaidAmount`/`salePaymentStatus`/`saleDueAmount` en el DTO resultante.
- [x] 5.2 Extender `PaymentsController.test.ts`: campos nuevos en `list`/`getById`/`history`; caso `format=xlsx` (Content-Type + buffer válido con `XLSX.read`); `ReportTooLarge` también para xlsx.
- [x] 5.3 Crear `buildPaymentsHistoryWorkbook.test.ts`: fixture con 2 tickets, parsear buffer, verificar filas de encabezado/subtotal/totales.

## 6. Frontend — types y servicios

- [x] 6.1 `_logic/types/domain.ts`: agregar los 4 campos a `Payment`.
- [x] 6.2 `_logic/types/api.ts`: agregar los 4 campos a `PaymentDto` y `PaymentHistoryRowDto`; corregir `PaymentHistoryReportDto` para que coincida con la forma real del backend (`totals` anidado) — bonus fix.
- [x] 6.3 `listPayments.ts` y `getPayment.ts`: parsear los 4 campos nuevos con `parseFloat`.
- [x] 6.4 `getPaymentsHistory.ts`: agregar `downloadPaymentsHistoryXlsx()` calcado de `downloadPaymentsHistoryPdf()`.

## 7. Frontend — badge de 3 estados

- [x] 7.1 `PaymentStatusBadge.tsx`: props `{status, salePaymentStatus}`, 3 estados (Activo/Cancelado/Completado), color "Activo" distinto de "Completado".
- [x] 7.2 Actualizar los 4 callers: `PaymentsTable.tsx`, `SalePaymentsSection.tsx` (wiring de `paymentStatus` ya expuesto por `useSalePayments`), `PaymentDetailPage.tsx`, `PaymentsHistoryPage.tsx`.

## 8. Frontend — vista agrupada

- [x] 8.1 Crear `app/(private)/payments/_logic/lib/groupPaymentsBySale.ts` (función pura, agrupación client-side, documentar limitación cross-página).
- [x] 8.2 Crear `app/(private)/payments/_blocks/GroupedPaymentsTable.tsx` (patrón Fragment + fila expandible, calcado de `SalePaymentsSection.tsx`).
- [x] 8.3 `PaymentsListPage.tsx` y `PaymentsHistoryPage.tsx`: agregar toggle `SegmentedButton` "Vista plana"/"Vista agrupada", renderizar `PaymentsTable`/`GroupedPaymentsTable` según el estado.
- [x] 8.4 `PaymentsHistoryToolbar.tsx`: agregar botón "Exportar Excel"; `usePaymentsHistory.ts`: agregar `exportXlsx()`.

## 9. Frontend — tests

- [x] 9.1 Extender `PaymentsListPage.test.tsx`, `PaymentDetailPage.test.tsx`, `SalePaymentsSection.test.tsx`, `listPayments.test.ts` con los campos/badge nuevos.
- [x] 9.2 Crear `PaymentStatusBadge.test.tsx` (3 combinaciones), `groupPaymentsBySale.test.ts`, `GroupedPaymentsTable.test.tsx`.
- [x] 9.3 Crear `getPaymentsHistory.test.ts` (cubre el fix del bug de `totals` + `downloadPaymentsHistoryXlsx`) y `PaymentsHistoryPage.test.tsx` (toggle + footer sin `NaN` + botones export).

## 10. Verificación final

- [x] 10.1 `npm run build` en verde.
- [x] 10.2 `npx jest` de los módulos `payments` y `sales` en verde.
- [x] 10.3 Verificación manual con Playwright MCP contra `npm run dev`: `/payments` (toggle, badges), `/payments/history` (toggle, footer sin NaN, export PDF y Excel), `/sales/[id]` con abono parcial y abono que liquida (badge cambia a Completado).
