## Why

Hoy el access token (JWT) caduca rígidamente a los 15 minutos: cualquier petición posterior produce 401 `Token expired` y el usuario es expulsado al login con el mensaje genérico "sesión caducada", incluso si estaba activo escribiendo en el POS o llenando una cotización. El cliente NO usa el endpoint `/api/v1/auth/refresh` (la cookie `refreshToken` HttpOnly está disponible y vive 7 días), así que el sliding session de hecho no existe en la UI. Esto interrumpe ventas en curso, borra trabajo no guardado y degrada la confianza.

La regla de negocio deseada: la sesión **no caduca por tiempo mientras haya actividad**; sólo se cierra tras **30 minutos de inactividad real**. Cuando cierra, redirige al `index` (`/auth/login`) limpiamente — sin el banner de error "sesión caducada".

## What Changes

- **Auto-refresh transparente del access token desde el cliente** usando `POST /api/v1/auth/refresh` (cookie `refreshToken` HttpOnly).
  - El cliente programa el refresh ~60 s antes de la expiración del access token (`exp - now - 60s`).
  - Si una petición recibe 401 mientras hay actividad, `authFetch` SHALL intentar 1 refresh y reintentar la petición original una sola vez (sin loop).
- **Detector global de inactividad en cliente** vía hook/Provider `InactivityTracker` montado en `app/(private)/layout.tsx`:
  - Escucha `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart` y `visibilitychange` con throttle (1 evento/2 s).
  - Mantiene `lastActivityAt` en memoria y refleja en `sessionStorage.lastActivityAt` para sincronizar entre pestañas.
  - Si `now - lastActivityAt >= 30 min`, dispara logout client-side y redirige a `/auth/login`.
- **Auto-refresh del refresh token (sliding session) en `/api/v1/auth/refresh`**:
  - El endpoint ya emite nuevo access token; SHALL ahora también emitir nueva cookie `refreshToken` (rota) con TTL renovado de 7 días. Sliding session real: mientras el usuario use refresh, su sesión vive indefinidamente.
- **Eliminar el banner "sesión caducada"**: el actual mensaje genérico en `/auth/login` se reemplaza por:
  - Logout por inactividad → query `?reason=inactivity` → mensaje "Sesión cerrada por inactividad. Vuelve a iniciar sesión."
  - Logout manual → sin query, sin banner.
  - 401 con refresh fallido (refresh token expirado/inválido) → query `?reason=session_lost` → mensaje "Tu sesión ya no es válida. Inicia sesión nuevamente."
- `authFetch` deja de lanzar `UnauthenticatedError` directamente en 401: ahora intenta refresh; sólo lanza si el refresh falla.
- El logout client-side (por inactividad o por refresh fallido) SHALL: `POST /api/v1/auth/logout` (best-effort, no bloquea), limpiar `sessionStorage`, redirigir a `/auth/login?reason=...`.
- **NO se cambia el TTL del access token (15 min)** — el sliding lo gestiona el cliente con refresh activo.

## Capabilities

### New Capabilities
- `client-session-lifecycle`: lifecycle de sesión en el cliente (auto-refresh, detector de inactividad, redirección a login con reason, limpieza de storage).

### Modified Capabilities
- `token-management`: el endpoint `/api/v1/auth/refresh` SHALL rotar la cookie `refreshToken` en cada uso (sliding refresh).
- `auth-middleware`: sin cambios en su lógica, pero clarifica que el 401 `Token expired` es el disparador del refresh client-side (no del banner UI).
- `auth-ui`: la página `/auth/login` SHALL leer `?reason=inactivity|session_lost` y mostrar el copy apropiado; sin reason no se muestra banner.

## Impact

- **Backend**:
  - `src/modules/auth/infrastructure/http/AuthController.refresh` (o equivalente): tras emitir access token, también setear `Set-Cookie: refreshToken=<new>; HttpOnly; SameSite=Strict; Max-Age=604800; Path=/` con un refresh token recién firmado (mismos claims, nuevo `iat/exp`).
  - Nada que cambiar en el middleware ni en el `/login`.
- **Frontend**:
  - `app/_lib/authFetch.ts`: añadir lógica de auto-refresh con dedupe (una sola promesa concurrente compartida), retry una vez tras 401, propagación de `UnauthenticatedError` solo si el refresh también falla.
  - Nuevo `app/_lib/session/refreshScheduler.ts`: lee `exp` del access token actual y programa `setTimeout` para refresh ~60 s antes; coordinado por `BroadcastChannel("auth")` entre pestañas para evitar refresh duplicados.
  - Nuevo hook `app/_hooks/useInactivityTimer.ts` (configurable, default 30 min) que registra listeners globales con throttle y dispara callback al expirar.
  - Nuevo provider `app/(private)/_blocks/SessionLifecycleProvider.tsx` montado en `(private)/layout.tsx` que orquesta `refreshScheduler` + `useInactivityTimer` + logout client-side.
  - `app/(public)/auth/login/_blocks/LoginPage.tsx`: leer `searchParams.reason` (`inactivity` / `session_lost`) y mostrar copy correspondiente. Eliminar/limpiar el banner genérico "sesión caducada".
  - `app/_lib/logout.ts` (o equivalente): exponer `logoutClient(reason?: "inactivity"|"session_lost"|"manual")` que centraliza POST + clear + redirect.
- **Tests**:
  - Unit backend: `/api/v1/auth/refresh` emite nueva cookie con TTL 7d (test de header `Set-Cookie`).
  - Unit UI: `useInactivityTimer` con `jest.useFakeTimers()` (no dispara antes de 30 min; reinicia con eventos; throttle).
  - Unit UI: `authFetch` con `fetchImpl` mockeado: 401 → refresh → retry; 401 + refresh 401 → `UnauthenticatedError`.
  - Unit UI: `refreshScheduler` programa timer en `exp - 60s` y se cancela en logout.
  - Integración: smoke E2E manual de "abrir POS, dejar inactivo 30 min, ver redirect a `/auth/login?reason=inactivity`".
- **Riesgo**:
  - Refresh loop si el endpoint devuelve 401 mal manejado → dedupe + cap de 1 retry mitigan.
  - Múltiples pestañas refrescando al mismo tiempo → `BroadcastChannel` para una sola pestaña líder.
  - Reloj del cliente desfasado: usar margen de 60 s antes de `exp` evita la mayoría de drifts.
  - Quotation modal abierto al cerrar por inactividad → la limpieza de sessionStorage + redirect descarta trabajo no guardado. Aceptable (es la política de seguridad solicitada).
- **Sin cambios**: backend RBAC, RBAC en UI, datos de productos/ventas, navegación del rail.
