## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/vendedor abriendo cualquier pantalla privada con offline habilitado | Como cajero/vendedor, quiero que el sync offline del catálogo no dispare cientos de requests simultáneas ni se repita si el caché ya está fresco, para que el POS/Cotizaciones/Inventario carguen rápido en vez de colgarse | `refreshCatalogCache` hace `Promise.all` sin límite sobre los ~921 productos (precios + dosificaciones = hasta ~1800 requests concurrentes) cada vez que se monta una ruta privada con `offlineEnabled=true`, sin usar el `getCatalogStalenessMs()` ya existente para evitar refrescos redundantes | - `refreshCatalogCache` limita la concurrencia de los fetches de precios/dosificaciones por producto a un máximo fijo (ej. 8 en vuelo), nunca dispara los ~921 a la vez<br>- El refresh automático (montaje, intervalo de 10 min, `visibilitychange`) se salta si el caché tiene menos de un umbral configurado (ej. 5 min) de antigüedad<br>- El refresh manual (botón "Cola de sincronización offline" → `refreshCatalogNow`) sigue forzando el refresh siempre, sin el gate de staleness — es intención explícita del usuario<br>- El intervalo automático de 10 min sigue disparando el refresh igual que hoy (10 min > umbral de 5 min, no se anulan entre sí) | - No aplica autorización nueva (mismo `products:read`/`GET` ya usados); el cambio es puramente de cadencia/concurrencia del cliente, no de qué datos se exponen ni a quién |
| 2 | Cajero/vendedor consultando precios de un producto (vía `PriceTierPicker` o el sync offline) | Como cajero/vendedor, quiero que consultar los precios de un producto responda en menos de 1 segundo en vez de 1.4-1.6s, para que agregar productos al carrito o completar el sync offline no se sienta lento ni sature la base de datos con round-trips innecesarios | `ListProductPricesUseCase` llama a `productRepo.findById` (que internamente hace 2 queries: el producto completo + resolución de `unitDescription`) sólo para verificar que el producto existe — nunca usa el resto de esos datos — y además espera esa llamada en cadena con `branchRepo.findById` cuando hay `branchId`, en vez de resolverlas en paralelo | - Se agrega `ProductRepository.exists(id): Promise<boolean>` (una sola query mínima, sin `include` ni resolución de unidad) y `ListProductPricesUseCase` lo usa en vez de `findById` para el chequeo de existencia<br>- Cuando hay `branchId`, `exists()` y `branchRepo.findById()` corren en paralelo (`Promise.all`), no en cadena<br>- El comportamiento observable no cambia: sigue lanzando `ProductNotFoundError` (404) si el producto no existe y `ProductPriceBranchNotFoundError` (404) si la sucursal no existe o no está activa — se agrega el test que faltaba para el caso de producto inexistente<br>- El resto de consumidores de `productRepo.findById` (crear/editar precio, etc.) no se tocan — siguen usando el `findById` completo porque sí necesitan esos datos | - Ningún cambio de superficie de autorización; `exists()` no filtra por `isActive` (mismo criterio que el `findById` actual, que tampoco filtraba) para no alterar el comportamiento de qué producto "existe" a efectos de este endpoint |

Nota: se separó en 2 historias porque son cambios independientes en capas distintas (cliente offline vs. backend de precios) con criterios de aceptación y archivos completamente separados — pueden implementarse y verificarse por separado aunque ambos resuelvan el mismo síntoma (POS colgado).

## Why

Verificando manualmente el fix de `getProductPrices`/`branchId` (change `fix-pos-price-lookup-branch-scope`) en Playwright, el catálogo del POS se quedó en spinner infinito al elegir cualquier sucursal. El diagnóstico (2 agentes de exploración + medición directa con Prisma crudo y `curl`) encontró que `refreshCatalogCache` (sync offline) dispara un fan-out sin límite de ~1800 requests concurrentes cada vez que se monta una ruta privada, y que cada una de esas requests individuales ya es lenta (~1.4-1.6s) porque el use case de listar precios hace 3-4 round-trips secuenciales a Postgres remoto cuando le bastan 2. Juntos, saturan el pool de conexiones y dejan cualquier request nueva —incluida la del catálogo visible del cajero— en cola indefinidamente. Esto no es exclusivo del entorno de desarrollo: cualquier usuario con offline habilitado en producción dispara el mismo fan-out al abrir POS, Cotizaciones o Inventario, con riesgo de saturar la base de datos compartida por todos los usuarios activos.

## What Changes

- `refreshCatalogCache` (`app/_lib/offline/catalogCache.ts`) limita a un máximo de 8 fetches concurrentes por lote (precios y dosificaciones) en vez de disparar todos los productos a la vez.
- `OfflineSyncProvider` (`app/(private)/_blocks/OfflineSyncProvider.tsx`) consulta `getCatalogStalenessMs()` antes de cada refresh **automático** (montaje, intervalo de 10 min, `visibilitychange`) y lo omite si el caché tiene menos de 5 minutos de antigüedad. El refresh manual (`refreshCatalogNow`) no lleva este gate.
- Se agrega `ProductRepository.exists(id): Promise<boolean>` (puerto + implementación Prisma + InMemory) y `ListProductPricesUseCase` lo usa en vez de `findById` completo para el chequeo de existencia del producto, corriendo en paralelo con la resolución de `branchId` cuando aplica.
- Ningún cambio de contrato HTTP, payload de respuesta, ni código de error — es una optimización de cuántos round-trips a Postgres ocurren por request, sin tocar comportamiento observable.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `offline-sync`: el requirement "Catalog and inventory read-only offline cache" se extiende para exigir un límite de concurrencia en el prefetch por producto y un gate de staleness antes de cada refresh automático (no antes del manual).

### Sin delta de spec

La Historia 2 (reducción de round-trips en `ListProductPricesUseCase`) es una optimización interna sin cambio de comportamiento observable (mismos códigos de error, mismo payload de respuesta) — no se documenta como requirement de `products-api`, ver `design.md` para el detalle técnico.

## Impact

- **Código**: `app/_lib/offline/catalogCache.ts`, `app/(private)/_blocks/OfflineSyncProvider.tsx`, `src/modules/products/application/ports/ProductRepository.ts`, `src/modules/products/infrastructure/repositories/PrismaProductRepository.ts`, `src/modules/products/infrastructure/repositories/InMemoryProductRepository.ts`, `src/modules/products/application/use-cases/ListProductPricesUseCase.ts`.
- **Specs**: `openspec/specs/offline-sync/spec.md` (delta MODIFIED).
- **Sin cambios de API, DB, ni permisos.**
- **Riesgo si no se corrige**: cualquier usuario con offline habilitado puede saturar el pool de conexiones de Supabase compartido por todo el panel al abrir una pantalla privada, degradando el servicio para el resto de usuarios activos.
