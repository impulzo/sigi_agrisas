## Context

El panel ya tiene el shell privado (NavigationRail + TopAppBar) sobre Material 3 "Agro-Systemic" generado en `panel-front`. El backend RBAC está completo (módulo `rbac`, JWT con `roles`, endpoints `/api/v1/admin/**`). Lo que falta es:

1. Una **UI de administración** que permita ver roles, ver permisos por rol, y conceder/revocar permisos a un rol.
2. La primera **utilidad de fetch autenticado client-side** del panel, ya que hasta ahora la única lógica HTTP del frontend privado eran fixtures mock (`getDashboardKpis`, etc.). Sin esta utilidad, cada feature reinventaría el wiring del `Authorization` header y la traducción de errores HTTP.
3. Un **mecanismo de gating de UI por permiso**: el item del menú **Roles** solo aparece si el usuario puede leer roles; la página `/roles` muestra un estado 403 amigable si el usuario llega sin permiso.

Restricciones que aplican:

- Arquitectura definida en `CLAUDE.md`: Atomic Design + Route Groups + `_logic` por feature; `_components/` y `_blocks/` son presentational puros (sin `fetch`, sin `sessionStorage`, sin `useRouter().push/replace`).
- El access token vive en `sessionStorage` bajo la clave `"accessToken"` (convenio establecido por `useLoginForm`/`useRegisterForm`). El refresh token es HttpOnly y no es legible desde el cliente.
- El middleware (`AuthMiddlewareAdapter`) ya bloquea rutas privadas sin cookie de sesión; **no** valida permisos. La autorización por permisos vive en los route handlers de la API y debe replicarse en la UI como UX (no como seguridad).
- El design system está en `tailwind.config.ts` con tokens semánticos M3; el feature SHALL usarlos (no introduce tokens nuevos).

## Goals / Non-Goals

**Goals:**
- Implementar `/roles` como página master-detail: lista de roles a la izquierda, detalle (permisos asignados + permisos disponibles para conceder) a la derecha.
- Permitir grant/revoke de permisos con feedback inmediato (optimistic update + rollback en error).
- Añadir el item **Roles** al `NavigationRail`, oculto para usuarios sin `roles:read`.
- Establecer el patrón canónico para fetch autenticado (`authFetch`) y para gating de UI por permisos (`useCurrentUser().can(...)`).
- Cobertura de tests unitarios sobre los hooks, services y componentes presentacionales clave.

**Non-Goals:**
- Crear/borrar/renombrar roles (el catálogo de roles es seed-managed; este change solo gestiona permisos por rol).
- Crear/borrar permisos del catálogo (idem; el catálogo es seed-managed).
- Asignar/revocar roles a usuarios concretos (vivirá en el módulo de usuarios, fuera de alcance).
- Refresh automático del access token al expirar (el panel ya tiene refresh; este change no lo cambia).
- Internacionalización: textos hardcodeados en español.
- Tests E2E con Playwright (la carpeta `tests/e2e/` sigue reservada).

## Decisions

### Decisión 1 — Página `/roles` como master-detail con state local (sin `useReducer` ni librería de estado)

`app/(private)/roles/page.tsx` es Server Component (lee `cookies()` para defensa en profundidad y exporta `metadata`). Renderiza un único bloque cliente `<RolesPage />` que orquesta:

- **Master (columna izquierda, ~320px)**: `<RolesList />` muestra los roles del catálogo. Click sobre un rol actualiza `selectedRoleId` en el estado local.
- **Detail (columna derecha, flex-1)**: `<RoleDetailHeader />` + `<RolePermissionsList />` (permisos ya asignados al rol, con botón "Revocar") + `<AvailablePermissionsList />` (permisos del catálogo que aún no están asignados al rol, con botón "Conceder").

Estado del feature gestionado con `useState` + `useEffect` en hooks dedicados (`useRoles`, `useRolePermissions`, `usePermissionsCatalog`). **No** se introduce React Query, SWR ni Redux: el feature tiene 3 endpoints de lectura y 2 de mutación, y la sobrecarga de una librería de fetching no se justifica todavía. Las mutaciones (`useGrantPermission`, `useRevokePermission`) hacen optimistic update sobre el estado local del hook y rollback si la mutación falla.

**Por qué master-detail en una sola página**: el catálogo de roles tiene 3 entradas iniciales y no crecerá mucho (decenas como mucho); cada rol tiene un puñado de permisos. Una vista single-page con dos paneles es más eficiente que rutas separadas `/roles` + `/roles/:id` y evita full reloads al cambiar de rol.

**Alternativas descartadas**:
- *Rutas separadas con `app/(private)/roles/[id]/page.tsx`*: introduce navegaciones innecesarias, complica el guard de permisos por ruta y rompe el flujo "veo rol → veo sus permisos → modifico → veo otro rol".
- *React Query / SWR*: ~12KB adicionales para 5 endpoints; los hooks personalizados son ~80 líneas y cubren todos los casos del feature.
- *Redux/Zustand*: estado compartido global no necesario; cada hook tiene su propio fetch.

### Decisión 2 — `authFetch` como wrapper único de `fetch` para endpoints autenticados

Nueva utilidad `app/_lib/authFetch.ts`:

```ts
export interface AuthFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export class UnauthenticatedError extends Error {}
export class ForbiddenError extends Error {
  constructor(public required?: string) { super("Forbidden"); }
}
export class NetworkError extends Error {}

export async function authFetch(
  input: string,
  init: AuthFetchOptions = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!init.skipAuth) {
    const token = typeof window !== "undefined"
      ? sessionStorage.getItem("accessToken")
      : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(input, { ...init, headers });
  } catch {
    throw new NetworkError();
  }
  if (res.status === 401) throw new UnauthenticatedError();
  if (res.status === 403) {
    let required: string | undefined;
    try {
      const body = await res.clone().json();
      required = body?.required;
    } catch {}
    throw new ForbiddenError(required);
  }
  return res;
}
```

Cada service del feature (`listRoles`, `grantPermissionToRole`, etc.) consume `authFetch` en vez de `fetch` y mapea errores específicos del dominio (parseo de body, errores de validación 400).

**Por qué**: centralizar el wiring del `Authorization` header en un solo lugar evita que cada service lo reimplemente. Convertir `401/403` en errores tipados permite que los hooks reaccionen (redirect a login, mostrar 403 amigable) sin parsear `response.status` cada vez.

**Alternativas descartadas**:
- *Axios + interceptor*: añade ~30KB; `fetch` nativo es suficiente.
- *Server Actions de Next 14*: cómodas pero el panel privado es predominantemente client-side (state, optimistic UI); cada acción además requeriría leer cookies para el access token, que vive en `sessionStorage`.
- *Pasar el token explícitamente a cada service*: rompe la encapsulación; los hooks no deberían conocer detalles del transporte HTTP.

### Decisión 3 — `useCurrentUser` lee `roles` del JWT y expone `can(permission)` con caché

Nuevo hook global `app/_hooks/useCurrentUser.ts`:

```ts
interface CurrentUser {
  userId: string;
  email: string;
  roles: string[];
  isLoading: boolean;
  can: (permission: string) => boolean | "loading";
}
```

Comportamiento:
1. En el mount lee `sessionStorage.getItem("accessToken")` y decodifica el payload con `jwt.decode` (`app/_lib/jwt.ts`). Expone inmediatamente `userId`, `email`, `roles`.
2. La función `can(permission)` consulta `/api/v1/admin/users/:userId/permissions` la primera vez que se invoca con cualquier permiso. Mientras esa petición está en curso devuelve `"loading"`. Resuelta, devuelve `boolean`. El resultado se cachea en un módulo singleton (`Map<userId, { permissions: Set<string>; expiresAt: number }>`) con TTL 60s (espejo del cache del backend), de modo que múltiples componentes que llamen `can(...)` compartan la misma respuesta.
3. Si el JWT está ausente o malformado, expone `userId: ""`, `roles: []`, `can: () => false`.

**Por qué decodificar localmente el JWT**: el claim `roles` ya viaja en el token y nos da un primer chequeo rápido y barato para esconder/mostrar el item del menú. Pero **no** es la verdad: el usuario podría tener un rol cuya definición de permisos cambió mientras el token está vivo. Por eso `can()` siempre confirma contra el backend; los `roles` del JWT solo se usan para inferencias rápidas (mostrar/ocultar el item del menú antes de la confirmación HTTP) y como degradación si el endpoint falla.

**Seguridad**: la decodificación local no verifica firma. **Cualquier gating UI es UX, no seguridad** — el backend siempre hace `requirePermission` en cada endpoint. El usuario podría manipular el JWT en `sessionStorage` para que `can(...)` devuelva `true` localmente, pero cualquier llamada subsecuente al backend recibiría 401/403.

**Alternativas descartadas**:
- *Llamar a `/api/v1/admin/users/me/permissions` siempre*: añade latencia al render inicial; el JWT ya trae `roles` y eso basta para el primer pintado.
- *Decodificar y verificar firma client-side*: requiere distribuir la clave HMAC al cliente — inseguro.
- *`jose` u otra librería*: el decode es ~15 líneas; añadir una dependencia para eso no se justifica.

### Decisión 4 — NavigationRail filtra items por permiso con degradación graceful

`NavigationRail` pasa de ser presentational puro (renderiza `primaryItems` tal cual) a presentational con un mini-filtro:

```ts
const visibleItems = primaryItems.filter((item) => {
  if (!item.requires) return true;
  const allowed = can(item.requires);
  if (allowed === "loading") return true; // mostrar mientras carga; evita un "salto" en el rail
  return allowed === true;
});
```

El item de Roles se declara como:
```ts
{ key: "roles", href: "/roles", icon: "shield_person", label: "Roles", requires: "roles:read" }
```

`RailItem` se extiende con `requires?: string`. Los items sin `requires` siempre se muestran.

**Por qué mostrar durante `"loading"`**: evita que el rail "parpadee" cuando la primera consulta a `/users/:id/permissions` aún no resolvió. Si el usuario hace click antes de la confirmación y no tiene permisos, el layout de `/roles` mostrará el estado 403.

**Alternativas descartadas**:
- *Filtrar server-side leyendo `x-user-roles`*: requiere mover el cómputo del rail al layout server, pero el `NavigationRail` es `"use client"` para soportar `usePathname`. Mezclar ambos rompe la separación SSR/CSR.
- *Esconder durante `"loading"`*: produce parpadeo cada vez que el usuario abre el panel.

### Decisión 5 — UI del feature `/roles`: toggle editor agrupado con batch save *(actualizado)*

> *Revisión sobre la propuesta original: el diseño fue alineado al sistema de diseño Stitch "Agro-Systemic" durante la implementación. La propuesta original de dos listas separadas (asignados / disponibles) con optimistic update por click fue reemplazada por un toggle editor agrupado con batch save explícito.*

Layout final:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Roles y Permisos                         [ Crear Nuevo Rol ]        │
│  Gestiona el acceso de los usuarios...                               │
├────────────────┬─────────────────────────────────────────────────────┤
│ Roles          │  Configurando: admin          [ Estado: Activo ]    │
│ ────────────   │  Administrador con acceso total                     │
│ admin          │                                                     │
│ operator       │  USUARIOS                                           │
│ viewer         │  ┌─────────────────────────────────────────────┐    │
│                │  │ Leer usuarios                      [●  ON]  │    │
│                │  │ Crear/editar usuarios              [●  ON]  │    │
│                │  └─────────────────────────────────────────────┘    │
│                │                                                     │
│                │  ROLES Y PERMISOS                                   │
│                │  ┌─────────────────────────────────────────────┐    │
│                │  │ Leer roles y permisos              [●  ON]  │    │
│                │  │ Gestionar roles y permisos         [●  ON]  │    │
│                │  └─────────────────────────────────────────────┘    │
│                │                        [ Descartar ] [ Guardar ]    │
└────────────────┴─────────────────────────────────────────────────────┘
```

Componentes en `app/(private)/roles/_blocks/`:

- `RolesList.tsx`: lista vertical de roles. Item activo con `bg-primary-container text-on-primary-container`.
- `RoleDetailHeader.tsx`: muestra "Configurando: [nombre]" + badge "Estado: Activo" con ícono `verified_user`.
- `RolePermissionsEditor.tsx`: editor de toggles agrupados por recurso. Cada item muestra la `description` del permiso (no la clave técnica). Los toggles son `role="switch"` accesibles. Las traducciones de grupo viven en `_logic/labels.ts`.

Componentes `RolePermissionsList.tsx`, `AvailablePermissionsList.tsx` y `RoleFiltersBar.tsx` existen como código legado de la propuesta original; pueden eliminarse en un change de limpieza posterior.

**Por qué toggles agrupados en lugar de dos listas separadas**: la UI de Stitch mostró que un toggle editor agrupado por recurso es más intuitivo — el admin ve todos los permisos de un recurso juntos y puede activar/desactivar sin tener que buscar entre dos listas. Reduce la superficie visual y es más parecido a los paneles de permisos estándar (ej. GitHub Teams, Notion).

**Por qué batch save en lugar de optimistic update por click**: alinea con el mental model del usuario de "configuro todo y confirmo", reduce las llamadas HTTP (una petición por cambio vs. una petición al guardar N cambios), y evita el riesgo de estado parcialmente guardado si el usuario abandona la página a mitad de una secuencia de clicks. El `staged` state provee el mismo feedback visual inmediato sin viaje de red.

**Por qué no se muestran claves técnicas (`users:read`) al usuario**: el usuario administrador del panel agrícola no necesita conocer los identificadores internos del sistema RBAC. Mostrar `description` en español reduce la carga cognitiva. Las claves técnicas siguen siendo la fuente de verdad para el backend y para el `aria-label` de accesibilidad (no se pierde trazabilidad).

**Alternativas descartadas**:
- *Mantener dos listas con optimistic update*: descartado porque la UI de Stitch mostró una experiencia superior con toggles.
- *Tabla con todos los permisos x todos los roles* (matriz): escala mal con más de 4 roles o 6 permisos.
- *Modal de confirmación para cada cambio*: ralentiza el flujo; batch save + "Descartar" ofrece la misma protección contra cambios accidentales.

### Decisión 6 — Estado 403 amigable en `/roles` para usuarios sin `roles:read`

`app/(private)/roles/page.tsx` renderiza el bloque cliente `<RolesPage />` que, en el primer effect, llama a `useCurrentUser().can("roles:read")`. Mientras está en `"loading"` muestra un skeleton completo del feature. Si resuelve `false`, renderiza `<EmptyState icon="lock" title="Sin acceso" description="No tienes permisos para administrar roles. Contacta a un administrador." />`. Si resuelve `true`, renderiza la lista de roles normalmente.

**Por qué no redirect**: si el usuario llega a `/roles` desde un link compartido o de un bookmark, redirigirlo a `/dashboard` sin explicación es confuso. Un estado 403 explícito mejora la UX.

**Por qué no SSR-redirect leyendo `x-user-roles`**: la lógica de permisos efectivos vive en el backend (roles → permisos), no en los roles. Un usuario con rol `operator` no tiene `roles:read` aunque exista; hacer la inferencia client-side leyendo el JWT introduce duplicación con el backend (la tabla `role_permissions`). Es más simple llamar a `/users/:id/permissions` y dejar que el backend sea la fuente única de verdad.

## Risks / Trade-offs

**Riesgo: stale UI cuando un admin revoca permisos a otro admin en vivo**
- Mitigación: el `useCurrentUser` cache tiene TTL 60s; tras 60s la consulta se repite. Para fuerza bruta de actualización se puede invocar `useCurrentUser().refresh()` (lo añadimos como API pública del hook).

**Riesgo: rondas de fetch para `can(...)` desde múltiples componentes**
- Mitigación: cache singleton a nivel módulo + dedupe de la promesa en vuelo (si dos componentes llaman `can("roles:read")` antes de que la primera resuelva, ambos esperan la misma promesa).

**Trade-off: optimistic update puede causar inconsistencias si el backend rechaza después**
- Aceptado: el rollback restaura el estado anterior y muestra un toast/inline error con el mensaje del backend. La probabilidad de fallo en grant/revoke es baja (validaciones simples).

**Trade-off: no usar React Query introduce algo de boilerplate en los hooks**
- Aceptado: ~80 líneas distribuidas en 5 hooks es manejable; cuando el panel tenga >20 endpoints reales con caché compartido, evaluaremos migrar.

**Riesgo: el item del menú parpadea durante el primer load mientras `can(...)` resuelve**
- Mitigación: mientras `can(...)` está en `"loading"` el item se muestra, no se esconde. Esto produce un "se muestra → se esconde si no autorizado" en lugar de un "no se muestra → se muestra → se actualiza", que es menos disruptivo según pruebas UX informales en proyectos similares.

**Riesgo: `authFetch` rompe los tests que usan `fetch` sin token**
- Mitigación: `skipAuth: true` permite saltarse el header; `authFetch` acepta `fetchImpl` inyectado (opcional) para tests. Los services del módulo `auth` (login/register) NO usan `authFetch` — ya están escritos con `fetch` directo, y este change no los toca.

## Migration Plan

Sin migración de datos (frontend-only). La integración con el backend usa los endpoints ya disponibles.

Orden de implementación recomendado (lo refleja `tasks.md`):
1. Atoms/molecules nuevos (Badge, Skeleton, EmptyState, ConfirmDialog) — independientes y testeables aisladamente.
2. Utilidades transversales (`authFetch`, `jwt.decode`, `useCurrentUser`) — base para el resto.
3. `_logic/` del feature (types, schemas, services, hooks).
4. `_blocks/` y página `/roles`.
5. Integración con `NavigationRail` (item con `requires`).
6. Tests unitarios + smoke en navegador.

## Open Questions

1. **¿Mostrar "creado por" / "modificado por" en cada permiso asignado?** El backend hoy expone `grantedAt` pero no `grantedBy`. Para esta primera versión la lista solo muestra la `key` y la `action`. Si lo pide cliente, se añade en un change pequeño posterior.
2. **¿Permitir filtrado por categoría de permiso (`resource`)?** La búsqueda por substring cubre el caso; si la UI escala a 50+ permisos, considerar agrupado por `resource` (`users:`, `roles:`, etc.).
3. **¿Cómo afectar al cliente si su propio rol es revocado mientras navega?** El próximo `authFetch` devolverá 403 y `useCurrentUser` invalidará el caché; el item del menú desaparece en el siguiente render. Aceptable para esta versión; un caso edge a watch.
