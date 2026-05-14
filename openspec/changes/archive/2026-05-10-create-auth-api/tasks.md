## 1. Inicialización del proyecto

- [x] 1.1 Crear proyecto Next.js 14+ con TypeScript usando `create-next-app` (App Router, sin Tailwind por defecto)
- [x] 1.2 Instalar dependencias: `jsonwebtoken`, `bcryptjs`, `zod`, `cookie`, `@prisma/client`
- [x] 1.3 Instalar dependencias de desarrollo: `prisma`, `@types/jsonwebtoken`, `@types/bcryptjs`, `@types/cookie`, `jest`, `@testing-library/react`, `ts-jest`
- [x] 1.4 Configurar variables de entorno en `.env.local` y `.env.example`:
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `DATABASE_URL` → `postgresql://postgres.[ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
  - `DIRECT_URL` → `postgresql://postgres.[ref]:[password]@db.qzzjpyepggwautckqeex.supabase.co:5432/postgres`
- [x] 1.5 Configurar `jest.config.ts` con soporte para TypeScript y path aliases

## 2. Estructura Hexagonal

- [x] 2.1 Crear la estructura de carpetas según el scaffolding de D1:
  - `src/modules/auth/domain/entities/`
  - `src/modules/auth/domain/value-objects/`
  - `src/modules/auth/domain/errors/`
  - `src/modules/auth/application/ports/`
  - `src/modules/auth/application/use-cases/`
  - `src/modules/auth/application/dto/`
  - `src/modules/auth/application/mappers/`
  - `src/modules/auth/infrastructure/repositories/`
  - `src/modules/auth/infrastructure/services/`
  - `src/modules/auth/infrastructure/http/`
  - `src/modules/auth/infrastructure/middleware/`
  - `src/shared/domain/`
- [x] 2.2 Definir `src/shared/domain/Entity.ts`, `ValueObject.ts` y `Result.ts` como base del kernel compartido
- [x] 2.3 Definir la entidad `User` en `src/modules/auth/domain/entities/User.ts` (id, email, passwordHash, createdAt, updatedAt)
- [x] 2.4 Definir value objects `Email.ts` y `Password.ts` en `src/modules/auth/domain/value-objects/`
- [x] 2.5 Definir errores de dominio `InvalidCredentialsError.ts` y `UserNotFoundError.ts` en `src/modules/auth/domain/errors/`
- [x] 2.6 Definir los puertos en `src/modules/auth/application/ports/`:
  - `UserRepository.ts` (findByEmail, save, findById)
  - `TokenService.ts` (generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken)
  - `PasswordHasher.ts` (hash, compare)
- [x] 2.7 Definir DTOs en `src/modules/auth/application/dto/`: `LoginRequest.ts`, `RegisterRequest.ts`, `AuthResponse.ts`
- [x] 2.8 Definir `UserMapper.ts` en `src/modules/auth/application/mappers/`

## 3. Prisma y Supabase

- [x] 3.1 Inicializar Prisma: `npx prisma init` genera `prisma/schema.prisma` y `.env`
- [x] 3.2 Configurar `prisma/schema.prisma` con `datasource db { url = env("DATABASE_URL"), directUrl = env("DIRECT_URL") }` y el modelo `User` (ver D5)
- [x] 3.3 Crear singleton `src/shared/infrastructure/prisma/client.ts` que exporta una instancia única de `PrismaClient`
- [x] 3.4 Ejecutar `npx prisma migrate dev --name create_users` para generar la primera migración en `prisma/migrations/20260508000001_create_users/migration.sql`
- [x] 3.5 Verificar que la tabla `public.users` existe en Supabase con `npx prisma studio` o consultando el dashboard de Supabase
- [x] 3.6 Ejecutar `npx prisma generate` para generar los tipos TypeScript de Prisma Client

## 4. Infraestructura — Adaptadores

- [x] 4.1 Implementar `InMemoryUserRepository` en `src/modules/auth/infrastructure/repositories/InMemoryUserRepository.ts`
- [x] 4.2 Implementar `UserPrismaRepository` en `src/modules/auth/infrastructure/repositories/UserPrismaRepository.ts` (implementa `UserRepository`, captura error Prisma `P2002` → `EmailAlreadyInUseError`)
- [x] 4.3 Implementar `JwtTokenService` en `src/modules/auth/infrastructure/services/JwtTokenService.ts` (HS256, TTL 15 min access / 7 días refresh)
- [x] 4.4 Implementar `BcryptPasswordHasher` en `src/modules/auth/infrastructure/services/BcryptPasswordHasher.ts`
- [x] 4.5 Implementar `AuthController` en `src/modules/auth/infrastructure/http/AuthController.ts` (recibe use cases por DI, expone métodos por endpoint)
- [x] 4.6 Crear helper de configuración de cookie HttpOnly/SameSite reutilizable

## 5. Casos de uso (Application Layer)

- [x] 5.1 Implementar `RegisterUseCase` en `src/modules/auth/application/use-cases/RegisterUseCase.ts` (valida unicidad de email, hashea password, persiste usuario)
- [x] 5.2 Implementar `LoginUseCase` en `src/modules/auth/application/use-cases/LoginUseCase.ts` (verifica credenciales, emite access + refresh token)
- [x] 5.3 Implementar `RefreshTokenUseCase` en `src/modules/auth/application/use-cases/RefreshTokenUseCase.ts` (verifica refresh token, emite nuevo access token)
- [x] 5.4 Implementar `LogoutUseCase` en `src/modules/auth/application/use-cases/LogoutUseCase.ts` (limpia la cookie del refresh token)

## 6. Adaptadores HTTP (Route Handlers)

- [x] 6.1 Crear `app/api/auth/register/route.ts` con validación Zod y delegación a `AuthController`
- [x] 6.2 Crear `app/api/auth/login/route.ts` con validación Zod, delegación a `AuthController` y set de cookie HttpOnly
- [x] 6.3 Crear `app/api/auth/refresh/route.ts` con lectura de cookie y delegación a `AuthController`
- [x] 6.4 Crear `app/api/auth/logout/route.ts` con delegación a `AuthController` y clear de cookie (Max-Age=0)
- [x] 6.5 Los route handlers instancian `UserPrismaRepository` + `JwtTokenService` + `BcryptPasswordHasher` y los inyectan en el use case correspondiente

## 7. Middleware de Next.js

- [x] 7.1 Crear `middleware.ts` en raíz y `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts` con la lógica de verificación
- [x] 7.2 Configurar lista de rutas públicas (`/api/auth/**`, `/_next/**`, `/favicon.ico`, `/login`) en `AuthMiddlewareAdapter`
- [x] 7.3 Redirigir a `/login` para rutas de página sin token válido (HTTP 302)
- [x] 7.4 Retornar JSON 401 para rutas `/api/protected/**` sin token válido
- [x] 7.5 Propagar `x-user-id` y `x-user-email` como headers en requests autenticadas

## 8. Tests Unitarios

- [x] 8.1 Escribir tests para `User` entity y value objects `Email`, `Password` en `tests/unit/modules/auth/domain/`
- [x] 8.2 Escribir tests para `RegisterUseCase`: registro exitoso, email duplicado, validación de password (usa `InMemoryUserRepository`)
- [x] 8.3 Escribir tests para `LoginUseCase`: login exitoso, password incorrecto, usuario no existente
- [x] 8.4 Escribir tests para `RefreshTokenUseCase`: refresh exitoso, token expirado, token inválido
- [x] 8.5 Escribir tests para `JwtTokenService`: generación de claims correctos, verificación válida, verificación de token expirado
- [x] 8.6 Escribir tests para `InMemoryUserRepository`: save, findByEmail, findById
- [x] 8.7 Escribir tests para `UserMapper`: mapeo Prisma model → domain entity y viceversa

## 9. Tests de Integración

- [x] 9.1 Escribir `tests/integration/modules/auth/auth-flow.test.ts` que ejercita el flujo completo register → login → refresh → logout usando `UserPrismaRepository` contra una DB de test (o en memoria con `@prisma/client` mock)
  > Pendiente: requiere credenciales Supabase o setup de DB de test

## 10. Validación Final

- [x] 10.1 Ejecutar `npx prisma migrate deploy` contra Supabase y confirmar que `public.users` existe con columnas e índice correctos
- [x] 10.2 Ejecutar `npm run build` y verificar que no hay errores de TypeScript
- [x] 10.3 Ejecutar `npm test` y verificar que todos los tests pasan (34/34)
- [x] 10.4 Probar manualmente el flujo completo: register → login → refresh → logout con `curl` o REST client
- [x] 10.5 Verificar que una ruta protegida devuelve 401 sin token y 200 con token válido
- [x] 10.6 Confirmar en Supabase dashboard que el registro de usuario creó una fila en `public.users`
