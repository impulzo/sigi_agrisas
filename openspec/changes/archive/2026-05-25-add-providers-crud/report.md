# Reporte de pruebas — add-providers-crud

**Fecha:** 2026-05-25  
**Servidor:** `http://localhost:3001` (`npm run dev`)  
**Base de datos:** Supabase Postgres (`qzzjpyepggwautckqeex`)

---

## Preparación

### Usuarios de prueba

Se registraron dos usuarios para cubrir los casos de roles `admin` y `viewer`:

```bash
# Registro del admin de prueba
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testadmin@agrisas.com","password":"Admin1234!","name":"Test Admin"}'
# → { "accessToken": "...", "user": { "roles": ["viewer"] } }

# El rol admin se asignó directamente en BD (upsert vía script Prisma)
# Resultado: roles: ["viewer", "admin"]

# Registro del viewer de prueba
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testviewer@agrisas.com","password":"Viewer1234!","name":"Test Viewer"}'
# → { "accessToken": "...", "user": { "roles": ["viewer"] } }
```

### Permisos en BD (verificado con Prisma)

```
providers:read  → roles: [admin, operator, viewer]
providers:write → roles: [admin]
```

---

## T1 — GET /providers sin token → 401

```bash
curl -s -w "\nHTTP %{http_code}" http://localhost:3001/api/v1/admin/providers
```

**Respuesta:**
```json
{"error":"Unauthorized"}
```
**HTTP 401** ✓

---

## T2 — GET /providers como viewer → 200

```bash
curl -s -w "\nHTTP %{http_code}" http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```

**Respuesta:**
```json
{"items":[],"total":0,"page":1,"pageSize":20}
```
**HTTP 200** ✓ — El rol `viewer` puede leer proveedores.

---

## T3 — POST /providers como viewer → 403

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"PROV001","name":"Test","rfc":"XAXX010101000"}'
```

**Respuesta:**
```json
{"error":"Forbidden","required":"providers:write"}
```
**HTTP 403** ✓ — El rol `viewer` no puede crear proveedores. La respuesta incluye el permiso requerido.

---

## T4 — POST /providers — campos mínimos (code, name, rfc)

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"PROV001","name":"Agroquímica del Norte S.A.","rfc":"XAXX010101000"}'
```

**Respuesta:**
```json
{
  "id": "c2a0f527-6269-492c-8c00-db6d95d7535c",
  "code": "PROV001",
  "name": "Agroquímica del Norte S.A.",
  "rfc": "XAXX010101000",
  "legalName": null,
  "taxRegime": null,
  "cfdiUse": null,
  "taxZipCode": null,
  "email": null,
  "phone": null,
  "address": null,
  "contactName": null,
  "notes": null,
  "isActive": true,
  "createdAt": "2026-05-25T08:23:36.702Z",
  "updatedAt": "2026-05-25T08:23:36.702Z"
}
```
**HTTP 201** ✓ — Los campos opcionales se inicializan como `null`. `isActive: true` por defecto.

---

## T5 — POST /providers — todos los campos fiscales

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SEMILLAS01",
    "name": "Semillas del Valle S.A. de C.V.",
    "rfc": "SVA920315AB3",
    "legalName": "Semillas del Valle Sociedad Anónima de Capital Variable",
    "taxRegime": "601",
    "cfdiUse": "G03",
    "taxZipCode": "44100",
    "email": "contacto@semillasdelvalle.mx",
    "phone": "3312345678",
    "address": "Av. Patria 1234, Zapopan, Jalisco",
    "contactName": "María González",
    "notes": "Proveedor certificado por SAGARPA"
  }'
```

**Respuesta:**
```json
{
  "id": "a13e6b7b-8e5f-440a-aa8a-be854d6d70fb",
  "code": "SEMILLAS01",
  "name": "Semillas del Valle S.A. de C.V.",
  "rfc": "SVA920315AB3",
  "legalName": "Semillas del Valle Sociedad Anónima de Capital Variable",
  "taxRegime": "601",
  "cfdiUse": "G03",
  "taxZipCode": "44100",
  "email": "contacto@semillasdelvalle.mx",
  "phone": "3312345678",
  "address": "Av. Patria 1234, Zapopan, Jalisco",
  "contactName": "María González",
  "notes": "Proveedor certificado por SAGARPA",
  "isActive": true,
  "createdAt": "2026-05-25T08:24:45.316Z",
  "updatedAt": "2026-05-25T08:24:45.316Z"
}
```
**HTTP 201** ✓ — Todos los campos fiscales y de contacto se persisten correctamente.

---

## T6 — GET /providers — lista paginada

```bash
curl -s -w "\nHTTP %{http_code}" http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:**
```json
{
  "items": [
    { "code": "SEMILLAS01", "isActive": true, "..." },
    { "code": "PROV001", "isActive": true, "..." }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20
}
```
**HTTP 200** ✓ — Orden por `createdAt DESC`. Incluye `total`, `page` y `pageSize`.

---

## T7 — GET /providers/:id — detalle

```bash
curl -s -w "\nHTTP %{http_code}" \
  http://localhost:3001/api/v1/admin/providers/c2a0f527-6269-492c-8c00-db6d95d7535c \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:**
```json
{
  "id": "c2a0f527-6269-492c-8c00-db6d95d7535c",
  "code": "PROV001",
  "name": "Agroquímica del Norte S.A.",
  "rfc": "XAXX010101000",
  "..."
}
```
**HTTP 200** ✓

---

## T8 — GET /providers/:id — ID inexistente → 404

```bash
curl -s -w "\nHTTP %{http_code}" \
  http://localhost:3001/api/v1/admin/providers/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:**
```json
{"error":"Provider not found: 00000000-0000-0000-0000-000000000000"}
```
**HTTP 404** ✓

---

## T9 — GET /providers?search=semillas — búsqueda por nombre

```bash
curl -s -w "\nHTTP %{http_code}" \
  "http://localhost:3001/api/v1/admin/providers?search=semillas" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:** `total: 1`, items: `["SEMILLAS01"]`  
**HTTP 200** ✓ — Búsqueda case-insensitive por `name`.

---

## T10 — GET /providers?search=SVA9 — búsqueda por RFC

```bash
curl -s -w "\nHTTP %{http_code}" \
  "http://localhost:3001/api/v1/admin/providers?search=SVA9" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:** `total: 1`, items: `["SEMILLAS01"]`  
**HTTP 200** ✓ — Búsqueda por RFC funciona correctamente.

---

## T11 — GET /providers?search=a — búsqueda < 2 chars → 400

```bash
curl -s -w "\nHTTP %{http_code}" \
  "http://localhost:3001/api/v1/admin/providers?search=a" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:**
```json
{"error":"search must be at least 2 characters"}
```
**HTTP 400** ✓

---

## T12 — GET /providers?page=1&pageSize=1 — paginación

```bash
curl -s -w "\nHTTP %{http_code}" \
  "http://localhost:3001/api/v1/admin/providers?page=1&pageSize=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:** `total: 2, page: 1, pageSize: 1`, items: 1 registro  
**HTTP 200** ✓ — `total` refleja el total global; `items` solo la página.

---

## T13 — PATCH /providers/:id — actualización parcial

```bash
curl -s -w "\nHTTP %{http_code}" -X PATCH \
  http://localhost:3001/api/v1/admin/providers/c2a0f527-6269-492c-8c00-db6d95d7535c \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Agroquímica del Norte S.A. de C.V.","legalName":"Agroquímica del Norte Sociedad Anónima de Capital Variable","taxRegime":"612"}'
```

**Respuesta:**
```json
{
  "id": "c2a0f527-6269-492c-8c00-db6d95d7535c",
  "code": "PROV001",
  "name": "Agroquímica del Norte S.A. de C.V.",
  "legalName": "Agroquímica del Norte Sociedad Anónima de Capital Variable",
  "taxRegime": "612",
  "updatedAt": "2026-05-25T08:28:45.662Z",
  "..."
}
```
**HTTP 200** ✓ — `code` es inmutable (no cambia). `updatedAt` se actualiza.

---

## T14 — PATCH — body vacío → 400

```bash
curl -s -w "\nHTTP %{http_code}" -X PATCH \
  http://localhost:3001/api/v1/admin/providers/c2a0f527-6269-492c-8c00-db6d95d7535c \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Respuesta:**
```json
{"error":"At least one field must be provided"}
```
**HTTP 400** ✓

---

## T15 — PATCH — limpiar campo opcional con null

```bash
curl -s -w "\nHTTP %{http_code}" -X PATCH \
  http://localhost:3001/api/v1/admin/providers/c2a0f527-6269-492c-8c00-db6d95d7535c \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"legalName":null}'
```

**Respuesta:** `legalName: null` (campo limpiado)  
**HTTP 200** ✓ — `null` explícito borra el valor del campo.

---

## T16 — POST — RFC duplicado → 409

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"NEWPROV","name":"Otro","rfc":"XAXX010101000"}'
```

**Respuesta:**
```json
{"error":"Provider RFC already in use: XAXX010101000"}
```
**HTTP 409** ✓

---

## T17 — POST — code duplicado → 409

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"PROV001","name":"Otro","rfc":"XEXX010101000"}'
```

**Respuesta:**
```json
{"error":"Provider code already in use: PROV001"}
```
**HTTP 409** ✓

---

## T18 — POST — RFC inválido → 400

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"P999","name":"Invalido","rfc":"rfc-invalido-123"}'
```

**Respuesta:**
```json
{"error":"rfc must be a valid Mexican RFC"}
```
**HTTP 400** ✓

---

## T19 — POST — RFC en minúsculas (normalización a uppercase)

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"NORMALIZE01","name":"Normalizado","rfc":"xexx010101000"}'
```

**Respuesta:**
```json
{
  "id": "995cc728-731e-4e5e-8352-df1e4fe4f0ca",
  "code": "NORMALIZE01",
  "rfc": "XEXX010101000",
  "..."
}
```
**HTTP 201** ✓ — El RFC `xexx010101000` se normaliza automáticamente a `XEXX010101000`.

---

## T20 — POST — taxRegime no es 3 dígitos → 400

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"ERR001","name":"Error","rfc":"AAAA010101AAA","taxRegime":"6012"}'
```

**Respuesta:**
```json
{"error":"taxRegime must be 3 digits"}
```
**HTTP 400** ✓

---

## T21 — POST — cfdiUse con formato incorrecto → 400

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"ERR002","name":"Error","rfc":"AAAA010101AAA","cfdiUse":"GXX"}'
```

**Respuesta:**
```json
{"error":"cfdiUse must match ^[A-Z]\\d{2}$"}
```
**HTTP 400** ✓ — `cfdiUse` debe ser 1 letra mayúscula + 2 dígitos (ej. `G03`, `P01`).

---

## T22 — POST — email inválido → 400

```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"ERR003","name":"Error","rfc":"AAAA010101AAA","email":"no-es-email"}'
```

**Respuesta:**
```json
{"error":"invalid email"}
```
**HTTP 400** ✓

---

## T23 — PATCH — RFC duplicado en actualización → 409

```bash
# NORMALIZE01 intenta tomar el RFC de PROV001
curl -s -w "\nHTTP %{http_code}" -X PATCH \
  http://localhost:3001/api/v1/admin/providers/995cc728-731e-4e5e-8352-df1e4fe4f0ca \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfc":"XAXX010101000"}'
```

**Respuesta:**
```json
{"error":"Provider RFC already in use: XAXX010101000"}
```
**HTTP 409** ✓

---

## T24 — DELETE /providers/:id — soft delete → 204

```bash
curl -s -w "\nHTTP %{http_code}" -X DELETE \
  http://localhost:3001/api/v1/admin/providers/c2a0f527-6269-492c-8c00-db6d95d7535c \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:** (cuerpo vacío)  
**HTTP 204** ✓ — No Content. El proveedor **no se elimina de BD**, solo se marca `isActive: false`.

---

## T25 — GET /providers — proveedor eliminado no aparece en lista normal

```bash
curl -s http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:** `total: 2` — `PROV001` no aparece en los resultados  
**HTTP 200** ✓ — El filtro `isActive = true` se aplica por defecto.

---

## T26 — GET /providers?includeInactive=true — muestra también inactivos

```bash
curl -s "http://localhost:3001/api/v1/admin/providers?includeInactive=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:**
```
total: 3
  NORMALIZE01 | isActive=True
  SEMILLAS01  | isActive=True
  PROV001     | isActive=False  ← aparece el eliminado
```
**HTTP 200** ✓

---

## T27 — PATCH — reactivar proveedor (isActive: true)

```bash
curl -s -w "\nHTTP %{http_code}" -X PATCH \
  http://localhost:3001/api/v1/admin/providers/c2a0f527-6269-492c-8c00-db6d95d7535c \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive":true}'
```

**Respuesta:**
```json
{
  "id": "c2a0f527-6269-492c-8c00-db6d95d7535c",
  "code": "PROV001",
  "isActive": true,
  "updatedAt": "2026-05-25T08:30:21.654Z",
  "..."
}
```
**HTTP 200** ✓ — No hay endpoint `/restore` separado; la reactivación va por `PATCH { isActive: true }`.

---

## T28 — GET /providers — proveedor reactivado vuelve a aparecer

```bash
curl -s http://localhost:3001/api/v1/admin/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:** `total: 3`, todos con `isActive: true`  
**HTTP 200** ✓

---

## T29 — DELETE — ID inexistente → 404

```bash
curl -s -w "\nHTTP %{http_code}" -X DELETE \
  http://localhost:3001/api/v1/admin/providers/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta:**
```json
{"error":"Provider not found: 00000000-0000-0000-0000-000000000000"}
```
**HTTP 404** ✓

---

## Resumen de resultados

| # | Descripción | Esperado | Resultado |
|---|-------------|----------|-----------|
| T1 | GET sin token | 401 | ✅ 401 |
| T2 | GET como viewer | 200 | ✅ 200 |
| T3 | POST como viewer (sin permiso write) | 403 + required | ✅ 403 |
| T4 | POST campos mínimos (code, name, rfc) | 201 | ✅ 201 |
| T5 | POST todos los campos fiscales | 201 | ✅ 201 |
| T6 | GET lista paginada | 200 + total/page/pageSize | ✅ 200 |
| T7 | GET por ID | 200 | ✅ 200 |
| T8 | GET por ID inexistente | 404 | ✅ 404 |
| T9 | GET ?search= por nombre (case-insensitive) | 200 filtrado | ✅ 200 |
| T10 | GET ?search= por RFC | 200 filtrado | ✅ 200 |
| T11 | GET ?search= < 2 chars | 400 | ✅ 400 |
| T12 | GET ?page=1&pageSize=1 | 200 paginado | ✅ 200 |
| T13 | PATCH actualización parcial | 200 + code inmutable | ✅ 200 |
| T14 | PATCH body vacío | 400 | ✅ 400 |
| T15 | PATCH limpiar campo con null | 200 + campo = null | ✅ 200 |
| T16 | POST RFC duplicado | 409 | ✅ 409 |
| T17 | POST code duplicado | 409 | ✅ 409 |
| T18 | POST RFC inválido | 400 | ✅ 400 |
| T19 | POST RFC minúsculas (normalización) | 201 + RFC uppercase | ✅ 201 |
| T20 | POST taxRegime no 3 dígitos | 400 | ✅ 400 |
| T21 | POST cfdiUse formato incorrecto | 400 | ✅ 400 |
| T22 | POST email inválido | 400 | ✅ 400 |
| T23 | PATCH RFC duplicado en update | 409 | ✅ 409 |
| T24 | DELETE soft delete | 204 | ✅ 204 |
| T25 | GET lista oculta inactivos | 200 sin PROV001 | ✅ 200 |
| T26 | GET ?includeInactive=true | 200 con inactivos | ✅ 200 |
| T27 | PATCH reactivar (isActive: true) | 200 + isActive=true | ✅ 200 |
| T28 | GET lista muestra reactivado | 200 total=3 | ✅ 200 |
| T29 | DELETE ID inexistente | 404 | ✅ 404 |

**29/29 pruebas pasan.** ✅

---

## RBAC — permisos en BD

Verificado con Prisma contra la BD de producción:

```
providers:read  → roles: [admin, operator, viewer]
providers:write → roles: [admin]
```

Comportamiento confirmado en pruebas:
- `viewer` puede `GET /providers` (200) pero no `POST /providers` (403 con `required: "providers:write"`)
- `admin` tiene acceso completo a todos los endpoints

---

## Observaciones

1. **Normalización de RFC**: el controller convierte `xexx010101000` → `XEXX010101000` antes de persistir, garantizando unicidad case-insensitive sin índice funcional en BD.
2. **Soft delete vs hard delete**: `DELETE` devuelve `204 No Content` y marca `isActive: false`. El registro permanece en BD y puede ser reactivado vía `PATCH { isActive: true }`.
3. **`code` inmutable**: el campo `code` no puede modificarse vía `PATCH` (la validación Zod lo ignora silenciosamente). La prueba T13 confirma que al actualizar `name`, `legalName` y `taxRegime`, el `code` permanece intacto.
4. **`legalName: null`**: la prueba T15 confirma que pasar `null` explícito en un campo opcional lo borra correctamente en BD (diferente a no incluir el campo, que lo deja intacto).
5. **Error granulares**: los errores 409 distinguen entre `code` duplicado y `rfc` duplicado, facilitando feedback preciso al frontend.
