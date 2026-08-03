# Spec: pos-ui

## Purpose

Capa de UI del punto de venta (`app/(private)/pos/`) para agregar productos al carrito. Este capability documenta el diálogo de selección de precio/dosificación (`PriceTierPicker`) invocado al hacer click/Enter sobre un producto del catálogo — el resto de la UI del POS (carrito, totales, atajos de teclado) se documenta en otros capabilities (`keyboard-navigation`, etc.) y se irá agregando aquí incrementalmente.

---

## Requirements

### Requirement: Price/dosification selection dialog

Al agregar un producto al carrito, `PriceTierPicker` SHALL listar, en un único diálogo, tanto los precios de catálogo del producto (`GET /api/v1/admin/products/:id/prices`, ya existente) como sus dosificaciones activas (`GET /api/v1/admin/products/:id/dosifications`, ya existente — requiere `products:read`, permiso que el cajero ya posee). Cada dosificación SHALL mostrarse con su `name` y `computedUnitPrice` formateado como moneda, igual que un precio de catálogo. Una dosificación con `requiresDefaultPrice: true` (el producto no tiene precio default) SHALL renderizarse deshabilitada, sin permitir su selección, con un texto indicando la causa ("Requiere precio default"). Al confirmar una dosificación seleccionada, el diálogo SHALL invocar `onConfirm` con `dosificationId` en vez de `productPriceId` (mutuamente excluyentes, igual que en el body de creación de venta). Un producto sin dosificaciones activas SHALL mostrar el diálogo idéntico al comportamiento actual (solo precios), sin regresión visual ni de flujo.

Este diálogo se reutiliza en el flujo de edición de venta completada (`app/(private)/sales/_blocks/EditSalePage.tsx`, ver `pos-api` "Edit completed sale") — al agregar un producto al carrito durante una edición, el diálogo SHALL igualmente listar dosificaciones activas junto a los precios, permitiendo reemplazar cualquier línea existente por una línea de dosificación o viceversa.

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
