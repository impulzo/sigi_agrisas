## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador del sistema (deploy) | Como administrador del sistema, quiero activar el modo de inventario por sucursal mediante la variable de entorno `INVENTORY_SCOPE_MODE=branch` (default `general`), para adoptar la exclusividad de catálogo sin migración de datos ni riesgo de romper instalaciones existentes | Permite habilitar la funcionalidad de forma reversible y por cliente, sin tocar el schema ni forzar a todos los despliegues | - Sin la variable definida, o con cualquier valor distinto de `branch`, el sistema opera exactamente como hoy (catálogo global)<br>- Con `INVENTORY_SCOPE_MODE=branch`, el filtrado por sucursal se activa en todos los puntos de consumo (POS, cotizaciones, caché offline, validación de venta)<br>- Cambiar la variable y reiniciar revierte el comportamiento sin pérdida de datos ni migración inversa | - La variable se lee sólo en capa `infrastructure` (repos, DI containers, controllers); dominio y use cases la reciben inyectada, nunca leen `process.env` directamente<br>- No se expone como `NEXT_PUBLIC_*`; es config de servidor, no debe llegar al bundle de cliente |
| 2 | Operador de POS / Cotizaciones | Como operador de POS, quiero que el buscador de productos muestre sólo los productos asignados a mi sucursal cuando el modo por-sucursal está activo, para no ofrecer ni confundir productos que mi tienda no maneja | Evita errores de venta y confusión de catálogo entre sucursales con surtido distinto | - Modo `branch`: la búsqueda/listado de productos en POS y Cotizaciones sólo devuelve productos con fila en `branch_inventory` de la sucursal activa (incluida la fila con `quantity = 0`)<br>- Modo `general`: comportamiento actual sin cambios, catálogo completo<br>- La paginación y el total (`count`) reflejan el filtro — no sólo el `include` de stock<br>- La caché offline del POS descarga únicamente el catálogo de la sucursal del dispositivo | - El filtro por sucursal en modo `branch` se resuelve server-side vía `resolveScopedBranchId` (mismo patrón de branch scoping ya usado en el resto del sistema) — el cliente no puede pedir el catálogo de otra sucursal sin el permiso `branches:access_all`<br>- Un administrador con `branches:access_all` y sin `branchId` explícito sigue viendo el catálogo completo (comportamiento de auditoría/soporte preservado) |
| 3 | Operador de POS / Cotizaciones | Como operador de POS, quiero que intentar vender o cotizar un producto no asignado a mi sucursal falle con un error explícito y accionable, para no completar operaciones sobre productos que la sucursal no maneja | Evita ventas inconsistentes con el surtido real de la tienda y guía al operador hacia la vía correcta (asignación, compra o traspaso) | - Modo `branch`: crear una venta o cotización con un `productId` sin fila en `branch_inventory` de esa sucursal → error explícito (400), distinto del error genérico de "producto inactivo"<br>- El mismo gate aplica a edición de venta completada y a conversión/edición de cotización<br>- Modo `general`: sin cambio, la venta se completa igual que hoy<br>- Cancelar una venta o devolución cuya fila de inventario ya no existe sigue funcionando (la restauración de stock no queda bloqueada por este gate) | - Validación aplicada en el use case (capa aplicación), no sólo en la UI — un llamado directo a la API sin pasar por el formulario también debe ser rechazado<br>- El mensaje de error no debe filtrar información de otras sucursales (ej. no revelar en qué otra sucursal sí está disponible el producto, ni su stock ahí) |
| 4 | Administrador de Inventario | Como administrador de Inventario, quiero asignar manualmente un producto existente del catálogo a una sucursal (con cantidad inicial, incluido cero), para habilitar productos exclusivos antes de que exista una compra o traspaso que los introduzca | Da una vía administrativa directa para curar el surtido de cada sucursal sin depender de un movimiento de stock real | - El modal/flujo de asignación en Inventario admin sigue mostrando el catálogo completo (no filtrado), para poder elegir cualquier producto a asignar<br>- Asignar un producto ya asignado a esa sucursal no duplica la fila (misma unicidad `(branch_id, product_id)` ya existente)<br>- La asignación queda visible de inmediato en el catálogo filtrado del POS de esa sucursal | - Requiere el permiso `inventory:write` sobre la sucursal destino (branch scoping ya vigente en `BranchInventoryController`)<br>- Compras y traspasos (vías ya existentes) conservan su comportamiento actual de alta automática — no se les aplica este gate |

Nota de alcance: las historias 2, 3 y 4 son independientes entre sí pero comparten el flag de la historia 1 como interruptor común. No se generó historia para compras/traspasos: siguen siendo vías legítimas de alta automática, sin cambio de comportamiento.

## Why

Hoy el catálogo de `Product` es global: cualquier sucursal ve y puede vender cualquier producto, y `PrismaProductRepository.findAll` deja `branchId` fuera del `where` — sólo lo usa para el `include` de stock. El cliente opera varias tiendas con surtidos distintos (algunos productos son comunes, otros exclusivos de una tienda), y necesita que el catálogo del POS refleje eso: vender un producto que la sucursal no maneja hoy es posible y no debería serlo.

El resto del sistema ya modela "por sucursal" (stock en `branch_inventory`, precios con `ProductPrice.branchId`, traspasos vía `waybills`); falta cerrar el único eslabón que sigue siendo global — la visibilidad del catálogo — sin tocar ninguna de esas piezas ya correctas, y sin forzar el cambio en instalaciones que hoy dependen del catálogo compartido.

## What Changes

- Nuevo flag de configuración `INVENTORY_SCOPE_MODE` (`general` | `branch`, default `general`) leído sólo en capa infraestructura.
- `ProductRepository.findAll` (Prisma + InMemory) acepta `branchScoped?: boolean`; en modo `branch`, filtra el `where` (y por tanto el `count`) a productos con fila en `branch_inventory` de la sucursal — no sólo el `include` de stock que hace hoy.
- `ProductsController.list` resuelve `branchId` vía `resolveScopedBranchId` y activa `branchScoped: true` cuando el modo es `branch`; en modo `general` el comportamiento actual queda intacto.
- Nuevo error de aplicación `ProductNotAvailableInBranchError` (HTTP 400) en `CreateSaleUseCase`, `EditCompletedSaleUseCase`, `CreateQuoteUseCase` y `UpdateQuoteUseCase`: rechaza operar sobre un producto sin fila de `branch_inventory` en la sucursal activa, sólo cuando el modo está en `branch`.
- Nuevo método de puerto `isProductAvailableInBranch` en `PosLookups` (y su equivalente en el lookup de cotizaciones), implementado contra `branch_inventory`.
- `recordInventoryMovement` acepta `allowRowCreation?: boolean` (default `true`); en modo `branch`, los movimientos OUT originados por venta (`sale`, `sale_edit_apply`) lo pasan en `false` — impide que una venta materialice por accidente una fila de inventario. Los movimientos de restauración (`sale_cancel`, `sale_edit_restore`, `return`) conservan `true` siempre, para no bloquear cancelaciones.
- Compras, traspasos y ajustes/asignación admin quedan sin cambios: siguen siendo las vías legítimas de alta de un producto en una sucursal.
- UI: endpoint `GET /api/v1/admin/settings/inventory-scope`, hook de consumo con caché 60s, y badges informativos en `/inventory` y `/catalogs/products` cuando el modo `branch` está activo. Mapeo del nuevo error a mensaje accionable en el POS.

## Capabilities

### New Capabilities

_Ninguna — el flag de modo se documenta como requisito nuevo dentro de `inventory-api`, que ya gobierna la semántica de `branch_inventory`._

### Modified Capabilities

- `inventory-api`: nuevo requisito — modo de alcance configurable (`general`/`branch`); la fila de `branch_inventory` pasa a tener doble semántica (cantidad **y** asignación/disponibilidad del producto a la sucursal); `allowRowCreation` en movimientos de venta.
- `products-api`: `GET /admin/products` filtra el catálogo por sucursal (no sólo el stock) cuando el modo está activo; el `total`/paginación reflejan el filtro.
- `pos-api`: nuevo error `ProductNotAvailableInBranchError` (400) en creación/edición de venta cuando el producto no está asignado a la sucursal.
- `quotes-api`: mismo gate de disponibilidad en creación/actualización de cotización.
- `inventory-ui`: badge de modo activo en `/inventory`.
- `products-ui`: nota informativa en `/catalogs/products` sobre asignación por sucursal cuando el modo está activo.
- `data-seeding`: nota de cobertura — el seeder v3 ya asigna productos por tienda vía `upsertInventory`, documentar como precondición para activar el modo `branch` sin dejar productos huérfanos.

## Impact

**Backend (`src/`)**
- `src/shared/infrastructure/config/inventoryScope.ts` (nuevo)
- `src/modules/products/application/ports/ProductRepository.ts`, `infrastructure/repositories/PrismaProductRepository.ts`, `infrastructure/repositories/InMemoryProductRepository.ts`, `infrastructure/http/ProductsController.ts`, `application/use-cases/ListProductsUseCase.ts`
- `src/modules/pos/domain/errors/ProductNotAvailableInBranchError.ts` (nuevo), `application/ports/PosLookups.ts`, `application/use-cases/CreateSaleUseCase.ts`, `application/use-cases/EditCompletedSaleUseCase.ts`, `infrastructure/services/PrismaPosLookupService.ts`, `infrastructure/di/container.ts`
- `src/modules/quotes/application/use-cases/CreateQuoteUseCase.ts`, `UpdateQuoteUseCase.ts` + su lookup service equivalente
- `src/shared/infrastructure/inventory/recordInventoryMovement.ts`, `src/modules/pos/infrastructure/repositories/PrismaSaleRepository.ts`
- Nuevo endpoint `app/api/v1/admin/settings/inventory-scope/route.ts`

**Frontend (`app/`)**
- `app/_hooks/useInventoryScopeMode.ts` (nuevo)
- `app/(private)/inventory/_blocks/InventoryPage.tsx`
- `app/(private)/catalogs/products/` (nota informativa)
- `app/(private)/pos/` (mapeo de error nuevo a mensaje de usuario)

**Config**
- `.env.example` — documentar `INVENTORY_SCOPE_MODE`

**Tests**
- `tests/unit/modules/products/**`, `tests/unit/modules/pos/**`, `tests/unit/modules/quotes/**`, `tests/unit/shared/inventory/recordInventoryMovement.test.ts` (nuevo), `tests/integration/modules/inventory/inventory-branch-scoping.test.ts`

**Fuera de alcance de este change** — se deja como change separado futuro: los traspasos (`waybills`) no escriben `inventory_movements` (kardex ciego a traspasos) y las uniones de tipos de movimiento entre `src/modules/inventory/domain/entities/InventoryMovement.ts` y `recordInventoryMovement.ts` están desincronizadas. No afecta a este change porque ninguna de las dos rutas toca esos archivos.
