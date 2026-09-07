## MODIFIED Requirements

### Requirement: El panel carga después de iniciar sesión o registrarse
Tras un submit exitoso de login, registro o **establecimiento/restablecimiento de contraseña**, el usuario SHALL aterrizar directamente en `/pos`. Los hooks `useLoginForm`, `useRegisterForm`, `useSetPasswordForm` y `useAuthRedirect` (rebote de usuarios ya autenticados en `/auth/*`) SHALL invocar `router.replace("/pos")` con la ruta hardcodeada, evitando saltos intermedios y open-redirects derivados de query params. La raíz del proyecto `app/page.tsx` SHALL redirigir a `/pos` (en vez de `/dashboard`) cuando el usuario tiene una cookie `refreshToken` válida.

#### Scenario: Login exitoso aterriza en /pos
- **WHEN** un usuario envía credenciales válidas desde `/auth/login`
- **THEN** `useLoginForm` invoca `router.replace("/pos")` después de persistir el access token en `sessionStorage`

#### Scenario: Registro exitoso aterriza en /pos
- **WHEN** un usuario envía un registro válido desde `/auth/register`
- **THEN** `useRegisterForm` invoca `router.replace("/pos")` tras la respuesta 201 del backend

#### Scenario: Establecer contraseña con token válido aterriza en /pos
- **WHEN** un usuario envía token y contraseña válidos desde `/auth/set-password`
- **THEN** `useSetPasswordForm` invoca `router.replace("/pos")` (no `/dashboard`) después de persistir el access token en `sessionStorage`

#### Scenario: Establecer contraseña como rol admin aterriza en /pos
- **WHEN** un usuario con rol `admin` completa `/auth/set-password` con un token válido
- **THEN** aterriza en `/pos`, no en `/dashboard`, aunque su rol tenga acceso a ambas rutas

#### Scenario: Establecer contraseña con rol sin permisos de POS
- **WHEN** un usuario con rol `viewer` (sin `sales:create` ni `quotes:create`) completa `/auth/set-password` con un token válido
- **THEN** `useSetPasswordForm` invoca igualmente `router.replace("/pos")`; la pantalla de "Sin acceso" que `/pos` muestre a continuación es responsabilidad del guard de permisos de esa ruta, no de este redirect

#### Scenario: Token expirado o inválido no redirige
- **WHEN** un usuario envía el formulario de `/auth/set-password` con un token expirado o inválido
- **THEN** el usuario permanece en la página con un mensaje de error; no se invoca ningún `router.replace`

#### Scenario: Usuario ya autenticado que cae en /auth/*
- **WHEN** un usuario con sesión activa navega a `/auth/login` o `/auth/register`
- **THEN** `useAuthRedirect` invoca `router.replace("/pos")` durante el primer render

#### Scenario: Root redirige a /pos para autenticados
- **WHEN** un usuario autenticado navega a `/`
- **THEN** `app/page.tsx` invoca `redirect("/pos")` (en lugar de `/dashboard`)

#### Scenario: Sin salto intermedio por root
- **WHEN** se inspeccionan los hooks de auth y `app/page.tsx`
- **THEN** ningún hook ni página llama `router.replace("/dashboard")` ni `router.push("/dashboard")` como destino post-éxito; el destino es literalmente `"/pos"`
