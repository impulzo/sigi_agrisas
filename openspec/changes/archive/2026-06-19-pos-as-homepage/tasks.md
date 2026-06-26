## 1. RBAC — nuevo permiso reports:read

- [x] 1.1 En `prisma/seed.ts` añadir `{ key: "reports:read", description: "Ver dashboard de KPIs y reportes" }` al array `PERMISSIONS` (línea ~46, después de `reports:inventory_read`).
- [x] 1.2 En `prisma/seed.ts` añadir `"reports:read"` al array `permissions` del rol `admin` (línea ~71). No añadirlo a `operator` ni `viewer`.
- [x] 1.3 Ejecutar `npm run seed` y verificar que el permiso queda registrado en BD sin errores.

## 2. Redirección raíz y post-auth

- [x] 2.1 En `app/page.tsx` cambiar `redirect(refreshToken ? "/dashboard" : "/auth/login")` por `redirect(refreshToken ? "/pos" : "/auth/login")`.
- [x] 2.2 En `app/(public)/auth/_logic/hooks/useLoginForm.ts` cambiar `router.replace("/dashboard")` por `router.replace("/pos")`.
- [x] 2.3 En `app/(public)/auth/_logic/hooks/useRegisterForm.ts` cambiar `router.replace("/dashboard")` por `router.replace("/pos")`.
- [x] 2.4 En `app/(public)/auth/_logic/hooks/useAuthRedirect.ts` cambiar `router.replace("/dashboard")` por `router.replace("/pos")`.

## 3. NavigationRail — gate dashboard a admin

- [x] 3.1 En `app/_components/organisms/NavigationRail/items.ts`, en el item `{ key: "dashboard", ... }` añadir `requires: "reports:read"` (label permanece `"Inicio"`).

## 4. Dashboard page — guard server-side

- [x] 4.1 En `app/(private)/dashboard/page.tsx` leer `const roles = headers().get("x-user-roles") ?? "";` justo después de leer `x-user-email`. Si `!roles.split(",").includes("admin")`, invocar `redirect("/pos")` antes de cualquier fetch. Importar `redirect` de `"next/navigation"`.
- [x] 4.2 En `app/(private)/dashboard/page.tsx` cambiar `metadata.title` de `"Inicio | Agrisas"` a `"Dashboard | Agrisas"`.

## 5. QA

- [x] 5.1 `npm run build` pasa sin errores de TypeScript.
- [x] 5.2 Verificación manual: login como `operator` → aterriza en `/pos`; navegar a `/dashboard` → redirige a `/pos`; item "Dashboard" no visible en rail.
- [x] 5.3 Verificación manual: login como `admin` → aterriza en `/pos`; navegar a `/dashboard` → carga el dashboard; item "Dashboard" visible en rail.
