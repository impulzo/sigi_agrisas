## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador / Operador / Viewer | Como usuario con permiso `reports:inventory_read`, quiero generar el reporte "Inventario por departamento" seleccionando un departamento, para conocer los productos del catálogo y sus listas de precio agrupadas por producto | El cliente necesita una vista comercial por departamento: qué productos existen y a qué precios se venden, sin depender del reporte de stock (que es por sucursal y no muestra precios) | - AC1: Al seleccionar un departamento se listan sus productos activos, cada uno agrupando sus listas de precio (nombre, precio, cantidad mínima, % descuento, flag default)<br>- AC2: Un producto sin listas de precio aparece con `priceCount = 0` y su grupo de precios vacío (no se omite)<br>- AC3: Los precios se serializan como string con 4 decimales (escala `Decimal(14,4)`); los `Decimal` nullable (`ivaRate`, `iepsRate`, `discountPct`) van como `null` y no como `"0.0000"`<br>- AC4: `departmentId` inválido (no UUID) → `400`; sin `departmentId` el reporte incluye todos los departamentos | - CS1: Requiere JWT válido (headers `x-user-id`) y permiso `reports:inventory_read`; sin permiso → `403`<br>- CS2: `departmentId` validado con Zod (`z.string().uuid()`); `format` restringido a `json \| pdf \| xlsx`<br>- CS3: Los precios son información comercial sensible: el endpoint nunca expone datos de sucursales ni existencias (catálogo puro) |
| 2 | Administrador / Operador / Viewer | Como usuario con permiso `reports:inventory_read`, quiero acceder al reporte desde la sección Reportes, seleccionar departamento y exportarlo a Excel o PDF, para compartirlo o archivarlo sin depender de la pantalla | La tarjeta en el hub y los exportadores consolidan el flujo de reportes existente (patrón Corte de Caja) | - AC1: El hub `/reports` muestra la tarjeta "Inventario por Departamento" con icono `inventory_2`, gated por `reports:inventory_read`<br>- AC2: La página muestra un selector de departamento; sin selección muestra estado que solicita elegir uno<br>- AC3: "Exportar PDF" descarga `inventory-by-department-YYYY-MM-DD.pdf` y "Exportar Excel" descarga `.xlsx`, ambos con los filtros aplicados vía `authFetch` (Bearer)<br>- AC4: Sin productos para el departamento se muestra estado vacío | - CS1: El gating por permiso aplica en tarjeta, página y navegación; sin permiso la página muestra "Sin acceso"<br>- CS2: Los botones de export descargan vía `authFetch` con `Authorization: Bearer`, sin exponer el token en el navegador<br>- CS3: Los `_blocks` son presentacionales (sin fetch ni navegación); HTTP vive en `_logic/services/` y orquestación en `_logic/hooks/` |

## Why

El panel ya expone `GET /api/v1/admin/reports/inventory/stock` (stock por sucursal → departamento → producto, sin precios y sin UI). La revisión con el cliente detectó una necesidad comercial distinta: un catálogo de precios por departamento — qué productos existen y sus listas de precio agrupadas — para cotizar, imprimir listas y compartir con vendedores. Hoy esa vista no existe ni como API ni como pantalla, y el único export cercano (corte de caja) demuestra que el patrón PDF+XLSX ya está resuelto en el módulo `reports`. Se agrega el endpoint y la UI sin tocar el stock report existente, reutilizando `reports:inventory_read` (ya presente en los 3 roles) y `useDepartmentsOptions` (promovido a `app/_hooks/` por la regla de hooks reutilizables en ≥2 módulos).

## What Changes

- **Nuevo endpoint** `GET /api/v1/admin/reports/inventory/by-department` que devuelve el reporte de lista de precios por departamento en `json | pdf | xlsx`, delegando a `ReportsController.getDepartmentPriceListReport`.
- **Nuevo use case** `GetDepartmentPriceListReportUseCase` que agrupa filas crudas en departamentos → productos → listas de precio, con subtotales y totales (`Decimal` → string).
- **Nuevo repositorio** `PrismaDepartmentPriceListRepository` (query a `products` con `department` y `prices`, orden por depto/producto/precio) + `InMemoryDepartmentPriceListRepository` para tests.
- **Nuevo PDF** `DepartmentPriceListReportPdf` (patrón `InventoryStockReportPdf`) y **nuevo xlsx** `buildDepartmentPriceListWorkbook` (patrón `buildCashCutWorkbook`, una fila por precio).
- **Nueva UI** `app/(private)/reports/inventory-by-department/` con página (Server Component), bloque orquestador, filtro de departamento, tabla agrupada por producto y `_logic/` (services/hooks/types) siguiendo el patrón de `cash-cut`.
- **Hub** `ReportsHubPage` agrega la tarjeta "Inventario por Departamento" gated por `reports:inventory_read`.
- **Refactor de reutilización**: `useDepartmentsOptions` se promueve de `catalogs/products/_logic/hooks/` a `app/_hooks/`; imports de productos actualizados. Sin cambio funcional.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `reports-api`: se agrega el requirement "Department price list report endpoint" con el DTO, filtros y escenarios de autorización.
- `reports-ui`: se agrega el requirement "Inventory by department view" con la tarjeta del hub, selector de departamento, tabla agrupada y exportación PDF/Excel.

## Impact

- **Código**: `src/modules/reports/` (value-object, port, DTO, use case, 2 repos, PDF, xlsx, controller, DI), ruta `app/api/v1/admin/reports/inventory/by-department/route.ts`, UI en `app/(private)/reports/inventory-by-department/`, `ReportsHubPage`, `app/_hooks/useDepartmentsOptions.ts` (movido) y 3 imports en módulo productos.
- **APIs**: un solo endpoint nuevo bajo `/api/v1/admin/reports/**`. Sin cambios en endpoints existentes.
- **Permisos/seed**: ninguno (reutiliza `reports:inventory_read`).
- **Base de datos**: ninguna migración; solo lectura a `products`, `departments`, `product_prices`.
- **Dependencias**: ninguna nueva (`@react-pdf/renderer` y `xlsx` ya están en `package.json`).
