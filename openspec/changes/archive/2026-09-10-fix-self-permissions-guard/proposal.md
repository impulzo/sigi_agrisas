## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario autenticado con rol custom (sin `users:read`) | Como usuario autenticado, quiero consultar mis propios permisos vía `GET /api/v1/admin/users/:id/permissions` para que el NavigationRail y `useCurrentUser().can()` reflejen correctamente mis permisos reales | Actualmente el guard exige `users:read` incluso cuando el usuario consulta su propio `id`, por lo que cualquier rol sin ese permiso recibe 403 y el sidebar queda vacío pese a tener permisos válidos en DB | - Given un usuario autenticado con `x-user-id=U1` y sin `users:read`, When hace `GET /api/v1/admin/users/U1/permissions`, Then recibe 200 con la lista real de sus permisos (no 403, no `[]`)<br>- Given un usuario autenticado con `x-user-id=U1` y sin `users:read`, When hace `GET /api/v1/admin/users/U2/permissions` (otro id), Then recibe 403 `Forbidden` (comportamiento actual preservado para terceros)<br>- Given un usuario con `users:read` (admin/operator/viewer), When consulta permisos de otro usuario, Then sigue funcionando como hoy (sin regresión) | - El bypass de guard aplica ÚNICAMENTE cuando `params.id === x-user-id` del header propagado por middleware (no confiar en body/query) — nunca comparar contra el JWT decodificado en cliente<br>- Consultar permisos de OTRO usuario (`params.id !== x-user-id`) sigue exigiendo `users:read` sin excepción<br>- No exponer datos adicionales del usuario objetivo en la respuesta — la ruta ya sólo devuelve `permissions: string[]` |
| 2 | Desarrollador manteniendo `useCurrentUser` | Como desarrollador, quiero que `fetchPermissions()` distinga una respuesta HTTP no-OK de una lista de permisos vacía legítima, para que un 401/403/500 no se interprete silenciosamente como "usuario sin permisos" | Hoy `fetchPermissions()` llama `res.json()` sin chequear `res.ok`; cualquier error HTTP cae a `permissions: []` sin log ni distinción, ocultando fallos reales (guard mal configurado, backend caído) detrás de un sidebar vacío indistinguible de "usuario legítimamente sin permisos" | - Given la respuesta HTTP tiene `res.ok === false`, When `fetchPermissions` la procesa, Then no cachea `[]` como resultado válido — reintenta en el próximo `can()` en vez de fijar `expiresAt` de 60s sobre un resultado erróneo<br>- Given `res.ok === true` con `permissions: []`, When se procesa, Then el comportamiento (rail vacío) se mantiene igual que hoy — es un caso legítimo | - No debe registrar en consola el token de acceso ni el body crudo de un 401/403 (podría filtrar mensajes con permisos requeridos internos)<br>- El fallback ante error sigue siendo "ocultar item del rail" (fail-closed), nunca "mostrar item" (fail-open) |

Nota: se dividió en 2 historias — la #1 es el fix obligatorio (causa raíz confirmada en prod); la #2 es hardening opcional que evita que este tipo de bug quede oculto en el futuro. Ambas trazan a la corrección propuesta en "What Changes".

## Why

El guard de `GET /api/v1/admin/users/:id/permissions` usa `users:read` como si fuera un permiso administrativo genérico, pero la ruta también es el endpoint que `useCurrentUser` llama para que **cualquier usuario autenticado** resuelva sus propios permisos y renderice el NavigationRail. `users:read` está pensado para que un admin liste/consulte usuarios ajenos (ver spec `admin-users`), no para el self-check que necesita todo el frontend. Al no distinguir "consulto mis propios permisos" de "consulto los permisos de otro usuario", cualquier rol custom sin `users:read` queda con el sidebar vacío aunque tenga permisos reales asignados — confirmado en prod: 7 de 10 roles (`semillero`, `tecnico_eduardo`, `tecnico_rolando`, `tecnicos`, `tienda_chichicapam`, `tienda_pradera`, `tienda_zarioz`) están afectados hoy, sólo los 3 roles base (`admin`, `operator`, `viewer`) lo ocultaban por tener `users:read` de fábrica.

Agrava el diagnóstico un segundo defecto: `fetchPermissions()` en `app/_hooks/useCurrentUser.ts` llama `res.json()` sin comprobar `res.ok`, así que un 403 se parsea igual como si fuera una respuesta 200 con `permissions: []` — el error queda indistinguible de "usuario sin ningún permiso", lo que retrasó la detección de este bug.

## What Changes

- Modificar el guard de `app/api/v1/admin/users/[id]/permissions/route.ts` para permitir acceso sin `users:read` cuando `params.id === x-user-id` (self-access). Consultar permisos de OTRO usuario sigue exigiendo `users:read` sin cambios.
- Endurecer `fetchPermissions()` en `app/_hooks/useCurrentUser.ts` para no tratar una respuesta HTTP no-OK como `permissions: []` cacheable — evita que un error real (403/401/500) se confunda con "usuario legítimamente sin permisos".
- Sin cambios de esquema de datos ni migraciones. No se requiere tocar `role_permissions`/`user_roles` en prod — los roles ya tienen los permisos correctos; el bug era puramente de guard HTTP.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `rbac`: el requirement de autorización de `GET /admin/users/:id/permissions` cambia de "requiere `users:read` siempre" a "requiere `users:read` sólo cuando el `id` consultado no es el propio usuario autenticado (self-access exento)".

## Impact

- **Código afectado**: `app/api/v1/admin/users/[id]/permissions/route.ts` (guard), `app/_hooks/useCurrentUser.ts` (`fetchPermissions`).
- **Spec afectada**: `openspec/specs/rbac/spec.md` (requirement de autorización del endpoint de permisos de usuario).
- **Sistemas**: NavigationRail y cualquier consumidor de `useCurrentUser().can()` en `app/`. Ningún cambio de base de datos.
- **Roles ya afectados en prod** (no requieren cambio de datos, sólo se benefician del fix de código): `semillero`, `tecnico_eduardo`, `tecnico_rolando`, `tecnicos`, `tienda_chichicapam`, `tienda_pradera`, `tienda_zarioz`.
- **Tests**: requiere test de integración/unitario nuevo para el guard (self vs. otro usuario) y ajuste de test existente de `useCurrentUser` si asume el comportamiento antiguo de `fetchPermissions`.
