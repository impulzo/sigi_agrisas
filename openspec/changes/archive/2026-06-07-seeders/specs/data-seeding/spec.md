## ADDED Requirements

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

### Requirement: Excel Schema Validation

El script SHALL validar al inicio que la hoja `Hoja1` contiene exactamente las cabeceras esperadas (`CLAVE`, `Nombre`, `Unidad`, `SerLibres`, `Iva`, `Ieps`, `NombreDepartamento`) antes de procesar filas.

#### Scenario: Cabeceras esperadas presentes

- **WHEN** la hoja `Hoja1` contiene las 7 cabeceras esperadas en cualquier orden
- **THEN** el script procede a procesar las filas de datos

#### Scenario: Cabecera faltante

- **WHEN** una de las cabeceras esperadas (`CLAVE`, `Nombre`, `Iva`, `Ieps`, `NombreDepartamento`) no aparece en la primera fila
- **THEN** el script aborta con error indicando qué cabecera falta
- **AND** no realiza ningún cambio en la base de datos

### Requirement: Row Filtering for Section Headers

El script SHALL omitir las filas del Excel que sólo contienen valor en la columna `CLAVE` y todas las demás columnas (`Nombre`, `Unidad`, `Iva`, `Ieps`, `NombreDepartamento`) vacías. Estas filas se interpretan como encabezados de sección y no son productos válidos.

#### Scenario: Fila con sólo CLAVE poblada

- **WHEN** una fila tiene `CLAVE = "EL AGRICULTOR "` y `Nombre`/`Unidad`/`Iva`/`Ieps`/`NombreDepartamento` vacíos
- **THEN** el script la cuenta como "encabezado de sección" y la omite sin sembrar

#### Scenario: Fila con Nombre vacío

- **WHEN** una fila tiene `Nombre` vacío o whitespace-only
- **THEN** el script la cuenta como "fila sin nombre", la omite, e imprime un warning con el número de fila

### Requirement: SerLibres Column Ignored

El script SHALL ignorar por completo la columna `SerLibres` del Excel. Ningún campo del esquema Prisma se deriva de este valor.

#### Scenario: Columna SerLibres presente

- **WHEN** una fila válida del Excel tiene `SerLibres = 0` (o cualquier otro valor)
- **THEN** el script no usa ese valor en la creación/actualización del producto

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

### Requirement: Product Code Collision Detection

El script SHALL mantener un `Set` de codes ya procesados en la corrida actual. Si dos filas distintas normalizan al mismo `code`, la segunda SHALL omitirse con `console.warn` que incluya ambas filas y CLAVES crudas. El primer registro "gana" (first-wins); el segundo no se inserta ni reemplaza al primero.

#### Scenario: Dos CLAVES distintas colisionan al normalizar

- **WHEN** la fila 100 tiene `CLAVE = "FOO-BAR"` (normaliza a `FOO_BAR`) y la fila 250 tiene `CLAVE = "FOO BAR"` (normaliza también a `FOO_BAR`)
- **THEN** la fila 100 se upserta con `code="FOO_BAR"`
- **AND** la fila 250 se omite, se imprime warning indicando la colisión con la fila 100, e incrementa `collisionsSkipped` y `productsSkipped`

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

### Requirement: Default Price Placeholder

El script SHALL garantizar que cada producto sembrado tenga al menos un `ProductPrice` con `name="Default"`, `price=0`, `minQuantity=1`, `discountPct=null`, `isDefault=true`. NO SHALL sobre-escribir precios default ya capturados por el operador.

#### Scenario: Producto sin precios previos

- **WHEN** el script siembra un producto nuevo o uno que no tiene ningún `ProductPrice` con `isDefault=true`
- **THEN** crea un `ProductPrice` con `name="Default"`, `price=Decimal("0.0000")`, `minQuantity=1`, `discountPct=null`, `isDefault=true`, vinculado al `productId` recién creado/actualizado

#### Scenario: Producto con precio default existente

- **WHEN** el seed se re-ejecuta y el producto ya tiene un `ProductPrice` con `isDefault=true` (sea el placeholder o uno capturado manualmente)
- **THEN** el script no modifica ese precio existente ni crea uno adicional

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

### Requirement: Initial BranchInventory in Zero

El script SHALL crear un registro `BranchInventory` por cada par `(branchMatriz.id, product.id)` con `quantity=0`, `reservedQuantity=0`, `reorderPoint=0`. En re-ejecuciones, NO SHALL modificar las cantidades de registros ya existentes (no pisar stock real ya ajustado).

#### Scenario: Producto sin registro previo de inventario en matriz

- **WHEN** el script siembra un producto y no existe `BranchInventory(branchId=matriz.id, productId=product.id)`
- **THEN** crea el registro con `quantity=0`, `reservedQuantity=0`, `reorderPoint=0`

#### Scenario: Registro de inventario ya existe con stock real

- **WHEN** el seed se re-ejecuta y `BranchInventory(branchId=matriz.id, productId=product.id)` ya tiene `quantity=42`
- **THEN** el script no modifica `quantity`, `reservedQuantity` ni `reorderPoint`

### Requirement: Run Summary Report

El script SHALL imprimir al final un resumen estructurado en consola con los siguientes contadores: departamentos procesados (created vs updated), sucursal matriz (created vs updated), productos válidos sembrados, filas saltadas por código inválido o nombre vacío, precios placeholder garantizados, registros de BranchInventory creados.

#### Scenario: Ejecución completa exitosa

- **WHEN** el script termina sin errores fatales sobre el Excel actual del cliente
- **THEN** imprime conteos como: "Departments: 35 upserted | Branch MATRIZ: 1 upserted (isHeadquarters=true) | Products: 491 upserted, 0 skipped | ProductPrices default ensured: 491 | BranchInventory rows: 491 upserted"

#### Scenario: Ejecución con filas saltadas

- **WHEN** alguna fila tiene `CLAVE` inválida y se omite
- **THEN** el resumen incluye `Products: N upserted, M skipped` con M > 0
- **AND** cada fila saltada fue reportada individualmente vía `console.warn` durante la corrida

### Requirement: Re-runnable Idempotency

El script SHALL ser seguro de ejecutar múltiples veces consecutivas sin generar duplicados ni perder datos manuales (precios capturados, stock ajustado).

#### Scenario: Doble ejecución consecutiva

- **WHEN** el operador ejecuta `npm run seed:inventory` dos veces seguidas sobre la misma DB
- **THEN** la segunda corrida no incrementa el conteo de filas en `departments`, `branches`, `products`, `product_prices` ni `branch_inventory`
- **AND** no falla con errores de unique constraint
