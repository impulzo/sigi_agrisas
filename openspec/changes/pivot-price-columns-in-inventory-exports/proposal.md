## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador con acceso a reportes (`reports:inventory_read`) | Como Operador, quiero que el PDF y el Excel del reporte de Inventario por Departamento muestren los precios como columnas (una fila por producto), igual que ya se ve en pantalla, para poder comparar precios entre listas de un vistazo sin tener que abrir cada producto por separado en el export | - Given un departamento con productos que tienen múltiples listas de precio, When se exporta a PDF, Then cada producto es una sola fila con una columna por cada lista de precio distinta del departamento, mostrando el monto o "—" si el producto no tiene esa lista — igual que `InventoryPriceStockTable.tsx`.<br>- Given el mismo escenario, When se exporta a Excel, Then el workbook tiene una fila por producto (no una por precio) con las mismas columnas dinámicas.<br>- Given un producto sin ninguna lista de precio, When se exporta (PDF o Excel), Then su fila muestra "—" en todas las columnas de precio, sin romper el layout.<br>- Given un departamento con muchas listas de precio distintas (ej. 10+), When se exporta a PDF, Then las columnas se angostan proporcionalmente sin desbordar el ancho de página (layout flexible, no fijo).<br>- Given la vista "Global" (mismo endpoint sin `departmentId`), When se exporta, Then aplica el mismo pivote por cada departamento listado — comportamiento idéntico al de "Por Departamento", solo que recorre todos los departamentos. | - Sin cambios de RBAC, branch scoping ni contrato de API — mismo permiso `reports:inventory_read`, mismo DTO `DepartmentPriceListResponseDto` ya validado y ya expuesto vía `json`; el pivote es solo una forma de presentación en `pdf`/`xlsx`, no expone datos que el DTO no tenga ya. |

## Why

`InventoryPriceStockTable.tsx:18` (`priceColumnNames()`) ya pivota los precios como columnas en pantalla — una fila por producto, una columna por cada nombre de lista de precio distinto del departamento. Los exports del mismo reporte no reflejan esto: `DepartmentPriceListReportPdf.tsx:11-43` anida un sub-listado de precios por producto, y `buildDepartmentPriceListWorkbook.ts:38` emite una fila por precio (desnormalizado). El cliente pidió explícitamente que tanto el reporte Global como el de Departamento muestren "precios en columnas" — hoy solo la UI lo cumple; los dos formatos de export quedan desalineados de lo que el operador ve en pantalla antes de exportar.

## What Changes

- `DepartmentPriceListReportPdf.tsx`: reemplazar el sub-listado anidado de precios por una tabla plana por departamento — una fila por producto, columnas dinámicas (una por lista de precio), usando `flex: 1` para las columnas de precio (layout flexible, sin ancho fijo, para no desbordar la página cuando hay muchas listas).
- `buildDepartmentPriceListWorkbook.ts`: reemplazar la emisión "una fila por precio" por "una fila por producto" con las mismas columnas dinámicas.
- Extraer `priceColumnNames()` (hoy solo en `InventoryPriceStockTable.tsx:18`) a un servicio de dominio puro reutilizable por ambos exports (`src/modules/reports/domain/services/`) — la copia de la UI se mantiene sin tocar, siguiendo la convención ya establecida en el proyecto de no acoplar `app/` a `src/modules/` (mismo patrón que `computeTotalsClient.ts`, que documenta explícitamente "no depende de `src/modules/` en cliente").
- Sin cambios de API, DTO, ni permisos.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `reports-api`: el requirement "Department price list report PDF and Excel artifacts" (`spec.md:555-566`) cambia de layout anidado (PDF) y una-fila-por-precio (Excel) a una tabla pivotada — una fila por producto, columnas dinámicas por lista de precio, en ambos formatos.

## Impact

- `src/modules/reports/infrastructure/pdf/DepartmentPriceListReportPdf.tsx`
- `src/modules/reports/infrastructure/xlsx/buildDepartmentPriceListWorkbook.ts`
- Nuevo: `src/modules/reports/domain/services/priceColumnNames.ts`
- Sin cambios de API, DTO, permisos, ni migraciones. `InventoryPriceStockTable.tsx` (UI) no se toca — ya está correcto.
