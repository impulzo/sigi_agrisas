## Context

Ver `proposal.md` — Why. Diagnóstico confirmado con 2 agentes de exploración + medición directa:
- Prisma crudo contra la BD real (`prisma.productPrice.findMany`, reusando conexión): ~400ms/query — latencia de red real al pooler remoto de Supabase (`us-west-1`), no negociable desde código.
- Log del servidor dev: `GET /api/v1/admin/products/:id/prices` real (con middleware + RBAC + controller + use case + repo) tarda ~1400-1600ms — tres a cuatro round-trips secuenciales explican exactamente ese total.
- `refreshCatalogCache` (`app/_lib/offline/catalogCache.ts:91-92`) dispara `Promise.all(products.map(...))` dos veces (precios, luego dosificaciones) sobre el array completo de productos — sin `p-limit` ni chunking, no hay dependencia de concurrencia limitada instalada en el repo.
- `getCatalogStalenessMs()` (`catalogCache.ts:135-139`) ya existe y ya se usa en `OfflineSyncProvider.tsx` — pero sólo para pintar el badge de staleness en UI, nunca para decidir si saltar un refresh.

## Goals / Non-Goals

**Goals:**
- Que abrir cualquier ruta privada con offline habilitado no dispare más de 8 requests HTTP concurrentes por lote de sync.
- Que un refresh automático no repita trabajo si el caché ya está fresco (< 5 min).
- Que `GET /api/v1/admin/products/:id/prices` haga como máximo 2 round-trips a Postgres en vez de 3-4, sin cambiar su contrato observable (payload, códigos de error).

**Non-Goals:**
- No se introduce ninguna librería nueva (`p-limit`, `p-queue`) — el helper de concurrencia se escribe inline, es ~10 líneas y evita una dependencia para un caso de uso único.
- No se toca ningún otro consumidor de `productRepo.findById` (`CreateProductPriceUseCase`, `UpdateProductPriceUseCase`, etc.) — ellos sí necesitan los datos completos del producto.
- No se cambia el intervalo de 10 min del refresh automático, ni el mecanismo de `visibilitychange` — sólo se les antepone un gate.
- No se resuelve la latencia de red real (~400ms/round-trip) al pooler remoto — es un costo fijo de la topología (dev machine → Supabase `us-west-1`), no un bug de código.

## Decisions

**D1 — Concurrencia limitada con un worker pool manual, no una librería.**
```ts
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
```
Alternativa considerada: agregar `p-limit`. Descartada — es el único lugar del repo que necesitaría concurrencia limitada; una función privada de 10 líneas es más simple que una dependencia nueva para un caso de uso.

**D2 — Límite de concurrencia: 8.**
Elegido porque los navegadores ya limitan ~6 conexiones HTTP/1.1 concurrentes por origen — 8 está en ese orden de magnitud sin sobre-optimizar. No es un valor mágico crítico: si en producción (con pooler dimensionado distinto) conviene otro número, es un cambio de una constante, no de diseño.

**D3 — Umbral de staleness: 5 minutos, sólo en el path automático.**
El intervalo de refresh automático ya es de 10 min (`OfflineSyncProvider.tsx`); un umbral de 5 min evita que montar/desmontar la ruta repetidamente (o alternar `visibilitychange` rápido) dispare refrescos redundantes, sin interferir con el intervalo de 10 min (10 > 5, nunca se cancelan entre sí). El refresh manual (`refreshCatalogNow`, botón explícito del usuario) **no** lleva este gate — es una acción deliberada, no automática, y debe reflejar siempre el estado más reciente sin importar cuándo fue el último sync.

**D4 — `ProductRepository.exists()` en vez de reusar `findById` con un flag "liviano".**
Alternativa considerada: agregar un parámetro opcional a `findById` (ej. `findById(id, { light: true })`) para que omita el `include`/`resolveUnitDescriptions`. Descartada — cambia la firma de un método ya usado en 5+ lugares y complica su contrato; un método nuevo y explícito (`exists`) es más claro sobre su propósito único (chequeo de existencia) y no arriesga romper ningún otro caller.

**D5 — `exists()` no filtra por `isActive`.**
El `findById` actual tampoco filtra por `isActive` (cualquier producto, activo o no, "existe" a efectos de este endpoint) — mantener el mismo criterio evita un cambio de comportamiento no solicitado (ej. que un producto desactivado deje de listar sus precios, lo cual no está pedido ni documentado en `products-api`).

**D6 — Paralelizar `exists()` + `branchRepo.findById()` con `Promise.all`, no cambiar el orden de validación.**
El use case sigue lanzando `ProductNotFoundError` antes que `ProductPriceBranchNotFoundError` cuando ambos fallarían (mismo orden que hoy) — se resuelven en paralelo pero se evalúan en el mismo orden después de que ambas promesas resuelven, así que el código de error visible al cliente no cambia ante inputs inválidos simultáneos.

## Risks / Trade-offs

- **[Riesgo] Bajar el límite de concurrencia a 8 hace que sincronizar el catálogo completo (~921 productos) tarde más en wall-clock que antes (aunque antes "no terminaba" por saturación)** → Mitigación: es el trade-off correcto — preferible que tarde ~1-2 minutos de forma predecible a que cuelgue indefinidamente el resto de la app. Si el tiempo total importa, subir el límite es un cambio de una constante.
- **[Riesgo] El umbral de 5 min es una constante arbitraria, no configurable por env var** → Aceptado por ahora (YAGNI); si se necesita ajustar por entorno, es un cambio trivial de una línea, no requiere over-engineering hoy.
- **[Trade-off] `exists()` agrega un método más al puerto `ProductRepository`, ampliando su superficie** → Aceptado — es un método de una sola responsabilidad, coherente con el patrón ya usado en otros repos del proyecto para chequeos existencia-only.
