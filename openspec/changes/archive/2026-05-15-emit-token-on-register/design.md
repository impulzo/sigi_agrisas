## Context

Estado actual:
- `RegisterUseCase` recibe `(userRepo, hasher)` y devuelve `RegisterResponse { user }` sin tokens.
- `LoginUseCase` recibe `(userRepo, hasher, tokenService)` y devuelve `AuthResponse { accessToken, refreshToken, user }`.
- `AuthController.register()` devuelve el resultado del use case directamente con `NextResponse.json(result, { status: 201 })` — no establece ninguna cookie.
- `AuthController.login()` extrae `refreshToken` del resultado, lo serializa como cookie HttpOnly y devuelve `{ accessToken, user }`.
- El DI container (`container.ts`) instancia `RegisterUseCase` sin `tokenService`.
- El frontend `useRegisterForm` ya desestructura `accessToken` de la respuesta y lo guarda en `sessionStorage` — si recibe `undefined` no falla explícitamente, pero el usuario llega al dashboard sin sesión válida.

## Goals / Non-Goals

**Goals:**
- `RegisterUseCase` emite `accessToken` + `refreshToken` inmediatamente después de crear el usuario, igual que `LoginUseCase`.
- `AuthController.register()` establece la cookie `refreshToken` (misma configuración que login) y devuelve `{ accessToken, user: { id, name, email } }`.
- El DI container inyecta `tokenService` en `RegisterUseCase`.
- Todos los tests afectados quedan verdes.

**Non-Goals:**
- Cambiar la estrategia de JWT (algoritmo, TTL, secrets).
- Añadir confirmación de email antes de emitir tokens.
- Cambiar el comportamiento de `LoginUseCase` o cualquier otro use case.

## Decisions

**1. `RegisterUseCase` acepta `TokenService` como tercer parámetro del constructor**

El mismo patrón que `LoginUseCase`: `constructor(userRepo, hasher, tokenService)`. No se crea un use case nuevo ni se compone — la generación de tokens es parte de la misma transacción de aplicación (crear usuario → emitir sesión).

Alternativa descartada: Separar en dos use cases (`RegisterUseCase` + `IssueTokensUseCase`) — añade complejidad sin beneficio para el scope actual.

**2. `RegisterUseCase.execute()` devuelve `AuthResponse` en lugar de `RegisterResponse`**

`AuthResponse { accessToken, refreshToken, user }` ya existe en `src/modules/auth/application/dto/AuthResponse.ts`. Al usarlo, el tipo de retorno es idéntico al de `LoginUseCase`, lo que simplifica el controller.

El tipo `RegisterResponse` queda obsoleto y puede eliminarse del DTO, o dejarse como alias vacío para no romper imports — se elimina por limpieza, ya que ningún test lo importa directamente.

**3. `AuthController.register()` sigue el mismo patrón que `login()`**

```
const { refreshToken, ...publicResult } = await this.registerUseCase.execute(parsed.data);
response.headers.set("Set-Cookie", serialize(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions));
return NextResponse.json(publicResult, { status: 201 });
```

`publicResult` contendrá `{ accessToken, user }` — exactamente lo que el frontend ya espera.

**4. El payload JWT incluye `name` si está disponible**

El payload actual es `{ sub: user.id, email: user.email }`. En el register siempre hay `name` (campo requerido desde `fix-login`). No se añade `name` al payload JWT — los tokens son los mismos que en login para mantener coherencia. El frontend obtiene `name` del campo `user` en el body.

## Risks / Trade-offs

- **[Tests de `RegisterUseCase` deben mockear `TokenService`]** → Los tests actuales usan `InMemoryUserRepository` y no tienen `tokenService`. Habrá que añadir un mock simple o reutilizar el `MockTokenService` si existe. Cambio contenido — solo afecta el test de `RegisterUseCase`.
- **[`RegisterResponse` queda sin uso]** → Se elimina del DTO para evitar confusión. Bajo riesgo — no es parte de ninguna interfaz pública exportada fuera del módulo.
