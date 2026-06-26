## Context

El stack actual:
- Access token JWT HS256, TTL 15 min, transportado en `Authorization: Bearer` (lectura desde `sessionStorage.accessToken`).
- Refresh token JWT HS256, TTL 7 días, cookie `refreshToken` HttpOnly + SameSite=Strict.
- `app/_lib/authFetch.ts` lee el access token y, en 401, lanza `UnauthenticatedError`. No invoca `/api/v1/auth/refresh`. El usuario es expulsado en cuanto pasan 15 min.
- No existe ningún hook de actividad ni scheduler de refresh.

Esto rompe la promesa de sesión "viva mientras trabajas": basta un POS abierto sin requests por 15 min para perderlo todo al primer fetch.

La solución debe ser **client-side primarily**: el backend ya tiene endpoint de refresh; falta orquestación + criterio de cierre por inactividad.

## Goals / Non-Goals

**Goals:**
- Sesión que sobrevive indefinidamente mientras haya actividad real (eventos DOM).
- Cierre automático limpio a los 30 min de inactividad: logout server + clear client + redirect login.
- Refresh transparente del access token antes de la expiración (sin que el usuario perciba).
- Una sola tab refresca (no N pestañas refrescan simultáneamente).
- 401 inesperado intenta refresh + retry una vez antes de expulsar.
- Login muestra mensaje específico al regresar por inactividad o por sesión perdida; no banner genérico.

**Non-Goals:**
- Cambiar el TTL del access token (sigue 15 min).
- Implementar JWT revocation server-side (lista negra).
- "Recuérdame" persistente entre cierres del navegador (out of scope; sessionStorage es por ventana).
- Mostrar countdown UI ("tu sesión cerrará en X min"). No solicitado.

## Decisions

### Decisión 1: Sliding refresh (rotar cookie en `/auth/refresh`)

**Elegido**: cada llamada a `/api/v1/auth/refresh` exitosa emite un nuevo `refreshToken` (Set-Cookie) con TTL fresco de 7 días.

**Alternativas consideradas**:
- *Mantener refresh TTL fijo de 7 días sin rotar*: el usuario igualmente sería forzado a re-login a los 7 días aunque esté activo. Contradice la promesa de "sesión indefinida con actividad".
- *Refresh TTL infinito*: riesgo de seguridad si la cookie se roba.

**Rationale**: Sliding refresh = sesión efectivamente indefinida mientras el usuario use la app cada ≤7 días, manteniendo un cap de 7 días si deja de usarla.

### Decisión 2: Scheduler client-side basado en `exp` del JWT

**Elegido**: al guardar `accessToken`, decodificar payload (`decodeJwtPayload`), calcular `delay = (exp * 1000) - Date.now() - 60_000` y programar `setTimeout(refresh, delay)` (clamp a mínimo 5 s).

**Alternativas consideradas**:
- *Interval cada minuto verificando si toca refrescar*: menos preciso, más CPU.
- *Refrescar tras cada fetch*: amplifica carga del backend ×N por sesión.

**Rationale**: Una sola promesa programada por sesión; simple, preciso, sin polling.

### Decisión 3: Coordinación entre pestañas con `BroadcastChannel`

**Elegido**: `new BroadcastChannel("agrisas-auth")`. Mensajes: `{ type: "refreshed", accessToken, expiresAt }`, `{ type: "logged-out", reason }`, `{ type: "activity", at }`.

**Alternativas consideradas**:
- *`storage` event sobre sessionStorage*: sessionStorage NO dispara `storage` events entre pestañas (por scope).
- *localStorage*: dispararía cross-tab pero `accessToken` no debe estar en localStorage (más superficie XSS).

**Rationale**: `BroadcastChannel` está disponible en todos los navegadores modernos (Safari 15+), es el primitivo correcto y mantiene el token en sessionStorage.

Cuando una pestaña refresca, otras escuchan `refreshed` y actualizan su `sessionStorage.accessToken` + reprograman su scheduler.

Cuando una pestaña detecta inactividad y cierra sesión, otras reciben `logged-out` y redirigen también.

### Decisión 4: Pestaña líder elegida por timestamp

**Elegido**: cada pestaña genera un `tabId = uuid()` al montar. Antes de refrescar, emite `{ type: "claim-refresh", tabId, at }` y espera 100 ms; si recibe otro `claim-refresh` con `at` menor (o `tabId` lexicográficamente menor en empate), cede. Si pasan 100 ms sin desafío, procede.

**Alternativas consideradas**:
- *Web Locks API (`navigator.locks`)*: ideal y atómico, pero compat parcial (Safari 15.4+ ok; aceptable). Considerar como mejora opcional si surge issue.
- *Mutex sobre IndexedDB*: complejidad alta para esto.

**Rationale**: Algoritmo simple, 100 ms es despreciable al usuario. Suficiente para evitar dobles refreshes en el 99% de casos.

### Decisión 5: Detector de actividad con throttle 2 s

**Elegido**: `useInactivityTimer(timeoutMs = 30 * 60 * 1000)` registra listeners pasivos para `mousemove`, `mousedown`, `keydown`, `scroll` (window y elementos scrolleables), `touchstart`, `visibilitychange`. Throttle: solo registra `lastActivityAt = Date.now()` cada 2 s.

Cada 30 s verifica `Date.now() - lastActivityAt >= timeoutMs` → dispara logout.

**Alternativas consideradas**:
- *Eventos sin throttle*: explotan el thread principal con cada pixel del mouse.
- *Tracking server-side de actividad*: implica request por cada interacción; absurdo.

**Rationale**: Throttle 2 s + check cada 30 s es prácticamente gratis, suficientemente preciso para un timeout de 30 min.

### Decisión 6: 401 con retry one-shot

**Elegido**: `authFetch` mantiene una `refreshPromise: Promise<string> | null` compartida. Si una request recibe 401:
- Si `refreshPromise === null`, crea una nueva: llama `/auth/refresh`, almacena el nuevo `accessToken`, broadcastea, resuelve.
- Si ya existe, espera la existente.
- Tras el refresh, reintenta la request original UNA vez con el nuevo token.
- Si tras el retry recibe otro 401, o si el refresh falló, lanza `UnauthenticatedError` (esta vez sí dispara logout).

**Rationale**: Tolerante a la ventana exacta de expiración del token (caso edge: el scheduler aún no había disparado).

### Decisión 7: Login lee `?reason=` para mostrar copy

**Elegido**: `/auth/login` recibe opcionalmente `?reason=inactivity|session_lost|manual`. Renderiza:
- `inactivity` → banner info "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión."
- `session_lost` → banner advertencia "Tu sesión expiró. Inicia sesión nuevamente."
- `manual` o sin reason → sin banner.

El banner genérico "sesión caducada" actual SHALL eliminarse del código.

**Rationale**: Mensajes específicos vs. genéricos mejoran UX. `manual` permite redirigir desde logout button sin banner.

## Risks / Trade-offs

- **[Riesgo]** `BroadcastChannel` no disponible (navegador antiguo) → Mitigación: feature-detect; si no existe, cada tab refresca individualmente (carga ligera duplicada, no rompe nada).
- **[Riesgo]** Reloj del cliente desfasado → token "futuro" o "pasado" → Mitigación: margen 60 s antes de `exp` cubre desfases típicos; en peor caso, 401 dispara refresh defensivo.
- **[Riesgo]** Refresh token comprometido → sliding refresh facilita persistencia del atacante → Mitigación: cookie es HttpOnly + SameSite=Strict; logout invalida la sesión cliente; no se introduce nuevo vector vs. estado actual.
- **[Riesgo]** Pestañas inactivas en background consumen el throttle interval → Mitigación: `visibilitychange` reduce el polling cuando la pestaña no es visible (verificación cada 60 s en lugar de 30 s).
- **[Trade-off]** No hay countdown UI antes del cierre por inactividad. Aceptable; modal de "¿sigues ahí?" se puede añadir como mejora futura sin romper este diseño.
- **[Trade-off]** Refresh "se siente fantasma" — sesión vive indefinidamente mientras haya actividad. Si un atacante toma control del browser mientras el usuario lo dejó abierto sin moverse, los 30 min de timeout son la defensa.

## Migration Plan

1. Backend: rotar cookie en `/auth/refresh`. Deploy aislado; no rompe clientes actuales (siguen sin usar refresh; siguen funcionando como hoy).
2. Frontend: deploy con `SessionLifecycleProvider` + `authFetch` con refresh logic + login con `reason`.
3. No requiere migración de datos ni feature flag (cambio es client-orchestration).
4. Rollback: revert del PR frontend. Backend rota cookie, lo cual es inocuo si nadie llama refresh.

## Open Questions

- ¿Mostrar un toast/modal "Sigues ahí?" a los 28 min para evitar pérdida de trabajo? **Propuesta**: NO en este change; entra como mejora futura. La política solicitada es "30 min sin más".
- ¿Persistir `lastActivityAt` en `localStorage` para sobrevivir crash del browser? **Propuesta**: NO; `sessionStorage` es coherente con el modelo "una sesión por ventana" y simplifica el limpiado.
