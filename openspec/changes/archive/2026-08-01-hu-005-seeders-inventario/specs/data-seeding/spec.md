## ADDED Requirements

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
