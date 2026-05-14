# Reporte de pruebas — create-auth-api

**Fecha:** 2026-05-10  
**Proyecto Supabase:** `qzzjpyepggwautckqeex`  
**Stack:** Next.js 14.2 · Prisma 5 · Supabase PostgreSQL 17 · Node.js 24.14.1  
**Tests automatizados:** 40/40 ✓  
**Pruebas manuales (curl):** 18/18 ✓

---

## 1. Casos de uso implementados

| ID | Caso de uso | Capa | Archivo |
|---|---|---|---|
| UC-1 | Registrar usuario | `RegisterUseCase` | `src/modules/auth/application/use-cases/RegisterUseCase.ts` |
| UC-2 | Autenticar usuario | `LoginUseCase` | `src/modules/auth/application/use-cases/LoginUseCase.ts` |
| UC-3 | Renovar access token | `RefreshTokenUseCase` | `src/modules/auth/application/use-cases/RefreshTokenUseCase.ts` |
| UC-4 | Cerrar sesión | `LogoutUseCase` | `src/modules/auth/application/use-cases/LogoutUseCase.ts` |
| UC-5 | Proteger rutas | `AuthMiddlewareAdapter` | `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts` |

---

## 2. APIs documentadas

**Base URL:** `http://localhost:3000` (dev) · `https://<dominio>` (prod)

### 2.1 POST /api/auth/register

Registra un nuevo usuario. La contraseña se hashea con bcrypt antes de persistirse.

**Request**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@dominio.com",
  "password": "minimo8chars"
}
```

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `email` | string | Sí | Formato email válido (RFC 5321) |
| `password` | string | Sí | Mínimo 8 caracteres |

**Responses**

| HTTP | Condición | Body |
|---|---|---|
| 201 Created | Registro exitoso | `{"user":{"id":"<uuid>","email":"<email>"}}` |
| 400 Bad Request | Validación fallida | `{"error":{"email":["Invalid email"]}}` o `{"error":{"password":["String must contain at least 8 character(s)"]}}` |
| 409 Conflict | Email ya registrado | `{"error":"Email already in use"}` |

---

### 2.2 POST /api/auth/login

Autentica al usuario y devuelve un access token en el body y un refresh token en cookie HttpOnly.

**Request**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@dominio.com",
  "password": "sucontrasena"
}
```

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | Sí |
| `password` | string | Sí |

**Responses**

| HTTP | Condición | Body | Cookie |
|---|---|---|---|
| 200 OK | Credenciales correctas | `{"accessToken":"eyJ...","user":{"id":"<uuid>","email":"<email>"}}` | `refreshToken=eyJ...; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict` |
| 400 Bad Request | Campos faltantes o malformados | `{"error":{...}}` | — |
| 401 Unauthorized | Credenciales incorrectas | `{"error":"Invalid credentials"}` | — |

> **Seguridad:** Los errores de password incorrecta y usuario inexistente devuelven el mismo mensaje genérico (`"Invalid credentials"`) para no revelar qué campo es incorrecto.

**Estructura del access token (payload decodificado)**

```json
{
  "sub": "135cc778-e5c9-497f-a874-554ea98caef3",
  "email": "flow_test@agrisas.com",
  "iat": 1778391768,
  "exp": 1778392668
}
```

| Claim | Descripción |
|---|---|
| `sub` | UUID del usuario |
| `email` | Email del usuario |
| `iat` | Unix timestamp de emisión |
| `exp` | Unix timestamp de expiración (`iat + 900s`, 15 minutos) |

---

### 2.3 POST /api/auth/refresh

Genera un nuevo access token usando el refresh token de la cookie. No requiere cuerpo ni header de autorización.

**Request**

```http
POST /api/auth/refresh
Cookie: refreshToken=eyJ...
```

**Responses**

| HTTP | Condición | Body |
|---|---|---|
| 200 OK | Refresh token válido | `{"accessToken":"eyJ..."}` |
| 401 Unauthorized | Sin cookie | `{"error":"Missing refresh token"}` |
| 401 Unauthorized | Token expirado | `{"error":"Refresh token expired"}` |
| 401 Unauthorized | Token manipulado o inválido | `{"error":"Invalid refresh token"}` |

---

### 2.4 POST /api/auth/logout

Limpia la cookie del refresh token instruyendo al cliente a eliminarla (`Max-Age=0`).

**Request**

```http
POST /api/auth/logout
Cookie: refreshToken=eyJ...   (opcional — el clear aplica igual)
```

**Responses**

| HTTP | Condición | Body | Cookie |
|---|---|---|---|
| 200 OK | Siempre | `{"message":"Logged out"}` | `refreshToken=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict` |

> **Nota de seguridad:** El logout es stateless — invalida la cookie en el cliente pero no revoca el JWT en el servidor. Un refresh token capturado antes del logout seguirá siendo válido hasta su expiración natural (7 días). La revocación server-side (blacklist o tabla `refresh_tokens`) queda pendiente para una iteración futura.

---

### 2.5 Middleware de autenticación

Intercepta todas las rutas excepto las públicas. Configurado en `middleware.ts` con matcher `/((?!_next/static|_next/image|favicon.ico).*)`.

**Rutas públicas (sin verificación de token)**

| Ruta | Tipo |
|---|---|
| `/api/auth/login` | Exacta |
| `/api/auth/register` | Exacta |
| `/api/auth/refresh` | Exacta |
| `/api/auth/logout` | Exacta |
| `/login` | Exacta |
| `/favicon.ico` | Exacta |
| `/_next/**` | Prefijo |

**Comportamiento por escenario**

| Escenario | Ruta | Resultado |
|---|---|---|
| Token válido en `Authorization: Bearer` | Cualquier ruta protegida | Pasa — propaga `x-user-id` y `x-user-email` |
| Sin token | `/api/**` | `401 {"error":"Unauthorized"}` |
| Token expirado | `/api/**` | `401 {"error":"Token expired"}` |
| Token manipulado | `/api/**` | `401 {"error":"Unauthorized"}` |
| Sin token | Página (`/dashboard`, etc.) | `307 Redirect → /login` |
| Cualquier petición | Rutas públicas | Pasa sin verificación |

**Headers propagados a los route handlers**

```
x-user-id:    135cc778-e5c9-497f-a874-554ea98caef3
x-user-email: flow_test@agrisas.com
```

> **Implementación:** El middleware usa `jose` (`jwtVerify`) en lugar de `jsonwebtoken` por incompatibilidad de `jsonwebtoken` con el Edge runtime de Next.js 14. El algoritmo (HS256) y los claims son idénticos. Los errores de `jose` se detectan por `err.code === "ERR_JWT_EXPIRED"` en lugar de `instanceof`, ya que las clases de error no son resolvibles en el Edge bundle.

---

## 3. Pasos para ejecutar las pruebas

### 3.1 Prerrequisitos

```bash
# Node.js >= 18.17.0 (recomendado: 24.x)
nvm use 24

# Instalar dependencias
npm install

# Variables de entorno — crear .env.local con:
JWT_ACCESS_SECRET=<hex 32 bytes>     # openssl rand -hex 32
JWT_REFRESH_SECRET=<hex 32 bytes>    # openssl rand -hex 32
DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# Generar cliente Prisma
npx prisma generate

# (Primera vez) Aplicar migración
npx prisma migrate deploy
```

### 3.2 Tests automatizados

```bash
npm test              # Todos los tests (10 suites, 40 tests)
npm run test:watch    # Modo watch
```

**Estructura de tests:**

```
tests/
├── unit/modules/auth/
│   ├── domain/
│   │   ├── entities/User.test.ts
│   │   └── value-objects/{Email,Password}.test.ts
│   ├── application/
│   │   ├── use-cases/{Login,Register,RefreshToken}UseCase.test.ts
│   │   └── mappers/UserMapper.test.ts
│   └── infrastructure/
│       ├── repositories/InMemoryUserRepository.test.ts
│       └── services/JwtTokenService.test.ts
└── integration/modules/auth/
    └── auth-flow.test.ts
```

### 3.3 Pruebas manuales con curl

```bash
# Arrancar servidor
npm run dev
```

**Flujo completo:**

```bash
# 1. Registrar usuario
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"Secure123!"}'

# 2. Login — guardar accessToken y refreshToken
curl -si http://localhost:3000/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"Secure123!"}'

# 3. Acceder a ruta protegida
curl http://localhost:3000/api/<ruta-protegida> \
  -H "Authorization: Bearer <accessToken>"

# 4. Renovar access token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refreshToken=<refreshToken>"

# 5. Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: refreshToken=<refreshToken>"
```

---

## 4. Resultados obtenidos

### 4.1 Tests automatizados

```
Test Suites: 10 passed, 10 total
Tests:       40 passed, 40 total
Time:        0.664s
```

| Suite | Tests | Estado |
|---|---|---|
| `User.test.ts` | 3 | ✓ |
| `Email.test.ts` | 4 | ✓ |
| `Password.test.ts` | 3 | ✓ |
| `RegisterUseCase.test.ts` | 4 | ✓ |
| `LoginUseCase.test.ts` | 3 | ✓ |
| `RefreshTokenUseCase.test.ts` | 3 | ✓ |
| `JwtTokenService.test.ts` | 6 | ✓ |
| `InMemoryUserRepository.test.ts` | 4 | ✓ |
| `UserMapper.test.ts` | 2 | ✓ |
| `auth-flow.test.ts` (integración) | 8 | ✓ |

### 4.2 Pruebas manuales por endpoint

#### POST /api/auth/register

| # | Escenario | Request | HTTP | Response |
|---|---|---|---|---|
| R-1 | Registro exitoso | `{"email":"flow_test@agrisas.com","password":"Secure123!"}` | **201** | `{"user":{"id":"135cc778...","email":"flow_test@agrisas.com"}}` |
| R-2 | Email duplicado | mismo email | **409** | `{"error":"Email already in use"}` |
| R-3 | Email inválido | `{"email":"not-an-email","password":"Secure123!"}` | **400** | `{"error":{"email":["Invalid email"]}}` |
| R-4 | Password corta | `{"email":"nuevo@agrisas.com","password":"abc"}` | **400** | `{"error":{"password":["String must contain at least 8 character(s)"]}}` |
| R-5 | Body vacío | `{}` | **400** | `{"error":{"email":["Required"],"password":["Required"]}}` |

#### POST /api/auth/login

| # | Escenario | Request | HTTP | Response |
|---|---|---|---|---|
| L-1 | Login exitoso | credenciales correctas | **200** | `{"accessToken":"eyJ...","user":{...}}` + `Set-Cookie: refreshToken=eyJ...; Max-Age=604800; HttpOnly; SameSite=Strict` |
| L-2 | Password incorrecta | password errónea | **401** | `{"error":"Invalid credentials"}` |
| L-3 | Usuario inexistente | email no registrado | **401** | `{"error":"Invalid credentials"}` |

#### POST /api/auth/refresh

| # | Escenario | Cookie | HTTP | Response |
|---|---|---|---|---|
| RF-1 | Refresh exitoso | `refreshToken=eyJ...` (válido) | **200** | `{"accessToken":"eyJ..."}` (nuevo token) |
| RF-2 | Sin cookie | — | **401** | `{"error":"Missing refresh token"}` |
| RF-3 | Token manipulado | `refreshToken=eyJ...tampered` | **401** | `{"error":"Invalid refresh token"}` |

> El escenario RF-4 (refresh token expirado → `"Refresh token expired"`) está cubierto en `RefreshTokenUseCase.test.ts` con `jest.useFakeTimers()` avanzando 8 días.

#### POST /api/auth/logout

| # | Escenario | Cookie | HTTP | Response |
|---|---|---|---|---|
| LO-1 | Logout exitoso | `refreshToken=eyJ...` | **200** | `{"message":"Logged out"}` + `Set-Cookie: refreshToken=; Max-Age=0; HttpOnly; SameSite=Strict` |

#### Middleware de autenticación

| # | Escenario | Header/Cookie | HTTP | Response |
|---|---|---|---|---|
| M-1 | Sin token — ruta API | — | **401** | `{"error":"Unauthorized"}` |
| M-2 | Token válido — ruta API | `Authorization: Bearer eyJ...` | **404** (ruta no existe, middleware dejó pasar) | Next.js 404 |
| M-3 | Token expirado — ruta API | `Authorization: Bearer eyJ...(exp pasado)` | **401** | `{"error":"Token expired"}` |
| M-4 | Token manipulado — ruta API | `Authorization: Bearer tampered.jwt.sig` | **401** | `{"error":"Unauthorized"}` |
| M-5 | Sin token — ruta de página | — | **307** | `Location: /login` |
| M-6 | Ruta pública `/api/auth/login` | — | **400** (llega al handler, responde Zod) | `{"error":{...}}` |
| M-7 | Headers propagados | Token válido | — | `x-user-id` y `x-user-email` presentes en downstream |

#### Verificación Supabase

```sql
SELECT id, email, created_at FROM public.users ORDER BY created_at;
```

| id | email | created_at |
|---|---|---|
| `11187354-1bb5-4a30-985f-f59a4947b410` | `test@agrisas.com` | `2026-05-09 09:09:06+00` |
| `a7a6381f-d3be-4cac-a9e8-222f2bdcb680` | `test_e2e@agrisas.com` | `2026-05-09 21:45:40+00` |
| `135cc778-e5c9-497f-a874-554ea98caef3` | `flow_test@agrisas.com` | `2026-05-10 05:20:59+00` |

Índices verificados:

| Índice | Tipo | Columna |
|---|---|---|
| `users_pkey` | UNIQUE BTREE | `id` |
| `users_email_key` | UNIQUE BTREE | `email` |
| `users_email_idx` | BTREE | `email` |

---

## 5. Incidencias encontradas y resueltas

| # | Problema | Causa | Solución |
|---|---|---|---|
| I-1 | `jwt.verify` retornaba 401 con token válido en el middleware | `jsonwebtoken` usa Node.js `crypto` incompatible con Edge runtime de Next.js 14 | Reemplazado por `jose` (`jwtVerify`) que usa Web Crypto API |
| I-2 | `err instanceof JWTExpired` lanzaba `TypeError` en Edge runtime | La clase `JWTExpired` de `jose` no es resolvible como objeto en el bundle Edge | Reemplazado por comprobación de código: `err.code === "ERR_JWT_EXPIRED"` |
| I-3 | `prisma migrate deploy` retornaba `P3005` (schema no vacío) | La tabla `users` ya existía en Supabase de una sesión previa | `prisma migrate resolve --applied 20260508000001_create_users` para baseline |
| I-4 | Node.js 18.0.0 instalado como default — Next.js requiere ≥ 18.17.0 | Version de nvm activa | `nvm use 24` — Node.js 24.14.1 |

---

## 6. Observaciones de seguridad

**Refresh token sin revocación server-side**

El logout limpia la cookie en el cliente pero el JWT del refresh token sigue siendo criptográficamente válido hasta su expiración (7 días). Si el token fue interceptado antes del logout, un atacante puede seguir generando access tokens.

**Solución recomendada (siguiente iteración):**

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  revokedAt DateTime?
  user      User     @relation(fields: [userId], references: [id])
  @@map("refresh_tokens")
}
```

Al hacer `/api/auth/refresh`, verificar que el hash del token no esté revocado. Al hacer `/api/auth/logout`, marcar `revokedAt = now()`.

**`_prisma_migrations` sin RLS**

Supabase reporta que `public._prisma_migrations` tiene RLS deshabilitado. Esta tabla es interna de Prisma y solo debe ser accedida con la `service_role` key (no con la `anon` key). Para habilitarlo:

```sql
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo service_role puede acceder (comportamiento deseado)
```

---

## 7. Resumen de cobertura

| Requisito (spec) | Implementado | Tests | E2E |
|---|---|---|---|
| Registro de usuario | ✓ | ✓ | ✓ |
| Email duplicado → 409 | ✓ | ✓ | ✓ |
| Validación Zod (email/password) → 400 | ✓ | ✓ | ✓ |
| Login con credenciales válidas | ✓ | ✓ | ✓ |
| Login con credenciales inválidas → 401 genérico | ✓ | ✓ | ✓ |
| Access token HS256 · 15 min · claims sub/email/exp | ✓ | ✓ | ✓ |
| Refresh token HS256 · 7 días · HttpOnly/SameSite=Strict | ✓ | ✓ | ✓ |
| Renovación de token con refresh válido | ✓ | ✓ | ✓ |
| Error tipado en refresh expirado/inválido | ✓ | ✓ | — |
| Logout limpia cookie (Max-Age=0) | ✓ | ✓ | ✓ |
| Middleware: rutas públicas pasan sin token | ✓ | — | ✓ |
| Middleware: sin token en API → 401 | ✓ | — | ✓ |
| Middleware: token expirado en API → 401 | ✓ | — | ✓ |
| Middleware: token inválido en API → 401 | ✓ | — | ✓ |
| Middleware: sin token en página → 307 /login | ✓ | — | ✓ |
| Middleware: propaga x-user-id/x-user-email | ✓ | — | ✓ |
| Tabla `public.users` con columnas e índices | ✓ | — | ✓ |
| PrismaClient singleton + fail-fast DATABASE_URL | ✓ | — | — |
| UserPrismaRepository: P2002 → EmailAlreadyInUseError | ✓ | ✓ | ✓ |
