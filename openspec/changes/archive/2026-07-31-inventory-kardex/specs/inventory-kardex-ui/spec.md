## ADDED Requirements

### Requirement: Kardex view
La ruta `/inventory/kardex` SHALL renderizar: filtros (Combobox de búsqueda de producto por clave/nombre, selector de almacén con opción "Todos" visible solo con `can("branches:access_all")`, rango de fechas Desde/Hasta, botón "Mostrar información" que dispara la consulta), un encabezado de solo lectura (existencia total, existencia en almacén, saldo anterior, saldo final), pestañas "Kardex | Estadísticas" (Estadísticas renderiza un `EmptyState` "Próximamente"), la grilla cronológica de movimientos, un campo de sub-filtro que filtra client-side las filas ya cargadas, y botones "Exportar Excel"/"Imprimir" que descargan xlsx/pdf con los filtros aplicados vía `authFetch`. Los `_blocks` SHALL ser presentacionales (sin `fetch`); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. (Traza: S5.)

#### Scenario: Consulta de kardex
- **WHEN** un usuario con `inventory:kardex_read` selecciona un producto, un almacén y un rango y pulsa "Mostrar información"
- **THEN** ve el encabezado y la grilla de movimientos del rango

#### Scenario: Filtro de almacén restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** no ve la opción "Todos" en el selector de almacén

#### Scenario: Sub-filtro client-side
- **WHEN** el usuario escribe en el campo de sub-filtro con la grilla ya cargada
- **THEN** las filas se filtran sin disparar una nueva request

#### Scenario: Pestaña Estadísticas
- **WHEN** el usuario selecciona la pestaña "Estadísticas"
- **THEN** ve un estado vacío "Próximamente"

#### Scenario: Exportar
- **WHEN** el usuario pulsa "Exportar Excel" o "Imprimir"
- **THEN** se descarga el archivo correspondiente con los mismos filtros aplicados

#### Scenario: Rango sin movimientos
- **WHEN** el rango consultado no tiene movimientos
- **THEN** la grilla muestra un estado vacío y el encabezado muestra `saldoFinal === saldoAnterior`

---

### Requirement: Rebuild article action
La vista `/inventory/kardex` SHALL mostrar un botón "Reconstruir Artículo" visible solo con `can("inventory:write")`, que pide confirmación (`ConfirmDialog`) antes de ejecutar la reconstrucción y, al terminar, refresca el encabezado y la grilla. (Traza: S5.)

#### Scenario: Reconstrucción exitosa
- **WHEN** el usuario confirma "Reconstruir Artículo"
- **THEN** se ejecuta la reconstrucción y la vista se refresca con los saldos recalculados

#### Scenario: Botón oculto sin permiso
- **WHEN** el usuario no tiene `inventory:write`
- **THEN** el botón "Reconstruir Artículo" no se muestra
