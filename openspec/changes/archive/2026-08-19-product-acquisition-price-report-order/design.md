## Context

`Product` no tiene ningún atributo de costo hoy; el costo de una compra vive sólo en `PurchaseItem.unitCost` (snapshot por línea, historial) y en `InventoryMovement.unitCost` (movimiento puntual). Ninguno de los dos es consultable como "el costo actual del producto" sin agregación manual. El reporte "Inventario por Departamento" (`GetDepartmentPriceListReportUseCase` + `PrismaDepartmentPriceListRepository`) ya trae `prices[]` ordenados por Prisma (`isDefault desc, name asc`), pero la función `priceColumnNames` que decide las columnas de la tabla descarta ese orden y recalcula un `Set` ordenado puramente alfabético — por eso "Precio público" termina después de "10"/"15"/"4". Existe una copia duplicada de `priceColumnNames` en `InventoryPriceStockTable.tsx` (frontend) que debe cambiar en paralelo para no divergir del backend (PDF/Excel usan la versión backend; la tabla web usa la copia local).

## Goals / Non-Goals

**Goals:**
- Persistir un costo de adquisición editable por producto (historia 1).
- Mantenerlo actualizado automáticamente con cada compra completada, sin intervención manual (historia 1, AC3).
- Mostrarlo en el reporte de inventario por departamento junto a un orden de columnas de precio consistente con el resto del sistema (historia 2).

**Non-Goals:**
- No se toca el listado operativo `/inventory` (historia 2, AC de seguridad: "fuera de alcance").
- No se implementa costo promedio ponderado ni recálculo histórico — es "último costo comprado", decisión ya tomada por el usuario.
- No se revierte el costo al cancelar una compra (comportamiento intencional documentado, no un defecto a corregir en este change).
- No se corrige aquí el mismatch de ruta observado entre `openspec/specs/reports-ui` (`inventory-by-department`) y el código real (`app/(private)/reports/inventory/`) — preexistente, fuera de alcance.

## Decisions

**D1 — Campo nuevo `Product.acquisitionPrice`, no derivado en cada lectura.**
Alternativa descartada: calcular "último costo" con una subquery a `purchase_items` en cada `GET`. Se descarta por costo de query adicional en un reporte que ya hace fan-out por departamento/producto/precio, y porque el usuario ya fijó la decisión (campo persistido). Mantiene el mismo patrón que `ivaRate`/`iepsRate`: `Decimal? @db.Decimal(12,4)`, nullable, editable manualmente y por efecto de compra.

**D2 — La escritura ocurre dentro de la transacción de `createCompleted`, no como evento post-commit.**
Responde al Criterio de Seguridad de historia 1: "corre dentro de la misma transacción... sin exponerse como campo editable desde el flujo de compras". Usar `tx.product.update({ where: { id: item.productId }, data: { acquisitionPrice: item.unitCost } })` por cada línea, en el mismo bloque `$transaction` que ya incrementa `branch_inventory` (`PrismaPurchaseRepository.ts:175-...`). Si dos líneas de la misma compra referencian el mismo producto (caso raro pero no prohibido por el schema), la última línea procesada gana — mismo criterio "último costo gana" ya fijado por el usuario, sin necesidad de deduplicar antes.

**D3 — `cancel()` no revierte `acquisitionPrice`.**
Alternativa descartada: guardar `previousAcquisitionPrice` para poder revertir en cancelación. Se descarta porque el usuario fijó explícitamente que la cancelación no revierte el costo (historia 1, AC4) — el costo de adquisición es informativo/de catálogo, no transaccional como `paidAmount` o `branch_inventory.quantity`.

**D4 — `priceColumnNames` cambia de `Set<string>` a `Map<string, boolean>` (nombre → algún precio con ese nombre es default).**
El criterio de orden pasa a: entradas con `isDefault=true` primero (orden estable entre ellas por `localeCompare`, cubre el caso de que dos productos distintos usen el mismo nombre de precio con distinto `isDefault`, tratándolo como default si CUALQUIER ocurrencia lo es — mismo espíritu que "precio público siempre primero" del negocio), luego el resto por `localeCompare("es-MX")`. Se aplica el cambio en **ambas** copias (`src/modules/reports/domain/services/priceColumnNames.ts` y la copia local en `InventoryPriceStockTable.tsx`) porque no hay import compartido entre backend y frontend en este monorepo Next.js (regla de capas: UI no importa `src/modules/*` en el cliente). El test de paridad de tasks.md cubre que ambas implementaciones no diverjan.

**D5 — Formato de moneda en PDF/XLSX del reporte.**
Hoy `DepartmentPriceListReportPdf.tsx` y `buildDepartmentPriceListWorkbook.ts` imprimen `price.price` crudo (string `Decimal(14,4)`, ej. `"100.0000"`). Se reutiliza el mismo formateador `Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" })` ya usado en `InventoryPriceStockTable.tsx:9-16`, aplicado también a la nueva columna de costo de adquisición.

## Risks / Trade-offs

- **[Riesgo]** El costo de adquisición puede quedar desactualizado si el negocio edita manualmente y luego una compra antigua se completa fuera de orden (ej. importación de datos históricos) → **Mitigación**: comportamiento documentado como "última compra completada gana"; no se resuelve con lógica de fechas en este change (el propio criterio del usuario es "unitCost es el costo del producto, guárdalo").
- **[Riesgo]** Duplicación de `priceColumnNames` entre backend y frontend puede volver a divergir en el futuro → **Mitigación**: test de paridad explícito en tasks.md que falla si los outputs difieren para el mismo input.
- **[Trade-off]** No agregar el costo de adquisición a `ProductDto` general (lista/detalle de catálogo) en este change, sólo al modal de edición y al reporte — evita expandir el alcance a POS/cotizaciones donde no fue pedido.
