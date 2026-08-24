## MODIFIED Requirements

### Requirement: Stock report PDF artifact

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `@react-pdf/renderer` (`renderToBuffer`) y devolverlo con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="stock-YYYY-MM-DD.pdf"` (la fecha es la del `generatedAt` UTC en formato `YYYY-MM-DD`). El PDF SHALL contener al menos:
- Header con título "Reporte de Stock", `generatedAt` formateado y email del `generatedBy`.
- Una sección por sucursal con `branchCode` + `branchName` + flag "Matriz" si `isHeadquarters`.
- Dentro de cada sucursal, una sub-sección por departamento con su nombre y la tabla de productos.
- Tabla con columnas: `Code`, `Producto`, `Unidad`, `Stock`, `Reservado`, `Disponible`, `Reorden`, `Estado` (texto "Bajo" cuando `isBelowReorder`).
- Subtotales por departamento y por sucursal; totales globales al final.
- Footer con número de página (`Página X de Y`).

El header SHALL incluir el logo del negocio (tamaño reducido, propio de reporte interno), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto cuando no está configurado. Los colores de tabla (encabezado, filas alternas, bandas de totales, bordes, texto mutado) SHALL provenir de la paleta de marca compartida (`pdfTheme`), no de valores hex arbitrarios específicos de este módulo.

#### Scenario: PDF con metadatos correctos

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** la response tiene `Content-Type: application/pdf` y `Content-Disposition` cuyo `filename` matchea `^stock-\d{4}-\d{2}-\d{2}\.pdf$`

#### Scenario: PDF cuando el reporte está vacío

- **WHEN** la consulta no devuelve sucursales (`branches: []`)
- **THEN** el PDF se genera con header, totales en cero (`Total productos: 0`), y un texto "Sin datos para los filtros aplicados"; status `200`

#### Scenario: PDF incluye logo del negocio

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

### Requirement: Payment history report PDF artifact

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `renderToBuffer(<PaymentHistoryReportPdf data={dto}/>)` y devolverlo con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.pdf"`. El PDF SHALL contener:
- Header: título "Reporte de Historial de Abonos", `generatedAt` formateado, email de `generatedBy`, filtros activos.
- Tabla de abonos con columnas: Folio Recibo, Folio Venta, Cliente, Sucursal, Monto, Fecha, Estado.
- Sección de totales: Total abonos, Monto bruto, Monto cancelado, Monto neto.
- Footer con número de página (`Página X de Y`).
- Si `payments.length === 0`: header normal + texto "Sin abonos para los filtros aplicados".

El header SHALL incluir el logo del negocio (tamaño reducido), con el mismo mecanismo de resolución y fallback que el resto de los reportes internos. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

#### Scenario: PDF con metadatos correctos

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** `Content-Type: application/pdf` y `Content-Disposition` matchea `^attachment; filename="payments-\d{4}-\d{2}-\d{2}\.pdf"$`

#### Scenario: PDF cuando no hay abonos

- **WHEN** los filtros no producen ningún abono
- **THEN** el PDF se genera con header, sección de totales en cero y texto "Sin abonos para los filtros aplicados"; status `200`

#### Scenario: PDF incluye logo del negocio

- **WHEN** el endpoint devuelve `application/pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)

### Requirement: Department price list report PDF and Excel artifacts

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `@react-pdf/renderer` que contenga al menos: header con título "Inventario por Departamento", `generatedAt` formateado y email del `generatedBy`; una sección por departamento con `departmentCode` + `departmentName`; por cada producto un grupo con código, nombre, unidad y costo de adquisición (formateado como moneda MXN, o "—" si es `null`) seguido de sus filas de precio (lista, precio formateado como moneda MXN, cantidad mínima, % descuento, default); subtotales por departamento y totales globales; footer con número de página (`Página X de Y`). Cuando `?format=xlsx`, el sistema SHALL devolver un workbook con una fila por precio y las columnas `Departamento | Código | Producto | Unidad | Costo Adq. | Lista | Precio | Cant. Mín | % Descto | Default`, más filas de subtotal por departamento y totales al final. En ambos formatos, dentro de cada departamento las columnas/filas de nivel de precio SHALL ordenarse por rango de negocio: primero el/los nombre(s) de precio marcados `isDefault=true` en los datos, luego los que matcheen `/subdis/i` en el nombre, luego los que matcheen `/distri/i`, y por último el resto — dentro de cada rango, orden alfabético `es-MX` en caso de empate. Este es el mismo criterio de rango que ya aplica `sortProductPricesForDisplay` en catálogo de productos y POS.

El header del PDF SHALL incluir el logo del negocio (tamaño reducido), con el mismo mecanismo de resolución y fallback que el resto de los reportes internos. Los colores de tabla SHALL provenir de la paleta de marca compartida (`pdfTheme`).

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

#### Scenario: PDF incluye logo del negocio

- **WHEN** se solicita `?format=pdf`
- **THEN** el header del PDF incluye el logo del negocio (o el fallback por defecto)
