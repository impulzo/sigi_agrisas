## Why

Los operadores del panel trabajan de forma intensiva con tablas (catálogos, ventas, cotizaciones, inventario, etc.) y actualmente solo pueden interactuar con ellas mediante el ratón. Agregar navegación por teclado (↑ / ↓ / Enter) reduce la fricción operativa y acelera flujos repetitivos como consultar registros o agregar productos en el POS.

## What Changes

- Todas las tablas de datos del panel aceptarán foco por teclado en sus filas (`tabIndex`, `role="row"`, gestión de foco con ↑ / ↓).
- Presionar **Enter** en una fila accionará la acción principal disponible:
  - **POS — grid de productos**: abre el diálogo de agregar al carrito (`PriceTierPicker` / `onAddProduct`).
  - **Catálogos con modal de edición** (Folios, Formas de pago, Departamentos, Sucursales, Proveedores): abre el modal de editar si el usuario tiene permiso de escritura; si no, no hace nada.
  - **Catálogos con página de detalle** (Productos): navega a `/catalogs/products/[id]`.
  - **Tablas de listado con vista de detalle** (Ventas, Cotizaciones, Devoluciones, Abonos): navega a la página de detalle correspondiente.
  - **Inventario**: abre el modal de ajuste si el usuario tiene `inventory:write`.
  - **Usuarios**: abre el modal de edición si `users:write`.
  - **Tabs de detalle de Producto** (Precios, Dosificaciones): abre el modal de edición de la fila si `products:write`.
- Se crea un hook compartido `useTableKeyboard` en `app/_hooks/` reutilizable por todos los módulos.
- Sin cambios de backend, sin nuevas rutas, sin cambios de esquema de BD.

## Capabilities

### New Capabilities

- `keyboard-navigation`: Define el patrón de navegación por teclado para todas las tablas del panel: hook `useTableKeyboard`, comportamiento de ↑/↓/Enter por tipo de tabla, accesibilidad ARIA mínima.

### Modified Capabilities

_(ninguna — el cambio es puramente de implementación de UI sin alterar requisitos de specs existentes)_

## Impact

- `app/_hooks/useTableKeyboard.ts` — nuevo hook global
- `app/(private)/pos/_blocks/ProductCatalogGrid.tsx` — foco en tarjetas de producto
- `app/(private)/catalogs/*/  _blocks/*Table.tsx` — 6 tablas de catálogos
- `app/(private)/sales/_blocks/SalesTable.tsx`
- `app/(private)/quotes/_blocks/QuotesTable.tsx`
- `app/(private)/returns/_blocks/ReturnsTable.tsx`
- `app/(private)/payments/_blocks/PaymentsTable.tsx`
- `app/(private)/inventory/_blocks/InventoryTable.tsx`
- `app/(private)/users/_blocks/UsersTable.tsx`
- `app/(private)/catalogs/products/_blocks/ProductPricesTab.tsx`
- `app/(private)/catalogs/products/_blocks/ProductDosificationsTab.tsx`
