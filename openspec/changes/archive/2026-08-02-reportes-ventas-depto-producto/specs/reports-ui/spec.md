## MODIFIED Requirements

### Requirement: Sales cut view
La ruta `/reports/sales-cut` SHALL renderizar el corte de ventas: un toggle de periodo "Hoy | Rango" (SegmentedButton) donde "Hoy" precarga el día actual (envía `preset=today`) y "Rango" habilita `from/to`; filtros de sucursal (visible solo con `can("branches:access_all")`), cajero y método de pago; tarjetas de totales (ventas, tickets, subtotal, IVA, IEPS, canceladas), una tarjeta de neto de caja con sus componentes, tablas de los seis desgloses (método, día, cajero, sucursal, departamento, producto) y un botón "Exportar PDF" que descarga el PDF con los filtros aplicados vía `authFetch` (Bearer) sin exponer el token. La tabla "Por producto" SHALL incluir una columna adicional de piezas vendidas (`quantitySold`) que las demás tablas no tienen. Los `_blocks` SHALL ser presentacionales (sin `fetch`); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin ventas SHALL mostrar un estado vacío. (Traza: S4.)

#### Scenario: Corte del día
- **WHEN** un usuario con permiso abre `/reports/sales-cut` con "Hoy" seleccionado
- **THEN** ve los totales, el neto de caja y los seis desgloses del día actual

#### Scenario: Cambio a rango
- **WHEN** el usuario selecciona "Rango" e ingresa `from/to`
- **THEN** los totales, neto de caja y desgloses (incluidos departamento y producto) se recalculan para ese rango

#### Scenario: Filtro sucursal restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** el filtro de sucursal no se muestra y el corte se limita a su sucursal

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los mismos filtros aplicados, autenticado vía `authFetch`

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** se muestra un estado vacío en lugar de las tablas

#### Scenario: Tabla por producto muestra piezas vendidas
- **WHEN** el corte tiene ventas de productos
- **THEN** la tabla "Por producto" muestra, además de los montos, la columna de cantidad vendida por producto
