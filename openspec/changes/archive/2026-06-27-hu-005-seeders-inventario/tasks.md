## 1. Datos embebidos + generador

- [x] 1.1 `prisma/seeds/lib/normalize.ts`: extraer `normalizeProductCode`/`normalizeDepartmentCode`/`isBlank`/`CODE_REGEX` (reuso generador)
- [x] 1.2 `prisma/seeds/data/generate-inventory-data.ts`: lee `INVENTARIO AGRISAS 2.0.xlsx`, detecta columnas `/precio/i`, salta headers de sección, dedup de codes, divide Iva/Ieps `/100`, escribe el TS
- [x] 1.3 Tipo `InventoryRow { code, name, unit, departmentCode, departmentName, satProductCode?, ivaRate?, iepsRate?, isTaxable?, quantity?, prices: { name, price, isDefault? }[] }` + `DepartmentRow { code, name }`
- [x] 1.4 Generar `inventario-agrisas-v2.ts` con datos reales (582 productos, 40 departamentos; 622 era el conteo bruto de filas Excel antes de dedup/skip)
- [x] 1.5 `package.json` ya tiene `seed:inventory`

## 2. Engine `lib/inventorySeedLogic.ts`

- [x] 2.1 Map `departmentCode` → `departmentId` desde `findMany`; productos con dept no encontrado → `skipped`
- [x] 2.2 Upsert de `Product` por `code` incluyendo `satProductCode` (null si falta)
- [x] 2.3 Múltiples `ProductPrice` por producto: un tier por columna; `Precio Publico` default (siempre); tiers extra solo si `> 0`
- [x] 2.4 Enforce single default: `updateMany(isDefault→false)` + `deleteMany(name="Default")` antes de upsertar precios (índice `product_default_price_idx`)
- [x] 2.5 Validar un solo `isDefault` desde el archivo (primero gana, resto warning)
- [x] 2.6 Upsert `BranchInventory` con `quantity` (desde `Existencia`, default 0; permite negativos) en la sucursal destino
- [x] 2.7 Upserts idempotentes SIN `$transaction` (excede timeout de tx interactiva); try/catch por producto/precio/inventario

## 3. Orquestador `inventory.ts`

- [x] 3.1 Sin lectura de Excel; importa `INVENTORY_DATA` + `DEPARTMENTS`
- [x] 3.2 Upsert de los 40 departamentos por `code`
- [x] 3.3 Upsert sucursal `MATRIZ` (guard de HQ conflictiva)
- [x] 3.4 Delegar a `seedInventory(prisma, INVENTORY_DATA, { branchId: matriz.id })`

## 4. Reporte

- [x] 4.1 Contadores `{ products, prices, inventory }` (created/updated/skipped/errors)
- [x] 4.2 `printSeedReport`: resumen de productos, precios e inventario
- [x] 4.3 Detalle de errores (code + mensaje)

## 5. Tests `tests/unit/modules/seeds/inventorySeedLogic.test.ts`

- [x] 5.1 Primera ejecución → all created
- [x] 5.2 Segunda ejecución → all updated, 0 created
- [x] 5.3 departmentCode inválido → skipped, no error
- [x] 5.4 Error en un producto → contado, siguiente se procesa
- [x] 5.5 Single default enforcement (updateMany + deleteMany "Default")
- [x] 5.6 `satProductCode` propagado / null cuando falta
- [x] 5.7 `BranchInventory` upsert con `quantity` (16 / default 0)

## 6. Verificación

- [x] 6.1 `npm run seed:inventory` contra BD dev → reporte coherente, re-run idempotente sin `23505`
- [x] 6.2 Spot-check `ACTIVA1`: Precio Publico=1562.64 (default) + Precio Subdis 10%=1426.76, SAT 10171600, quantity 16
