## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador/integrador con acceso API a reportes (`reports:inventory_read`) | Como Operador, quiero poder pedir `GET /api/v1/admin/reports/inventory/stock?format=xlsx`, para tener el mismo formato de exportación que ya ofrecen los demás 10 reportes del módulo, sin depender de una pantalla que hoy no existe | - Given un usuario con `reports:inventory_read`, When ejecuta `GET .../inventory/stock?format=xlsx`, Then recibe `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="stock-YYYY-MM-DD.xlsx"`.<br>- Given el mismo endpoint con `?format=csv` (valor inválido), When se ejecuta, Then el mensaje de error se actualiza a `"Invalid format. Allowed: json, pdf, xlsx"` (hoy dice solo `json, pdf`).<br>- Given `branches: []` (sin datos para los filtros), When se pide `xlsx`, Then el workbook se genera igual, con encabezados y totales en cero, sin lanzar error.<br>- Given las mismas columnas que ya expone el PDF (Código, Producto, Unidad, Stock, Reservado, Disponible, Reorden, Estado), When se abre el XLSX, Then las columnas coinciden 1:1 con el PDF, agrupadas por sucursal → departamento igual que la jerarquía actual. | - Mismo permiso/branch scoping que ya aplica a `json`/`pdf` (`reports:inventory_read`, `resolveScopedBranchId`) — el nuevo formato no abre una ruta de acceso distinta ni expone datos que `json`/`pdf` no expongan ya. |
| 2 | Operador/integrador con acceso API a reportes (`payments:report_read`) | Como Operador, quiero poder pedir `GET /api/v1/admin/reports/payments/history?format=xlsx`, para tener el mismo formato de exportación que ya ofrecen los demás 10 reportes del módulo | - Given un usuario con `payments:report_read`, When ejecuta `GET .../payments/history?format=xlsx`, Then recibe `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.xlsx"`.<br>- Given el mismo endpoint con `?format=csv`, When se ejecuta, Then el error se actualiza a `"Invalid format. Allowed: json, pdf, xlsx"`.<br>- Given `payments: []`, When se pide `xlsx`, Then el workbook se genera igual, con el bloque `summary` en cero.<br>- Given las mismas columnas que ya expone el PDF (Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado), When se abre el XLSX, Then coinciden 1:1 con el PDF. | - Mismo permiso/branch scoping que ya aplica a `json`/`pdf` (`payments:report_read`, `resolveScopedBranchId` por `customer_payments.sale.branch_id`) — sin ruta de acceso nueva. |

## Why

De los 12 endpoints del módulo `src/modules/reports/`, 10 ya soportan `format=json|pdf|xlsx` y solo `inventory/stock` y `payments/history` se quedaron en `json|pdf` (`stockQuerySchema`/`paymentQuerySchema`, `ReportsController.ts:52-73`, usan `formatEnum` en vez de `cashCutFormatEnum`). El cliente pidió explícitamente "todos los reportes excel y pdf" — este cambio cierra esa inconsistencia en la superficie de API del módulo, siguiendo el patrón exacto ya usado 8 veces (`buildCashCutWorkbook` y análogos). Ambos endpoints no tienen consumidor en `app/` hoy (verificado — cero referencias en la UI); se completan de todos modos por decisión explícita del usuario, priorizando consistencia del patrón de exportación sobre el hecho de que aún no hay pantalla que los use.

## What Changes

- `stockQuerySchema` y `paymentQuerySchema` (`ReportsController.ts`): cambiar su campo `format` de `formatEnum` (`json|pdf`) a `cashCutFormatEnum` (`json|pdf|xlsx`), igual que los otros 8 endpoints ya migrados.
- Nuevo `src/modules/reports/infrastructure/xlsx/buildInventoryStockWorkbook.ts`: columnas Código, Producto, Unidad, Stock, Reservado, Disponible, Reorden, Estado — agrupado por sucursal → departamento (mismo patrón de `buildDepartmentPriceListWorkbook.ts`, subtotales + totales).
- Nuevo `src/modules/reports/infrastructure/xlsx/buildPaymentHistoryWorkbook.ts`: columnas Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado — con bloque de totales (`summary`) al final.
- `ReportsController.ts`: agregar la rama `if (format === "xlsx")` en `getInventoryStockReport` y `getPaymentHistoryReport`, igual patrón que `getCashCutReport` (headers `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition` con nombre de archivo consistente con el PDF existente).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `reports-api`: los requirements "Inventory Stock Report endpoint" y "Stock report filters" (formato permitido y mensaje de error 400), y "Payment History Report endpoint" y "Payment report filters" (mismo ajuste), pasan de `json | pdf` a `json | pdf | xlsx`. Se agregan requirements nuevos "Stock report XLSX artifact" y "Payment history report XLSX artifact" espejando la estructura ya documentada para PDF.

## Impact

- `src/modules/reports/infrastructure/http/ReportsController.ts` (schemas + 2 handlers)
- `src/modules/reports/infrastructure/xlsx/buildInventoryStockWorkbook.ts` (nuevo)
- `src/modules/reports/infrastructure/xlsx/buildPaymentHistoryWorkbook.ts` (nuevo)
- Sin cambios de UI, de permisos, ni migraciones.
