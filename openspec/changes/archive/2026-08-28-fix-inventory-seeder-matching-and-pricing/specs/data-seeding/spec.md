## MODIFIED Requirements

### Requirement: Emparejamiento de Tlaxiaco por nombre normalizado
El seeder runtime SHALL normalizar el `name` de cada fila de `INV TLAXIACO` y de cada `products.name` existente mediante: descomposición `NFD` y remoción de diacríticos, `uppercase`, colapso de espacios múltiples, remoción de los tokens completos `DE`, `CON`, `Y` (no como substring — sólo cuando aparecen como palabra separada), y remoción del espacio entre un dígito y la letra de unidad inmediatamente siguiente (ej. `"10 L"` y `"10L"` normalizan al mismo valor; la remoción aplica sólo entre un dígito y la letra siguiente, no colapsa espacios entre palabras completas). El sistema SHALL buscar un `product` cuyo `name` normalizado sea exactamente igual al `name` normalizado de la fila de Tlaxiaco. Cuando exista un match exacto, la fila SHALL tratarse con el `code`/`id` de ese producto, sin modificar `name`/`unit`/`departmentId` del producto (mismo criterio no-agresivo que las 4 tiendas). Cuando no exista match por nombre normalizado, el sistema SHALL consultar un mapa estático de alias de producto (nombre crudo de la fila de Tlaxiaco, tal cual aparece en el Excel → `code` de catálogo existente) antes de sintetizar cualquier `code` nuevo; si el nombre crudo de la fila está en ese mapa, el sistema SHALL emparejar la fila con el producto de ese `code` existente, sin sintetizar ni auto-crear ningún producto nuevo, con la misma semántica de no-modificar `name`/`unit`/`departmentId` que aplica a un match por nombre normalizado. Cuando el nombre crudo tampoco esté en el mapa de alias y la fila traiga `Departamento` explícito, el sistema SHALL sintetizar un `code` aplicando `normalizeProductCode()` (de `prisma/seeds/lib/normalize.ts`) sobre el `name` real de la fila (nunca sobre `tlaxiacoRawCode`), y auto-crear el producto con ese `code` sintetizado, resolviendo `departmentId` desde la columna `Departamento` explícita de la fila. Cuando no exista match (ni normalizado ni por alias) y la fila NO traiga `Departamento` explícito (`"- Sin Departamento -"` o vacío, normalizado a `null`), el sistema SHALL resolver un departamento fallback fijo (`code: "SIN_DEPARTAMENTO"`, creado si no existe, vía el mismo mecanismo de resolución/upsert de departamento usado en el resto del seeder) y auto-crear el producto con ese departamento, en vez de omitir la fila — contando la fila en un contador separado (`tlaxiacoFallbackDepartment`) distinto de las auto-creaciones con departamento explícito. Cuando el `code` sintetizado colisione con uno ya usado en la misma corrida para un producto distinto, el sistema SHALL contar la fila como `error` y omitirla, sin sobrescribir el producto existente — esta regla aplica igual con o sin departamento explícito.

#### Scenario: Nombre normalizado matchea producto existente pese a "DE" de relleno
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ALGAK DE 1L"` y existe `products.name: "ALGAK 1L"`
- **THEN** el seeder empareja la fila con ese producto existente y usa su `code` (`AK1`) para el resto del flujo (inventario/precio de `TLAXIACO`)

#### Scenario: Diferencia de espaciado dígito-unidad matchea vía normalización
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ATP UP DE 10L"` y existe `products.name: "ATP UP 10 L"` (`code: "AT10"`)
- **THEN** el seeder empareja la fila con el producto existente `AT10`, sin crear ningún producto duplicado con code sintetizado

#### Scenario: Sin match, con departamento explícito, se sintetiza code del nombre real
- **WHEN** la fila de `INV TLAXIACO` trae `name: "BIO-FREEZE DE 1L"`, `departmentName: "AGROQUIMICOS"` y ningún producto en catálogo normaliza a ese mismo nombre, ni el nombre crudo está en el mapa de alias
- **THEN** el seeder sintetiza `code` vía `normalizeProductCode("BIO-FREEZE DE 1L")` y auto-crea el producto con ese `code` y `departmentId` resuelto de `"AGROQUIMICOS"` — nunca usa el `tlaxiacoRawCode` original

#### Scenario: Sin match y sin departamento explícito, usa el departamento fallback
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ALIETTE DOSIS 500GRS"`, `departmentName: null` (Excel traía `"- Sin Departamento -"`), ningún producto en catálogo normaliza a ese mismo nombre, y el nombre crudo no está en el mapa de alias
- **THEN** el seeder resuelve/crea el departamento `code: "SIN_DEPARTAMENTO"` y auto-crea el producto con `code` sintetizado del nombre y ese `departmentId`
- **AND** la fila se cuenta en `tlaxiacoFallbackDepartment`, no se omite como `error`

#### Scenario: Departamento fallback es idempotente entre corridas
- **WHEN** el seeder corre una segunda vez y ya existe `departments.code = "SIN_DEPARTAMENTO"` de una corrida anterior
- **THEN** no crea una segunda fila de departamento, reutiliza la existente para todas las filas de esta categoría

#### Scenario: Alias explícito de producto resuelve nombre sin match normalizado
- **WHEN** la fila de `INV TLAXIACO` trae `name: "BIOFIT G"` (sin match por nombre normalizado contra el catálogo) y el mapa de alias contiene `"BIOFIT G" → "BF1KG"`
- **THEN** el seeder empareja la fila con el producto existente `BF1KG`, sin sintetizar `code` ni auto-crear un producto nuevo

#### Scenario: Nombre sin match normalizado ni alias explícito sigue creando producto nuevo
- **WHEN** la fila de `INV TLAXIACO` trae `name: "PROMESOL G GRANULADO"` (sin match por nombre normalizado y sin entrada en el mapa de alias)
- **THEN** el seeder sigue el flujo normal de sintetización de `code` y auto-creación de producto, exactamente como si el mapa de alias no existiera

#### Scenario: Colisión de code sintetizado se reporta sin sobrescribir
- **WHEN** dos filas de `INV TLAXIACO` con nombres distintos (ninguno en el mapa de alias) normalizan a un `code` sintetizado idéntico
- **THEN** la segunda fila procesada se cuenta como `error` y se omite; el producto creado por la primera fila permanece sin cambios

---

### Requirement: Precio branch-scoped condicional a divergencia real
Para cada producto y sucursal, el seeder runtime SHALL comparar el precio de la fila contra el `ProductPrice` existente con `branchId: null, name: "Precio Publico"` para ese producto (el precio base, si existe). Cuando el precio de la fila sea `0` o esté ausente, el sistema NO SHALL escribir ningún `ProductPrice` para esa fila — ni override branch-scoped ni base — dejando que el precio efectivo de esa sucursal se resuelva en tiempo de lectura vía el precio base existente si lo hay; la fila SHALL contarse en un contador `emptyPriceRows` del reporte, y el producto y su `BranchInventory` para esa sucursal SHALL crearse/actualizarse igual, sin que la fila se omita por esto. Cuando el precio de la fila sea `> 0` y coincida con el base dentro de una tolerancia de redondeo de 2 decimales, el sistema NO SHALL crear un override — la sucursal hereda el precio base. Cuando difiera y sea `> 0`, el sistema SHALL hacer upsert de `ProductPrice` por `(productId, branchId, name)` con `name: "Precio Publico"`, `isDefault: true` dentro del bucket de esa sucursal. Cuando el producto no tenga ningún `ProductPrice` con `branchId: null` y el precio de la fila sea `> 0`, el sistema SHALL crear directamente un override `ProductPrice` por cada sucursal donde el producto aparezca con precio `> 0`, sin comparar contra ningún valor, y NO SHALL crear en ningún caso un `ProductPrice` con `branchId: null` para ese producto.

#### Scenario: Precio de sucursal igual al base no crea override
- **WHEN** el producto `X` tiene `ProductPrice(branchId: null, name: "Precio Publico", price: 100.00)` y la fila de la hoja `INV ZARIOZ` trae `price: 100.00` para `X`
- **THEN** el seeder no crea ningún `ProductPrice` con `branchId` de Zarioz para el producto `X`

#### Scenario: Precio de sucursal distinto crea override branch-scoped
- **WHEN** el producto `KER KAB 1L` tiene `ProductPrice(branchId: null, price: 3666.65)` y la fila de la hoja `INV CHICHICAPAM` trae `price: 699.35`
- **THEN** el seeder crea/actualiza `ProductPrice(productId, branchId: <id de Chichicapam>, name: "Precio Publico", price: 699.35, isDefault: true)`

#### Scenario: Producto sin precio base crea overrides directos sin base global
- **WHEN** un producto sólo aparece en las hojas `INV ZARIOZ` y `INV PRADERA` (nunca en `INV AGRISAS`) con precio `> 0` en ambas, y no tiene ningún `ProductPrice` con `branchId: null`
- **THEN** el seeder crea un `ProductPrice` branch-scoped para Zarioz y otro para Pradera con sus respectivos precios
- **AND** no crea ningún `ProductPrice` con `branchId: null` para ese producto

#### Scenario: Precio vacío con base existente no escribe override falso
- **WHEN** el producto `Y` tiene `ProductPrice(branchId: null, name: "Precio Publico", price: 292.00)` y la fila de `INV TLAXIACO` para `Y` trae `price: 0` (o ausente)
- **THEN** el seeder no escribe ningún `ProductPrice` con `branchId` de Tlaxiaco para `Y`
- **AND** la fila se cuenta en `emptyPriceRows`
- **AND** `BranchInventory(branchId=TLAXIACO, productId=Y)` se crea/actualiza igual con la cantidad de la fila

#### Scenario: Precio vacío sin base en ninguna sucursal deja el producto sin precio
- **WHEN** un producto nuevo se auto-crea a partir de una fila con `price: 0` (o ausente) y no existe ningún `ProductPrice` previo para ese producto en ninguna sucursal
- **THEN** el producto y su `BranchInventory` para esa sucursal se crean igual
- **AND** no se crea ningún `ProductPrice` para ese producto en esta corrida
- **AND** la fila se cuenta en `emptyPriceRows`

---

### Requirement: Reporte de la corrida multi-sucursal
Al finalizar, el seeder runtime SHALL imprimir un resumen estructurado con: total de productos nuevos creados, total de filas con `nameMismatch`, total de productos de Matriz refrescados, total de filas de Tlaxiaco emparejadas por nombre vs. auto-creadas, total de filas de Tlaxiaco emparejadas vía alias explícito de producto, total de overrides de precio creados desglosado por sucursal, total de filas con precio vacío/0 no escritas (`emptyPriceRows`), total de filas de `branch_inventory` upserted (Matriz + tiendas), y la lista de filas omitidas por error (code/sheet + motivo). El reporte SHALL imprimirse siempre al finalizar la corrida, incluso si hubo filas individuales omitidas por error. La corrida SHALL abortar por completo únicamente ante errores estructurales (el archivo `inventario-tiendas-v3.ts` no existe o no tiene el shape esperado) — errores de fila individual (code inválido, producto sin match) NO SHALL abortar la corrida.

#### Scenario: Reporte incluye todos los conteos tras una corrida exitosa
- **WHEN** el seeder termina de procesar las 6 hojas sin errores estructurales
- **THEN** imprime en stdout productos creados, `nameMismatch`, productos de Matriz refrescados, matches/auto-creaciones/alias de Tlaxiaco, overrides de precio por sucursal, `emptyPriceRows`, filas de inventario upserted, y una lista vacía de errores

#### Scenario: Reporte se imprime aun con filas omitidas por error
- **WHEN** 3 filas del archivo embebido tienen `code` inválido y se omiten durante la corrida
- **THEN** el seeder completa el procesamiento de las filas restantes
- **AND** el reporte final incluye esas 3 filas en la lista de errores, junto con el resto de los conteos de la corrida

---

## ADDED Requirements

### Requirement: Alias de departamento por variantes de captura conocidas
Antes de resolver o crear un `Department` a partir del `departmentName` de cualquier fila (Agrisas, tiendas de code alineado, o Tlaxiaco), el sistema SHALL consultar un mapa estático de alias de departamento (nombre crudo → nombre canónico), comparado de forma exacta contra el `departmentName` de la fila sin normalización adicional. Cuando el `departmentName` esté en el mapa, el sistema SHALL usar el nombre canónico para resolver/crear el `Department`, en vez del nombre crudo de la fila. El mapa SHALL contener exactamente estos pares confirmados: `"-INNOVAK"` → `"INNOVAK GLOBAL"`, `"INNOVAK"` → `"INNOVAK GLOBAL"`, `"INNOVAK OUT"` → `"INNOVAK GLOBAL"`, `"AGRINOVA OUT"` → `"AGRINOVA"`, `"KEY BIOTEC OUT"` → `"KEYBIOTEC"`, `"OTRAS LINEAS OUT"` → `"OTRAS LINEAS"`, `"FORMULABAGRO OUT"` → `"FORMU LAB"`. Nombres de departamento NO listados en el mapa SHALL resolverse/crearse tal cual, sin fusión automática — el sistema NO SHALL aplicar ninguna heurística de similitud/fuzzy-match fuera de este mapa fijo.

#### Scenario: Variante de captura de INNOVAK resuelve al departamento canónico
- **WHEN** una fila de cualquier hoja trae `departmentName: "-INNOVAK"` (o `"INNOVAK"`, o `"INNOVAK OUT"`)
- **THEN** el `Department` resuelto/creado para esa fila es `"INNOVAK GLOBAL"`, sin crear un departamento nuevo con el nombre crudo

#### Scenario: Sufijo " OUT" fusiona con su departamento base
- **WHEN** una fila trae `departmentName: "AGRINOVA OUT"`
- **THEN** el `Department` resuelto/creado para esa fila es `"AGRINOVA"`, sin crear `"AGRINOVA OUT"` como departamento separado

#### Scenario: Departamento fuera del mapa conserva el comportamiento actual
- **WHEN** una fila trae `departmentName: "AGROMEN AGRISAS"` (no está en el mapa de alias)
- **THEN** el sistema resuelve/crea el departamento `"AGROMEN AGRISAS"` tal cual, sin fusionarlo con `"AGROMEN"` ni con ningún otro departamento

#### Scenario: Alias de departamento aplica igual en las 3 fuentes de datos
- **WHEN** el refresh de `INV AGRISAS` procesa una fila con `departmentName: "INNOVAK OUT"`
- **THEN** el `Department` resuelto es `"INNOVAK GLOBAL"`, con el mismo mapa de alias que aplica a las filas de tiendas y de Tlaxiaco
