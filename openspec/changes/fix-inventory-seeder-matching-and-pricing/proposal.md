## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Dev/ops que corre seeders locales | Como dev/ops, quiero que `normalizeProductNameForMatching` normalice el espacio entre dígito y unidad ("10 L" → "10L", "1 KG" → "1KG") antes de comparar nombres para el matching de Tlaxiaco | para que Tlaxiaco deje de crear productos duplicados con code sintetizado sólo por diferencias de formato de captura, cuando el producto ya existe en Matriz/Tiendas con el mismo nombre pero distinto espaciado | - Fila Tlaxiaco "ATP UP DE 10L" matchea contra producto existente "ATP UP 10 L" (code AT10) tras la normalización, sin crear duplicado<br>- De los 58 nombres INNOVAK previamente sin match, los ~50 casos de sólo-diferencia-de-espaciado ahora matchean correctamente (verificado contra el dataset real)<br>- Nombres que NO comparten ningún dígito-unidad (ej. "BIOFIT G" vs "BIOFIT G 1KG", que sólo difieren por token extra "1KG") siguen sin matchear por este cambio — ese caso lo resuelve la historia 2, no ésta<br>- Los 20 casos existentes de `inventoryTiendasSeedLogic.test.ts` pasan sin modificarse | - Cambio de sólo comparación (no persiste texto normalizado en ningún campo de la BD) — sin superficie de seguridad nueva |
| 2 | Dev/ops que corre seeders locales | Como dev/ops, quiero un mapa de alias de producto (nombre Tlaxiaco → code de catálogo existente) consultado en `resolveByName` antes de sintetizar un code nuevo | para asignar el code real ya registrado a los 5 productos INNOVAK confirmados manualmente (mismo producto, precio idéntico/cercano), en vez de crear una fila de catálogo duplicada sin precio base | - Fila Tlaxiaco "BIOFIT G" resuelve al producto existente `BF1KG` (y los otros 4 pares: CARBOXY MIN G GRANULADO→CMING, NUTRISORB G 25 KG→NUTG, PROMESOL 5X→P5X1LT, RADIGROW G GRANULADO→RADG1), sin crear producto ni code sintetizado nuevo<br>- El alias se consulta ANTES del intento de match por nombre normalizado (o como fallback inmediato si el nombre no matchea) — no compite ni reemplaza la historia 1<br>- "PROMESOL G GRANULADO" y "BESTCURE DOSIS 250 ML" (descartados como match) NO están en el mapa y siguen creándose como producto nuevo vía flujo normal de code sintetizado<br>- Colisión de code sintetizado para nombres fuera del mapa de alias sigue siendo error (comportamiento actual sin cambio) | - El mapa es código estático versionado en el repo (no input de usuario en runtime) — sin superficie de inyección; un `code` de alias que no exista en catálogo debe fallar explícito (error, no creación silenciosa de code inválido) |
| 3 | Dev/ops que corre seeders locales | Como dev/ops, quiero un mapa de alias de departamento (nombre crudo → nombre canónico) consultado en `resolveDepartmentId` antes de resolver/crear el departamento | para fusionar las 3 variantes de captura de INNOVAK ("-INNOVAK", "INNOVAK", "INNOVAK OUT") y el sufijo " OUT" en 4 familias más (AGRINOVA, KEY BIOTEC, OTRAS LINEAS, FORMULABAGRO) en su departamento canónico, sin duplicar departamentos por basura de captura | - Producto con `departmentName: "-INNOVAK"` o `"INNOVAK"` o `"INNOVAK OUT"` en la fila fuente resuelve al departamento `INNOVAK GLOBAL` existente, sin crear un departamento nuevo<br>- Los 4 pares restantes (AGRINOVA OUT→AGRINOVA, KEY BIOTEC OUT→KEYBIOTEC, OTRAS LINEAS OUT→OTRAS LINEAS, FORMULABAGRO OUT→FORMU LAB) resuelven igual<br>- Departamentos NO listados en el mapa de alias (ej. `AGROMEN AGRISAS`, `LABMA-microbiologia`, `LIDA plant research`, `KER BIOTEC LIQUIDOS`) conservan el comportamiento actual — cada nombre distinto sigue creando/usando su propio departamento, sin fusión automática<br>- Aplica en las 3 fuentes (Agrisas/Tiendas/Tlaxiaco) por igual, no sólo Tlaxiaco | - El mapa es código estático versionado (sin input de usuario en runtime); no fusiona departamentos fuera de los 7 pares explícitamente confirmados — evita fusión accidental de categorías reales distintas |
| 4 | Dev/ops que corre seeders locales | Como dev/ops, quiero que el seeder NO escriba ningún `ProductPrice` cuando la fila de tienda/Tlaxiaco trae precio vacío o 0, en vez de escribir ese 0 como override | para no pisar con un precio falso de 0 un precio base real existente, y dejar que el fallback base↔sucursal que el runtime ya implementa (`PrismaProductPriceRepository`, `PosLookupService.getDosificationForSale`) resuelva el precio efectivo | - Fila con `price` vacío/0 y producto que YA tiene precio base (`branchId:null`, "Precio Publico") → no se escribe override; el runtime sigue resolviendo el precio base para esa sucursal sin cambio visible<br>- Fila con `price` vacío/0 y producto SIN precio base ni en ninguna otra sucursal → producto e inventario (branch_inventory) se crean igual; el producto queda sin ningún `ProductPrice`, pendiente de captura manual desde el admin<br>- El reporte del seeder agrega un contador nuevo (`emptyPriceRows`) con el conteo de filas que cayeron en este caso, para visibilidad — la fila NO se rechaza ni se omite el producto/inventario por esto<br>- Filas con `price` > 0 mantienen el comportamiento actual sin cambio (`writeBranchPriceIfDivergent` sigue escribiendo el override cuando diverge del base) | - Nunca se persiste un `ProductPrice.price = 0` como si fuera un precio real capturado — evita que el POS/catálogo muestre o venda a $0 por un vacío del Excel mal interpretado como precio válido |

Nota: las 4 historias comparten el mismo rol (dev/ops de seeders, consistente con el change padre `restructure-inventory-seeder-by-branch`, 36/36 tareas) y son independientes entre sí (INVEST) — cada una toca un archivo/función distinto del motor (`normalizeProductName.ts`, `productWriter.ts`, `context.ts`, `seedBranch.ts`/`priceWriter.ts`) sin depender de que las otras 3 estén implementadas. Ninguna quedó bloqueada por duda — los 7 pares de departamento, los 5 pares de producto y los 2 descartes explícitos vinieron confirmados por el usuario antes de este proposal.

## Why

El change `restructure-inventory-seeder-by-branch` (ya implementado, 36/36 tareas) reestructuró el motor de siembra por plan pero preservó intacto el comportamiento de matching/precio heredado de v3 — comportamiento que, al auditar el Excel real (`INVENTARIOS TIENDAS.xlsx`), resultó tener 3 defectos concretos concentrados de forma visible en el departamento INNOVAK: (1) el matching por nombre de Tlaxiaco falla por una diferencia trivial de espaciado dígito-unidad, generando ~50 productos duplicados con code sintetizado que nunca reciben precio base; (2) el mismo matching no captura 5 casos adicionales donde el nombre difiere más pero el precio idéntico/cercano confirma que es el mismo producto; y (3) departamentos con basura de captura (typos, sufijo " OUT") se crean como categorías separadas en vez de fusionarse al canónico. Un cuarto defecto, independiente de matching: el seeder puede escribir un `ProductPrice` en 0 cuando la fila trae precio vacío, pisando silenciosamente un precio base real con un valor falso. Estos defectos son la causa raíz de que catálogo/admin muestre productos INNOVAK "sin precio" pese a que el dato real sí existe en el Excel, sólo que mal enlazado por el motor de matching.

## What Changes

- `prisma/seeds/lib/normalizeProductName.ts` — `normalizeProductNameForMatching` normaliza el espacio entre dígito y unidad antes de comparar (historia 1).
- Nuevo `prisma/seeds/data/tlaxiacoProductAliases.ts` — mapa estático de 5 pares nombre-Tlaxiaco → code-catálogo, consultado en `resolveByName` (`productWriter.ts`) antes de sintetizar code nuevo (historia 2).
- Nuevo `prisma/seeds/data/departmentAliases.ts` — mapa estático de 7 pares nombre-crudo → nombre-canónico, consultado en `resolveDepartmentId` (`context.ts`) antes de `normalizeDepartmentCode`/upsert (historia 3).
- `prisma/seeds/lib/inventory/seedBranch.ts` — cuando `row.prices[0]?.value` es 0/ausente, ya no se invoca `writeBranchPriceIfDivergent` con precio 0; se cuenta en `emptyPriceRows` del reporte y no se escribe ningún `ProductPrice` para esa fila (historia 4).
- Extensión de `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts` y `tests/unit/modules/seeds/inventory/` con casos nuevos para las 4 historias — los casos existentes no se reescriben.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `data-seeding`: se agregan/ajustan requirements sobre matching por nombre normalizado (Tlaxiaco), alias explícitos de producto y departamento, y manejo de precio vacío/0 en filas de tienda/Tlaxiaco — mismo capability que ya cubre la siembra multi-sucursal, sin introducir una capability nueva.

## Impact

**Nuevos archivos**
- `prisma/seeds/data/tlaxiacoProductAliases.ts`
- `prisma/seeds/data/departmentAliases.ts`

**Modificados**
- `prisma/seeds/lib/normalizeProductName.ts`
- `prisma/seeds/lib/inventory/productWriter.ts` (consulta de alias en `resolveByName`)
- `prisma/seeds/lib/inventory/context.ts` (consulta de alias en `resolveDepartmentId`)
- `prisma/seeds/lib/inventory/seedBranch.ts` (skip de `ProductPrice` en precio vacío/0 + contador `emptyPriceRows`)
- `prisma/seeds/lib/inventory/types.ts` (contador nuevo en `TiendasSeedCounters` si aplica)
- `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts`, `tests/unit/modules/seeds/inventory/*.test.ts`

**No se tocan**
- `INVENTARIOS TIENDAS.xlsx`, `SHEET_CONFIGS`, los parsers por hoja, `inventario-tiendas-v3.ts` (datos embebidos, ~23 000 registros)
- `src/` completo (el seeder sigue sin importar de `src/modules/`)
- El motor por plan (`seedBranch`, `plans.ts`) — sólo se ajusta el comportamiento interno de matching/precio, no la estructura del change padre

**DB**: sin migración de schema. Efecto de la corrida real: menos productos duplicados creados (los 55 casos de matching corregido), menos departamentos duplicados (7 pares fusionados), menos filas de `ProductPrice` con valor 0 falso.

**Dependencia**: change de seguimiento directo a `restructure-inventory-seeder-by-branch` (implementado, 36/36, pendiente de archivar) — no requiere que se archive primero; opera sobre el mismo motor ya en el árbol.
