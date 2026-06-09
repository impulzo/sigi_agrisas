## Context

El backend `admin-users-crud` (archivado en `2026-05-18-admin-users-crud`) expone los endpoints:

| Endpoint | Permiso | Uso desde la UI |
|---|---|---|
| `GET /api/v1/admin/users?page&pageSize` | `users:read` | Tabla principal |
| `GET /api/v1/admin/users/:id` | `users:read` | (potencial) refetch puntual |
| `PATCH /api/v1/admin/users/:id` | `users:write` | Modal de edición (`name`, `email`, `avatarUrl`) |
| `DELETE /api/v1/admin/users/:id` | `users:write` | Eliminación tras confirmación |
| `POST /api/v1/admin/users/:id/roles` | `users:write` | Asignar rol desde el modal |
| `DELETE /api/v1/admin/users/:id/roles/:roleId` | `users:write` | Revocar rol desde el modal |
| `GET /api/v1/admin/roles` | `roles:read` | Catálogo de roles disponibles en el modal |

El frontend ya tiene los patrones que esta pantalla debe seguir, establecidos en `roles-ui`: `_blocks` presentational, `_logic/{hooks,services,types,schemas}`, `authFetch` con errores tipados (`UnauthenticatedError`, `ForbiddenError`, `NetworkError`), `useCurrentUser().can(perm)` para gating, átomos/moléculas en `app/_components/` (`Skeleton`, `EmptyState`, `ConfirmDialog`, `Badge`, `Icon`). El diseño Stitch "Administración de Usuarios" (screen `9db3daab4372451eb71556443529f20a`) define una tabla con filtros y un modal "Edit User".

El usuario admin ve y administra usuarios; los roles `operator` y `viewer` tienen `users:read` por seed actual pero **no** `users:write`, así que la UI debe degradar gracefully (ocultando acciones de edición/eliminación) en lugar de ocultar la pantalla completa.

## Goals / Non-Goals

**Goals:**
- Pantalla `/users` consistente con la estética de `/roles` y el diseño Stitch.
- Conectar directamente con todos los endpoints listados; no añadir ninguno nuevo.
- Reutilizar átomos/moléculas existentes; añadir un `Avatar` átomo nuevo si no existe.
- Tests RTL/jsdom cubriendo el camino feliz y los principales errores.
- Filtros (search + role chips) viven en cliente sobre la página cargada para evitar tocar el backend.
- Modal de edición que combina campos del usuario (`name`, `email`, `avatarUrl`) con la asignación de roles, todo en una sola interacción "Guardar Cambios" que aplica un diff (igual que `RolesPage` hace con permisos).

**Non-Goals:**
- Crear usuarios desde esta pantalla (cero `POST /admin/users` — no existe; flujo sigue siendo `/auth/register`).
- Cambio de contraseña, status activo/inactivo, upload de imagen.
- Búsqueda global server-side (el backend no acepta `q` aún).
- Soft delete o papelera.
- Internacionalización (textos en español hard-coded, igual que `roles-ui`).

## Decisions

### Decisión 1 — Tabla con paginación offset + filtro client-side, no master/detail

`roles-ui` usa un layout master/detail porque hay típicamente <10 roles. Usuarios son potencialmente decenas o cientos: una tabla paginada es lo que pide el diseño Stitch. El filtro por rol y el buscador operan sobre la página cargada (no hay endpoint con `?q=` ni `?roles=`); cuando se cambia de página se resetean los filtros activos para mantener el contrato.

**Alternativa descartada**: cargar todo y paginar en cliente. No escala más allá de unos cientos de usuarios y rompe el contrato del backend que ya define paginación.

### Decisión 2 — Modal de edición con commit en bloque (diff de cambios al "Guardar")

El modal mantiene estado local de `name`, `email`, `avatarUrl` y el `Set<roleId>` actual. Al pulsar "Guardar Cambios" se calcula el diff:
1. Si `name`, `email` o `avatarUrl` cambiaron → un único `PATCH /admin/users/:id`.
2. Para cada rol agregado → `POST /admin/users/:id/roles`.
3. Para cada rol removido → `DELETE /admin/users/:id/roles/:roleId`.

Las operaciones de roles se ejecutan en paralelo con `Promise.all` (sigue el patrón de `RolesPage.handleSave`). Si alguna falla el modal muestra `mutationError` con el mensaje del backend. Tras éxito, se cierra el modal y se refresca la página actual de la tabla.

**Alternativa descartada**: PATCH "fat" único que reciba roles. Cambiaría el contrato del backend y no aporta valor — el costo de 2-3 requests paralelos al guardar es despreciable.

### Decisión 3 — Auto-protección visual + confianza en el backend para enforcement

Las acciones de "Editar" y "Eliminar" para la fila del propio admin se renderizan deshabilitadas con `title="No puedes editar/eliminar tu propia cuenta"`. Esto evita confundir al usuario, pero la garantía real vive en el backend (`SelfModificationError` → 403). Si el backend rechaza por cualquier razón, el toast de error muestra el mensaje del 403.

**Alternativa descartada**: ocultar las acciones completamente. Decisión de UX: dejarlas visibles pero deshabilitadas hace explícito que "existen pero no se aplican a ti".

### Decisión 4 — `avatarUrl` como input de URL en el modal (sin upload)

El PATCH acepta `string | null`. El modal incluye un input `type="url"` con placeholder mostrando un Gravatar de ejemplo y un botón "Resetear a Gravatar" que envía `null`. Validación Zod: `z.string().url()` o `z.literal("")` (que se mapea a `null` antes de enviar).

**Alternativa descartada**: subida de archivo a almacenamiento. Necesitaría storage en Supabase, otro endpoint, otro change. Fuera de scope.

### Decisión 5 — `_logic/services/` envuelve `authFetch` con normalización de errores

Cada service (`listUsers`, `updateUser`, `deleteUser`, `assignRoleToUser`, `revokeRoleFromUser`) acepta `fetchImpl?: typeof fetch` y devuelve datos parseados o lanza un error tipado del módulo (`UserNotFoundError`, `EmailAlreadyInUseError`, `SelfModificationError`, `ForbiddenError`, `NetworkError`). Esto reproduce exactamente la convención de `roles-ui` y permite testear hooks sin tocar `sessionStorage`.

### Decisión 6 — Hook `useUsers({ page, pageSize })` con cache trivial

`useUsers` ejecuta `listUsers({ page, pageSize })`, expone `{ users, total, isLoading, error, refresh }`. No hay cache persistente entre cambios de página; al cambiar de página se vuelve a cargar (consistente con `useRoles`). Se expone `refresh()` para invocar después de mutaciones (modal save, delete).

### Decisión 7 — Item `users` en el `NavigationRail` antes de `roles`

Se inserta entre `billing` y `roles`:
```
dashboard → pos → inventory → billing → users (users:read) → roles (roles:read)
```
La spec `panel-shell` ("Navigation rail item catalogue") debe modificarse para incluirlo. El icono propuesto es `group` (Material Symbols). El gating se delega al filtro existente del rail con `requires`.

### Decisión 8 — Crear átomo `Avatar` reutilizable

El modal y la tabla muestran el `avatarUrl` del usuario. Se introduce `app/_components/atoms/Avatar/Avatar.tsx` con props `{ src: string; alt?: string; size?: "sm"|"md"|"lg" }` y fallback en caso de error de carga (icono `person`). Reutilizable más allá de esta pantalla.

## Risks / Trade-offs

- **Filtro client-side** → No filtra usuarios que no estén en la página actual. Mitigación: documentar en la UI ("Filtros aplican a la página actual"). Si el volumen crece, abrir change para añadir `?q=` al backend.
- **Avatar como URL libre** → El admin puede pegar cualquier URL; el `<img>` confía en CORS del origen externo. Mitigación: el átomo `Avatar` cae a un icono si la imagen falla.
- **Carrera de mutaciones de roles** → Si dos admins editan al mismo usuario simultáneamente, los `POST/DELETE roles` no son atómicos. Mitigación: aceptado para un panel administrativo de bajo concurrent-use; el último que guarde gana, sin pérdida de datos críticos.
- **`useCurrentUser` se basa en JWT** → La `userId` para auto-protección viene del token, no de una llamada de `/me`. Mitigación: ya es la convención del proyecto; cualquier desfase requeriría reauth.

## Migration Plan

Sin cambios de BD. Deploy:
1. `npm run build` — verifica tipos.
2. Deploy normal a Vercel/Docker.
3. Verificar manualmente con un admin que `/users` carga y las acciones funcionan.

Rollback: revertir el commit; no hay estado persistido.

## Open Questions

- ¿El input "avatarUrl" debería pre-rellenarse con el Gravatar calculado o con `""` cuando el campo no está seteado? → Decisión: campo vacío en el input significa "mantener actual"; un botón explícito "Resetear a Gravatar" envía `null`. Esto evita que un Re-PATCH accidental sobreescriba con la URL de Gravatar (que es un cálculo derivado, no un valor "real").
- ¿Mostrar `createdAt` en la tabla o sólo en un detalle/tooltip? → Decisión: columna `Creado` con fecha relativa ("hace 3 días") y la fecha completa como tooltip. Coherente con el diseño Stitch.
