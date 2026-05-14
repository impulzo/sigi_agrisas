## Context

Proyecto Next.js nuevo sin código previo. El objetivo es establecer la base de autenticación que todos los demás módulos del panel agrisas usarán. Se aplica Arquitectura Hexagonal para aislar el dominio de la infraestructura y facilitar el reemplazo de la capa de persistencia (actualmente en memoria, luego Supabase).

**Stack confirmado**: Next.js 14+ (App Router), TypeScript, JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`), Zod (validación), Prisma ORM 5, Supabase Postgres (`agrisas` — `db.qzzjpyepggwautckqeex.supabase.co`), Jest + Testing Library (tests).

## Goals / Non-Goals

**Goals:**
- Proveer endpoints BFF de registro, login, refresh y logout.
- Emitir access tokens (15 min) y refresh tokens (7 días) firmados con HS256.
- Middleware de Next.js que intercepta rutas protegidas y valida el JWT.
- Arquitectura Hexagonal con puertos explícitos para el repositorio de usuarios.
- `UserPrismaRepository` conectado a Supabase Postgres como persistencia real.
- Primera migración: tabla `public.users` gestionada con `prisma migrate`.
- Cobertura de tests unitarios en dominio y capa de aplicación.

**Non-Goals:**
- Supabase Auth SDK (se usa Supabase solo como Postgres; la auth es custom JWT).
- OAuth / Social login.
- UI de login (solo la API/BFF).
- Rate limiting o brute-force protection (fase siguiente).

## Decisions

### D1 — Arquitectura Hexagonal en Next.js App Router

**Decisión**: Módulos verticales en `src/modules/` con capas `domain/`, `application/` e `infrastructure/` por módulo. El App Router de Next.js vive en `app/` separado del hexágono.

```
📦 project-root/
│
├── 📁 src/
│   ├── 📁 modules/
│   │   └── 📁 auth/
│   │       ├── 📁 domain/
│   │       │   ├── 📁 entities/
│   │       │   │   └── User.ts
│   │       │   ├── 📁 value-objects/
│   │       │   │   ├── Email.ts
│   │       │   │   └── Password.ts
│   │       │   └── 📁 errors/
│   │       │       ├── InvalidCredentialsError.ts
│   │       │       └── UserNotFoundError.ts
│   │       ├── 📁 application/
│   │       │   ├── 📁 ports/
│   │       │   │   ├── UserRepository.ts
│   │       │   │   ├── TokenService.ts
│   │       │   │   └── PasswordHasher.ts
│   │       │   ├── 📁 use-cases/
│   │       │   │   ├── LoginUseCase.ts
│   │       │   │   ├── RegisterUseCase.ts
│   │       │   │   ├── RefreshTokenUseCase.ts
│   │       │   │   └── LogoutUseCase.ts
│   │       │   ├── 📁 dto/
│   │       │   │   ├── LoginRequest.ts
│   │       │   │   ├── RegisterRequest.ts
│   │       │   │   └── AuthResponse.ts
│   │       │   └── 📁 mappers/
│   │       │       └── UserMapper.ts
│   │       └── 📁 infrastructure/
│   │           ├── 📁 repositories/
│   │           │   ├── InMemoryUserRepository.ts
│   │           │   └── UserPrismaRepository.ts
│   │           ├── 📁 services/
│   │           │   ├── JwtTokenService.ts
│   │           │   └── BcryptPasswordHasher.ts
│   │           ├── 📁 http/
│   │           │   └── AuthController.ts
│   │           └── 📁 middleware/
│   │               └── AuthMiddlewareAdapter.ts
│   │
│   └── 📁 shared/
│       └── 📁 domain/
│           ├── Entity.ts
│           ├── ValueObject.ts
│           └── Result.ts
│
├── 📁 app/                            # Next.js App Router — NO forma parte del hexágono
│   ├── 📁 api/
│   │   └── 📁 auth/
│   │       ├── 📁 login/
│   │       │   └── route.ts           # Delega a AuthController
│   │       ├── 📁 register/
│   │       │   └── route.ts
│   │       ├── 📁 refresh/
│   │       │   └── route.ts
│   │       └── 📁 logout/
│   │           └── route.ts
│   └── 📁 (routes)/
│
├── 📁 prisma/
│   ├── schema.prisma
│   └── 📁 migrations/
│       └── 📁 20260508000001_create_users/
│           └── migration.sql
│
├── 📁 tests/
│   ├── 📁 unit/
│   │   └── 📁 modules/
│   │       └── 📁 auth/
│   │           ├── 📁 domain/
│   │           │   ├── entities/
│   │           │   │   └── User.test.ts
│   │           │   └── value-objects/
│   │           │       ├── Email.test.ts
│   │           │       └── Password.test.ts
│   │           ├── 📁 application/
│   │           │   ├── use-cases/
│   │           │   │   ├── LoginUseCase.test.ts
│   │           │   │   └── RegisterUseCase.test.ts
│   │           │   └── mappers/
│   │           │       └── UserMapper.test.ts
│   │           └── 📁 infrastructure/
│   │               ├── repositories/
│   │               │   └── InMemoryUserRepository.test.ts
│   │               └── services/
│   │                   └── JwtTokenService.test.ts
│   ├── 📁 integration/
│   │   └── 📁 modules/
│   │       └── 📁 auth/
│   │           └── auth-flow.test.ts
│   └── 📁 e2e/
│       └── login.spec.ts
│
├── middleware.ts                      # Entry point Next.js — delega a AuthMiddlewareAdapter
├── jest.config.ts
└── tsconfig.json
```

**Alternativa considerada**: Estructura plana por feature (feature-sliced). Rechazada porque acopla dominio con infraestructura.

**Rationale**: Puertos en `application/ports/` permiten intercambiar `InMemoryUserRepository` ↔ `UserPrismaRepository` sin tocar la lógica de negocio. El `AuthController` en `infrastructure/http/` es el único punto de contacto con Next.js; los route handlers delegan a él.

---

### D2 — JWT con access token + refresh token

**Decisión**: Emitir dos tokens:
- **Access token**: JWT firmado HS256, TTL 15 minutos, enviado en header `Authorization: Bearer`.
- **Refresh token**: JWT firmado con secret distinto, TTL 7 días, almacenado en cookie HttpOnly.

**Alternativa considerada**: Solo access token con TTL largo. Rechazada por riesgo de seguridad si el token es comprometido.

**Rationale**: El refresh token en cookie HttpOnly protege contra XSS; el access token corto limita la ventana de exposición.

**Nota de implementación**: El middleware (`AuthMiddlewareAdapter.ts`) usa `jose` en lugar de `jsonwebtoken` para la verificación del access token, por incompatibilidad de `jsonwebtoken` con el Edge runtime de Next.js 14 (que no expone todas las APIs de Node.js `crypto`). El algoritmo y los claims son idénticos (HS256, `sub`, `email`, `exp`). El resto del sistema (`JwtTokenService`) sigue usando `jsonwebtoken`.

---

### D3 — Validación con Zod en los adaptadores HTTP

**Decisión**: Todos los inputs HTTP son validados con Zod antes de llegar a los use cases.

**Rationale**: Los use cases reciben DTOs ya validados y tipados; el dominio no conoce HTTP.

---

### D4 — Tests unitarios con Jest + mocks de puertos

**Decisión**: Los tests de use cases reciben implementaciones in-memory de los puertos. No se mockea Jest internamente; se inyectan adaptadores de test.

**Rationale**: Los use cases son funciones puras que dependen de interfaces → fácil de testear sin frameworks de mock complejos.

### D5 — Supabase Postgres vía Prisma ORM

**Decisión**: Usar Prisma 5 como ORM conectado directamente a Supabase Postgres (schema `public`). Supabase Auth SDK no se usa; la gestión de credenciales es completamente custom.

```
prisma/
  schema.prisma          # datasource con DATABASE_URL (pooler) + DIRECT_URL (direct)
  migrations/
    20260508000001_create_users/
      migration.sql      # CREATE TABLE public.users
```

**Variables de entorno requeridas**:
| Variable | Uso | Puerto |
|---|---|---|
| `DATABASE_URL` | Conexión Prisma (runtime) | 6543 (PgBouncer) |
| `DIRECT_URL` | Migraciones `prisma migrate` | 5432 (direct) |

**Schema Prisma**:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

**Primera migración** (`20260508000001_create_users/migration.sql`):
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_email_idx ON public.users (email);
```

**Alternativa considerada**: Supabase JS client directo sin Prisma. Rechazada porque pierde type-safety, el schema queda implícito y el puerto `UserRepository` se contamina con el tipo del cliente Supabase.

**Rationale**: Prisma genera tipos TS a partir del schema; `UserPrismaRepository` implementa el puerto `UserRepository` de dominio y es el único lugar que conoce `PrismaClient`. Los tests unitarios usan `InMemoryUserRepository`, evitando dependencia de red.

---

## Risks / Trade-offs

- **[Riesgo] Secret JWT hardcodeado en desarrollo** → Mitigación: leer de `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`; fallar en startup si no están presentes.
- **[Riesgo] Connection pool agotado en desarrollo** → Mitigación: usar `DATABASE_URL` con puerto 6543 (PgBouncer de Supabase); instanciar `PrismaClient` como singleton.
- **[Riesgo] Migraciones aplicadas directamente a Supabase remoto** → Mitigación: usar `DIRECT_URL` solo en CI/CD; desarrollo local con `supabase db diff` + revisión antes de aplicar.
- **[Trade-off] App Router vs Pages Router** → App Router elegido por ser el estándar actual de Next.js 14+.
- **[Riesgo] Refresh token no revocado en base de datos** → Mitigación: en esta fase se confía en la expiración; la revocación real se añade en la siguiente iteración con una tabla `refresh_tokens`.
