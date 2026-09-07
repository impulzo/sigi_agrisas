## 1. Implementación

- [x] 1.1 En `app/(public)/auth/_logic/hooks/useSetPasswordForm.ts:65`, cambiar `router.replace("/dashboard")` por `router.replace("/pos")`.

## 2. Tests

- [x] 2.1 Confirmar si existe test unitario de `useSetPasswordForm` en `tests/unit/ui/`; no se encontró ninguno al proponer este change. Si aparece uno al implementar, actualizar la aserción del destino de redirect a `/pos`.
- [x] 2.2 Si no existe, agregar un test unitario mínimo en `tests/unit/ui/auth/useSetPasswordForm.test.ts(x)` que cubra el escenario "token válido → `router.replace("/pos")`" del delta spec `panel-shell`.
- [x] 2.3 Correr `npm test` completo y confirmar que no rompe ningún test existente de `useLoginForm`/`useRegisterForm`/`panel-shell`.

## 3. Verificación manual

- [x] 3.1 Con Playwright (CLI `@playwright/test`, nunca Claude-in-Chrome por regla del proyecto), se emitieron tokens de set-password vía script standalone (`IssuePasswordSetupTokenUseCase` contra la DB dev `qzzjpyepggwautckqeex`) para dos usuarios QA desechables (rol `admin` y rol `viewer`, creados y luego eliminados vía `/api/v1/admin/users`). Ambos escenarios confirmados con un spec temporal: usuario `admin` completa `/auth/set-password` y aterriza en `/pos` (no `/dashboard`); usuario `viewer` completa el formulario, también aterriza en `/pos` (no `/dashboard`) y ve el `EmptyState` "Sin acceso" — comportamiento esperado del guard de permisos, no del redirect. 2/2 tests passed.
- [x] 3.2 Confirmado por la aserción `expect(page.url()).not.toContain("/dashboard")` inmediatamente tras `waitForURL(/\/pos/)` en ambos casos — sin salto intermedio observable a `/dashboard`. Spec temporal, usuarios QA y datos de sesión de la verificación se eliminaron tras la prueba (no quedan artefactos en el repo ni en la DB dev).
