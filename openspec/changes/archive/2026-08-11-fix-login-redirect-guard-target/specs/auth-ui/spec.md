## MODIFIED Requirements

### Requirement: Página de login accesible sin autenticación
La ruta `/auth/login` SHALL ser pública y accesible sin access token. El `AuthMiddlewareAdapter` MUST incluir `/auth/login` en su lista `exactPublicPaths`.

#### Scenario: Usuario no autenticado accede a /auth/login
- **WHEN** un usuario sin token válido navega a `/auth/login`
- **THEN** el sistema muestra la página de inicio de sesión sin redirigir

#### Scenario: Usuario autenticado accede a /auth/login
- **WHEN** un usuario con cookie `refreshToken` válida navega a `/auth/login`
- **THEN** el Server Component lee la cookie con `cookies()` de `next/headers` y llama `redirect("/pos")` antes de renderizar el formulario

### Requirement: Página de registro accesible sin autenticación
La ruta `/auth/register` SHALL ser pública y accesible sin access token. El `AuthMiddlewareAdapter` MUST incluir `/auth/register` en su lista `exactPublicPaths`.

#### Scenario: Usuario no autenticado accede a /auth/register
- **WHEN** un usuario sin token válido navega a `/auth/register`
- **THEN** el sistema muestra la página de registro sin redirigir

#### Scenario: Usuario autenticado accede a /auth/register
- **WHEN** un usuario con cookie `refreshToken` válida navega a `/auth/register`
- **THEN** el sistema redirige a `/pos` server-side antes de renderizar
