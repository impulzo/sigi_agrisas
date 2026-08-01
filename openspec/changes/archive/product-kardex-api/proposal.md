## Why

El módulo de productos actualmente sólo expone CRUD de catálogo. No existe forma de consultar **qué se vendió de un producto** ni cuándo se devolvió, lo que impide a los administradores analizar rotación, detectar anomalías de stock y reconciliar inventario. Los datos ya existen en `sale_items` y `return_items`; sólo falta exponerlos como una vista cronológica unificada (Kardex).

## What Changes

- **Nuevo endpoint** `GET /api/v1/admin/products/:id/kardex` que devuelve un listado paginado y cronológico de movimientos del producto: líneas de venta y líneas de devolución.
- Filtros: `branchId`, `from`, `to` (fechas ISO), `page`, `pageSize`.
- Branch scoping idéntico al resto del panel: sin `branches:access_all`, el operador ve sólo su sucursal.
- Sin cambios de schema: los datos ya existen en `sale_items` y `return_items`.

## Capabilities

### New Capabilities

- `product-kardex-api`: endpoint de Kardex de producto con paginación, filtros y branch scoping.

### Modified Capabilities

- `products-api`: se documenta el nuevo sub-recurso `/kardex` en la spec existente.

## Impact

- **Backend (`src/modules/products/`)**: nuevo use case `GetProductKardexUseCase`, nuevo puerto `ProductKardexRepository`, implementación `PrismaProductKardexRepository` con query `$queryRaw` UNION SQL, método `getKardex` en `ProductsController`, route handler `app/api/v1/admin/products/[id]/kardex/route.ts`.
- **Permisos**: reutiliza `products:read` existente. Sin cambios RBAC.
- **Migración**: ninguna. Sin cambios de schema.
- **Frontend**: no incluido en este change (ver `product-kardex-ui`).
- **Tests**: unit tests con `InMemoryProductKardexRepository`; integration tests opcionales.
