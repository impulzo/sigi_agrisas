## Context

`Product` y `InventoryLot` hoy no capturan fecha de fabricación/elaboración — sólo `expirationDate` por lote. La Historia 1 (proposal.md) pide capturarla en el catálogo de producto; la Historia 2 pide capturarla por línea de compra al registrar lote. Ambas se resuelven agregando `manufactureDate` como columna nullable, reusando exactamente el patrón ya validado de `expirationDate` (tipo `@db.Date`, string ISO `YYYY-MM-DD` en la frontera HTTP, `<input type="date">` en frontend).

## Goals / Non-Goals

**Goals:**
- Historia 1: capturar/editar `manufactureDate` en producto vía `ProductEditModal` y `ProductGeneralTab`, persistido en `products.manufacture_date`.
- Historia 2: capturar `manufactureDate` opcional por línea de compra en `PurchaseLineRow`, persistido en `inventory_lots.manufacture_date` únicamente cuando la línea ya cumple la condición existente para crear el lote (`lotNumber`+`expirationDate` completos).
- Reusar los mismos puntos de validación Zod, mappers y capas hexagonales ya usados por `expirationDate`/`satProductCode` — sin patrones nuevos.

**Non-Goals:**
- No se modifica ningún DTO de lectura que hoy expone `lotNumber`/`expirationDate` fuera de la creación (semáforo de vencimiento `inventory-lots`, `SendInventoryExpiryNotificationsUseCase`, kardex, PDFs). `manufactureDate` no se muestra en listados/reportes en esta iteración.
- No se permite crear un registro en `inventory_lots` sólo con `manufactureDate` (sin `lotNumber`+`expirationDate`) — se mantiene la regla actual de creación de lote intacta.
- No se agrega ninguna regla de negocio nueva (validación cruzada, límites de fecha, etc.) más allá de "fecha ISO válida u opcional".

## Decisions

**D1 — Campo independiente, no atado al par lote/caducidad (Historia 2, CA correspondiente).**
`manufactureDate` se valida en el schema de línea de compra (`purchaseItemSchema`) como campo suelto, sin tocar el `.refine()` existente que exige `lotNumber`+`expirationDate` como par completo. Alternativa descartada: exigir los 3 campos juntos — se rechazó porque agrega fricción a compras que hoy sólo capturan lote+caducidad y no aporta valor forzarlo.

**D2 — `manufactureDate` no crea registro en `inventory_lots` por sí sola (Historia 2, CA "línea con manufactureDate sin lote ni caducidad no crea metadata").**
El filtro que decide si una línea genera un registro de trazabilidad sigue siendo exclusivamente `lotNumber && expirationDate` (ver `PrismaPurchaseRepository`/`InMemoryPurchaseRepository`, filtro de `lotsToCreate`). Si llega sólo `manufactureDate`, la línea se comporta como hoy se comporta un `lotNumber` o `expirationDate` solitario: no crea lote, el dato no se persiste. Alternativa descartada: crear un registro "parcial" de lote sólo con `manufactureDate` — se rechazó porque `inventory_lots` requiere `lotNumber` como campo `NOT NULL` en el schema actual; permitirlo forzaría relajar esa constraint y contradice el modelo de "metadata de trazabilidad" definido en `inventory-lots`.

**D3 — Formato de fecha en frontera HTTP: string ISO `YYYY-MM-DD`, mismo patrón de `expirationDate`/`satProductCode`.**
`z.string().date()` (o `z.coerce.date()` según el punto exacto, replicando lo ya usado por `expirationDate` en `purchaseItemSchema` y por fechas opcionales en `ProductsController`). Alternativa descartada: aceptar datetime completo con hora — se rechazó porque el dominio es "fecha de fabricación", sin componente de hora relevante, igual que `expirationDate`.

**D4 — Sin exposición en DTOs de lectura fuera del flujo de creación (CS de ambas historias: "aislado de cálculos/reportes existentes").**
`manufactureDate` se agrega a `ProductDto` (Historia 1, sí es de lectura porque el producto se lee en catálogo/detalle) pero **no** se agrega a ningún DTO de lectura de `InventoryLot`/`BranchInventory` (Historia 2 — el lote no tiene endpoint de lectura propio hoy; sólo se usa internamente para el semáforo, que no se toca). Esto respeta el criterio de seguridad de "no afecta cálculos fiscales/precios existentes" y el alcance confirmado con el usuario de "solo captura y almacenamiento".

**D5 — Migraciones separadas por tabla.**
Dos archivos de migración (`products` y `inventory_lots`) en vez de uno combinado, siguiendo la convención de una migración por cambio atómico de tabla ya usada en el historial (`prisma/migrations/`).

## Risks / Trade-offs

- **[Riesgo] El dato de `manufactureDate` capturado en una línea sin lote+caducidad se pierde silenciosamente (D2), lo que puede sorprender a un usuario que esperaba que se guardara.** → Mitigación: el frontend (`PurchaseLineRow`) puede mostrar el input de fecha de elaboración visualmente agrupado junto a "Lote"/"Caducidad" para sugerir la relación, pero sin bloquear el submit; no se requiere mensaje de advertencia adicional en esta iteración (fuera de alcance por decisión de "campo independiente, sin fricción").
- **[Riesgo] Migración de Prisma en `products` (tabla con muchas filas potencialmente) es `ADD COLUMN` nullable sin default — operación segura y no bloqueante en Postgres.** → Sin mitigación adicional necesaria.
- **[Trade-off] No exponer `manufactureDate` de `InventoryLot` en ningún endpoint de lectura significa que hoy el dato es "write-only" desde la perspectiva de la API — sólo verificable directamente en BD.** → Aceptado explícitamente por el usuario como alcance de esta iteración; una extensión futura (mostrarlo en inventario/kardex) sería un change separado.
