---
name: inactivity-session-timeout-report
description: Historial de cambios, pruebas y decisiones — sesión indefinida con timeout 30 min
metadata:
  type: project
---

# Reporte: inactivity-session-timeout

## Cambios backend

**`RefreshTokenUseCase.ts`**
- Ahora retorna `{ accessToken, newRefreshToken }`. Sliding session: cada `/auth/refresh` exitoso emite nueva cookie de 7 días.

**`AuthController.refresh`**
- Extrae `newRefreshToken` del use case y setea `Set-Cookie: refreshToken=<new>; HttpOnly; SameSite=Strict; Max-Age=604800`.

## Cambios frontend

**`app/_lib/session/refreshScheduler.ts`** (nuevo)
- `schedule(token)`: programa `setTimeout` a `max(5000, exp*1000 - now - 60_000)`. `cancel()` limpia. `doRefresh()` llama `/api/v1/auth/refresh` con `fetch` directo (sin `authFetch` para evitar recursión), persiste nuevo token, reprograma.

**`app/_lib/authFetch.ts`**
- En 401 (no skipAuth, no _isRetry): invoca `doRefreshOnce()` (dedupe módulo-level), reintenta UNA vez. Si refresh falla → `logoutClient("session_lost")` + `UnauthenticatedError`.

**`app/_lib/logout.ts`** (nuevo)
- `logoutClient(reason?)`: cancela scheduler → POST logout (best-effort) → broadcast → clear sessionStorage → `_navigate("/auth/login?reason=...")`. `_navigate` override para tests (jsdom no permite spy en `window.location.assign`).

**`app/_hooks/useInactivityTimer.ts`** (nuevo)
- Listeners pasivos para 6 eventos DOM, throttle 2 s, `sessionStorage.lastActivityAt`. Interval 30 s (visible) / 60 s (hidden). Dispara `onIdle` una vez al llegar a 30 min.

**`app/(private)/_blocks/SessionLifecycleProvider.tsx`** (nuevo)
- Orquesta scheduler + inactivity timer + BroadcastChannel. Leader election de 100 ms para evitar refresh duplicados entre pestañas. Cross-tab logout con `{ type: "logged-out" }`.

**`app/_components/molecules/SessionReasonBanner/SessionReasonBanner.tsx`** (nuevo)
- Banner dismissible para `inactivity` / `session_lost`. Botón close → `router.replace("/auth/login")`.

**`app/(public)/auth/_blocks/LoginForm.tsx`**
- Lee `useSearchParams().get("reason")`, muestra `SessionReasonBanner` si reason ∈ `["inactivity","session_lost"]`.

**`app/(public)/auth/_logic/hooks/useLogout.ts`**
- Migrado a `logoutClient("manual")`. API externa idéntica.

**`app/(private)/layout.tsx`**
- Envuelve `children` con `<SessionLifecycleProvider>`.

**`CLAUDE.md`**
- Sección JWT actualizada con sliding refresh, auto-refresh, inactivity timeout, BroadcastChannel.

## Pruebas

| Suite | Tests | Estado |
|---|---|---|
| `RefreshTokenUseCase.test.ts` | +1 sliding session | PASS |
| `refreshScheduler.test.ts` | 5 nuevos | PASS |
| `authFetch.test.ts` | reescrito, +4 refresh/retry | PASS |
| `useInactivityTimer.test.ts` | 6 nuevos | PASS |
| `logout.test.ts` | 7 nuevos | PASS |
| `useLogout.test.ts` | actualizado | PASS |
| `SessionReasonBanner.test.tsx` | 4 nuevos | PASS |
| `LoginForm.test.tsx` | mock `useSearchParams` añadido | PASS |

**Pre-existing failures (no causadas por este change)**:
- `useLoginForm.test` / `useRegisterForm.test`: redirect a `/pos` vs `/dashboard` (bug en código existente)
- `NavigationRail.test`: label/requires de dashboard (issue en items.ts)
- `PaymentsListPage.test` / `RolesPage.test`: `next/navigation` no mockeado (gaps previos)
- Suite de integración: `DATABASE_URL required` (sin DB en CI local)

## Decisiones

- `_navigate` override en `logout.ts` — `window.location.assign` es read-only en jsdom.
- Dedupe de refresh vía promesa módulo-level en `authFetch` — evita N refreshes por burst de 401s concurrentes.
- Leader election 100 ms vía BroadcastChannel — evita double-refresh entre pestañas; fallback si no disponible.
- Sliding refresh server-side (new cookie en cada `/auth/refresh`) — sesión indefinida con actividad.
