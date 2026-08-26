## 1. Sync offline — concurrencia limitada

- [x] 1.1 En `app/_lib/offline/catalogCache.ts`, agregar la función privada `mapWithConcurrency<T, R>(items, limit, fn)` (worker pool manual, sin dependencia nueva)
- [x] 1.2 Agregar constante `PRICE_FETCH_CONCURRENCY = 8` y reemplazar `Promise.all(products.map((p) => pullPricesFor(p.id)))` y `Promise.all(products.map((p) => pullDosificationsFor(p.id)))` por `mapWithConcurrency(products, PRICE_FETCH_CONCURRENCY, (p) => pullPricesFor(p.id))` (idem dosificaciones)

## 2. Sync offline — gate de staleness en el refresh automático

- [x] 2.1 En `app/_lib/offline/catalogCache.ts`, exportar `const AUTO_REFRESH_MIN_INTERVAL_MS = 5 * 60_000`
- [x] 2.2 En `app/(private)/_blocks/OfflineSyncProvider.tsx`, en el `useEffect` que define `tryRefresh`, consultar `getCatalogStalenessMs()` antes de llamar `refreshCatalogCache` y saltar si `staleness !== null && staleness < AUTO_REFRESH_MIN_INTERVAL_MS`
- [x] 2.3 Confirmar que `refreshCatalogNow` (refresh manual) NO lleva el gate — sigue llamando `refreshCatalogCache` directo sin condición

## 3. Backend — `ProductRepository.exists`

- [x] 3.1 Agregar `exists(id: string): Promise<boolean>` a la interfaz `ProductRepository` (`src/modules/products/application/ports/ProductRepository.ts`)
- [x] 3.2 Implementar en `PrismaProductRepository` con `prisma.product.findUnique({ where: { id }, select: { id: true } })` → `!!row` (sin `include`, sin `resolveUnitDescriptions`)
- [x] 3.3 Implementar en `InMemoryProductRepository` sobre `this.store`

## 4. Backend — `ListProductPricesUseCase` paraleliza y usa `exists`

- [x] 4.1 Reemplazar `const product = await this.productRepo.findById(productId); if (!product) throw ...` por `Promise.all([productRepo.exists(productId), branchId && branchRepo ? branchRepo.findById(branchId) : Promise.resolve(null)])`, preservando el orden de errores (`ProductNotFoundError` antes que `ProductPriceBranchNotFoundError`)

## 5. Tests

- [x] 5.1 Agregar test en `tests/unit/modules/products/application/use-cases/ListProductPricesUseCase.branchScoping.test.ts`: lanza `ProductNotFoundError` cuando el producto no existe (gap de cobertura detectado, no existía)
- [x] 5.2 Confirmar que los tests existentes de `ListProductPricesUseCase` (ordering + branchScoping) siguen en verde sin modificación
- [x] 5.3 `npx jest` — suite completa en verde: 510/510 suites, 3699/3699 tests (uno más que el baseline, el test nuevo de 5.1)

## 6. Verificación real

- [x] 6.1 Medido con Prisma crudo contra la BD real: query simple reusando conexión ≈ 400ms/round-trip — confirma que 3-4 round-trips secuenciales explican el ~1.4-1.6s observado antes del fix
- [x] 6.2 Reiniciado el dev server limpio, login, `/pos`, sucursal Tlaxiaco seleccionada — confirmado en el log del servidor: tiempo por request `.../prices` bajó de ~1400-1600ms a **~800-930ms** (2 round-trips en vez de 3-4), y el catálogo visible cargó en ~3s en vez de quedarse en spinner infinito
- [~] 6.3 Retomar las tareas 6.1-6.4 de `fix-pos-price-lookup-branch-scope/tasks.md`: **parcialmente verificado**. La lógica de `branchId` ya estaba confirmada end-to-end por HTTP directo en esa change (TAPON_1 → `price: 8, isOverride: true` sin `branchId` da `[]`; KAB1 → `price: 770` en Tlaxiaco vs `3666.65` en Matriz). El click-through real en Playwright para abrir `PriceTierPicker` en el POS quedó **inconcluso** — durante la sesión de browser el Chrome mostró pestañas de Gmail/GitHub/Supabase abriéndose espontáneamente (uso concurrente del mismo browser por otro proceso/persona), lo que invalida la fiabilidad de esa prueba puntual. No es un problema del código — la lógica de negocio ya está probada por otras vías (HTTP directo + unit tests). Pendiente repetir el click-through en una sesión de browser exclusiva si se requiere el checkbox visual completo.
- [ ] 6.4 `opsx:verify` — pendiente, a ejecutar cuando el usuario lo pida

## Nota de cierre

Los fixes de código (secciones 1-5) están completos, probados por unit tests (suite completa en verde) y verificados con medición real de performance (6.1, 6.2). Lo único que no se pudo cerrar con evidencia visual de browser fue el click-through de `PriceTierPicker` (6.3), por interferencia de un browser compartido — la corrección subyacente ya está confirmada por HTTP directo desde el change `fix-pos-price-lookup-branch-scope`.
