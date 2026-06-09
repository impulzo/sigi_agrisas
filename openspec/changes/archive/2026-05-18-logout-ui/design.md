## Context

El backend `POST /api/v1/auth/logout` ya existe: borra la cookie `refreshToken` HttpOnly y devuelve `{ message: "Logged out" }` con HTTP 200. El frontend almacena el access token en `sessionStorage` bajo la clave `"accessToken"`. El `NavigationRail` es ya un Client Component (`"use client"`) que usa `useCurrentUser`; es el punto natural para añadir la acción de logout.

El proyecto sigue el patrón `_logic/services/` + `_logic/hooks/` para toda lógica de red y de estado dentro de los features, y usa `authFetch` para llamadas autenticadas. El frontend de auth vive bajo `app/(public)/auth/_logic/`.

## Goals / Non-Goals

**Goals:**
- Exponer un botón de "Cerrar sesión" accesible desde cualquier pantalla del panel.
- Limpiar completamente la sesión del lado cliente (cookie via backend + `sessionStorage`).
- Redirigir a `/auth/login` tras el logout exitoso.
- Tests unitarios para el servicio y el hook.

**Non-Goals:**
- Invalidación del access token en el servidor (no existe endpoint ni blacklist; se acepta que el access token siga siendo válido hasta su TTL de 15 min).
- Diálogo de confirmación "¿Seguro que quieres salir?" (UX deliberadamente directa).
- Logout automático al detectar 401 (distinto cambio, distinto scope).
- Cambios en `TopAppBar` o en páginas individuales.

## Decisions

### Decisión 1 — Botón de logout en el `NavigationRail`, no en el `TopAppBar`

El `NavigationRail` ya es un Client Component con acceso a hooks. Añadir el botón ahí es un cambio mínimo y garantiza visibilidad constante en todas las pantallas privadas sin tocar el `TopAppBar` (Server Component que recibe props desde el layout servidor).

**Alternativa descartada**: Convertir `TopAppBar` en Client Component y añadir el botón ahí. Requeriría más cambios y romper la separación server/client del layout privado.

### Decisión 2 — Servicio `logout.ts` en `app/(public)/auth/_logic/services/`

El logout es parte del flujo de autenticación, por lo que vive junto con `login.ts` y `register.ts`. Acepta `fetchImpl` inyectable para tests, igual que los demás servicios de auth.

Pasos del servicio:
1. Llama `POST /api/v1/auth/logout` con `authFetch` (sin body).
2. Elimina `sessionStorage.getItem("accessToken")`.
3. Devuelve `void` en éxito.

### Decisión 3 — Hook `useLogout` en `app/(public)/auth/_logic/hooks/`

Wrapper fino que llama al servicio y redirige a `/auth/login` con `useRouter().push`. Expone `{ logout, isLoading }` para que el componente pueda deshabilitar el botón mientras el request está en vuelo.

### Decisión 4 — Botón como `<button>` standalone, no `RailItem`

El logout no es una ruta de navegación sino una acción; no encaja en el tipo `RailItem { key, href, icon, label }`. Se añade como un `<button>` independiente al final del `<div className="mt-auto">` del rail, con el mismo estilo visual que los links del rail para mantener coherencia.

**Alternativa descartada**: Extender `RailItem` con `onClick?: () => void`. Añade complejidad al tipo y al componente `RailLink` para un único caso de uso.

## Risks / Trade-offs

- **Access token sigue vivo hasta TTL tras logout** → Aceptado por diseño; el panel borra `sessionStorage` inmediatamente y redirige, así que el token queda inaccesible para el JS del cliente. Un refresh posterior fallará porque la cookie ya no existe.
- **Error de red al llamar a logout** → El hook no bloquea la redirección si el servicio falla: limpia `sessionStorage` y redirige igualmente (el backend limpiará la cookie en el próximo intento o por expiración). Esto prioriza la UX sobre la consistencia server-side.
- **Doble click en el botón** → `isLoading` deshabilita el botón mientras el request está en vuelo.

## Migration Plan

Sin cambios de BD ni de API. Deploy normal. Rollback: revertir el commit.
