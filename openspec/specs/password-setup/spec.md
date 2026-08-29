# password-setup Specification

## Purpose
Define la emisión, expiración y consumo de tokens de un solo uso que permiten a un usuario establecer o restablecer su propia contraseña a partir de un enlace enviado por correo, sin que el administrador la conozca en ningún momento.
## Requirements
### Requirement: Issue password setup token
El sistema SHALL emitir un token de establecimiento de contraseña para un usuario dado, compuesto por un valor aleatorio de alta entropía (el "token crudo", entregado únicamente dentro del enlace del correo) y su hash (el único valor persistido). El token SHALL expirar 24 horas después de su emisión y SHALL ser de un solo uso. Al emitir un nuevo token para un usuario, el sistema SHALL invalidar cualquier token previo no consumido de ese mismo usuario, de modo que solo el enlace más reciente funcione.

#### Scenario: Emitir token invalida los anteriores
- **WHEN** se emite un nuevo token de establecimiento de contraseña para un usuario que ya tenía un token previo sin consumir
- **THEN** el token previo deja de ser válido y solo el token recién emitido puede usarse para completar el establecimiento de contraseña

#### Scenario: Token crudo nunca se persiste
- **WHEN** se emite un token
- **THEN** la base de datos solo almacena el hash del token, nunca el valor crudo

---

### Requirement: Complete password setup
El sistema SHALL exponer `POST /api/v1/auth/set-password` como endpoint público (sin requerir un access token previo) que recibe `{ token: string, password: string }`. Si el token es válido, no ha expirado y no ha sido consumido, el sistema SHALL validar que `password` tenga al menos 8 caracteres, hashearla, persistirla como la contraseña del usuario asociado al token, marcar el token como consumido, e iniciar sesión automáticamente emitiendo un access token y un refresh token (misma respuesta y cookie que el login exitoso). Los mensajes de error por token inválido o expirado NO SHALL revelar si el email asociado existe en el sistema.

#### Scenario: Establecimiento exitoso con auto-login
- **WHEN** se envía `POST /api/v1/auth/set-password` con un token válido, no expirado y no consumido, junto con `{ "password": "unaClaveSegura123" }`
- **THEN** el sistema hashea y persiste la contraseña, marca el token como consumido, y responde HTTP 200 con un access token en el cuerpo y una cookie `refreshToken` HttpOnly, igual que un login exitoso

#### Scenario: Token inexistente o ya consumido
- **WHEN** se envía `POST /api/v1/auth/set-password` con un token que no existe en el sistema o que ya fue usado previamente
- **THEN** el sistema responde HTTP 400 con un error genérico de token inválido, sin indicar si el usuario o el email existen, y no modifica ninguna contraseña

#### Scenario: Token expirado
- **WHEN** se envía `POST /api/v1/auth/set-password` con un token cuya expiración (24 horas desde emisión) ya pasó
- **THEN** el sistema responde HTTP 400 con un error distinguible de "token expirado" (para que la UI pueda ofrecer solicitar un reenvío) y no modifica ninguna contraseña

#### Scenario: Contraseña más corta que el mínimo
- **WHEN** se envía `POST /api/v1/auth/set-password` con un token válido pero `{ "password": "corta" }` (menos de 8 caracteres)
- **THEN** el sistema responde HTTP 400 con un error de validación y el token permanece sin consumir

