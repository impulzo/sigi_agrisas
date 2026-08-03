## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador/gerente que revisa el corte de ventas | Como Administrador/gerente, quiero ver el corte de ventas desglosado por departamento para identificar qué categorías de producto generaron más venta en el periodo y decidir compras/inventario por línea | Hoy el corte sólo desglosa por método de pago, día, cajero y sucursal — sin visibilidad por departamento no se puede priorizar reabasto por categoría | - Given un periodo con ventas de productos de distintos departamentos, When se genera el corte, Then `byDepartment` trae una fila por departamento con nombre, monto (subtotal/impuestos/total) ordenada por total desc<br>- Given una venta `cancelled` en el periodo, When se genera el corte, Then esa venta NO se suma a `byDepartment` (mismo criterio que los desgloses existentes: sólo `completed`+`edited`)<br>- Given periodo sin ventas, When se genera el corte, Then `byDepartment` es un array vacío | - Requiere `reports:sales_cut_read` (mismo permiso ya existente, sin nuevo permiso)<br>- Branch scoping existente aplica igual: sin `branches:access_all`, `byDepartment` se limita a la sucursal del usuario<br>- No expone datos de otras sucursales cuando el usuario no tiene bypass |
| 2 | Administrador/gerente que revisa el corte de ventas | Como Administrador/gerente, quiero ver el corte de ventas desglosado por producto con piezas vendidas para saber qué SKUs rotan más y reabastecer a tiempo | El corte actual no distingue productos individuales ni cantidades — sólo montos agregados por método/día/cajero/sucursal, insuficiente para decisiones de reabasto por SKU | - Given un periodo con ventas de varios productos, When se genera el corte, Then `byProduct` trae una fila por producto con nombre, código, cantidad vendida (suma de `sale_items.quantity`) y montos, ordenada por total desc<br>- Given el mismo producto vendido en múltiples tickets/líneas, When se agrega, Then la cantidad y montos se suman en una sola fila por producto<br>- Given una venta `cancelled`, When se genera el corte, Then no se suma a `byProduct`<br>- Given periodo sin ventas, When se genera el corte, Then `byProduct` es un array vacío<br>- Sin límite artificial de filas (igual que los otros desgloses) | - Requiere `reports:sales_cut_read` (mismo permiso, sin nuevo permiso)<br>- Branch scoping existente aplica igual: `byProduct` se limita a la sucursal del usuario sin bypass<br>- No expone costos de compra ni márgenes, sólo precio de venta ya visible en otros reportes |

## Why

El feedback de producción (#28 y #29 de la auditoría) señala que el Corte de Ventas actual (`GET /api/v1/admin/reports/sales-cut`, `/reports/sales-cut`) no permite responder dos preguntas de negocio recurrentes: qué categorías de producto (departamentos) generan más venta, y qué SKUs específicos rotan más (en piezas, no sólo en dinero). Ambas preguntas requieren agregar `sale_items` — dato que el corte ya toca para el split IVA/IEPS global, pero no expone desglosado. Extender el corte existente con dos desgloses nuevos es de bajo riesgo (mismo endpoint, mismos filtros, mismo branch scoping, mismo criterio "activas del periodo") y evita crear un módulo de reporte paralelo con su propia superficie de permisos/UI.

## What Changes

- `GET /api/v1/admin/reports/sales-cut` agrega dos desgloses nuevos a la respuesta JSON: `byDepartment` (una fila por departamento: `key`, `label`, `ticketCount` [tickets distintos que incluyen ese depto], `subtotal`, `taxTotal`, `total`) y `byProduct` (una fila por producto: `key`, `label`, `ticketCount`, `quantitySold`, `subtotal`, `taxTotal`, `total`). Ambos agregados desde `sale_items` de ventas `completed`+`edited` del periodo/filtros ya aplicados (mismo criterio que los 4 desgloses existentes — no restan devoluciones).
- `SalesCutAssembler` (dominio, puro) ordena ambos por `total DESC`.
- `PrismaSalesCutRepository`/`InMemorySalesCutRepository` calculan los nuevos agregados (join `sale_items` → `products` → `departments` para nombre/depto; `sale_items` → `products` para nombre/código de producto).
- El PDF (`SalesCutReportPdf`) agrega dos secciones nuevas con los mismos desgloses.
- La página `/reports/sales-cut` agrega dos tablas nuevas ("Por departamento", "Por producto"), reutilizando `BreakdownTable` (extendido con columna opcional de cantidad para `byProduct`).
- Sin nuevo permiso RBAC, sin nueva ruta, sin cambio de branch scoping — extensión del mismo contrato existente.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `sales-cut-api`: el requirement "Sales cut breakdowns" se extiende con `byDepartment` y `byProduct`.
- `reports-ui`: el requirement "Sales cut view" se extiende con las dos tablas nuevas en `/reports/sales-cut`.

## Impact

- `src/modules/reports/domain/value-objects/SalesCutFilters.ts` — nuevos tipos `DepartmentBreakdownRow`, `ProductBreakdownRow`, campos en `SalesCutAggregates`
- `src/modules/reports/domain/services/SalesCutAssembler.ts` — ordena los 2 nuevos arrays
- `src/modules/reports/application/dto/SalesCutReportResponseDto.ts` — agrega `byDepartment`, `byProduct`
- `src/modules/reports/infrastructure/repositories/PrismaSalesCutRepository.ts` — 2 queries nuevas (raw SQL, agregando por `product.department_id` y por `product_id`)
- `src/modules/reports/infrastructure/repositories/InMemorySalesCutRepository.ts` — paridad de agregación en memoria
- `src/modules/reports/infrastructure/pdf/SalesCutReportPdf.tsx` — 2 secciones nuevas
- `app/(private)/reports/sales-cut/_logic/types/api.ts` — tipos actualizados
- `app/(private)/reports/sales-cut/_blocks/BreakdownTable.tsx` — columna opcional de cantidad
- `app/(private)/reports/sales-cut/_blocks/SalesCutPage.tsx` — 2 tablas nuevas
- Tests: `SalesCutAssembler`, `PrismaSalesCutRepository`/`InMemorySalesCutRepository` (paridad), `BreakdownTable`, `SalesCutPage`
