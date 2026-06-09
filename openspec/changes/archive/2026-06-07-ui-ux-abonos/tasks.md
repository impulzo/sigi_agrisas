## 1. Tipos y servicios base

- [x] 1.1 Extender `app/(private)/sales/_logic/types/api.ts`: añadir `paidAmount: number`, `paymentStatus: "paid" | "partial" | "pending"`, `isCredit: boolean` a `SaleSummaryDto` y `SaleDetailDto`
- [x] 1.2 Actualizar el mapper `app/(private)/sales/_logic/services/_mappers.ts` para parsear `paidAmount` de string a number con `parseFloat` e incluir `paymentStatus` e `isCredit`
- [x] 1.3 Crear `app/(private)/payments/_logic/types/api.ts` con `PaymentDto`, `PaymentDetailDto`, `ListPaymentsResponse`, `ListSalePaymentsResponse`, `PaymentHistoryReportDto`, `PaymentHistoryRowDto`
- [x] 1.4 Crear `app/(private)/payments/_logic/types/domain.ts` con tipos `Payment`, `PaymentStatus = "completed" | "cancelled"`, `SalePaymentStatus = "paid" | "partial" | "pending"`
- [x] 1.5 Crear `app/(private)/payments/_logic/schemas/registerPayment.ts` con schema Zod: `amount > 0`, `paymentMethodId uuid`, `folioId uuid`, `notes max 1000 chars`

## 2. Servicios HTTP

- [x] 2.1 Crear `app/(private)/payments/_logic/services/listPayments.ts` — `GET /api/v1/admin/payments` con filtros y paginación; acepta `fetchImpl?`
- [x] 2.2 Crear `app/(private)/payments/_logic/services/getPayment.ts` — `GET /api/v1/admin/payments/:id`; acepta `fetchImpl?`
- [x] 2.3 Crear `app/(private)/payments/_logic/services/registerPayment.ts` — `POST /api/v1/admin/payments`; acepta `fetchImpl?`; normaliza errores `PaymentExceedsDueAmountError`, `SaleNotPayableError`
- [x] 2.4 Crear `app/(private)/payments/_logic/services/cancelPayment.ts` — `POST /api/v1/admin/payments/:id/cancel`; acepta `fetchImpl?`; normaliza `PaymentAlreadyCancelledError`
- [x] 2.5 Crear `app/(private)/payments/_logic/services/listSalePayments.ts` — `GET /api/v1/admin/sales/:id/payments`; acepta `fetchImpl?`
- [x] 2.6 Crear `app/(private)/payments/_logic/services/getPaymentsHistory.ts` — `GET /api/v1/admin/payments/history`; acepta `fetchImpl?`; exporta `downloadPaymentsHistoryPdf` que retorna `Blob`
- [x] 2.7 Crear `app/(private)/payments/_logic/services/index.ts` que re-exporta todos los servicios
- [x] 2.8 Crear `app/(private)/payments/_logic/errors.ts` con clases `PaymentExceedsDueAmountError(due: string)`, `SaleNotPayableError(opts)`, `PaymentAlreadyCancelledError`

## 3. Hooks

- [x] 3.1 Crear `app/(private)/payments/_logic/hooks/usePaymentsList.ts` — orquesta filtros, paginación, debounce 300 ms para búsqueda
- [x] 3.2 Crear `app/(private)/payments/_logic/hooks/usePaymentDetail.ts` — fetcha `getPayment(id)`, expone `payment`, `isLoading`, `error`, `refresh`
- [x] 3.3 Crear `app/(private)/payments/_logic/hooks/usePaymentMutations.ts` — `cancel(id, reason?)` llama `cancelPayment`; expone `isSaving`; callback `onSuccess`
- [x] 3.4 Crear `app/(private)/payments/_logic/hooks/useSalePayments.ts` — fetcha `listSalePayments(saleId)`; expone `payments`, `saleTotals`, `isLoading`, `refresh`
- [x] 3.5 Crear `app/(private)/payments/_logic/hooks/usePaymentsHistory.ts` — maneja filtros del historial, paginación, y la descarga PDF (`downloadPaymentsHistoryPdf`)

## 4. NavigationRail — item Pagos

- [x] 4.1 Añadir `"payments"` al icon set en `app/_components/atoms/Icon/icons.ts` si no existe
- [x] 4.2 Editar `app/_components/organisms/NavigationRail/items.ts`: insertar item `{ key: "payments", href: "/payments", icon: "payments", label: "Abonos", requires: "payments:read" }` entre `returns` e `inventory`

## 5. SalePaymentStatusBadge y actualización de la lista de ventas

- [x] 5.1 Crear `app/(private)/sales/_blocks/SalePaymentStatusBadge.tsx` — chip presentational para `paid | partial | pending` (verde / ámbar / rojo); no renderiza nada si prop `isCredit === false`
- [x] 5.2 Actualizar `app/(private)/sales/_blocks/SalesTable.tsx`: añadir columna "Cobro" que renderiza `<SalePaymentStatusBadge status={sale.paymentStatus} isCredit={sale.isCredit} />` (visible siempre, oculta cuando `isCredit=false`)
- [x] 5.3 Actualizar `app/(private)/sales/_blocks/SaleDetailPage.tsx`: mostrar `<SalePaymentStatusBadge />` junto a `<SaleStatusBadge />` en el header del detalle cuando `sale.isCredit === true`

## 6. RegisterPaymentModal

- [x] 6.1 Crear `app/(private)/payments/_blocks/RegisterPaymentModal.tsx` — modal con campos `amount`, `paymentMethodId` (selector de `usePaymentMethodsOptions()`), `folioId` (selector de `useFoliosOptions()`, default RECIBO), `notes?`. Hint de saldo pendiente. Validación Zod client-side. Errores inline. Props: `saleId`, `dueAmount`, `onSuccess`, `onClose`
- [x] 6.2 El modal preselecciona el folio cuyo `code='RECIBO'` si está en la lista; si no hay ninguno, muestra el primero disponible
- [x] 6.3 Mapear errores del service: 409 `PaymentExceedsDueAmount` → error inline en campo `amount`; 409 `SaleNotPayable` → error genérico bajo el formulario

## 7. SalePaymentsSection

- [x] 7.1 Crear `app/(private)/payments/_blocks/PaymentStatusBadge.tsx` — chip para `completed | cancelled` (verde / gris)
- [x] 7.2 Crear `app/(private)/sales/_blocks/SalePaymentsSection.tsx` — sección que usa `useSalePayments(saleId)`; muestra barra de progreso `paidAmount/total`, tabla de abonos (columnas: folio, cobrador, método, monto, fecha, estado), CTA "+ Registrar abono". Props: `saleId`, `sale` (para `paidAmount`, `total`, `status`, `isCredit`), `onPaymentMutated`
- [x] 7.3 Actualizar `app/(private)/sales/_blocks/SaleDetailPage.tsx`: importar `SalePaymentsSection` y renderizarla condicionalmente cuando `sale.isCredit === true`, después de `SaleReturnsSection`; pasar `onPaymentMutated={refresh}` para re-fetch del sale

## 8. CancelPaymentModal

- [x] 8.1 Crear `app/(private)/payments/_blocks/CancelPaymentModal.tsx` — modal con campo opcional "Motivo" (max 500 chars). Props: `paymentId`, `onSuccess`, `onClose`. Llama `usePaymentMutations().cancel()`; error `PaymentAlreadyCancelled` muestra mensaje inline

## 9. Listado de abonos `/payments`

- [x] 9.1 Crear `app/(private)/payments/_blocks/PaymentsToolbar.tsx` — búsqueda server-side (badge 2+ chars), selector estado, selector sucursal (solo `branches:access_all`), rango fechas, botón "Historial" (visible si `can("payments:report_read")`)
- [x] 9.2 Crear `app/(private)/payments/_blocks/PaymentsTable.tsx` — tabla con columnas definidas en spec; columna Sucursal condicional con `branches:access_all`
- [x] 9.3 Crear `app/(private)/payments/_blocks/PaymentsEmpty.tsx` — mensaje vacío reutilizando `EmptyState`
- [x] 9.4 Crear `app/(private)/payments/_blocks/PaymentsListPage.tsx` — orquesta toolbar + tabla + paginación (`CatalogPagination`) con `usePaymentsList`
- [x] 9.5 Crear `app/(private)/payments/page.tsx` — Server Component; `export const metadata = { title: "Abonos" }`; renderiza `<PaymentsListPage />`
- [x] 9.6 Verificar que la ruta `/payments` queda protegida por el middleware (ya cubierto por el matcher existente)

## 10. Detalle de abono `/payments/[id]`

- [x] 10.1 Crear `app/(private)/payments/_blocks/PaymentMetaPanel.tsx` — datos de cliente, cobrador, método de pago, sucursal, fecha, motivo de cancelación
- [x] 10.2 Crear `app/(private)/payments/_blocks/PaymentActionsBar.tsx` — botón "Cancelar abono" condicional (`status='completed'` + `can("payments:cancel")`); abre `CancelPaymentModal`
- [x] 10.3 Crear `app/(private)/payments/_blocks/PaymentDetailPage.tsx` — header (folio, `PaymentStatusBadge`, monto), link al ticket, `PaymentMetaPanel`, `PaymentActionsBar`; usa `usePaymentDetail(id)` y `usePaymentMutations`
- [x] 10.4 Crear `app/(private)/payments/[id]/page.tsx` — Server Component; `export const metadata = { title: "Abono" }`; renderiza `<PaymentDetailPage id={params.id} />`

## 11. Historial `/payments/history`

- [x] 11.1 Crear `app/(private)/payments/_blocks/PaymentsHistoryToolbar.tsx` — filtros avanzados (userId texto, customerId texto, productId, paymentMethodId, status, from, to, branchId si bypass); botón "Exportar PDF" con spinner
- [x] 11.2 Crear `app/(private)/payments/_blocks/PaymentsHistoryPage.tsx` — orquesta toolbar, tabla de resultados con totales al pie; usa `usePaymentsHistory`; maneja 409 `ReportTooLarge` con toast de error
- [x] 11.3 Crear `app/(private)/payments/history/page.tsx` — Server Component; `export const metadata = { title: "Historial de abonos" }`; renderiza `<PaymentsHistoryPage />`

## 12. Tests unitarios RTL

- [x] 12.1 Tests de servicios en `tests/unit/ui/(private)/payments/services/`: `registerPayment.test.ts` (happy path, PaymentExceedsDueAmount, SaleNotPayable), `cancelPayment.test.ts` (happy path, AlreadyCancelled), `listPayments.test.ts` (filtros), `listSalePayments.test.ts`
- [x] 12.2 Tests de `SalePaymentStatusBadge` — renderiza badge correcto para cada status; no renderiza cuando `isCredit=false`
- [x] 12.3 Tests de `RegisterPaymentModal` — validación Zod client (amount <= 0), preselección de RECIBO, error inline PaymentExceedsDueAmount
- [x] 12.4 Tests de `SalePaymentsSection` — muestra barra de progreso, tabla, CTA; oculta CTA cuando `status='cancelled'`; no renderiza cuando `isCredit=false`
- [x] 12.5 Tests de `PaymentsListPage` — renderiza toolbar y tabla; empty state cuando no hay items
- [x] 12.6 Tests de `PaymentDetailPage` — muestra botón cancelar cuando `completed + payments:cancel`; oculta cuando `cancelled`

## 13. Verificación final

- [x] 13.1 `npm run build` → sin errores TS
- [x] 13.2 `npm test` → todos los tests verdes (incluyendo los previos de NavigationRail)
- [x] 13.3 Smoke: login como operator → ver item "Abonos" en nav rail; navegar a `/payments`; lista de abonos visible
- [x] 13.4 Smoke: abrir detalle de venta a crédito → `SalePaymentsSection` visible con barra de progreso
- [x] 13.5 Smoke: abrir `RegisterPaymentModal` → registrar abono → barra de progreso se actualiza; `paymentStatus` cambia a `partial` o `paid`
- [x] 13.6 Smoke: cancelar un abono desde el detalle → `PaymentStatusBadge` pasa a "Cancelado"; `SalePaymentsSection` actualiza `paidAmount`
- [x] 13.7 Smoke: `/payments/history` → aplicar filtro de fecha → exportar PDF → archivo descargado correctamente
- [x] 13.8 Smoke: login como viewer → `/payments` visible (solo lectura); botón "Registrar abono" no aparece; historial visible
- [x] 13.9 Smoke: venta cash en lista de ventas → columna "Cobro" vacía; venta a crédito → badge "Pendiente" o "Parcial"
