# data-seeding

## Purpose

Especificaciones para los scripts de siembra de datos iniciales del sistema. Cubre la carga del catálogo del cliente (departamentos, productos, precios múltiples por nivel, sucursal matriz e inventario inicial con cantidades reales) desde datos embebidos en TypeScript hacia la base de datos Postgres vía Prisma. También cubre el catálogo canónico de folios.

---

## Requirements

### Requirement: Inventory seeder script
The system SHALL provide a script `prisma/seeds/inventory.ts` that loads catalog data idempotently from typed data embedded in `prisma/seeds/data/inventario-agrisas-v2.ts` (`INVENTORY_DATA`, `DEPARTMENTS`). The script SHALL be runnable via `npm run seed:inventory` and SHALL NOT read any spreadsheet at runtime. The seeder SHALL upsert departments and the headquarters branch `MATRIZ` before products.

The data file SHALL be regenerable from `INVENTARIO AGRISAS 2.0.xlsx` via `prisma/seeds/data/generate-inventory-data.ts`. The generator SHALL exit with code 1 if the source spreadsheet is missing or has no `/precio/i` columns.

#### Scenario: Seeder runs successfully
- **WHEN** `npm run seed:inventory` is run with the embedded data present
- **THEN** the script completes with exit code 0, upserts departments + `MATRIZ`, and prints a summary of products, prices and inventory

#### Scenario: Generator exits when source spreadsheet missing
- **WHEN** the generator runs without `INVENTARIO AGRISAS 2.0.xlsx`
- **THEN** the process exits with code 1 and prints a clear error with the expected path

---

### Requirement: Multiple price tiers per product
For each product, the system SHALL upsert one `ProductPrice` per price column detected (`/precio/i`) in the source. The column matching `/publico/i` (`Precio Publico`) SHALL be the default (`isDefault=true`) and SHALL always be created even when its value is `0`. Other tiers SHALL be created only when their value is `> 0`. The system SHALL enforce a single `isDefault=true` per product, clearing any prior default and removing the legacy placeholder `name="Default"` before upserting, consistent with the partial unique index `product_default_price_idx`.

#### Scenario: Product with several price columns
- **WHEN** the seeder processes a product with `Precio Publico=1562.64`, `Precio Subdis 10%=1426.76`, `Precio Distri 15%=0`, `Precio 4=null`
- **THEN** it creates exactly two prices: `Precio Publico` (`isDefault=true`) and `Precio Subdis 10%` (`isDefault=false`); the `0`/null tiers are skipped

#### Scenario: Re-run does not violate the default index
- **WHEN** the seeder runs again on a DB that already has a default price (incl. the legacy `"Default"` placeholder)
- **THEN** it clears the prior default and removes `"Default"` before upserting, so no `23505` unique-violation occurs and only `Precio Publico` remains default

---

### Requirement: Product SAT code
The system SHALL set `Product.satProductCode` from the source `Codigo SAT` column as an 8-digit string. When the value is missing or does not match `^\d{8}$`, `satProductCode` SHALL be `null`.

#### Scenario: Valid SAT code
- **WHEN** a product row has `Codigo SAT=10171600`
- **THEN** the product is upserted with `satProductCode="10171600"`

#### Scenario: Missing SAT code
- **WHEN** a product row has no `Codigo SAT`
- **THEN** the product is upserted with `satProductCode=null`

---

### Requirement: Initial inventory in headquarters
The system SHALL upsert one `BranchInventory` row per product in the `MATRIZ` branch, with `quantity` taken from the source `Existencia` column (defaulting to `0` when absent). Negative and zero quantities SHALL be allowed.

#### Scenario: Existencia loaded as quantity
- **WHEN** a product row has `Existencia=16`
- **THEN** a `BranchInventory` row for `(MATRIZ, product)` is upserted with `quantity=16`

#### Scenario: Negative existencia allowed
- **WHEN** a product row has `Existencia=-1`
- **THEN** the `BranchInventory` row is upserted with `quantity=-1` (no error)

---

### Requirement: Idempotent upsert logic
For each product in the data file, the system SHALL perform `upsert` by `code`. On first run: `create` the product and its prices. On subsequent runs: `update` editable fields (`name`, `unit`, `ivaRate`, `iepsRate`, `isTaxable`, `isActive`) WITHOUT overwriting `code` or `departmentId` if the department lookup fails. For each `ProductPrice`, SHALL upsert by `(productId, name)`. SHALL NOT delete any product or price not in the data file.

#### Scenario: First run creates records
- **WHEN** the seeder runs on an empty DB
- **THEN** all products and prices in the data file are created; report shows N created, 0 updated

#### Scenario: Second run updates records
- **WHEN** the seeder runs again without data changes
- **THEN** all products and prices are upserted; report shows 0 created, N updated (or 0 updated if unchanged)

#### Scenario: Department not found skips product
- **WHEN** a product's `departmentCode` has no match in `departments`
- **THEN** the product is skipped (not errored), count increments `skipped`, and reason is printed

---

### Requirement: Seeder report
The seeder SHALL print a summary to stdout: products `created`, `updated`, `skipped`, `errors`; prices `created`, `updated`, `errors`. Each `errors` entry SHALL include the product `code` and the error message.

#### Scenario: Report format
- **WHEN** the seeder finishes
- **THEN** stdout contains a table or list with at minimum: "Productos — Creados: X | Actualizados: Y | Omitidos: Z | Errores: W" and "Precios — Creados: A | Actualizados: B | Errores: C"

---

### Requirement: Idempotent upserts with per-product isolation
The system SHALL perform idempotent upserts per product WITHOUT wrapping them in a database transaction (the full catalog exceeds Prisma's interactive-transaction timeout over the pooler). A failure on one product, price or inventory row SHALL be caught, counted in `errors`, and SHALL NOT abort the seeder; processing continues with the next row.

#### Scenario: One bad product does not abort entire seeder
- **WHEN** one product in the middle of the data has invalid data causing a DB constraint error
- **THEN** the seeder logs the error for that product and continues processing the remaining products

---

### Requirement: Folios Seed Script Existence

El sistema SHALL proveer un script TypeScript en `prisma/seeds/folios.ts` invocable mediante `npm run seed:folios`, que materializa el catálogo canónico de 8 folios del cliente. El script SHALL ser independiente del seed RBAC (`prisma/seed.ts`) y del seed de inventario (`prisma/seeds/inventory.ts`).

#### Scenario: Script ejecutable con un comando

- **WHEN** el operador ejecuta `npm run seed:folios` desde la raíz del repo
- **THEN** el script abre una conexión Prisma, ejecuta la rutina de upsert/borrado y al finalizar imprime un resumen estructurado con conteos `{ canonicalUpserted, legacyDeleted, abortedReferences? }`

#### Scenario: Sin variables de entorno DB

- **WHEN** `DATABASE_URL` o `DIRECT_URL` no están definidos
- **THEN** el script falla en startup con mensaje claro

---

### Requirement: Canonical Folios List

El script SHALL definir como constante en código el conjunto canónico de 8 folios con los siguientes campos exactos:

| code | name | prefix | scope |
|---|---|---|---|
| TK | Folio de Venta Efectivo | TK- | POS |
| TC | Folio de Venta Crédito | TC- | POS |
| COT | Cotización | COT- | POS |
| TS | Traspaso entre inventarios | TS- | INVENTORY |
| RB | Recibo de Pago - Cobranza | RB- | OPERATIONS |
| AB | Cobranza/Abono | AB- | OPERATIONS |
| DEV | Devolución | DEV- | OPERATIONS |
| CP | Compras | CP- | OPERATIONS |

Cada folio canónico SHALL crearse con `isActive=true`. Modificar la lista requiere editar el script y abrir una nueva propuesta OpenSpec.

#### Scenario: Resultado tras corrida limpia

- **WHEN** `npm run seed:folios` corre sobre una DB sin folios
- **THEN** tras la ejecución existen exactamente 8 filas en `folios`, una por cada code canónico, todas con `isActive=true` y `currentNumber=0`

---

### Requirement: Folios Seed Idempotency

El script SHALL ser idempotente: re-ejecutarlo no SHALL duplicar registros ni resetear `current_number` de folios ya existentes. Para cada folio canónico, el `upsert` SHALL aplicar `create` con `currentNumber: 0` solo cuando el registro NO existía; en el branch `update`, SHALL actualizar `name`, `prefix`, `scope`, `isActive` pero NUNCA `currentNumber`.

#### Scenario: Re-corrida preserva current_number

- **WHEN** el folio `COT` existe con `currentNumber=523` y se ejecuta `npm run seed:folios`
- **THEN** tras la ejecución `COT.currentNumber` sigue siendo `523`

#### Scenario: Re-corrida actualiza metadata

- **WHEN** el folio `RB` existe con `name="Recibo viejo"` y se ejecuta el seed
- **THEN** tras la ejecución `RB.name = "Recibo de Pago - Cobranza"` y `RB.scope='OPERATIONS'`

---

### Requirement: Legacy Folio Deletion Policy

El script SHALL identificar todos los folios cuyo `code` NO está en la lista canónica y aplicar la siguiente política para cada uno:

1. Consultar la cuenta de referencias FK: `_count.sales + _count.quotes + _count.payments`.
2. Si el conteo total es `0`: ejecutar `prisma.folio.delete({ where: { id } })`.
3. Si el conteo total es `> 0`: NO borrar; agregar el folio a una lista `abortedReferences` con `{ code, sales, quotes, payments }`.

Al finalizar el barrido, si `abortedReferences.length > 0`, el script SHALL imprimir cada entrada en stderr junto con el mensaje "Folio <code> tiene N referencias activas; migra manualmente o limpia antes de re-correr" y SHALL salir con `process.exit(1)` SIN haber upserteado los folios canónicos (la fase de upsert solo corre si la fase de borrado fue exitosa).

#### Scenario: Borrar folio legacy sin referencias

- **WHEN** existe un folio `FAC_A` (no canónico) con `_count.sales=0`, `_count.quotes=0`, `_count.payments=0`
- **THEN** el script lo elimina y reporta `legacyDeleted: 1` (entre otros)

#### Scenario: Folio legacy con referencias bloquea el seed

- **WHEN** existe el folio `RECIBO` (no canónico) con `_count.payments=42`
- **THEN** el script imprime "Folio RECIBO tiene 42 referencias activas (sales: 0, quotes: 0, payments: 42); migra manualmente o limpia antes de re-correr"
- **AND** sale con código de salida `1`
- **AND** NO upsertea los folios canónicos en esa corrida (la DB queda en el estado previo)

#### Scenario: Múltiples folios legacy mezclados

- **WHEN** existen 3 folios no canónicos: `FAC_A` (sin refs), `FAC_B` (con 5 quotes), `RECIBO` (con 42 payments)
- **THEN** el script reporta `abortedReferences: [{code:"FAC_B", quotes:5}, {code:"RECIBO", payments:42}]` y NO borra `FAC_A` (porque la fase de borrado se aborta antes del primer `delete` cuando se detecta cualquier `abortedReference`)

---

### Requirement: Folios Seed Reporting

El script SHALL imprimir al finalizar un resumen estructurado con: `{ canonicalUpserted: number, canonicalCreated: number, canonicalUpdated: number, legacyDeleted: number, abortedReferences: Array<{code, sales, quotes, payments}> }`. En caso de éxito SHALL salir con código `0`; en caso de error (FKs activas, fallo Prisma, env vars faltantes) SHALL salir con código `1`.

#### Scenario: Resumen exitoso

- **WHEN** el seed corre y procesa los 8 canónicos sin folios legacy bloqueando
- **THEN** stdout incluye al menos `canonicalUpserted: 8` y `legacyDeleted: 0` (o el conteo real) y `abortedReferences: []`

#### Scenario: Resumen con fallo por referencias

- **WHEN** el seed aborta por `abortedReferences`
- **THEN** stderr incluye cada entrada con su detalle y el código de salida es `1`

---

### Requirement: Folios Seed Independence from RBAC Seed

El seed `prisma/seed.ts` (RBAC) NO SHALL gestionar el folio `RECIBO` ni ningún otro folio. Toda lógica de upsert/delete de folios SHALL vivir exclusivamente en `prisma/seeds/folios.ts`.

#### Scenario: RBAC seed no menciona folios

- **WHEN** se inspecciona `prisma/seed.ts` tras la implementación de este change
- **THEN** el archivo NO contiene llamadas a `prisma.folio.*`

#### Scenario: RBAC seed sigue gestionando paymentMethod CREDITO

- **WHEN** se ejecuta `npm run seed` (RBAC)
- **THEN** el folio `RECIBO` NO se crea ni se modifica; el `paymentMethod CREDITO` sigue siendo gestionado por este seed (sin cambio)

---

### Requirement: Folios Seed Script in package.json

`package.json` SHALL declarar el script `seed:folios` apuntando al ejecutor TypeScript (ts-node o tsx) con `prisma/seeds/folios.ts`.

#### Scenario: Script presente en package.json

- **WHEN** se inspecciona la sección `scripts` de `package.json`
- **THEN** existe la entrada `"seed:folios": "ts-node prisma/seeds/folios.ts"` (o equivalente con `tsx`)
