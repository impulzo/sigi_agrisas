## MODIFIED Requirements

### Requirement: Department price list report PDF and Excel artifacts

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `@react-pdf/renderer` que contenga al menos: header con título "Inventario por Departamento", `generatedAt` formateado y email del `generatedBy`; una sección por departamento con `departmentCode` + `departmentName`; dentro de cada sección, una tabla pivotada con una fila por producto (columnas: código, nombre, unidad, y una columna dinámica por cada lista de precio distinta presente en el departamento — mismo criterio de ordenamiento y set de columnas que la UI equivalente, `InventoryPriceStockTable.tsx`), mostrando el monto de esa lista para el producto o `"—"` cuando el producto no la tiene; las columnas de precio SHALL usar ancho flexible (`flex`), no ancho fijo, para que el layout nunca desborde el ancho de página sin importar cuántas listas de precio distintas tenga el departamento; subtotales por departamento y totales globales; footer con número de página (`Página X de Y`). Cuando `?format=xlsx`, el sistema SHALL devolver un workbook con una fila por producto (no por precio) y columnas `Departamento | Código | Producto | Unidad | Stock | <lista 1> | <lista 2> | ...` (una columna dinámica por cada lista de precio distinta del departamento, mismo valor `"—"` cuando no aplica), más filas de subtotal por departamento y totales al final. Este pivote SHALL aplicar igual en la vista sin `departmentId` (todos los departamentos, cada uno con su propio set de columnas dinámicas).

#### Scenario: PDF con metadatos correctos

- **WHEN** se solicita `?format=pdf` con datos
- **THEN** el `Content-Disposition` es `attachment` y el nombre de archivo respeta `inventory-by-department-<fecha>.pdf`

#### Scenario: PDF pivotado con precios como columnas

- **WHEN** se solicita `?format=pdf` para un departamento con productos que tienen múltiples listas de precio
- **THEN** cada producto aparece en una sola fila, con una columna por cada lista de precio distinta del departamento, mostrando el monto correspondiente o `"—"` si el producto no tiene esa lista

#### Scenario: Excel pivotado con precios como columnas

- **WHEN** se solicita `?format=xlsx` con datos
- **THEN** la hoja contiene una fila por producto (no una por precio), con las columnas dinámicas de precio, filas de subtotal por departamento y filas de totales al final

#### Scenario: Producto sin listas de precio

- **WHEN** un producto del departamento no tiene ninguna lista de precio asociada
- **THEN** en PDF y en Excel su fila muestra `"—"` en todas las columnas de precio, sin romper el layout ni omitir la fila

#### Scenario: Columnas de precio no desbordan la página en PDF

- **WHEN** un departamento tiene un número grande de listas de precio distintas
- **THEN** las columnas de precio se angostan proporcionalmente (ancho flexible) en vez de desbordar el ancho de la página

#### Scenario: Vista Global aplica el mismo pivote por departamento

- **WHEN** se solicita el reporte sin `departmentId` (todos los departamentos) en `pdf` o `xlsx`
- **THEN** cada sección de departamento pivota sus propias columnas de precio de forma independiente, con el mismo comportamiento que la vista filtrada por un solo departamento
