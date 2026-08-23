## MODIFIED Requirements

### Requirement: Department price list report PDF and Excel artifacts

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `@react-pdf/renderer` que contenga al menos: header con título "Inventario por Departamento", `generatedAt` formateado y email del `generatedBy`; una sección por departamento con `departmentCode` + `departmentName`; por cada producto un grupo con código, nombre, unidad y costo de adquisición (formateado como moneda MXN, o "—" si es `null`) seguido de sus filas de precio (lista, precio formateado como moneda MXN, cantidad mínima, % descuento, default); subtotales por departamento y totales globales; footer con número de página (`Página X de Y`). Cuando `?format=xlsx`, el sistema SHALL devolver un workbook con una fila por precio y las columnas `Departamento | Código | Producto | Unidad | Costo Adq. | Lista | Precio | Cant. Mín | % Descto | Default`, más filas de subtotal por departamento y totales al final. En ambos formatos, dentro de cada departamento las columnas/filas de nivel de precio SHALL ordenarse por rango de negocio: primero el/los nombre(s) de precio marcados `isDefault=true` en los datos, luego los que matcheen `/subdis/i` en el nombre, luego los que matcheen `/distri/i`, y por último el resto — dentro de cada rango, orden alfabético `es-MX` en caso de empate. Este es el mismo criterio de rango que ya aplica `sortProductPricesForDisplay` en catálogo de productos y POS.

#### Scenario: PDF con metadatos correctos

- **WHEN** se solicita `?format=pdf` con datos
- **THEN** el `Content-Disposition` es `attachment` y el nombre de archivo respeta `inventory-by-department-<fecha>.pdf`

#### Scenario: Excel plano con totales

- **WHEN** se solicita `?format=xlsx` con datos
- **THEN** la hoja contiene una fila por precio (columnas de producto repetidas), filas de subtotal por departamento y filas de totales al final

#### Scenario: Costo de adquisición formateado como moneda en PDF

- **WHEN** se solicita `?format=pdf` y un producto tiene `acquisitionPrice: "45.5000"`
- **THEN** el PDF muestra `$45.50` (formato moneda MXN), no el string crudo `"45.5000"`

#### Scenario: Costo de adquisición ausente en PDF/Excel

- **WHEN** un producto tiene `acquisitionPrice: null`
- **THEN** el PDF y el Excel muestran `"—"` en la columna de costo de adquisición

#### Scenario: Orden de columnas de precio — rango de negocio, no alfabético puro

- **WHEN** un departamento tiene productos con precios nombrados `"Precio Publico"` (marcado `isDefault: true` en al menos una ocurrencia), `"Precio Subdis 10%"`, `"Precio Distri 15%"` y `"Precio 4"`
- **THEN** las columnas/filas de precio se ordenan `Precio Publico, Precio Subdis 10%, Precio Distri 15%, Precio 4` — default primero, luego subdistribuidor, luego distribuidor, luego el resto; NO alfabético puro sobre el nombre completo (que pondría "Precio Distri 15%" antes que "Precio Subdis 10%")
