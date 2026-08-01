## ADDED Requirements

### Requirement: Reports module and navigation entry
El sistema SHALL exponer un módulo de UI en `app/(private)/reports/` con la vista de Estados de Cuenta como primer reporte, y SHALL agregar un item primario `reports` al `NavigationRail` (`href:/reports`, icon `summarize`, `requires:reports:account_statements_read`). El item SHALL mostrarse optimistamente durante `"loading"` y ocultarse cuando `can("reports:account_statements_read")` es `false`. Las páginas (`page.tsx`) SHALL ser Server Components que exportan `metadata`. (Traza: S4.)

#### Scenario: Item visible con permiso
- **WHEN** un usuario con `reports:account_statements_read` abre el panel
- **THEN** el NavigationRail muestra el item "Reportes" que navega a `/reports`

#### Scenario: Item oculto sin permiso
- **WHEN** un usuario sin el permiso resuelto a `false`
- **THEN** el item "Reportes" no se muestra y la ruta no es accesible

---

### Requirement: Account statements summary view
La ruta `/reports/account-statements` SHALL renderizar una tabla resumen paginada multi-cliente (cliente, total cargado, total abonado, saldo, límite, disponible) con búsqueda de cliente server-side (mín 2 caracteres, debounce 300 ms), filtro de rango de fechas, filtro `solo con saldo`, y filtro de sucursal visible solo cuando `can("branches:access_all")`. Los `_blocks` SHALL ser presentacionales (sin `fetch`, navegación ni validación); el HTTP SHALL vivir en `_logic/services/` y la orquestación en `_logic/hooks/`. (Traza: S4.)

#### Scenario: Tabla resumen
- **WHEN** un usuario con permiso abre `/reports/account-statements`
- **THEN** ve la tabla resumen paginada con los filtros y buscador server-side

#### Scenario: Filtro sucursal restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** el filtro de sucursal no se muestra y el listado se limita a su sucursal

#### Scenario: Solo con saldo
- **WHEN** el usuario activa `solo con saldo`
- **THEN** la tabla muestra únicamente clientes con saldo distinto de cero

---

### Requirement: Account statement ledger detail view
La ruta `/reports/account-statements/[customerId]` SHALL renderizar el desglose de un cliente: encabezado (saldo inicial, actual, límite, disponible, **dirección** y **última factura**), tabla de movimientos con badge de estado, un selector de período `Completo | Rango` (SegmentedButton) que recalcula la tabla y el saldo inicial, y un botón "Exportar PDF" que descarga el PDF con los filtros aplicados vía `authFetch` (Bearer) sin exponer el token. La tabla de movimientos SHALL incluir las columnas **Serie**, **Factura**, **Vencimiento**, **Referencia** y **F.Pgo** (forma de pago) además de Fecha, Tipo, Cargo, Abono, Saldo acumulado y Estado. La vista SHALL ofrecer un checkbox **"Mostrar Histórico"** (General = solo deudas activas / Histórico = todo) y un grupo de radios **"Orden de Información"** (3 modos) cableados al endpoint. Cada fila de abono SHALL ofrecer una acción **"Imprimir Anticipo"** que descarga el recibo PDF del abono vía `authFetch`. Se accede haciendo clic en una fila del resumen. Sin movimientos SHALL mostrar un estado vacío. Los `_blocks` SHALL ser presentacionales (sin `fetch`, navegación ni validación); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. (Traza: S5 + user story legacy.)

#### Scenario: Navegación desde el resumen
- **WHEN** el usuario hace clic en una fila de la tabla resumen
- **THEN** navega a `/reports/account-statements/[customerId]` y ve el libro mayor con su encabezado

#### Scenario: Cambio de período
- **WHEN** el usuario selecciona "Rango" e ingresa fechas
- **THEN** la tabla de movimientos y el saldo inicial se recalculan; "Completo" muestra el histórico desde `openingBalance = 0`

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los mismos filtros aplicados, autenticado vía `authFetch`

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
