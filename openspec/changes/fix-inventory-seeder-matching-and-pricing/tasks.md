## 1. Normalización dígito-unidad (historia 1)

- [x] 1.1 `prisma/seeds/lib/normalizeProductName.ts` — agregar paso de normalización que colapsa el espacio entre un dígito y la letra de unidad inmediatamente siguiente (ej. `"10 L"` → `"10L"`, `"1 KG"` → `"1KG"`), dentro de la misma función `normalizeProductNameForMatching` (D1)
- [x] 1.2 Test unitario en `tests/unit/modules/seeds/inventory/` — `normalizeProductNameForMatching("ATP UP DE 10L")` y `normalizeProductNameForMatching("ATP UP 10 L")` producen el mismo valor normalizado
- [x] 1.3 Test unitario — casos con espacio entre palabras completas (no dígito-unidad) NO se colapsan (ej. `"CARBOXY MIN L"` conserva sus espacios)
- [x] 1.4 Confirmar que los 20 casos existentes de `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts` pasan sin modificarse

## 2. Alias de producto Tlaxiaco → code existente (historia 2)

- [x] 2.1 Nuevo `prisma/seeds/data/tlaxiacoProductAliases.ts` — exporta `TLAXIACO_PRODUCT_ALIASES: Record<string, string>` con los 5 pares confirmados: `"BIOFIT G"→"BF1KG"`, `"CARBOXY MIN G GRANULADO"→"CMING"`, `"NUTRISORB G 25 KG"→"NUTG"`, `"PROMESOL 5X"→"P5X1LT"`, `"RADIGROW G GRANULADO"→"RADG1"`
- [x] 2.2 `prisma/seeds/lib/inventory/productWriter.ts::resolveByName` — tras el intento de match por nombre normalizado sin resultado, consultar `TLAXIACO_PRODUCT_ALIASES[row.name]` (llave = nombre crudo de la fila) antes de sintetizar `code` nuevo (D2)
- [x] 2.3 Cuando el alias resuelva, `prisma.product.findUnique({where:{code: aliasCode}})` y usar ese producto sin modificar `name`/`unit`/`departmentId` — si `aliasCode` no existe en catálogo, contar la fila en `ctx.counters.errors` y omitirla (no crashear la corrida)
- [x] 2.4 Test unitario — fila `name: "BIOFIT G"` resuelve al producto `BF1KG` existente, sin crear producto ni code sintetizado nuevo (repetir para los 4 pares restantes)
- [x] 2.5 Test unitario — fila `name: "PROMESOL G GRANULADO"` y `name: "BESTCURE DOSIS 250 ML"` (no están en el mapa) siguen creando producto nuevo vía flujo normal, sin cambio de comportamiento
- [x] 2.6 Test unitario — `aliasCode` inexistente en catálogo se reporta como `error` y la fila se omite sin abortar la corrida

## 3. Alias de departamento (historia 3)

- [x] 3.1 Nuevo `prisma/seeds/data/departmentAliases.ts` — exporta `DEPARTMENT_ALIASES: Record<string, string>` con los 7 pares confirmados: `"-INNOVAK"→"INNOVAK GLOBAL"`, `"INNOVAK"→"INNOVAK GLOBAL"`, `"INNOVAK OUT"→"INNOVAK GLOBAL"`, `"AGRINOVA OUT"→"AGRINOVA"`, `"KEY BIOTEC OUT"→"KEYBIOTEC"`, `"OTRAS LINEAS OUT"→"OTRAS LINEAS"`, `"FORMULABAGRO OUT"→"FORMU LAB"`
- [x] 3.2 `prisma/seeds/lib/inventory/context.ts::resolveDepartmentId` — primer statement de la función resuelve `name` crudo contra `DEPARTMENT_ALIASES` (comparación exacta) antes de `normalizeDepartmentCode`/upsert (D3)
- [x] 3.3 Test unitario — `resolveDepartmentId("-INNOVAK")`, `resolveDepartmentId("INNOVAK")`, `resolveDepartmentId("INNOVAK OUT")` resuelven todos al mismo `Department` `"INNOVAK GLOBAL"`
- [x] 3.4 Test unitario — los 4 pares restantes (`AGRINOVA OUT`, `KEY BIOTEC OUT`, `OTRAS LINEAS OUT`, `FORMULABAGRO OUT`) resuelven a su base
- [x] 3.5 Test unitario — `departmentName` fuera del mapa (ej. `"AGROMEN AGRISAS"`, `"LABMA-microbiologia"`) NO se fusiona, conserva comportamiento actual
- [x] 3.6 Test de integración — el alias aplica igual desde el plan MATRIZ (Agrisas), un plan de tienda, y el plan TLAXIACO (mismo `resolveDepartmentId` compartido vía `ctx`)

## 4. Precio vacío/0 no se escribe como override falso (historia 4)

- [x] 4.1 `prisma/seeds/lib/inventory/types.ts` — agregar `emptyPriceRows: number` y `tlaxiacoAliased: number` a `TiendasSeedCounters` y a `emptyCounters()` (D5)
- [x] 4.2 `prisma/seeds/lib/inventory/seedBranch.ts` — antes de invocar `writeBranchPriceIfDivergent`, si `row.prices[0]?.value` es `0`/ausente, incrementar `ctx.counters.emptyPriceRows` y NO invocar `writeBranchPriceIfDivergent` (D4); si es `> 0`, comportamiento actual sin cambio
- [x] 4.3 Confirmar que `BranchInventory` (vía `upsertInventory`) se sigue creando/actualizando igual para esa fila, independientemente de si se escribió precio o no
- [x] 4.4 `productWriter.ts::resolveByName` (paso 2.2) — incrementar `ctx.counters.tlaxiacoAliased` cuando el match se resuelva vía `TLAXIACO_PRODUCT_ALIASES`
- [x] 4.5 Reporte del seeder (`report.ts` o equivalente) — imprimir `emptyPriceRows` y `tlaxiacoAliased` junto al resto de contadores existentes
- [x] 4.6 Test unitario — producto con `ProductPrice(branchId:null, price:292)` existente y fila con `price:0` → no se escribe `ProductPrice` para esa sucursal, se cuenta en `emptyPriceRows`
- [x] 4.7 Test unitario — producto nuevo sin ningún `ProductPrice` previo y fila con `price:0` → producto/inventario se crean, ningún `ProductPrice` se escribe, se cuenta en `emptyPriceRows`
- [x] 4.8 Test unitario — fila con `price > 0` mantiene comportamiento actual sin cambio (regresión sobre `writeBranchPriceIfDivergent`)

## 5. Verificación final

- [x] 5.1 `npm test` completo — confirmar que ningún test existente se rompe y toda la suite pasa
- [x] 5.2 Verificación manual contra servidor real con DB de desarrollo: correr `npm run seed:inventory-tiendas` dos veces (idempotencia) y comparar conteo de productos/departamentos INNOVAK antes/después del fix — confirmar que los ~50 casos de espaciado + 5 alias de producto dejan de crear duplicados, y que los 7 pares de departamento se fusionan
- [x] 5.3 Confirmar en DB real que ningún `ProductPrice.price = 0` se creó para las filas con precio vacío de la corrida de verificación
- [x] 5.4 `npm run build` — sin errores de tipos
