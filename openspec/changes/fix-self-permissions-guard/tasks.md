## 1. Guard: self-access sin users:read

- [x] 1.1 Modificar `app/api/v1/admin/users/[id]/permissions/route.ts`: si `req.headers.get("x-user-id") === params.id`, omitir `requirePermission(req, "users:read")` y devolver 401 sólo si falta `x-user-id`; en caso contrario (`id` distinto), mantener el guard `requirePermission(req, "users:read")` sin cambios.
- [x] 1.2 Test de integración/unitario para la ruta: caso self-access sin `users:read` → 200 con permisos propios; caso otro usuario sin `users:read` → 403; caso otro usuario con `users:read` → 200 (sin regresión).

## 2. Hook cliente: no cachear error como "sin permisos"

- [x] 2.1 Modificar `fetchPermissions()` en `app/_hooks/useCurrentUser.ts`: comprobar `res.ok` antes de `res.json()`; si `!res.ok`, no persistir el resultado en `permissionsCache` (no fijar `expiresAt`) y devolver `Set` vacío para ese ciclo, permitiendo reintento en la próxima evaluación de `can()`.
- [x] 2.2 Ajustar/añadir test de `useCurrentUser` (`tests/unit/ui/...`) cubriendo: respuesta 200 con permisos (cachea normal), respuesta 200 con `permissions: []` (cachea `[]`, comportamiento actual preservado), respuesta no-OK (no cachea, no lanza).

## 3. Verificación

- [x] 3.1 Ejecutar `npm test` (suite completa) y confirmar verde.
- [x] 3.2 Verificación manual local: login con usuario `kevhernandez07@gmail.com` / `test1234` (rol dev `zarioz_test`, sin `users:read`; permisos: `sales:create`, `sales:read`, `customers:read`, `inventory:read`, `sales:create_credit`) contra `localhost:3000` (Node 20 vía nvm — Node de sistema 18.0.0 es incompatible con Next.js). Verificado con Playwright headless (`playwright-core`, sin la extensión `claude-in-chrome` — ésta corrompía la carga de chunks webpack del propio dev server causando un falso positivo "TypeError: Cannot read properties of undefined (reading 'call')"/hydration crash no relacionado con el fix; confirmado reproduciendo la misma navegación con Playwright puro sin errores). Resultado: login exitoso → redirige a `/pos`; NavigationRail muestra exactamente POS, Ventas, Inventario, Catálogos (antes vacío por el bug) — matching sus permisos reales, sin Cotizaciones/Devoluciones/Usuarios/Roles (correcto, sin esos permisos).
- [x] 3.3 Correr `opsx:verify` contra este change antes de solicitar archivo.

## 4. Deploy

- [ ] 4.1 PR contra `develop` (nunca `master`).
- [ ] 4.2 Tras merge y deploy, verificar en prod que un usuario del rol `tienda_zarioz` (o cualquiera de los 7 roles afectados) ve el NavigationRail poblado en su próximo login/carga.
