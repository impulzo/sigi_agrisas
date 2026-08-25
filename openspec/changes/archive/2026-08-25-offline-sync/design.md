## Context

`agrisas_panel` es un Next.js 14 (App Router) + Prisma 5/Supabase Postgres,
con arquitectura hexagonal/DDD por módulo (`src/modules/*`) y Atomic
Design + `_logic/` por route group en frontend. Hoy no existe ninguna
infraestructura offline: sin service worker, sin manifest PWA, sin
IndexedDB, sin cola de sincronización. Los flujos de venta (`src/modules/
pos`, `app/(private)/pos`) y cotizaciones (`src/modules/quotes`,
`app/(private)/quotes`) son maduros y 100% dependientes de red hoy.

Piezas reutilizables ya existentes que este diseño apalanca en vez de
reinventar:
- `app/(private)/pos/_logic/lib/computeTotalsClient.ts`: puerto
  cliente-side, sin dependencia de Prisma, del cálculo de totales
  (redondeo bancario a 4 decimales) — se reutiliza tal cual para totales
  offline.
- `app/_lib/authFetch.ts`: lanza `NetworkError` en cualquier fallo de
  `fetch` — es la señal de detección de offline/online que se reutiliza en
  todo el diseño.
- `app/(private)/_blocks/SessionLifecycleProvider.tsx`: ya implementa
  elección de líder entre pestañas vía `BroadcastChannel`
  (`claimRefreshLeadership`) para el refresh de token — se reutiliza el
  mismo patrón para el motor de sync, evitando inventar coordinación
  nueva.
- `enforceBranchScope`/`resolveScopedBranchId`
  (`src/modules/rbac/infrastructure/http/enforceBranchScope.ts`): patrón
  de scoping por sucursal server-side, gateado por el permiso
  `branches:access_all` — el diseño offline necesita un equivalente
  client-side, ya que no hay round-trip al servidor para aplicarlo
  mientras no hay conexión.
- Folio fiscal (`Folio.currentNumber`, `allocateFolio()`): se incrementa
  atómicamente dentro de la misma transacción Prisma que crea la venta —
  confirmado que no hay forma segura de reservar un folio client-side sin
  riesgo de colisión/hueco. Esto es la restricción dura que obliga al
  patrón de "folio provisional hasta sincronizar".
- Un design.md archivado
  (`openspec/changes/archive/2026-06-19-inactivity-session-timeout/design.md`)
  rechazó explícitamente un mutex custom sobre IndexedDB por "complejidad
  alta para esto" — este diseño evita repetir ese error (ver Decisión 2).

Referencia completa de la tabla de Historia de Usuario: ver
`proposal.md`, filas 1–6. Cada decisión de este documento se referencia a
esas filas entre paréntesis.

## Goals / Non-Goals

**Goals:**
- Permitir crear ventas POS y cotizaciones sin conexión, encoladas
  localmente, sincronizadas automáticamente al reconectar (filas 1, 2, 5).
- Permitir navegación de solo lectura offline de catálogo/precios/stock
  cacheado en POS, Cotizaciones e Inventario (fila 3).
- Hacer la app instalable como PWA y capaz de arrancar sin conexión desde
  cero (fila 4).
- Soportar el caso de usuarios con `branches:access_all` fijando una
  sucursal de trabajo explícita antes de operar offline (fila 6).
- Mantener la superficie de API existente casi intacta: los endpoints
  `POST /api/v1/admin/sales` y `POST /api/v1/admin/quotes` se extienden
  con un campo opcional de idempotencia, sin API paralela de "sync".

**Non-Goals:**
- Ajustes/edición de inventario offline — permanece estrictamente online
  (`inventory-movements`, escritura de `inventory-api` fuera de alcance).
- Devoluciones, pagos/abonos, edición de ventas completadas offline — no
  cubiertos por este cambio.
- Multi-sucursal simultáneo en cache/outbox para un mismo navegador/sesión
  — cada sesión offline está scoped a exactamente una sucursal.
- Reservar folios fiscales client-side u garantizar orden cronológico
  estricto del folio real respecto al orden real de venta — aceptado como
  limitación conocida (fila 5).
- Prevenir sobreventa (stock negativo) causada por ventas offline
  concurrentes — aceptado como limitación conocida, ya tolerada hoy en
  online (fila 5).

## Decisions

### Decisión 1 — Alcance offline: app shell instalable (PWA con service worker), no solo "pestaña ya abierta"

Se eligió construir un service worker real que cachea el app shell
(JS/CSS versionado por build de Next.js) + `manifest.json` instalable,
en vez del mínimo viable de solo tolerar que la conexión caiga con la
pestaña ya abierta. Esto responde directamente a la fila 4 de la tabla de
historias, confirmada explícitamente por el usuario a pesar de ser la
opción de mayor complejidad.

Implicaciones de diseño:
- Estrategia de cache: **cache-first** para assets versionados por build
  (JS/CSS con hash), **network-first** para el documento HTML raíz — evita
  servir un shell desactualizado después de un deploy mientras sigue
  permitiendo arranque 100% offline si el HTML también quedó cacheado de
  una visita anterior.
- Cache-busting por deploy: el nombre de la cache del SW incluye el build
  ID de Next.js; el hook `activate` del SW purga caches de builds
  anteriores — sin esto, un cajero podría quedar atrapado en una versión
  vieja del bundle indefinidamente.
- Las rutas `/api/v1/**` **nunca** se sirven desde el SW — siempre van a
  red o fallan con `NetworkError`. Esto evita que dos capas de cache (SW +
  IndexedDB) intenten resolver la misma responsabilidad de datos; el SW
  solo es responsable del *shell*, IndexedDB del *dato*.
- Alternativa descartada: no construir SW y limitarse a "pestaña ya
  abierta". Es más simple pero no cumple el requisito confirmado de
  arranque en frío sin conexión — descartada por decisión explícita del
  usuario, documentada como trade-off de complejidad aceptado en
  `proposal.md`.

### Decisión 2 — Persistencia local: IndexedDB con wrapper delgado, sin librería de sync/ORM

Se eligió IndexedDB accedido vía un wrapper propio o la librería `idb`
(~1KB, solo promisifica la API nativa) — explícitamente **no** Dexie,
localForage, RxDB ni WatermelonDB.

Por qué esto no repite el precedente rechazado: el design.md archivado
rechazó un *mutex custom* sobre IndexedDB para arbitrar escrituras
concurrentes en un feature no relacionado. Acá no hace falta un mutex
propio porque:
- Las transacciones nativas de IndexedDB ya serializan escrituras sobre el
  mismo object store.
- El motor de sync se auto-serializa: una sola pestaña líder (Decisión 4),
  una request en vuelo a la vez — nunca hay contención real de escritura
  que arbitrar.

localStorage/sessionStorage se descartan por ser síncronos, con tope
~5–10MB y solo strings — insuficiente para catálogo + precios + cola
creciente de ventas/cotizaciones con estructura no trivial.

Estructura de base `agrisas-offline`: stores `meta`, `catalogProducts`,
`catalogPrices`, `catalogDosifications`, `catalogCustomers`,
`catalogPaymentMethods`, `catalogFolios`, `branchInventory`,
`outboxSales`, `outboxQuotes` — cada store lleva `ownerBranchId` para
soportar la purga scoped de la Decisión 3.

### Decisión 3 — Scoping por sucursal offline: `ownerBranchId` fijo por sesión de cache, sin equivalente server-side disponible

Dado que `enforceBranchScope` es server-side-only y no hay round-trip
posible mientras no hay conexión (Criterio de Seguridad, filas 1–3, 6), el
equivalente client-side es:
- La cache siempre se seedea para un único `ownerBranchId` = sucursal
  asignada del cajero (claim del JWT en la última sesión online exitosa).
- Usuarios con `branches:access_all` (fila 6) no tienen `branchId` fijo
  por defecto — el diseño requiere que fijen explícitamente una sucursal
  de trabajo mientras hay conexión (acción nueva en UI, guardada en
  `meta.ownerBranchId`) antes de que el modo offline se habilite para
  ellos. Sin esa fijación, offline queda deshabilitado — evita cache/cola
  ambigua "de cualquier sucursal".
- En cada boot/login se compara `meta.ownerBranchId` contra la sucursal
  resuelta de la sesión actual. Si difiere → se purgan todos los stores de
  catálogo/inventario/outbox del dueño anterior **antes** de permitir
  cualquier lectura/escritura offline nueva. Si existen ítems `pending`/
  `failed` sin sincronizar del dueño anterior, la purga se bloquea y se
  exige sincronizar o descartar explícitamente esos ítems primero — evita
  pérdida silenciosa de ventas de otro cajero en un equipo compartido.
- Esto es defensa-en-profundidad, no el límite de autorización real: cada
  venta/cotización sincronizada vuelve a pasar por `enforceBranchScope`
  server-side contra los claims reales del usuario en el momento del sync,
  igual que hoy en el flujo online — el `branchId` cacheado en el cliente
  nunca es la autoridad final.

### Decisión 4 — Motor de sync: reutilizar el patrón de elección de líder existente, no inventar uno nuevo

El motor de sincronización (fila 5) reutiliza el mismo mecanismo de
`BroadcastChannel`/elección de líder que `SessionLifecycleProvider.tsx` ya
implementa para el refresh de token (`claimRefreshLeadership`), en vez de
construir coordinación entre pestañas desde cero. Un nuevo canal
(`"agrisas-sync"`) o el mismo canal existente asigna una única pestaña
líder responsable de drenar `outboxSales`/`outboxQuotes`.

Detección de reconexión combina tres señales (ninguna sola es confiable):
evento `online` del navegador, poll cada 30s (porque `navigator.onLine`
puede reportar `true` con un enlace realmente caído, ej. portal cautivo),
y éxito oportunista de cualquier `authFetch` en curso en la app.

Reconciliación:
- Éxito → `synced`, guarda `serverSaleId`/`serverFolioCode`, UI actualiza
  el ticket del código provisional al folio real.
- Falla transitoria (red/5xx) → backoff exponencial (5s→15s→60s→5min→30min
  tope), sin bloquear el resto de la cola (colas independientes por
  entidad, FIFO cada una).
- Falla de negocio (4xx: recurso inactivo, cotización expirada) →
  `failed`, sin reintento automático, visible en panel para
  editar/reintentar o descartar (fila 5).
- Replay idempotente: reintentos con el mismo `clientRequestId` contra un
  ítem ya procesado exitosamente devuelven la entidad existente en vez de
  duplicar — esto es lo que hace segura la combinación de reintentos +
  posibles crashes de pestaña a mitad de request.

### Decisión 5 — Idempotencia server-side vía columna única, sin endpoint de sync paralelo

En vez de construir una API de "sync batch" separada que reimplemente la
validación de `CreateSaleUseCase`/`CreateQuoteUseCase`, se añade
`clientRequestId String? @unique @map("client_request_id")` (nullable) a
`Sale` y `Quote`, y ambos casos de uso hacen un *short-circuit*: si
`clientRequestId` viene y ya existe, devuelven la entidad existente antes
de tocar folio o inventario. Esto mantiene una única fuente de verdad de
validación de negocio (server-side, igual online y offline) y evita
divergencia de reglas entre dos caminos de creación.

Alternativa descartada: endpoint `/api/v1/admin/sync/batch` que reciba N
ventas/cotizaciones en un solo POST. Se descartó porque obligaría a
reimplementar (o extraer a una capa compartida no trivial) toda la
validación transaccional de `CreateSaleUseCase`, y porque el manejo
parcial de fallos dentro de un batch (2 de 5 ítems exitosos) complica más
la UX que N requests individuales con reintento independiente por ítem —
que es exactamente lo que ya soporta el patrón de outbox FIFO.

### Decisión 6 — Folio provisional y stock negativo: limitaciones aceptadas explícitamente, no mitigadas por diseño

Ambas son consecuencia directa de la Decisión 5 (no reservar folio ni
re-validar stock client-side) y fueron confirmadas como aceptables por el
usuario (fila 5):
- El código `"OFFLINE-<clientRequestId corto>"` es puramente de
  visualización; el folio real se asigna en el momento del sync, pudiendo
  no coincidir con el orden cronológico real de venta si el sync de dos
  terminales llega en otro orden. La UI debe comunicar esto explícitamente
  mientras el ítem está en estado provisional (Criterio de Aceptación,
  fila 5).
- `branch_inventory.quantity` ya tolera negativos para ventas originadas
  en POS (sin CHECK constraint, confirmado en schema) — una venta offline
  que sobrevende contra el stock real simplemente deja el stock negativo
  al sincronizar, igual que ya ocurre hoy en una carrera entre dos cajas
  online. Se marca informativamente en el ticket cuando el stock cacheado
  al momento de encolar era menor a la cantidad vendida, sin bloquear el
  sync.

## Risks / Trade-offs

- **[Riesgo] Folio no cronológico visible al cliente/auditoría fiscal** →
  Mitigación: copy explícito en el ticket mientras está en estado
  provisional; aceptado por el usuario como trade-off del diseño (fila 5).
- **[Riesgo] Ventana de sobreventa ampliada de "carrera sub-segundo" a
  "duración completa del offline"** → Mitigación: mismo comportamiento ya
  tolerado por el sistema hoy (stock negativo permitido para POS);
  marcado informativamente en el ticket sincronizado. Sin mitigación
  adicional de producto en este cambio — aceptado explícitamente.
- **[Riesgo] Pérdida de datos irreversible si el navegador se limpia antes
  de sincronizar** (la cola vive solo en IndexedDB de ese navegador, sin
  respaldo server-side hasta el sync) → Mitigación: advertencia
  persistente en UI mientras el outbox no esté vacío ("no cierres ni
  borres datos de este navegador").
- **[Riesgo] Complejidad de versionado de cache del service worker tras
  cada deploy** (servir un shell viejo, o romper si el build hash cambia a
  mitad de una sesión offline larga) → Mitigación: cache nombrada por
  build ID + purga en `activate`; documentado como el mayor costo de
  complejidad de la Decisión 1, aceptado explícitamente por el usuario.
- **[Riesgo] Sesión offline larga vs. TTL de tokens** (access token 15
  min, refresh cookie 7 días sliding, no rota mientras offline porque no
  hay llamadas exitosas a `/auth/refresh`) → Mitigación: mientras
  `authFetch` solo ve `NetworkError` (offline real), no se dispara el
  camino de logout por 401; al reconectar, el refresh flow existente debe
  recuperar la sesión transparentemente si la cookie de refresh sigue
  vigente. Sin mitigación adicional de producto para sesiones que excedan
  los 7 días offline — ver Open Questions.
- **[Riesgo] Cache/outbox multi-sucursal ambiguo para usuarios bypass**
  (`branches:access_all`) → Mitigación: Decisión 3 — offline deshabilitado
  para estos usuarios hasta que fijen sucursal explícitamente online.

## Migration Plan

1. Migración de schema: agregar columna nullable `client_request_id`
   (única) a `Sale` y `Quote` vía `npx prisma migrate dev` — no requiere
   backfill (nullable, flujo online actual simplemente no la envía).
2. Deploy backend: extender DTOs/controllers/casos de uso/repositorios de
   `pos` y `quotes` con el campo opcional y el short-circuit idempotente —
   compatible hacia atrás, ningún cliente existente se rompe.
3. Deploy frontend: nueva capa `app/_lib/offline/*`, `OfflineSyncProvider`,
   integración en POS/Quotes/Inventory, nuevos componentes de UI, SW +
   manifest. Puede deployarse detrás de una bandera de feature si se desea
   activación gradual por sucursal (a definir en tasks.md si aplica).
4. Rollback: el service worker es lo único con riesgo de "atascar" un
   cliente en una versión vieja — si se necesita revertir, publicar una
   versión del SW que se auto-desregistra (`self.registration
   .unregister()`) y limpia caches, ya que un simple revert de código no
   desinstala un SW ya registrado en el navegador del usuario.

## Open Questions

- Duración máxima de sesión offline soportada (relacionada al riesgo de
  TTL de tokens) — definir techo recomendado antes de redactar
  `tasks.md` (propuesta: 24h prácticas por turno, límite duro dentro del
  ciclo de 7 días de la cookie de refresh).
- Tamaño típico de catálogo activo por sucursal — confirma si "cachear
  todo el catálogo + precios + dosificaciones" es viable sin estrategia de
  paginación/priorización adicional.
- Cantidad típica de terminales POS simultáneos por sucursal — afecta la
  magnitud real del riesgo de sobreventa ampliado.
- Si se requiere bandera de feature para activación gradual por sucursal
  durante el rollout, o si se libera a todas las sucursales de una vez.
