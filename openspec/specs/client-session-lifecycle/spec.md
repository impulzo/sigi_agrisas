# Spec: client-session-lifecycle

## Purpose

Define el ciclo de vida de la sesión client-side: auto-refresh del access token, reintento transparente en authFetch ante 401, detector de inactividad, coordinación multi-pestaña vía BroadcastChannel, y función centralizada de logout.

---

## Requirements

### Requirement: Auto-refresh scheduler del access token
El cliente SHALL programar el refresh automático del access token decodificando el claim `exp` del JWT actual y disparando una llamada a `POST /api/v1/auth/refresh` aproximadamente 60 segundos antes de la expiración. El módulo `refreshScheduler` SHALL exponer `schedule(accessToken: string)` y `cancel()`. Al recibir un nuevo access token (vía `/auth/refresh` o `/auth/login`), el scheduler SHALL cancelar el timer anterior y reprogramar uno nuevo basado en el nuevo `exp`. El `delay` mínimo SHALL ser 5 s; si `exp - now - 60 < 5`, se programa con `delay = 5000`.

#### Scenario: Schedule programa refresh 60 s antes de expirar
- **WHEN** se invoca `schedule(token)` con un token cuyo `exp` está a 900 s (15 min)
- **THEN** el módulo programa un `setTimeout` con `delay ≈ 840_000 ms` (15 min - 60 s)

#### Scenario: Re-schedule cancela el timer previo
- **WHEN** se invoca `schedule(token2)` mientras existe un timer pendiente
- **THEN** el timer previo se cancela y se crea uno nuevo basado en `token2.exp`

#### Scenario: cancel() detiene el scheduler
- **WHEN** se invoca `cancel()` con un timer activo
- **THEN** no se dispara el refresh aunque transcurra el `delay`

#### Scenario: Delay mínimo 5 s
- **WHEN** se invoca `schedule(token)` con un token cuyo `exp` está a 30 s
- **THEN** el `delay` programado es `max(5000, exp - now - 60000) = 5000 ms`

---

### Requirement: Auto-refresh en authFetch ante 401
`authFetch` SHALL invocar `POST /api/v1/auth/refresh` cuando reciba HTTP 401 en una request autenticada, persistir el nuevo `accessToken` en `sessionStorage`, broadcastear el nuevo token a otras pestañas y reintentar la request original UNA sola vez con el nuevo token. Si el refresh falla (HTTP 401, network, etc.) o si el retry también recibe 401, `authFetch` SHALL lanzar `UnauthenticatedError` y disparar `logoutClient("session_lost")`.

Una sola promesa de refresh SHALL estar activa a la vez (dedupe). Requests concurrentes que reciban 401 SHALL esperar la misma promesa.

#### Scenario: 401 con refresh exitoso reintenta y retorna 200
- **WHEN** una request recibe 401 y `/auth/refresh` responde 200 con nuevo token
- **THEN** `authFetch` persiste el nuevo token, broadcastea, reintenta la request original con `Authorization: Bearer <new>` y devuelve la respuesta exitosa

#### Scenario: 401 con refresh fallido dispara logout
- **WHEN** una request recibe 401 y `/auth/refresh` responde 401 "Refresh token expired"
- **THEN** `authFetch` lanza `UnauthenticatedError` y dispara `logoutClient("session_lost")` que redirige a `/auth/login?reason=session_lost`

#### Scenario: Refresh deduplicado entre requests concurrentes
- **WHEN** 5 requests concurrentes reciben 401 simultáneamente
- **THEN** solo 1 llamada a `/auth/refresh` se dispara y las 5 esperan su resolución antes de retry

#### Scenario: Retry tras refresh ocurre una sola vez
- **WHEN** tras el retry la request vuelve a recibir 401
- **THEN** `authFetch` NO intenta otro refresh; lanza `UnauthenticatedError` directamente

---

### Requirement: Detector de inactividad client-side (30 min)
El hook `useInactivityTimer(timeoutMs = 30 * 60 * 1000)` SHALL registrar listeners pasivos para los eventos DOM globales `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart` y `visibilitychange` durante el ciclo de vida del provider. Cada evento SHALL actualizar `lastActivityAt = Date.now()` con throttle de 2 s (no más de un update cada 2 s). Un interval (30 s cuando la pestaña está visible, 60 s cuando está oculta) SHALL comparar `Date.now() - lastActivityAt >= timeoutMs`; si la condición se cumple, SHALL invocar el callback `onIdle` exactamente una vez.

`lastActivityAt` SHALL persistirse en `sessionStorage.lastActivityAt` para coordinación entre pestañas. Cambios de actividad en otras pestañas (vía `BroadcastChannel`) SHALL actualizar el valor local sin disparar `onIdle`.

#### Scenario: Timer no dispara antes del timeout
- **WHEN** se monta `useInactivityTimer(30 * 60 * 1000)` y se simula un `mousemove` cada 5 min
- **THEN** transcurridos 120 min sin pausas de >30 min, `onIdle` NO se ha disparado

#### Scenario: Timer dispara tras 30 min de inactividad
- **WHEN** se monta el timer y no ocurre ningún evento durante 30 min
- **THEN** `onIdle` se invoca exactamente una vez tras `≥30 min`

#### Scenario: Throttle limita updates a uno cada 2 s
- **WHEN** se disparan 100 eventos `mousemove` en 100 ms
- **THEN** `lastActivityAt` se actualiza una sola vez

#### Scenario: Actividad en otra pestaña reinicia el timer local
- **WHEN** otra pestaña broadcastea `{ type: "activity", at }` con `at > lastActivityAt`
- **THEN** el hook local actualiza `lastActivityAt` sin disparar `onIdle`

#### Scenario: Pestaña oculta reduce frecuencia de check
- **WHEN** `document.visibilityState === "hidden"`
- **THEN** el interval de verificación pasa de 30 s a 60 s

---

### Requirement: SessionLifecycleProvider en layout privado
`app/(private)/layout.tsx` SHALL renderizar un `<SessionLifecycleProvider />` (client component) que orqueste `refreshScheduler` + `useInactivityTimer` + `BroadcastChannel("agrisas-auth")` + `logoutClient`. Al montar, SHALL leer `sessionStorage.accessToken`, llamar `refreshScheduler.schedule(token)` y arrancar el inactivity timer. Al desmontar, SHALL cancelar el scheduler, remover listeners y cerrar el channel.

Eventos sobre el `BroadcastChannel`:
- `{ type: "refreshed", accessToken, expiresAt }` → la pestaña receptora actualiza `sessionStorage.accessToken` y reprograma su scheduler.
- `{ type: "logged-out", reason }` → la pestaña receptora limpia storage y redirige a `/auth/login?reason=<reason>`.
- `{ type: "activity", at }` → reset cross-tab del inactivity timer.
- `{ type: "claim-refresh", tabId, at }` → coordinación de líder para evitar refresh duplicados.

El provider NO SHALL bloquear el render del shell; los listeners se montan en `useEffect`.

#### Scenario: Provider monta en layout privado
- **WHEN** un usuario autenticado navega a `/dashboard`
- **THEN** `SessionLifecycleProvider` se monta una vez y registra listeners + scheduler

#### Scenario: Refresh en una pestaña actualiza otras
- **WHEN** la pestaña A refresca y broadcastea `{ type: "refreshed", accessToken: "<new>" }`
- **THEN** la pestaña B recibe el evento, actualiza su `sessionStorage.accessToken` a `<new>` y reprograma su scheduler

#### Scenario: Logout en una pestaña cierra otras
- **WHEN** la pestaña A se cierra por inactividad y broadcastea `{ type: "logged-out", reason: "inactivity" }`
- **THEN** la pestaña B limpia storage y redirige a `/auth/login?reason=inactivity`

---

### Requirement: logoutClient centraliza el cierre de sesión
`app/_lib/logout.ts` SHALL exponer `logoutClient(reason?: "inactivity" | "session_lost" | "manual")` que ejecuta en orden:
1. Cancela `refreshScheduler` y desmonta listeners de actividad si aplica.
2. Llama `POST /api/v1/auth/logout` (best-effort; ignora errores de red).
3. Broadcastea `{ type: "logged-out", reason }` por el channel.
4. Limpia `sessionStorage` (`removeItem("accessToken")`, `removeItem("lastActivityAt")`).
5. Redirige a `/auth/login` con el query `?reason=<reason>` si reason es `inactivity` o `session_lost`; sin query si es `manual` o `undefined`.

#### Scenario: Logout manual sin reason
- **WHEN** el usuario hace click en el botón de logout
- **THEN** `logoutClient("manual")` redirige a `/auth/login` sin query string

#### Scenario: Logout por inactividad incluye reason
- **WHEN** el inactivity timer dispara `logoutClient("inactivity")`
- **THEN** la redirección es a `/auth/login?reason=inactivity`

#### Scenario: Logout por sesión perdida incluye reason
- **WHEN** `authFetch` dispara `logoutClient("session_lost")` tras refresh fallido
- **THEN** la redirección es a `/auth/login?reason=session_lost`

#### Scenario: Logout es resiliente a fallo de red
- **WHEN** `POST /auth/logout` falla con network error
- **THEN** `logoutClient` continúa con clear storage + redirect (no bloquea)

---

### Requirement: Coordinación de líder para evitar refresh duplicado
Antes de invocar `/api/v1/auth/refresh`, la pestaña que detecta la necesidad de refresh SHALL emitir `{ type: "claim-refresh", tabId, at: Date.now() }` por `BroadcastChannel` y esperar 100 ms. Si recibe otro `claim-refresh` con `(at, tabId)` lexicográficamente menor, SHALL ceder y esperar el broadcast `{ type: "refreshed" }`. Si no recibe desafío, SHALL proceder con el refresh.

Si `BroadcastChannel` no está disponible en el navegador, cada pestaña refresca por su cuenta (sin coordinación).

#### Scenario: Pestaña con tabId menor gana el claim
- **WHEN** la pestaña A (tabId=`aaa`) y B (tabId=`bbb`) emiten `claim-refresh` con el mismo `at`
- **THEN** A procede con el refresh y B espera el broadcast `refreshed`

#### Scenario: Sin BroadcastChannel cada pestaña refresca
- **WHEN** `typeof BroadcastChannel === "undefined"`
- **THEN** la pestaña procede directamente al refresh sin coordinación

#### Scenario: Pestaña que cede recibe el token vía broadcast
- **WHEN** la pestaña B cedió y la pestaña A broadcastea `{ type: "refreshed", accessToken }`
- **THEN** B actualiza su `sessionStorage.accessToken` y reprograma su scheduler
