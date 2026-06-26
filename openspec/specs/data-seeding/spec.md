# data-seeding

## Purpose

Especificaciones para los scripts de siembra de datos iniciales del sistema. Cubre la carga del catálogo del cliente (departamentos, productos, precios placeholder, sucursal matriz e inventario inicial) desde fuentes externas (Excel) hacia la base de datos Postgres vía Prisma.

---

## Requirements

### Requirement: Inventory Seed Script Existence

El sistema SHALL proveer un script TypeScript en `prisma/seeds/inventory.ts` invocable mediante `npm run seed:inventory`, que carga el catálogo del cliente (departamentos, productos, precios placeholder, sucursal matriz e inventario inicial) desde el archivo `INVENTARIO PARA SISTEMA NUEVO.xlsx` ubicado en la raíz del proyecto.

#### Scenario: Script ejecutable con un comando

- **WHEN** el operador ejecuta `npm run seed:inventory` desde la raíz del repo
- **THEN** el script carga el workbook, valida el esquema esperado de 7 columnas (`CLAVE`, `Nombre`, `Unidad`, `SerLibres`, `Iva`, `Ieps`, `NombreDepartamento`) e inicia la siembra
- **AND** imprime un resumen final con conteos de departamentos, productos, precios, sucursales e inventario afectados

#### Scenario: Archivo Excel ausente

- **WHEN** el archivo `INVENTARIO PARA SISTEMA NUEVO.xlsx` no existe en la ruta esperada
- **THEN** el script falla con código de salida distinto de cero y mensaje claro indicando la ruta faltante
- **AND** no realiza ningún cambio en la base de datos

---

### Requirement: Excel Schema Validation

El script SHALL validar al inicio que la hoja `Hoja1` contiene exactamente las cabeceras esperadas (`CLAVE`, `Nombre`, `Unidad`, `SerLibres`, `Iva`, `Ieps`, `NombreDepartamento`) antes de procesar filas.

#### Scenario: Cabeceras esperadas presentes

- **WHEN** la hoja `Hoja1` contiene las 7 cabeceras esperadas en cualquier orden
- **THEN** el script procede a procesar las filas de datos

#### Scenario: Cabecera faltante

- **WHEN** una de las cabeceras esperadas (`CLAVE`, `Nombre`, `Iva`, `Ieps`, `NombreDepartamento`) no aparece en la primera fila
- **THEN** el script aborta con error indicando qué cabecera falta
- **AND** no realiza ningún cambio en la base de datos

---

### Requirement: Row Filtering for Section Headers

El script SHALL omitir las filas del Excel que sólo contienen valor en la columna `CLAVE` y todas las demás columnas (`Nombre`, `Unidad`, `Iva`, `Ieps`, `NombreDepartamento`) vacías. Estas filas se interpretan como encabezados de sección y no son productos válidos.

#### Scenario: Fila con sólo CLAVE poblada

- **WHEN** una fila tiene `CLAVE = "EL AGRICULTOR "` y `Nombre`/`Unidad`/`Iva`/`Ieps`/`NombreDepartamento` vacíos
- **THEN** el script la cuenta como "encabezado de sección" y la omite sin sembrar

#### Scenario: Fila con Nombre vacío

- **WHEN** una fila tiene `Nombre` vacío o whitespace-only
- **THEN** el script la cuenta como "fila sin nombre", la omite, e imprime un warning con el número de fila

---

### Requirement: SerLibres Column Ignored

El script SHALL ignorar por completo la columna `SerLibres` del Excel. Ningún campo del esquema Prisma se deriva de este valor.

#### Scenario: Columna SerLibres presente

- **WHEN** una fila válida del Excel tiene `SerLibres = 0` (o cualquier otro valor)
- **THEN** el script no usa ese valor en la creación/actualización del producto

---

### Requirement: Department Seeding

El script SHALL sembrar un registro `Department` por cada valor único de la columna `NombreDepartamento` del Excel. El `code` del departamento se deriva del nombre normalizando: descomposición Unicode NFD → strip de diacríticos → `trim` → `toUpperCase` → reemplazo de espacios y guiones por `_` → truncado a 32 caracteres. El `name` preserva el valor original del Excel.

#### Scenario: Departamento nuevo

- **WHEN** el Excel contiene `NombreDepartamento = "INNOVAK GLOBAL"` y no existe registro con `code = "INNOVAK_GLOBAL"`
- **THEN** el script crea un `Department` con `code="INNOVAK_GLOBAL"`, `name="INNOVAK GLOBAL"`, `description=null`, `isActive=true`

#### Scenario: Departamento existente (idempotencia)

- **WHEN** el seed se re-ejecuta y `Department(code="INNOVAK_GLOBAL")` ya existe
- **THEN** el script actualiza `name` e `isActive=true` sin crear duplicado
- **AND** el conteo "created" no incrementa para este departamento

#### Scenario: Código de departamento inválido tras normalización

- **WHEN** un nombre de departamento, tras la normalización, no matchea `^[A-Z0-9_]{1,32}$`
- **THEN** el script aborta con error indicando el nombre original y el code resultante inválido

---

### Requirement: Product Code Soft Normalization

El script SHALL derivar el `code` del producto desde la `CLAVE` del Excel mediante una normalización suave: descomposición Unicode NFD → strip de diacríticos (`Ñ → N`) → `trim` → `toUpperCase` → reemplazo de espacios y guiones por `_` → eliminación de asteriscos `*` → eliminación de cualquier carácter restante fuera de `[A-Z0-9_]` → truncado a 32 caracteres. El resultado SHALL validarse contra `^[A-Z0-9_]{1,32}$`. Las filas cuya `CLAVE` resulte en un code vacío o no matchee la regex tras normalizar SHALL omitirse con `console.warn` indicando el número de fila y la `CLAVE` cruda. Cuando la normalización modifica el code (raw ≠ normalizado), el script SHALL emitir un `console.warn` informativo con el mapeo `CLAVE → code`.

#### Scenario: CLAVE válida sin caracteres especiales

- **WHEN** una fila tiene `CLAVE = "activa1"`, `Nombre = "ACTIVANE 1KG"`, `Iva = 0`, `Ieps = 0`, `NombreDepartamento = "AGRICULTOR"`
- **THEN** el script upserta un `Product` con `code="ACTIVA1"`, `name="ACTIVANE 1KG"`, `unit="PZA"`, `ivaRate=0`, `iepsRate=0`, `departmentId` resuelto a "AGRICULTOR", `isActive=true`, `satProductCode=null`
- **AND** no emite warning de normalización

#### Scenario: CLAVE con guión

- **WHEN** una fila tiene `CLAVE = "BIOMO-OUT"`
- **THEN** el script genera `code="BIOMO_OUT"`, upserta el producto, y emite warning informativo del mapeo

#### Scenario: CLAVE con asterisco prefijo

- **WHEN** una fila tiene `CLAVE = "*BIOSOUT"`
- **THEN** el script genera `code="BIOSOUT"`, upserta el producto, y emite warning informativo del mapeo

#### Scenario: CLAVE con diacrítico

- **WHEN** una fila tiene `CLAVE = "CAÑ-OUT"`
- **THEN** el script genera `code="CAN_OUT"` (strip diacrítico + guión → underscore), upserta el producto, y emite warning informativo del mapeo

#### Scenario: CLAVE vacía tras normalizar

- **WHEN** una fila tiene `CLAVE = "***"` (sólo caracteres que se eliminan)
- **THEN** el script no crea ni actualiza producto para esa fila
- **AND** imprime un warning con el número de fila y la `CLAVE` cruda
- **AND** incrementa el contador `productsSkipped`

#### Scenario: Idempotencia de producto

- **WHEN** el seed se re-ejecuta y `Product(code="ACTIVA1")` ya existe
- **THEN** el script actualiza `name`, `unit`, `ivaRate`, `iepsRate`, `departmentId`, `isActive=true` sobre el registro existente
- **AND** no crea un duplicado
- **AND** no modifica el `code` (es la llave inmutable)

---

### Requirement: Product Code Collision Detection

El script SHALL mantener un `Set` de codes ya procesados en la corrida actual. Si dos filas distintas normalizan al mismo `code`, la segunda SHALL omitirse con `console.warn` que incluya ambas filas y CLAVES crudas. El primer registro "gana" (first-wins); el segundo no se inserta ni reemplaza al primero.

#### Scenario: Dos CLAVES distintas colisionan al normalizar

- **WHEN** la fila 100 tiene `CLAVE = "FOO-BAR"` (normaliza a `FOO_BAR`) y la fila 250 tiene `CLAVE = "FOO BAR"` (normaliza también a `FOO_BAR`)
- **THEN** la fila 100 se upserta con `code="FOO_BAR"`
- **AND** la fila 250 se omite, se imprime warning indicando la colisión con la fila 100, e incrementa `collisionsSkipped` y `productsSkipped`

---

### Requirement: IVA and IEPS Rate Normalization

El script SHALL convertir los valores de las columnas `Iva` e `Ieps` del Excel (porcentajes enteros) a tasas decimales `[0, 1]` dividiendo entre 100 y usando `Prisma.Decimal` con 4 decimales de precisión.

#### Scenario: IVA del 16%

- **WHEN** una fila tiene `Iva = 16`
- **THEN** el `Product.ivaRate` sembrado es `Decimal("0.1600")`

#### Scenario: IEPS del 6%

- **WHEN** una fila tiene `Ieps = 6`
- **THEN** el `Product.iepsRate` sembrado es `Decimal("0.0600")`

#### Scenario: Iva o Ieps vacío o null

- **WHEN** una fila tiene `Iva` vacío o `null`
- **THEN** el `Product.ivaRate` se siembra como `Decimal("0.0000")`

---

### Requirement: Default Price Placeholder

El script SHALL garantizar que cada producto sembrado tenga al menos un `ProductPrice` con `name="Default"`, `price=0`, `minQuantity=1`, `discountPct=null`, `isDefault=true`. NO SHALL sobre-escribir precios default ya capturados por el operador.

#### Scenario: Producto sin precios previos

- **WHEN** el script siembra un producto nuevo o uno que no tiene ningún `ProductPrice` con `isDefault=true`
- **THEN** crea un `ProductPrice` con `name="Default"`, `price=Decimal("0.0000")`, `minQuantity=1`, `discountPct=null`, `isDefault=true`, vinculado al `productId` recién creado/actualizado

#### Scenario: Producto con precio default existente

- **WHEN** el seed se re-ejecuta y el producto ya tiene un `ProductPrice` con `isDefault=true` (sea el placeholder o uno capturado manualmente)
- **THEN** el script no modifica ese precio existente ni crea uno adicional

---

### Requirement: Headquarters Branch Seeding

El script SHALL crear/actualizar exactamente una sucursal con `code="MATRIZ"`, `name="Matriz"`, `address=null`, `phone=null`, `email=null`, `isHeadquarters=true`, `isActive=true`. Si ya existe otra sucursal con `isHeadquarters=true` y `code` distinto a `MATRIZ`, el script SHALL abortar con error explícito.

#### Scenario: No existe ninguna HQ previa

- **WHEN** el seed se ejecuta sobre una DB sin sucursales HQ
- **THEN** crea `Branch(code="MATRIZ", name="Matriz", isHeadquarters=true, isActive=true)`

#### Scenario: HQ "MATRIZ" ya existe

- **WHEN** el seed se re-ejecuta y `Branch(code="MATRIZ")` ya existe
- **THEN** actualiza `isHeadquarters=true` e `isActive=true` sin crear duplicado

#### Scenario: Otra HQ con code distinto ya existe

- **WHEN** ya existe `Branch(code="CENTRAL", isHeadquarters=true)` en la DB
- **THEN** el script aborta con error indicando "Another branch is already marked as headquarters: CENTRAL" y no realiza más cambios

---

### Requirement: Initial BranchInventory in Zero

El script SHALL crear un registro `BranchInventory` por cada par `(branchMatriz.id, product.id)` con `quantity=0`, `reservedQuantity=0`, `reorderPoint=0`. En re-ejecuciones, NO SHALL modificar las cantidades de registros ya existentes (no pisar stock real ya ajustado).

#### Scenario: Producto sin registro previo de inventario en matriz

- **WHEN** el script siembra un producto y no existe `BranchInventory(branchId=matriz.id, productId=product.id)`
- **THEN** crea el registro con `quantity=0`, `reservedQuantity=0`, `reorderPoint=0`

#### Scenario: Registro de inventario ya existe con stock real

- **WHEN** el seed se re-ejecuta y `BranchInventory(branchId=matriz.id, productId=product.id)` ya tiene `quantity=42`
- **THEN** el script no modifica `quantity`, `reservedQuantity` ni `reorderPoint`

---

### Requirement: Run Summary Report

El script SHALL imprimir al final un resumen estructurado en consola con los siguientes contadores: departamentos procesados (created vs updated), sucursal matriz (created vs updated), productos válidos sembrados, filas saltadas por código inválido o nombre vacío, precios placeholder garantizados, registros de BranchInventory creados.

#### Scenario: Ejecución completa exitosa

- **WHEN** el script termina sin errores fatales sobre el Excel actual del cliente
- **THEN** imprime conteos como: "Departments: 35 upserted | Branch MATRIZ: 1 upserted (isHeadquarters=true) | Products: 491 upserted, 0 skipped | ProductPrices default ensured: 491 | BranchInventory rows: 491 upserted"

#### Scenario: Ejecución con filas saltadas

- **WHEN** alguna fila tiene `CLAVE` inválida y se omite
- **THEN** el resumen incluye `Products: N upserted, M skipped` con M > 0
- **AND** cada fila saltada fue reportada individualmente vía `console.warn` durante la corrida

---

### Requirement: Re-runnable Idempotency

El script SHALL ser seguro de ejecutar múltiples veces consecutivas sin generar duplicados ni perder datos manuales (precios capturados, stock ajustado).

#### Scenario: Doble ejecución consecutiva

- **WHEN** el operador ejecuta `npm run seed:inventory` dos veces seguidas sobre la misma DB
- **THEN** la segunda corrida no incrementa el conteo de filas en `departments`, `branches`, `products`, `product_prices` ni `branch_inventory`
- **AND** no falla con errores de unique constraint

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
