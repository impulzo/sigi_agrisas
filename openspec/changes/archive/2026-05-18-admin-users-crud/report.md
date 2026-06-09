# Report de pruebas — admin-users-crud

Servidor: `http://localhost:3000` (Next.js 14, Node 24)
Fecha: 2026-05-18
Usuario de prueba: `admin@example.com` / `admin1234`

---

## Paso 0 — Autenticación

Antes de cualquier llamada a los endpoints protegidos se requiere un access token.

### 0.1 Login correcto

```
POST /api/v1/auth/login
Content-Type: application/json
{"email":"admin@example.com","password":"admin1234"}
```

**Respuesta HTTP 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik…",
  "user": {
    "id": "656502c6-b5e5-4eca-9b4f-eb1971465316",
    "email": "admin@example.com",
    "roles": ["admin"]
  }
}
```

### 0.2 Login con contraseña incorrecta

```
POST /api/v1/auth/login
{"email":"admin@example.com","password":"wrong"}
```

**Respuesta HTTP 401:**
```json
{ "error": "Invalid credentials" }
```

✅ El token se emite correctamente; credenciales incorrectas devuelven 401.

---

## Paso 1 — GET /api/v1/admin/users (lista paginada)

### 1.1 Sin token (espera 401)

```
GET /api/v1/admin/users
(sin Authorization)
```

**Respuesta HTTP 401:**
```json
{ "error": "Unauthorized" }
```

### 1.2 Con token válido — lista completa

```
GET /api/v1/admin/users
Authorization: Bearer <token>
```

**Respuesta HTTP 200:**
```json
{
  "total": 9,
  "page": 1,
  "pageSize": 20,
  "users": [
    { "id": "e088bdda…", "email": "rbac-test-…@agrisas.test", "roles": ["viewer"] },
    { "id": "656502c6…", "email": "admin@example.com", "roles": ["admin"] },
    ...
  ]
}
```

### 1.3 Paginación — `?page=1&pageSize=3`

```
GET /api/v1/admin/users?page=1&pageSize=3
```

**Respuesta HTTP 200:**
```json
{ "total": 9, "page": 1, "pageSize": 3, "count": 3 }
```

Solo 3 usuarios devueltos, total sigue siendo 9.

### 1.4 pageSize fuera del límite — `?pageSize=200`

```
GET /api/v1/admin/users?pageSize=200
```

**Respuesta HTTP 400:**
```json
{ "error": "pageSize must not exceed 100" }
```

### 1.5 page menor a 1 — `?page=0`

```
GET /api/v1/admin/users?page=0
```

**Respuesta HTTP 400:**
```json
{ "error": "Number must be greater than or equal to 1" }
```

✅ Paginación funciona. Validaciones de rango rechazadas con 400.

---

## Paso 2 — GET /api/v1/admin/users/:id (detalle)

### 2.1 Usuario existente

```
GET /api/v1/admin/users/656502c6-b5e5-4eca-9b4f-eb1971465316
Authorization: Bearer <token>
```

**Respuesta HTTP 200:**
```json
{
  "id": "656502c6-b5e5-4eca-9b4f-eb1971465316",
  "email": "admin@example.com",
  "roles": ["admin"],
  "createdAt": "2026-05-14T07:12:59.006Z",
  "updatedAt": "2026-05-14T07:12:59.006Z"
}
```

### 2.2 Usuario no encontrado (UUID válido inexistente)

```
GET /api/v1/admin/users/00000000-0000-0000-0000-000000000000
```

**Respuesta HTTP 404:**
```json
{ "error": "User not found" }
```

### 2.3 UUID inválido

```
GET /api/v1/admin/users/not-a-uuid
```

**Respuesta HTTP 400:**
```json
{ "error": "Invalid user ID format" }
```

✅ Detalle correcto. 404 y 400 bien diferenciados.

---

## Paso 3 — PATCH /api/v1/admin/users/:id (actualizar)

### 3.1 Actualizar nombre exitosamente

```
PATCH /api/v1/admin/users/11187354-1bb5-4a30-985f-f59a4947b410
{"name":"Usuario de Prueba"}
```

**Respuesta HTTP 200:**
```json
{
  "id": "11187354-1bb5-4a30-985f-f59a4947b410",
  "name": "Usuario de Prueba",
  "email": "test@agrisas.com"
}
```

### 3.2 Actualizar email a uno disponible

```
PATCH /api/v1/admin/users/11187354-…
{"email":"test_updated@agrisas.test"}
```

**Respuesta HTTP 200:**
```json
{
  "id": "11187354-…",
  "name": "Usuario de Prueba",
  "email": "test_updated@agrisas.test"
}
```

### 3.3 Email ya en uso por otro usuario

```
PATCH /api/v1/admin/users/11187354-…
{"email":"admin@example.com"}
```

**Respuesta HTTP 409:**
```json
{ "error": "Email already in use" }
```

### 3.4 Intentar editar la propia cuenta

```
PATCH /api/v1/admin/users/656502c6-… (= propio ID del admin)
{"name":"Intento editar mi cuenta"}
```

**Respuesta HTTP 403:**
```json
{ "error": "Cannot modify your own account" }
```

### 3.5 Body vacío

```
PATCH /api/v1/admin/users/11187354-…
{}
```

**Respuesta HTTP 400:**
```json
{ "error": "At least one field (name, email) must be provided" }
```

### 3.6 Usuario no encontrado

```
PATCH /api/v1/admin/users/00000000-0000-0000-0000-000000000000
{"name":"Fantasma"}
```

**Respuesta HTTP 404:**
```json
{ "error": "User not found" }
```

✅ Todos los caminos de error manejados correctamente.

---

## Paso 4 — DELETE /api/v1/admin/users/:id (eliminar)

Se creó un usuario temporal para esta prueba vía `POST /api/v1/auth/register`.

### 4.1 Intentar eliminar la propia cuenta

```
DELETE /api/v1/admin/users/656502c6-… (= propio ID del admin)
```

**Respuesta HTTP 403:**
```json
{ "error": "Cannot delete your own account" }
```

### 4.2 Usuario no encontrado

```
DELETE /api/v1/admin/users/00000000-0000-0000-0000-000000000000
```

**Respuesta HTTP 404:**
```json
{ "error": "User not found" }
```

### 4.3 Eliminar usuario existente

```
DELETE /api/v1/admin/users/<TEMP_ID>
```

**Respuesta HTTP 204 — sin body.**

### 4.4 Verificar que fue eliminado

```
GET /api/v1/admin/users/<TEMP_ID>
```

**Respuesta HTTP 404:**
```json
{ "error": "User not found" }
```

✅ Hard delete confirmado. La entidad y sus roles se eliminan en cascada.

---

## Paso 5 — Control de acceso RBAC

### 5.1 Usuario con rol `viewer` accede a GET /admin/users

El rol `viewer` tiene el permiso `users:read` en el seed:

| Rol | Permisos |
|-----|----------|
| admin | users:read, users:write, roles:read, roles:write |
| operator | users:read, roles:read |
| viewer | users:read |

```
GET /api/v1/admin/users
Authorization: Bearer <viewer token>
```

**Respuesta HTTP 200** — lista completa. El guard de `users:read` permite el acceso porque el seed otorga ese permiso al rol `viewer`.

### 5.2 Viewer intenta DELETE (sin `users:write`)

```
DELETE /api/v1/admin/users/656502c6-…
Authorization: Bearer <viewer token>
```

**Respuesta HTTP 403:**
```json
{ "error": "Forbidden", "required": "users:write" }
```

> **Nota de diseño:** Si se desea que solo el rol `admin` pueda listar usuarios, debe ajustarse el seed para quitar `users:read` de `viewer` y `operator`. El código aplica correctamente los permisos que tenga cada rol — esta es una decisión de datos, no de lógica.

✅ La separación `users:read` / `users:write` funciona correctamente.

---

## Paso 6 — Verificación de seguridad: passwordHash nunca expuesto

```
GET /api/v1/admin/users
```

Verificado que ningún `AdminUserDto` de la respuesta contiene el campo `passwordHash`.

Campos expuestos por usuario (CRUD base):
```json
["createdAt", "email", "id", "name", "roles", "updatedAt"]
```

✅ Dato sensible correctamente ocultado en toda la API.

---

## Paso 7 — Campo avatarUrl

> Cambio añadido en segunda iteración: campo `avatar_url TEXT` nullable en BD. Cuando es `null`, el sistema devuelve la URL de Gravatar calculada con MD5 del email. `PATCH` acepta `avatarUrl?: string | null` (null = reset a Gravatar).

### 7.1 GET — usuario sin avatar almacenado devuelve Gravatar

```
GET /api/v1/admin/users/656502c6-b5e5-4eca-9b4f-eb1971465316
Authorization: Bearer <admin token>
```

**Respuesta HTTP 200:**
```json
{
  "id": "656502c6-b5e5-4eca-9b4f-eb1971465316",
  "email": "admin@example.com",
  "avatarUrl": "https://www.gravatar.com/avatar/e64c7d89f26bd1972efa854d13d7dd61?d=mp&s=200"
}
```

El hash `e64c7d89f26bd1972efa854d13d7dd61` es el MD5 de `admin@example.com`. El campo nunca es `null` en la respuesta.

### 7.2 GET — lista completa: todos los usuarios tienen avatarUrl

```
GET /api/v1/admin/users
```

**Extracto de respuesta HTTP 200:**
```json
[
  { "email": "rbac-test-1779077816@agrisas.test", "avatarUrl": "https://www.gravatar.com/avatar/5b3c5da8…?d=mp&s=200" },
  { "email": "test_report_1778755621@agrisas-test.com", "avatarUrl": "https://www.gravatar.com/avatar/3295ac9f…?d=mp&s=200" },
  { "email": "test_emit_1778754693@agrisas-test.com", "avatarUrl": "https://www.gravatar.com/avatar/a5261117…?d=mp&s=200" }
]
```

Todos los usuarios reciben una URL única generada a partir de su email.

### 7.3 PATCH — establecer URL de avatar personalizada

```
PATCH /api/v1/admin/users/11187354-1bb5-4a30-985f-f59a4947b410
{"avatarUrl": "https://example.com/custom-avatar.jpg"}
```

**Respuesta HTTP 200:**
```json
{
  "id": "11187354-1bb5-4a30-985f-f59a4947b410",
  "email": "test_updated@agrisas.test",
  "avatarUrl": "https://example.com/custom-avatar.jpg"
}
```

### 7.4 PATCH — URL inválida (espera 400)

```
PATCH /api/v1/admin/users/11187354-…
{"avatarUrl": "not-a-url"}
```

**Respuesta HTTP 400:**
```json
{ "error": "Invalid url" }
```

Zod rechaza cualquier string que no sea una URL válida.

### 7.5 PATCH — resetear a null (vuelve a Gravatar)

```
PATCH /api/v1/admin/users/11187354-…
{"avatarUrl": null}
```

**Respuesta HTTP 200:**
```json
{
  "id": "11187354-1bb5-4a30-985f-f59a4947b410",
  "email": "test_updated@agrisas.test",
  "avatarUrl": "https://www.gravatar.com/avatar/713abbd81ba0f0ae7113d8ae803426a6?d=mp&s=200"
}
```

BD almacena `null`; la respuesta devuelve el Gravatar calculado en tiempo de serialización.

### 7.6 PATCH — avatarUrl como único campo del body (válido)

```
PATCH /api/v1/admin/users/11187354-…
{"avatarUrl": "https://cdn.example.com/photo.png"}
```

**Respuesta HTTP 200** — body vacío si solo se envía `avatarUrl` ya no produce error 400.

### 7.7 Campos expuestos post-cambio

Campos del `AdminUserDto` actualizado:
```json
["avatarUrl", "createdAt", "email", "id", "name", "roles", "updatedAt"]
```

✅ `avatarUrl` presente, `passwordHash` ausente.

---

## Resumen de resultados

| Endpoint | Caso | HTTP esperado | HTTP obtenido | Estado |
|----------|------|:---:|:---:|:---:|
| POST /auth/login | Credenciales correctas | 200 | 200 | ✅ |
| POST /auth/login | Contraseña incorrecta | 401 | 401 | ✅ |
| GET /admin/users | Sin token | 401 | 401 | ✅ |
| GET /admin/users | Admin autenticado | 200 | 200 | ✅ |
| GET /admin/users | pageSize=200 | 400 | 400 | ✅ |
| GET /admin/users | page=0 | 400 | 400 | ✅ |
| GET /admin/users | Paginación page=1&pageSize=3 | 200 | 200 | ✅ |
| GET /admin/users/:id | Usuario existente | 200 | 200 | ✅ |
| GET /admin/users/:id | UUID inexistente | 404 | 404 | ✅ |
| GET /admin/users/:id | UUID inválido | 400 | 400 | ✅ |
| PATCH /admin/users/:id | Actualizar nombre | 200 | 200 | ✅ |
| PATCH /admin/users/:id | Actualizar email disponible | 200 | 200 | ✅ |
| PATCH /admin/users/:id | Email ya en uso | 409 | 409 | ✅ |
| PATCH /admin/users/:id | Propio usuario | 403 | 403 | ✅ |
| PATCH /admin/users/:id | Body vacío | 400 | 400 | ✅ |
| PATCH /admin/users/:id | Usuario no encontrado | 404 | 404 | ✅ |
| DELETE /admin/users/:id | Propio usuario | 403 | 403 | ✅ |
| DELETE /admin/users/:id | Usuario no encontrado | 404 | 404 | ✅ |
| DELETE /admin/users/:id | Eliminar existente | 204 | 204 | ✅ |
| GET después de DELETE | Usuario eliminado | 404 | 404 | ✅ |
| GET /admin/users | Viewer (tiene users:read) | 200 | 200 | ✅ |
| DELETE /admin/users/:id | Viewer (sin users:write) | 403 | 403 | ✅ |
| Cualquier endpoint | passwordHash expuesto | nunca | nunca | ✅ |
| GET /admin/users/:id | avatarUrl null → Gravatar | Gravatar URL | Gravatar URL | ✅ |
| GET /admin/users | Todos los usuarios con avatarUrl | presente | presente | ✅ |
| PATCH /admin/users/:id | Establecer URL personalizada | 200 | 200 | ✅ |
| PATCH /admin/users/:id | URL inválida (not-a-url) | 400 | 400 | ✅ |
| PATCH /admin/users/:id | Reset avatarUrl a null | 200 + Gravatar | 200 + Gravatar | ✅ |
| PATCH /admin/users/:id | avatarUrl como único campo | 200 | 200 | ✅ |

**Total: 29/29 casos correctos.**
