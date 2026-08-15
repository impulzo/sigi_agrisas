## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Encargado de compras | Como Encargado de compras, quiero capturar lote y fecha de caducidad de forma opcional en cada línea al registrar una compra, para dejar trazabilidad de vencimiento en productos perecederos sin obligar el dato en los que no lo son | Hoy `purchase_items` no tiene campo de lote/caducidad; el negocio necesita esta trazabilidad para poder alertar antes de que el producto se venza | - Línea de compra sin lote ni caducidad se guarda igual que hoy (comportamiento default preservado)<br>- Si se captura lote, caducidad es obligatoria (y viceversa) — enviar sólo uno → 400<br>- Al completar la compra, se crea 1 registro en `inventory_lots` por línea con ambos datos, ligado al `purchase_item` y a `branch_id`/`product_id`<br>- Cancelar la compra elimina los `inventory_lots` asociados a sus items (misma transacción que revierte inventario) | - Zod valida `lotNumber` (1-64 chars) y `expirationDate` (fecha válida) en el controller antes del use case<br>- Par completo o ninguno validado en backend, no sólo en cliente (defensa en profundidad)<br>- Sujeto al mismo permiso `purchases:write` y branch scoping que ya rige `POST /purchases` — sin gate nuevo |
| 2 | Encargado de inventario | Como Encargado de inventario, quiero ver un semáforo verde/amarillo/rojo por producto en el listado de inventario según su caducidad más próxima registrada, para priorizar rotación y anticipar mermas por vencimiento | El inventario sólo muestra cantidad agregada; sin señal visual de vencimiento, el vencimiento se detecta tarde (físicamente, no en sistema) | - Producto con lote(s) registrado(s): badge según umbral — verde si faltan >30 días, amarillo si 8-30 días, rojo si ≤7 días o ya vencido<br>- Producto sin ningún lote registrado: sin badge (no "rojo por default")<br>- Semáforo usa la fecha más próxima entre TODOS los lotes registrados para ese producto+sucursal (metadata simple, no descuenta por lote vendido — limitación documentada y aceptada)<br>- Columna nueva no interfiere con el indicador existente de bajo stock (`isLow`) — son señales independientes en la misma fila | - Cálculo de nearest-expiration respeta branch scoping ya existente en `GET /inventory` (no filtra cross-branch)<br>- Sin permiso nuevo — mismo `inventory:read` que ya gatea la vista |

Nota: las dos historias ya venían separadas en la solicitud del usuario (captura en compras vs. visualización en inventario); son independientes y testeables por separado, así que no se dividieron más. Rol, umbrales y nivel de tracking quedaron confirmados en fase de planeación previa (Plan Mode), sin preguntas pendientes.

## Why

El módulo de compras (`src/modules/purchases/`) no captura lote ni fecha de caducidad — `purchase_items` no tiene esos campos. El módulo de inventario (`src/modules/inventory/`) sólo trackea `quantity` agregada por `(branch, product)`; el diseño original del módulo (`openspec/changes/archive/2026-05-29-inventory-backend/design.md`) excluyó explícitamente "lotes/series por producto" del alcance. Sin este dato, el vencimiento de mercancía se detecta físicamente en sucursal, no en el sistema — para negocio agrícola con insumos perecederos (agroquímicos, semillas, fertilizantes con vida útil), esto genera mermas evitables. La captura en compras y el semáforo en inventario cierran ese vacío sin rediseñar el modelo de stock existente.

## What Changes

- Nueva tabla `inventory_lots` (metadata append-only, ligada a `purchase_items`): registra lote + fecha de caducidad + cantidad por línea de compra, sin modificar `branch_inventory.quantity` (sigue siendo el agregado, fuente de verdad de stock).
- `POST /api/v1/admin/purchases`: cada línea acepta `lotNumber`/`expirationDate` opcionales (par completo o ninguno, validado con Zod + `.refine()`). Al completar la compra, inserta el lote en la misma transacción que ya decrementa/incrementa inventario.
- Cancelar una compra (`POST /purchases/:id/cancel`) borra los `inventory_lots` de sus items en la misma transacción que revierte el stock.
- `GET /api/v1/admin/branches/:id/inventory` (list + get item): cada resultado se enriquece con `nearestExpirationDate`, `nearestExpirationLotNumber` y `expiryStatus` (`"ok" | "warning" | "critical" | null`), calculado desde el lote más próximo a vencer registrado para ese producto+sucursal.
- Nuevo servicio de dominio puro `ExpiryStatusCalculator` (umbrales: verde >30 días, amarillo 8-30, rojo ≤7 o vencido).
- UI de compras: `PurchaseLineRow` gana inputs opcionales "Lote" y "Caducidad" por línea.
- UI de inventario: nueva columna con `ExpiryStatusBadge` (semáforo) en `InventoryTable`, independiente del indicador existente de bajo stock.
- **Fuera de alcance (explícito):** no se descuenta inventario por lote específico (sin FEFO) en ventas/devoluciones/ajustes — `branch_inventory` sigue siendo un agregado por `(branch, product)`, tal como fue decidido en el diseño original del módulo. No hay reportes/kardex por lote ni edición/eliminación manual de lotes ya capturados.

## Capabilities

### New Capabilities
- `inventory-lots`: captura de lote+caducidad al completar una compra (tabla `inventory_lots`, ligada a `purchase_items`), y su reverso al cancelar una compra. Incluye el servicio de dominio `ExpiryStatusCalculator` y el cálculo de semáforo expuesto en las respuestas de inventario.

### Modified Capabilities
- `purchases-api`: `POST /purchases` acepta campos opcionales `lotNumber`/`expirationDate` por línea; `cancel` gana el efecto colateral de limpiar lotes asociados.
- `inventory-api`: `GET /inventory` (list) y `GET /inventory/:id` (get item) devuelven los campos nuevos `nearestExpirationDate`, `nearestExpirationLotNumber`, `expiryStatus` por item.

## Impact

- **DB**: nueva tabla `inventory_lots` + migración `add_inventory_lots_table`; relación inversa `inventoryLots InventoryLot[]` en `PurchaseItem`.
- **Backend — purchases**: `PurchaseRepository` (puerto), `PrismaPurchaseRepository`/`InMemoryPurchaseRepository` (createCompleted + cancel), `PurchasesController` (Zod).
- **Backend — inventory**: nuevo puerto `InventoryLotRepository` + `PrismaInventoryLotRepository`/`InMemoryInventoryLotRepository`, nuevo `ExpiryStatusCalculator` (domain/services), `BranchInventoryDto`, `ListBranchInventoryUseCase`, `GetBranchInventoryItemUseCase`, DI container de inventory.
- **Frontend — purchases**: `useCreatePurchaseForm`, `PurchaseLineRow`, `createPurchase` (schema Zod cliente).
- **Frontend — inventory**: `InventoryItem` (domain/api types), mapper en `_logic/services/inventory.ts`, nuevo `ExpiryStatusBadge`, `InventoryTable`.
- **Sin cambios**: `pos`, `returns`, `payments` — no tocan lotes ni consumen `inventory_lots`.
