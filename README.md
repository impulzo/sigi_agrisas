# agrisas-panel

Panel de administración agrícola construido con **Next.js 14 (App Router)**, **TypeScript estricto**, **arquitectura hexagonal** en el backend y **Supabase Postgres** como base de datos. La autenticación es propia (JWT con `jsonwebtoken` + `bcryptjs`), sin Supabase Auth SDK.

## Características

- Autenticación JWT propia: access token (15 min) en header `Authorization: Bearer` y refresh token (7 días) en cookie `HttpOnly; SameSite=Strict`.
- Arquitectura hexagonal por módulo (`domain` / `application` / `infrastructure`) con inyección de dependencias.
- Frontend organizado por **Atomic Design + Route Groups + `_logic` por feature**.
- Validación con **Zod** en los adaptadores HTTP (nunca en el dominio).
- Prisma 5 contra Supabase Postgres con pooler PgBouncer (`DATABASE_URL`) y conexión directa para migraciones (`DIRECT_URL`).
- Suite de tests con Jest: backend en entorno `node` y UI en `jsdom` con React Testing Library.
- Estilos con Tailwind CSS v3.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Lenguaje | TypeScript strict |
| Auth | JWT custom (`jsonwebtoken` + `bcryptjs`) |
| Validación | Zod |
| ORM | Prisma 5 |
| Base de datos | Supabase Postgres |
| Tests | Jest + ts-jest (`node` y `jsdom`) |
| Estilos | Tailwind CSS v3 + PostCSS |

## Estructura

```
app/                       # Next.js App Router (rutas, layouts, route handlers)
├── api/v1/                # Endpoints HTTP versionados → delegan al backend hexagonal
├── _components/           # Atomic Design (atoms, molecules, organisms)
├── _hooks/                # Hooks globales reutilizables
├── _lib/                  # Utilidades puras
├── (public)/              # Route group sin autenticación (auth/login, auth/register)
└── (private)/             # Route group autenticado (dashboard, settings)

src/modules/<módulo>/      # Backend hexagonal
├── domain/                # Entidades, value objects y errores de dominio
├── application/           # Ports, use cases, DTOs, mappers
└── infrastructure/        # Repos Prisma, services, HTTP, middleware, DI

src/shared/                # Tipos compartidos (Entity, ValueObject, Result, prisma client)
middleware.ts              # Entry point Next.js → AuthMiddlewareAdapter
prisma/                    # schema.prisma + migrations
tests/                     # unit / integration / e2e
openspec/                  # Workflow de cambios (propose → apply → verify → archive)
```

Para detalles de capas, convenciones de naming e imports ver [`CLAUDE.md`](./CLAUDE.md).

## Requisitos

- Node.js **24.14.1** (definido en `.nvmrc`; usa `nvm use` para sincronizar).
- npm (incluido con Node).
- Un proyecto de Supabase Postgres con sus dos URLs de conexión disponibles.

## Variables de entorno

Crea un `.env.local` en la raíz a partir de `.env.example`:

```env
# JWT — genera cada secret con: openssl rand -hex 32
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Supabase Postgres — runtime (pooler PgBouncer, puerto 6543)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Postgres — migraciones (conexión directa, puerto 5432)
DIRECT_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"
```

Si falta `JWT_ACCESS_SECRET` o `JWT_REFRESH_SECRET` el servidor falla al arrancar (es intencional).

## Ejecución local

```bash
# 1. Usa la versión de Node correcta
nvm use

# 2. Instala dependencias
npm install

# 3. Genera el Prisma Client
npx prisma generate

# 4. Aplica las migraciones a tu base de datos
npx prisma migrate dev

# 5. Arranca el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en [http://localhost:3000](http://localhost:3000). Las rutas públicas viven bajo `/auth/*` y las privadas bajo el route group `(private)/*`.

### Comandos útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción (verifica tipos)
npm start            # Sirve el build de producción
npm run lint         # ESLint (next lint)
npm test             # Ejecuta todos los tests
npm run test:watch   # Tests en modo watch
npx prisma studio    # GUI de base de datos
npx prisma generate  # Regenerar tipos de Prisma Client
```

## Tests

- **Backend (`node`)**: `tests/unit/modules/<módulo>/...` e `tests/integration/modules/<módulo>/...`. Los use cases usan `InMemoryUserRepository`, nunca una BD real.
- **UI (`jsdom`)**: `tests/unit/ui/...` con React Testing Library.
- `jest.config.ts` usa `projects` para separar ambos entornos sin colisión.

```bash
npm test
```

## Despliegue en Vercel

El proyecto está pensado para desplegar en Vercel sin configuración adicional, ya que usa el adaptador estándar de Next.js.

### 1. Importar el repositorio

1. Entra al [dashboard de Vercel](https://vercel.com/new) y haz **Add New… → Project**.
2. Selecciona el repositorio de GitHub/GitLab/Bitbucket.
3. En la pantalla de configuración Vercel detecta Next.js automáticamente: deja `Framework Preset = Next.js`, `Build Command = next build`, `Output Directory = .next`.

### 2. Configurar variables de entorno

En **Project Settings → Environment Variables** añade, para cada entorno (`Production`, `Preview`, `Development`):

| Variable | Valor |
|---|---|
| `JWT_ACCESS_SECRET` | Secret HS256 generado con `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Secret HS256 distinto al anterior |
| `DATABASE_URL` | URL del pooler de Supabase (puerto **6543**, `pgbouncer=true`) |
| `DIRECT_URL` | URL directa de Supabase (puerto **5432**) — usada por `prisma migrate` |

> Usa **secrets distintos por entorno**. No reutilices los de desarrollo en producción.

### 3. Migraciones en CI/CD

El runtime serverless de Vercel debe usar `DATABASE_URL` (pooler). Las migraciones deben correrse con `DIRECT_URL`. Hay dos enfoques:

- **Recomendado**: ejecutar `npx prisma migrate deploy` desde tu pipeline (GitHub Actions, etc.) antes de hacer el deploy, usando `DIRECT_URL`.
- **Alternativa**: añadir el comando al `build` de Vercel, por ejemplo cambiando el **Build Command** a:

  ```bash
  prisma generate && prisma migrate deploy && next build
  ```

  Asegúrate de que `DIRECT_URL` esté disponible en el entorno de build.

Prisma Client se genera durante el build (`prisma generate`); con el `postinstall` por defecto de Vercel basta, pero conviene confirmar que `@prisma/client` y `prisma` están en `dependencies`/`devDependencies` (ya lo están en este repo).

### 4. Dominios y cookies

El refresh token se entrega como cookie `HttpOnly; SameSite=Strict`. Si sirves la app y la API desde el mismo dominio (lo normal en Vercel), no hay nada extra que configurar. Si más adelante separas frontend y backend, revisa `cookieOptions` en `src/modules/auth/infrastructure/http/`.

### 5. Verificación post-deploy

1. `GET /api/v1/health` debe responder `200`.
2. `POST /api/v1/auth/register` y `POST /api/v1/auth/login` deben funcionar end-to-end.
3. Navegar a una ruta privada sin sesión debe redirigir a `/auth/login`.

## OpenSpec

El proyecto usa el workflow OpenSpec para gestionar cambios:

```
opsx:propose → opsx:apply → opsx:verify → opsx:archive
```

Cambios archivados y en curso viven bajo `openspec/`.

## Licencia

Privado — uso interno del proyecto agrisas.
