## Context

El seeder v3 (`prisma/seeds/inventory-tiendas.ts` + `lib/inventoryTiendasSeedLogic.ts`, ver `openspec/changes/archive/2026-08-26-seed-tiendas-inventory-v3/`) implementó la carga real de `INVENTARIOS TIENDAS.xlsx` como 3 loops secuenciales dentro de una sola función `seedInventoryTiendas` (~250 líneas): uno para `INV AGRISAS` (refresh de Matriz), uno para las 4 tiendas de code alineado, uno para Tlaxiaco (matching por nombre). Cada loop repite el mismo patrón (resolver sucursal → resolver/crear producto → upsert de inventario → upsert de precio condicional) con variaciones sutiles de comportamiento (¿el `update` de producto pisa el nombre o lo preserva? ¿la cantidad viene de la fila o es `0` fijo? ¿el match es por `code` o por nombre normalizado?).

Ver `proposal.md — Why` para la motivación completa. Este documento cubre únicamente el cómo.

Precondición dura ya cumplida: `add-branch-scoped-prices` (archivado) migró la unicidad `(productId, branchId, name)` de `ProductPrice`. `inventory-branch-scope-mode` (37/37 tareas, sin archivar) ya implementó `INVENTORY_SCOPE_MODE` y su gate en POS/Cotizaciones — este change no toca ese código, sólo agrega la validación de datos que ese modo necesita como precondición.

## Goals / Non-Goals

**Goals:**
- La sucursal deja de ser una rama de código: se convierte en un dato (`BranchSeedPlan`) ejecutado por un único motor `seedBranch` (historia 1).
- `seedInventoryTiendas`/`printTiendasSeedReport` mantienen su firma pública exacta — el runner (`inventory-tiendas.ts`) y los 20 tests existentes de `inventoryTiendasSeedLogic.test.ts` no requieren cambios.
- Cerrar el descarte silencioso de productos nuevos de tienda sin departamento (historia 2).
- Dar visibilidad a productos sin ninguna fila de `branch_inventory`, sin auto-asignarlos (historia 3).
- Un solo comando de bootstrap completo (historia 4).
- Conexión alineada con el patrón ya usado por `prisma/seed.ts` para cargas largas (historia 5).
- Eliminar la duplicación de tipos entre generador y datos embebidos (historia 6).

**Non-Goals:**
- No se modifica `SHEET_CONFIGS`, los parsers por hoja, ni ningún byte de `inventario-tiendas-v3.ts` más allá del bloque de `import type` (historia 6) — el xlsx fuente y su lectura quedan intactos, confirmado explícitamente por el usuario.
- No se auto-asigna inventario a los productos huérfanos detectados (historia 3) — inventar una fila de `branch_inventory` sin dato real de existencia sería fabricar información; la vía correcta sigue siendo asignación admin, compra o traspaso, ya cubiertas por `admin-branches`/`inventory-api`.
- No se archiva `inventory-branch-scope-mode` como parte de este change — ese archivado es decisión separada del usuario, por protocolo del repo.
- No se toca la política de `quantity: 0` para las 4 tiendas y Tlaxiaco (esas hojas no traen columna de existencia) — decisión ya confirmada explícitamente por el usuario en la fase de exploración: la fila existe (= asignación), el stock real entra por vías operativas posteriores.
- No se cambia el criterio de tolerancia de precio (`0.005`), la sintetización de code de Tlaxiaco, ni el manejo de colisión de code sintetizado — comportamiento ya correcto y cubierto por tests.

## Decisions

**D1 — `BranchSeedPlan` como dato, `seedBranch` como único motor (historia 1).**
```ts
interface BranchSeedPlan {
  branchCode: string;                   // "MATRIZ" | "CHICHICAPAM" | ... | "TLAXIACO"
  rows: NormalizedSeedRow[];
  productMatch: "code" | "name";        // Tlaxiaco = "name" (índice normalizado + code sintetizado)
  productSync: "refresh" | "preserve";  // Matriz = "refresh" (pisa name/unit/dept/sat/iva/ieps)
  priceMode: "base-tiers" | "branch-override";
  quantitySource: "row" | "zero";       // sólo Matriz trae existencia real
  createBranchIfMissing: boolean;       // false para MATRIZ (debe existir ya, seed RBAC la crea)
}
```
`buildBranchSeedPlans(data: TiendasSeedData): BranchSeedPlan[]` construye los 6 planes en el orden fijo documentado en la spec (`data-seeding` — "Orden determinístico de siembra por sucursal"), agrupando `TIENDAS_INVENTORY_DATA` por `branchCode` para las 4 tiendas. `seedBranch(prisma, plan, ctx)` reemplaza los 3 `for` actuales con un único loop parametrizado por los flags del plan.

Alternativa descartada: mantener los 3 loops pero extraer sub-funciones compartidas (helpers ya existen: `resolveDepartmentId`, `resolveBranchId`, `upsertInventory`, `upsertBranchPriceIfDivergent`). Se descarta porque el drift real está en el cuerpo del loop (qué campos se sobrescriben, de dónde sale la cantidad, cómo se resuelve el producto), no en los helpers — extraer sólo helpers no habría corregido la causa raíz de la historia 1.

**D2 — `inventoryTiendasSeedLogic.ts` se conserva como fachada, no se elimina (historia 1).**
La firma pública (`seedInventoryTiendas`, `printTiendasSeedReport`, tipos `TiendasSeedCounters`/`TiendasSeedError`/`TiendasSeedData`/`PrismaLike`) no cambia. Internamente, el archivo pasa a: `export async function seedInventoryTiendas(prisma, data) { const ctx = createSeedContext(prisma); for (const plan of buildBranchSeedPlans(data)) await seedBranch(prisma, plan, ctx); ctx.counters.orphanProducts = await detectOrphanProducts(prisma, ctx.counters); return ctx.counters; }`. Esto evita reescribir `inventory-tiendas.ts` (el runner) y los 20 tests existentes — sólo se agregan casos nuevos.

**D3 — Forma normalizada de fila (`NormalizedSeedRow`) como adaptador, no como reemplazo de los tipos del generador (historia 1/6).**
Los 3 tipos del xlsx (`AgrisasRefreshRow`, `TiendaInventoryRow`, `TlaxiacoRawRow`) siguen siendo la forma de los datos embebidos — no se tocan. `plans.ts` los adapta a `NormalizedSeedRow` (`{sourceRef, code, name, unit, satCode, departmentName, ivaRaw, iepsRaw, quantity, prices}`) sólo para que `seedBranch` tenga una única forma de entrada. Las tiendas y Tlaxiaco emiten un tier único `{tierName: "Precio Publico", value: row.price, isDefault: true}` para reusar el mismo `priceWriter` que Matriz usa con sus 4 tiers reales.

**D4 — Fallback de departamento en tiendas reusa la constante ya usada por Tlaxiaco, sin crear un segundo departamento genérico (historia 2).**
El change archivado ya introdujo `FALLBACK_DEPARTMENT_NAME = "Sin Departamento"` / `code: "SIN_DEPARTAMENTO"` para Tlaxiaco (`2026-08-26-seed-tlaxiaco-fallback-department`). Este change reutiliza exactamente esa misma resolución (`resolveDepartmentId(FALLBACK_DEPARTMENT_NAME)`, cacheada) para las 4 tiendas de code alineado cuando el producto es nuevo y no trae `departmentName`. El contador se reporta por separado (`branchFallbackDepartment`) para no mezclarlo con el ya existente `tlaxiacoFallbackDepartment` en el reporte — permite auditar cuántas filas de cada origen cayeron al fallback.
Alternativa descartada: aplicar el fallback también cuando el producto YA existe y la fila no trae departamento — se descarta porque pisaría el `departmentId` ya asignado (potencialmente correcto) con el fallback genérico sólo porque esa fila puntual no lo trae explícito; el criterio "producto existente conserva su estado" ya es el mismo usado por `nameMismatch` (no pisa `name`).

**D5 — `detectOrphanProducts` es una consulta de diferencia de conjuntos, ejecutada una sola vez al final (historia 3).**
```ts
async function detectOrphanProducts(prisma: PrismaLike): Promise<{ count: number; sampleCodes: string[] }> {
  const activeProducts = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, code: true } });
  const assignedProductIds = new Set((await prisma.branchInventory.findMany({ select: { productId: true } })).map(r => r.productId));
  const orphans = activeProducts.filter(p => !assignedProductIds.has(p.id));
  return { count: orphans.length, sampleCodes: orphans.slice(0, 20).map(p => p.code) };
}
```
Corre después de los 6 planes (no intercalado), sobre el estado final de la corrida — cubre huérfanos preexistentes de antes de este seeder y cualquier producto que, por algún error de fila, terminó creado sin inventario. Requiere 2 métodos nuevos en `PrismaLike`: `product.findMany({where, select})` y `branchInventory.findMany({select})`.
Alternativa descartada: detectar huérfanos por sucursal durante cada `seedBranch` — se descarta porque un producto puede tener fila en una sucursal y no en otra sin ser "huérfano" (el requirement es "ninguna fila en ninguna sucursal"); sólo es correcto como chequeo global post-corrida.

**D6 — `seed:all` es composición de scripts npm existentes vía `&&`, no un script TS nuevo (historia 4).**
```json
"seed:all": "npm run seed && npm run seed:folios && npm run seed:sat-units && npm run seed:sat-codes && npm run seed:sat-catalogs && npm run seed:ticket-settings && npm run seed:inventory-tiendas"
```
`&&` ya da el comportamiento "abortar en la primera falla" pedido por la spec, sin escribir un orquestador TS que reimplemente manejo de errores que cada script ya tiene. Orden: `seed` primero porque `seedInventoryTiendas` aborta sin `MATRIZ` (ver Context); catálogos SAT antes del inventario porque el inventario referencia `satProductCode`/`unit` (aunque no los valida contra el catálogo SAT en este seeder, mantiene el orden lógico de dependencia de datos); inventario al final.
Alternativa descartada: script TS con manejo de errores estructurado (reintentos, rollback parcial) — fuera de alcance; ningún seeder existente lo tiene y añadiría una superficie nueva sin pedido explícito.

**D7 — `DIRECT_URL` con fallback simple a `DATABASE_URL`, sin abstraer una utilidad compartida (historia 5).**
```ts
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});
```
Mismo patrón inline que ya usa `prisma/seed.ts:8-10`. No se extrae una función `resolveSeedDatabaseUrl()` compartida entre ambos archivos — sería una abstracción de una sola línea usada en 2 lugares, no justifica el indirection para este change.

**D8 — Tipos compartidos en `prisma/seeds/data/inventarioTiendasTypes.ts`, sólo declaraciones (historia 6).**
El módulo nuevo exporta únicamente las 3 interfaces (`AgrisasRefreshRow`, `TiendaInventoryRow`, `TlaxiacoRawRow`) sin lógica. `generate-inventario-tiendas-data.ts` las importa en vez de declararlas (`:117-147` hoy); `inventario-tiendas-v3.ts` cambia su bloque de interfaces a `import type { ... } from "./inventarioTiendasTypes"` — los ~23 000 registros de datos (`AGRISAS_REFRESH_DATA`, `TIENDAS_INVENTORY_DATA`, `TLAXIACO_RAW_DATA`) no se tocan, sólo las ~10 líneas de tipos al inicio del archivo.

## Risks / Trade-offs

- **[Riesgo] El motor unificado (`seedBranch`) podría introducir una regresión sutil en el orden de escritura dentro de una sucursal (ej. escribir inventario antes que precio, cuando hoy es al revés en algún loop)** → Mitigación: los 20 tests existentes de `inventoryTiendasSeedLogic.test.ts` corren sin modificarse contra la fachada nueva; cualquier cambio de orden que altere un contador ya cubierto los rompe. Se añaden casos nuevos sólo para comportamiento nuevo (D4, D5), no se re-test-ea lo ya cubierto.
- **[Riesgo] `detectOrphanProducts` puede reportar huérfanos preexistentes no relacionados con esta corrida (ruido)** → Mitigación: es el comportamiento deseado — la validación es sobre el estado final de la BD, no sólo sobre lo que esta corrida tocó; el reporte ya distingue `orphanProducts` de los demás contadores por sucursal, así que no se confunde con un error de la corrida actual.
- **[Riesgo] Agregar `branchFallbackDepartment` (D4) puede inflar el departamento `SIN_DEPARTAMENTO` con productos que en realidad sí tenían un departamento real fuera del alcance de la columna Excel leída** → Mitigación: mismo trade-off ya aceptado y confirmado por el usuario para Tlaxiaco en `2026-08-26-seed-tlaxiaco-fallback-department`; el reporte hace visible el conteo para revisión manual dirigida, en vez de perder la fila por completo.
- **[Trade-off] `seed:all` no valida que las variables de entorno necesarias por cada script (`DATABASE_URL`, `DIRECT_URL`, `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` opcionales) estén completas antes de arrancar el primer script** → Aceptado: cada script individual ya valida las suyas en startup y aborta con mensaje claro (ver `data-seeding` — "Folios Seed Script Existence", escenario "Sin variables de entorno DB"); `seed:all` hereda esa validación por composición sin duplicarla.
- **[Riesgo] La reestructura (D1-D3) es un refactor de ~250 líneas con lógica de negocio real (precios/inventario reales)** → Mitigación: cobertura de test existente (20 casos) se preserva intacta como red de seguridad; verificación adicional contra la BD real de desarrollo (`npm run seed:inventory-tiendas`, dos veces para confirmar idempotencia) antes de dar el change por verificado, mismo criterio que usó v3.
