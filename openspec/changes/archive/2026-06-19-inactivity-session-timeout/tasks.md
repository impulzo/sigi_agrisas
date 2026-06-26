## 1. Backend: sliding refresh

- [x] 1.1 Editar el handler `refresh` en `src/modules/auth/infrastructure/http/AuthController.ts` (o equivalente) para firmar un nuevo refresh JWT con TTL 7d y setearlo en `Set-Cookie: refreshToken=<new>; HttpOnly; SameSite=Strict; Max-Age=604800; Path=/`.
- [x] 1.2 Verificar que el response sigue devolviendo `{ accessToken }` con TTL 15 min y que los claims (`sub`, `email`, `branchId`) se preservan en el nuevo refresh token.
- [x] 1.3 Test unit: `POST /api/v1/auth/refresh` con refresh válido emite `Set-Cookie: refreshToken=...; Max-Age=604800`.
- [x] 1.4 Test unit: refresh con cookie expirada → 401 sin `Set-Cookie`.

## 2. Frontend: refreshScheduler

- [x] 2.1 Crear `app/_lib/session/decodeJwtPayload.ts` (si no existe, reutilizar el de `useCurrentUser`) — función pura `decodeJwtPayload<T>(token: string): T | null`.
- [x] 2.2 Crear `app/_lib/session/refreshScheduler.ts` con `schedule(token: string)` y `cancel()`. Calcula `delay = max(5000, (exp * 1000) - Date.now() - 60000)`.
- [x] 2.3 La llamada `/api/v1/auth/refresh` se hace con `fetch` directo (sin `authFetch` para evitar recursión); en éxito, persistir `accessToken` y reprogramar.
- [x] 2.4 Tests: programar con token a 15 min → `delay ≈ 14 min`; cancel() detiene el timer; token expirado → `delay = 5000`.

## 3. Frontend: authFetch con refresh + retry

- [x] 3.1 Refactor de `app/_lib/authFetch.ts` para añadir lógica:
  - En 401: invocar `refreshAndRetry(input, init)` con dedupe via promesa compartida módulo-level.
  - `refreshAndRetry`: llamar `/api/v1/auth/refresh`; si OK, persistir token, broadcastear via channel, reintentar request original UNA vez.
  - Si refresh falla o retry también devuelve 401 → `logoutClient("session_lost")` y lanzar `UnauthenticatedError`.
- [x] 3.2 Tests: mockear fetch; verificar 401 → refresh → retry → 200; verificar 401 + refresh 401 → logout + UnauthenticatedError; verificar dedupe con 5 requests concurrentes.

## 4. Frontend: useInactivityTimer

- [x] 4.1 Crear `app/_hooks/useInactivityTimer.ts` aceptando `{ timeoutMs?: number; onIdle: () => void }`. Default `timeoutMs = 30 * 60 * 1000`.
- [x] 4.2 Listeners pasivos: `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `visibilitychange` con throttle 2 s.
- [x] 4.3 Persistencia: `sessionStorage.lastActivityAt = Date.now()` en cada update throttled.
- [x] 4.4 Verificación: `setInterval(check, visible ? 30_000 : 60_000)`; cuando `Date.now() - lastActivityAt >= timeoutMs`, llamar `onIdle` una vez y limpiar el interval.
- [x] 4.5 Tests: `jest.useFakeTimers()` — no dispara antes de 30 min, dispara después; mousemove cada 5 min mantiene viva la sesión por 120 min; throttle limita updates.

## 5. Frontend: logoutClient

- [x] 5.1 Crear `app/_lib/logout.ts` con `logoutClient(reason?: "inactivity" | "session_lost" | "manual")`.
- [x] 5.2 Pasos: cancel scheduler → POST `/api/v1/auth/logout` (try/catch silencioso) → broadcastear `logged-out` → clear sessionStorage → `window.location.assign("/auth/login" + queryReason)`.
- [x] 5.3 Migrar el `useLogout` actual a usar `logoutClient("manual")` internamente para conservar API.
- [x] 5.4 Tests: cada reason produce la URL esperada; fallo de red en POST no bloquea redirect.

## 6. Frontend: SessionLifecycleProvider

- [x] 6.1 Crear `app/(private)/_blocks/SessionLifecycleProvider.tsx` (client component).
- [x] 6.2 `useEffect` al montar: leer `sessionStorage.accessToken` → `refreshScheduler.schedule(token)`. Abrir `BroadcastChannel("agrisas-auth")` y registrar handler para `refreshed`, `logged-out`, `activity`, `claim-refresh`.
- [x] 6.3 Montar `useInactivityTimer({ onIdle: () => logoutClient("inactivity") })`.
- [x] 6.4 Cleanup: `refreshScheduler.cancel()`, cerrar channel, remover listeners.
- [x] 6.5 Integrar `<SessionLifecycleProvider>` como wrapper de `children` en `app/(private)/layout.tsx` (después del redirect server-side).

## 7. Frontend: coordinación de líder

- [x] 7.1 Implementar `claimRefreshLeadership(channel, tabId): Promise<boolean>` que emite `claim-refresh` y espera 100 ms.
- [x] 7.2 Si recibe otro `claim-refresh` con `(at, tabId)` menor, devuelve `false`; caso contrario `true`.
- [x] 7.3 Si no recibió `refreshed` en 5 s tras ceder, asume falla de la líder y procede con su propio refresh (fallback).
- [x] 7.4 Test: dos pestañas simultáneas → solo una llama `/auth/refresh`.

## 8. UI de login

- [x] 8.1 Editar `app/(public)/auth/login/_blocks/LoginPage.tsx` para leer `useSearchParams().get("reason")`.
- [x] 8.2 Crear molecule `SessionReasonBanner` con prop `reason: "inactivity" | "session_lost"` y botón close que limpia query (`router.replace("/auth/login")`).
- [x] 8.3 Eliminar/limpiar cualquier banner genérico "sesión caducada" existente.
- [x] 8.4 Tests UI: render con cada reason muestra copy correcto; sin reason no muestra banner; reason desconocido no muestra banner; close oculta el banner.

## 9. Limpieza

- [x] 9.1 Buscar uso del banner antiguo (`grep -rn "sesión caducada\|session expired"`) y reemplazar/eliminar.
- [x] 9.2 Auditar `useCurrentUser` para no re-decodificar el token cuando el scheduler ya tiene los claims; opcional, no bloqueante.
- [x] 9.3 Actualizar `CLAUDE.md` sección JWT con: "Auto-refresh client-side cada ≤15 min; cierre por inactividad 30 min con redirección a `/auth/login?reason=inactivity`; sliding refresh server-side."

## 10. Tests integrales y verificación manual

- [x] 10.1 `npm test` completo → 0 regresiones; añadir cobertura para los nuevos módulos.
- [x] 10.2 `npm run dev` → login, abrir DevTools → confirmar `Set-Cookie: refreshToken` en `/login`.
- [x] 10.3 Mover el reloj del sistema 14 min adelante y disparar una request → debe auto-refrescar antes de 401 (verificar request a `/auth/refresh` en Network).
- [x] 10.4 Dejar la app abierta sin tocar nada 30 min → debe redirigir a `/auth/login?reason=inactivity`.
- [x] 10.5 Abrir dos pestañas, hacer logout en una → la otra redirige a login también.
- [x] 10.6 Provocar refresh fallido (eliminar cookie manualmente, esperar 401) → redirect a `/auth/login?reason=session_lost`.

## 11. Reporte

- [x] 11.1 Generar `openspec/changes/inactivity-session-timeout/report.md` con historial de cambios, pruebas y decisiones, en modo caveman.
