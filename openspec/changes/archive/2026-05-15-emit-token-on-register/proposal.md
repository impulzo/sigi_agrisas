## Why

Cuando un usuario se registra, el backend devuelve `{ user }` pero no emite tokens JWT. El frontend espera `{ accessToken, user }` y el flujo queda roto: el usuario llega al dashboard sin sesión activa y debe hacer login manualmente. Este gap fue documentado como DT1 en el reporte de `fix-login`.

## What Changes

- `RegisterUseCase` acepta un nuevo puerto `TokenService` y emite `accessToken` + `refreshToken` tras crear el usuario, igual que `LoginUseCase`.
- `AuthController.register()` establece la cookie `refreshToken` (HttpOnly, SameSite=Strict) y devuelve `{ accessToken, user }` en la respuesta 201.
- El container DI inyecta `TokenService` en `RegisterUseCase`.
- La respuesta de `POST /api/v1/auth/register` pasa de `{ user }` a `{ accessToken, user }`.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `user-auth`: El escenario de registro exitoso ahora devuelve `{ accessToken, user }` (tokens emitidos) en lugar de solo `{ user }`.
- `auth-ui`: El servicio `register.ts` ya espera `{ accessToken, user }` — el backend ahora lo cumple; el test de `register.test.ts` podrá usar una respuesta real en vez de un workaround.

## Impact

- **Backend**: `RegisterUseCase.ts`, `AuthController.ts`, `src/modules/auth/infrastructure/di/container.ts`
- **Tests backend**: `RegisterUseCase.test.ts` (añadir fixtures de tokens), `UserMapper` no se toca
- **Tests UI**: `register.test.ts` y `useRegisterForm.test.ts` ya cubren `accessToken` en el mock — revisar que la respuesta mockeada sea coherente
- **Sin breaking changes de API para el cliente**: el frontend ya maneja `accessToken` en la respuesta de registro
