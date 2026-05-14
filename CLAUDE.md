# agrisas-panel

Panel de administración agrícola. Next.js 14 App Router + TypeScript + Arquitectura Hexagonal + Supabase Postgres.

## Idioma

Responde siempre en español.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Lenguaje | TypeScript strict |
| Auth | JWT custom (`jsonwebtoken` + `bcryptjs`) — NO Supabase Auth SDK |
| Validación | Zod (en adaptadores HTTP, nunca en dominio) |
| ORM | Prisma 5 |
| Base de datos | Supabase Postgres — proyecto `agrisas` (`qzzjpyepggwautckqeex`) |
| Tests | Jest + ts-jest (node) — RTL + jsdom para UI |
| Estilos | Tailwind CSS v3 + PostCSS (decisión explícita tomada en `add-login-ui`) |

## Arquitectura Hexagonal

```
src/modules/<módulo>/
├── domain/
│   ├── entities/       # Entidades de dominio puro
│   ├── value-objects/  # Value objects inmutables
│   └── errors/         # Errores de dominio tipados
├── application/
│   ├── ports/          # Interfaces (UserRepository, TokenService, PasswordHasher)
│   ├── use-cases/      # Casos de uso — única lógica de negocio
│   ├── dto/            # DTOs de entrada/salida
│   └── mappers/        # Conversión dominio ↔ infraestructura
└── infrastructure/
    ├── repositories/   # Implementaciones de puertos (Prisma, InMemory)
    ├── services/       # Jwt, Bcrypt, etc.
    ├── http/           # AuthController + cookieOptions
    ├── middleware/     # AuthMiddlewareAdapter
    └── di/             # Container de inyección de dependencias

src/shared/domain/      # Entity.ts, ValueObject.ts, Result.ts
app/api/v1/auth/        # Route handlers versionados → delegan a AuthController vía DI container
middleware.ts           # Entry point Next.js → delega a AuthMiddlewareAdapter
```

**Reglas de capas (backend):**
- El dominio no importa nada de infraestructura ni de Next.js.
- Los use cases reciben ports (interfaces), nunca implementaciones concretas.
- Los route handlers de `app/api/v1/` no contienen lógica; delegan al controller.
- Validación Zod ocurre en `AuthController`, antes de llegar a los use cases.

## Arquitectura Frontend (`app/`)

Convención **Atomic Design + Route Groups + `_logic` por feature**. El árbol vive bajo `app/` (no bajo `src/`, que queda exclusivo del backend hexagonal).

```
app/
├── api/v1/                   # Route Handlers versionados — delegan a src/ vía DI
│   ├── auth/{login,register,refresh,logout}/route.ts
│   └── health/route.ts
│
├── _components/              # Atomic Design — UI genérica, 0 lógica de negocio
│   ├── atoms/                # Button, Input, Spinner, Label
│   ├── molecules/            # FormField, SearchBar
│   └── organisms/            # Header, Footer
│
├── _hooks/                   # Hooks globales reutilizables en ≥2 módulos
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
│
├── _lib/                     # Utilidades puras (sin React, sin fetch)
│   ├── cn.ts                 # merge de clases tailwind
│   ├── formatters.ts
│   └── validators.ts         # validadores genéricos (email, phone, …)
│
├── (public)/                 # Route group — no requiere autenticación
│   └── auth/
│       ├── layout.tsx        # AuthLayout split-panel
│       ├── _logic/           # Lógica del feature auth
│       │   ├── hooks/        # useLoginForm, useRegisterForm
│       │   ├── services/     # login.ts, register.ts (fetch a /api/v1)
│       │   ├── schemas/      # Zod schemas (login.schema.ts)
│       │   └── types/        # api.ts (DTOs HTTP) + domain.ts (User, Session)
│       ├── _blocks/          # Bloques específicos del feature (no reutilizables fuera)
│       │   ├── LoginForm.tsx
│       │   └── RegisterForm.tsx
│       ├── login/page.tsx    # Solo orquestación
│       └── register/page.tsx
│
├── (private)/                # Route group — requiere autenticación
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── _logic/{hooks,services,types}/
│   │   ├── _blocks/
│   │   └── page.tsx
│   └── settings/page.tsx
│
└── layout.tsx                # Root layout: providers, fuentes, metadata global
```

**Reglas de capas (frontend):**
- **`_components/` y `_blocks/` son presentational**: NO contienen `fetch`, `sessionStorage`, `localStorage`, `useRouter().push/replace`, ni lógica de validación inline. Pueden tener `useState` para inputs controlados.
- **`_hooks/` (global)**: framework-agnostic o React genérico; no importa de `app/`; reutilizable en ≥2 módulos. Ej.: `useDebounce`, `useLocalStorage`, `useMediaQuery`.
- **`_logic/hooks/` (módulo)**: acoplado al feature; importa de `_logic/services/`; orquesta estado, validación, llamada HTTP y navegación. Ej.: `useLoginForm`, `useDashboardStats`.
- **`_logic/services/`**: encapsulan `fetch` a `/api/v1/...`, normalizan errores HTTP a errores tipados del módulo, aceptan `fetchImpl` inyectado para tests. Nunca devuelven `Response` crudo.
- **`_logic/schemas/`**: validación Zod pura del lado cliente; el backend mantiene sus propios schemas en `src/modules/`.
- **`_logic/types/`**: `api.ts` para DTOs request/response del cliente HTTP; `domain.ts` para tipos de dominio del frontend (`User`, `Session`).
- **Páginas (`page.tsx`)**: Server Components por defecto, exportan `metadata`, leen cookies con `next/headers` para redirección server-side, importan layout + `_blocks/`. Nunca llevan `"use client"`.
- **Atomic Design en `_components/`**: `atoms/` (Button, Input, Spinner), `molecules/` (FormField, SearchBar — composición de átomos), `organisms/` (Header, Footer — secciones reutilizables sin lógica de negocio). Cada componente: `Nombre/Nombre.tsx` (+ `Nombre.module.css` opcional).
- **Naming**: carpetas `_components` / `_hooks` / `_lib` / `_logic` / `_blocks` usan prefijo `_` para que Next.js las trate como privadas (no enrutables).
- **Imports**: el alias `@/*` apunta a `src/*`; para `app/` usar rutas relativas o `app/*` según convenga. Los `_blocks` consumen `_components` vía `app/_components/...`.

## Prisma y Supabase

```
DATABASE_URL  → pooler PgBouncer puerto 6543 (runtime)
DIRECT_URL    → conexión directa puerto 5432 (migraciones)
```

- Migraciones: `npx prisma migrate dev --name <descripción>` en desarrollo.
- Deploy: `npx prisma migrate deploy` en CI/CD usando `DIRECT_URL`.
- El singleton de `PrismaClient` vive en `src/shared/infrastructure/prisma/client.ts`.

## Comandos frecuentes

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción (verifica tipos TS)
npm test             # Ejecutar todos los tests
npm run test:watch   # Tests en modo watch
npx prisma studio    # GUI de base de datos
npx prisma generate  # Regenerar tipos de Prisma Client
```

## Alias de rutas

`@/*` → `src/*` (configurado en `tsconfig.json` y `jest.config.ts`)

## Convenciones de tests

- Tests unitarios backend: `tests/unit/modules/<módulo>/...` — `testEnvironment: "node"`.
- Tests unitarios frontend: `tests/unit/ui/...` — `testEnvironment: "jsdom"` con React Testing Library.
- Tests de integración: `tests/integration/modules/<módulo>/...`.
- Tests E2E: `tests/e2e/` (carpeta reservada, aún sin runner configurado).
- Los tests de use cases usan `InMemoryUserRepository`, nunca mock de BD real.
- `jest.config.ts` usa `projects` para separar entornos `node` (backend) y `jsdom` (UI) sin colisión.

## JWT

- **Access token**: HS256, TTL 15 min, enviado en header `Authorization: Bearer`.
- **Refresh token**: HS256, TTL 7 días, cookie `refreshToken` HttpOnly + SameSite=Strict.
- Secrets: `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` — fallar en startup si no están definidos.

## Middleware de autenticación

- `middleware.ts` (raíz) usa el matcher `"/((?!_next/static|_next/image|favicon.ico).*)"`, así que estáticos de Next y favicon **ni siquiera entran** al adaptador.
- Dentro de `AuthMiddlewareAdapter` además hay lista propia de rutas públicas (defensa en profundidad):
  - Exactas: `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/auth/login`, `/auth/register`, `/favicon.ico`.
  - Prefijo: `/_next/`.
- Sin token en `/api/**` → 401 JSON.
- Token expirado en `/api/**` → 401 `{"error": "Token expired"}`.
- Sin token en rutas de página → redirect 302 a `/auth/login`.
- Con token válido → propaga `x-user-id` y `x-user-email` como headers de request.

## OpenSpec

Workflow activo: `opsx:propose` → `opsx:apply` → `opsx:verify` → `opsx:archive`.

Change en curso: **add-login-ui** (scaffold frontend + UI de login/register).
Change archivado: **create-auth-api** (backend de autenticación, completado el 2026-05-10).
