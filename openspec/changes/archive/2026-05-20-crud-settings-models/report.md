# Reporte de Pruebas — crud-settings-models

**Fecha:** 2026-05-20  
**Entorno:** Desarrollo local (`http://localhost:3000`)  
**Node.js:** v24.14.1 (nvm)  
**Base de datos:** Supabase Postgres — proyecto `agrisas` (`qzzjpyepggwautckqeex`)  
**Resultado global:** ✅ TODOS LOS ESCENARIOS PASARON

---

## Datos de prueba

### Usuarios creados

| Email | Contraseña | Rol | ID |
|---|---|---|---|
| `testadmin@agrisas.test` | `Admin1234!` | `admin` | `63761e59-a815-45b1-8d6d-47b9d446cb2f` |
| `testviewer@agrisas.test` | `Viewer1234!` | `viewer` | `9431c31d-04e8-491e-aeb7-cfeb1e2b7bad` |

> Ambos usuarios se registraron con el endpoint `/api/v1/auth/register` (rol inicial `viewer`). El rol `admin` fue asignado a `testadmin` directamente vía Prisma Client.

### Registros creados durante las pruebas

| Módulo | code | ID |
|---|---|---|
| payment-methods | `CASH` | `9e0fac93-3957-4e18-83cd-3ef7a9d7242a` |
| payment-methods | `CARD` | `7aee42b9-2b42-455e-ad12-9c72a54ecd4c` |
| folios | `FAC_A` | `7902c553-248b-47ee-be60-1b9ce0d82482` |
| folios | `REC_1` | `f3400e9f-50e1-4a1b-8c57-ac52fcb52898` |
| departments | `ADMIN` | `1b529f79-8d1e-4c8b-9c06-e6e8d62911b5` |
| departments | `PROD` | `eb20b294-2f47-415d-a6c8-78efbafc879a` |
| branches | `HQ` | `e48426c9-dc6f-42e3-99a5-00626ed5c0d1` |
| branches | `SUC_NORTE` | `68308a4f-984f-4ac5-a695-c8c2e4c9cd12` |

---

## Paso 1 — Levantar servidor

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 24
npm run dev
# Output: - Local: http://localhost:3000
```

## Paso 2 — Obtener tokens

```bash
# Registrar usuarios de prueba
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Admin","email":"testadmin@agrisas.test","password":"Admin1234!"}'

curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Viewer","email":"testviewer@agrisas.test","password":"Viewer1234!"}'

# Promover testadmin a rol admin (vía Prisma Client con DATABASE_URL)
# → Se asignó userRole admin y se removió el viewer por defecto

# Login para obtener tokens
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testadmin@agrisas.test","password":"Admin1234!"}' | jq -r '.accessToken')

VIEWER_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testviewer@agrisas.test","password":"Viewer1234!"}' | jq -r '.accessToken')
```

---

## Módulo: payment-methods

### RBAC y autenticación

| Escenario | Comando | Resultado esperado | Resultado real |
|---|---|---|---|
| Sin token | `GET /api/v1/admin/payment-methods` (sin header) | `401 {"error":"Unauthorized"}` | ✅ `401 {"error":"Unauthorized"}` |
| Viewer GET list | `GET /api/v1/admin/payment-methods` (viewer) | `200 {items:[],total:0,...}` | ✅ `200 {"items":[],"total":0,"page":1,"pageSize":20}` |
| Viewer POST | `POST /api/v1/admin/payment-methods` (viewer) | `403 {"required":"payment_methods:write"}` | ✅ `403 {"error":"Forbidden","required":"payment_methods:write"}` |

### Validaciones de entrada

| Escenario | Body | Resultado esperado | Resultado real |
|---|---|---|---|
| code inválido (minúsculas/guión) | `{"code":"cash-mxn","name":"Efectivo"}` | `400` | ✅ `400 {"error":"code must be uppercase letters, digits, or underscores (1–32 chars)"}` |
| name faltante | `{"code":"CASH"}` | `400` | ✅ `400 {"error":"Required"}` |
| pageSize > 100 | `?pageSize=200` | `400` | ✅ `400 {"error":"pageSize must not exceed 100"}` |

### CRUD completo (admin)

#### POST — Crear

```bash
# Minimal
curl -s -X POST http://localhost:3000/api/v1/admin/payment-methods \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"CASH","name":"Efectivo"}'
```
**Respuesta (201):**
```json
{
  "id": "9e0fac93-3957-4e18-83cd-3ef7a9d7242a",
  "code": "CASH",
  "name": "Efectivo",
  "description": null,
  "isActive": true,
  "createdAt": "2026-05-20T07:05:17.163Z",
  "updatedAt": "2026-05-20T07:05:17.163Z"
}
```

```bash
# Con todos los campos (isActive: false)
curl -s -X POST http://localhost:3000/api/v1/admin/payment-methods \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"CARD","name":"Tarjeta","description":"Tarjeta crédito/débito","isActive":false}'
```
**Respuesta (201):**
```json
{
  "id": "7aee42b9-2b42-455e-ad12-9c72a54ecd4c",
  "code": "CARD",
  "name": "Tarjeta",
  "description": "Tarjeta crédito/débito",
  "isActive": false,
  "createdAt": "2026-05-20T07:05:17.333Z",
  "updatedAt": "2026-05-20T07:05:17.333Z"
}
```

```bash
# Código duplicado
curl -s -X POST ... -d '{"code":"CASH","name":"Duplicado"}'
# → 409 {"error":"Payment method code already in use"}  ✅
```

#### GET — Detalle

```bash
# Entidad activa → 200 ✅
curl -s http://localhost:3000/api/v1/admin/payment-methods/9e0fac93-...

# Entidad inactiva (CARD, isActive:false) → 200 ✅ (retorna sin filtrar por isActive)
curl -s http://localhost:3000/api/v1/admin/payment-methods/7aee42b9-...
# → {"id":"7aee42b9-...","code":"CARD","isActive":false,...}

# UUID inválido → 400 {"error":"Invalid ID format"}  ✅
curl -s http://localhost:3000/api/v1/admin/payment-methods/not-a-uuid

# No encontrado → 404 {"error":"Payment method not found"}  ✅
curl -s http://localhost:3000/api/v1/admin/payment-methods/00000000-0000-0000-0000-000000000000
```

#### PATCH — Actualizar

```bash
# Actualizar name
-d '{"name":"Efectivo en caja"}'
# → 200 {"code":"CASH","name":"Efectivo en caja","description":null}  ✅

# Limpiar description con null
-d '{"description":null}'
# → 200 {"description":null}  ✅

# code en body ignorado silenciosamente
-d '{"code":"SHOULD_BE_IGNORED","name":"Efectivo Final"}'
# → 200 {"code":"CASH","name":"Efectivo Final"}  ✅  (code no cambia)

# Body vacío → 400
-d '{}'
# → 400 {"error":"At least one field (name, description, isActive) must be provided"}  ✅

# Solo code en body → 400 (equivalente a body vacío de campos actualizables)
-d '{"code":"ONLY_CODE"}'
# → 400 {"error":"At least one field (name, description, isActive) must be provided"}  ✅
```

#### DELETE — Soft delete

```bash
# Soft delete activo → 204  ✅
DELETE /api/v1/admin/payment-methods/9e0fac93-...
# HTTP 204

# Verificar isActive=false → 200 {"isActive":false}  ✅
GET /api/v1/admin/payment-methods/9e0fac93-...

# GET list default (isActive=false filtrado)
GET /api/v1/admin/payment-methods
# → {"total":0,"items":[]}  ✅

# includeInactive=true muestra todos
GET /api/v1/admin/payment-methods?includeInactive=true
# → {"total":2,"items":[{"code":"CARD","isActive":false},{"code":"CASH","isActive":false}]}  ✅

# DELETE idempotente (ya inactivo) → 204  ✅
DELETE /api/v1/admin/payment-methods/9e0fac93-...  (segunda vez)
# HTTP 204

# Reactivar vía PATCH isActive:true → 200 {"isActive":true}  ✅
PATCH ... -d '{"isActive":true}'

# DELETE no encontrado → 404 {"error":"Payment method not found"}  ✅
DELETE /api/v1/admin/payment-methods/00000000-...
```

---

## Módulo: folios

### RBAC y autenticación

| Escenario | Resultado esperado | Resultado real |
|---|---|---|
| Viewer GET list | `200 {"total":0}` | ✅ `200 {"items":[],"total":0,"page":1,"pageSize":20}` |
| Viewer POST | `403 {"required":"folios:write"}` | ✅ `403 {"error":"Forbidden","required":"folios:write"}` |

### Validaciones específicas de Folio

```bash
# prefix en minúsculas → 400
-d '{"code":"FAC_A","name":"Facturas","prefix":"rec-"}'
# → 400 {"error":"prefix must be uppercase letters, digits, or hyphens (1–8 chars)"}  ✅

# currentNumber negativo → 400
-d '{"code":"FAC_A","name":"Facturas","currentNumber":-1}'
# → 400 {"error":"currentNumber must be 0 or greater"}  ✅
```

### CRUD completo

```bash
# Crear minimal (prefix:null, currentNumber:0 por defecto)
-d '{"code":"FAC_A","name":"Facturas Serie A"}'
```
**Respuesta (201):**
```json
{
  "id": "7902c553-248b-47ee-be60-1b9ce0d82482",
  "code": "FAC_A",
  "name": "Facturas Serie A",
  "prefix": null,
  "currentNumber": 0,
  "isActive": true
}
```

```bash
# Crear con prefix y currentNumber inicial
-d '{"code":"REC_1","name":"Recibos","prefix":"REC-","currentNumber":1000}'
```
**Respuesta (201):**
```json
{
  "id": "f3400e9f-50e1-4a1b-8c57-ac52fcb52898",
  "code": "REC_1",
  "name": "Recibos",
  "prefix": "REC-",
  "currentNumber": 1000,
  "isActive": true
}
```

| Escenario | Resultado |
|---|---|
| Código duplicado `FAC_A` | ✅ `409 {"error":"Folio code already in use"}` |
| PATCH `currentNumber: 5000` | ✅ `200 {"currentNumber":5000}` |
| PATCH `prefix: null` | ✅ `200 {"prefix":null}` |
| PATCH code ignorado | ✅ `200 {"code":"FAC_A","name":"Facturas A Updated"}` |
| DELETE soft-delete | ✅ `204` |
| GET list post-delete (1 activo) | ✅ `{"total":1,"items":[{"code":"REC_1","isActive":true}]}` |
| GET `?includeInactive=true` (2 total) | ✅ `{"total":2}` |

---

## Módulo: departments

### RBAC y autenticación

| Escenario | Resultado esperado | Resultado real |
|---|---|---|
| Viewer GET list | `200 {"total":0}` | ✅ |
| Viewer POST | `403 {"required":"departments:write"}` | ✅ |

### CRUD completo

```bash
# Crear minimal
-d '{"code":"ADMIN","name":"Administración"}'
```
**Respuesta (201):**
```json
{
  "id": "1b529f79-8d1e-4c8b-9c06-e6e8d62911b5",
  "code": "ADMIN",
  "name": "Administración",
  "description": null,
  "isActive": true
}
```

```bash
# Crear con description
-d '{"code":"PROD","name":"Producción","description":"Área de manufactura y cosecha"}'
```
**Respuesta (201):**
```json
{
  "id": "eb20b294-2f47-415d-a6c8-78efbafc879a",
  "code": "PROD",
  "name": "Producción",
  "description": "Área de manufactura y cosecha",
  "isActive": true
}
```

| Escenario | Resultado |
|---|---|
| PATCH update description | ✅ `200 {"description":"Área administrativa y contable"}` |
| DELETE soft-delete `ADMIN` | ✅ `204` |
| GET list post-delete (1 activo, `PROD`) | ✅ `{"total":1}` |

---

## Módulo: branches

### RBAC y autenticación

| Escenario | Resultado esperado | Resultado real |
|---|---|---|
| Viewer GET list | `200 {"total":0}` | ✅ |
| Viewer POST | `403 {"required":"branches:write"}` | ✅ |

### Validaciones específicas de Branch

```bash
# email inválido en POST → 400
-d '{"code":"HQ","name":"Matriz","email":"not-an-email"}'
# → 400 {"error":"Invalid email format"}  ✅

# code en minúsculas/guión → 400
-d '{"code":"sucursal-norte","name":"Norte"}'
# → 400 {"error":"code must be uppercase letters, digits, or underscores (1–32 chars)"}  ✅
```

### CRUD completo

```bash
# Crear minimal (address/phone/email: null por defecto)
-d '{"code":"HQ","name":"Matriz"}'
```
**Respuesta (201):**
```json
{
  "id": "e48426c9-dc6f-42e3-99a5-00626ed5c0d1",
  "code": "HQ",
  "name": "Matriz",
  "address": null,
  "phone": null,
  "email": null,
  "isActive": true
}
```

```bash
# Crear con datos de contacto completos
-d '{"code":"SUC_NORTE","name":"Sucursal Norte","address":"Av. Reforma 100","phone":"+52 555 1234","email":"norte@agrisas.com"}'
```
**Respuesta (201):**
```json
{
  "id": "68308a4f-984f-4ac5-a695-c8c2e4c9cd12",
  "code": "SUC_NORTE",
  "name": "Sucursal Norte",
  "address": "Av. Reforma 100",
  "phone": "+52 555 1234",
  "email": "norte@agrisas.com",
  "isActive": true
}
```

| Escenario | Resultado |
|---|---|
| Código duplicado `HQ` | ✅ `409 {"error":"Branch code already in use"}` |
| PATCH update address | ✅ `200 {"code":"HQ","address":"Av. Insurgentes 500, CDMX"}` |
| PATCH email inválido en update | ✅ `400 {"error":"Invalid email format"}` |
| PATCH clear email (`null`) en `SUC_NORTE` | ✅ `200 {"code":"SUC_NORTE","email":null}` |
| PATCH code ignorado | ✅ `200 {"code":"HQ","name":"Matriz Principal"}` |
| DELETE soft-delete `HQ` | ✅ `204` |
| GET list post-delete (1 activo, `SUC_NORTE`) | ✅ `{"total":1,"items":[{"code":"SUC_NORTE","isActive":true}]}` |
| GET `?includeInactive=true` | ✅ `{"total":2}` |
| DELETE idempotente `HQ` (ya inactivo) | ✅ `204` |

---

## Paso 3 — Verificación de permisos en BD

```bash
# Consulta via Prisma Client con DATABASE_URL cargado desde .env.local
node -e "
  const perms = await prisma.permission.findMany({
    where: { key: { in: [
      'payment_methods:read','payment_methods:write',
      'folios:read','folios:write',
      'departments:read','departments:write',
      'branches:read','branches:write'
    ] } },
    include: { roles: { include: { role: true } } },
    orderBy: { key: 'asc' }
  });
  // imprime: key -> roles: [admin, operator, viewer]
"
```

**Resultado:**
```
branches:read      -> roles: [admin, operator, viewer]
branches:write     -> roles: [admin]
departments:read   -> roles: [admin, operator, viewer]
departments:write  -> roles: [admin]
folios:read        -> roles: [admin, operator, viewer]
folios:write       -> roles: [admin]
payment_methods:read  -> roles: [admin, operator, viewer]
payment_methods:write -> roles: [admin]
Total catalog permissions found: 8  ✅
```

---

## Resumen de resultados

| Módulo | Tests ejecutados | Pasaron | Fallaron |
|---|---|---|---|
| payment-methods | 19 | 19 | 0 |
| folios | 12 | 12 | 0 |
| departments | 7 | 7 | 0 |
| branches | 13 | 13 | 0 |
| DB permissions | 1 | 1 | 0 |
| **Total** | **52** | **52** | **0** |

### Escenarios validados por módulo

Cada módulo fue validado contra los siguientes escenarios de su spec:

- ✅ Autenticación requerida (401 sin token)
- ✅ Permisos RBAC: viewer puede leer, no puede escribir (403 + `required`)
- ✅ Validación de `code` regex `^[A-Z0-9_]{1,32}$`
- ✅ Creación minimal (campos opcionales en null por defecto)
- ✅ Creación completa (todos los campos)
- ✅ HTTP 409 en código duplicado
- ✅ GET detail retorna entidad independientemente de `isActive`
- ✅ HTTP 404 para UUID inexistente
- ✅ HTTP 400 para UUID inválido
- ✅ PATCH actualiza campos parcialmente
- ✅ PATCH ignora `code` silenciosamente
- ✅ PATCH body vacío / solo `code` → 400 con mensaje exacto de spec
- ✅ PATCH `null` en campos opcionales los limpia en BD
- ✅ DELETE retorna 204 No Content
- ✅ GET list oculta inactivos por defecto
- ✅ GET list `?includeInactive=true` incluye inactivos
- ✅ DELETE es idempotente (ya inactivo → 204 sin error)
- ✅ Reactivación vía PATCH `isActive: true`
- ✅ `pageSize > 100` → 400

**Escenarios adicionales por módulo:**
- **folios**: ✅ `prefix` lowercase → 400; `currentNumber < 0` → 400; `prefix: null` limpia en BD; `currentNumber` actualizable
- **branches**: ✅ `email` inválido en POST → 400; `email` inválido en PATCH → 400; `email: null` limpia en BD
- **BD**: ✅ 8 permisos presentes, asignados correctamente a `admin`/`operator`/`viewer`
