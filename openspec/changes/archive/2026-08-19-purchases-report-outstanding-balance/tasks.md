## 1. Backend

- [x] 1.1 `src/modules/reports/application/dto/PurchasesReportResponseDto.ts`: agregar `balance: string` a la fila (líneas 1-13).
- [x] 1.2 `src/modules/reports/application/use-cases/GetPurchasesReportUseCase.ts` líneas 26-38: calcular `balance = formatMoney(purchase.total - purchase.paidAmount)` por fila.
- [x] 1.3 `src/modules/reports/infrastructure/pdf/PurchasesReportPdf.tsx` líneas 29-38: agregar columna "Saldo" después de "Pagado".
- [x] 1.4 `src/modules/reports/infrastructure/xlsx/buildPurchasesReportWorkbook.ts` líneas 4-15: agregar columna "Saldo" después de "Pagado".

## 2. Frontend

- [x] 2.1 `app/(private)/reports/purchases/_logic/types/api.ts`: agregar `balance: string` al DTO espejo.
- [x] 2.2 `app/(private)/reports/purchases/_blocks/PurchasesTable.tsx` líneas 20-29 (encabezados) y 47-48 (celdas): agregar columna "Saldo"; reemplazar `<Td>{r.paymentStatus}</Td>`/`<Td>{r.status}</Td>` por badges. Nota de desviación: `PurchaseStatusBadge` real sólo cubre `status` (no tiene prop `paymentStatus`); se agregó un componente hermano `PurchasePaymentStatusBadge` en el mismo archivo en vez de sobrecargar la firma existente (evita romper los 2 call-sites operativos ya existentes).
- [x] 2.3 Importar `PurchaseStatusBadge`/`PurchasePaymentStatusBadge` desde `app/(private)/purchases/_blocks/` (cruce de import entre módulos de catálogo/reportes — patrón existente en el repo).

## 3. Tests

- [x] 3.1 Test de `GetPurchasesReportUseCase`: `balance` correcto para compra parcial, compra liquidada y compra de contado.
- [x] 3.2 Test RTL de `PurchasesTable` (reporte): columna "Saldo" presente con el valor formateado; `paymentStatus`/`status` se renderizan vía badges, no como texto crudo.

## 4. Verificación manual

- [x] 4.1 `/reports/purchases` → sección Compras: confirmar columna "Saldo" y badges en español, en la tabla web.
- [x] 4.2 Exportar PDF y Excel → confirmar columna "Saldo" presente con el valor correcto.
