## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Encargado de catálogo (`products:write`) | Como encargado de catálogo, quiero capturar el precio de adquisición de un producto para conocer el margen real frente al precio de venta | - Puede editar "Precio de adquisición" en la pestaña General del producto (`ProductGeneralTab`)<br>- Campo numérico opcional, `>= 0`, mismo patrón de validación que `ivaRate`/`iepsRate`<br>- Al completar una compra con líneas de ese producto, el precio de adquisición se actualiza automáticamente con el `unitCost` de la línea (última compra completada gana)<br>- Cancelar una compra NO revierte el precio de adquisición ya actualizado (comportamiento intencional, documentado) | - Sólo usuarios con `products:write` editan el campo manualmente vía `PATCH /products/:id`<br>- La actualización automática desde compras ocurre dentro de la misma transacción de `createCompleted`, sin exponerse como campo editable en el flujo de compras |
| 2 | Encargado de inventario (`reports:inventory_read`) | Como encargado de inventario, quiero ver el costo de adquisición junto a las listas de precio en el reporte de inventario por departamento, con las columnas de precio en el orden público→10→15→4 | - El reporte "Inventario por Departamento" (web, PDF, Excel) agrega columna "Costo adq." después de "Stock"<br>- Las columnas de precio se ordenan: el/los precio(s) con `isDefault=true` primero, luego el resto por `localeCompare("es-MX")` — reproduce público, 10, 15, 4<br>- Producto sin costo de adquisición capturado muestra "—"<br>- El orden de columnas es idéntico en las 3 salidas (web, PDF, Excel) | - Sólo visible con `reports:inventory_read`<br>- El costo de adquisición NO se expone en el listado operativo `/inventory` (fuera de alcance de este change) |

Nota: se dividió en dos historias porque el rol y el momento de uso son distintos — captura del dato (catálogo, `products:write`) vs. consumo del dato (reporte, `reports:inventory_read`) — y cada una es probable de forma independiente.

## Why

Hoy el costo de adquisición de un producto no existe como atributo de catálogo: sólo vive de forma efímera en `PurchaseItem.unitCost` (una línea de compra) y en `InventoryMovement.unitCost` (un movimiento puntual), ninguno de los dos consultable desde el reporte de inventario. Encargados de inventario no tienen forma de comparar costo vs. precio de venta sin cruzar manualmente el historial de compras. Además, el reporte "Inventario por Departamento" ordena las columnas de nivel de precio alfabéticamente (`priceColumnNames`), lo que manda "Precio público" al final del listado cuando el negocio siempre lo espera primero — el mismo criterio que ya aplica `sortProductPricesForDisplay` en el catálogo de productos y el POS, pero que el módulo de reportes no reutiliza.

## What Changes

- Se agrega `Product.acquisitionPrice` (Decimal nullable) editable manualmente en el catálogo de productos (pestaña General).
- Al completar una compra (`PrismaPurchaseRepository.createCompleted`), cada línea escribe su `unitCost` como el nuevo `acquisitionPrice` del producto, dentro de la misma transacción. Cancelar una compra no revierte este valor.
- El reporte "Inventario por Departamento" (JSON, PDF, Excel) agrega el costo de adquisición como columna nueva por producto.
- `priceColumnNames` (backend en `src/modules/reports/domain/services/` y su copia local en `InventoryPriceStockTable.tsx`) cambia su criterio de orden: precio(s) `isDefault` primero, luego alfabético `es-MX` — en vez de puramente alfabético.
- El precio se formatea como moneda MXN en PDF y Excel del reporte (hoy se imprime el string `Decimal(14,4)` crudo).

## Capabilities

### New Capabilities

(ninguna — este change extiende capabilities existentes)

### Modified Capabilities

- `products-api`: `Create product` / `Update product` aceptan y devuelven `acquisitionPrice`.
- `purchases-api`: `Registro de una compra a un proveedor` gana el efecto secundario de actualizar `acquisitionPrice` del producto por línea.
- `reports-api`: `Department price list report JSON DTO` gana el campo `acquisitionPrice` por producto; `Department price list report PDF and Excel artifacts` gana la columna "Costo adq." y cambia el criterio de orden de las columnas de precio (default primero).
- `products-ui`: `Product create/edit modal` gana el campo "Precio de adquisición" en la pestaña General.
- `reports-ui`: `Inventory by department view` gana la columna "Costo adq." y el nuevo orden de columnas de precio.

## Impact

- **Prisma**: migración `add_acquisition_price_to_products` (`products.acquisition_price`).
- **Backend**: `src/modules/products/{domain,application,infrastructure}/*`, `src/modules/purchases/infrastructure/repositories/PrismaPurchaseRepository.ts`, `src/modules/reports/{application,domain,infrastructure}/*` (DTO, use case, PDF, XLSX).
- **Frontend**: `app/(private)/catalogs/products/_blocks/{ProductGeneralTab,ProductEditModal}.tsx`, `app/(private)/catalogs/products/_logic/{schemas,types}/*`, `app/(private)/reports/_blocks/InventoryPriceStockTable.tsx`, `app/(private)/reports/inventory/_logic/types/api.ts`.
- **Sin impacto** en `/inventory` (listado operativo) ni en POS/cotizaciones — sólo el reporte de inventario por departamento muestra el nuevo dato.
