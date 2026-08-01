## ADDED Requirements

### Requirement: Inventory movement ledger schema
El sistema SHALL persistir un ledger append-only `inventory_movements` con, por fila: `branchId`, `productId`, `movementAt`, `sequence` (autoincrement, desempate cronológico), `movementType` (`sale`, `sale_cancel`, `sale_edit_restore`, `sale_edit_apply`, `return`, `return_cancel`, `adjustment_in`, `adjustment_out`), `direction` (`IN`|`OUT`), `quantity` (magnitud positiva), `unit`, `balanceAfter`, `unitCost` (nullable), `unitPrice` (nullable), `customerId` (nullable), `providerId` (nullable, no poblado en este alcance), `folioId`/`folioCode`/`folioNumber` (nullable), `originFolioCode`/`originFolioNumber` (nullable), `sourceType` (`sale`|`return`|`adjustment`), `sourceId`, `status` (siempre `"Aplicada"`), `notes` (nullable), `createdBy` (nullable). (Traza: S1.)

#### Scenario: Movimiento inmutable
- **WHEN** se cancela o edita una venta/devolución que ya generó movimientos
- **THEN** el sistema NUNCA actualiza los movimientos previos; inserta movimientos nuevos que compensan el efecto

---

### Requirement: Automatic movement recording on stock mutations
El sistema SHALL registrar un movimiento en `inventory_movements` cada vez que se muta `branch_inventory.quantity`, dentro de la misma transacción Prisma que la mutación. Los puntos de escritura SHALL ser: creación de venta completada (`sale`, `OUT`, por línea), cancelación de venta (`sale_cancel`, `IN`, por línea), edición de venta completada (`sale_edit_restore` `IN` + `sale_edit_apply` `OUT`, por línea), creación de devolución (`return`, `IN`, por línea), cancelación de devolución (`return_cancel`, `OUT`, por línea), ajuste manual de inventario con `delta≠0` (`adjustment_in`|`adjustment_out` según signo), y alta de un registro de `branch_inventory` con `quantity>0` (`adjustment_in`, `notes="Saldo inicial"`). (Traza: S1.)

#### Scenario: Venta genera movimiento de salida
- **WHEN** se crea una venta completada con 2 líneas
- **THEN** se insertan 2 movimientos `sale` (`direction='OUT'`), cada uno con el `balanceAfter` resultante de su línea

#### Scenario: Cancelación de venta genera movimiento de entrada
- **WHEN** se cancela una venta previamente completada
- **THEN** se inserta 1 movimiento `sale_cancel` (`direction='IN'`) por cada línea restaurada

#### Scenario: Edición de venta genera restitución y reaplicación
- **WHEN** se edita una venta completada reemplazando sus líneas
- **THEN** se insertan movimientos `sale_edit_restore` (`IN`) por cada línea vieja y `sale_edit_apply` (`OUT`) por cada línea nueva

#### Scenario: Devolución genera movimiento de entrada
- **WHEN** se crea una devolución con 1 línea
- **THEN** se inserta 1 movimiento `return` (`direction='IN'`)

#### Scenario: Cancelación de devolución genera movimiento de salida
- **WHEN** se cancela una devolución previamente completada
- **THEN** se inserta 1 movimiento `return_cancel` (`direction='OUT'`) por cada línea deshecha

#### Scenario: Ajuste manual genera movimiento según signo
- **WHEN** se ajusta stock manualmente con `delta > 0`
- **THEN** se inserta 1 movimiento `adjustment_in`
- **WHEN** se ajusta stock manualmente con `delta < 0`
- **THEN** se inserta 1 movimiento `adjustment_out`

#### Scenario: Alta de inventario con existencia inicial
- **WHEN** se crea un registro de `branch_inventory` con `quantity > 0`
- **THEN** se inserta 1 movimiento `adjustment_in` con `notes="Saldo inicial"`

#### Scenario: Fallo de registro revierte la operación completa
- **WHEN** el insert del movimiento falla dentro de la transacción
- **THEN** la venta/devolución/ajuste tampoco se aplica (rollback completo)

---

### Requirement: Folio resolution per movement type
Los movimientos `sale`, `sale_cancel`, `sale_edit_restore`, `sale_edit_apply` SHALL usar el folio de la venta involucrada. Los movimientos `return`, `return_cancel` SHALL usar el folio de la venta referenciada por la devolución (`return.saleId`), reflejado también en `originFolioCode`/`originFolioNumber`. Los movimientos `adjustment_in`/`adjustment_out` SHALL resolver automáticamente el folio activo `code='TS'` `scope='INVENTORY'` sin intervención del usuario; si no existe o está inactivo, el ajuste SHALL ejecutarse igual con `folioCode=null` (no bloquea la operación). (Traza: S1.)

#### Scenario: Ajuste sin folio TS activo no se bloquea
- **WHEN** se ejecuta un ajuste manual y no hay folio activo `code='TS'`
- **THEN** el ajuste de stock se completa igual y el movimiento queda con `folioCode=null`

#### Scenario: Devolución hereda folio de la venta
- **WHEN** se crea una devolución sobre una venta con folio `TC-000123`
- **THEN** el movimiento `return` resultante trae `folioCode='TC-000123'`
