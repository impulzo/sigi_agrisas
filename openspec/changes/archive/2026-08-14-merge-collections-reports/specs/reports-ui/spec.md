## MODIFIED Requirements

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

### Requirement: Reports adopta el shell y la tabla estándar del design system

Las 8 rutas del módulo de reportes (`/reports`, `/reports/account-statements`, `/reports/account-statements/[customerId]`, `/reports/sales-cut`, `/reports/collections`, `/reports/purchases`, `/reports/sales-by-product`, `/reports/inventory-by-department`) SHALL renderizar su contenido dentro de `PageShell`, según la capability `design-system`.

Ningún bloque de reportes SHALL declarar espaciado ni ancho propio. Quedan PROHIBIDOS a nivel de raíz de página: `px-4 py-6`, `mx-auto`, `space-y-4` y cualquier `max-w-*` (hoy conviven `max-w-5xl`, `max-w-6xl` y `max-w-7xl` dentro de la misma sección).

El enlace de retorno al hub SHALL expresarse con la prop `backHref="/reports"` de `PageShell`, no con un `<Link>` + `<Icon name="arrow_back">` compuesto a mano en cada página.

Los títulos de las páginas de reporte SHALL usar el mismo nivel que el resto de páginas de la aplicación, provisto por `PageShell` (`text-headline-lg`), y NO `text-headline-sm`.

Todas las tablas de reportes SHALL usar las primitivas `DataTable` (`Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`). Quedan ELIMINADAS las constantes locales de clases de celda (`th`, `td`, `thRight`, `tdRight`) hoy duplicadas en `purchases/_blocks/PurchasesTable.tsx`, `purchases/_blocks/ProviderPaymentsTable.tsx`, `collections/_blocks/global/CollectionsRowsTable.tsx` y `_blocks/PriceListTable.tsx`, así como el padding de celda divergente `px-3 py-3`.

Las tarjetas de totales/KPI SHALL usar la molécula `Card`. Los botones "Exportar PDF" y "Exportar Excel" SHALL usar el átomo `Button` (`variant="filled"` y `variant="outlined"` respectivamente, con `icon`), no `<button>` crudos con clases inline.

#### Scenario: Un reporte y un listado comparten margen

- **WHEN** se navega de `/sales` a `/reports/purchases`
- **THEN** el contenedor de página presenta el mismo `padding-left` y `padding-top` en ambas rutas

#### Scenario: Título de reporte al mismo nivel que el resto

- **WHEN** se renderiza cualquier ruta de `/reports/*`
- **THEN** el título usa `text-headline-lg` provisto por `PageShell`

## REMOVED Requirements

### Requirement: Cash cut (collections) view
**Reason**: Fusionado con "Customer collections report view" en una sola pantalla con tabs — ver `Requirement: Collections (cobranza) view`.
**Migration**: La ruta `/reports/cash-cut` deja de existir. El mismo contenido (totales, desglose por forma de pago, tabla de filas de cobranza) ahora vive en la tab "Global" de `/reports/collections`.

### Requirement: Customer collections report view
**Reason**: Fusionado con "Cash cut (collections) view" en una sola pantalla con tabs — ver `Requirement: Collections (cobranza) view`.
**Migration**: La ruta `/reports/customer-collections` deja de existir. El mismo contenido (`SegmentedButton` Por Cliente/Por Ticket) ahora vive en la tab "Por Cliente" de `/reports/collections`.

## ADDED Requirements

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
