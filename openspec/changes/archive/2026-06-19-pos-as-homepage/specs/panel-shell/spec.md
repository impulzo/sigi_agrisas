## ADDED Requirements

### Requirement: Permiso reports:read gatea el Dashboard en el NavigationRail

El sistema SHALL definir el permiso `reports:read` en el seed RBAC. Este permiso SHALL asignarse exclusivamente al rol `admin` (no a `operator` ni `viewer`). El item `dashboard` en `primaryItems` de `NavigationRail/items.ts` SHALL incluir `requires: "reports:read"`. El `NavigationRail` SHALL ocultar el item cuando `can("reports:read")` devuelve `false`; SHALL mostrarlo optimistamente cuando devuelve `"loading"`.

#### Scenario: Item Dashboard visible sólo para admin

- **WHEN** un usuario con rol `operator` o `viewer` está autenticado
- **THEN** el item "Dashboard" no aparece en el `NavigationRail` (can("reports:read") === false)

#### Scenario: Item Dashboard visible para admin

- **WHEN** un usuario con rol `admin` está autenticado
- **THEN** el item "Dashboard" aparece en el `NavigationRail` (can("reports:read") === true)

#### Scenario: Label del item es "Inicio"

- **WHEN** se inspecciona `NavigationRail/items.ts`
- **THEN** el item con `key: "dashboard"` tiene `label: "Inicio"` y `requires: "reports:read"`

---

## MODIFIED Requirements

### Requirement: El panel carga después de iniciar sesión o registrarse

Tras un submit exitoso de login o registro, el usuario SHALL aterrizar directamente en `/pos`. Los hooks `useLoginForm`, `useRegisterForm` y `useAuthRedirect` (rebote de usuarios ya autenticados en `/auth/*`) SHALL invocar `router.replace("/pos")` con la ruta hardcodeada, evitando saltos intermedios y open-redirects derivados de query params. La raíz del proyecto `app/page.tsx` SHALL redirigir a `/pos` (en vez de `/dashboard`) cuando el usuario tiene una cookie `refreshToken` válida.

#### Scenario: Login exitoso aterriza en /pos

- **WHEN** un usuario envía credenciales válidas desde `/auth/login`
- **THEN** `useLoginForm` invoca `router.replace("/pos")` después de persistir el access token en `sessionStorage`

#### Scenario: Registro exitoso aterriza en /pos

- **WHEN** un usuario envía un registro válido desde `/auth/register`
- **THEN** `useRegisterForm` invoca `router.replace("/pos")` tras la respuesta 201 del backend

#### Scenario: Usuario ya autenticado que cae en /auth/*

- **WHEN** un usuario con sesión activa navega a `/auth/login` o `/auth/register`
- **THEN** `useAuthRedirect` invoca `router.replace("/pos")` durante el primer render

#### Scenario: Root redirige a /pos para autenticados

- **WHEN** un usuario autenticado navega a `/`
- **THEN** `app/page.tsx` invoca `redirect("/pos")` (en lugar de `/dashboard`)

#### Scenario: Sin salto intermedio por root

- **WHEN** se inspeccionan los hooks de auth y `app/page.tsx`
- **THEN** ningún hook ni página llama `router.replace("/dashboard")` ni `router.push("/dashboard")` como destino post-éxito; el destino es literalmente `"/pos"`
