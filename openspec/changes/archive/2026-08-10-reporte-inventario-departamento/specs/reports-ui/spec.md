## ADDED Requirements

### Requirement: Inventory by department view

El sistema SHALL exponer la vista de UI `app/(private)/reports/inventory-by-department/`: una tarjeta "Inventario por Departamento" en el hub `/reports` gated por `reports:inventory_read`, un selector de departamento, una tabla que agrupa los productos con sus listas de precio, y botones "Exportar PDF" y "Exportar Excel" que descargan los artefactos con los filtros aplicados vía `authFetch` (Bearer). Los `_blocks` SHALL ser presentacionales (sin `fetch`, navegación ni validación); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. (Traza: historia 2.)

#### Scenario: Tarjeta en el hub

- **WHEN** un usuario con `reports:inventory_read` abre `/reports`
- **THEN** ve la tarjeta "Inventario por Departamento" con icono `inventory_2` que navega a `/reports/inventory-by-department`

#### Scenario: Tarjeta oculta sin permiso

- **WHEN** el usuario no tiene `reports:inventory_read`
- **THEN** la tarjeta no se muestra en el hub

#### Scenario: Página sin permiso

- **WHEN** un usuario sin `reports:inventory_read` abre `/reports/inventory-by-department`
- **THEN** la página muestra un estado "Sin acceso" en lugar del reporte

#### Scenario: Selección de departamento

- **WHEN** el usuario abre la página sin seleccionar departamento
- **THEN** ve un selector de departamentos (solo activos) y se le solicita elegir uno antes de mostrar el reporte

#### Scenario: Tabla agrupada por producto

- **WHEN** el usuario selecciona un departamento con productos
- **THEN** la tabla muestra cada producto con código, nombre y unidad, y debajo sus filas de precio (lista, precio, cantidad mínima, % descuento, default)

#### Scenario: Exportar PDF

- **WHEN** el usuario pulsa "Exportar PDF" con un departamento seleccionado
- **THEN** se descarga `inventory-by-department-YYYY-MM-DD.pdf` con los mismos filtros, autenticado vía `authFetch`

#### Scenario: Exportar Excel

- **WHEN** el usuario pulsa "Exportar Excel" con un departamento seleccionado
- **THEN** se descarga `inventory-by-department-YYYY-MM-DD.xlsx` con los mismos filtros, autenticado vía `authFetch`

#### Scenario: Sin productos

- **WHEN** el departamento seleccionado no tiene productos
- **THEN** se muestra un estado vacío en lugar de la tabla
