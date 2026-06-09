## Why

El panel administra ya catálogos transversales (`payment-methods`, `folios`, `departments`, `branches`, `providers`) pero carece del módulo central que da sentido al sistema operativo: **Productos + Inventario por sucursal**. Sin él no puede arrancar el POS ni la facturación: no hay catálogo de SKUs, ni precios, ni stock por punto de venta.

Adicionalmente, hay una migración brownfield pendiente desde un sistema legacy con las columnas `CLAVE`, `Nombre`, `Unidad`, `Iva`, `Ieps`, `NombreDepartamento` que deben preservarse semánticamente para no perder el catálogo histórico.

El backend de Productos + Inventario debe (a) mantener la arquitectura hexagonal por módulos ya validada (`providers`, `branches`, etc.), (b) cubrir 4 entidades nuevas (`Product`, `ProductPrice`, `ProductDosification`, `BranchInventory`) que están conceptualmente cohesivas pero requieren operaciones CRUD independientes, (c) integrarse con los módulos existentes `departments` (FK requerida) y `branches` (FK requerida para inventario), y (d) exponer la lógica de cálculo de dosificación como dominio puro testeable.

## What Changes

### Migración + esquema

- Nueva migración Prisma `add_products_and_inventory_tables` con 4 tablas:
  - `products` (catálogo de SKUs con campos fiscales SAT)
  - `product_prices` (1:N por producto — múltiples niveles de precio)
  - `product_dosifications` (1:N por producto — venta fraccionada)
  - `branch_inventory` (M:N producto × sucursal con stock por punto)
- FKs: `products.department_id → departments.id` (RESTRICT), `product_prices.product_id → products.id` (CASCADE), `product_dosifications.product_id → products.id` (CASCADE), `branch_inventory.product_id → products.id` (CASCADE), `branch_inventory.branch_id → branches.id` (CASCADE).

### Módulos backend

- Nuevo módulo `src/modules/products/` (hexagonal):
  - **Dominio**: entidades `Product`, `ProductPrice`, `ProductDosification`; errores tipados (`ProductNotFoundError`, `ProductCodeAlreadyInUseError`, `ProductPriceNotFoundError`, `DuplicateDefaultPriceError`, `DosificationNotFoundError`); servicio de dominio `DosificationPriceCalculator` puro.
  - **Aplicación**: puertos `ProductRepository`, `ProductPriceRepository`, `ProductDosificationRepository`; DTOs request/response; use cases CRUD para los 3 sub-recursos.
  - **Infraestructura**: implementaciones Prisma + InMemory para tests; controladores HTTP separados (`ProductsController`, `ProductPricesController`, `ProductDosificationsController`); DI container.
- Nuevo módulo `src/modules/inventory/`:
  - **Dominio**: entidad `BranchInventory`; errores tipados (`BranchInventoryRecordNotFoundError`, `BranchInventoryAlreadyExistsError`, `NegativeStockNotAllowedError`).
  - **Aplicación**: puerto `BranchInventoryRepository`; use cases `ListBranchInventory`, `GetBranchInventoryItem`, `CreateBranchInventoryItem`, `UpdateBranchInventoryItem`, `AdjustStock`, `DeleteBranchInventoryItem`.
  - **Infraestructura**: Prisma + InMemory; `BranchInventoryController`; DI container.

### Route handlers (todos bajo `/api/v1/admin/`)

**Products + sub-recursos** (`products:read` / `products:write`):
- `GET /api/v1/admin/products` (paginado, `?search=`, `?includeInactive=`, `?departmentId=`)
- `GET /api/v1/admin/products/:id`
- `POST /api/v1/admin/products`
- `PATCH /api/v1/admin/products/:id`
- `DELETE /api/v1/admin/products/:id` (soft delete)
- `GET /api/v1/admin/products/:id/prices`
- `POST /api/v1/admin/products/:id/prices`
- `PATCH /api/v1/admin/products/:id/prices/:priceId`
- `DELETE /api/v1/admin/products/:id/prices/:priceId`
- `GET /api/v1/admin/products/:id/dosifications`
- `POST /api/v1/admin/products/:id/dosifications`
- `PATCH /api/v1/admin/products/:id/dosifications/:dosificationId`
- `DELETE /api/v1/admin/products/:id/dosifications/:dosificationId`

**Inventory** (`inventory:read` / `inventory:write`):
- `GET /api/v1/admin/branches/:branchId/inventory` (paginado, `?search=`, `?belowReorder=`)
- `GET /api/v1/admin/branches/:branchId/inventory/:productId`
- `POST /api/v1/admin/branches/:branchId/inventory` (registra producto con stock inicial)
- `PATCH /api/v1/admin/branches/:branchId/inventory/:productId` (set absoluto de `quantity`, `reservedQuantity`, `reorderPoint`)
- `POST /api/v1/admin/branches/:branchId/inventory/:productId/adjust` (delta atómico `{ delta, reason? }`)
- `DELETE /api/v1/admin/branches/:branchId/inventory/:productId` (hard delete del registro)

### RBAC

- Seed actualizado en `prisma/seed.ts`: añadir 4 permisos nuevos (`products:read`, `products:write`, `inventory:read`, `inventory:write`).
- `admin` → los 4 nuevos. `operator` → `products:read` + `inventory:read` + `inventory:write` (operadores pueden ajustar stock en su sucursal). `viewer` → `products:read` + `inventory:read`.

### Cálculo de dosificación

- Servicio de dominio puro `DosificationPriceCalculator.computeUnitPrice({ basePrice, numParts })` que aplica la fórmula `(basePrice / numParts) * 1.07` (recargo fijo del 7%).
- Endpoint de consulta: `GET /api/v1/admin/products/:id/dosifications` devuelve cada dosificación con su `computedUnitPrice` ya calculado (usando el precio por defecto del producto, o `null` si el producto no tiene precio default todavía).

### Brownfield migration

- Script SQL documentado en `prisma/migrations/<timestamp>_add_products_and_inventory_tables/migration.sql` para crear las 4 tablas.
- **Importación legacy (separada del schema)**: documento `docs/legacy-products-import.md` con SQL de mapping `CLAVE → code`, `Nombre → name`, `Unidad → unit`, `Iva → iva_rate / 100`, `Ieps → ieps_rate / 100`, `NombreDepartamento → JOIN departments ON name`. Documentado pero no ejecutado automáticamente (el cliente decide cuándo importar).

### Tests

- Unit tests por use case (in-memory repo) — esperado ~25 archivos.
- Tests del `DosificationPriceCalculator` puro.
- Tests de validación Zod en los 4 controllers.
- Tests de integración contra Supabase Postgres (flujo end-to-end por módulo).

**No-Goals (fuera de scope de este change):**

- UI/frontend (se construirá en `add-products-ui` y `add-inventory-ui` separados).
- Tabla `stock_movements` / auditoría de movimientos de stock (cantidad actual mutable; movimientos se difieren a un change posterior).
- Validación de SAT product codes contra el catálogo oficial del SAT (solo se valida formato).
- Tabla `tax_rates` catalogada (los % de IVA e IEPS se guardan inline en cada producto; un catálogo enumerado se difiere).
- Búsqueda full-text avanzada (solo `?search=` con ILIKE como en proveedores).
- Reglas de descuento/promociones complejas más allá del `discount_pct` por precio.
- Multi-currency (todo en MXN).
- Tracking de costos (`cost_price`) — solo precios de venta en este change.

## Capabilities

### New Capabilities

- `products-api`: REST API admin para gestionar el catálogo de productos con sus múltiples precios y dosificaciones, integrado con `departments` (FK), validación SAT (IVA, IEPS, SAT product code), soft delete, búsqueda server-side, y cálculo determinista de precio por dosis vía servicio de dominio.
- `inventory-api`: REST API admin para gestionar stock por sucursal — `branch_inventory` como tabla M:N entre productos y sucursales, sin stock global. Soporta consulta de stock (con flag `belowReorder` para alertas), creación inicial de registros, actualización absoluta y ajuste atómico por delta.

### Modified Capabilities

- `rbac`: el seed SHALL incluir 4 permisos nuevos (`products:read`, `products:write`, `inventory:read`, `inventory:write`) y asignarlos correctamente a `admin`, `operator` y `viewer`.

## Impact

- **Código nuevo**: 2 módulos hexagonales completos (~70 archivos backend), 9 route handlers, ~40 archivos de tests.
- **Código modificado**: `prisma/schema.prisma` (4 modelos nuevos), `prisma/seed.ts` (4 permisos nuevos + asignaciones), `CLAUDE.md` (nueva sección "Productos e Inventario (Backend)").
- **Migraciones de BD**: una migración nueva (`add_products_and_inventory_tables`).
- **Sin cambios en módulos existentes** (`departments` y `branches` se usan vía FK pero no se modifican).
- **Sin cambios en UI/frontend** en este change.
