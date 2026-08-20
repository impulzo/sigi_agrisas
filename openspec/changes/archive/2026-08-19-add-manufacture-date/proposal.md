## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario con `products:write` | Como usuario con `products:write`, quiero capturar y editar la fecha de elaboración de un producto en el modal de creación/edición y en el tab General del detalle, para dejar registrada la fecha de fabricación del producto como dato de referencia del catálogo | Trazabilidad de origen/fabricación del producto, útil para control de calidad y auditoría, sin forzar el dato en productos donde no aplica | - Campo opcional: crear/editar producto sin fecha de elaboración funciona igual que hoy (no rompe flujo actual)<br>- Al crear con fecha, se persiste y se refleja en la respuesta del producto<br>- Al editar, cambiar la fecha se refleja en el diff enviado (PATCH) y persiste<br>- Limpiar la fecha (dejarla vacía) la resetea a `null`<br>- Formato inválido de fecha es rechazado por validación (400), no llega a persistir basura | - Requiere permiso `products:write` para crear/editar (ya existe, sin cambio de superficie de permisos)<br>- Validación Zod del formato de fecha en el controller antes de llegar al use case<br>- Campo no afecta cálculos fiscales/precios existentes (iva/ieps/dosificaciones) — aislado |
| 2 | Usuario con `purchases:create` | Como usuario que registra una compra, quiero capturar opcionalmente la fecha de elaboración por línea al declarar lote y caducidad, para que el lote creado en `inventory_lots` conserve también el dato de fabricación como metadata de trazabilidad | Trazabilidad completa del lote (fabricación + caducidad), sin agregar fricción a compras que no gestionan lotes | - Línea de compra sin lote/caducidad/elaboración se comporta igual que hoy (no crea registro en `inventory_lots`)<br>- Línea con lote+caducidad completos crea el registro en `inventory_lots`; si además viene `manufactureDate`, se persiste en ese mismo registro<br>- `manufactureDate` es independiente: puede venir solo (sin lote/caducidad) sin disparar error de validación — en ese caso no se crea lote (mismo comportamiento actual del par incompleto), el dato de elaboración no se persiste en esa línea<br>- Cancelar la compra elimina el/los registro(s) de `inventory_lots` igual que hoy, incluyendo el dato de elaboración que llevaban | - Requiere permiso de creación de compras ya existente (sin nueva superficie RBAC)<br>- Validación Zod de fecha en el controller antes del use case<br>- Inserción de `manufactureDate` ocurre dentro de la misma transacción que crea la compra e inserta `inventory_lots` (atomicidad ya garantizada por el flujo existente, sin nuevo punto de fallo parcial) |

Nota: ambas historias son independientes entre sí (tocan módulos distintos: `products` vs `purchases`/`inventory-lots`) y cada una está trazada a un bloque de "What Changes" abajo.

## Why

Hoy ni el catálogo de productos ni los lotes de inventario (`inventory_lots`) registran cuándo fue elaborado/fabricado un producto — sólo se captura `expirationDate` (caducidad) por lote, y el producto no tiene ninguna fecha de fabricación. Para productos agrícolas con control de calidad y trazabilidad (fertilizantes, agroquímicos, semillas), conocer la fecha de elaboración es tan relevante como la de caducidad, tanto a nivel de catálogo general como por lote específico recibido en una compra. Se agrega `manufactureDate` como campo opcional en ambos, reusando el patrón ya validado de `expirationDate` (captura como texto de fecha, `@db.Date` en Postgres, opcional en Zod), sin acoplarse a reglas de validación nuevas ni a features de lectura/reportería que hoy no existen para este dato.

## What Changes

- **Productos**: se agrega `manufactureDate` (fecha, opcional, nullable) al modelo `Product`. Se captura/edita en `ProductEditModal` (creación y edición) y en `ProductGeneralTab` (detalle). Se expone en `ProductDto` (lectura), `CreateProductRequest`/`UpdateProductRequest` (escritura).
- **Compras / Lotes**: se agrega `manufactureDate` (fecha, opcional, nullable) al modelo `InventoryLot`. Se captura por línea de compra (`purchaseItemSchema`) junto a los campos existentes `lotNumber`/`expirationDate`, pero **sin** atarse al `.refine` de par obligatorio — es un campo independiente que sólo se persiste cuando la línea ya cumple la condición existente para crear un lote (par `lotNumber`+`expirationDate` completo). Se agrega el input correspondiente en `PurchaseLineRow`.
- **Fuera de alcance explícito**: no se modifica ningún DTO de lectura existente que hoy expone `lotNumber`/`expirationDate` (semáforo de vencimiento de inventario, notificaciones de caducidad, kardex, PDFs). `manufactureDate` sólo se captura y persiste, no se muestra en listados/reportes en esta iteración.

## Capabilities

### New Capabilities
(ninguna — este cambio extiende capabilities existentes, no introduce una nueva)

### Modified Capabilities
- `products-api`: se agrega el campo opcional `manufactureDate` a los DTOs de creación/actualización/lectura de producto.
- `products-ui`: el modal de creación/edición y el tab General del detalle de producto capturan y muestran `manufactureDate`.
- `purchases-api`: el schema de línea de compra acepta opcionalmente `manufactureDate`, persistido en `inventory_lots` cuando la línea crea un lote.
- `inventory-lots`: el modelo `InventoryLot` (y su registro de trazabilidad) incorpora el campo opcional `manufactureDate`, sin cambios en el cálculo de `expiryStatus` ni en las reglas de captura del par `lotNumber`+`expirationDate`.

## Impact

- **Prisma schema**: `Product.manufactureDate`, `InventoryLot.manufactureDate` — dos migraciones nuevas (`ALTER TABLE ... ADD COLUMN`).
- **Backend `src/modules/products/`**: domain entity, DTOs, mapper, `PrismaProductRepository`, `ProductsController` (Zod schemas de create/update).
- **Backend `src/modules/purchases/`**: `PurchasesController` (Zod schema de línea), `PurchaseRepository` port, `CreatePurchaseUseCase`, `PrismaPurchaseRepository`, `InMemoryPurchaseRepository`.
- **Frontend `app/(private)/catalogs/products/`**: types, schema, service, `ProductEditModal`, `ProductGeneralTab`.
- **Frontend `app/(private)/purchases/`**: schema, hook de formulario, `PurchaseLineRow`, types.
- Sin cambios en RBAC, sin nuevos endpoints, sin cambios en cálculo de totales, inventario, notificaciones ni reportes.
