## 1. Habilitar xlsx en los schemas Zod

- [x] 1.1 `src/modules/reports/infrastructure/http/ReportsController.ts`: cambiado el campo `format` de `stockQuerySchema` de `formatEnum` a `cashCutFormatEnum`. `cashCutFormatEnum` se movió arriba (antes de `stockQuerySchema`) para evitar referencia antes de declaración; `formatEnum` quedó sin uso y se eliminó junto con su declaración duplicada más abajo.
- [x] 1.2 Mismo archivo: cambiado el campo `format` de `paymentQuerySchema` de `formatEnum` a `cashCutFormatEnum`.

## 2. Workbook builders nuevos

- [x] 2.1 Creado `src/modules/reports/infrastructure/xlsx/buildInventoryStockWorkbook.ts` — columnas Código, Producto, Unidad, Stock, Reservado, Disponible, Reorden, Estado, agrupado sucursal → departamento con subtotales y totales.
- [x] 2.2 Creado `src/modules/reports/infrastructure/xlsx/buildPaymentHistoryWorkbook.ts` — columnas Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado, con bloque de totales (`summary`) al final.

## 3. Wiring en el controller

- [x] 3.1 `getInventoryStockReport` (`ReportsController.ts`): agregada rama `if (format === "xlsx")` antes del `return NextResponse.json(dto)`, análoga a la de `getCashCutReport`.
- [x] 3.2 `getPaymentHistoryReport`: misma rama agregada.

## 4. Tests

- [x] 4.1 Actualizado el test existente "400 con ?format=csv" del describe `getInventoryStockReport` — mensaje ahora `"Invalid format. Allowed: json, pdf, xlsx"`.
- [x] 4.2 Agregado test "200 xlsx con Content-Type y Content-Disposition correctos" en `getInventoryStockReport`.
- [x] 4.3 Agregado test "400 con ?format=csv" en `getPaymentHistoryReport` (no existía).
- [x] 4.4 Agregado test "200 xlsx con Content-Type y Content-Disposition correctos" en `getPaymentHistoryReport`.
- [x] 4.5 Agregados tests separados "200 xlsx sin datos no lanza error" para ambos endpoints (`branches: []` / `payments: []`). 93/93 tests del archivo en verde.

## 5. Verificación

- [x] 5.1 `npm test` — 469/469 suites, 3321/3321 tests en verde.
- [x] 5.2 `npm run build` — sin errores de tipos (Node 20.20.2).
