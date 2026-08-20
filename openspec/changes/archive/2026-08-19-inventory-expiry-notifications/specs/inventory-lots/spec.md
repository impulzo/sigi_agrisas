## ADDED Requirements

### Requirement: Estado de notificación de caducidad por lote
Cada `InventoryLot` SHALL persistir 3 columnas independientes, todas nullable y sin valor por defecto (`NULL` al crearse el lote): `notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt`. Estas columnas SHALL representar únicamente si `inventory-expiry-notifications` ya envió el aviso correspondiente a ese umbral para ese lote — no afectan ni son afectadas por la captura de lote/caducidad al completar una compra, ni por el cálculo del semáforo `expiryStatus` (30/7 días, sin relación con estos umbrales de 6/3 meses).

#### Scenario: Lote nuevo se crea sin ningún umbral notificado
- **WHEN** se crea un `InventoryLot` como parte de completar una compra con `lotNumber`+`expirationDate`
- **THEN** las 3 columnas `notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt` del nuevo registro son `NULL`

#### Scenario: Cancelar la compra elimina también el estado de notificación
- **WHEN** se cancela una compra y sus `inventory_lots` asociados se eliminan (comportamiento existente de `inventory-lots`)
- **THEN** el estado de notificación de esos lotes desaparece junto con el registro, sin dejar rastro huérfano
