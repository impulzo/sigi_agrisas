## MODIFIED Requirements

### Requirement: Sales cut breakdowns
El corte SHALL incluir seis desgloses: `byPaymentMethod`, `byCashier`, `byBranch`, `byDay` (cada fila con `ticketCount`, `subtotal`, `taxTotal`, `total`), `byDepartment` (una fila por departamento con `key`, `label`, `ticketCount` [tickets distintos que incluyen ese departamento], `subtotal`, `taxTotal`, `total`) y `byProduct` (una fila por producto con `key`, `label`, `ticketCount`, `quantitySold` [suma de `sale_items.quantity`], `subtotal`, `taxTotal`, `total`). `byDepartment` y `byProduct` SHALL agregarse desde `sale_items` de ventas `completed`+`edited` del periodo/filtros aplicados — mismo criterio que los demás desgloses, sin restar devoluciones. El split IVA/IEPS SHALL exponerse solo a nivel global (`totals.ivaTotal`/`iepsTotal`); todos los desgloses SHALL usar `taxTotal` combinado. `byDay` SHALL ordenarse ascendente por fecha; los demás (incluidos `byDepartment` y `byProduct`) descendente por `total`, sin límite artificial de filas. (Traza: S1.)

#### Scenario: Desglose por método y por día
- **WHEN** el periodo tiene ventas con distintos métodos de pago en varios días
- **THEN** `byPaymentMethod` trae una fila por método (con nombre) y `byDay` una fila por día ordenada ascendente

#### Scenario: IVA/IEPS global
- **WHEN** el corte se genera
- **THEN** `totals.ivaTotal` y `totals.iepsTotal` reflejan la suma de impuestos de `sale_items` de las ventas activas del periodo

#### Scenario: Desglose por departamento
- **WHEN** el periodo tiene ventas de productos de distintos departamentos
- **THEN** `byDepartment` trae una fila por departamento (con nombre), ordenada descendente por `total`

#### Scenario: Desglose por producto con piezas
- **WHEN** el periodo tiene ventas de varios productos, incluyendo el mismo producto en múltiples líneas/tickets
- **THEN** `byProduct` trae una fila por producto (con nombre y código) con `quantitySold` sumando todas las líneas de ese producto, ordenada descendente por `total`

#### Scenario: Ventas canceladas no cuentan en los desgloses nuevos
- **WHEN** el periodo contiene ventas `cancelled`
- **THEN** esas ventas no se suman a `byDepartment` ni a `byProduct`

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** `byDepartment` y `byProduct` son arrays vacíos
