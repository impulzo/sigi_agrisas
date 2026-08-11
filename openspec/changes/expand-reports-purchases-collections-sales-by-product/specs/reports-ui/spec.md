## MODIFIED Requirements

### Requirement: Reports module and navigation entry
El sistema SHALL exponer el módulo de UI en `app/(private)/reports/`. La ruta `/reports` SHALL renderizar un **hub** con tarjetas hacia los reportes disponibles ("Estados de Cuenta" → `/reports/account-statements`, "Corte de Ventas" → `/reports/sales-cut`, "Corte de Caja (Cobranza)" → `/reports/cash-cut`, "Compras" → `/reports/purchases`, "Ventas por Producto" → `/reports/sales-by-product`, "Cobranza por Cliente" → `/reports/customer-collections`). Cada tarjeta (`CatalogHubCard`, componente compartido) SHALL renderizarse siempre — título, descripción e icono visibles independientemente del permiso — y gatear únicamente su acción: con el permiso correspondiente (`reports:account_statements_read`, `reports:sales_cut_read`, `reports:cash_cut_read`, `reports:purchases_read`, `reports:sales_by_product_read` o `reports:customer_collections_read`) muestra un link "Abrir" hacia la ruta del reporte; sin el permiso, muestra un badge deshabilitado "Sin acceso" en su lugar y la tarjeta queda con opacidad reducida. El `NavigationRail` SHALL conservar el item primario `reports` (`href:/reports`, icon `summarize`, `requires:reports:account_statements_read`), mostrándose optimistamente durante `"loading"` y ocultándose (ítem del rail, no las tarjetas del hub) cuando `can("reports:account_statements_read")` es `false`. Las páginas (`page.tsx`) SHALL ser Server Components que exportan `metadata`. (Traza: S4, S5.)

#### Scenario: Item visible con permiso
- **WHEN** un usuario con `reports:account_statements_read` abre el panel
- **THEN** el NavigationRail muestra el item "Reportes" que navega a `/reports`

#### Scenario: Item oculto sin permiso
- **WHEN** un usuario sin el permiso resuelto a `false`
- **THEN** el item "Reportes" no se muestra y la ruta no es accesible

#### Scenario: Hub con tarjetas por permiso
- **WHEN** un usuario con `reports:sales_cut_read` abre `/reports`
- **THEN** ve la tarjeta "Corte de Ventas" que navega a `/reports/sales-cut`

#### Scenario: Tarjeta de cobranza por permiso
- **WHEN** un usuario con `reports:cash_cut_read` abre `/reports`
- **THEN** ve la tarjeta "Corte de Caja (Cobranza)" que navega a `/reports/cash-cut`

#### Scenario: Tarjeta deshabilitada sin permiso
- **WHEN** el usuario no tiene el permiso de un reporte
- **THEN** su tarjeta se muestra igual (título, descripción, icono) pero sin el link "Abrir"; en su lugar ve un badge "Sin acceso" y no puede navegar a la ruta del reporte

#### Scenario: Tarjeta de Compras por permiso
- **WHEN** un usuario con `reports:purchases_read` abre `/reports`
- **THEN** ve la tarjeta "Compras" que navega a `/reports/purchases`

#### Scenario: Tarjeta de Ventas por Producto por permiso
- **WHEN** un usuario con `reports:sales_by_product_read` abre `/reports`
- **THEN** ve la tarjeta "Ventas por Producto" que navega a `/reports/sales-by-product`

#### Scenario: Tarjeta de Cobranza por Cliente por permiso
- **WHEN** un usuario con `reports:customer_collections_read` abre `/reports`
- **THEN** ve la tarjeta "Cobranza por Cliente" que navega a `/reports/customer-collections`

---

### Requirement: Sales cut view
La ruta `/reports/sales-cut` SHALL renderizar el corte de ventas: un toggle de periodo "Hoy | Rango" (SegmentedButton) donde "Hoy" precarga el día actual (envía `preset=today`) y "Rango" habilita `from/to`; filtros de sucursal (visible solo con `can("branches:access_all")`), cajero y método de pago; tarjetas de totales (ventas, tickets, subtotal, IVA, IEPS, canceladas), una tarjeta de neto de caja con sus componentes, tablas de los seis desgloses (método, día, cajero, sucursal, departamento, producto), una tabla adicional "Detalle de tickets" (columnas Ticket, Cliente, Importe, Forma de Pago — una fila por venta del periodo/filtros aplicados) debajo de los seis desgloses, y botones "Exportar PDF" y "Exportar Excel" que descargan el reporte (incluyendo el detalle de tickets) con los filtros aplicados vía `authFetch` (Bearer) sin exponer el token. La tabla "Por producto" SHALL incluir una columna adicional de piezas vendidas (`quantitySold`) que las demás tablas no tienen. Los `_blocks` SHALL ser presentacionales (sin `fetch`); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin ventas SHALL mostrar un estado vacío (incluida la tabla de detalle de tickets). (Traza: S4.)

#### Scenario: Corte del día
- **WHEN** un usuario con permiso abre `/reports/sales-cut` con "Hoy" seleccionado
- **THEN** ve los totales, el neto de caja y los seis desgloses del día actual

#### Scenario: Cambio a rango
- **WHEN** el usuario selecciona "Rango" e ingresa `from/to`
- **THEN** los totales, neto de caja, desgloses (incluidos departamento y producto) y el detalle de tickets se recalculan para ese rango

#### Scenario: Filtro sucursal restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** el filtro de sucursal no se muestra y el corte se limita a su sucursal

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los mismos filtros aplicados, incluyendo el detalle de tickets, autenticado vía `authFetch`

#### Scenario: Exportar Excel
- **WHEN** el usuario pulsa "Exportar Excel"
- **THEN** se descarga un archivo `.xlsx` con los seis desgloses y el detalle de tickets en hojas separadas, autenticado vía `authFetch`

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** se muestra un estado vacío en lugar de las tablas, incluida la de detalle de tickets

#### Scenario: Tabla por producto muestra piezas vendidas
- **WHEN** el corte tiene ventas de productos
- **THEN** la tabla "Por producto" muestra, además de los montos, la columna de cantidad vendida por producto

#### Scenario: Detalle de tickets
- **WHEN** el corte tiene ventas en el periodo
- **THEN** la tabla "Detalle de tickets" muestra una fila por venta con folio, nombre del cliente, importe total y forma de pago

---

### Requirement: Account statements summary view
La ruta `/reports/account-statements` SHALL renderizar una tabla resumen paginada multi-cliente (cliente, total cargado, total abonado, saldo, límite, disponible) con búsqueda de cliente server-side (mín 2 caracteres, debounce 300 ms), filtro de rango de fechas, filtro `solo con saldo`, filtro de sucursal visible solo cuando `can("branches:access_all")`, y botones "Exportar PDF" y "Exportar Excel" que descargan el resumen con los filtros aplicados vía `authFetch`. Los `_blocks` SHALL ser presentacionales (sin `fetch`, navegación ni validación); el HTTP SHALL vivir en `_logic/services/` y la orquestación en `_logic/hooks/`.

#### Scenario: Tabla resumen
- **WHEN** un usuario con permiso abre `/reports/account-statements`
- **THEN** ve la tabla resumen paginada con los filtros y buscador server-side

#### Scenario: Filtro sucursal restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** el filtro de sucursal no se muestra y el listado se limita a su sucursal

#### Scenario: Solo con saldo
- **WHEN** el usuario activa `solo con saldo`
- **THEN** la tabla muestra únicamente clientes con saldo distinto de cero

#### Scenario: Exportar Excel del resumen
- **WHEN** el usuario pulsa "Exportar Excel" en el resumen
- **THEN** se descarga un `.xlsx` con las mismas columnas de la tabla resumen y los filtros aplicados, autenticado vía `authFetch`

---

### Requirement: Account statement ledger detail view
La ruta `/reports/account-statements/[customerId]` SHALL renderizar el desglose de un cliente: encabezado (saldo inicial, actual, límite, disponible, dirección y última factura), tabla de movimientos con badge de estado, un selector de período `Completo | Rango` (SegmentedButton) que recalcula la tabla y el saldo inicial, y botones "Exportar PDF" y "Exportar Excel" que descargan el reporte con los filtros aplicados vía `authFetch` (Bearer) sin exponer el token. La tabla de movimientos SHALL incluir las columnas Serie, Factura, Vencimiento, Referencia y F.Pgo (forma de pago) además de Fecha, Tipo, Cargo, Abono, Saldo acumulado y Estado. La vista SHALL ofrecer un checkbox "Mostrar Histórico" (General = solo deudas activas / Histórico = todo) y un grupo de radios "Orden de Información" (3 modos) cableados al endpoint. Cada fila de abono SHALL ofrecer una acción "Imprimir Anticipo" que descarga el recibo PDF del abono vía `authFetch`. Se accede haciendo clic en una fila del resumen. Sin movimientos SHALL mostrar un estado vacío. Los `_blocks` SHALL ser presentacionales (sin `fetch`, navegación ni validación); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`.

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

## ADDED Requirements

### Requirement: Purchases report view
La ruta `/reports/purchases` SHALL renderizar el reporte de compras con dos secciones alternables vía `SegmentedButton` ("Compras" \| "Pagos a Proveedores"). La sección Compras SHALL ofrecer filtros de sucursal (visible solo con `can("branches:access_all")`), proveedor, estado y rango de fechas, tabla paginada (reusando `CatalogPagination`) y botones "Exportar PDF"/"Exportar Excel". La sección Pagos a Proveedores SHALL ofrecer los mismos tipos de filtro (proveedor, sucursal, estado, rango de fechas) y su propia tabla paginada con export PDF/Excel independiente. Los `_blocks` SHALL ser presentacionales; el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Cada sección sin resultados SHALL mostrar un estado vacío.

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

---

### Requirement: Sales-by-product report view
La ruta `/reports/sales-by-product` SHALL renderizar el cruce de inventario y ventas: filtros de sucursal (visible solo con `can("branches:access_all")`), departamento, cliente y rango de fechas; un `SegmentedButton` de agrupación "Cliente \| Departamento \| Producto" que determina qué tabla se muestra; una tarjeta de Total siempre visible independiente del modo de agrupación; la tabla de modo "Producto" SHALL incluir columnas de piezas vendidas y stock actual; y botones "Exportar PDF"/"Exportar Excel". Los `_blocks` SHALL ser presentacionales; el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin ventas en el periodo SHALL mostrar un estado vacío.

#### Scenario: Tarjeta en el hub
- **WHEN** un usuario con `reports:sales_by_product_read` abre `/reports`
- **THEN** ve la tarjeta "Ventas por Producto" que navega a `/reports/sales-by-product`

#### Scenario: Cambio de agrupación
- **WHEN** el usuario cambia el `SegmentedButton` de "Cliente" a "Producto"
- **THEN** la tabla cambia a mostrar filas por producto, con columnas de piezas vendidas y stock actual

#### Scenario: Tarjeta de Total constante
- **WHEN** el usuario cambia entre los tres modos de agrupación
- **THEN** la tarjeta de Total no cambia (refleja el mismo periodo/filtros, no el modo de agrupación)

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con el modo de agrupación activo y los filtros aplicados, autenticado vía `authFetch`

#### Scenario: Exportar Excel
- **WHEN** el usuario pulsa "Exportar Excel"
- **THEN** se descarga un `.xlsx` con hojas para Cliente, Departamento y Producto, autenticado vía `authFetch`

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** se muestra un estado vacío en lugar de la tabla

---

### Requirement: Customer collections report view
La ruta `/reports/customer-collections` SHALL renderizar el reporte de cobranza por cliente: filtros de sucursal (visible solo con `can("branches:access_all")`), cliente y rango de fechas (obligatorio); un `SegmentedButton` "Por Cliente \| Por Ticket" que alterna entre la tabla `byCustomer` y la tabla `byTicket` (ambas ya agregadas por el backend, sin cálculo en cliente); y botones "Exportar PDF"/"Exportar Excel". Los `_blocks` SHALL ser presentacionales; el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin abonos en el periodo SHALL mostrar un estado vacío.

#### Scenario: Tarjeta en el hub
- **WHEN** un usuario con `reports:customer_collections_read` abre `/reports`
- **THEN** ve la tarjeta "Cobranza por Cliente" que navega a `/reports/customer-collections`

#### Scenario: Vista por cliente
- **WHEN** el usuario abre la página con "Por Cliente" seleccionado
- **THEN** ve una tabla con una fila por cliente y su total cobrado en el periodo

#### Scenario: Vista por ticket
- **WHEN** el usuario cambia a "Por Ticket"
- **THEN** ve una tabla con una fila por venta abonada, agregando los abonos aplicados a esa venta

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con las filas agrupadas por cliente y sub-agrupadas por ticket, autenticado vía `authFetch`

#### Scenario: Exportar Excel
- **WHEN** el usuario pulsa "Exportar Excel"
- **THEN** se descarga un `.xlsx` con hojas de detalle, por cliente y por ticket, autenticado vía `authFetch`

#### Scenario: Periodo sin cobranza
- **WHEN** el periodo no tiene abonos completados
- **THEN** se muestra un estado vacío en lugar de las tablas
