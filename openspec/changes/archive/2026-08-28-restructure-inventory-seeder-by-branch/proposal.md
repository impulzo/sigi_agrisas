## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Dev/ops que corre seeders locales | Como dev/ops, quiero que el seeder runtime de inventario procese cada sucursal a partir de un `BranchSeedPlan` (dato: code, filas, modo de match de producto, modo de sync, modo de precio, fuente de cantidad) ejecutado por un único motor `seedBranch`, en vez de 3 loops de ~80 líneas cada uno hardcodeados por sucursal (Agrisas/tiendas/Tlaxiaco) | para que agregar o ajustar el comportamiento de una sucursal sea un cambio de datos (un plan nuevo o un flag distinto), no una edición de lógica duplicada con riesgo de drift entre las 3 copias | - `seedInventoryTiendas` (firma pública intacta) produce exactamente los mismos `TiendasSeedCounters` que hoy para la misma entrada — los 20 casos existentes de `inventoryTiendasSeedLogic.test.ts` pasan sin modificarse<br>- El orden de ejecución de planes es fijo y determinístico: MATRIZ → CHICHICAPAM → HUAJUAPAN → PRADERA → ZARIOZ → TLAXIACO (Tlaxiaco último, para maximizar cobertura del índice de nombres)<br>- Workarounds ya verificados contra la DB real (bug de Prisma 5.22 con `branchId: null` en clave compuesta, sección D5 del design archivado) se preservan sin modificar su lógica interna | - Sin `$transaction` global (mismo criterio ya vigente: el volumen excede el timeout de transacción interactiva sobre el pooler); aislamiento try/catch por fila se mantiene sin cambio<br>- El motor sigue sin importar de `src/modules/` (restricción arquitectónica ya vigente en todo `prisma/seeds/`) |
| 2 | Dev/ops que corre seeders locales | Como dev/ops, quiero que una fila de tienda (Chichicapam/Zarioz/Huajuapan/Pradera) con producto nuevo y `departmentName: null` se cree igual con un departamento fallback (`"Sin Departamento"`), en vez de omitirse | para no perder silenciosamente productos reales del Excel sólo porque la hoja no trae departamento explícito en esa fila — hoy 43 filas con `departmentName: null` corren riesgo de descartarse | - Fila de tienda con producto nuevo y `departmentName: null` → se crea el producto con `departmentId` resuelto al fallback compartido, cuenta en un contador nuevo (mismo patrón que ya usa Tlaxiaco, `tlaxiacoFallbackDepartment`)<br>- Fila de tienda con producto YA existente y `departmentName: null` → conserva el `departmentId` actual, no lo pisa a fallback<br>- El mensaje de error `"producto nuevo sin departamento resoluble — omitido"` deja de emitirse para este caso | - El fallback usa la misma constante ya existente (`FALLBACK_DEPARTMENT_NAME`), sin introducir un segundo departamento genérico paralelo |
| 3 | Dev/ops que corre seeders locales | Como dev/ops, quiero que al final de la corrida el seeder detecte productos activos sin ninguna fila en `branch_inventory` y los reporte (sin auto-asignarlos), para saber cuáles quedarían invisibles en el POS si se activa `INVENTORY_SCOPE_MODE=branch` | porque ese flag ya está implementado (`inventory-branch-scope-mode`, 37/37 tareas) y depende de que todo producto vendible tenga al menos una fila de inventario asignada; hoy el seeder no valida esa precondición | - Tras correr todos los planes, el reporte incluye un conteo `orphanProducts` y hasta 20 `code` de ejemplo de productos activos sin fila en `branch_inventory`<br>- La detección es de solo lectura: no crea ni modifica ninguna fila de `branch_inventory` para "corregir" el huérfano<br>- Con 0 huérfanos, el reporte lo indica explícitamente (no omite la sección) | - No expone en el reporte más que `code`/`name` ya visibles en el propio catálogo — no cruza con datos de otra sucursal |
| 4 | Dev/ops que corre seeders locales | Como dev/ops, quiero un comando único `npm run seed:all` que corra, en orden, RBAC/Matriz/tax-rates → catálogos SAT → inventario multi-sucursal, para dejar una base de datos nueva lista sin memorizar el orden implícito de 7 scripts sueltos | porque `seedInventoryTiendas` hoy aborta si la sucursal `MATRIZ` no existe (depende de que `npm run seed` ya haya corrido), y ese orden de dependencia no está documentado ni automatizado en ningún lado | - `npm run seed:all` ejecuta en secuencia: `seed` → `seed:folios` → `seed:sat-units` → `seed:sat-codes` → `seed:sat-catalogs` → `seed:ticket-settings` → `seed:inventory-tiendas`, abortando si cualquiera falla<br>- Corrido sobre una base de datos limpia, termina sin error y con `orphanProducts: 0`<br>- Re-ejecutar `seed:all` sobre una BD ya sembrada es idempotente (mismos totales, sin duplicados) — mismo criterio de idempotencia que ya cumple cada script individual | - No introduce ningún nuevo acceso a `.env`/secrets — reutiliza exactamente las mismas variables que cada script ya lee por separado |
| 5 | Dev/ops que corre seeders locales | Como dev/ops, quiero que `inventory-tiendas.ts` se conecte por `DIRECT_URL` (con fallback a `DATABASE_URL`) en vez del pooler PgBouncer, igual que ya hace `prisma/seed.ts` | porque el seeder ejecuta ~4 000 round-trips secuenciales sin transacción — el mismo patrón de carga larga que `prisma/seed.ts` ya documentó como problemático sobre el pooler en modo transacción | - Con `DIRECT_URL` definida en el entorno, el seeder la usa para su `PrismaClient`<br>- Sin `DIRECT_URL` definida, cae a `DATABASE_URL` sin romper (no lanza al arrancar) | - No se loguea ni expone la connection string en ningún `console.log` del reporte |
| 6 | Dev/ops que corre seeders locales | Como dev/ops, quiero que las 3 interfaces de datos de inventario (`AgrisasRefreshRow`, `TiendaInventoryRow`, `TlaxiacoRawRow`) vivan en un único módulo compartido importado tanto por el generador como por el archivo `.ts` que este emite, en vez de estar declaradas por duplicado en ambos lugares | porque hoy pueden divergir en silencio (`transpileOnly: true` no detecta el desacople en tiempo de ejecución) si alguien edita una copia sin la otra | - `generate-inventario-tiendas-data.ts` y `inventario-tiendas-v3.ts` importan los 3 tipos desde el módulo compartido, sin redeclararlos localmente<br>- Regenerar `inventario-tiendas-v3.ts` (aunque no se haga en este change) seguiría emitiendo datos con la misma forma que hoy — cero cambio de comportamiento, sólo de origen del tipo | - N/A (cambio de tipos en tiempo de compilación, sin superficie de runtime ni de seguridad) |

Nota: las 6 historias son independientes entre sí (INVEST) y comparten el mismo rol (dev/ops de seeders locales, consistente con el change archivado `2026-08-26-seed-tiendas-inventory-v3`); ninguna requirió pregunta adicional porque cada una tiene comportamiento concreto y verificable ya acotado por el análisis técnico previo del código existente.

## Why

El seeder v3 (`prisma/seeds/inventory-tiendas.ts` + `lib/inventoryTiendasSeedLogic.ts`) funciona pero quedó implementado como 3 loops monolíticos casi idénticos (Agrisas, tiendas de code alineado, Tlaxiaco) dentro de una sola función de ~250 líneas: la sucursal es una rama de código, no un dato. Esto genera drift entre las 3 copias y hace costoso cualquier ajuste (historia 1).

Ese mismo diseño descarta silenciosamente productos nuevos de tienda sin departamento resoluble (43 filas del Excel real están en ese caso), contradiciendo el objetivo de sembrar toda la data disponible (historia 2).

Por otro lado, el change `inventory-branch-scope-mode` (ya implementado, 37/37 tareas, pendiente sólo de archivar) hace que la fila de `branch_inventory` tenga doble semántica — cantidad **y** asignación/disponibilidad del producto en esa sucursal. El seeder de inventario es la precondición de datos para ese modo, pero hoy no valida ni reporta si algún producto quedó sin ninguna fila de inventario en ninguna sucursal (historia 3), lo que lo dejaría invisible en el POS sin ninguna señal de alerta.

Finalmente, hay tres defectos operativos menores heredados de v3: no existe un comando único de bootstrap para una BD nueva (historia 4), el seeder usa el pooler para una carga larga sin transacción cuando el propio `prisma/seed.ts` ya documentó ese patrón como problemático (historia 5), y las interfaces de datos están duplicadas entre el generador y el archivo que emite (historia 6).

Este change reestructura el motor runtime y corrige estos defectos **sin tocar la fuente de datos**: `INVENTARIOS TIENDAS.xlsx` sigue siendo el archivo vigente, `SHEET_CONFIGS` y los parsers por hoja no cambian, y `inventario-tiendas-v3.ts` no se regenera (sólo su bloque de interfaces pasa a `import type` desde el módulo compartido de la historia 6).

## What Changes

- Nuevo motor de siembra por plan: `prisma/seeds/lib/inventory/{types,context,productWriter,priceWriter,inventoryWriter,seedBranch,plans,report}.ts` — la sucursal es un `BranchSeedPlan` (dato), procesado por un único `seedBranch(prisma, plan, ctx)` en vez de 3 loops hardcodeados.
- `prisma/seeds/lib/inventoryTiendasSeedLogic.ts` pasa a ser una fachada delgada que re-exporta `seedInventoryTiendas`/`printTiendasSeedReport` con la misma firma pública, implementados internamente sobre el motor nuevo.
- Fallback de departamento (`FALLBACK_DEPARTMENT_NAME`) aplicado también a las 4 tiendas de code alineado, no sólo a Tlaxiaco — corrige el descarte silencioso de filas nuevas sin departamento.
- Nueva validación de solo lectura `detectOrphanProducts(prisma)`: al final de la corrida, cuenta y lista productos activos sin ninguna fila en `branch_inventory`; se agrega al reporte estructurado (`orphanProducts` + primeros 20 codes). No auto-asigna inventario.
- Nuevo script `npm run seed:all` que orquesta, en orden, `seed` → `seed:folios` → `seed:sat-units` → `seed:sat-codes` → `seed:sat-catalogs` → `seed:ticket-settings` → `seed:inventory-tiendas`. Nuevo script `npm run seed:generate-inventory` que formaliza (sin correrlo en este change) el comando ya usado a mano para el generador xlsx.
- `inventory-tiendas.ts` se conecta con `DIRECT_URL` (fallback a `DATABASE_URL`) en vez del pooler, mismo patrón que `prisma/seed.ts`. El `PrismaLike` gana `product.findMany({where})` y `branchInventory.findMany` para la validación anti-huérfanos.
- Nuevo módulo compartido `prisma/seeds/data/inventarioTiendasTypes.ts` con las 3 interfaces (`AgrisasRefreshRow`, `TiendaInventoryRow`, `TlaxiacoRawRow`), importado por el generador y por `inventario-tiendas-v3.ts` (sólo el bloque de tipos cambia; los ~23 000 registros de datos no se tocan).

## Capabilities

### New Capabilities
(ninguna — este change reestructura y extiende siembra de datos ya cubierta por `data-seeding`)

### Modified Capabilities
- `data-seeding`: los 7 requirements existentes de siembra multi-sucursal se reexpresan sobre el pipeline por plan (mismo comportamiento observable, distinta estructura interna); se agregan 3 requirements nuevos — departamento fallback en tiendas de code alineado, validación de solo lectura anti-huérfanos de `branch_inventory`, y orquestador `seed:all`.

## Impact

**Nuevos archivos**
- `prisma/seeds/lib/inventory/{types,context,productWriter,priceWriter,inventoryWriter,seedBranch,plans,report}.ts`
- `prisma/seeds/data/inventarioTiendasTypes.ts`
- `tests/unit/modules/seeds/inventory/{plans,seedBranch,orphanProducts}.test.ts`

**Modificados**
- `prisma/seeds/lib/inventoryTiendasSeedLogic.ts` (fachada, firma pública intacta)
- `prisma/seeds/inventory-tiendas.ts` (`DIRECT_URL` + 2 métodos nuevos de `PrismaLike`)
- `prisma/seeds/data/generate-inventario-tiendas-data.ts` (importa tipos compartidos, sin cambio de parseo)
- `prisma/seeds/data/inventario-tiendas-v3.ts` (sólo bloque de interfaces → `import type`)
- `package.json` (`seed:all`, `seed:generate-inventory`)
- `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts` (se extiende con el caso del fallback de departamento en tiendas; los 20 casos existentes no se reescriben)

**No se tocan**
- `INVENTARIOS TIENDAS.xlsx`, `SHEET_CONFIGS`, los parsers por hoja, los ~23 000 registros embebidos
- `src/` completo (el seeder sigue sin importar de `src/modules/`)
- El change archivado `2026-08-26-seed-tiendas-inventory-v3`

**DB**: sin migración de schema. Efecto de la corrida real: más productos de tienda creados (los que hoy se descartan por falta de departamento), mismo total de inventario/precio para el resto de las filas.

**Dependencia**: ninguna migración adicional a `add-branch-scoped-prices` (ya archivado) ni a `inventory-branch-scope-mode` (ya implementado, 37/37, pendiente de archivar) — este change es compatible con ambos sin requerir que se archiven primero.
