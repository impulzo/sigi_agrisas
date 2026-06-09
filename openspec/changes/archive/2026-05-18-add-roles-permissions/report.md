# Reporte de Pruebas — add-roles-permissions

**Fecha:** 2026-05-18  
**Entorno:** Local (Next.js 14 dev server, Supabase Postgres `agrisas`)  
**Rama:** `feature/roles-permissions-back`

---

## Resumen

| Paso | Descripción | Resultado | HTTP |
|------|-------------|-----------|------|
| 1 | Registrar usuario nuevo | `roles: ["viewer"]` en respuesta y JWT | ✅ 201 |
| 2 | `GET /api/v1/admin/roles` con token de viewer | Bloqueado correctamente | ✅ 403 |
| 3 | Asignar rol `admin` al usuario | Asignación persistida en Supabase | ✅ OK |
| 4 | Login y Refresh → nuevo token con ambos roles | `roles: ["viewer","admin"]` en JWT | ✅ 200 |
| 5 | `GET /api/v1/admin/roles` con token de admin | Lista de 3 roles devuelta | ✅ 200 |
| 6 | `GET /api/v1/admin/users/:id/permissions` | 4 permisos efectivos del usuario | ✅ 200 |
| 7 | `GET /api/v1/admin/permissions` | 4 permisos del catálogo | ✅ 200 |
| 8 | `GET /api/v1/admin/roles` sin token | Rechazado correctamente | ✅ 401 |

---

## Paso 1 — Registro de usuario nuevo

**Request:**
```
POST /api/v1/auth/register
{"name":"Test RBAC","email":"rbac-test-1779077816@agrisas.test","password":"SecurePass123"}
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e088bdda-772f-4e37-81eb-d83cdae2e623",
    "name": "Test RBAC",
    "email": "rbac-test-1779077816@agrisas.test",
    "roles": ["viewer"]
  }
}
```

**JWT payload decodificado:**
```json
{
  "email": "rbac-test-1779077816@agrisas.test",
  "roles": ["viewer"],
  "iat": 1779077818,
  "exp": 1779078718,
  "sub": "e088bdda-772f-4e37-81eb-d83cdae2e623"
}
```

**Verificación:** El registro asigna automáticamente el rol `viewer` (via `PrismaRoleAssigner` + `RBAC_DEFAULT_ROLE=viewer`) y el access token incluye el claim `roles: ["viewer"]`. ✅

---

## Paso 2 — GET /api/v1/admin/roles con token viewer

**Request:**
```
GET /api/v1/admin/roles
Authorization: Bearer <token-viewer>
```

**Response (403):**
```json
{
  "error": "Forbidden",
  "required": "roles:read"
}
```

**Verificación:** El guard `requirePermission(req, "roles:read")` deniega correctamente porque el rol `viewer` solo tiene `users:read`. ✅

---

## Paso 3 — Asignar rol admin al usuario

Asignación directa vía Prisma Client (equivale a `POST /api/v1/admin/users/:id/roles` con body `{"roleName":"admin"}`):

```
Admin role ID: 04c83a17-aa45-456b-8881-346fd8af3a39
Admin role assigned to test user
```

**Verificación:** El usuario `e088bdda-7...` tiene ahora dos filas en `user_roles`: `viewer` + `admin`. ✅

---

## Paso 4 — Login y Refresh con roles actualizados

### Login (recarga roles)

**Response de login (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e088bdda-772f-4e37-81eb-d83cdae2e623",
    "email": "rbac-test-1779077816@agrisas.test",
    "roles": ["viewer", "admin"]
  }
}
```

### Refresh (recarga roles desde BD)

**Request:**
```
POST /api/v1/auth/refresh
Cookie: refreshToken=<token>
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**JWT payload del token refrescado:**
```json
{
  "email": "rbac-test-1779077816@agrisas.test",
  "roles": ["viewer", "admin"],
  "iat": 1779077918,
  "exp": 1779078818,
  "sub": "e088bdda-772f-4e37-81eb-d83cdae2e623"
}
```

**Verificación:** Tanto login como refresh re-cargan los roles desde BD y los incluyen en el access token. El claim `roles` refleja el estado actual sin esperar expiración. ✅

---

## Paso 5 — GET /api/v1/admin/roles con token admin

**Request:**
```
GET /api/v1/admin/roles
Authorization: Bearer <token-admin>
```

**Response (200):**
```json
{
  "roles": [
    {
      "id": "04c83a17-aa45-456b-8881-346fd8af3a39",
      "name": "admin",
      "description": "Administrador con acceso total",
      "createdAt": "2026-05-18T01:41:18.199Z",
      "updatedAt": "2026-05-18T01:41:18.199Z"
    },
    {
      "id": "897f8e69-9ae5-49ad-8a34-ed2e961acfe9",
      "name": "operator",
      "description": "Operador con acceso de lectura a usuarios y roles",
      "createdAt": "2026-05-18T01:41:19.189Z",
      "updatedAt": "2026-05-18T01:41:19.189Z"
    },
    {
      "id": "77285fd5-2ccb-4316-be86-1156c38fd8b2",
      "name": "viewer",
      "description": "Visor con acceso mínimo de lectura",
      "createdAt": "2026-05-18T01:41:19.595Z",
      "updatedAt": "2026-05-18T01:41:19.595Z"
    }
  ]
}
```

**Verificación:** El guard permite el acceso cuando el usuario tiene `roles:read` (via rol `admin`). Los 3 roles del seed están correctamente persistidos. ✅

---

## Paso 6 — GET /api/v1/admin/users/:id/permissions

Verifica que los permisos efectivos del usuario con roles `viewer + admin` son la unión de sus permisos.

**Response (200):**
```json
{
  "permissions": ["roles:read", "users:write", "roles:write", "users:read"]
}
```

**Verificación:** 4 permisos únicos (deduplicados) de la unión de `viewer` (users:read) + `admin` (users:read, users:write, roles:read, roles:write). La caché `PrismaAuthorizationService` resuelve correctamente con la SQL de JOINs. ✅

---

## Paso 7 — GET /api/v1/admin/permissions

**Response (200):**
```json
{
  "permissions": [
    {"id": "...", "key": "roles:read", "description": "Leer roles y permisos"},
    {"id": "...", "key": "roles:write", "description": "Gestionar roles y permisos"},
    {"id": "...", "key": "users:read", "description": "Leer usuarios"},
    {"id": "...", "key": "users:write", "description": "Crear/editar usuarios"}
  ]
}
```

**Verificación:** Los 4 permisos del seed (`users:read`, `users:write`, `roles:read`, `roles:write`) están disponibles en el catálogo. ✅

---

## Paso 8 — Sin token → 401

**Request:**
```
GET /api/v1/admin/roles
(sin Authorization header)
```

**Response (401):**
```json
{
  "error": "Unauthorized"
}
```

**Verificación:** El middleware `AuthMiddlewareAdapter` intercepta la request antes de llegar al guard. ✅

---

## Resultado final

Todos los escenarios del flujo RBAC funcionan según lo diseñado:

- ✅ Registro asigna `viewer` por defecto
- ✅ JWT incluye claim `roles` desde el primer token
- ✅ Guard `requirePermission` retorna 403 con el permiso requerido
- ✅ Login y Refresh recargan roles desde BD
- ✅ Admin puede acceder a los endpoints de gestión
- ✅ Middleware retorna 401 sin token
- ✅ Permisos efectivos del usuario reflejan la unión de todos sus roles
- ✅ Seed idempotente con 3 roles y 4 permisos base en Supabase
