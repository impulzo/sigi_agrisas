## MODIFIED Requirements

### Requirement: Purchases report view
La ruta `/reports/purchases` SHALL renderizar el reporte de compras con dos secciones alternables vía `SegmentedButton` ("Compras" \| "Pagos a Proveedores"). La sección Compras SHALL ofrecer filtros de sucursal (visible solo con `can("branches:access_all")`), proveedor, estado y rango de fechas, tabla paginada (reusando `CatalogPagination`) y botones "Exportar PDF"/"Exportar Excel". La tabla de la sección Compras SHALL incluir una columna "Saldo" (`balance`, formateada como moneda) inmediatamente después de "Pagado", y SHALL renderizar `paymentStatus`/`status` con el componente `PurchaseStatusBadge` (reutilizado de `app/(private)/purchases/_blocks/`) en vez de texto crudo. La sección Pagos a Proveedores SHALL ofrecer los mismos tipos de filtro (proveedor, sucursal, estado, rango de fechas) y su propia tabla paginada con export PDF/Excel independiente. Los `_blocks` SHALL ser presentacionales; el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Cada sección sin resultados SHALL mostrar un estado vacío.

#### Scenario: Tarjeta en el hub
- **WHEN** un usuario con `reports:purchases_read` abre `/reports`
- **THEN** ve la tarjeta "Compras" que navega a `/reports/purchases`

#### Scenario: Alternar entre secciones
- **WHEN** el usuario cambia el `SegmentedButton` de "Compras" a "Pagos a Proveedores"
- **THEN** la tabla, los filtros y los botones de export cambian a los de la sección de pagos a proveedores

#### Scenario: Filtros de compras
- **WHEN** el usuario filtra la sección Compras por proveedor y rango de fechas
- **THEN** la tabla muestra solo las compras de ese proveedor en ese rango

#### Scenario: Exportar PDF de pagos a proveedores
- **WHEN** el usuario, en la sección Pagos a Proveedores, pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los filtros de esa sección aplicados, autenticado vía `authFetch`

#### Scenario: Exportar Excel de compras
- **WHEN** el usuario, en la sección Compras, pulsa "Exportar Excel"
- **THEN** se descarga un `.xlsx` con los filtros de esa sección aplicados, autenticado vía `authFetch`

#### Scenario: Sin resultados
- **WHEN** ninguna sección tiene resultados con los filtros aplicados
- **THEN** cada una muestra su propio estado vacío en lugar de la tabla

#### Scenario: Columna de saldo en la tabla de compras
- **WHEN** la sección Compras renderiza una fila con `total=1000` y `paidAmount=400`
- **THEN** la columna "Saldo" muestra `$600.00`, ubicada entre "Pagado" y "Estado"

#### Scenario: Estados renderizados con badge en español
- **WHEN** la sección Compras renderiza una fila con `paymentStatus="pending"` y `status="completed"`
- **THEN** ambos se muestran con `PurchaseStatusBadge` (etiquetas en español, ej. "Pendiente" / "Completada"), no como texto crudo en inglés
