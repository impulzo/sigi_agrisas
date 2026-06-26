## Why

Los operadores y cajeros aterrizan en el dashboard de KPIs al iniciar sesión, pero su flujo de trabajo inmediato es el POS. El dashboard con gráficas es relevante sólo para administradores que supervisan el negocio. El salto manual a `/pos` es fricción innecesaria en cada turno.

## What Changes

- **BREAKING** `app/page.tsx` redirige a `/pos` (en vez de `/dashboard`) para usuarios autenticados.
- La ruta `/dashboard` permanece pero requiere el permiso `reports:read` (sólo rol `admin`).
- El item "Inicio" del `NavigationRail` se convierte en "Dashboard" gateado con `reports:read`, visible sólo para admin.
- Se añade `reports:read` al seed RBAC: asignado a `admin`, no a `operator` ni `viewer`.
- La redirección post-login desde `app/page.tsx` cambia a `/pos`; si el usuario no tiene `sales:create`, el middleware de la app no bloquea — `/pos` sí verifica permisos y redirige si corresponde (comportamiento ya existente).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `dashboard-ui`: el dashboard pasa a requerir permiso `reports:read`; ya no es la página de aterrizaje por defecto; su item en el rail queda gateado a admin.
- `panel-shell`: la redirección raíz (`app/page.tsx`) apunta a `/pos`; el item dashboard en `primaryItems` agrega `requires: "reports:read"`.

## Impact

- `app/page.tsx` — cambio de redirect destino.
- `app/_components/organisms/NavigationRail/items.ts` — item `dashboard` agrega `requires`.
- `prisma/seeds/rbac.ts` (o equivalente) — nuevo permiso `reports:read` asignado a `admin`.
- Usuarios `operator` y `viewer`: ya no ven el item "Inicio/Dashboard" en el rail; aterrizan en `/pos`.
- Usuarios `admin`: ven el item "Dashboard" en el rail; aterrizan en `/pos` también, pero pueden navegar a `/dashboard`.
- Sin migración de datos; sin cambios de API.
