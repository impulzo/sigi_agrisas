## ADDED Requirements

### Requirement: Generador offline de inventario multi-sucursal
El sistema SHALL proveer un generador `prisma/seeds/data/generate-inventario-tiendas-data.ts` que lea las 6 hojas de `INVENTARIOS TIENDAS.xlsx` (`INV AGRISAS`, `INV CHICHICAPAM`, `INV TLAXIACO`, `INV ZARIOZ`, `INV HUAJUAPAN`, `INV PRADERA`), cada una con su propio mapeo de columnas definido como constante explícita, NO por heurística de contenido en runtime. Para las 4 hojas de tienda con code alfanumérico alineado al catálogo (`INV CHICHICAPAM`, `INV ZARIOZ`, `INV HUAJUAPAN`, `INV PRADERA`), el generador SHALL emitir filas `{code, name, unit, satCode, price, departmentName, branchCode}`; filas cuyo código está vacío y cuya columna de unidad también está vacía (marcador de sección, ej. `INSUMOS`, `AGRINOVA`, `INNOVAK`, tomado de la columna de nombre de esa fila) SHALL actualizar el departamento vigente para las filas siguientes de esa hoja, y NO SHALL emitirse como fila de producto. Para `INV AGRISAS`, el generador SHALL emitir filas en forma extendida `{code, name, unit, satCode, departmentName, ivaRaw, iepsRaw, existencia, prices: [{tierName, value}]}` con un elemento en `prices` por cada columna `/precio/i` de la hoja (incluyendo tiers en `0`). Para `INV TLAXIACO`, el generador SHALL emitir filas `{tlaxiacoRawCode, name, unit, satCode, price, departmentName, branchCode: "TLAXIACO"}`, con el `code` numérico original preservado sin alterar en `tlaxiacoRawCode` (nunca usado como `Product.code`), precio normalizado desde el formato string con símbolo de moneda (ej. `"$18.00"` → `18`), y `departmentName` con `"- Sin Departamento -"` (o variante vacía) normalizado a `null`. Filas totalmente vacías (separadores) SHALL ignorarse sin abortar el parseo del resto de la hoja. El generador SHALL salir con código `1` si `INVENTARIOS TIENDAS.xlsx` no existe en la ruta esperada, o si alguna de las 6 hojas no matchea su mapeo de columnas esperado.

#### Scenario: Fila de sección actualiza el departamento vigente
- **WHEN** el generador procesa la hoja `INV CHICHICAPAM` y encuentra una fila con sólo `"AGRINOVA"` en la columna de nombre (sin código de producto)
- **THEN** las filas de producto siguientes en esa hoja se emiten con `departmentName: "AGRINOVA"` hasta la próxima fila de sección
- **AND** la fila de sección en sí no aparece como producto en `inventario-tiendas-v3.ts`

#### Scenario: Fila de sección con código en columna desplazada actualiza el departamento
- **WHEN** el generador procesa la hoja `INV HUAJUAPAN` (layout desplazado una columna respecto a Zarioz/Chichicapam) y encuentra una fila con sólo `"INNOVAK"` en la columna de nombre configurada para esa hoja
- **THEN** las filas de producto siguientes en `INV HUAJUAPAN` se emiten con `departmentName: "INNOVAK"`

#### Scenario: Fila vacía no aborta el parseo de la hoja
- **WHEN** el generador encuentra una fila completamente vacía en medio de una hoja
- **THEN** la ignora y continúa procesando las filas siguientes de esa misma hoja sin error

#### Scenario: Agrisas emite multi-tier de precio con Iva/Ieps propios
- **WHEN** el generador procesa una fila de `INV AGRISAS` con `PRECIO PUBLICO=1562.64`, `PRECIO SUBDIS 10%=1426.76`, `PRECIO DISTRI 15%=0`, `Iva=0`, `Ieps=0`
- **THEN** la fila emitida trae `prices: [{tierName: "Precio Publico", value: 1562.64}, {tierName: "Precio Subdis 10%", value: 1426.76}]` (el tier en `0` no-default se omite) y `ivaRaw: 0, iepsRaw: 0`

#### Scenario: Tlaxiaco preserva su code numérico crudo sin usarlo como Product.code
- **WHEN** el generador procesa una fila de `INV TLAXIACO` con `CODIG0=7, Producto="ADAPTADOR HEMBRA", P. Venta="$18.00"`
- **THEN** la fila emitida trae `tlaxiacoRawCode: 7, name: "ADAPTADOR HEMBRA", price: 18` — sin ningún campo `code` alfanumérico asignado en esta etapa

#### Scenario: Tlaxiaco normaliza departamento vacío a null
- **WHEN** una fila de `INV TLAXIACO` trae `Departamento = "- Sin Departamento -"`
- **THEN** la fila emitida tiene `departmentName: null`

#### Scenario: Generador exits when source spreadsheet missing
- **WHEN** el generador corre sin `INVENTARIOS TIENDAS.xlsx` en la ruta esperada
- **THEN** el proceso sale con código `1` e imprime un error claro con la ruta esperada

### Requirement: Emparejamiento y auto-creación de producto por code
El seeder runtime `prisma/seeds/inventory-tiendas.ts` SHALL emparejar cada fila embebida contra el catálogo de `products` existente por `code` (misma normalización `CODE_REGEX` que usa `inventory.ts`). Cuando el `code` no exista en el catálogo, el sistema SHALL auto-crear el `Product` con `code`, `name`, `unit` de la fila; `departmentId` resuelto por nombre (upsert de `Department` si el nombre no existe todavía, mismo patrón que usa `inventory.ts` para `DEPARTMENTS`); `ivaRate`/`iepsRate` en `0` por defecto; `satProductCode` de la fila si matchea `^\d{8}$`, sino `null`. Cuando el `code` ya exista en el catálogo pero el `name` de la fila difiera del nombre catalogado, el sistema NO SHALL sobrescribir el nombre existente, y SHALL contar la fila como `nameMismatch` en el reporte de la corrida. Toda creación de producto SHALL usar `upsert` por `code`, no `create` puro. Un `code` inválido (no matchea `CODE_REGEX`) SHALL reportarse como `error` y esa fila SHALL omitirse, sin abortar la corrida completa.

#### Scenario: Producto nuevo se auto-crea con datos de la fila
- **WHEN** el seeder procesa una fila con `code: "BLO10"` que no existe en `products`
- **THEN** crea el `Product` con `code: "BLO10"`, `name`, `unit` de la fila, `departmentId` resuelto (creando el `Department` si hace falta), `ivaRate: 0`, `iepsRate: 0`

#### Scenario: Producto existente con nombre distinto no se sobrescribe
- **WHEN** el seeder procesa una fila con `code: "ACTIVA1"` cuyo `name` en el Excel difiere del `name` ya catalogado en `products`
- **THEN** el `Product.name` en base de datos permanece sin cambios
- **AND** la fila se cuenta en `nameMismatch` dentro del reporte

#### Scenario: Code inválido se omite sin abortar la corrida
- **WHEN** el seeder encuentra una fila con un `code` que no matchea `^[A-Z0-9_]{1,32}$`
- **THEN** esa fila se cuenta en `errors` y se omite
- **AND** el seeder continúa procesando las filas restantes de la corrida

### Requirement: Refresh del catálogo de Matriz desde INV AGRISAS
El seeder runtime SHALL emparejar cada fila de `INV AGRISAS` contra `products` por `code` exacto. Cuando el `code` exista, el sistema SHALL actualizar (`update`, no preservar) `name`, `unit`, `departmentId`, `satProductCode`, `ivaRate`, `iepsRate` del producto con los valores de la fila — a diferencia del comportamiento de no-sobrescritura de nombre usado para las 4 tiendas. `ivaRate`/`iepsRate` SHALL calcularse dividiendo el valor crudo de la fila entre 100. Cuando el `code` no exista, el sistema SHALL auto-crear el producto con el mismo criterio que la fila nueva de una tienda. Para cada tier de precio de la fila, el sistema SHALL hacer upsert de `ProductPrice` por `(productId, branchId: null, name: tierName)`: el tier que matchea `/publico/i` SHALL crearse siempre con `isDefault: true` aun si su valor es `0`; los demás tiers SHALL crearse sólo cuando su valor sea `> 0`. El sistema SHALL hacer upsert de `BranchInventory` para la sucursal `MATRIZ` con `quantity` igual a la existencia de la fila, sobrescribiendo siempre el valor existente.

#### Scenario: Producto existente en Matriz se refresca por completo
- **WHEN** el producto `code: "ACTIVA1"` ya existe con `name: "ACTIVANE 1KG (viejo)"` y la fila de `INV AGRISAS` trae `name: "ACTIVANE 1KG"`, `unit: "PZA"`, `ivaRate raw: 0`
- **THEN** tras la corrida, `Product.name = "ACTIVANE 1KG"` (SÍ se sobrescribe, a diferencia de las tiendas)

#### Scenario: Multi-tier de precio se sincroniza en el bucket base
- **WHEN** la fila de `INV AGRISAS` para `ACTIVA1` trae `PRECIO PUBLICO=1562.64` (nuevo valor) y `PRECIO SUBDIS 10%=1426.76`
- **THEN** `ProductPrice(productId, branchId: null, name: "Precio Publico").price = 1562.64, isDefault=true`
- **AND** `ProductPrice(productId, branchId: null, name: "Precio Subdis 10%").price = 1426.76`

#### Scenario: Inventario de Matriz se sobrescribe con la existencia del Excel
- **WHEN** `BranchInventory(branchId=MATRIZ, productId=X).quantity=16` en DB y la fila de `INV AGRISAS` trae `Existencia=20`
- **THEN** tras la corrida, `BranchInventory(branchId=MATRIZ, productId=X).quantity = 20`

### Requirement: Emparejamiento de Tlaxiaco por nombre normalizado
El seeder runtime SHALL normalizar el `name` de cada fila de `INV TLAXIACO` y de cada `products.name` existente mediante: descomposición `NFD` y remoción de diacríticos, `uppercase`, colapso de espacios múltiples, y remoción de los tokens completos `DE`, `CON`, `Y` (no como substring — sólo cuando aparecen como palabra separada). El sistema SHALL buscar un `product` cuyo `name` normalizado sea exactamente igual al `name` normalizado de la fila de Tlaxiaco. Cuando exista un match exacto, la fila SHALL tratarse con el `code`/`id` de ese producto, sin modificar `name`/`unit`/`departmentId` del producto (mismo criterio no-agresivo que las 4 tiendas). Cuando no exista match, el sistema SHALL sintetizar un `code` aplicando `normalizeProductCode()` (de `prisma/seeds/lib/normalize.ts`) sobre el `name` real de la fila (nunca sobre `tlaxiacoRawCode`), y auto-crear el producto con ese `code` sintetizado, resolviendo `departmentId` desde la columna `Departamento` explícita de la fila. Cuando el `code` sintetizado colisione con uno ya usado en la misma corrida para un producto distinto, el sistema SHALL contar la fila como `error` y omitirla, sin sobrescribir el producto existente.

#### Scenario: Nombre normalizado matchea producto existente pese a "DE" de relleno
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ALGAK DE 1L"` y existe `products.name: "ALGAK 1L"`
- **THEN** el seeder empareja la fila con ese producto existente y usa su `code` (`AK1`) para el resto del flujo (inventario/precio de `TLAXIACO`)

#### Scenario: Sin match, se sintetiza code del nombre real
- **WHEN** la fila de `INV TLAXIACO` trae `name: "BIO-FREEZE DE 1L"` y ningún producto en catálogo normaliza a ese mismo nombre
- **THEN** el seeder sintetiza `code` vía `normalizeProductCode("BIO-FREEZE DE 1L")` y auto-crea el producto con ese `code` — nunca usa el `tlaxiacoRawCode` original

#### Scenario: Colisión de code sintetizado se reporta sin sobrescribir
- **WHEN** dos filas de `INV TLAXIACO` con nombres distintos normalizan a un `code` sintetizado idéntico
- **THEN** la segunda fila procesada se cuenta como `error` y se omite; el producto creado por la primera fila permanece sin cambios

### Requirement: Upsert de sucursales e inventario multi-sucursal
El seeder runtime SHALL hacer upsert por `code` de las sucursales derivadas de las hojas del Excel que aún no existan en `branches` (mapeo fijo hoja→code, ej. `INV ZARIOZ` → `ZARIOZ`), con `isActive: true` e `isHeadquarters: false`, sin modificar el flag `isHeadquarters` de sucursales ya existentes (incluida `MATRIZ`). Para cada fila de producto emparejada (existente o recién creada), el sistema SHALL hacer upsert de `BranchInventory` por `(branchId, productId)` con `quantity` igual al valor de existencia de la fila — sobrescribiendo siempre el valor existente con el del Excel en cada corrida — tratando existencia vacía o no numérica como `0`, y creando la fila de inventario aun cuando `quantity` sea `0`.

#### Scenario: Sucursal nueva se crea vía upsert por code
- **WHEN** el seeder corre y `branches` no tiene ninguna fila con `code: "ZARIOZ"`
- **THEN** crea `Branch` con `code: "ZARIOZ"`, `isActive: true`, `isHeadquarters: false`

#### Scenario: Sucursal ya existente no se duplica ni pierde su flag de HQ
- **WHEN** el seeder corre de nuevo y `branches` ya tiene `code: "MATRIZ"` con `isHeadquarters` en cualquier valor
- **THEN** no crea una segunda fila `MATRIZ`
- **AND** el valor de `isHeadquarters` de `MATRIZ` permanece sin cambios

#### Scenario: Existencia del Excel sobrescribe el inventario en cada corrida
- **WHEN** existe `BranchInventory(branchId=ZARIOZ, productId=X)` con `quantity=10` y el Excel trae `quantity=7` para esa combinación en la corrida actual
- **THEN** tras la corrida, `BranchInventory(branchId=ZARIOZ, productId=X).quantity = 7`

#### Scenario: Existencia 0 o vacía crea la fila igual
- **WHEN** una fila de la hoja `INV PRADERA` trae existencia vacía o `0` para un producto
- **THEN** el seeder crea/actualiza `BranchInventory` para esa `(branch, product)` con `quantity: 0`

### Requirement: Precio branch-scoped condicional a divergencia real
Para cada producto y sucursal, el seeder runtime SHALL comparar el precio de la fila contra el `ProductPrice` existente con `branchId: null, name: "Precio Publico"` para ese producto (el precio base, si existe). Cuando el precio coincida con el base dentro de una tolerancia de redondeo de 2 decimales, el sistema NO SHALL crear un override — la sucursal hereda el precio base. Cuando difiera, el sistema SHALL hacer upsert de `ProductPrice` por `(productId, branchId, name)` con `name: "Precio Publico"`, `isDefault: true` dentro del bucket de esa sucursal. Cuando el producto no tenga ningún `ProductPrice` con `branchId: null`, el sistema SHALL crear directamente un override `ProductPrice` por cada sucursal donde el producto aparezca, sin comparar contra ningún valor, y NO SHALL crear en ningún caso un `ProductPrice` con `branchId: null` para ese producto.

#### Scenario: Precio de sucursal igual al base no crea override
- **WHEN** el producto `X` tiene `ProductPrice(branchId: null, name: "Precio Publico", price: 100.00)` y la fila de la hoja `INV ZARIOZ` trae `price: 100.00` para `X`
- **THEN** el seeder no crea ningún `ProductPrice` con `branchId` de Zarioz para el producto `X`

#### Scenario: Precio de sucursal distinto crea override branch-scoped
- **WHEN** el producto `KER KAB 1L` tiene `ProductPrice(branchId: null, price: 3666.65)` y la fila de la hoja `INV CHICHICAPAM` trae `price: 699.35`
- **THEN** el seeder crea/actualiza `ProductPrice(productId, branchId: <id de Chichicapam>, name: "Precio Publico", price: 699.35, isDefault: true)`

#### Scenario: Producto sin precio base crea overrides directos sin base global
- **WHEN** un producto sólo aparece en las hojas `INV ZARIOZ` y `INV PRADERA` (nunca en `INV AGRISAS`) y no tiene ningún `ProductPrice` con `branchId: null`
- **THEN** el seeder crea un `ProductPrice` branch-scoped para Zarioz y otro para Pradera con sus respectivos precios
- **AND** no crea ningún `ProductPrice` con `branchId: null` para ese producto

### Requirement: Reporte de la corrida multi-sucursal
Al finalizar, el seeder runtime SHALL imprimir un resumen estructurado con: total de productos nuevos creados, total de filas con `nameMismatch`, total de productos de Matriz refrescados, total de filas de Tlaxiaco emparejadas por nombre vs. auto-creadas, total de overrides de precio creados desglosado por sucursal, total de filas de `branch_inventory` upserted (Matriz + tiendas), y la lista de filas omitidas por error (code/sheet + motivo). El reporte SHALL imprimirse siempre al finalizar la corrida, incluso si hubo filas individuales omitidas por error. La corrida SHALL abortar por completo únicamente ante errores estructurales (el archivo `inventario-tiendas-v3.ts` no existe o no tiene el shape esperado) — errores de fila individual (code inválido, producto sin match) NO SHALL abortar la corrida.

#### Scenario: Reporte incluye todos los conteos tras una corrida exitosa
- **WHEN** el seeder termina de procesar las 6 hojas sin errores estructurales
- **THEN** imprime en stdout productos creados, `nameMismatch`, productos de Matriz refrescados, matches/auto-creaciones de Tlaxiaco, overrides de precio por sucursal, filas de inventario upserted, y una lista vacía de errores

#### Scenario: Reporte se imprime aun con filas omitidas por error
- **WHEN** 3 filas del archivo embebido tienen `code` inválido y se omiten durante la corrida
- **THEN** el seeder completa el procesamiento de las filas restantes
- **AND** el reporte final incluye esas 3 filas en la lista de errores, junto con el resto de los conteos de la corrida
