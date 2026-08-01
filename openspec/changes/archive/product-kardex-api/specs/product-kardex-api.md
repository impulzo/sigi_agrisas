# Spec Delta: product-kardex-api

## Purpose

Exponer el historial cronológico de ventas y devoluciones de un producto (Kardex) como sub-recurso paginado de la API de productos.

---

## Requirements

### Requirement: Kardex de producto

El sistema SHALL exponer `GET /api/v1/admin/products/:id/kardex` que retorna un listado paginado de movimientos del producto (líneas de venta y líneas de devolución), ordenado por fecha DESC.

Requiere `products:read`.

Query params: `page` (default 1), `pageSize` (default 20, max 100), `branchId` (UUID opcional), `from` (fecha ISO opcional, inclusiva), `to` (fecha ISO opcional, inclusiva).

Respuesta 200:
```json
{
  "productId": "uuid",
  "productCode": "string",
  "productName": "string",
  "items": [ /* KardexItem[] */ ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

Cada `KardexItem` tiene `type: 'sale' | 'return'` y los campos descritos en design.md.

#### Scenario: Producto no encontrado
- **WHEN** el `:id` no existe en la BD
- **THEN** HTTP 404 `{"error": "Product not found"}`

#### Scenario: ID no es UUID válido
- **WHEN** el `:id` no es un UUID
- **THEN** HTTP 400

#### Scenario: Sin permiso products:read
- **WHEN** el token no tiene `products:read`
- **THEN** HTTP 403 `{"error": "Forbidden", "required": "products:read"}`

#### Scenario: Branch scoping — operador sin bypass, sin branchId param
- **WHEN** el usuario NO tiene `branches:access_all` y no pasa `?branchId`
- **THEN** se filtra implícitamente a `x-user-branch-id`; si la cabecera está vacía → 403

#### Scenario: Branch scoping — operador sin bypass, branchId ajeno
- **WHEN** el usuario NO tiene `branches:access_all` y pasa `?branchId` de otra sucursal
- **THEN** HTTP 403

#### Scenario: Branch scoping — admin con bypass, sin branchId
- **WHEN** el usuario tiene `branches:access_all` y no pasa `?branchId`
- **THEN** retorna movimientos de TODAS las sucursales

#### Scenario: Branch scoping — admin con bypass, con branchId
- **WHEN** el usuario tiene `branches:access_all` y pasa `?branchId=<X>`
- **THEN** filtra sólo a la sucursal X

#### Scenario: Sólo movimientos efectivos
- **WHEN** un producto tiene ventas `completed` y ventas `cancelled`
- **THEN** sólo las `completed`/`edited` aparecen en los items tipo `sale`; las `cancelled` no aparecen

#### Scenario: Devoluciones canceladas excluidas
- **WHEN** un producto tiene devoluciones `completed` y `cancelled`
- **THEN** sólo las `completed` aparecen en los items tipo `return`

#### Scenario: Filtro por fechas
- **WHEN** se pasan `?from=2026-06-01&to=2026-06-30`
- **THEN** sólo aparecen movimientos dentro del rango inclusive

#### Scenario: pageSize excede 100
- **WHEN** `?pageSize=200`
- **THEN** HTTP 400

#### Scenario: Paginación
- **WHEN** hay 42 movimientos y se pide `?page=2&pageSize=20`
- **THEN** `items` tiene 20 items, `total=42`, `page=2`, `pageSize=20`
