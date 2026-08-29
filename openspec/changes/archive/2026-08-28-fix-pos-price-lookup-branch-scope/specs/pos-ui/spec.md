## MODIFIED Requirements

### Requirement: Price/dosification selection dialog

Al agregar un producto al carrito, `PriceTierPicker` SHALL listar, en un único diálogo, tanto los precios de catálogo del producto como sus dosificaciones activas (`GET /api/v1/admin/products/:id/dosifications`, ya existente — requiere `products:read`, permiso que el cajero ya posee). Los precios de catálogo SHALL obtenerse con `GET /api/v1/admin/products/:id/prices?branchId=<id>`, usando el `branchId` de la sucursal activa de la pantalla que invoca el diálogo — de forma que la lista muestre los precios efectivos de esa sucursal (su override propio, si existe, más los precios base heredados cuyo nombre no tiene override) en vez de siempre los precios base globales. Cuando la pantalla aún no tiene una sucursal seleccionada (p. ej. un admin en modo bypass antes de elegir), la petición SHALL omitir `branchId` y listar únicamente los precios base, igual que el comportamiento previo a este requirement. Cada dosificación SHALL mostrarse con su `name` y `computedUnitPrice` formateado como moneda, igual que un precio de catálogo. Una dosificación con `requiresDefaultPrice: true` (el producto no tiene precio default) SHALL renderizarse deshabilitada, sin permitir su selección, con un texto indicando la causa ("Requiere precio default"). Al confirmar una dosificación seleccionada, el diálogo SHALL invocar `onConfirm` con `dosificationId` en vez de `productPriceId` (mutuamente excluyentes, igual que en el body de creación de venta). Un producto sin dosificaciones activas SHALL mostrar el diálogo idéntico al comportamiento actual (solo precios), sin regresión visual ni de flujo.

Este diálogo se reutiliza en el flujo de edición de venta completada (`app/(private)/sales/_blocks/EditSalePage.tsx`, ver `pos-api` "Edit completed sale") y en el flujo de cotizaciones (`app/(private)/quotes/_blocks/QuoteCreatePage.tsx` y `QuoteEditPage.tsx`, ver `quotes-ui`). En creación (POS normal, cotización nueva) el `branchId` usado SHALL ser el de la sucursal seleccionada por el operador para esa venta/cotización. En edición (venta completada, cotización en borrador) el `branchId` usado SHALL ser el de la venta/cotización ya persistida (`sale.branchId` / `quote.branchId`, inmutables) — NUNCA el `branchId` de la sesión del usuario logueado, que puede diferir de la sucursal real de ese recurso. Al agregar un producto al carrito durante una edición, el diálogo SHALL igualmente listar dosificaciones activas junto a los precios, permitiendo reemplazar cualquier línea existente por una línea de dosificación o viceversa.

#### Scenario: Producto con precios y dosificaciones
- **WHEN** el cajero agrega al carrito un producto que tiene tanto precios de catálogo como dosificaciones activas
- **THEN** el diálogo muestra ambas listas; seleccionar una dosificación y confirmar agrega una línea al carrito con `dosificationId` establecido

#### Scenario: Dosificación sin precio default deshabilitada
- **WHEN** el producto tiene una dosificación cuyo `requiresDefaultPrice` es `true`
- **THEN** esa dosificación aparece en la lista mostrada pero no es seleccionable, con un mensaje indicando que requiere precio default

#### Scenario: Producto sin dosificaciones — sin regresión
- **WHEN** el producto no tiene dosificaciones activas
- **THEN** el diálogo se comporta exactamente como antes de este cambio (solo lista de precios de catálogo)

#### Scenario: Cantidad de partes vendidas
- **WHEN** el cajero selecciona una dosificación e ingresa una cantidad de partes en el campo "Cantidad" (mismo input que ya usa el diálogo para precios de catálogo, con el fix de UX de `fix-pos-cantidad-input` ya aplicado)
- **THEN** el total mostrado en el diálogo es `cantidad * computedUnitPrice`, consistente con cómo se calcula para precios de catálogo

#### Scenario: Disponible también en edición de venta completada
- **WHEN** un usuario con `sales:edit_completed` (y guard de HQ satisfecho) agrega un producto al carrito desde `/sales/:id/edit`
- **THEN** el diálogo muestra las mismas secciones de precios y dosificaciones que en el POS normal, permitiendo construir una línea de dosificación como parte de la nueva versión de la venta

#### Scenario: Precio de sucursal activa en POS/cotización nueva
- **WHEN** el operador tiene seleccionada la sucursal `B` y agrega al carrito un producto cuyo `ProductPrice` tiene un override para `B` distinto del precio base
- **THEN** la petición dispatchada es `GET .../prices?branchId=B` y el diálogo muestra el precio override de `B`, no el precio base

#### Scenario: Producto sin precio base se lista igual gracias al branchId
- **WHEN** el producto sólo tiene un `ProductPrice` con `branchId: B` (sin ningún precio con `branchId: null`) y el operador tiene seleccionada la sucursal `B`
- **THEN** el diálogo lista ese precio normalmente, en vez de mostrar "Este producto no tiene precios configurados"

#### Scenario: Edición usa el branchId de la venta, no el de la sesión
- **WHEN** un usuario con `branchId` de sesión distinto al de la venta abre `/sales/:id/edit` de una venta cuyo `branchId` es `B`, y agrega un producto al carrito
- **THEN** la petición dispatchada usa `branchId=B` (el de la venta), no el `branchId` de la sesión del usuario

#### Scenario: Cambiar de tier en una línea existente también usa el branchId correcto
- **WHEN** el usuario cambia de tier de precio en una línea ya agregada al carrito (no una línea nueva), tanto en POS/cotización nueva como en edición de venta/cotización
- **THEN** la petición de precios para esa línea usa el mismo `branchId` de contexto que se usaría al agregar un producto nuevo en esa misma pantalla

#### Scenario: Sin sucursal seleccionada, se listan sólo precios base
- **WHEN** un admin en modo bypass agrega un producto al carrito antes de haber seleccionado una sucursal de trabajo
- **THEN** la petición dispatchada es `GET .../prices` sin `branchId`, y el diálogo lista únicamente los precios base (`branchId: null`), igual que el comportamiento previo a este requirement
