## Why

Con el backend del Kardex (`product-kardex-api`) expuesto, los administradores aún no tienen interfaz para consultarlo. El detalle de producto (`/catalogs/products/[id]`) ya tiene un patrón de tabs (General / Precios / Dosificaciones); agregar una 4ta tab "Kardex" es la extensión natural sin romper la UX existente.

## What Changes

- **Nueva tab "Kardex"** en `ProductDetailPage` (4to tab, al final): tabla paginada de movimientos del producto ordenados por fecha DESC.
- **Filtros laterales**: `branchId` (dropdown de sucursales, sólo visible con `branches:access_all`), rango de fechas `from`/`to`.
- **Columnas de la tabla**: Tipo (badge venta/devolución), Fecha, Folio (ventas) / — (devoluciones), Sucursal, Cantidad, Precio unit., Total, Estado.
- **Badges de tipo**: "Venta" (`bg-primary-container`) / "Devolución" (`bg-error-container`) para distinción visual inmediata.
- **Links**: la celda de Folio enlaza a `/sales/[saleId]`; la columna "Devolución" (type=return) enlaza a `/returns/[returnId]`.
- Paginación con `CatalogPagination` reutilizado.
- Sin cambios de schema ni backend.

## Capabilities

### New Capabilities

- `product-kardex-ui`: tab Kardex en el detalle de producto con tabla paginada, filtros y badges.

### Modified Capabilities

- `products-ui`: añade la tab Kardex a `ProductDetailPage`.

## Impact

- **Frontend (`app/(private)/catalogs/products/_blocks/`)**: añadir `ProductKardexTab.tsx`, extender `ProductDetailPage.tsx` con 4to tab.
- **`_logic/` del módulo products**: añadir `hooks/useProductKardex.ts`, `services/getProductKardex.ts`, `types/kardex.ts`.
- **Bloques reutilizados**: `CatalogPagination`, `CatalogEmpty`, `CatalogError`, `CatalogStatusBadge` (para estado de venta/devolución).
- **Backend**: ninguno (depende de change `product-kardex-api` implementado).
- **Tests**: unit test de `useProductKardex` con `fetchImpl` mock; unit test de `ProductKardexTab` con RTL.
- **Dependencias externas**: ninguna nueva.
