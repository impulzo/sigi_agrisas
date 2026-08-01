## ADDED Requirements

### Requirement: Kardex row action in inventory table
`BranchInventoryTable` SHALL exponer una acción de fila "Ver Kardex" que navega a `/inventory/kardex?productId=<id>&branchId=<branchId>` precargando el producto y la sucursal de la fila. La acción SHALL estar visible para cualquier usuario con `inventory:kardex_read` (independiente de `inventory:write`). (Traza: S5.)

#### Scenario: Navegar al kardex desde inventario
- **WHEN** un usuario con `inventory:kardex_read` hace clic en "Ver Kardex" sobre una fila de `BranchInventoryTable`
- **THEN** navega a `/inventory/kardex` con `productId` y `branchId` de esa fila precargados

#### Scenario: Acción oculta sin permiso
- **WHEN** el usuario no tiene `inventory:kardex_read`
- **THEN** la acción "Ver Kardex" no se muestra
