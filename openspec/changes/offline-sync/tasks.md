## 1. Backend — idempotencia (`clientRequestId`)

- [x] 1.1 Migración Prisma: agregar `clientRequestId String? @unique @map("client_request_id")` a `Sale` y `Quote` en `prisma/schema.prisma`; correr `npx prisma migrate dev --name add_client_request_id_to_sales_and_quotes`.
- [x] 1.2 Extender `CreateSaleRequest` (DTO, módulo `pos`) y el Zod schema del `SalesController` con `clientRequestId: z.string().uuid().optional()`.
- [x] 1.3 Extender `CreateQuoteRequest` (DTO, módulo `quotes`) y el Zod schema del `QuotesController` con el mismo campo.
- [x] 1.4 Agregar `findByClientRequestId(clientRequestId: string)` al puerto `SaleRepository` y su implementación en `PrismaSaleRepository` e `InMemorySaleRepository`.
- [x] 1.5 Agregar `findByClientRequestId(clientRequestId: string)` al puerto `QuoteRepository` y su implementación en `PrismaQuoteRepository` e `InMemoryQuoteRepository`.
- [x] 1.6 En `CreateSaleUseCase.execute`: si `clientRequestId` viene no-nulo, buscar primero vía `findByClientRequestId`; si existe, devolver el DTO de la venta existente sin ejecutar el resto del flujo (sin folio, sin decremento de inventario).
- [x] 1.7 En `CreateQuoteUseCase.execute`: mismo short-circuit idempotente.
- [x] 1.8 Persistir `client_request_id` al insertar en `PrismaSaleRepository.createCompleted` y `PrismaQuoteRepository.createWithItems` (también `createCompletedFromQuote`).
- [x] 1.9 Unit tests: `CreateSaleUseCase` y `CreateQuoteUseCase` con `InMemory*Repository` — mismo `clientRequestId` enviado dos veces devuelve la misma entidad, sin doble folio ni doble decremento de inventario. (`tests/unit/modules/pos/application/use-cases/CreateSaleUseCase.idempotency.test.ts`, `tests/unit/modules/quotes/application/use-cases/CreateQuoteUseCase.idempotency.test.ts`)
- [x] 1.10 Actualizado el mock `SaleRepository` en los tests existentes que lo construían a mano (jest.fn() literal, no `InMemorySaleRepository`) con el nuevo método `findByClientRequestId`: `CreateSaleUseCase.test.ts`, `CancelSaleUseCase.test.ts`, `EditCompletedSaleUseCase.test.ts`, `SendSaleTicketEmailUseCase.test.ts`, `SalesController.test.ts` (Sale y Quote), `ReturnsController.test.ts`. `npx tsc --noEmit` y la suite completa de `pos`/`quotes`/`returns` (363 tests) pasan sin nuevos errores.

## 2. Infraestructura offline compartida (frontend)

- [x] 2.1 Agregar dependencia dev `fake-indexeddb` (para tests jsdom) y la dependencia runtime `idb`.
- [x] 2.2 Crear `app/_lib/offline/db.ts`: apertura/versión de la base `agrisas-offline` y definición de los object stores (`meta`, `catalogProducts`, `catalogPrices`, `catalogDosifications`, `catalogCustomers`, `catalogPaymentMethods`, `catalogFolios`, `branchInventory`, `outboxSales`, `outboxQuotes`), todos con índice/campo `ownerBranchId`. Vía `idb`.
- [x] 2.3 Crear `app/_lib/offline/connectivity.ts`: `useOnlineStatus()` combinando evento `online`/`offline`, poll cada 30s, y señal oportunista desde `authFetch` (`reportNetworkSuccess`/`reportNetworkFailure` cableados en `authFetch.ts`).
- [x] 2.4 Crear `app/_lib/offline/catalogCache.ts`: rutinas de pull inicial (productos con `branchId`/stock, precios, dosificaciones, métodos de pago, folios scope POS, clientes activos) hacia los stores de catálogo/`branchInventory`; helpers de lectura desde cache (`searchProductsFromCache`, etc.). Refresh periódico/visibilitychange lo dispara `OfflineSyncProvider`.
- [x] 2.5 Implementado en `app/_lib/offline/branchScope.ts` (`resolveBranchScope`): compara `meta.ownerBranchId` contra la sucursal resuelta de la sesión; purga stores si difiere; bloquea la purga si hay ítems `pending`/`failed` en `outboxSales`/`outboxQuotes` del dueño anterior.
- [x] 2.6 Implementado en `app/_lib/offline/branchScope.ts` (`fixWorkingBranch`) + expuesto vía `useOfflineSync().fixWorkingBranch` para usuarios con `branches:access_all`; sin fijar, `offlineEnabled=false` para ese rol.
- [x] 2.7 Crear `app/_lib/offline/outbox.ts`: enqueue/list/update de `OutboxSaleRecord`/`OutboxQuoteRecord`, generación de `clientRequestId` y `provisionalCode`.
- [x] 2.8 Crear `app/_lib/offline/syncEngine.ts`: elección de líder reusando `claimRefreshLeadership` de `SessionLifecycleProvider` (canal `agrisas-sync`), drenado FIFO de `outboxSales`/`outboxQuotes`, backoff exponencial, reconciliación (éxito/falla transitoria/falla de negocio).
- [x] 2.9 Crear `app/(private)/_blocks/OfflineSyncProvider.tsx`: monta la infraestructura anterior junto a `SessionLifecycleProvider` en `app/(private)/layout.tsx`, expone `useOfflineSync()` (estado de conexión, sucursal dueña, contadores de outbox, staleness, `refreshCatalogNow`, `fixWorkingBranch`).

## 3. Integración POS (ventas offline)

- [x] 3.1 `app/(private)/pos/_logic/types/api.ts`: `CreateSaleBody.clientRequestId?: string` — `createSale.ts` ya reenvía el body tal cual, sin cambio propio necesario.
- [x] 3.2 `app/(private)/pos/_logic/hooks/useSaleSubmission.ts`: en `NetworkError` (o `isOnline()===false` detectado antes de intentar), encola vía `outbox.enqueueSale` usando el total ya calculado en `CartLine` (`lineSubtotal+lineIva+lineIeps`), nuevo estado `"queued-offline"` + `queuedSale`.
- [x] 3.3 `app/(private)/pos/_logic/services/searchProducts.ts`, `getProductPrices.ts`, `getProductDosifications.ts`: fallback a `catalogCache.ts` en `NetworkError`/offline.
- [x] 3.4 `app/(private)/pos/_blocks/PosHeader.tsx`: selector de sucursal oculto/reemplazado por texto plano mientras `isOnline===false` (pinned a la sucursal ya seleccionada).
- [x] 3.5 `app/(private)/pos/_blocks/SaleConfirmedModal.tsx`: nuevo prop `queued?: OutboxSaleRecord`; muestra `provisionalCode` y copy de folio pendiente/stock potencialmente negativo para ventas encoladas; `PosPage.tsx` dispara el modal también en `status==="queued-offline"`.
- [x] 3.6 `app/(private)/pos/_blocks/PosHeader.tsx`: monta `SyncStatusBadge` (nuevo, `app/_components/molecules/SyncStatusBadge/`) vía `useOfflineSync()`. `tests/unit/ui/(private)/pos` completo (104 tests, 13 suites) sigue en verde; `npx tsc --noEmit` sin errores nuevos.

## 4. Integración Cotizaciones (quotes offline)

- [x] 4.1 `app/(private)/quotes/_logic/types/api.ts`: `CreateQuoteBody.clientRequestId?: string` — `createQuote.ts` reenvía el body tal cual.
- [x] 4.2 `app/(private)/quotes/_logic/hooks/useQuoteSubmission.ts`: mismo patrón de encolado offline que `useSaleSubmission` (nuevo estado `"queued-offline"` + `queuedQuote`); el re-export en `pos/_logic/hooks/useQuoteSubmission.ts` no requirió cambios propios.
- [x] 4.3 Nuevo `app/(private)/pos/_blocks/QuoteQueuedModal.tsx` (reusado desde ambos consumidores — `PosPage.tsx` en modo Cotización y `QuoteCreatePage.tsx`, siguiendo el precedente ya existente de compartir bloques POS↔Quotes): muestra `provisionalCode` para cotizaciones encoladas en vez de redirigir a `/quotes/:id` (no existe id real hasta sincronizar).
- [x] 4.4 El manejo de fallo de negocio (cotización expirada al sincronizar → `markBusinessFailure`) ya vive en `syncEngine.ts` (Grupo 2); la acción de editar/reintentar/descartar se expone de forma genérica (ventas y cotizaciones) en `SyncQueuePanel` — ver tarea 5.3. `tests/unit/ui/(private)/quotes` + `pos` completos (192 tests, 21 suites) en verde; sin errores nuevos de tipos.

## 5. UI compartida de sincronización

- [x] 5.1 Crear `app/_components/molecules/SyncStatusBadge/SyncStatusBadge.tsx`: estados offline / sincronizando (n/m) / N pendientes / todo sincronizado, vía `Chip` (tokens ya validados por design-system). Íconos nuevos `cloud_off`/`sync`/`cloud_done` agregados al allowlist `Icon/icons.ts`.
- [x] 5.2 Crear `app/_components/molecules/OfflineBanner/OfflineBanner.tsx`: banner de antigüedad de catálogo (staleness, umbral 60 min) y de "sin cache" para pantallas de lectura offline.
- [x] 5.3 Crear `app/(private)/pos/_blocks/SyncQueuePanel.tsx`: lista combinada de `outboxSales`/`outboxQuotes` con estado, código provisional/folio real, error (si `failed`), y acciones reintentar/descartar/editar-vigencia-y-reintentar (para el caso de cotización expirada). Montado como dropdown desde el badge en `PosHeader.tsx`. Nuevo helper `retryOutboxItem` en `outbox.ts`.
- [x] 5.4 Advertencia persistente dentro de `SyncQueuePanel` mientras haya ítems no sincronizados: no cerrar ni borrar datos del navegador. `tests/unit/ui/(private)/pos`+`quotes` (192 tests) en verde; sin errores de tipos nuevos.

## 6. Lectura offline de Inventario

- [x] 6.1 `app/(private)/inventory/_logic/services/inventory.ts` (`listBranchInventory`): fallback a nuevo `getInventoryItemsFromCache` (`catalogCache.ts`, join productos+stock cacheados; `reservedQuantity`/lote/vigencia degradados a valores neutros, documentado en el propio helper) en `NetworkError`/offline.
- [x] 6.2 `app/(private)/inventory/_blocks/InventoryPage.tsx`: monta `OfflineBanner` de staleness; botón "Asignar producto" y acciones de ajuste/editar de `InventoryTable` deshabilitados mientras `isOnline===false`. `tests/unit/ui/(private)/inventory` (34 tests, 6 suites) en verde; sin errores de tipos nuevos.

## 7. PWA / Service Worker

- [x] 7.1 Crear `public/manifest.json` (nombre, iconos vía `logo.png` existente, `display: standalone`, `start_url: /pos`).
- [x] 7.2 Service worker escrito a mano en `public/sw.js` (se descartó `next-pwa` — decisión documentada en `design.md` Decisión 1/2: sin dependencia extra de webpack, consistente con el resto del repo). Cache-first para `/_next/static/**` (ya versionado por hash de Next.js), network-first para navegación.
- [x] 7.3 Cache-busting: nombres de cache (`agrisas-shell-v1`, `agrisas-static-v1`) versionados por `CACHE_VERSION`; los assets de Next.js ya llevan hash de contenido en la URL (auto-invalidación sin necesitar build ID); `activate` purga cualquier cache que no coincida con la versión actual.
- [x] 7.4 El fetch handler retorna temprano (`isApiRequest`) para cualquier request bajo `/api/`, sin interceptar.
- [x] 7.5 `public/offline.html` (estático, sin dependencias de Next/React) servido por el SW cuando falla `fetch` de una navegación y no hay cache de esa ruta exacta.
- [x] 7.6 Nuevo `app/_components/organisms/ServiceWorkerRegistrar/ServiceWorkerRegistrar.tsx` (client component, `useEffect` + guard `"serviceWorker" in navigator`), montado en `app/layout.tsx` junto con `manifest: "/manifest.json"` en `metadata` y `viewport.themeColor`. `npx tsc --noEmit` sin errores nuevos.

## 8. Tests

- [x] 8.1 `tests/unit/modules/pos/application/use-cases/CreateSaleUseCase.idempotency.test.ts` (ver 1.9; ruta ajustada para vivir junto al resto de tests de use-cases de `pos`, no en la raíz del módulo).
- [x] 8.2 `tests/unit/modules/quotes/application/use-cases/CreateQuoteUseCase.idempotency.test.ts` (ídem, junto a los demás tests de `quotes`).
- [x] 8.3 `tests/unit/ui/_lib/offline/outbox.test.ts`: enqueue/list/update/retry/discard/updatePayload/countPending (11 tests, `fake-indexeddb`). Requirió agregar `resetOfflineDbForTests` async-safe (cierra la conexión IDB antes de `deleteDatabase`, si no el test se cuelga) y un polyfill de `structuredClone` en `jest.setup.ts` (jsdom no lo expone; `fake-indexeddb` lo necesita).
- [x] 8.4 `tests/unit/ui/_lib/offline/catalogCache.test.ts`: pull inicial (6 endpoints), fallback de lectura, `NetworkError` a mitad de pull no corrompe cache previo, no intenta refrescar si offline, búsqueda case-insensitive; más 4 tests de `branchScope.resolveBranchScope`/`fixWorkingBranch` (purga al cambiar sucursal, bloqueo por outbox pendiente, bypass sin/con sucursal fijada) — 9 tests.
- [x] 8.5 `tests/unit/ui/_lib/offline/syncEngine.test.ts`: éxito (venta y cotización), 5xx no bloquea el resto de la cola, `NetworkError` sí detiene el resto del pase (decisión deliberada — evita requests inútiles cuando la conexión real está caída), 4xx marca `failed` sin reintento automático, `isRetriable` (no reintenta `failed`/backoff en curso/`synced`), no-op si offline — 10 tests.
- [ ] 8.6 Test manual end-to-end (ver `proposal.md`/plan aprobado): DevTools offline → crear venta → badge pendiente → reconectar → sync automático → folio real. **Pendiente — requiere sesión de browser manual/Playwright, no ejecutable por el agente en este entorno.**
- [ ] 8.7 Test manual PWA: `next build && next start`, instalar, cortar red del sistema, abrir la app instalada desde cero. **Pendiente — idem 8.6.**
- [ ] 8.8 Test manual de cambio de sucursal con outbox pendiente: debe bloquear la purga y pedir sincronizar/descartar. **Cubierto a nivel unitario en 8.4 (bloqueo de `resolveBranchScope`); validación end-to-end en browser pendiente — idem 8.6.**

## 9. Verificación final

- [x] 9.1 `npm run build` (con Node 20, vía nvm — el entorno por defecto tenía Node 18.0.0, insuficiente para Next 14) compiló limpio: 93 rutas, sin errores nuevos de lint/tipos. `npm test` completo: backend 228/228 suites, 1792/1792 tests (incluye integración contra la BD real de Supabase, confirmando que la migración `client_request_id` y la idempotencia funcionan end-to-end); UI 270/270 suites, 1830/1830 tests. Ningún test existente de `pos`/`quotes` se rompió por el campo `clientRequestId` opcional.
- [x] 9.2 `SyncStatusBadge`/`OfflineBanner`/`SyncQueuePanel` usan tokens y primitivas existentes (`Chip`, `Button`, clases M3). El guardarraíl `tests/unit/ui/design-system/tokens.test.ts` detectó `<button>` crudos nuevos en `QuoteQueuedModal.tsx`/`SyncQueuePanel.tsx` — corregido reemplazándolos por el átomo `Button`; guardarraíl en verde (8/8).
- [x] 9.3 Ejecutado `opsx:verify` — encontró y corrigió un gap real (falta de UI para `fixWorkingBranch` en `PosHeader.tsx`); ver reporte completo en la respuesta al usuario. `opsx:archive` sólo cuando el usuario lo indique explícitamente.
