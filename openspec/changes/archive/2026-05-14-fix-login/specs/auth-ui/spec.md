## MODIFIED Requirements

### Requirement: Formulario de inicio de sesión con validación Zod
El `LoginForm` SHALL incluir campos de correo electrónico y contraseña con validación en tiempo real basada en `loginSchema` de Zod.

#### Scenario: Campo email vacío al perder foco
- **WHEN** el usuario abandona el campo email sin escribir nada
- **THEN** se muestra el mensaje "Correo inválido" (Zod rechaza string vacío como email)

#### Scenario: Email con formato inválido
- **WHEN** el usuario escribe un email sin formato válido
- **THEN** se muestra el mensaje "Correo inválido"

#### Scenario: Contraseña menor a 8 caracteres en login
- **WHEN** el usuario escribe una contraseña con menos de 8 caracteres y abandona el campo
- **THEN** se muestra el mensaje "Mínimo 8 caracteres"

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

#### Scenario: Contraseña menor a 8 caracteres en registro
- **WHEN** el usuario escribe una contraseña con menos de 8 caracteres
- **THEN** se muestra el mensaje "Mínimo 8 caracteres"

#### Scenario: Submit válido del formulario de registro
- **WHEN** todos los campos son válidos y el usuario hace clic en "Crear Cuenta"
- **THEN** el botón se deshabilita, aparece un spinner y se llama a `POST /api/v1/auth/register`

### Requirement: Integración del formulario de registro con el endpoint versionado
El service `register` SHALL llamar a `POST /api/v1/auth/register` con `{ name, email, password }` y manejar la respuesta vía `useRegisterForm`. El endpoint SHALL devolver `{ accessToken, user: { id, name, email } }` y el hook SHALL almacenar el `accessToken` en `sessionStorage`.

#### Scenario: Registro exitoso
- **WHEN** el endpoint devuelve 201 con `{ accessToken, user: { id, name, email } }`
- **THEN** el token se guarda en `sessionStorage['accessToken']` y el usuario es redirigido a `/`

#### Scenario: Email ya registrado
- **WHEN** el endpoint devuelve 409
- **THEN** el service lanza `EmailAlreadyExistsError` y el hook muestra "Este correo ya está registrado"; el botón se rehabilita

#### Scenario: Error de servidor en registro
- **WHEN** el endpoint devuelve 5xx o la red falla
- **THEN** el service lanza `NetworkError` y el hook muestra "Error al crear la cuenta. Intenta de nuevo."
