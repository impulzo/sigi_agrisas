## Why

El change `add-login-ui` dejó dos inconsistencias entre frontend y backend que generan comportamiento silenciosamente incorrecto: el campo `name` del formulario de registro se envía al servidor pero nunca se persiste (pérdida de dato sin error visible), y la validación de longitud mínima de contraseña es más laxa en el cliente (6 caracteres) que en el servidor (8 caracteres), lo que permite que usuarios lleguen al backend con un input que será rechazado sin que el formulario muestre un mensaje claro.

## What Changes

- **Agregar columna `name` al modelo `User` de Prisma** — migración de base de datos; campo `String`, nullable por compatibilidad con usuarios existentes.
- **Actualizar la entidad `User` del dominio** — añadir propiedad `name?: string` en `UserProps` y en el constructor.
- **Actualizar `RegisterRequest` DTO** — incluir campo `name: string`.
- **Actualizar `RegisterUseCase`** — propagar `name` al crear la entidad `User`.
- **Actualizar `UserPrismaRepository`** — incluir `name` en el `upsert` de Prisma.
- **Actualizar `AuthController`** — añadir `name: z.string().min(1)` al schema Zod de registro; incluir `name` en la respuesta serializada del usuario.
- **Actualizar `UserMapper`** — mapear la columna `name` de Prisma a la entidad y viceversa.
- **Alinear validación de contraseña** — cambiar `z.string().min(6)` a `z.string().min(8, "Mínimo 8 caracteres")` en `login.schema.ts` y `register.schema.ts`.
- **Actualizar tests** — `RegisterUseCase.test.ts`, `InMemoryUserRepository`, snapshots de `RegisterForm` y `LoginForm`, tests de `useRegisterForm`, tests del servicio `register`.

## Capabilities

### New Capabilities

_(ninguna — no se introduce ninguna capacidad nueva)_

### Modified Capabilities

- `user-auth`: El registro ahora requiere y persiste `name`. La entidad `User`, el DTO `RegisterRequest`, el use case y el repositorio cambian para soportar el campo.
- `auth-ui`: Los schemas Zod del cliente alinean la contraseña mínima a 8 caracteres. El tipo `AuthResponse` ya incluía `user.name`; ahora el backend lo devuelve con valor real.

## Impact

| Área | Archivos afectados |
|---|---|
| Base de datos | `prisma/schema.prisma` + nueva migración |
| Dominio | `src/modules/auth/domain/entities/User.ts` |
| Aplicación | `src/modules/auth/application/dto/RegisterRequest.ts`, `RegisterUseCase.ts`, `src/modules/auth/application/mappers/UserMapper.ts` |
| Infraestructura backend | `src/modules/auth/infrastructure/repositories/UserPrismaRepository.ts`, `AuthController.ts` |
| Frontend — schemas | `app/(public)/auth/_logic/schemas/login.schema.ts`, `register.schema.ts` |
| Tests | `tests/unit/modules/auth/application/use-cases/RegisterUseCase.test.ts`, `tests/unit/modules/auth/infrastructure/repositories/InMemoryUserRepository.test.ts`, tests de UI de `RegisterForm`, `useRegisterForm`, `register.test.ts` |
