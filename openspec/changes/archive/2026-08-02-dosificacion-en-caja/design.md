## Context

Mapeado el código real antes de diseñar (ver proposal.md - Why): `CreateSaleUseCase`/`EditCompletedSaleUseCase` comparten el mismo shape `SaleItemInput{productId, productPriceId, quantity}` y la misma lógica de resolución (`getProduct`+`getProductPrice` vía `PosLookupService`). `PrismaSaleRepository` tiene 4 puntos que llaman a `recordInventoryMovement(tx, {..., quantity: item.quantity, ...})`: `createCompleted`, `createCompletedFromQuote`, `cancel` (restore), `replaceItemsAndRecalculate` (restore + apply). `PrismaReturnRepository` tiene 2 más: `createWithItems`, `markCancelled`. Todos ellos hoy asumen `quantity` = unidades del producto base; con líneas de dosificación, `quantity` pasa a significar "partes vendidas/devueltas" y el movimiento de inventario real es `quantity / numPartsSnapshot`.

`DosificationPriceCalculator.computeUnitPrice(basePrice, numParts)` ya existe (catálogo) y se reusa sin cambios. `branch_inventory.quantity` es `Decimal(14,4)` — ya soporta fracciones (venta a granel). Decisiones de negocio ya confirmadas con el usuario (ver Historia de Usuario): fracción sobre stock base (no contenedores físicos abiertos), sin tope de partes por línea.

## Goals / Non-Goals

**Goals:**
- Vender por dosificación desde el POS (historia 1) sin introducir un modelo de datos nuevo más allá de 2 columnas nullable por tabla afectada.
- Corrección de inventario idéntica en los 4 flujos existentes que mueven stock desde `sale_items`, más los 2 de `return_items` (historia 2) — un solo helper puro reusado en los 6 puntos, no 6 implementaciones distintas de la misma fracción.
- UI mínima viable (historia 3): reusar `PriceTierPicker` en vez de crear un componente paralelo.

**Non-Goals:**
- No se modela "contenedor físico abierto" con estado propio (decisión ya tomada con el usuario) — es aritmética de fracción sobre el stock existente.
- No se resuelve el riesgo ya documentado en `pos-api` "Cancel sale" (inflación de stock al cancelar una venta con devoluciones activas) — ese riesgo es preexistente y ortogonal a este change; las líneas de dosificación heredan el mismo comportamiento sin agravarlo ni resolverlo.
- No se agrega un permiso RBAC nuevo — reusa `sales:create`/`sales:cancel`/`sales:edit_completed`/`returns:create`/`returns:cancel` existentes.
- `minQuantity` de `ProductPrice` no aplica a líneas de dosificación (no tienen ese concepto) — documentado, no se inventa un equivalente.

## Decisions

**D1 — Un solo helper puro `inventoryQuantityOf`, no lógica duplicada por punto de llamada**
`src/shared/domain/services/inventoryQuantityOf.ts`: `(quantity: number, numPartsSnapshot: number | null) => numPartsSnapshot ? quantity / numPartsSnapshot : quantity`. Se importa en los 6 puntos de `PrismaSaleRepository`/`PrismaReturnRepository` que hoy pasan `item.quantity` directo a `recordInventoryMovement`. Alternativa descartada: que cada repositorio calcule la división inline — duplicaría la fórmula 6 veces con riesgo de que una quede desactualizada si la regla cambia.

**D2 — `numPartsSnapshot`/`dosificationId` persistidos, no derivados en cada lectura**
Se snapshotea `numParts` en el momento de la venta (igual que `priceNameSnapshot` ya snapshotea `price.name`) en vez de hacer JOIN a `product_dosifications` cada vez que se necesita el divisor. Motivo: la dosificación podría cambiar `numParts` después de la venta (editar la dosificación en catálogo) — el snapshot preserva la matemática de inventario tal como fue al momento de la operación original, consistente con el patrón de snapshot ya documentado en el proyecto (CLAUDE.md "Snapshot por línea").

**D3 — `priceNameSnapshot` reusado para el nombre de la dosificación, no una columna nueva**
En vez de agregar `dosificationNameSnapshot`, las líneas de dosificación escriben `dosification.name` en la ya existente columna `priceNameSnapshot` (`NOT NULL`). Motivo: todo el código/UI/PDF que hoy lee `priceNameSnapshot` para mostrar "qué tarifa se vendió" sigue funcionando sin cambios (sale detail table, tickets, reportes) — agregar una columna paralela obligaría a tocar cada consumidor para decidir cuál de las dos leer. `dosificationId` sí es una columna nueva (para trazabilidad/joins), pero no se necesita una columna de nombre adicional.

**D4 — Mutua exclusividad `productPriceId`/`dosificationId` validada en el use case, no vía CHECK constraint SQL**
El proyecto no usa CHECK constraints multi-columna en ningún otro punto del schema (la única excepción es el índice único parcial de sucursal matriz). Se valida en `CreateSaleUseCase`/`EditCompletedSaleUseCase` (ambos ya validan por línea) y en el controller (Zod `.refine`) antes de tocar la BD — consistente con el resto de invariantes de negocio del proyecto, que viven en aplicación/dominio, no en constraints de BD.

**D5 — `ReturnableQuantityCalculator` no cambia**
Compara `sale_item.quantity` contra `Σ return_items.quantity` — ambos ya expresados en la MISMA unidad (partes, para una línea de dosificación) porque `ReturnItemInput.quantity` en el body de creación de devolución también se captura en partes (el operador ve "se vendieron 3 partes, cuántas partes regresa" en la UI de devoluciones, no una fracción de litros). Sólo el paso de INVENTARIO (no el de "cuánto queda por devolver") necesita la división — están desacoplados correctamente porque uno compara unidades homogéneas (partes vs partes) y el otro convierte a unidades físicas (partes → base) sólo al tocar `branch_inventory`.

**D6 — UI: extender `PriceTierPicker`, no crear un componente paralelo**
Historia 3 pide ver dosificaciones "junto a" los precios — se agrega una sección/lista adicional dentro del mismo diálogo (mismo patrón visual que la lista de precios), no un tab ni un modal separado. Minimiza cambio de UX (el cajero ya conoce el diálogo) y reusa el mismo estado de cantidad/confirmación ya corregido por `fix-pos-cantidad-input`.

## Risks / Trade-offs

- **[Riesgo] Migración toca dos tablas transaccionales (`sale_items`, `return_items`) con filas históricas.** Mitigado: columnas 100% nuevas y nullable (`dosification_id`, `num_parts_snapshot`), sin alterar columnas existentes ni requerir backfill — todas las filas históricas quedan con ambas en `NULL` y `inventoryQuantityOf` las trata como líneas normales (`quantity` directo), sin cambio de comportamiento retroactivo.
- **[Riesgo] Olvidar aplicar `inventoryQuantityOf` en alguno de los 6 puntos deja un bug de conteo silencioso (el tipo de bug que motivó preguntarle al usuario el alcance completo antes de empezar).** Mitigado: un test unitario por punto de llamada verificando explícitamente el caso con `numPartsSnapshot` no-nulo (sección Tests de tasks.md), más el smoke real de extremo a extremo (venta → cancelación → edición → devolución → cancelación de devolución) verificando el stock en cada paso contra BD real.
- **[Riesgo] `ReturnableQuantityCalculator` mezclando implícitamente "partes" y "unidades base" si un futuro desarrollador no lee este design.md.** Mitigado: comentario explícito en el código donde se invoca, más el requirement de spec documentando D5 explícitamente.
