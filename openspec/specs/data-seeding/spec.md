# data-seeding

## Purpose

Especificaciones para los scripts de siembra de datos iniciales del sistema. Cubre la carga del catálogo del cliente (departamentos, productos, precios múltiples por nivel, sucursal matriz e inventario inicial con cantidades reales) desde datos embebidos en TypeScript hacia la base de datos Postgres vía Prisma. También cubre el catálogo canónico de folios.

---

## Requirements

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

---

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

---

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

---

### Requirement: Emparejamiento de Tlaxiaco por nombre normalizado
El seeder runtime SHALL normalizar el `name` de cada fila de `INV TLAXIACO` y de cada `products.name` existente mediante: descomposición `NFD` y remoción de diacríticos, `uppercase`, colapso de espacios múltiples, y remoción de los tokens completos `DE`, `CON`, `Y` (no como substring — sólo cuando aparecen como palabra separada). El sistema SHALL buscar un `product` cuyo `name` normalizado sea exactamente igual al `name` normalizado de la fila de Tlaxiaco. Cuando exista un match exacto, la fila SHALL tratarse con el `code`/`id` de ese producto, sin modificar `name`/`unit`/`departmentId` del producto (mismo criterio no-agresivo que las 4 tiendas). Cuando no exista match y la fila traiga `Departamento` explícito, el sistema SHALL sintetizar un `code` aplicando `normalizeProductCode()` (de `prisma/seeds/lib/normalize.ts`) sobre el `name` real de la fila (nunca sobre `tlaxiacoRawCode`), y auto-crear el producto con ese `code` sintetizado, resolviendo `departmentId` desde la columna `Departamento` explícita de la fila. Cuando no exista match y la fila NO traiga `Departamento` explícito (`"- Sin Departamento -"` o vacío, normalizado a `null`), el sistema SHALL resolver un departamento fallback fijo (`code: "SIN_DEPARTAMENTO"`, creado si no existe, vía el mismo mecanismo de resolución/upsert de departamento usado en el resto del seeder) y auto-crear el producto con ese departamento, en vez de omitir la fila — contando la fila en un contador separado (`tlaxiacoFallbackDepartment`) distinto de las auto-creaciones con departamento explícito. Cuando el `code` sintetizado colisione con uno ya usado en la misma corrida para un producto distinto, el sistema SHALL contar la fila como `error` y omitirla, sin sobrescribir el producto existente — esta regla aplica igual con o sin departamento explícito.

#### Scenario: Nombre normalizado matchea producto existente pese a "DE" de relleno
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ALGAK DE 1L"` y existe `products.name: "ALGAK 1L"`
- **THEN** el seeder empareja la fila con ese producto existente y usa su `code` (`AK1`) para el resto del flujo (inventario/precio de `TLAXIACO`)

#### Scenario: Sin match, con departamento explícito, se sintetiza code del nombre real
- **WHEN** la fila de `INV TLAXIACO` trae `name: "BIO-FREEZE DE 1L"`, `departmentName: "AGROQUIMICOS"` y ningún producto en catálogo normaliza a ese mismo nombre
- **THEN** el seeder sintetiza `code` vía `normalizeProductCode("BIO-FREEZE DE 1L")` y auto-crea el producto con ese `code` y `departmentId` resuelto de `"AGROQUIMICOS"` — nunca usa el `tlaxiacoRawCode` original

#### Scenario: Sin match y sin departamento explícito, usa el departamento fallback
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ALIETTE DOSIS 500GRS"`, `departmentName: null` (Excel traía `"- Sin Departamento -"`), y ningún producto en catálogo normaliza a ese mismo nombre
- **THEN** el seeder resuelve/crea el departamento `code: "SIN_DEPARTAMENTO"` y auto-crea el producto con `code` sintetizado del nombre y ese `departmentId`
- **AND** la fila se cuenta en `tlaxiacoFallbackDepartment`, no se omite como `error`

#### Scenario: Departamento fallback es idempotente entre corridas
- **WHEN** el seeder corre una segunda vez y ya existe `departments.code = "SIN_DEPARTAMENTO"` de una corrida anterior
- **THEN** no crea una segunda fila de departamento, reutiliza la existente para todas las filas de esta categoría

#### Scenario: Colisión de code sintetizado se reporta sin sobrescribir
- **WHEN** dos filas de `INV TLAXIACO` con nombres distintos normalizan a un `code` sintetizado idéntico
- **THEN** la segunda fila procesada se cuenta como `error` y se omite; el producto creado por la primera fila permanece sin cambios

---

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

---

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

---

### Requirement: Reporte de la corrida multi-sucursal
Al finalizar, el seeder runtime SHALL imprimir un resumen estructurado con: total de productos nuevos creados, total de filas con `nameMismatch`, total de productos de Matriz refrescados, total de filas de Tlaxiaco emparejadas por nombre vs. auto-creadas, total de overrides de precio creados desglosado por sucursal, total de filas de `branch_inventory` upserted (Matriz + tiendas), y la lista de filas omitidas por error (code/sheet + motivo). El reporte SHALL imprimirse siempre al finalizar la corrida, incluso si hubo filas individuales omitidas por error. La corrida SHALL abortar por completo únicamente ante errores estructurales (el archivo `inventario-tiendas-v3.ts` no existe o no tiene el shape esperado) — errores de fila individual (code inválido, producto sin match) NO SHALL abortar la corrida.

#### Scenario: Reporte incluye todos los conteos tras una corrida exitosa
- **WHEN** el seeder termina de procesar las 6 hojas sin errores estructurales
- **THEN** imprime en stdout productos creados, `nameMismatch`, productos de Matriz refrescados, matches/auto-creaciones de Tlaxiaco, overrides de precio por sucursal, filas de inventario upserted, y una lista vacía de errores

#### Scenario: Reporte se imprime aun con filas omitidas por error
- **WHEN** 3 filas del archivo embebido tienen `code` inválido y se omiten durante la corrida
- **THEN** el seeder completa el procesamiento de las filas restantes
- **AND** el reporte final incluye esas 3 filas en la lista de errores, junto con el resto de los conteos de la corrida

---

### Requirement: Folios Seed Script Existence

El sistema SHALL proveer un script TypeScript en `prisma/seeds/folios.ts` invocable mediante `npm run seed:folios`, que materializa el catálogo canónico de 10 folios del cliente. El script SHALL ser independiente del seed RBAC (`prisma/seed.ts`) y del seed de inventario (`prisma/seeds/inventory-tiendas.ts`).

#### Scenario: Script ejecutable con un comando

- **WHEN** el operador ejecuta `npm run seed:folios` desde la raíz del repo
- **THEN** el script abre una conexión Prisma, ejecuta la rutina de upsert/borrado y al finalizar imprime un resumen estructurado con conteos `{ canonicalUpserted, legacyDeleted, abortedReferences? }`

#### Scenario: Sin variables de entorno DB

- **WHEN** `DATABASE_URL` o `DIRECT_URL` no están definidos
- **THEN** el script falla en startup con mensaje claro

---

### Requirement: Canonical Folios List

El script SHALL definir como constante en código el conjunto canónico de 10 folios con los siguientes campos exactos:

| code | name | prefix | scope |
|---|---|---|---|
| TK | Folio de Venta Efectivo | TK- | POS |
| TC | Folio de Venta Crédito | TC- | POS |
| COT | Cotización | COT- | POS |
| TS | Traspaso entre inventarios | TS- | INVENTORY |
| TRI | Traspaso interno (sin Carta Porte) | TRI- | INVENTORY |
| RB | Recibo de Pago - Cobranza | RB- | OPERATIONS |
| AB | Cobranza/Abono | AB- | OPERATIONS |
| DEV | Devolución | DEV- | OPERATIONS |
| CP | Compras | CP- | OPERATIONS |
| PP | Pago a Proveedor | PP- | OPERATIONS |

Cada folio canónico SHALL crearse con `isActive=true`. Modificar la lista requiere editar el script y abrir una nueva propuesta OpenSpec.

#### Scenario: Resultado tras corrida limpia

- **WHEN** `npm run seed:folios` corre sobre una DB sin folios
- **THEN** tras la ejecución existen exactamente 10 filas en `folios`, una por cada code canónico, todas con `isActive=true` y `currentNumber=0`

#### Scenario: TRI se agrega sin afectar TS

- **WHEN** el folio `TS` ya existe con `currentNumber=32` y se ejecuta el seed tras agregar `TRI` a la lista canónica
- **THEN** `TS.currentNumber` sigue siendo `32` y se crea `TRI` nuevo con `currentNumber=0`

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

1. Consultar la cuenta de referencias FK: `_count.sales + _count.quotes + _count.payments + _count.waybills`.
2. Si el conteo total es `0`: ejecutar `prisma.folio.delete({ where: { id } })`.
3. Si el conteo total es `> 0`: NO borrar; agregar el folio a una lista `abortedReferences` con `{ code, sales, quotes, payments, waybills }`.

Al finalizar el barrido, si `abortedReferences.length > 0`, el script SHALL imprimir cada entrada en stderr junto con el mensaje "Folio <code> tiene N referencias activas; migra manualmente o limpia antes de re-correr" y SHALL salir con `process.exit(1)` SIN haber upserteado los folios canónicos (la fase de upsert solo corre si la fase de borrado fue exitosa).

#### Scenario: Borrar folio legacy sin referencias

- **WHEN** existe un folio `FAC_A` (no canónico) con `_count.sales=0`, `_count.quotes=0`, `_count.payments=0`, `_count.waybills=0`
- **THEN** el script lo elimina y reporta `legacyDeleted: 1` (entre otros)

#### Scenario: Folio legacy referenciado solo por waybills bloquea el seed

- **WHEN** existe un folio no canónico con `_count.waybills=3` y `_count.sales=0`, `_count.quotes=0`, `_count.payments=0`
- **THEN** el script lo agrega a `abortedReferences` con `waybills: 3`, imprime el mensaje de error, y sale con código `1` SIN intentar el `delete` (que de otro modo fallaría contra el FK `ON DELETE RESTRICT` de `waybills.folio_id`)

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

El script SHALL imprimir al finalizar un resumen estructurado con: `{ canonicalUpserted: number, canonicalCreated: number, canonicalUpdated: number, legacyDeleted: number, abortedReferences: Array<{code, sales, quotes, payments, waybills}> }`. En caso de éxito SHALL salir con código `0`; en caso de error (FKs activas, fallo Prisma, env vars faltantes) SHALL salir con código `1`.

#### Scenario: Resumen exitoso

- **WHEN** el seed corre y procesa los 10 canónicos sin folios legacy bloqueando
- **THEN** stdout incluye al menos `canonicalUpserted: 10` y `legacyDeleted: 0` (o el conteo real) y `abortedReferences: []`

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
