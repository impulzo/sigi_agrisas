# Spec: inventory-lots

## Purpose

Registra, como metadata de trazabilidad (no como stock por lote), el lote y la fecha de caducidad capturados opcionalmente al completar una compra, y calcula un estado de vencimiento (semáforo) a partir del lote más próximo a vencer para cada producto en cada sucursal.
## Requirements
### Requirement: Captura de lote y caducidad al completar una compra

El sistema SHALL permitir que cada línea de una compra (`PurchaseItem`) incluya opcionalmente `lotNumber` (texto, 1-64 caracteres) y `expirationDate` (fecha). Ambos campos SHALL ser opcionales por línea, pero si se envía uno, el otro SHALL ser obligatorio (par completo o ninguno) — de lo contrario la API responde HTTP 400 y no se crea la compra. Cada línea SHALL aceptar además, de forma independiente al par anterior, `manufactureDate` (fecha de elaboración, opcional, sin regla de "todo o nada" con `lotNumber`/`expirationDate` — puede enviarse sola, junto con el par, o ninguna). Cuando una línea incluye el par completo `lotNumber`+`expirationDate`, el sistema SHALL crear un registro en `inventory_lots` (`branchId`, `productId`, `purchaseItemId`, `lotNumber`, `expirationDate`, `quantity` igual a la cantidad comprada, y `manufactureDate` si fue enviada en esa línea, o `null` en caso contrario) dentro de la misma transacción que crea la compra e incrementa el inventario. Cuando una línea incluye `manufactureDate` pero NO el par completo `lotNumber`+`expirationDate`, el sistema NO SHALL crear ningún registro en `inventory_lots` para esa línea, y el valor de `manufactureDate` de esa línea NO se persiste (mismo comportamiento que hoy tiene un `lotNumber` o `expirationDate` enviado en solitario). Este registro es metadata de trazabilidad append-only: NO particiona `branch_inventory.quantity` por lote ni afecta cómo ventas, devoluciones o ajustes descuentan inventario (siguen operando sobre el agregado por `(branch, product)`).

#### Scenario: Línea de compra sin lote ni caducidad se comporta igual que hoy
- **WHEN** una línea de compra no incluye `lotNumber` ni `expirationDate`
- **THEN** la compra se crea normalmente y no se inserta ningún registro en `inventory_lots` para esa línea

#### Scenario: Lote y caducidad capturados juntos crean el registro de trazabilidad
- **WHEN** una línea de compra incluye `lotNumber` y `expirationDate` válidos
- **THEN** al completarse la compra se crea un registro en `inventory_lots` con esos datos, ligado al `purchase_item` de esa línea, `branchId` y `productId` de la compra

#### Scenario: Sólo uno de los dos campos enviado es rechazado
- **WHEN** una línea de compra incluye `lotNumber` sin `expirationDate` (o viceversa)
- **THEN** la API responde HTTP 400 y no se crea la compra

#### Scenario: Lote completo con fecha de elaboración persiste el dato
- **WHEN** una línea de compra incluye `lotNumber`, `expirationDate` y `manufactureDate` válidos
- **THEN** al completarse la compra se crea un registro en `inventory_lots` que incluye el `manufactureDate` capturado

#### Scenario: Fecha de elaboración sin lote ni caducidad no crea registro ni se persiste
- **WHEN** una línea de compra incluye `manufactureDate` pero no incluye `lotNumber` ni `expirationDate`
- **THEN** la compra se crea normalmente, la API no responde error por ese campo, no se crea ningún registro en `inventory_lots` para esa línea, y el `manufactureDate` de esa línea no se persiste en ningún lado

#### Scenario: Lote completo sin fecha de elaboración persiste el campo como null
- **WHEN** una línea de compra incluye `lotNumber` y `expirationDate` válidos pero no incluye `manufactureDate`
- **THEN** el registro creado en `inventory_lots` tiene `manufactureDate: null`

### Requirement: Limpieza de lotes al cancelar una compra

Cuando una compra `completed` se cancela, el sistema SHALL eliminar todos los registros de `inventory_lots` ligados a los `purchase_items` de esa compra, dentro de la misma transacción que revierte el inventario incrementado por la compra.

#### Scenario: Cancelar una compra elimina sus lotes registrados
- **WHEN** se cancela una compra que tenía una o más líneas con lote+caducidad capturados
- **THEN** los registros de `inventory_lots` correspondientes a esos `purchase_items` se eliminan, y el semáforo de esos productos en inventario deja de considerarlos

### Requirement: Cálculo del estado de vencimiento (semáforo)

El sistema SHALL calcular, para cada producto en cada sucursal, un `expiryStatus` derivado de la fecha de caducidad más próxima entre todos los registros de `inventory_lots` de ese `(branchId, productId)` — sin importar si esa cantidad específica ya fue vendida o no (limitación de metadata simple, documentada). Los umbrales, medidos en días restantes hasta la fecha de caducidad más próxima, SHALL ser: `"ok"` si faltan más de 30 días, `"warning"` si faltan entre 8 y 30 días (inclusive), `"critical"` si faltan 7 días o menos, incluyendo fechas ya vencidas. Si no existe ningún registro de `inventory_lots` para ese `(branchId, productId)`, `expiryStatus` SHALL ser `null`.

#### Scenario: Producto sin lotes registrados no tiene estado de vencimiento
- **WHEN** un producto en una sucursal no tiene ningún registro en `inventory_lots`
- **THEN** su `expiryStatus` es `null`

#### Scenario: Más de 30 días hasta la caducidad más próxima
- **WHEN** el lote con caducidad más próxima de un producto vence en 45 días
- **THEN** `expiryStatus` es `"ok"`

#### Scenario: Entre 8 y 30 días hasta la caducidad más próxima
- **WHEN** el lote con caducidad más próxima de un producto vence en 15 días
- **THEN** `expiryStatus` es `"warning"`

#### Scenario: 7 días o menos, o ya vencido
- **WHEN** el lote con caducidad más próxima de un producto vence en 3 días, o ya venció
- **THEN** `expiryStatus` es `"critical"`

#### Scenario: Múltiples lotes usan el más próximo a vencer
- **WHEN** un producto tiene dos registros en `inventory_lots` con caducidades a 45 y 10 días respectivamente
- **THEN** `expiryStatus` se calcula sobre el lote a 10 días (`"warning"`), ignorando el más lejano

### Requirement: Estado de notificación de caducidad por lote
Cada `InventoryLot` SHALL persistir 3 columnas independientes, todas nullable y sin valor por defecto (`NULL` al crearse el lote): `notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt`. Estas columnas SHALL representar únicamente si `inventory-expiry-notifications` ya envió el aviso correspondiente a ese umbral para ese lote — no afectan ni son afectadas por la captura de lote/caducidad al completar una compra, ni por el cálculo del semáforo `expiryStatus` (30/7 días, sin relación con estos umbrales de 6/3 meses).

#### Scenario: Lote nuevo se crea sin ningún umbral notificado
- **WHEN** se crea un `InventoryLot` como parte de completar una compra con `lotNumber`+`expirationDate`
- **THEN** las 3 columnas `notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt` del nuevo registro son `NULL`

#### Scenario: Cancelar la compra elimina también el estado de notificación
- **WHEN** se cancela una compra y sus `inventory_lots` asociados se eliminan (comportamiento existente de `inventory-lots`)
- **THEN** el estado de notificación de esos lotes desaparece junto con el registro, sin dejar rastro huérfano

