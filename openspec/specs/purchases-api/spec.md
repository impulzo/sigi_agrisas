## Purpose

Define el comportamiento del backend para registrar compras que la empresa hace a proveedores, incluyendo el incremento de inventario resultante y el control de cuentas por pagar (abonos a proveedor) cuando la compra es a crédito.
## Requirements
### Requirement: Registro de una compra a un proveedor

El sistema SHALL permitir registrar una compra (`Purchase`) contra un proveedor activo, compuesta de una o más líneas (`PurchaseItem`). Al confirmarse, SHALL asignar un folio del catálogo con `code="CP"` y `scope="OPERATIONS"` (resuelto automáticamente por el backend, no seleccionable por el cliente), SHALL incrementar el inventario de la sucursal por cada línea, y SHALL snapshotear código, nombre y costo unitario del producto en el momento de la compra. Los totales (`subtotal`, `ivaTotal`, `iepsTotal`, `total`) SHALL calcularse con redondeo half-to-even a 4 decimales, misma fórmula que Sale/Quote/Return — incluyendo la extracción de impuesto descrita abajo.

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

### Requirement: Cancelación de una compra

El sistema SHALL permitir cancelar una compra en estado `completed`, revirtiendo el inventario incrementado y, si era a crédito, el saldo del proveedor en la proporción aún no pagada. La cancelación SHALL ser idempotente y SHALL rechazarse si la compra tiene abonos a proveedor activos.

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

### Requirement: Registro de un abono a proveedor

El sistema SHALL permitir registrar un abono (`ProviderPayment`) contra una compra a crédito (`paymentMethod.isCredit=true`), asignando folio del catálogo con `code="PP"` y `scope="OPERATIONS"`. El monto SHALL validarse contra el saldo pendiente de esa compra específica.

#### Scenario: Abono registrado exitosamente
- **WHEN** un usuario con `purchases:pay` registra un abono con `amount <= (purchase.total - purchase.paidAmount)` sobre una compra a crédito
- **THEN** se asigna folio `PP-NNNNNN`, `providers.currentBalance` decrementa en `amount`, `purchase.paidAmount` incrementa en `amount`, y `purchase.paymentStatus` se recalcula (`pending`→`partial`→`paid`)

#### Scenario: Abono sobre compra de contado rechazado
- **WHEN** se intenta registrar un abono sobre una compra con `paymentMethod.isCredit=false`
- **THEN** la API responde 409 y no se crea el abono

#### Scenario: Abono que excede el saldo pendiente rechazado
- **WHEN** `amount > (purchase.total - purchase.paidAmount)`
- **THEN** la API responde 409 indicando el monto pendiente disponible, y no se crea el abono

### Requirement: Cancelación de un abono a proveedor

El sistema SHALL permitir cancelar un abono en estado `completed`, revirtiendo el saldo del proveedor y recalculando el estado de pago de la compra asociada. La cancelación SHALL ser idempotente.

#### Scenario: Cancelación de abono revierte saldo
- **WHEN** un usuario con `purchases:pay_cancel` cancela un abono `completed`
- **THEN** `providers.currentBalance` incrementa en el monto del abono, `purchase.paidAmount` decrementa en el mismo monto, y `purchase.paymentStatus` se recalcula

#### Scenario: Doble cancelación de abono rechazada
- **WHEN** se intenta cancelar un abono que ya está en `status="cancelled"`
- **THEN** la API responde 409 y no vuelve a modificar el saldo

### Requirement: Consulta de compras (listado y detalle)

El sistema SHALL exponer un listado paginado de compras con filtros por proveedor, sucursal, estado y rango de fechas, y un detalle por compra que incluya sus líneas y los abonos a proveedor asociados.

#### Scenario: Listado paginado con filtros
- **WHEN** un usuario con `purchases:read` solicita el listado con `page`/`pageSize` (máximo 100) y opcionalmente `providerId`/`branchId`/`status`/`from`/`to`
- **THEN** la API responde la página solicitada filtrada según los criterios enviados

#### Scenario: Detalle de compra incluye líneas y abonos
- **WHEN** un usuario con `purchases:read` solicita el detalle de una compra por id
- **THEN** la respuesta incluye las líneas (`PurchaseItem` con snapshot) y los `ProviderPayment` asociados con su estado

#### Scenario: Branch scoping aplica al listado sin branchId explícito
- **WHEN** un usuario sin `branches:access_all` solicita el listado sin especificar `branchId`
- **THEN** el listado se limita automáticamente a la sucursal del usuario (`x-user-branch-id`)

### Requirement: Control de acceso y branch scoping en todos los endpoints de compras

Cada endpoint de compras y abonos a proveedor SHALL requerir el permiso RBAC correspondiente (`purchases:read`, `purchases:create`, `purchases:cancel`, `purchases:pay`, `purchases:pay_cancel`) y SHALL aplicar el mismo mecanismo de branch scoping usado por el resto del sistema (`enforceBranchScope` para operaciones sobre un recurso existente, `resolveScopedBranchId` para listados), con `branches:access_all` como único bypass.

#### Scenario: Creación de compra fuera del branch del usuario rechazada
- **WHEN** un usuario sin `branches:access_all` intenta crear una compra con `branchId` distinto a su `x-user-branch-id`
- **THEN** la API responde 403 y no se crea la compra

#### Scenario: Operación sobre compra de otra sucursal rechazada
- **WHEN** un usuario sin `branches:access_all` intenta cancelar, pagar o cancelar un abono de una compra cuyo `branchId` no coincide con `x-user-branch-id`
- **THEN** la API responde 403

#### Scenario: Permiso faltante rechazado
- **WHEN** un usuario sin el permiso RBAC requerido para la operación (por ejemplo `purchases:pay` para registrar un abono) intenta ejecutarla
- **THEN** la API responde 403 indicando el permiso faltante

