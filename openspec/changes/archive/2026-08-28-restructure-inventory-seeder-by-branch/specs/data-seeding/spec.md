## MODIFIED Requirements

### Requirement: Generador offline de inventario multi-sucursal
El sistema SHALL proveer un generador `prisma/seeds/data/generate-inventario-tiendas-data.ts` que lea las 6 hojas de `INVENTARIOS TIENDAS.xlsx` (`INV AGRISAS`, `INV CHICHICAPAM`, `INV TLAXIACO`, `INV ZARIOZ`, `INV HUAJUAPAN`, `INV PRADERA`), cada una con su propio mapeo de columnas definido como constante explícita, NO por heurística de contenido en runtime. Para las 4 hojas de tienda con code alfanumérico alineado al catálogo (`INV CHICHICAPAM`, `INV ZARIOZ`, `INV HUAJUAPAN`, `INV PRADERA`), el generador SHALL emitir filas `{code, name, unit, satCode, price, departmentName, branchCode}`; filas cuyo código está vacío y cuya columna de unidad también está vacía (marcador de sección, ej. `INSUMOS`, `AGRINOVA`, `INNOVAK`, tomado de la columna de nombre de esa fila) SHALL actualizar el departamento vigente para las filas siguientes de esa hoja, y NO SHALL emitirse como fila de producto. Para `INV AGRISAS`, el generador SHALL emitir filas en forma extendida `{code, name, unit, satCode, departmentName, ivaRaw, iepsRaw, existencia, prices: [{tierName, value}]}` con un elemento en `prices` por cada columna `/precio/i` de la hoja (incluyendo tiers en `0`). Para `INV TLAXIACO`, el generador SHALL emitir filas `{tlaxiacoRawCode, name, unit, satCode, price, departmentName, branchCode: "TLAXIACO"}`, con el `code` numérico original preservado sin alterar en `tlaxiacoRawCode` (nunca usado como `Product.code`), precio normalizado desde el formato string con símbolo de moneda (ej. `"$18.00"` → `18`), y `departmentName` con `"- Sin Departamento -"` (o variante vacía) normalizado a `null`. Filas totalmente vacías (separadores) SHALL ignorarse sin abortar el parseo del resto de la hoja. El generador SHALL salir con código `1` si `INVENTARIOS TIENDAS.xlsx` no existe en la ruta esperada, o si alguna de las 6 hojas no matchea su mapeo de columnas esperado. Las 3 formas de fila (`AgrisasRefreshRow`, `TiendaInventoryRow`, `TlaxiacoRawRow`) SHALL definirse en un único lugar consumido tanto por el generador como por el archivo de datos embebidos que este emite, para que ambos no puedan divergir en su forma sin que el compilador lo detecte.

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

#### Scenario: Regenerar el archivo embebido produce las mismas filas y forma de datos
- **WHEN** se regenera `inventario-tiendas-v3.ts` a partir del mismo `INVENTARIOS TIENDAS.xlsx`
- **THEN** el archivo resultante contiene las mismas 3 estructuras de datos (`AgrisasRefreshRow`, `TiendaInventoryRow`, `TlaxiacoRawRow`) con los mismos campos y los mismos conteos de filas que la versión actual

---

### Requirement: Emparejamiento y auto-creación de producto por code
El seeder runtime `prisma/seeds/inventory-tiendas.ts` SHALL emparejar cada fila embebida contra el catálogo de `products` existente por `code` (misma normalización `CODE_REGEX` que usa `inventory.ts`). Cuando el `code` no exista en el catálogo, el sistema SHALL auto-crear el `Product` con `code`, `name`, `unit` de la fila; `departmentId` resuelto por nombre (upsert de `Department` si el nombre no existe todavía, mismo patrón que usa `inventory.ts` para `DEPARTMENTS`); `ivaRate`/`iepsRate` en `0` por defecto; `satProductCode` de la fila si matchea `^\d{8}$`, sino `null`. Cuando el `code` ya exista en el catálogo pero el `name` de la fila difiera del nombre catalogado, el sistema NO SHALL sobrescribir el nombre existente, y SHALL contar la fila como `nameMismatch` en el reporte de la corrida. Toda creación de producto SHALL usar `upsert` por `code`, no `create` puro. Un `code` inválido (no matchea `CODE_REGEX`) SHALL reportarse como `error` y esa fila SHALL omitirse, sin abortar la corrida completa. Cuando la fila corresponda a un producto nuevo y no traiga `departmentName` resoluble (columna vacía en el Excel de origen), el sistema SHALL resolver un departamento fallback fijo (`code: "SIN_DEPARTAMENTO"`, creado si no existe todavía) en vez de omitir la fila, y SHALL contar la fila en un contador separado (`branchFallbackDepartment`), distinto de `nameMismatch` y de `errors`. Esta regla de fallback NO SHALL aplicar cuando el producto ya exista en el catálogo — su `departmentId` actual permanece sin cambios cuando la fila no trae `departmentName`.

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

#### Scenario: Producto nuevo de tienda sin departamento usa fallback en vez de omitirse
- **WHEN** el seeder procesa una fila de tienda de code alineado (Chichicapam/Zarioz/Huajuapan/Pradera) con un `code` que no existe todavía en `products` y `departmentName: null`
- **THEN** crea el producto con `departmentId` resuelto al departamento fallback `SIN_DEPARTAMENTO` (creado si no existe)
- **AND** cuenta la fila en `branchFallbackDepartment`, no la omite ni la cuenta en `errors`

#### Scenario: Producto existente sin departamento en la fila conserva su departamento actual
- **WHEN** el seeder procesa una fila de tienda con un `code` que ya existe en `products` y `departmentName: null` en esa fila
- **THEN** el `departmentId` del producto en base de datos permanece sin cambios

---

## ADDED Requirements

### Requirement: Orden determinístico de siembra por sucursal
El seeder runtime SHALL procesar las sucursales en un orden fijo y determinístico entre corridas: `MATRIZ` (refresh desde `INV AGRISAS`) primero, luego las 4 tiendas de code alineado (`CHICHICAPAM`, `HUAJUAPAN`, `PRADERA`, `ZARIOZ`), y `TLAXIACO` al final. El índice de nombres usado para el emparejamiento de Tlaxiaco SHALL construirse después de procesar todas las demás sucursales, para maximizar la cobertura de productos disponibles para el matching.

#### Scenario: Tlaxiaco matchea contra un producto creado en la misma corrida por otra tienda
- **WHEN** una fila de `INV CHICHICAPAM` crea en la misma corrida el producto nuevo `"ALGAK 1L"`
- **AND** una fila posterior de `INV TLAXIACO` trae `name: "ALGAK DE 1L"`
- **THEN** el seeder empareja la fila de Tlaxiaco contra el producto recién creado por Chichicapam, sin auto-crear un producto duplicado

#### Scenario: Orden de sucursales es reproducible entre corridas
- **WHEN** el seeder corre dos veces consecutivas sobre datos de entrada idénticos
- **THEN** el orden de procesamiento de sucursales y el resultado final (conteos, matches) es idéntico en ambas corridas

---

### Requirement: Detección de productos huérfanos de inventario multi-sucursal
Al finalizar de procesar todas las sucursales, el seeder runtime SHALL identificar productos activos (`isActive: true`) que no tengan ninguna fila en `branch_inventory` en ninguna sucursal, y SHALL incluir el conteo total (`orphanProducts`) junto con hasta 20 `code` de ejemplo en el reporte final de la corrida. Esta detección SHALL ser de solo lectura: el sistema NO SHALL crear, modificar ni eliminar ninguna fila de `branch_inventory` como resultado de esta validación.

#### Scenario: Reporte incluye productos huérfanos tras la corrida
- **WHEN** existe un producto activo `code: "OLD01"` sin ninguna fila en `branch_inventory` tras procesar todas las sucursales
- **THEN** el reporte final incluye `orphanProducts: 1` y `"OLD01"` en la lista de ejemplos

#### Scenario: Sin huérfanos, el reporte lo indica explícitamente
- **WHEN** todos los productos activos tienen al menos una fila de `branch_inventory` tras la corrida
- **THEN** el reporte incluye `orphanProducts: 0` de forma explícita, sin omitir la sección

#### Scenario: Detección no crea ni modifica inventario
- **WHEN** el seeder detecta 5 productos huérfanos
- **THEN** no se crea ninguna fila nueva de `branch_inventory` para esos 5 productos como efecto de la detección

---

### Requirement: Orquestador de siembra completa
El sistema SHALL proveer un script `seed:all` en `package.json` que ejecute, en este orden, los seeders: RBAC/sucursal Matriz/tasas de impuesto (`seed`), folios (`seed:folios`), catálogo de unidades SAT (`seed:sat-units`), catálogo de productos/servicios SAT (`seed:sat-codes`), catálogos de régimen fiscal/uso CFDI (`seed:sat-catalogs`), configuración de ticket (`seed:ticket-settings`), e inventario multi-sucursal (`seed:inventory-tiendas`). Si cualquier script de la secuencia termina con código de salida distinto de `0`, el orquestador SHALL abortar sin ejecutar los scripts restantes de la secuencia.

#### Scenario: Corrida completa sobre BD limpia
- **WHEN** se ejecuta `npm run seed:all` sobre una base de datos sin datos previos
- **THEN** al finalizar existen los permisos/roles RBAC, la sucursal `MATRIZ`, los folios canónicos, los catálogos SAT, y el inventario multi-sucursal, sin error

#### Scenario: Falla intermedia aborta los scripts restantes
- **WHEN** `seed:folios` termina con código de salida `1` (ej. folio legacy con referencias activas)
- **THEN** el orquestador no ejecuta `seed:sat-units` ni ninguno de los scripts siguientes de la secuencia

#### Scenario: Re-ejecución sobre BD ya sembrada es idempotente
- **WHEN** se ejecuta `npm run seed:all` dos veces consecutivas sobre la misma base de datos
- **THEN** los conteos finales de la segunda corrida no duplican registros respecto a la primera

---

### Requirement: Conexión resiliente para cargas largas sin transacción
El seeder runtime de inventario multi-sucursal SHALL conectarse a la base de datos usando `DIRECT_URL` cuando esté definida en el entorno, en vez de la URL de pooler (`DATABASE_URL`) usada por el resto de la aplicación en runtime — el mismo criterio que ya usa `prisma/seed.ts` para sus cargas largas sin transacción interactiva. Cuando `DIRECT_URL` no esté definida, el sistema SHALL usar `DATABASE_URL` como fallback sin fallar al arrancar.

#### Scenario: Usa DIRECT_URL cuando está definida
- **WHEN** el entorno define `DIRECT_URL`
- **THEN** el seeder abre su conexión Prisma usando esa URL

#### Scenario: Fallback a DATABASE_URL sin DIRECT_URL
- **WHEN** el entorno NO define `DIRECT_URL` pero sí `DATABASE_URL`
- **THEN** el seeder arranca normalmente usando `DATABASE_URL`, sin lanzar error de configuración
