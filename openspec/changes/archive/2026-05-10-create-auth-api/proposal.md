## Why

Se necesita una base de proyecto sólida y extensible que provea autenticación y autorización via JWT sobre Next.js, siguiendo Arquitectura Hexagonal para que los demás módulos puedan integrarse sin acoplarse a la infraestructura. Establecerla ahora garantiza un punto de partida limpio antes de añadir funcionalidades de negocio.

## What Changes

- Inicialización del proyecto Next.js (versión estable) con TypeScript configurado desde cero.
- Implementación de endpoints BFF para login y registro de usuarios.
- Generación, firma y validación de tokens JWT (access token + refresh token).
- Middleware de Next.js para proteger rutas autenticadas.
- Estructura de carpetas siguiendo Arquitectura Hexagonal (domain / application / infrastructure / adapters).
- Suite de tests unitarios para la capa de dominio y de aplicación.
- Capa de persistencia desacoplada mediante puertos con implementación concreta `UserPrismaRepository` conectada a Supabase.
- Gestión de migraciones de base de datos con Prisma Migrate (primera migración: tabla `public.users`).

## Capabilities

### New Capabilities

- `user-auth`: Registro, login y logout de usuarios con emisión y revocación de tokens JWT.
- `token-management`: Generación, verificación y renovación de access tokens y refresh tokens.
- `auth-middleware`: Middleware de Next.js que valida el JWT en cabeceras/cookies y protege rutas.
- `database-persistence`: Persistencia real en Supabase Postgres vía Prisma con gestión de migraciones.

### Modified Capabilities

## Impact

- **Proyecto nuevo**: no hay código existente afectado.
- **APIs expuestas**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`.
- **Dependencias introducidas**: `next`, `react`, `typescript`, `jsonwebtoken`, `bcryptjs`, `zod`, `@prisma/client`, `jest`, `@testing-library/react`.
- **Dev dependencies**: `prisma`, `@types/jsonwebtoken`, `@types/bcryptjs`, `ts-jest`.
- **Base de datos**: Supabase Postgres (proyecto `agrisas`) accedido vía Prisma ORM. La tabla `public.users` se crea mediante la primera migración gestionada con `prisma migrate`.
