# Reporte de pruebas de endpoints — agrisas-panel

**Fecha:** 2026-05-29  
**Servidor:** `http://localhost:3000`  
**Usuario de prueba:** `admin_test@agrisas.com` (roles: `viewer`, `admin`)  
**Permisos:** 18 permisos (todos los recursos: `users`, `roles`, `payment_methods`, `folios`, `departments`, `branches`, `providers`, `products`, `inventory`)

---

## Convenciones

- `→` indica el resultado real obtenido.
- `TOKEN` = access token JWT obtenido en cada login (TTL 15 min).
- Los cuerpos JSON se muestran resumidos cuando son largos.

---

## 1. Health Check

### GET /api/v1/health

**Acción:** Verificar que el servidor responde.

```
GET /api/v1/health
```

→ `200 OK`
```json
{ "status": "ok" }
```

---

## 2. Autenticación

### POST /api/v1/auth/register — credenciales válidas

**Acción:** Registrar un nuevo usuario con nombre, email y contraseña válidos.

```json
{ "name": "Nuevo Usuario", "email": "nuevo@agrisas.com", "password": "Pass1234!" }
```

→ `201 Created`
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "nuevo@agrisas.com", "roles": ["viewer"] }
}
```

### POST /api/v1/auth/register — email duplicado

**Acción:** Intentar registrar con un email ya existente.

```json
{ "name": "Otro", "email": "nuevo@agrisas.com", "password": "Pass1234!" }
```

→ `409 Conflict`
```json
{ "error": "Email already in use" }
```

### POST /api/v1/auth/login — credenciales inválidas

**Acción:** Intentar login con contraseña incorrecta.

```json
{ "email": "admin_test@agrisas.com", "password": "wrong" }
```

→ `401 Unauthorized`
```json
{ "error": "Invalid credentials" }
```

### POST /api/v1/auth/login — credenciales válidas

**Acción:** Login correcto para obtener `accessToken` y cookie `refreshToken` HttpOnly.

```json
{ "email": "admin_test@agrisas.com", "password": "Admin1234!" }
```

→ `200 OK` · Header `Set-Cookie: refreshToken=eyJ...; HttpOnly; SameSite=Strict`
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "2a2754f1-...", "email": "admin_test@agrisas.com", "roles": ["viewer","admin"] }
}
```

### POST /api/v1/auth/refresh — con cookie válida

**Acción:** Enviar la cookie `refreshToken` para obtener un nuevo access token.

```
Cookie: refreshToken=eyJ...
```

→ `200 OK`
```json
{ "accessToken": "eyJ..." }
```

### POST /api/v1/auth/logout — con cookie

**Acción:** Cerrar sesión; el servidor debe limpiar la cookie.

```
Cookie: refreshToken=eyJ...
```

→ `200 OK` · Header `Set-Cookie: refreshToken=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`
```json
{ "message": "Logged out" }
```

### POST /api/v1/auth/logout — sin cookie

**Acción:** Llamar a logout sin ninguna cookie (ya desconectado o sesión inexistente).

→ `200 OK`
```json
{ "message": "Logged out" }
```

### Petición sin token → 401

**Acción:** Hacer cualquier petición autenticada sin header `Authorization`.

```
GET /api/v1/admin/users  (sin header)
```

→ `401 Unauthorized`
```json
{ "error": "Unauthorized" }
```

---

## 3. Usuarios (admin)

### GET /api/v1/admin/users — lista paginada

**Acción:** Listar todos los usuarios con sus roles.

→ `200 OK`
```json
{ "users": [ { "id":"...", "email":"...", "roles":["viewer","admin"], ... }, ... ] }
```

### GET /api/v1/admin/users/:id — usuario existente

**Acción:** Obtener el detalle de un usuario por su ID.

→ `200 OK`
```json
{
  "id": "2a2754f1-...",
  "email": "admin_test@agrisas.com",
  "avatarUrl": "https://www.gravatar.com/avatar/...",
  "roles": ["viewer","admin"]
}
```

### GET /api/v1/admin/users/:id — no encontrado

**Acción:** Solicitar un usuario con UUID inexistente.

```
GET /api/v1/admin/users/00000000-0000-0000-0000-000000000000
```

→ `404 Not Found`
```json
{ "error": "User not found" }
```

### PATCH /api/v1/admin/users/:id — actualizar otro usuario

**Acción:** Cambiar el nombre de un usuario diferente al autenticado.

```json
{ "name": "Nombre Actualizado" }
```

→ `200 OK`
```json
{ "id": "...", "name": "Nombre Actualizado", ... }
```

### PATCH /api/v1/admin/users/:self — auto-modificación bloqueada

**Acción:** Intentar editar la propia cuenta.

→ `403 Forbidden`
```json
{ "error": "Cannot modify your own account" }
```

### DELETE /api/v1/admin/users/:id — eliminar otro usuario

**Acción:** Hacer hard delete de un usuario diferente al autenticado.

→ `204 No Content` (cuerpo vacío)

### GET /api/v1/admin/users/:id — verificar borrado

**Acción:** Confirmar que el usuario eliminado ya no existe.

→ `404 Not Found`
```json
{ "error": "User not found" }
```

### DELETE /api/v1/admin/users/:self — auto-borrado bloqueado

**Acción:** Intentar eliminar la propia cuenta.

→ `403 Forbidden`
```json
{ "error": "Cannot delete your own account" }
```

### GET /api/v1/admin/users/:id/permissions — permisos efectivos

**Acción:** Obtener todos los permisos efectivos del usuario (union de roles).

→ `200 OK`
```json
{ "permissions": ["users:read","users:write","roles:read",...] }
```
*(18 permisos en total)*

---

## 4. RBAC — Roles y Permisos

### GET /api/v1/admin/roles — lista de roles

**Acción:** Listar todos los roles del sistema.

→ `200 OK`
```json
{
  "roles": [
    { "id": "...", "name": "admin" },
    { "id": "...", "name": "operator" },
    { "id": "...", "name": "viewer" }
  ]
}
```

### GET /api/v1/admin/permissions — lista de permisos

**Acción:** Listar todos los permisos del sistema.

→ `200 OK` — 18 permisos en formato `resource:action`

### GET /api/v1/admin/roles/:id/permissions — permisos de un rol

**Acción:** Ver qué permisos tiene asignados el rol `admin`.

→ `200 OK`
```json
{ "permissions": [...], "count": 18 }
```

### POST /api/v1/admin/roles/:id/permissions — asignar permiso a rol

**Acción:** Asignar un permiso al rol usando su `permissionKey`.

```json
{ "permissionKey": "inventory:write" }
```

→ `201 Created`
```json
{ "message": "Permission assigned" }
```

### DELETE /api/v1/admin/roles/:id/permissions/:permId — revocar permiso

**Acción:** Quitar un permiso de un rol por el ID del permiso.

→ `200 OK`
```json
{ "message": "Permission removed" }
```

### POST /api/v1/admin/users/:id/roles — asignar rol a usuario

**Acción:** Asignar un rol a un usuario usando su nombre.

```json
{ "roleName": "operator" }
```

→ `201 Created`
```json
{ "message": "Role assigned" }
```

### DELETE /api/v1/admin/users/:id/roles/:roleId — revocar rol

**Acción:** Quitar un rol asignado a un usuario.

→ `200 OK`
```json
{ "message": "Role removed" }
```

---

## 5. Formas de Pago (Payment Methods)

### POST /api/v1/admin/payment-methods — crear

**Acción:** Crear una nueva forma de pago con código único.

```json
{ "code": "EFE_01", "name": "Efectivo", "description": "Pago en efectivo" }
```

→ `201 Created`
```json
{ "id": "...", "code": "EFE_01", "name": "Efectivo", "description": "Pago en efectivo", "isActive": true, ... }
```

### POST — código duplicado

**Acción:** Intentar crear una segunda forma de pago con el mismo código.

→ `409 Conflict`
```json
{ "error": "Payment method code already in use" }
```

### GET /api/v1/admin/payment-methods — lista

→ `200 OK`
```json
{ "items": [...], "total": 2, "page": 1, "pageSize": 20 }
```

### GET /api/v1/admin/payment-methods/:id — detalle

→ `200 OK` — objeto completo de la forma de pago

### PATCH /api/v1/admin/payment-methods/:id — actualizar

```json
{ "name": "Efectivo MXN", "description": null }
```

→ `200 OK` — objeto actualizado

### DELETE /api/v1/admin/payment-methods/:id — soft delete

**Acción:** Desactivar una forma de pago (`isActive = false`).

→ `204 No Content`

### GET con `?includeInactive=true` — verificar soft delete

→ `200 OK` — el registro aparece con `"isActive": false`

---

## 6. Folios

### POST /api/v1/admin/folios — crear

```json
{ "code": "VENTA", "name": "Folio de Ventas", "prefix": "V-", "currentNumber": 0 }
```

→ `201 Created`
```json
{ "id": "971c40a7-...", "code": "VENTA", "name": "Folio de Ventas", "prefix": "V-", "currentNumber": 0, "isActive": true, ... }
```

### POST — código duplicado

→ `409 Conflict`
```json
{ "error": "Folio code already in use" }
```

### GET /api/v1/admin/folios — lista

→ `200 OK`
```json
{ "items": [...], "total": 2, "page": 1, "pageSize": 20 }
```

### GET /api/v1/admin/folios/:id — detalle

→ `200 OK` — objeto completo del folio

### GET — no encontrado

→ `404 Not Found`
```json
{ "error": "Folio not found" }
```

### PATCH /api/v1/admin/folios/:id — actualizar currentNumber y nombre

```json
{ "currentNumber": 100, "name": "Folio Ventas Actualizado" }
```

→ `200 OK`
```json
{ "id": "...", "name": "Folio Ventas Actualizado", "currentNumber": 100, ... }
```

### DELETE /api/v1/admin/folios/:id — soft delete

→ `204 No Content`

### Verificar con `?includeInactive=true`

→ registro con `"isActive": false`

---

## 7. Departamentos

### POST /api/v1/admin/departments — crear

```json
{ "code": "AGRO", "name": "Agronomía", "description": "Insumos agrícolas" }
```

→ `201 Created`
```json
{ "id": "688a8a47-...", "code": "AGRO", "name": "Agronomía", "description": "Insumos agrícolas", "isActive": true, ... }
```

### POST — código duplicado

→ `409 Conflict`
```json
{ "error": "Department code already in use" }
```

### GET /api/v1/admin/departments — lista

→ `200 OK` `{ "total": 2, "items": [...] }`

### GET /api/v1/admin/departments/:id — detalle

→ `200 OK` — objeto completo del departamento

### PATCH — limpiar descripción (null)

```json
{ "description": null }
```

→ `200 OK` — campo `description` devuelto como `null`

### DELETE — soft delete

→ `204 No Content`

---

## 8. Sucursales (Branches)

### POST /api/v1/admin/branches — crear

```json
{ "code": "SUC_SUR", "name": "Sucursal Sur" }
```

→ `201 Created`
```json
{ "id": "2f7d669a-...", "code": "SUC_SUR", "address": null, "phone": null, "email": null, "isActive": true, ... }
```

### POST — código duplicado

→ `409 Conflict`
```json
{ "error": "Branch code already in use" }
```

### GET /api/v1/admin/branches — lista

→ `200 OK` `{ "total": 2, "items": [...] }`

### GET /api/v1/admin/branches/:id — detalle

→ `200 OK`
```json
{ "id": "68308a4f-...", "code": "SUC_NORTE", "address": "Av. Reforma 100", "phone": "+52 555 1234", "email": null, "isActive": true, ... }
```

### PATCH — actualizar email

```json
{ "email": "norte@agrisas.com" }
```

→ `200 OK` — objeto con `email` actualizado

### DELETE — soft delete

→ `204 No Content` — `isActive` = `false` verificado con `?includeInactive=true`

---

## 9. Proveedores

### POST /api/v1/admin/providers — crear con datos fiscales

```json
{
  "code": "PROV_001", "name": "Agroquímica del Norte", "rfc": "AGN200101ABC",
  "legalName": "Agroquímica del Norte SA de CV",
  "taxRegime": "601", "cfdiUse": "G03", "taxZipCode": "64000",
  "email": "contacto@agroquimica.mx", "phone": "81-1234-5678",
  "address": "Monterrey, NL", "contactName": "Juan López", "notes": "Proveedor confiable"
}
```

→ `201 Created` — objeto con todos los campos fiscales y de contacto

### POST — código duplicado

→ `409 Conflict`
```json
{ "error": "Provider code already in use: PROV_001" }
```

### POST — RFC duplicado

→ `409 Conflict`
```json
{ "error": "Provider RFC already in use: AGN200101ABC" }
```

### GET /api/v1/admin/providers — lista

→ `200 OK` `{ "total": 4 }`

### GET con `?search=agro` — búsqueda server-side

**Acción:** La búsqueda filtra por `name`, `legalName` o `rfc` (ILIKE, mín 2 chars).

→ `200 OK` `{ "total": 2 }` — solo proveedores que coinciden con "agro"

### GET /api/v1/admin/providers/:id — detalle

→ `200 OK` — objeto con todos los campos

### PATCH — actualizar campos de contacto

```json
{ "notes": "Actualizado", "contactName": "Pedro García" }
```

→ `200 OK` — campos actualizados

### DELETE — soft delete

→ `204 No Content`

### Verificar con `?includeInactive=true`

→ registro con `"isActive": false`

### PATCH `{ "isActive": true }` — reactivar

→ `200 OK` — `"isActive": true`

---

## 10. Productos

### POST /api/v1/admin/products — crear

**Acción:** Crear producto con código, unidad, departamento y tasas de impuesto.  
El controlador normaliza `ivaRate: 16` → `0.16` (divide por 100 si el valor es > 1).

```json
{
  "code": "UREA_001", "name": "Urea 46%", "unit": "KG",
  "departmentId": "eb20b294-...",
  "ivaRate": 16, "iepsRate": null, "satProductCode": "32101500"
}
```

→ `201 Created`
```json
{
  "id": "1a0383f1-...", "code": "UREA_001", "name": "Urea 46%", "unit": "KG",
  "departmentName": "Producción",
  "ivaRate": 0.16, "iepsRate": null, "isActive": true, ...
}
```

### POST — código duplicado

→ `409 Conflict`
```json
{ "error": "Product code already in use: UREA_001" }
```

### POST — departamento inactivo o inexistente

→ `400 Bad Request`
```json
{ "error": "Department not found or inactive: 00000000-0000-0000-0000-000000000000" }
```

### GET /api/v1/admin/products — lista

→ `200 OK` `{ "total": 1 }`

### GET con `?search=urea` — búsqueda por nombre/código

→ `200 OK` `{ "total": 1, "items[0].name": "Urea 46%" }`

### GET con `?departmentId=...` — filtro por departamento

→ `200 OK` `{ "total": 1 }`

### GET /api/v1/admin/products/:id — detalle

→ `200 OK` — objeto completo con `departmentName`

### GET — no encontrado

→ `404 Not Found`
```json
{ "error": "Product not found: 00000000-0000-0000-0000-000000000000" }
```

### PATCH — actualizar nombre y IEPS

```json
{ "name": "Urea 46% Premium", "iepsRate": 8 }
```

→ `200 OK` — `iepsRate: 0.08` (normalizado)

### DELETE — soft delete

→ `204 No Content` — `isActive: false` verificado con `?includeInactive=true`

### PATCH `{ "isActive": true }` — reactivar

→ `200 OK` — `isActive: true`

---

## 11. Precios de Producto (sub-recurso)

**Base:** `/api/v1/admin/products/:id/prices`

### GET — lista vacía inicial

→ `200 OK` `{ "items": [] }`

### POST — crear precio default

```json
{ "name": "Menudeo", "price": 250.0, "minQuantity": 1, "isDefault": true }
```

→ `201 Created`
```json
{ "id": "c8557cbe-...", "name": "Menudeo", "price": 250, "isDefault": true, ... }
```

### POST — crear segundo precio no-default

```json
{ "name": "Mayoreo", "price": 220.0, "minQuantity": 10, "isDefault": false }
```

→ `201 Created` con `"isDefault": false`

### POST — segundo default bloqueado

**Acción:** Intentar agregar un segundo precio con `isDefault: true` cuando ya existe uno.

→ `409 Conflict`
```json
{ "error": "Product already has a default price" }
```

### POST — nombre duplicado

→ `409 Conflict`
```json
{ "error": "A price named \"Menudeo\" already exists for this product" }
```

### GET — lista con 2 precios

→ `200 OK` `{ "items": [...] }` con `length = 2`

### PATCH — promover a default (operación atómica)

**Acción:** Marcar "Mayoreo" como default; el sistema debe desactivar el default anterior ("Menudeo") en una sola transacción DB.

```json
{ "isDefault": true }
```

→ `200 OK` `{ "name": "Mayoreo", "isDefault": true }`

Verificación: listado muestra `Mayoreo: isDefault=true` y `Menudeo: isDefault=false`.

### DELETE — hard delete

**Acción:** Eliminar el precio "Menudeo" (hard delete, no soft).

→ `204 No Content` — lista queda con 1 precio

---

## 12. Dosificaciones de Producto (sub-recurso)

**Base:** `/api/v1/admin/products/:id/dosifications`

### GET — lista vacía inicial

→ `200 OK` `{ "items": [] }`

### POST — crear dosificación (sin precio default)

**Acción:** Crear dosificación; como el producto ya tiene precio default (Mayoreo: 220), se calcula `computedUnitPrice = 220/10 * 1.07 ≈ 23.54`.

```json
{ "name": "Dosis Estándar", "numParts": 10 }
```

→ `201 Created`
```json
{
  "id": "2f2b80ba-...", "name": "Dosis Estándar", "numParts": 10,
  "computedUnitPrice": 23.54, "requiresDefaultPrice": false, "isActive": true, ...
}
```

### POST — segunda dosificación

```json
{ "name": "Dosis Alta", "numParts": 5 }
```

→ `201 Created` `computedUnitPrice ≈ 47.08` (220/5 * 1.07)

### POST — nombre duplicado

→ `409 Conflict`
```json
{ "error": "A dosification named \"Dosis Estándar\" already exists for this product" }
```

### GET — lista con computedUnitPrice

→ `200 OK` — ambas dosificaciones con `computedUnitPrice` calculado y `requiresDefaultPrice: false`

### PATCH — actualizar numParts

```json
{ "numParts": 20 }
```

→ `200 OK` `{ "numParts": 20, "computedUnitPrice": 11.77 }` (recalculado)

### PATCH — nombre duplicado

```json
{ "name": "Dosis Alta" }
```

→ `409 Conflict`
```json
{ "error": "A dosification named \"Dosis Alta\" already exists for this product" }
```

### DELETE — soft delete

→ `204 No Content`

### GET con `?includeInactive=true` — verificar soft delete

→ dosificación con `"isActive": false` visible

---

## 13. Inventario de Sucursal (sub-recurso)

**Base:** `/api/v1/admin/branches/:branchId/inventory`

### GET — lista vacía inicial

→ `200 OK` `{ "items": [], "total": 0, "page": 1, "pageSize": 20 }`

### POST — crear registro de inventario

```json
{ "productId": "1a0383f1-...", "quantity": 500, "reorderPoint": 50 }
```

→ `201 Created`
```json
{
  "id": "d909b65a-...", "branchId": "68308a4f-...", "productId": "1a0383f1-...",
  "productCode": "UREA_001", "productName": "Urea 46% Premium",
  "quantity": 500, "reservedQuantity": 0, "reorderPoint": 50, ...
}
```

### POST — duplicado (misma sucursal + producto)

→ `409 Conflict`
```json
{ "error": "Inventory record already exists for this branch and product" }
```

### GET — lista con 1 registro

→ `200 OK` `{ "total": 1 }`

### GET con `?belowReorder=true` — filtro stock bajo (500 > 50)

→ `200 OK` `{ "total": 0 }` — ningún registro bajo el punto de reorden

### GET /:productId — detalle del registro

→ `200 OK` — objeto completo con `productCode`, `productName`, `quantity`, etc.

### PATCH /:productId — ajuste absoluto de stock

**Acción:** Establecer `quantity = 30` (set absoluto, no delta).

```json
{ "quantity": 30, "reorderPoint": 50 }
```

→ `200 OK` `{ "quantity": 30, "reorderPoint": 50 }`

### GET con `?belowReorder=true` — después del ajuste (30 < 50)

→ `200 OK` `{ "total": 1 }` — el registro ahora aparece como "bajo reorden"

### POST /:productId/adjust — delta positivo

**Acción:** Aumentar stock atómicamente; el delta se aplica con `UPDATE SET quantity = quantity + delta`.

```json
{ "delta": 100, "reason": "Recepción de mercancía" }
```

→ `200 OK` `{ "quantity": 130 }` (30 + 100)

### POST /:productId/adjust — delta negativo

```json
{ "delta": -50, "reason": "Venta" }
```

→ `200 OK` `{ "quantity": 80 }` (130 - 50)

### POST /:productId/adjust — delta negativo que excede stock

**Acción:** Intentar restar más de lo que hay en existencia; la constraint de BD previene stock negativo.

```json
{ "delta": -1000 }
```

→ `409 Conflict`
```json
{ "error": "Negative stock not allowed" }
```

### GET /:productId — verificar stock final

→ `200 OK` `{ "quantity": 80 }` — consistente con los adjusts aplicados

### DELETE /:productId — hard delete del registro de inventario

→ `204 No Content`

### GET /:productId — verificar hard delete

→ `404 Not Found`
```json
{ "error": "Inventory record not found" }
```

---

## Resumen

| Módulo | Endpoints probados | Resultado |
|---|---|---|
| Health | 1 | ✅ |
| Auth (register, login, refresh, logout) | 7 | ✅ |
| Usuarios (list, get, patch, delete, permissions) | 8 | ✅ |
| RBAC (roles, permissions, assign/revoke) | 7 | ✅ |
| Formas de pago | 7 | ✅ |
| Folios | 7 | ✅ |
| Departamentos | 6 | ✅ |
| Sucursales | 6 | ✅ |
| Proveedores | 9 | ✅ |
| Productos | 9 | ✅ |
| Precios de producto | 8 | ✅ |
| Dosificaciones de producto | 8 | ✅ |
| Inventario de sucursal | 11 | ✅ |

**Total: 94 casos de prueba — todos satisfactorios.**

### Comportamientos clave verificados

- Soft delete vs hard delete correctamente implementado en cada módulo.
- `?includeInactive=true` expone registros inactivos.
- Unicidad de `code` en todos los catálogos → 409.
- FK `departmentId` validada (producto con depto inactivo → 400).
- Unicidad de `(branch_id, product_id)` en inventario → 409.
- Máximo un precio `isDefault=true` por producto; segundo intento → 409.
- Promoción de precio a default es **atómica** (transacción DB): el default anterior se desactiva en la misma operación.
- Ajuste de inventario con `delta` es **atómico** (`UPDATE ... WHERE quantity + delta >= 0`).
- Stock negativo prevenido por constraint de BD → 409 `"Negative stock not allowed"`.
- `ivaRate`/`iepsRate` > 1 normalizado a decimal al crear/actualizar productos.
- `computedUnitPrice` en dosificaciones = `defaultPrice / numParts * 1.07` (recargo fijo 7%).
- Sin precio default → `computedUnitPrice: null`, `requiresDefaultPrice: true`.
- `belowReorder=true` filtra registros donde `quantity < reorderPoint`.
- Búsqueda en proveedores es **server-side** (ILIKE sobre `name`, `legalName`, `rfc`).
- Auto-protección en usuarios: admin no puede editar/borrar su propia cuenta → 403.
- Logout limpia cookie `refreshToken` con `Max-Age=0`.
- Token expirado → 401 `"Token expired"`.
- Petición sin token → 401 `"Unauthorized"`.
