## MODIFIED Requirements

### Requirement: Registro de una compra a un proveedor

El sistema SHALL permitir registrar una compra (`Purchase`) contra un proveedor activo, compuesta de una o más líneas (`PurchaseItem`). Al confirmarse, SHALL asignar un folio del catálogo con `code="CP"` y `scope="OPERATIONS"` (resuelto automáticamente por el backend, no seleccionable por el cliente), SHALL incrementar el inventario de la sucursal por cada línea, y SHALL snapshotear código, nombre y costo unitario del producto en el momento de la compra. Los totales (`subtotal`, `ivaTotal`, `iepsTotal`, `total`) SHALL calcularse con redondeo half-to-even a 4 decimales, misma fórmula que Sale/Quote/Return — incluyendo la extracción de impuesto descrita abajo. Cada línea SHALL aceptar opcionalmente `lotNumber` y `expirationDate` (par completo o ninguno; ver capability `inventory-lots` para el detalle de captura y validación), y, de forma independiente, `manufactureDate` (fecha de elaboración, opcional, sin relación de dependencia con el par `lotNumber`/`expirationDate`; ver capability `inventory-lots` para el detalle de persistencia).

#### Scenario: Compra de contado registrada exitosamente
- **WHEN** un usuario con `purchases:create` envía una compra con proveedor activo, forma de pago sin crédito (`paymentMethod.isCredit=false`) y líneas válidas (producto activo, cantidad > 0, costo ≥ 0)
- **THEN** la compra se crea con folio `CP-NNNNNN`, `paidAmount=total`, `paymentStatus="paid"`, el inventario de cada producto en la sucursal incrementa en la cantidad de su línea, y cada línea queda con `productCodeSnapshot`/`productNameSnapshot`/`unitCost` fijos

#### Scenario: Compra a crédito incrementa el saldo del proveedor
- **WHEN** la compra se registra con `paymentMethod.isCredit=true`
- **THEN** la compra se crea con `paidAmount=0`, `paymentStatus="pending"`, y `providers.currentBalance` incrementa en el total de la compra

#### Scenario: Totales calculados con redondeo half-to-even
- **WHEN** se registra una compra con líneas que incluyen `ivaRate`/`iepsRate` del producto
- **THEN** `unitCost` se trata como el costo final que Agrisas paga (impuesto ya incluido): `lineGross = round(quantity * unitCost * (1 - discountPct/100), 4)`, `divisor = 1 + ivaRate + iepsRate`, `lineSubtotal = round(lineGross / divisor, 4)`, `lineIva`/`lineIeps` se calculan sobre `lineSubtotal`, `lineTotal = lineGross` — misma fórmula de banker's rounding que `SaleTotalsCalculator`/`QuoteTotalsCalculator`/`ReturnTotalsCalculator`, preservando la equivalencia byte-a-byte entre los 4 calculadores

#### Scenario: Proveedor inactivo o inexistente rechazado
- **WHEN** el `providerId` enviado no existe o corresponde a un proveedor con `isActive=false`
- **THEN** la API responde 400/404 y no se crea la compra ni se modifica inventario

#### Scenario: Compra sin líneas rechazada
- **WHEN** el body no incluye ninguna línea
- **THEN** la API responde 400 y no se crea la compra

#### Scenario: Producto inactivo referenciado en una línea
- **WHEN** alguna línea referencia un `productId` con `isActive=false`
- **THEN** la API responde 400 y no se crea la compra

#### Scenario: Inventario incrementado de forma atómica junto al folio
- **WHEN** la compra se confirma exitosamente
- **THEN** la asignación de folio, el incremento de inventario por línea, la actualización del saldo del proveedor (si aplica) y la inserción de la compra ocurren dentro de una única transacción; si cualquier paso falla, ninguno se aplica

#### Scenario: Línea con lote y caducidad crea metadata de trazabilidad
- **WHEN** una línea de la compra incluye `lotNumber` y `expirationDate` válidos
- **THEN** la compra se crea normalmente y, dentro de la misma transacción, se registra el lote de esa línea (ver capability `inventory-lots`)

#### Scenario: Línea con fecha de elaboración es independiente del par lote/caducidad
- **WHEN** una línea de la compra incluye `manufactureDate` sin `lotNumber` ni `expirationDate`
- **THEN** la compra se crea normalmente sin error de validación por ese campo (ver capability `inventory-lots` para el detalle de si se persiste o no)
