## MODIFIED Requirements

### Requirement: Servicio de registro y flujo post-registro
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
