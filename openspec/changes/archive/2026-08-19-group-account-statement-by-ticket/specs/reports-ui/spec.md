## MODIFIED Requirements

### Requirement: Account statement ledger detail view
La ruta `/reports/account-statements/[customerId]` SHALL renderizar el desglose de un cliente: encabezado (saldo inicial, actual, límite, disponible, dirección y última factura), tabla de movimientos con badge de estado, un selector de período `Completo | Rango` (SegmentedButton) que recalcula la tabla y el saldo inicial, y botones "Exportar PDF" y "Exportar Excel" que descargan el reporte con los filtros aplicados vía `authFetch` (Bearer) sin exponer el token. La tabla SHALL renderizar `ledger.groups[]` en vez de la lista plana `ledger.movements[]`: por cada grupo, la fila de la venta (si `sale` no es `null`) seguida inmediatamente por las filas de sus abonos, visualmente diferenciadas (indentación o borde) para indicar que pertenecen a ese ticket; el grupo con `sale: null` (abonos sin venta visible en el rango) SHALL renderizarse precedido de una fila de encabezado de sección con el texto "Abonos sin venta visible en el rango". Cada fila (venta o abono) SHALL incluir las columnas Serie, Factura, Vencimiento, Referencia y F.Pgo (forma de pago) además de Fecha, Tipo, Cargo, Abono, Saldo acumulado y Estado — mismas columnas ya existentes, sin cambio. El pie de tabla (total de movimientos, cargos, abonos, saldo final) SHALL seguir viniendo de `ledger.totals`/`ledger.closingBalance`, sin cambio. La vista SHALL ofrecer un checkbox "Mostrar Histórico" (General = solo deudas activas / Histórico = todo) y un grupo de radios "Orden de Información" (3 modos) cableados al endpoint, cuyo criterio ahora reordena los grupos (ver capability `account-statements-api`). Cada fila de abono SHALL ofrecer una acción "Imprimir Anticipo" que descarga el recibo PDF del abono vía `authFetch`. Se accede haciendo clic en una fila del resumen. Sin movimientos SHALL mostrar un estado vacío. Los `_blocks` SHALL ser presentacionales (sin `fetch`, navegación ni validación); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`.

#### Scenario: Navegación desde el resumen
- **WHEN** el usuario hace clic en una fila de la tabla resumen
- **THEN** navega a `/reports/account-statements/[customerId]` y ve el libro mayor con su encabezado

#### Scenario: Cambio de período
- **WHEN** el usuario selecciona "Rango" e ingresa fechas
- **THEN** la tabla de movimientos y el saldo inicial se recalculan; "Completo" muestra el histórico desde `openingBalance = 0`

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los mismos filtros aplicados, autenticado vía `authFetch`

#### Scenario: Exportar Excel
- **WHEN** el usuario pulsa "Exportar Excel"
- **THEN** se descarga un `.xlsx` con las mismas columnas de la tabla de movimientos y el periodo aplicado, autenticado vía `authFetch`

#### Scenario: Cliente sin movimientos
- **WHEN** el cliente no tiene movimientos en el período
- **THEN** se muestra un estado vacío en lugar de la tabla

#### Scenario: Columnas fiscales y encabezado extendido
- **WHEN** el usuario abre el desglose de un cliente
- **THEN** el encabezado muestra dirección y última factura, y la tabla muestra las columnas Serie, Factura, Vencimiento, Referencia y F.Pgo

#### Scenario: Toggle Mostrar Histórico
- **WHEN** el usuario desmarca "Mostrar Histórico"
- **THEN** la tabla muestra solo las deudas activas (ventas de crédito no liquidadas y sus abonos); al marcarlo vuelve a mostrar todo

#### Scenario: Orden de Información
- **WHEN** el usuario cambia el radio "Orden de Información"
- **THEN** la tabla se reordena según el modo elegido sin alterar el saldo acumulado de cada fila

#### Scenario: Imprimir Anticipo
- **WHEN** el usuario pulsa "Imprimir Anticipo" en una fila de abono
- **THEN** se descarga el recibo PDF de ese abono autenticado vía `authFetch`

#### Scenario: Venta agrupada con sus abonos
- **WHEN** el cliente tiene una venta a crédito con 2 abonos parciales
- **THEN** la tabla muestra la fila de la venta seguida inmediatamente por las 2 filas de abono, visualmente indentadas o diferenciadas como pertenecientes a ese ticket

#### Scenario: Sección de abonos sin venta visible
- **WHEN** el desglose incluye un grupo con `sale: null`
- **THEN** la tabla muestra una fila de encabezado de sección "Abonos sin venta visible en el rango" antes de sus filas de abono
