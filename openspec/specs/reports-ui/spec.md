# Spec: reports-ui

## Purpose

Define el módulo de UI `app/(private)/reports/`: punto de entrada de reportes en el panel (NavigationRail), la vista de Estados de Cuenta (resumen multi-cliente y desglose por cliente con libro mayor, período, columnas fiscales, toggle histórico, orden de información e impresión de anticipo), y la vista de Inventario por Departamento (lista de precios del catálogo agrupada por producto con export PDF/Excel).

---
## Requirements
### Requirement: Reports module and navigation entry
El sistema SHALL exponer el módulo de UI en `app/(private)/reports/`. La ruta `/reports` SHALL renderizar un **hub** con tarjetas hacia los reportes disponibles ("Estados de Cuenta" → `/reports/account-statements`, "Corte de Ventas" → `/reports/sales-cut`, "Cobranza" → `/reports/collections`, "Compras" → `/reports/purchases`, "Ventas por Producto" → `/reports/sales-by-product`). Cada tarjeta (`CatalogHubCard`, componente compartido) SHALL renderizarse siempre — título, descripción e icono visibles independientemente del permiso — y gatear únicamente su acción: con el permiso correspondiente muestra un link "Abrir" hacia la ruta del reporte; sin el permiso, muestra un badge deshabilitado "Sin acceso" en su lugar y la tarjeta queda con opacidad reducida. La tarjeta "Cobranza" SHALL gatear su acción con la unión de permisos `can("reports:cash_cut_read") || can("reports:customer_collections_read")` (basta con uno de los dos para habilitar el link "Abrir"), a diferencia del resto de tarjetas que gatean con un único permiso. El `NavigationRail` SHALL conservar el item primario `reports` (`href:/reports`, icon `summarize`, `requires:reports:account_statements_read`), mostrándose optimistamente durante `"loading"` y ocultándose (ítem del rail, no las tarjetas del hub) cuando `can("reports:account_statements_read")` es `false`. Las páginas (`page.tsx`) SHALL ser Server Components que exportan `metadata`. (Traza: S4, S5.)

#### Scenario: Item visible con permiso
- **WHEN** un usuario con `reports:account_statements_read` abre el panel
- **THEN** el NavigationRail muestra el item "Reportes" que navega a `/reports`

#### Scenario: Item oculto sin permiso
- **WHEN** un usuario sin el permiso resuelto a `false`
- **THEN** el item "Reportes" no se muestra y la ruta no es accesible

#### Scenario: Hub con tarjetas por permiso
- **WHEN** un usuario con `reports:sales_cut_read` abre `/reports`
- **THEN** ve la tarjeta "Corte de Ventas" que navega a `/reports/sales-cut`

#### Scenario: Tarjeta de Cobranza con al menos un permiso
- **WHEN** un usuario tiene `reports:cash_cut_read`, `reports:customer_collections_read`, o ambos, y abre `/reports`
- **THEN** ve una única tarjeta "Cobranza" (no dos) que navega a `/reports/collections`

#### Scenario: Tarjeta de Cobranza sin ninguno de los dos permisos
- **WHEN** un usuario no tiene `reports:cash_cut_read` ni `reports:customer_collections_read`
- **THEN** la tarjeta "Cobranza" se muestra (título, descripción, icono) pero con badge "Sin acceso" en lugar del link "Abrir"

#### Scenario: Tarjeta deshabilitada sin permiso
- **WHEN** el usuario no tiene el permiso de un reporte
- **THEN** su tarjeta se muestra igual (título, descripción, icono) pero sin el link "Abrir"; en su lugar ve un badge "Sin acceso" y no puede navegar a la ruta del reporte

#### Scenario: Tarjeta de Compras por permiso
- **WHEN** un usuario con `reports:purchases_read` abre `/reports`
- **THEN** ve la tarjeta "Compras" que navega a `/reports/purchases`

#### Scenario: Tarjeta de Ventas por Producto por permiso
- **WHEN** un usuario con `reports:sales_by_product_read` abre `/reports`
- **THEN** ve la tarjeta "Ventas por Producto" que navega a `/reports/sales-by-product`

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

### Requirement: Collections (cobranza) view
La ruta `/reports/collections` SHALL renderizar una única pantalla "Cobranza" con dos tabs alternables mediante `SegmentedButton<View>` ("Global" | "Por Cliente"):
- Tab "Global": filtros de sucursal (visible solo con `can("branches:access_all")`) y rango de fechas (`from`/`to`, obligatorios); tarjetas de totales (`totalCollected`, `totalIva`); tabla de desglose dinámico por forma de pago; tabla de filas de cobranza con columnas `Cte, Docto, Factura, Nombre del cliente, Fec-Fact, Días, Importe, Fp, Referencia, F. Cobro, I.V.A., Tasa%` (scroll horizontal); botones "Exportar PDF"/"Exportar Excel" que exportan únicamente los datos de esta tab.
- Tab "Por Cliente": filtros de sucursal (visible solo con `can("branches:access_all")`), cliente y rango de fechas (obligatorio); un `SegmentedButton` interno "Por Cliente | Por Ticket" que alterna entre la tabla `byCustomer` y la tabla `byTicket` (ambas ya agregadas por el backend, sin cálculo en cliente); botones "Exportar PDF"/"Exportar Excel" que exportan únicamente los datos de esta tab.

Cada tab SHALL mantener su propio estado de filtros de forma independiente (cambiar de tab no reinicia ni comparte los filtros de la otra tab) y SHALL consultar su propio endpoint mediante su propio hook (`useCashCut` para Global, `useCustomerCollectionsReport` para Por Cliente), sin unificar sus DTOs ni sus cálculos.

El acceso a cada tab SHALL depender de su propio permiso: `reports:cash_cut_read` para "Global", `reports:customer_collections_read` para "Por Cliente". Si el usuario resuelto (`can()`) tiene un solo permiso de los dos, la página SHALL forzar esa tab como única vista y SHALL NO renderizar el `SegmentedButton` de nivel superior. Si tiene ambos, el `SegmentedButton` SHALL mostrarse con "Global" seleccionada por defecto. Si no tiene ninguno, SHALL mostrar `EmptyState` "Sin acceso". Mientras `can()` esté en `"loading"`, la página SHALL tratarlo de forma optimista (sin parpadear a "Sin acceso" antes de resolver).

Los `_blocks` SHALL ser presentacionales (sin `fetch`); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin abonos en el periodo, cada tab SHALL mostrar su propio estado vacío de forma independiente.

#### Scenario: Tarjeta en el hub
- **WHEN** un usuario con `reports:cash_cut_read` o `reports:customer_collections_read` abre `/reports`
- **THEN** ve la tarjeta "Cobranza" que navega a `/reports/collections`

#### Scenario: Tab Global por defecto
- **WHEN** un usuario con ambos permisos abre `/reports/collections`
- **THEN** ve la tab "Global" activa con totales, desglose por forma de pago y tabla de filas de cobranza del periodo, y el `SegmentedButton` "Global | Por Cliente" visible

#### Scenario: Tab Por Cliente con sub-vistas
- **WHEN** el usuario cambia a la tab "Por Cliente"
- **THEN** ve el `SegmentedButton` interno "Por Cliente | Por Ticket"; con "Por Cliente" seleccionado ve una fila por cliente con su total cobrado, y con "Por Ticket" ve una fila por venta abonada

#### Scenario: Filtros independientes por tab
- **WHEN** el usuario cambia el rango de fechas en la tab "Global" y luego cambia a la tab "Por Cliente"
- **THEN** los filtros de la tab "Por Cliente" conservan su propio valor previo, sin heredar el rango de fechas modificado en "Global"

#### Scenario: Exportar tab activa únicamente
- **WHEN** el usuario pulsa "Exportar PDF" o "Exportar Excel" estando en una tab
- **THEN** se descarga el archivo correspondiente solo con los datos de esa tab, autenticado vía `authFetch`, sin exponer el token

#### Scenario: Solo permiso de Global
- **WHEN** un usuario tiene `reports:cash_cut_read` pero no `reports:customer_collections_read` y abre `/reports/collections`
- **THEN** ve únicamente el contenido de la tab "Global", sin el `SegmentedButton` de nivel superior

#### Scenario: Solo permiso de Por Cliente
- **WHEN** un usuario tiene `reports:customer_collections_read` pero no `reports:cash_cut_read` y abre `/reports/collections`
- **THEN** ve únicamente el contenido de la tab "Por Cliente" (con su propio sub-`SegmentedButton` Por Cliente/Por Ticket), sin el `SegmentedButton` de nivel superior

#### Scenario: Sin ningún permiso
- **WHEN** un usuario sin `reports:cash_cut_read` ni `reports:customer_collections_read` abre `/reports/collections`
- **THEN** ve `EmptyState` "Sin acceso" y ninguna tab se renderiza

#### Scenario: Filtro sucursal restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** el filtro de sucursal no se muestra en ninguna tab y cada corte se limita a su sucursal

#### Scenario: Periodo sin cobranza
- **WHEN** el periodo seleccionado no tiene abonos completados
- **THEN** la tab activa muestra su propio estado vacío en lugar de sus tablas

---

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

### Requirement: Sales-by-product report view
La ruta `/reports/sales-by-product` SHALL renderizar filtros de sucursal (visible solo con `can("branches:access_all")`), departamento y rango de fechas, más una tarjeta de Total siempre visible. Debajo, un único `Card` SHALL agrupar: un `SegmentedButton` de alcance "Global \| Por Cliente"; si el alcance es "Por Cliente", un combobox de cliente (mismo componente compartido `CustomerFilterCombobox` que otros reportes) visible dentro de ese card; una tabla de detalle con columnas Departamento, Producto, Cliente, Cantidad y Monto (una fila por combinación única de esas tres dimensiones, ordenada por Monto desc); y paginación (`CatalogPagination`) debajo de la tabla. Botones "Exportar PDF"/"Exportar Excel" en la cabecera. Los `_blocks` SHALL ser presentacionales; el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin ventas en el periodo SHALL mostrar un estado vacío.

#### Scenario: Tarjeta en el hub
- **WHEN** un usuario con `reports:sales_by_product_read` abre `/reports`
- **THEN** ve la tarjeta "Ventas por Producto" que navega a `/reports/sales-by-product`

#### Scenario: Toggle Global/Por Cliente
- **WHEN** el usuario cambia el `SegmentedButton` de alcance de "Global" a "Por Cliente"
- **THEN** aparece el combobox de cliente dentro del mismo card; mientras no haya cliente elegido, la tabla permanece en modo agregado (todos los clientes)

#### Scenario: Seleccionar cliente en modo Por Cliente
- **WHEN** el usuario, con el alcance en "Por Cliente", elige un cliente en el combobox
- **THEN** la tarjeta de Total y la tabla de detalle se angostan a ese cliente, y la página vuelve a 1

#### Scenario: Volver a Global
- **WHEN** el usuario cambia el alcance de "Por Cliente" (con un cliente elegido) de vuelta a "Global"
- **THEN** el combobox se oculta y el reporte vuelve a mostrar datos agregados de todos los clientes, sin enviar `customerId`

#### Scenario: Paginación de la tabla de detalle
- **WHEN** el periodo tiene más combinaciones Departamento+Producto+Cliente que el `pageSize` actual
- **THEN** `CatalogPagination` permite navegar entre páginas y cambiar el tamaño de página, reseteando a la página 1 al cambiar cualquier filtro o el alcance

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los filtros y el alcance activo aplicados, autenticado vía `authFetch`

#### Scenario: Exportar Excel
- **WHEN** el usuario pulsa "Exportar Excel"
- **THEN** se descarga un `.xlsx` con una sola hoja "Detalle", autenticado vía `authFetch`

#### Scenario: Reporte demasiado grande para exportar
- **WHEN** el usuario exporta PDF o Excel y el backend responde `409 ReportTooLarge`
- **THEN** la UI muestra un mensaje legible pidiendo aplicar más filtros, sin descargar archivo

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** se muestra un estado vacío en lugar de la tabla

---

### Requirement: Inventory by department view

El sistema SHALL exponer la vista de UI `app/(private)/reports/inventory-by-department/`: una tarjeta "Inventario por Departamento" en el hub `/reports` gated por `reports:inventory_read`, un selector de departamento, una tabla que agrupa los productos con su costo de adquisición y sus listas de precio, y botones "Exportar PDF" y "Exportar Excel" que descargan los artefactos con los filtros aplicados vía `authFetch` (Bearer). Los `_blocks` SHALL ser presentacionales (sin `fetch`, navegación ni validación); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. La tabla SHALL mostrar una columna "Costo adq." (formateada como moneda MXN, o "—" si el producto no tiene costo capturado) inmediatamente después de la columna "Stock" y antes de las columnas dinámicas de nivel de precio. Las columnas de nivel de precio SHALL ordenarse por rango de negocio: primero el/los nombre(s) de precio marcados `isDefault=true` en los datos, luego los que matcheen `/subdis/i` en el nombre, luego los que matcheen `/distri/i`, y por último el resto — dentro de cada rango, orden alfabético `es-MX` en caso de empate; no puramente alfabético sobre el nombre completo. Mismo criterio de rango que ya aplica `sortProductPricesForDisplay` en catálogo de productos y POS. (Traza: historia 2 y historia 1 de `fix-price-column-order-report`.)

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
- **THEN** la tabla muestra cada producto con código, nombre, unidad y costo de adquisición, y debajo sus filas de precio (lista, precio, cantidad mínima, % descuento, default)

#### Scenario: Exportar PDF

- **WHEN** el usuario pulsa "Exportar PDF" con un departamento seleccionado
- **THEN** se descarga `inventory-by-department-YYYY-MM-DD.pdf` con los mismos filtros, autenticado vía `authFetch`

#### Scenario: Exportar Excel

- **WHEN** el usuario pulsa "Exportar Excel" con un departamento seleccionado
- **THEN** se descarga `inventory-by-department-YYYY-MM-DD.xlsx` con los mismos filtros, autenticado vía `authFetch`

#### Scenario: Sin productos

- **WHEN** el departamento seleccionado no tiene productos
- **THEN** se muestra un estado vacío en lugar de la tabla

#### Scenario: Columna de costo de adquisición sin valor

- **WHEN** un producto listado no tiene `acquisitionPrice` capturado
- **THEN** la celda de "Costo adq." muestra "—"

#### Scenario: Orden de columnas de precio en la tabla web — rango de negocio, no alfabético puro

- **WHEN** el departamento seleccionado tiene productos con precios nombrados `"Precio Publico"` (marcado `isDefault: true`), `"Precio Subdis 10%"`, `"Precio Distri 15%"` y `"Precio 4"`
- **THEN** las columnas de la tabla se muestran en el orden `Precio Publico, Precio Subdis 10%, Precio Distri 15%, Precio 4` — default primero, luego subdistribuidor, luego distribuidor, luego el resto; NO alfabético puro sobre el nombre completo

### Requirement: Reports adopta el shell y la tabla estándar del design system

Las 8 rutas del módulo de reportes (`/reports`, `/reports/account-statements`, `/reports/account-statements/[customerId]`, `/reports/sales-cut`, `/reports/collections`, `/reports/purchases`, `/reports/sales-by-product`, `/reports/inventory-by-department`) SHALL renderizar su contenido dentro de `PageShell`, según la capability `design-system`.

Ningún bloque de reportes SHALL declarar espaciado ni ancho propio. Quedan PROHIBIDOS a nivel de raíz de página: `px-4 py-6`, `mx-auto`, `space-y-4` y cualquier `max-w-*` (hoy conviven `max-w-5xl`, `max-w-6xl` y `max-w-7xl` dentro de la misma sección).

El enlace de retorno al hub SHALL expresarse con la prop `backHref="/reports"` de `PageShell`, no con un `<Link>` + `<Icon name="arrow_back">` compuesto a mano en cada página.

Los títulos de las páginas de reporte SHALL usar el mismo nivel que el resto de páginas de la aplicación, provisto por `PageShell` (`text-headline-lg`), y NO `text-headline-sm`.

Todas las tablas de reportes SHALL usar las primitivas `DataTable` (`Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`). Quedan ELIMINADAS las constantes locales de clases de celda (`th`, `td`, `thRight`, `tdRight`) hoy duplicadas en `purchases/_blocks/PurchasesTable.tsx`, `purchases/_blocks/ProviderPaymentsTable.tsx`, `collections/_blocks/global/CollectionsRowsTable.tsx` y `_blocks/PriceListTable.tsx`, así como el padding de celda divergente `px-3 py-3`.

Las tarjetas de totales/KPI SHALL usar la molécula `Card`. Los botones "Exportar Excel" SHALL usar el átomo `Button` (`variant="outlined"`, con `icon="summarize"`), no `<button>` crudos con clases inline. El botón de exportación a PDF de las 8 pantallas SHALL usar el molecule compartido `ExportPdfButton` (`app/_components/molecules/PdfDownloadButton.tsx`), con leyenda fija "Exportar a PDF" e icono `picture_as_pdf` — ninguna pantalla de reportes SHALL implementar su propio botón de exportación a PDF con `Button` inline ni con `<button>` crudo.

#### Scenario: Un reporte y un listado comparten margen

- **WHEN** se navega de `/sales` a `/reports/purchases`
- **THEN** el contenedor de página presenta el mismo `padding-left` y `padding-top` en ambas rutas

#### Scenario: Título de reporte al mismo nivel que el resto

- **WHEN** se renderiza cualquier ruta de `/reports/*`
- **THEN** el título usa `text-headline-lg` provisto por `PageShell`

#### Scenario: Tabla de reporte con el dialecto estándar

- **WHEN** se renderiza la tabla de cualquier reporte
- **THEN** sus `th` miden 11px en mayúsculas sobre `bg-surface-container` y sus `td` usan `px-4 py-3` y miden 13px, idénticos a los de `/sales`

#### Scenario: Columnas numéricas alineadas

- **WHEN** una tabla de reporte muestra importes o cantidades
- **THEN** esas celdas usan `align="right"` de `DataTable`, con `text-right` y `tabular-nums`

#### Scenario: Retorno al hub uniforme

- **WHEN** se renderiza una ruta de detalle de reporte
- **THEN** el control de retorno lo provee `PageShell` mediante `backHref`, con el mismo icono, posición y área de click en las 8 rutas

#### Scenario: Sin ancho divergente dentro de la sección

- **WHEN** se navega entre `/reports`, `/reports/account-statements/[customerId]` y `/reports/purchases`
- **THEN** las tres comparten el mismo ancho máximo de contenido, provisto por `PageShell`

#### Scenario: Botón de exportar PDF uniforme en las 8 pantallas

- **WHEN** se renderiza el botón de exportación a PDF en cualquiera de las 8 pantallas de `/reports/*`
- **THEN** muestra el icono `picture_as_pdf` y el texto exacto "Exportar a PDF", provisto por el molecule compartido `ExportPdfButton`

#### Scenario: Exportación PDF en curso deshabilita el botón

- **WHEN** una exportación a PDF está en curso en cualquier pantalla de reportes
- **THEN** el botón "Exportar a PDF" se muestra deshabilitado con indicador de carga hasta que la descarga termina (éxito o error)

### Requirement: CustomerFilterCombobox exposes an explicit "all customers" option

The shared `CustomerFilterCombobox` component (used by the sales-by-product report's Por Cliente view and by the collections Por Cliente view) SHALL prepend a fixed option `{ value: "", label: "Todos los clientes" }` to its options list whenever there is no active text search (`query === ""`). Consumers that already initialize their `customerId` filter state as `""` SHALL therefore display "Todos los clientes" as the selected value by default, without any change to the consumer's own state initialization. Selecting this option SHALL behave identically to leaving the filter empty — the backend's existing optional `customerId` contract is unchanged.

#### Scenario: Combobox opened with no search shows "Todos los clientes" first
- **WHEN** the customer filter combobox is opened in `/reports/sales-by-product` (Por Cliente) or `/reports/collections` (Por Cliente) without typing a search query
- **THEN** the first option listed is "Todos los clientes" with `value=""`

#### Scenario: Default state renders the option as selected
- **WHEN** the report page mounts with `customerId=""` (the existing default in both consumers)
- **THEN** the combobox displays "Todos los clientes" as its current value, not an empty/unlabeled field

#### Scenario: Selecting "Todos los clientes" behaves like the empty filter
- **WHEN** the user explicitly selects "Todos los clientes" and applies the report filters
- **THEN** the report request omits `customerId` (or sends it empty), returning data for all customers — identical to today's behavior when the field was left blank

#### Scenario: Active text search does not mix in the sentinel option
- **WHEN** the user types a search query (one or more characters) into the customer filter combobox
- **THEN** the results shown are exclusively the matches returned by the customer search — "Todos los clientes" does not appear interleaved among search results

