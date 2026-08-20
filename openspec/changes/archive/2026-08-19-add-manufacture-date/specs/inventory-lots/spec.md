## MODIFIED Requirements

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
