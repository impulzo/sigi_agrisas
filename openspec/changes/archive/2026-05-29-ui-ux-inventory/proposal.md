## Why

El backend de Productos e Inventario (`inventory-backend`) está implementado y funcional, pero el panel carece de pantallas para gestionarlos desde el navegador. Los administradores y operadores no pueden crear ni editar productos, gestionar precios/dosificaciones, ni consultar o ajustar stock por sucursal sin acceder directamente a la base de datos.

## What Changes

- Nueva ruta privada `/catalogs/products` — pantalla CRUD de productos con búsqueda server-side, filtro por departamento, paginación, toggle de inactivos y modal create/edit unificado (consistente con los otros 5 catálogos).
- Nueva ruta de detalle `/catalogs/products/[id]` — vista con tabs (General / Precios / Dosificaciones) para gestionar el agregado completo del producto: precios múltiples con default y dosificaciones con precio unitario calculado.
- Nueva ruta privada `/inventory` — pantalla de gestión de inventario por sucursal: selector de sucursal, tabla de stock con filtro `belowReorder`, modal de ajuste de stock (delta), modal de edición (set absoluto) y modal de asignación de producto.
- NavigationRail actualizado: item `products` añadido al flyout de `catalogs` (`products:read`, `/catalogs/products`); item `inventory` del rail primario re-etiquetado a "Inventario" y conectado a `/inventory` implementado (`inventory:read`).
- Hub de catálogos (`/catalogs`) actualizado: sexta tarjeta "Productos" con icono `inventory_2`, gateada por `products:read`.
- Nuevos `_logic/` por feature (`products`, `inventory`) siguiendo el patrón providers-ui/users-ui: `types/`, `services/`, `schemas/`, `hooks/`, `errors.ts`.
- Bloques de tabla de precios y tabla de dosificaciones con sus modales (solo dentro de products).
- Bloques `InventoryAssignModal`, `StockAdjustModal` e `InventoryEditModal` para la pantalla de inventario.

## Capabilities

### New Capabilities

- `products-ui`: Pantallas `/catalogs/products` y `/catalogs/products/[id]` — listado paginado con búsqueda server-side y filtro por departamento, creación/edición/soft delete de productos, y gestión de precios (con default único) y dosificaciones (con precio unitario calculado) mediante tabs en el detalle.
- `inventory-ui`: Pantalla `/inventory` — gestión de stock por sucursal con selector de sucursal, tabla paginada con alerta de punto de reorden, ajuste de stock (delta atómico), edición absoluta y asignación/desasignación de producto a sucursal.

### Modified Capabilities

- `panel-shell`: Agregar item `products` al flyout del rail (`catalogs > products` → `/catalogs/products`) y conectar el item `inventory` del rail primario (re-etiquetado a "Inventario", gateado por `inventory:read`) a la ruta implementada `/inventory`.
- `catalogs-ui`: Añadir la tarjeta "Productos" al hub `/catalogs` (sexta tarjeta, `products:read`, icono `inventory_2`).

## Impact

- **Rutas nuevas**: `app/(private)/catalogs/products/`, `app/(private)/catalogs/products/[id]/`, `app/(private)/inventory/`
- **Componentes nuevos**: `app/(private)/catalogs/products/_blocks/`, `app/(private)/catalogs/products/_logic/`, `app/(private)/inventory/_blocks/`, `app/(private)/inventory/_logic/`
- **NavigationRail**: `items.ts` (añadir `products` en flyout de `catalogs`, re-etiquetar `inventory`)
- **CatalogsHubPage**: añadir tarjeta "Productos"
- **Sin cambios en backend**: toda la lógica de negocio y APIs ya están implementadas
- **Dependencias**: `authFetch`, `useCurrentUser`, `useDebounce`, componentes existentes (`CatalogShell`, `CatalogToolbar`, `CatalogPagination`, `CatalogStatusBadge`, `CatalogEmpty`, `CatalogError`, `Switch`, `RailFlyout`, `ConfirmDialog`, `Badge`, `Skeleton`)
