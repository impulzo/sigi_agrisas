## Why

El proyecto ya tiene auth funcional, pero al iniciar sesión el usuario no encuentra una experiencia coherente: no existe shell del panel privado (NavigationRail, TopAppBar) ni ninguna página real bajo `app/(private)/`. El diseño aprobado en Stitch (*Agrisas Admin & POS Dashboard*, proyecto `5227157529282603342`) define un sistema visual Material 3 "Agro-Systemic" con paleta verde/marrón/azul-gris, tipografía Inter y un layout fijo de NavigationRail+TopAppBar que debe ser la base de todos los módulos futuros (POS, Inventario, Facturación). Esta propuesta implementa, solo en frontend y con datos mock, el shell del panel y la primera página real (`/dashboard`) según ese diseño.

## Reglas fundamentales del panel

El panel privado SHALL cumplir con estas cuatro reglas no negociables, validadas por requirements explícitos en `specs/panel-shell/spec.md`:

1. **Implementa el diseño frontend de Stitch (MCP)**: la UI del panel se construye fielmente sobre el design system Material 3 "Agro-Systemic" generado en el proyecto Stitch `5227157529282603342`. Paleta, tipografía Inter, escala de spacing 8px, iconografía Material Symbols Outlined y composición de bento grid se derivan de Stitch — no se introducen tokens ni componentes visuales ajenos al sistema.
2. **Se alinea con la arquitectura frontend del proyecto**: Atomic Design (`_components/atoms|molecules|organisms`), Route Groups (`(public)` / `(private)`) y `_logic/` por feature (`hooks/`, `services/`, `schemas/`, `types/`) según lo definido en `CLAUDE.md`. Los `_components/` y `_blocks/` son presentational puros (sin fetch, sin storage, sin router imperativo); la lógica vive en `_logic/`.
3. **El panel carga después de iniciar sesión o registrarse**: tras un login o registro exitoso, el usuario aterriza directamente en `/dashboard` mediante `router.replace("/dashboard")`, sin pasar visiblemente por `/` ni cualquier otra pantalla intermedia.
4. **No se puede acceder al panel directamente si no se ha iniciado sesión**: cualquier intento de navegar a una ruta bajo `(private)` (o a `/`) sin la cookie `refreshToken` válida SHALL ser redirigido server-side a `/auth/login`. La protección es doble: middleware (`middleware.ts` + `AuthMiddlewareAdapter`) y layout del route group (`app/(private)/layout.tsx`), sin posibilidad de flash de UI privada.

## What Changes

- Añade ruta `/dashboard` bajo route group `app/(private)/` como página por defecto post-login.
- Crea **NavigationRail** fijo de 80px (logo, 4 destinos primarios: Dashboard, POS, Inventario, Facturación; 2 destinos secundarios: Soporte, Cuenta) y **TopAppBar** fijo de 64px (título, buscador, botones de icono, avatar).
- Crea `app/(private)/layout.tsx` como Server Component que envuelve todas las páginas privadas con el shell.
- Crea bloques del Dashboard: bento grid con tarjeta de ventas + sparkline, tarjeta de inventario, alertas de stock bajo, feed de actividad reciente y placeholder de mapa logístico.
- Crea services con **mock data** (`getDashboardKpis`, `getLowStockAlerts`, `getRecentActivity`) en `_logic/services/` para alimentar la página; cuando exista el backend, solo cambia la implementación.
- Añade tokens de diseño Material 3 "Agro-Systemic" en `tailwind.config.ts` (paleta primary `#0d631b`, secondary `#77574d`, tertiary `#445963`, escala completa de surfaces, error, outline) más escala tipográfica Inter (display-lg, headline-lg, title-md, body-lg/md, label-lg/sm) y escala de spacing 8px (xs/sm/md/lg/xl/gutter).
- Adopta **Material Symbols Outlined** (Google Fonts) como sistema de iconos del panel, cargado vía `<link>` en `app/(private)/layout.tsx`.
- Añade nuevos átomos y moléculas presentational reutilizables: `IconButton`, `Avatar`, `Chip`, `Card`, `StatCard`, `RailItem`, `TimelineItem`.
- Redirección server-side: si el usuario llega a `/` (root) ya autenticado, redirige a `/dashboard`; si no lo está, a `/auth/login`.
- **Redirect post-login directo a `/dashboard`**: `useLoginForm` y `useRegisterForm` cambian `router.replace("/")` por `router.replace("/dashboard")` para evitar el doble salto cliente→root→dashboard y aterrizar inmediatamente en el panel autenticado tras un login/registro exitoso. `useAuthRedirect` (que rebota usuarios ya autenticados que caen en `/auth/*`) hace el mismo cambio por coherencia.

## Capabilities

### New Capabilities
- `panel-shell`: layout privado compartido con NavigationRail, TopAppBar, redirección post-login y route group `(private)`.
- `dashboard-ui`: página `/dashboard` con bento grid (KPIs de ventas, inventario, alertas de stock bajo, actividad reciente, hub logístico), services con datos mock y bloques del feature.

### Modified Capabilities
- `frontend-scaffold`: amplía los tokens de Tailwind con el design system Material 3 "Agro-Systemic" (paleta semántica completa, escala tipográfica Inter, escala de spacing 8px) y adopta Material Symbols Outlined como icon set del panel.

## Impact

- **Código nuevo**:
  - `app/(private)/layout.tsx`, `app/(private)/dashboard/page.tsx`
- **Código modificado (post-login)**:
  - `app/(public)/auth/_logic/hooks/useLoginForm.ts`, `useRegisterForm.ts`, `useAuthRedirect.ts`: destino del `router.replace` pasa de `"/"` a `"/dashboard"`.
  - `app/(private)/dashboard/_blocks/{DashboardHeader,SalesCard,InventoryCard,LowStockAlerts,ActivityFeed,LogisticsMap}.tsx`
  - `app/(private)/dashboard/_logic/{services,hooks,types}/`
  - `app/_components/atoms/{IconButton,Avatar,Chip}/`
  - `app/_components/molecules/{Card,StatCard,SearchInput}/`
  - `app/_components/organisms/{NavigationRail,TopAppBar}/`
  - `app/page.tsx` (root) actualizado para redirigir según cookie de sesión.
- **Código modificado**:
  - `tailwind.config.ts`: añade ~50 tokens semánticos M3, mantiene tokens legacy `agrisas-*` para no romper auth-ui.
  - `app/layout.tsx`: añade el `<link>` de Material Symbols Outlined (o se mueve al layout privado para no cargarlo en /auth).
- **Sin cambios**:
  - `src/` (backend hexagonal intacto).
  - `app/(public)/auth/*` (sigue usando tokens legacy).
  - Middleware (`/dashboard` queda automáticamente protegido por el matcher actual `(?!_next|favicon)`).
- **Tests nuevos**: unit tests con RTL para `NavigationRail`, `TopAppBar`, bloques del Dashboard, services mock y hooks; smoke test de `app/(private)/layout.tsx`.
- **Dependencias**: ninguna adicional (Material Symbols vía CSS, no se instala paquete).
- **Sin riesgo de regresión** en auth porque la paleta legacy no se elimina.
