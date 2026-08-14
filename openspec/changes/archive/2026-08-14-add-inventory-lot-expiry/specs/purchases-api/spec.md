## MODIFIED Requirements

### Requirement: Registro de una compra a un proveedor

El sistema SHALL permitir registrar una compra (`Purchase`) contra un proveedor activo, compuesta de una o más líneas (`PurchaseItem`). Al confirmarse, SHALL asignar un folio del catálogo con `code="CP"` y `scope="OPERATIONS"` (resuelto automáticamente por el backend, no seleccionable por el cliente), SHALL incrementar el inventario de la sucursal por cada línea, y SHALL snapshotear código, nombre y costo unitario del producto en el momento de la compra. Los totales (`subtotal`, `ivaTotal`, `iepsTotal`, `total`) SHALL calcularse con redondeo half-to-even a 4 decimales, misma fórmula que Sale/Quote/Return — incluyendo la extracción de impuesto descrita abajo. Cada línea SHALL aceptar opcionalmente `lotNumber` y `expirationDate` (par completo o ninguno; ver capability `inventory-lots` para el detalle de captura y validación).

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

### Requirement: Cancelación de una compra

El sistema SHALL permitir cancelar una compra en estado `completed`, revirtiendo el inventario incrementado y, si era a crédito, el saldo del proveedor en la proporción aún no pagada. La cancelación SHALL ser idempotente y SHALL rechazarse si la compra tiene abonos a proveedor activos. Si alguna línea de la compra tenía lote/caducidad capturados, la cancelación SHALL eliminar los registros de trazabilidad asociados (ver capability `inventory-lots`) dentro de la misma transacción.

#### Scenario: Cancelación exitosa revierte inventario
- **WHEN** un usuario con `purchases:cancel` cancela una compra `completed` sin abonos activos
- **THEN** el inventario de cada producto en la sucursal decrementa en la cantidad de la línea correspondiente, la compra pasa a `status="cancelled"` con `cancelledAt`/`cancelledBy`/`cancellationReason` registrados

#### Scenario: Cancelación revierte saldo de proveedor si era a crédito
- **WHEN** se cancela una compra a crédito con `paidAmount < total` (aún no saldada completamente)
- **THEN** `providers.currentBalance` decrementa en `(total - paidAmount)` de esa compra

#### Scenario: Doble cancelación rechazada
- **WHEN** se intenta cancelar una compra que ya está en `status="cancelled"`
- **THEN** la API responde 409 y no vuelve a modificar inventario ni saldo

#### Scenario: Cancelación bloqueada por abonos activos
- **WHEN** la compra tiene uno o más `ProviderPayment` en `status="completed"`
- **THEN** la API responde 409 indicando que deben cancelarse los abonos primero, y no se cancela la compra
