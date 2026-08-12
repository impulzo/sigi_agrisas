## 1. Implementación

- [x] 1.1 Cambiar `redirect("/dashboard")` → `redirect("/pos")` en `app/(public)/auth/login/page.tsx`
- [x] 1.2 Cambiar `redirect("/dashboard")` → `redirect("/pos")` en `app/(public)/auth/register/page.tsx`

## 2. Verificación

- [x] 2.1 `npm run build` — verifica tipos sin errores
- [ ] 2.2 Verificación manual: con `refreshToken` activo, visitar `/auth/login` y `/auth/register` → confirmar redirect a `/pos`
