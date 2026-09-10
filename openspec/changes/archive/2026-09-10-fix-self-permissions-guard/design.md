## Context

`GET /api/v1/admin/users/:id/permissions` (`app/api/v1/admin/users/[id]/permissions/route.ts`) tiene dos consumidores con necesidades distintas hoy tratadas igual:

1. **Self-check** (Historia #1): `app/_hooks/useCurrentUser.ts` → `fetchPermissions(userId)` llama a esta ruta con el `sub` del propio JWT decodificado, para poblar `useCurrentUser().can()` y con ello el `NavigationRail` y cualquier gating de UI (`can("sales:create")`, etc.).
2. **Consulta administrativa** (fuera de alcance de esta corrección, sin cambios): un admin/operator/viewer con `users:read` consultando los permisos de un usuario distinto (panel `/users` o `/roles`, si existiera ese flujo).

El guard actual (`requirePermission(req, "users:read")`) no distingue ambos casos. Confirmado en prod vía Supabase: el rol `tienda_zarioz` (y 6 roles custom más) tienen sus 39 permisos correctamente en `role_permissions`/`user_roles`, pero el propio 403 de este guard hace que `fetchPermissions()` — que no valida `res.ok` — trate la respuesta como `permissions: []`, vaciando el `NavigationRail`.

`x-user-id` es propagado por `AuthMiddlewareAdapter` tras validar el JWT (ver sección "Middleware de autenticación" en `CLAUDE.md`), así que es la fuente confiable de identidad — nunca el `params.id` de la URL ni ningún campo del body.

## Goals / Non-Goals

**Goals:**
- (Historia #1) Que cualquier usuario autenticado pueda leer sus propios permisos sin necesitar `users:read`.
- (Historia #1) Preservar sin cambios el comportamiento para consultas a OTRO usuario: siguen requiriendo `users:read` y siguen devolviendo 403 si falta.
- (Historia #2) Que `fetchPermissions()` no cachee ni interprete un error HTTP (401/403/500) como "el usuario no tiene permisos" — evitar que un futuro bug de guard vuelva a ocultarse detrás de un sidebar vacío indistinguible del caso legítimo.

**Non-Goals:**
- No se toca `role_permissions`/`user_roles` en prod — los datos ya son correctos, el fix es puramente de guard HTTP y del hook cliente.
- No se introduce un permiso nuevo (ej. `users:read_self`) — se opta por una excepción de self-access en el guard existente, más simple y sin tocar el catálogo de permisos/seed.
- No se cambia el contrato de respuesta de la ruta (`{ permissions: string[] }`) ni se añade paginación/filtrado.
- No se resuelve aquí ningún otro endpoint que use `requirePermission` de forma similar (auditoría de otros guards queda fuera de alcance).

## Decisions

**D1 — Self-access exception en el guard, no un permiso nuevo.**
Comparar `params.id === req.headers.get("x-user-id")` dentro de `requirePermission`-adyacente (en el propio `route.ts`, sin modificar la firma genérica de `requirePermission` que usan ~30 rutas más). Alternativa descartada: crear permiso `users:read_self` y sembrarlo en todos los roles — más invasivo (migración de seed, no soluciona roles ya creados en prod sin re-sembrar) y no refleja la semántica real ("todo usuario puede ver lo suyo" no es un permiso otorgable, es una propiedad de identidad).

Implementación en `route.ts`:
```ts
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const selfId = req.headers.get("x-user-id");
  if (selfId !== params.id) {
    const guard = await requirePermission(req, "users:read");
    if (guard) return guard;
  } else if (!selfId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return rbacController.listUserPermissions(req, params.id);
}
```
Nota: el `else if (!selfId)` preserva el 401 que hoy da `requirePermission` cuando no hay `x-user-id` (nunca debería pasar detrás del middleware, pero mantiene paridad de códigos HTTP).

**D2 — `fetchPermissions()` distingue `res.ok` antes de parsear.**
Si `res.ok === false`, no cachear el resultado (no fijar `expiresAt`) y devolver `Set` vacío sin persistir en `permissionsCache` — así el próximo `can()` reintenta en vez de quedar "pegado" 60s a un falso negativo. Alternativa descartada: lanzar excepción y dejar que `NavigationRail`/páginas manejen el error — requeriría tocar todos los consumidores de `can()`; mantener el fallback silencioso pero no-cacheado es el cambio de menor blast radius y preserva el contrato actual de `can(): boolean | "loading"`.

**D3 — Alcance de branch scoping: no aplica.**
Este endpoint no tiene noción de sucursal (permisos son globales al usuario, no scoped por branch) — no se introduce `enforceBranchScope` aquí, sería incorrecto.

## Risks / Trade-offs

- **[Riesgo] Confundir `x-user-id` con un valor falsificable.** → Mitigación: el header lo escribe `AuthMiddlewareAdapter` tras verificar el JWT con `JWT_ACCESS_SECRET`; Next.js route handlers reciben `req.headers` ya procesados por el middleware, un cliente no puede sobreescribir ese header directamente (el middleware lo reconstruye desde el token, no lo reenvía tal cual del request original — verificar en `AuthMiddlewareAdapter` durante `apply`, ya documentado en `CLAUDE.md`).
- **[Riesgo] D2 sin caché en error podría causar refetch repetido si el backend está caído.** → Mitigación: aceptable — es preferible a que el usuario quede con sidebar vacío 60s tras un error transitorio; el propio `can()` sólo se re-evalúa en re-render, no en polling activo.
- **[Trade-off] No se re-siembran permisos para los 7 roles ya afectados en prod.** → No hace falta: sus `role_permissions` ya están completos (verificado por SQL); el fix de guard es suficiente para que vuelvan a ver el sidebar en su próxima carga (caché de 60s del lado cliente se vence solo).

## Migration Plan

1. Aplicar cambios de código (guard + hook).
2. Deploy a prod (Vercel, `develop` → PR → merge → deploy automático, según flujo del repo).
3. Sin migración de datos ni invalidación manual necesaria — el bug era de guard HTTP, no de estado persistido.
4. Verificación post-deploy: login como usuario de rol `tienda_zarioz` (o cualquiera de los 7 roles afectados) y confirmar que el `NavigationRail` muestra los items esperados según sus permisos.
5. Rollback: revertir el commit/PR — no hay estado migrado que revertir.

## Open Questions

Ninguna — alcance y decisiones confirmados con el usuario antes de proponer este change.
