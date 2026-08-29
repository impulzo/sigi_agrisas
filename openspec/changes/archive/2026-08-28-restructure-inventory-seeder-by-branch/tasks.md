## 1. Tipos compartidos (D8, historia 6)

- [x] 1.1 Crear `prisma/seeds/data/inventarioTiendasTypes.ts` con las 3 interfaces (`AgrisasRefreshRow`, `TiendaInventoryRow`, `TlaxiacoRawRow`), copiadas verbatim desde `generate-inventario-tiendas-data.ts:117-147`
- [x] 1.2 Actualizar `generate-inventario-tiendas-data.ts` para importar los 3 tipos desde `./inventarioTiendasTypes` en vez de declararlos localmente
- [x] 1.3 Actualizar el bloque de emisión del generador (`:375-405`) para que el string escrito en `inventario-tiendas-v3.ts` use `import type {...} from "./inventarioTiendasTypes"` en vez de redeclarar las interfaces
- [x] 1.4 Editar a mano el bloque de interfaces al inicio de `inventario-tiendas-v3.ts` (ya generado) para que coincida con el nuevo formato de emisión — sin tocar ninguno de los 3 arrays de datos (`AGRISAS_REFRESH_DATA`, `TIENDAS_INVENTORY_DATA`, `TLAXIACO_RAW_DATA`)
- [x] 1.5 `npx tsc --noEmit` sobre `prisma/seeds/` — confirmar que no hay error de tipos tras el cambio de origen de las interfaces

## 2. Motor de siembra por plan — tipos y contexto (D1, D3, historia 1)

- [x] 2.1 Crear `prisma/seeds/lib/inventory/types.ts`: `PrismaLike` (mover desde `inventoryTiendasSeedLogic.ts`, extendido con `product.findMany({where, select})` y `branchInventory.findMany({select})` — D5), `NormalizedSeedRow`, `BranchSeedPlan`, `TiendasSeedCounters` (extendido con `branchFallbackDepartment: number` y `orphanProducts: {count: number; sampleCodes: string[]}`), `TiendasSeedError`
- [x] 2.2 Crear `prisma/seeds/lib/inventory/context.ts`: `createSeedContext(prisma)` — mueve `resolveDepartmentId`/`resolveBranchId` (con sus caches `Map`) desde `inventoryTiendasSeedLogic.ts:127-159`, sin cambio de comportamiento
- [x] 2.3 Confirmar que `context.ts` valida la precondición `MATRIZ` existente (mismo chequeo de `inventoryTiendasSeedLogic.ts:121-125`) antes de construir el contexto

## 3. Motor de siembra por plan — writers (D1, historia 1)

- [x] 3.1 Crear `prisma/seeds/lib/inventory/inventoryWriter.ts`: `upsertInventory(prisma, ctx, branchId, productId, quantity)` — mover tal cual desde `:161-168`
- [x] 3.2 Crear `prisma/seeds/lib/inventory/priceWriter.ts`: `writeBasePriceTiers(prisma, productId, tiers)` (mover lógica de Agrisas `:219-229`, incluyendo el `updateMany` de `isDefault` previo) y `writeBranchPriceIfDivergent(prisma, ctx, productId, branchId, branchCode, price)` (mover `upsertBranchPriceIfDivergent` de `:170-183`)
- [x] 3.3 Crear `prisma/seeds/lib/inventory/productWriter.ts`: `resolveAndUpsertProduct(prisma, ctx, row, plan)` — unifica los 3 caminos de resolución de producto (match por code + sync refresh/preserve de `:194-300`, match por nombre normalizado + síntesis de code de `:303-359`) parametrizado por `plan.productMatch`/`plan.productSync`; incluye el fallback de departamento nuevo (D4) cuando `row.departmentName` es `null` y el producto es nuevo
- [x] 3.4 Crear `prisma/seeds/lib/inventory/seedBranch.ts`: `seedBranch(prisma, plan, ctx)` — un solo loop sobre `plan.rows` que llama `resolveAndUpsertProduct` → `upsertInventory` (cantidad de `row.quantity` o `0` según `plan.quantitySource`) → precio (`writeBasePriceTiers` si `plan.priceMode === "base-tiers"`, `writeBranchPriceIfDivergent` si `"branch-override"`), con el mismo aislamiento try/catch por fila y logging de progreso cada 25/50 filas que hoy tienen los 3 loops
- [x] 3.5 Crear `prisma/seeds/lib/inventory/plans.ts`: `buildBranchSeedPlans(data: TiendasSeedData): BranchSeedPlan[]` — adapta `AGRISAS_REFRESH_DATA`/`TIENDAS_INVENTORY_DATA`/`TLAXIACO_RAW_DATA` a `NormalizedSeedRow[]`, agrupa las 4 tiendas por `branchCode`, construye los 6 planes en el orden fijo (MATRIZ → CHICHICAPAM → HUAJUAPAN → PRADERA → ZARIOZ → TLAXIACO), construye el `nameIndex` de Tlaxiaco (`product.findMany` + `normalizeProductNameForMatching`) sólo al llegar a ese plan (después de que los 5 planes anteriores ya corrieron)

## 4. Detección de huérfanos (D5, historia 3)

- [x] 4.1 Crear `prisma/seeds/lib/inventory/report.ts`: mover `printTiendasSeedReport` desde `inventoryTiendasSeedLogic.ts:371-389`, extendido para imprimir `branchFallbackDepartment` y la sección `orphanProducts` (conteo + hasta 20 codes) siempre, incluso en `0`
- [x] 4.2 En `report.ts`, implementar `detectOrphanProducts(prisma): Promise<{count: number; sampleCodes: string[]}>` (D5) — `product.findMany({where: {isActive: true}})` menos `branchInventory.findMany` por `productId`, de solo lectura

## 5. Fachada — `inventoryTiendasSeedLogic.ts` (D2, historia 1)

- [x] 5.1 Reescribir `seedInventoryTiendas(prisma, data)` como: `const ctx = await createSeedContext(prisma); for (const plan of buildBranchSeedPlans(data)) await seedBranch(prisma, plan, ctx); ctx.counters.orphanProducts = await detectOrphanProducts(prisma); return ctx.counters;` — firma pública sin cambios
- [x] 5.2 Re-exportar `printTiendasSeedReport` desde `./inventory/report`
- [x] 5.3 Eliminar el código movido a los módulos nuevos (secciones 2-4) del archivo, dejando sólo la fachada + re-exports de tipos que otros archivos importan (`PrismaLike`, `TiendasSeedData`, `TiendasSeedCounters`, `TiendasSeedError`) desde `./inventory/types`
- [x] 5.4 `npm test -- inventoryTiendasSeedLogic` — confirmar que los 20 casos existentes pasan sin modificarse

## 6. Fallback de departamento en tiendas (D4, historia 2)

- [x] 6.1 En `productWriter.ts` (sección 3.3), cuando `plan.productMatch === "code"` y el producto es nuevo (`!existing`) con `row.departmentName === null`: resolver `FALLBACK_DEPARTMENT_NAME` vía `ctx.resolveDepartmentId` (misma constante/code `SIN_DEPARTAMENTO` ya usada por Tlaxiaco) en vez de retornar error y omitir la fila
- [x] 6.2 Incrementar `counters.branchFallbackDepartment` en ese caso (separado de `tlaxiacoFallbackDepartment`)
- [x] 6.3 Confirmar que el camino "producto existente + `departmentName: null`" sigue sin tocar el `departmentId` ya asignado (no aplica fallback)

## 7. Conexión DIRECT_URL (D7, historia 5)

- [x] 7.1 En `prisma/seeds/inventory-tiendas.ts`, cambiar la construcción de `PrismaClient` para usar `{ datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } } }`
- [x] 7.2 Agregar los 2 métodos nuevos del `PrismaLike` (`product.findMany`, `branchInventory.findMany`) al adapter que construye `prismaLike` en este archivo, delegando al `PrismaClient` real

## 8. Orquestador `seed:all` (D6, historia 4)

- [x] 8.1 Agregar a `package.json`: `"seed:all": "npm run seed && npm run seed:folios && npm run seed:sat-units && npm run seed:sat-codes && npm run seed:sat-catalogs && npm run seed:ticket-settings && npm run seed:inventory-tiendas"`
- [x] 8.2 Agregar a `package.json`: `"seed:generate-inventory": "ts-node --project prisma/seeds/tsconfig.json prisma/seeds/data/generate-inventario-tiendas-data.ts"` (formaliza el comando ya usado a mano; no se ejecuta en este change)

## 9. Tests unitarios nuevos

- [x] 9.1 `tests/unit/modules/seeds/inventory/plans.test.ts`: `buildBranchSeedPlans` produce 6 planes en el orden fijo; agrupa correctamente las 4 tiendas de `TIENDAS_INVENTORY_DATA` por `branchCode`; el `nameIndex` de Tlaxiaco incluye productos creados por planes anteriores en la misma corrida (fake `PrismaLike` en memoria)
- [x] 9.2 `tests/unit/modules/seeds/inventory/seedBranch.test.ts`: `productMatch: "name"` matchea por nombre normalizado y sintetiza code sin match; `productSync: "refresh"` pisa `name/unit/departmentId/satProductCode/ivaRate/iepsRate`; `productSync: "preserve"` sólo cuenta `nameMismatch` sin sobrescribir; `quantitySource: "zero"` siempre upsertea `0`; `quantitySource: "row"` usa `row.quantity`
- [x] 9.3 `tests/unit/modules/seeds/inventory/orphanProducts.test.ts`: producto activo sin ninguna fila de `branch_inventory` → `orphanProducts.count: 1` y aparece en `sampleCodes`; producto con fila en al menos una sucursal → no aparece; la detección no crea ni modifica `branch_inventory`
- [x] 9.4 Extender `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts` con: producto nuevo de tienda sin `departmentName` se crea con fallback (`branchFallbackDepartment` incrementa, no se omite); producto existente de tienda sin `departmentName` en la fila conserva su `departmentId` actual
- [x] 9.5 `npm test` — suite completa en verde, incluyendo los 20 casos existentes de `inventoryTiendasSeedLogic.test.ts` sin modificar y los tests de `inventory-seed-data`/`generateInventarioTiendasData` sin regresión

## 10. Verificación contra BD real

- [x] 10.1 Correr `npm run seed:inventory-tiendas` contra la BD de desarrollo, confirmar reporte final sin errores estructurales y con `branchFallbackDepartment > 0` (las filas que hoy se descartan)
- [x] 10.2 Correr `npm run seed:inventory-tiendas` una segunda vez — confirmar idempotencia: mismos totales, `productsCreated: 0` para los ya sembrados, `branchesCreated: 0`
- [x] 10.3 Verificación SQL directa (`mcp__supabase__execute_sql`): spot-check `KAB1`/KER KAB 1L en las 6 sucursales (mismo valor que v3: $3,666.65 Matriz / $699.35 4 tiendas / $770.00 Tlaxiaco); `SELECT COUNT(*) FROM products p WHERE p.is_active AND NOT EXISTS (SELECT 1 FROM branch_inventory bi WHERE bi.product_id = p.id)` coincide con `orphanProducts.count` del reporte; al menos 1 producto de tienda creado con departamento `SIN_DEPARTAMENTO` que antes se descartaba
- [x] 10.4 Correr `npm run seed:all` sobre una rama de Supabase limpia (`mcp__supabase__create_branch` o BD de prueba) — confirma bootstrap completo de punta a punta sin error
- [x] 10.5 `opsx:verify`
