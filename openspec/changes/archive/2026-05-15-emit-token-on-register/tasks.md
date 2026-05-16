## 1. Aplicación — DTO y Use Case

- [x] 1.1 Eliminar `RegisterResponse` de `src/modules/auth/application/dto/AuthResponse.ts` (pasa a usar `AuthResponse`)
- [x] 1.2 Actualizar `RegisterUseCase` en `src/modules/auth/application/use-cases/RegisterUseCase.ts`: añadir `tokenService: TokenService` como tercer parámetro del constructor
- [x] 1.3 Actualizar `RegisterUseCase.execute()` para generar `accessToken` y `refreshToken` usando `tokenService.generateAccessToken` y `tokenService.generateRefreshToken`, igual que `LoginUseCase`
- [x] 1.4 Cambiar el tipo de retorno de `RegisterUseCase.execute()` de `Promise<RegisterResponse>` a `Promise<AuthResponse>`
- [x] 1.5 Devolver `{ accessToken, refreshToken, user: { id, name, email } }` al final de `execute()`

## 2. Infraestructura — Controller y DI Container

- [x] 2.1 Actualizar `AuthController.register()` en `src/modules/auth/infrastructure/http/AuthController.ts`: extraer `refreshToken` del resultado y establecer la cookie HttpOnly con `serialize(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions)` igual que `login()`
- [x] 2.2 Devolver `{ accessToken, user }` (sin `refreshToken`) en el body de la respuesta 201
- [x] 2.3 Actualizar `container.ts` en `src/modules/auth/infrastructure/di/container.ts`: pasar `tokenService` como tercer argumento al constructor de `RegisterUseCase`

## 3. Tests — Backend

- [x] 3.1 Actualizar `tests/unit/modules/auth/application/use-cases/RegisterUseCase.test.ts`: añadir mock de `TokenService` que devuelva `{ accessToken: "access-tok", refreshToken: "refresh-tok" }`
- [x] 3.2 Pasar el mock de `TokenService` al constructor de `RegisterUseCase` en los tests
- [x] 3.3 Añadir assertions: verificar que el resultado incluye `accessToken` y `refreshToken` con los valores del mock
- [x] 3.4 Ejecutar `npm test` (entorno `node`) y confirmar que todos los tests de backend pasan

## 4. Verificación end-to-end

- [x] 4.1 Arrancar el servidor de desarrollo (`npm run dev`) y registrar un usuario nuevo; verificar que la respuesta 201 incluye `accessToken` y la cookie `refreshToken` está en `Set-Cookie`
- [x] 4.2 Ejecutar `npm run build` y confirmar que no hay errores de TypeScript
