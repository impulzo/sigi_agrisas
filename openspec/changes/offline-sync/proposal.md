## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero de sucursal | Como cajero de sucursal, quiero crear ventas en el POS aunque no haya conexión a internet para no detener la atención al cliente cuando la sucursal pierde internet | - Con `NetworkError` detectado (o `isOnline=false`), el submit de venta no falla: se encola localmente y muestra confirmación con código provisional `"OFFLINE-<id>"`, no un folio real.<br>- El carrito se resetea igual que en una venta online exitosa; el cajero puede seguir vendiendo mientras hay ítems pendientes en cola.<br>- Totales offline se calculan con `computeTotalsClient.ts` (mismo redondeo bancario que el servidor) para que el ticket provisional coincida con el que resultará al sincronizar.<br>- Edge case: si el catálogo cacheado no tiene el producto buscado (nunca se sincronizó), la búsqueda offline lo indica como no disponible en vez de fallar silenciosamente. | - La venta offline solo puede crearse con el `branchId` fijado como `ownerBranchId` de la sesión (sucursal asignada del cajero) — no editable en UI mientras offline.<br>- El payload enviado al sincronizar no lleva snapshots calculados por el cliente como fuente de verdad — el servidor recalcula y valida `CreateSaleUseCase` igual que en flujo online; el cliente nunca puede forzar precio/descuento fuera de lo autorizado.<br>- `clientRequestId` (UUID) viaja como idempotency key para evitar ventas duplicadas si la respuesta de sync se pierde. |
| 2 | Cajero de sucursal | Como cajero de sucursal, quiero crear cotizaciones sin conexión para no perder una venta potencial cuando el cliente pide precio y no hay internet | - Mismo comportamiento de encolado que ventas (historia 1), usando el módulo de `quotes` (`useQuoteSubmission`/`createQuote`), no una copia paralela en `pos`.<br>- Cotización offline queda visible en el panel de cola con estado `pending` hasta sincronizar.<br>- Edge case: si la cotización expira (regla de negocio existente) entre que se creó offline y se sincroniza, el sync la marca `failed` con motivo visible, sin reintento automático. | - Igual scoping por `ownerBranchId` que ventas.<br>- `clientRequestId` idempotente en `POST /api/v1/admin/quotes` para evitar duplicados por reintento/replay. |
| 3 | Cajero / usuario de inventario | Como cajero o usuario de inventario, quiero consultar catálogo, precios y stock cacheado sin conexión para poder informar al cliente aunque no pueda modificar nada mientras esté offline | - Búsqueda de productos, precios y dosificaciones caen a cache local solo cuando hay `NetworkError` o `isOnline=false` — online siempre tiene prioridad sobre cache.<br>- UI muestra badge de antigüedad del catálogo ("actualizado hace N min") con aviso visual pasado un umbral (~60 min).<br>- No existe ninguna acción de ajuste/edición de stock disponible mientras está offline (ni en `/inventory` ni en otro lado) — solo lectura.<br>- Edge case: cache vacía (primer login sin haber sincronizado nunca) → mensaje explícito de "sin datos cacheados, conéctate primero", no una pantalla en blanco. | - Cache se purga automáticamente si cambia el `ownerBranchId` de la sesión (evita que una sucursal vea precios/stock de otra en un equipo compartido).<br>- Datos de cache respetan los mismos campos que ya devuelve la API autorizada (no se cachea nada que el rol del usuario no pudiera ver online). |
| 4 | Cajero / administrador de TI de sucursal | Como cajero, quiero poder instalar la app como PWA y abrirla aunque no haya internet en ese momento para no depender de que el navegador ya tenga una pestaña abierta al momento del corte de conexión | - `manifest.json` permite instalar la app (`display: standalone`, ícono, `start_url`).<br>- Service worker cachea el app shell (JS/CSS versionado por build) con estrategia cache-first para assets versionados, network-first para el documento raíz.<br>- Abrir la app instalada sin conexión carga el shell y permite operar en modo lectura + cola offline (no un error de red del navegador).<br>- Tras un nuevo deploy, el SW purga caches de builds anteriores en su fase `activate` — no debe quedar sirviendo un shell viejo indefinidamente.<br>- Rutas `/api/v1/**` nunca se sirven desde el SW — siempre van a red o generan `NetworkError`, dejando el manejo de datos a la capa IndexedDB. | - El SW no cachea ni intercepta respuestas de autenticación/tokens — el manejo de sesión sigue exclusivamente en la capa de `authFetch`/cookies existente.<br>- Cache-busting por build ID evita servir código desactualizado que pudiera tener vulnerabilidades ya corregidas en un deploy posterior. |
| 5 | Sistema (motor de sincronización) / Cajero | Como cajero, quiero que mis ventas y cotizaciones pendientes se sincronicen automáticamente al recuperar conexión, mostrando el folio real cuando esté listo, para no tener que reenviarlas manualmente ni perder el rastro fiscal | - Al detectar reconexión (evento `online` + poll + éxito oportunista de cualquier `authFetch`), una sola pestaña "líder" (vía `BroadcastChannel`, reusando el patrón de `SessionLifecycleProvider`) drena las colas `outboxSales`/`outboxQuotes` en orden FIFO, una request a la vez.<br>- Éxito → el ítem pasa a `synced`, guarda `serverSaleId`/`serverFolioCode`, y el ticket se actualiza del código provisional al folio real.<br>- Falla transitoria (network/5xx) → backoff exponencial (5s→15s→60s→5min→30min tope), sin bloquear el resto de la cola.<br>- Falla de negocio (4xx: cliente/producto inactivo, cotización expirada) → queda `failed`, visible en el panel de cola, sin reintento automático; el cajero puede editar y reintentar o descartar.<br>- Es aceptado explícitamente que el folio fiscal definitivo puede no seguir el orden cronológico real de venta (se asigna en el momento del sync, no de la creación) — el ticket muestra copy claro de esto mientras está en estado provisional.<br>- Es aceptado explícitamente que una venta offline puede dejar el stock en negativo si se vendió de más contra el stock real (mismo comportamiento ya tolerado hoy en carreras online entre cajas) — se marca informativamente en el ticket si aplicó, sin bloquear el sync. | - El reintento de un ítem con el mismo `clientRequestId` que ya fue procesado exitosamente en el servidor debe devolver la entidad ya creada, no duplicarla (idempotencia server-side vía columna única `client_request_id` en `Sale`/`Quote`).<br>- Toda validación de negocio (cliente activo, producto activo, stock, permisos) se re-ejecuta íntegramente en el servidor al sincronizar — el cliente offline nunca es la autoridad final.<br>- Mientras haya ítems `pending`/`failed` sin sincronizar, la UI advierte persistentemente contra cerrar/borrar datos del navegador (riesgo real de pérdida irreversible, sin backup server-side hasta ese punto). |
| 6 | Administrador con acceso a todas las sucursales (`branches:access_all`) | Como administrador con acceso a todas las sucursales, quiero fijar explícitamente una sucursal de trabajo mientras tengo conexión para poder operar en modo offline sin ambigüedad sobre a qué sucursal pertenecen mis ventas/cotizaciones | - El selector de sucursal, normalmente editable para usuarios bypass, expone una acción explícita "fijar sucursal de trabajo" que solo puede ejecutarse online.<br>- Sin haber fijado una sucursal, el modo offline queda deshabilitado para estos usuarios (no pueden crear ventas/cotizaciones ni navegar cache offline con sucursal ambigua).<br>- Una vez fijada, el comportamiento offline es idéntico al de un cajero normal (historias 1–5), con `ownerBranchId` = sucursal fijada.<br>- Edge case: si el admin intenta cambiar la sucursal fijada mientras hay ítems pendientes sin sincronizar de la sucursal anterior, el sistema bloquea el cambio hasta sincronizar o descartar explícitamente esos ítems. | - `branches:access_all` no debe traducirse en cache/outbox multi-sucursal simultáneo — la fijación reduce el alcance offline a una sola sucursal por sesión, evitando ambigüedad de autorización cuando no hay servidor disponible para validar en tiempo real.<br>- El servidor sigue re-validando el scope de sucursal real del usuario al sincronizar (defensa en profundidad, el cliente no es la autoridad). |

## Why

Hoy `agrisas_panel` no tiene ninguna infraestructura offline: sin service
worker, sin manifest PWA, sin cache local, sin cola de sincronización. En
sucursales con conectividad inestable, una caída de internet detiene por
completo la atención en caja (no se pueden crear ventas ni cotizaciones) y
deja al personal sin visibilidad de catálogo/stock, aunque esos datos ya
se hubieran consultado minutos antes. El costo de negocio es directo:
ventas perdidas o registradas fuera de sistema (en papel) durante cortes
de conexión, con el riesgo de reconciliación manual posterior que eso
implica. Este cambio cierra esa brecha construyendo la primera capa
offline-first del panel, acotada a los flujos de mayor impacto operativo
(venta, cotización, consulta de catálogo/stock) sin tocar flujos que
requieren validación estrictamente en línea (ajustes de inventario,
devoluciones, pagos/abonos).

## What Changes

- Nueva app shell instalable como PWA (`manifest.json` + service worker)
  que cachea assets versionados por build y permite abrir la app sin
  conexión.
- Nueva capa de persistencia local (IndexedDB) que cachea catálogo,
  precios, dosificaciones, métodos de pago, folios y clientes activos,
  scoped a una única sucursal (`ownerBranchId`) por sesión de navegador.
- Nueva cola de mutaciones offline (`outboxSales`, `outboxQuotes`) que
  encola ventas y cotizaciones creadas sin conexión con un
  `clientRequestId` (UUID) como clave de idempotencia, y muestra un código
  de ticket provisional (`"OFFLINE-<id>"`) hasta que se sincronizan.
- Nuevo motor de sincronización que detecta reconexión, elige una pestaña
  líder (reusando el patrón `BroadcastChannel` de
  `SessionLifecycleProvider`), drena las colas en orden FIFO contra los
  endpoints existentes de ventas/cotizaciones, y reconcilia el resultado
  (folio real, o error de negocio visible para reintentar/descartar).
- Nueva UI de estado de sincronización: badge persistente en el header del
  POS, panel de cola con reintentar/descartar/editar, y banner de
  antigüedad de catálogo cuando se navega en modo lectura offline.
- Modo de lectura offline para catálogo/precios/stock en POS, Cotizaciones
  e Inventario — sin ninguna capacidad de escritura/ajuste de stock
  offline.
- Flujo explícito para que usuarios con `branches:access_all` fijen una
  sucursal de trabajo antes de poder operar offline.
- **BREAKING**: ninguno — todos los endpoints existentes (`POST
  /api/v1/admin/sales`, `POST /api/v1/admin/quotes`) se extienden con un
  campo opcional (`clientRequestId`), sin romper el flujo online actual ni
  clientes existentes de esas APIs.

## Capabilities

### New Capabilities
- `offline-sync`: PWA instalable (manifest + service worker con
  cache-busting por build), persistencia local en IndexedDB scoped por
  sucursal, cola de mutaciones offline con idempotencia, motor de
  sincronización (detección de reconexión, elección de líder, backoff,
  reconciliación), UI de estado/cola de sincronización, y modo de lectura
  offline de catálogo/inventario (staleness banner incluido — no se separa
  en una capability aparte porque comparte exactamente la misma cache que
  POS/Quotes).

### Modified Capabilities
- `pos-api`: agrega `clientRequestId` opcional (idempotency key) a `POST
  /api/v1/admin/sales`; si se repite un `clientRequestId` ya procesado, la
  respuesta retorna la venta ya creada en vez de generar un duplicado o un
  error.
- `quotes-api`: mismo requisito de idempotencia en `POST
  /api/v1/admin/quotes`.
- `pos-ui`: comportamiento offline-aware — selector de sucursal bloqueado
  mientras está offline, modal de confirmación de venta mostrando estado
  "pendiente de sincronizar" con código provisional en vez de folio real,
  badge de estado de sincronización en el header.
- `quotes-ui`: mismo patrón de creación offline-aware que `pos-ui`,
  aplicado al flujo de cotizaciones.

## Impact

- **Backend**: `prisma/schema.prisma` (columna `client_request_id` nullable
  y única en `Sale` y `Quote` + migración), DTOs y controllers de los
  módulos `pos` y `quotes` (`CreateSaleRequest`/`CreateQuoteRequest`,
  `SalesController`/`QuotesController`), casos de uso
  `CreateSaleUseCase`/`CreateQuoteUseCase` (short-circuit idempotente),
  repositorios Prisma e in-memory de ambos módulos (nuevo método
  `findByClientRequestId`). Ningún endpoint nuevo; ninguna validación de
  negocio existente cambia.
- **Frontend**: nueva capa compartida `app/_lib/offline/*` (IndexedDB,
  detección de conectividad, cache de catálogo, outbox, motor de sync) y
  un nuevo `OfflineSyncProvider` montado junto a `SessionLifecycleProvider`.
  Módulos POS, Quotes e Inventory (`_logic/services`, `_blocks`) se
  modifican para leer de cache en fallback y encolar mutaciones offline.
  Nuevos componentes de UI compartidos (`SyncStatusBadge`, `OfflineBanner`,
  `SyncQueuePanel`).
- **Infraestructura**: nuevo `public/manifest.json` y service worker
  registrado vía `next.config.js`; nueva dependencia dev `fake-indexeddb`
  para tests unitarios con jsdom; posible dependencia de runtime ligera
  para IndexedDB (`idb`) o wrapper propio, sin librerías de sync/ORM
  (Dexie, RxDB, WatermelonDB, localForage quedan explícitamente fuera).
- **Dependencias entre specs**: no afecta `inventory-movements`, la
  escritura de `inventory-api`, `returns-api`, `payments-api` ni
  `folio-audit` — esos flujos permanecen estrictamente en línea.
