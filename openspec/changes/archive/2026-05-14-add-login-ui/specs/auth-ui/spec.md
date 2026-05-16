## ADDED Requirements

### Requirement: Página de login accesible sin autenticación
La ruta `/auth/login` SHALL ser pública y accesible sin access token. El `AuthMiddlewareAdapter` MUST incluir `/auth/login` en su lista `exactPublicPaths`.

#### Scenario: Usuario no autenticado accede a /auth/login
- **WHEN** un usuario sin token válido navega a `/auth/login`
- **THEN** el sistema muestra la página de inicio de sesión sin redirigir

#### Scenario: Usuario autenticado accede a /auth/login
- **WHEN** un usuario con cookie `refreshToken` válida navega a `/auth/login`
- **THEN** el Server Component lee la cookie con `cookies()` de `next/headers` y llama `redirect("/")` antes de renderizar el formulario

### Requirement: Página de registro accesible sin autenticación
La ruta `/auth/register` SHALL ser pública y accesible sin access token. El `AuthMiddlewareAdapter` MUST incluir `/auth/register` en su lista `exactPublicPaths`.

#### Scenario: Usuario no autenticado accede a /auth/register
- **WHEN** un usuario sin token válido navega a `/auth/register`
- **THEN** el sistema muestra la página de registro sin redirigir

#### Scenario: Usuario autenticado accede a /auth/register
- **WHEN** un usuario con cookie `refreshToken` válida navega a `/auth/register`
- **THEN** el sistema redirige a `/` server-side antes de renderizar

### Requirement: Layout split-panel compartido entre login y registro
Ambas páginas SHALL usar el mismo `app/(public)/auth/layout.tsx` — panel izquierdo con ilustración SVG agrícola y textos de bienvenida, panel derecho con el slot `children` para el formulario. El layout SHALL ser un Server Component.

#### Scenario: Vista en pantalla ancha (≥1024px)
- **WHEN** el usuario visualiza `/auth/login` o `/auth/register` en pantalla ≥1024px
- **THEN** el layout muestra dos columnas de 50% cada una (ilustración izquierda, formulario derecha)

#### Scenario: Vista en pantalla pequeña (<1024px)
- **WHEN** el usuario visualiza `/auth/login` o `/auth/register` en pantalla <1024px
- **THEN** el layout apila los paneles verticalmente (ilustración arriba, formulario abajo)

#### Scenario: Layout es Server Component
- **WHEN** se inspecciona `app/(public)/auth/layout.tsx`
- **THEN** no contiene la directiva `"use client"`

### Requirement: Formulario de inicio de sesión con validación Zod
El `LoginForm` SHALL incluir campos de correo electrónico y contraseña con validación en tiempo real basada en `loginSchema` de Zod.

#### Scenario: Campo email vacío al perder foco
- **WHEN** el usuario abandona el campo email sin escribir nada
- **THEN** se muestra el mensaje "Correo inválido" (Zod rechaza string vacío como email)

#### Scenario: Email con formato inválido
- **WHEN** el usuario escribe un email sin formato válido
- **THEN** se muestra el mensaje "Correo inválido"

#### Scenario: Contraseña menor a 6 caracteres en login
- **WHEN** el usuario escribe una contraseña con menos de 6 caracteres y abandona el campo
- **THEN** se muestra el mensaje "Mínimo 6 caracteres"

#### Scenario: Submit válido del formulario de login
- **WHEN** ambos campos son válidos y el usuario hace clic en "Iniciar Sesión"
- **THEN** el botón se deshabilita, aparece un spinner y se llama a `POST /api/v1/auth/login`

### Requirement: Formulario de registro con validación Zod
El `RegisterForm` SHALL incluir campos de nombre, correo electrónico y contraseña con validación en tiempo real basada en `registerSchema` de Zod.

#### Scenario: Campo nombre vacío al perder foco
- **WHEN** el usuario abandona el campo nombre sin escribir nada
- **THEN** se muestra el mensaje "El nombre es requerido"

#### Scenario: Email inválido en registro
- **WHEN** el usuario escribe un email con formato inválido
- **THEN** se muestra el mensaje "Correo inválido"

#### Scenario: Contraseña menor a 6 caracteres en registro
- **WHEN** el usuario escribe una contraseña con menos de 6 caracteres
- **THEN** se muestra el mensaje "Mínimo 6 caracteres"

#### Scenario: Submit válido del formulario de registro
- **WHEN** todos los campos son válidos y el usuario hace clic en "Crear Cuenta"
- **THEN** el botón se deshabilita, aparece un spinner y se llama a `POST /api/v1/auth/register`

### Requirement: Integración del formulario de login con el endpoint versionado
El service `login` SHALL llamar a `POST /api/v1/auth/login` con `{ email, password }` y manejar la respuesta vía `useLoginForm`.

#### Scenario: Login exitoso
- **WHEN** el endpoint devuelve 200 con `{ accessToken, user }`
- **THEN** el hook guarda el token en `sessionStorage['accessToken']` y el usuario es redirigido a `/` con `router.replace`

#### Scenario: Credenciales inválidas en login
- **WHEN** el endpoint devuelve 401
- **THEN** el service lanza `InvalidCredentialsError` y el hook muestra "Credenciales inválidas" en el formulario; el botón se rehabilita

#### Scenario: Error de servidor en login
- **WHEN** el endpoint devuelve 5xx o la red falla
- **THEN** el service lanza `NetworkError` y el hook muestra "Error al iniciar sesión. Intenta de nuevo." con el botón rehabilitado

### Requirement: Integración del formulario de registro con el endpoint versionado
El service `register` SHALL llamar a `POST /api/v1/auth/register` con `{ name, email, password }` y manejar la respuesta vía `useRegisterForm`.

#### Scenario: Registro exitoso
- **WHEN** el endpoint devuelve 201 con `{ accessToken, user }`
- **THEN** el token se guarda en `sessionStorage['accessToken']` y el usuario es redirigido a `/`

#### Scenario: Email ya registrado
- **WHEN** el endpoint devuelve 409
- **THEN** el service lanza `EmailAlreadyExistsError` y el hook muestra "Este correo ya está registrado"; el botón se rehabilita

#### Scenario: Error de servidor en registro
- **WHEN** el endpoint devuelve 5xx o la red falla
- **THEN** el service lanza `NetworkError` y el hook muestra "Error al crear la cuenta. Intenta de nuevo."

### Requirement: Navegación entre login y registro
Ambos bloques SHALL incluir un enlace funcional con `next/link` para navegar entre las pantallas de autenticación.

#### Scenario: Ir a registro desde login
- **WHEN** el usuario hace clic en "Regístrate aquí" en `/auth/login`
- **THEN** el usuario navega a `/auth/register` usando `<Link href="/auth/register">`

#### Scenario: Ir a login desde registro
- **WHEN** el usuario hace clic en "Inicia sesión" en `/auth/register`
- **THEN** el usuario navega a `/auth/login` usando `<Link href="/auth/login">`

### Requirement: Lógica de autenticación encapsulada en `_logic/`
La lógica de validación, llamada HTTP, manejo de errores y redirección SHALL vivir en `app/(public)/auth/_logic/hooks/`, `_logic/services/` y `_logic/schemas/`. Los bloques `_blocks/LoginForm.tsx` y `_blocks/RegisterForm.tsx` SHALL ser presentational delgados.

#### Scenario: LoginForm no contiene llamadas a fetch ni accesos a storage
- **WHEN** se inspecciona `app/(public)/auth/_blocks/LoginForm.tsx`
- **THEN** no contiene la cadena `fetch(`, ni `sessionStorage`, ni `useRouter`; consume `useLoginForm()` y delega esa lógica al hook

#### Scenario: RegisterForm no contiene llamadas a fetch ni accesos a storage
- **WHEN** se inspecciona `app/(public)/auth/_blocks/RegisterForm.tsx`
- **THEN** no contiene la cadena `fetch(`, ni `sessionStorage`, ni `useRouter`; consume `useRegisterForm()` y delega esa lógica al hook

#### Scenario: Service traduce errores HTTP
- **WHEN** `POST /api/v1/auth/login` responde 401
- **THEN** `login()` lanza `InvalidCredentialsError`; cuando responde 5xx o falla la red lanza `NetworkError`

#### Scenario: Service register traduce conflicto de email
- **WHEN** `POST /api/v1/auth/register` responde 409
- **THEN** `register()` lanza `EmailAlreadyExistsError`

#### Scenario: Validación vive en schemas Zod
- **WHEN** un hook valida los inputs del formulario
- **THEN** invoca `loginSchema.safeParse(values)` o `registerSchema.safeParse(values)`; las reglas y mensajes están definidos en `_logic/schemas/`, no inline en el hook ni en el bloque

### Requirement: Tests unitarios de los bloques y la lógica de auth
El feature `auth` SHALL incluir snapshot tests para `LoginForm` y `RegisterForm` con hooks mockeados, tests de comportamiento para `useLoginForm` y `useRegisterForm` con `renderHook`, y tests de `login` / `register` services con `fetch` inyectado.

#### Scenario: Snapshot del LoginForm en estado inicial y con error
- **WHEN** se ejecuta `tests/unit/ui/(public)/auth/_blocks/LoginForm.test.tsx`
- **THEN** existen snapshots para el estado inicial y para el estado con `formError = "Credenciales inválidas"`, ambos generados mockeando `useLoginForm` para inyectar estado controlado

#### Scenario: Test de useLoginForm verifica la llamada al service
- **WHEN** un test simula submit con email y password válidos
- **THEN** `login` (mockeado) se llama con `{ email, password }` y, ante éxito, `router.replace("/")` se invoca una vez

#### Scenario: Test de useLoginForm cubre error 401
- **WHEN** `login` lanza `InvalidCredentialsError`
- **THEN** el hook deja `isSubmitting = false` y `formError = "Credenciales inválidas"` sin redirigir

#### Scenario: Test de useRegisterForm cubre conflicto de email
- **WHEN** `register` lanza `EmailAlreadyExistsError`
- **THEN** el hook deja `formError = "Este correo ya está registrado"` sin redirigir

#### Scenario: Test del service cubre los códigos HTTP
- **WHEN** se ejecuta `tests/unit/ui/(public)/auth/_logic/services/login.test.ts`
- **THEN** cubre 200 (devuelve `AuthResponse`), 401 (lanza `InvalidCredentialsError`), 5xx (lanza `NetworkError`); análogamente para `register.test.ts` con 201, 409 y red caída
