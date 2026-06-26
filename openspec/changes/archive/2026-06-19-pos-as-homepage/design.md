## Context

Flujo actual: `app/page.tsx` redirige a `/dashboard`; los hooks de auth (`useLoginForm`, `useRegisterForm`, `useAuthRedirect`) también redirigen a `/dashboard` hardcodeado. El item "Inicio" del rail no tiene `requires`; todos los roles lo ven. El dashboard muestra KPIs y gráficas relevantes sólo para administradores.

Archivos clave afectados: `app/page.tsx`, `app/_components/organisms/NavigationRail/items.ts`, hooks de auth (`useLoginForm`, `useRegisterForm`, `useAuthRedirect`), seed RBAC, `app/(private)/dashboard/page.tsx`.

## Goals / Non-Goals

**Goals:**
- Redirigir usuarios autenticados a `/pos` como destino por defecto.
- Ocultar el item Dashboard del rail para roles no-admin.
- Bloquear acceso directo a `/dashboard` para no-admin (server-side guard).
- Nuevo permiso `reports:read` asignado sólo a `admin`.

**Non-Goals:**
- Cambiar el contenido del dashboard (KPIs, gráficas, layout).
- Introducir lógica de negocio nueva en el dashboard.
- Gestión de permisos granulares dentro del dashboard.

## Decisions

### 1. Permiso `reports:read` como gate del dashboard

**Decisión**: Crear el permiso `reports:read` en el seed RBAC. Asignarlo sólo al rol `admin`. Usarlo como `requires` en el item del rail y como check server-side en `dashboard/page.tsx`.

**Por qué**: Consistente con el patrón `resource:action` del proyecto. Semánticamente correcto (el dashboard es el módulo de reportes/KPIs). Reutilizable cuando el módulo de reportes crezca.

**Alternativa descartada**: Usar `roles:read` (permiso admin existente) como proxy. Rechazado: semánticamente incorrecto y acomplado — si en el futuro `roles:read` se extiende a otros roles, el gate del dashboard se rompe silenciosamente.

### 2. Guard server-side en `dashboard/page.tsx`

**Decisión**: Leer `x-user-roles` del header en el Server Component. Si el string no contiene `"admin"`, `redirect("/pos")`.

**Por qué**: La protección en el rail es defensa de UX (oculta el item); la protección en `page.tsx` es defensa de seguridad (bloquea acceso directo). Doble capa consistente con el patrón del proyecto (`middleware + layout`). El header `x-user-roles` ya lo propaga el middleware.

**Alternativa descartada**: Verificar `reports:read` via `GET /api/v1/admin/users/:id/permissions` en el server component. Rechazado: añade una llamada HTTP en el render path; la comprobación de rol desde el header es suficiente y sin latencia.

### 3. Destino de redirección post-auth: `/pos`

**Decisión**: `app/page.tsx`, `useLoginForm`, `useRegisterForm` y `useAuthRedirect` redirigen a `/pos`.

**Por qué**: Si el usuario no tiene `sales:create`, `/pos` muestra una página vacía con el mensaje de permisos insuficientes (comportamiento ya implementado vía `useCurrentUser().can()`). No es necesario un pre-check del rol en el redirect — `/pos` maneja su propio gating.

**Alternativa descartada**: Redirigir a `/dashboard` para admin y a `/pos` para el resto (redirect inteligente). Rechazado: requiere leer permisos en un Server Component (`app/page.tsx`) o en el hook de login antes de que el token esté disponible. Complejidad desproporcionada para el beneficio.

### 4. Label del item en el rail: conservar "Inicio"

**Decisión**: Mantener `label: "Inicio"` en el rail item; no renombrar a "Dashboard".

**Por qué**: El label "Inicio" comunica mejor el propósito de navegación para el admin (punto de partida del panel). "Dashboard" es un anglicismo técnico innecesario cuando el ítem ya está restringido a `reports:read` (solo admin lo ve).

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Admin aterriza en `/pos` en lugar del dashboard familiar | La primera visita puede sorprender; documentar en changelog. El admin puede navegar a Dashboard desde el rail. |
| Operador navega directamente a `/dashboard` por URL guardada en favoritos | Server-side guard redirige a `/pos` transparentemente. |
| Hook `useAuthRedirect` redirige a `/pos` pero el usuario no tiene `sales:create` | `/pos` muestra mensaje de permisos; el usuario puede navegar desde el rail al módulo que tenga permiso. |
| `reports:read` no existe en prod hasta que se ejecute el seed | El guard server-side chequea el rol `admin` directamente desde el header — sin dependencia del permiso en runtime. El permiso sólo es necesario para el rail. Si el seed no se ejecutó, el item no aparece en el rail para nadie (falso negativo temporal). |

## Migration Plan

1. Ejecutar seed RBAC después del deploy (`npm run seed`) para registrar `reports:read`.
2. No hay migración de datos ni estado persistente.
3. Rollback: revertir commits; sin cambios de BD (el permiso es additive, no destructivo).

## Open Questions

- ¿El `metadata.title` de `dashboard/page.tsx` cambia de `"Inicio | Agrisas"` a `"Dashboard | Agrisas"`? Por ahora sí (coherente con el rename del label del rail).
