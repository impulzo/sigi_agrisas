## Context

10 de los 12 endpoints de `src/modules/reports/` ya soportan `format=json|pdf|xlsx` vía `cashCutFormatEnum` (`ReportsController.ts:93`). `inventory/stock` y `payments/history` se quedaron atrás en `formatEnum` (`json|pdf`, `:47-49`), usado también por sus schemas (`stockQuerySchema:52-67`, `paymentQuerySchema:69-83`). Responde a las 2 filas de la Historia de Usuario en `proposal.md` — misma necesidad, dos endpoints independientes.

## Goals / Non-Goals

**Goals:**
- Ambos endpoints aceptan `?format=xlsx` con el mismo contrato de headers (`Content-Type`, `Content-Disposition`) que los 8 endpoints xlsx existentes.
- Las columnas del XLSX replican 1:1 las del PDF ya existente (fuente de verdad: `InventoryStockReportPdf.tsx`, `PaymentHistoryReportPdf.tsx`) — sin inventar columnas nuevas.
- Mismo permiso y branch scoping que `json`/`pdf` — el nuevo formato no es una superficie de autorización distinta.

**Non-Goals:**
- No se crea UI para ninguno de los dos reportes — confirmado sin consumidores en `app/`, fuera de alcance de este change (decisión explícita del usuario).
- No se toca `payments:report_read` ni ningún otro permiso — RBAC sin cambios.
- No se modifican los DTOs (`StockReportResponseDto`, `PaymentHistoryReportResponseDto`) ni los use cases — el cambio vive enteramente en la capa `infrastructure/http` + nuevo `infrastructure/xlsx`.

## Decisions

**D1 — Reusar `cashCutFormatEnum` en vez de crear un tercer enum.**
`stockQuerySchema` y `paymentQuerySchema` cambian su campo `format: formatEnum` a `format: cashCutFormatEnum`. Es literalmente el mismo enum ya usado por los otros 8 endpoints — no hay razón semántica para uno propio, y reusar evita que el mensaje de error `"Invalid format. Allowed: ..."` diverja entre endpoints.

**D2 — Un workbook builder nuevo por reporte, mismo patrón que los 8 existentes.**
`buildInventoryStockWorkbook.ts` y `buildPaymentHistoryWorkbook.ts`, cada uno recibe su DTO tipado y devuelve `Buffer` vía `XLSX.utils.aoa_to_sheet` + `XLSX.write(..., { type: "buffer", bookType: "xlsx" })` — idéntico a `buildDepartmentPriceListWorkbook.ts`/`buildCashCutWorkbook.ts`. No se introduce una abstracción compartida de "builder genérico"; los 10 builders existentes ya son independientes entre sí por diseño (cada reporte tiene su propia forma de datos), así que un builder más por reporte es consistente con el patrón, no una desviación.
- **Stock**: una fila por producto, agrupado visualmente por sucursal → departamento (con filas de subtotal, igual que `buildDepartmentPriceListWorkbook.ts`), columnas: Código, Producto, Unidad, Stock, Reservado, Disponible, Reorden, Estado.
- **Payment history**: una fila por abono (`payments[]`, forma plana — no hay jerarquía en el DTO), columnas: Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado; bloque de totales (`summary`) al final, igual patrón que `buildCashCutWorkbook.ts` con sus totales por método de pago.

**D3 — Nombre de archivo consistente con el PDF ya existente.**
`stock-${date}.xlsx` y `payments-${date}.xlsx` (mismo `date = dto.generatedAt.split("T")[0]` ya usado por la rama `pdf` de cada handler) — un usuario que ya conoce el nombre del PDF reconoce el XLSX sin sorpresas.

## Risks / Trade-offs

- **[Riesgo]** Construir para código sin consumidor UI puede quedar sin validación de uso real hasta que alguien lo necesite. → **Mitigación:** aceptado explícitamente por el usuario; el criterio de "hecho" es paridad de patrón con los otros 10 endpoints, no adopción de UI. Los tests de integración cubren el contrato HTTP igual que los demás endpoints xlsx, así que no queda sin cobertura automatizada.

## Migration Plan

No aplica — cambio aditivo de solo backend (nuevo valor de enum + 2 archivos nuevos), sin migración de datos ni flag de despliegue.
