## Context

`ProductPrice` hoy es global: `@@unique([productId, name])` y el índice parcial `product_default_price_idx ON product_prices(product_id) WHERE is_default` garantizan un solo default por producto, sin noción de sucursal. Ver `proposal.md` — Why para la motivación (~35 productos con precio real divergente por tienda, detectados al migrar `INVENTARIOS TIENDAS.xlsx`).

Consumidores actuales de `ProductPrice` que este diseño debe tocar sin romper:
- `PrismaProductPriceRepository` / `InMemoryProductPriceRepository` (CRUD de catálogo).
- `PrismaPosLookupService.getProductPrice` / `getDosificationForSale` (resolución en venta/cotización).
- `CreateSaleUseCase`, `EditCompletedSaleUseCase` (vía "re-run the validation... flow from Create sale", según `pos-api` spec), `CreateQuoteUseCase`, `UpdateQuoteUseCase` (vía "same rules as creation").
- `PrismaDepartmentPriceListRepository.findRows` (reporte, `filters.branchId` ya existe en la interfaz pero hoy sólo se usa para agregar stock, no para resolver precios).
- `prisma/seeds/lib/inventorySeedLogic.ts` (seeder v2, upsert por `productId_name`).

## Goals / Non-Goals

**Goals:**
- Representar precio base + overrides por sucursal en `ProductPrice` sin duplicar filas de más (un override sólo existe cuando el precio realmente diverge).
- Que POS/Cotizaciones jamás cobren el precio de una sucursal distinta a la de la operación, incluso si el cliente envía un `productPriceId` arbitrario.
- Mantener retrocompatibilidad total con los datos actuales: toda fila existente de `product_prices` sigue siendo un precio base válido sin migración de datos.
- Dejar el seeder v2 (`inventorySeedLogic.ts`) funcionando con la nueva forma de unicidad, porque el change dependiente `seed-tiendas-inventory-v3` lo extiende inmediatamente después.

**Non-Goals:**
- No se resuelve branch-scoping de `products:read`/`products:write` en general (fuera de la creación de overrides) — sigue siendo un permiso global, tal como hoy. Ver la asunción documentada en la historia 3 del proposal.
- No se migran datos históricos de `SaleItem`/`QuoteItem` — los snapshots ya persistidos no cambian de forma ni de significado.
- No se construye un editor masivo de overrides (bulk edit por Excel) — el seeder del change dependiente cubre la carga inicial; la UI de este change es de un producto a la vez.

## Decisions

### 1. `branchId` nullable en la misma tabla, no una tabla separada

Alternativa considerada: tabla `product_price_overrides` separada, con `ProductPrice` intacta como "sólo precios base". Se descarta porque duplicaría toda la lógica de unicidad-de-nombre y de-default (dos repositorios, dos DTOs, dos flujos de validación en POS) para un concepto que es el mismo objeto de negocio con un campo de ámbito distinto. Un solo modelo con `branchId: String?` deja que "resolver el precio efectivo" sea una sola query con `OR branchId = X OR branchId IS NULL`, y que la UI reuse el mismo `ProductPriceModal` sólo agregando un selector.

Responde a la historia 1 del proposal (un solo flujo CRUD para base y override) y a la historia 2 (una sola tabla que resolver en el hot path del POS).

### 2. Reemplazo de la clave compuesta `productId_name` — el punto de mayor riesgo

Hoy `@@unique([productId, name])` genera en Prisma Client la clave compuesta `productId_name`, usada por:
- `PrismaProductPriceRepository` — no la usa directamente (usa `create`/`update` por `id`), así que no se ve afectado.
- `prisma/seeds/lib/inventorySeedLogic.ts:147-166` — SÍ la usa: `productPrice.findUnique({ where: { productId_name: { productId, name } } })` y el `upsert` correspondiente.

Con `branchId` nullable, Postgres trata cada `NULL` como distinto para efectos de un índice único normal — un `@@unique([productId, branchId, name])` declarado tal cual en Prisma NO impediría dos filas base (`branchId: null`) con el mismo `name`, porque `(P, NULL, 'Precio Publico')` no colisiona consigo mismo en Postgres. Se necesitan índices únicos **parciales** (`WHERE branch_id IS NULL` / `WHERE branch_id IS NOT NULL`), que Prisma no puede declarar de forma nativa en el schema — se crean con SQL crudo en la migración.

Decisión: **declarar igual el índice compuesto en Prisma como `@@unique([productId, branchId, name])` (nombrado `product_price_scope_name_key`) para que Prisma Client siga generando una clave compuesta tipada** (`productId_branchId_name`), pero además crear en la misma migración los dos índices únicos parciales reales que enforzan la regla de negocio correcta. El índice de Prisma queda como una restricción más laxa que nunca se viola en la práctica (branchId+name sí es único por fila), mientras los parciales son los que de verdad garantizan "un base por nombre" y "un override por (sucursal, nombre)". Esto evita reescribir `inventorySeedLogic.ts` a mano con `findFirst`+`create`/`update` (más código, más superficie de bug) a cambio de una migración con un índice Prisma "cosmético" adicional — trade-off aceptado explícitamente aquí.

`productPrice.findUnique({ where: { productId_branchId_name: { productId, branchId, name } } })` — Prisma acepta `null` en un campo de clave compuesta para `findUnique` sin problema (a diferencia de restricciones únicas parciales que Prisma no modela). `inventorySeedLogic.ts` pasa a incluir `branchId: row.branchId ?? null` en esa clave; su firma de `InventoryRow`/`PrismaLike` se actualiza en el change dependiente (`seed-tiendas-inventory-v3`), pero el contrato de `PrismaLike.productPrice` en este repo se define aquí porque es el que cambia de forma.

`product_default_price_idx` sigue el mismo patrón: se reemplaza por `product_default_price_global_idx ON product_prices(product_id) WHERE is_default AND branch_id IS NULL` y `product_default_price_branch_idx ON product_prices(product_id, branch_id) WHERE is_default AND branch_id IS NOT NULL`. Éstos no tienen equivalente Prisma-nativo (Prisma no soporta índices parciales) — se quedan como SQL puro en la migración, sin contraparte en `schema.prisma` más allá de documentarlos en un comentario junto al modelo.

### 3. Resolución "efectiva" en application layer, no en SQL

`findEffectiveForBranch(productId, branchId)` trae con una sola query `WHERE productId = ? AND (branchId = ? OR branchId IS NULL)`, y resuelve en memoria (TypeScript) cuál gana por `name`: si existe fila con `branchId = ?` para ese `name`, gana; si no, gana la de `branchId IS NULL`. Se descarta hacerlo con `DISTINCT ON` en SQL crudo porque el volumen por producto es mínimo (máx. ~4-6 precios) y mantener la regla de precedencia en TypeScript la deja testeable con `InMemoryProductPriceRepository` sin duplicar SQL en dos backends (Prisma real + In-Memory de tests).

### 4. Error de dominio nuevo, mensaje sin fuga de datos

`ProductPriceNotAvailableForBranchError` es un error de dominio nuevo (no una variante de `ProductPriceMismatchError`, que ya significa "el priceId no pertenece a ESTE producto") porque la causa raíz es distinta: el precio SÍ pertenece al producto correcto, pero a la sucursal incorrecta. Mapea a HTTP 400, igual que `ProductPriceMismatchError`. Por la historia 2 del proposal ("el mensaje no debe filtrar el precio de la otra sucursal"), el mensaje de error es genérico (`"Product price does not belong to this branch"`) — no incluye el valor del precio ni el nombre/id de la sucursal a la que sí pertenece.

### 5. `PosLookupService.getProductPrice` gana `branchId`, la validación vive en el use case

`PrismaPosLookupService.getProductPrice` sólo agrega `branchId` al `select` existente — no cambia su firma. La comparación `price.branchId === null || price.branchId === sale.branchId` se hace en `CreateSaleUseCase`/`CreateQuoteUseCase` (ya conocen el `branchId` de la operación), no en el lookup service, manteniendo el mismo patrón que ya usan para `ProductPriceMismatchError` (`productPrice.productId === item.productId` también se valida en el use case, no en el repo).

### 6. Reporte de lista de precios: resolución en el repositorio, no en el use case

A diferencia del punto 3, `PrismaDepartmentPriceListRepository.findRows` sí resuelve en SQL/Prisma (vía `include: { prices: { where: { OR: [{ branchId: null }, { branchId: filters.branchId }] } } }` + un post-proceso de precedencia idéntico al del punto 3, extraído a una función compartida `resolveEffectivePrices(rows, branchId)` en `src/modules/products/domain/services/` para no duplicar la regla de precedencia entre el módulo `products` y `reports`). El reporte ya trae TODOS los productos de un departamento en una sola query — resolver ahí evita N+1 desde el use case.

## Risks / Trade-offs

- **[Riesgo] Migración con índices parciales fuera del control declarativo de Prisma** → mitigación: el índice Prisma-nativo (`@@unique([productId, branchId, name])`) queda como red de seguridad para el tipo generado, y los parciales reales se documentan con un comentario `// enforced by partial indexes, see migration <ts>` justo sobre el modelo `ProductPrice`. Cualquier `prisma migrate dev` posterior que intente "reconciliar" el schema no debe tocar los índices parciales — se verifica corriendo `prisma migrate diff` contra la DB tras aplicar, como parte de la fase de verificación.
- **[Riesgo] Un admin sin `branches:access_all` podría, en teoría, crear un precio BASE (branchId null) que afecta todas las sucursales sin restricción** → esto es una continuación exacta del comportamiento actual (`products:write` no está branch-scoped hoy), documentado como asunción explícita en la historia 3 y no una regresión introducida por este change. Si se decide cerrar ese hueco, es un change de alcance distinto (branch-scope todo el módulo `products`).
- **[Riesgo] `getDosificationForSale` ahora hace una query adicional (resolver default por sucursal antes de caer al global) en el hot path de venta** → el volumen es 1 query extra por línea de dosificación en el carrito (no por request), aceptable dado que ya se hacen N queries por línea en el flujo actual; no se re-diseña el batching de queries del use case en este change.
- **[Trade-off] La UI de "Precios" no permite editar una fila heredada directamente — obliga a "Crear override aquí"** → decisión deliberada: editar una fila heredada "in place" sería ambiguo (¿edita el base para todas las sucursales, o crea un override silencioso?). Forzar la acción explícita evita ese ambiguo.

## Migration Plan

1. `npx prisma migrate dev --name add_branch_scoped_product_prices` — agrega columna `branch_id`, índice simple, DROP del unique/parcial viejos, CREATE de los 4 índices nuevos (2 unique-name parciales + 2 default parciales) + el `@@unique` compuesto Prisma-nativo. Sin backfill: todo `branch_id` queda `NULL` (comportamiento idéntico al actual).
2. `npx prisma generate`.
3. Backend: repos → use cases → controller, en ese orden (cada capa depende de la anterior).
4. Frontend: tab Precios.
5. Rollback: si la migración falla a mitad, es reversible sin pérdida de datos (`branch_id` es aditivo, ningún `DROP COLUMN` sobre datos existentes) — `prisma migrate resolve --rolled-back` + revertir el archivo de migración es seguro en cualquier punto antes de que el change dependiente siembre overrides reales.
