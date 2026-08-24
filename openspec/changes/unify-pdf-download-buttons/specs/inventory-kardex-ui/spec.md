## MODIFIED Requirements

### Requirement: Kardex view

La ruta `/inventory/kardex` SHALL renderizar: filtros (Combobox de búsqueda de producto por clave/nombre, selector de almacén con opción "Todos" visible solo con `can("branches:access_all")`, rango de fechas Desde/Hasta, botón "Mostrar información" que dispara la consulta), un encabezado de solo lectura (existencia total, existencia en almacén, saldo anterior, saldo final), pestañas "Kardex | Estadísticas" (Estadísticas renderiza un `EmptyState` "Próximamente"), la grilla cronológica de movimientos (columnas: Fecha, Movimiento, Folio, Entrada, Salida, Saldo, Costo, Venta, Status, Concepto), un campo de sub-filtro que filtra client-side las filas ya cargadas, y botones "Exportar Excel"/"Descargar PDF" que descargan xlsx/pdf con los filtros aplicados vía `authFetch` — el botón de PDF (antes rotulado "Imprimir" pese a descargar un archivo, no abrir el diálogo de impresión del navegador) SHALL usar el molecule compartido `DownloadPdfButton` (`app/_components/molecules/PdfDownloadButton.tsx`, icono `picture_as_pdf`). La columna "Concepto" SHALL mostrar `movement.notes` cuando esté presente (por ejemplo, el `reason` capturado en un ajuste manual de inventario) y `"—"` cuando sea `null`. Los `_blocks` SHALL ser presentacionales (sin `fetch`); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`.

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
- **WHEN** el usuario pulsa "Exportar Excel" o "Descargar PDF"
- **THEN** se descarga el archivo correspondiente con los mismos filtros aplicados

#### Scenario: Rango sin movimientos
- **WHEN** el rango consultado no tiene movimientos
- **THEN** la grilla muestra un estado vacío y el encabezado muestra `saldoFinal === saldoAnterior`

#### Scenario: Concepto de un ajuste manual visible en el Kardex
- **WHEN** un movimiento tiene `notes: "Recepción factura 123"` (originado por un ajuste manual con `reason`)
- **THEN** la columna "Concepto" de esa fila muestra "Recepción factura 123"

#### Scenario: Movimiento sin concepto muestra guion
- **WHEN** un movimiento tiene `notes: null`
- **THEN** la columna "Concepto" muestra "—"

#### Scenario: Botón de descarga PDF con icono uniforme
- **WHEN** se renderiza el botón "Descargar PDF" en `/inventory/kardex`
- **THEN** muestra el icono `picture_as_pdf`, provisto por el molecule compartido `DownloadPdfButton`, en vez del icono `print` anterior
