## MODIFIED Requirements

### Requirement: List product prices
El sistema SHALL exponer `GET /api/v1/admin/products/:id/prices`. Requiere `products:read`. Acepta querystring opcional `branchId` (UUID de una sucursal existente; formato inválido → HTTP 400, sucursal inexistente → HTTP 404 `{"error":"Branch not found"}`).

Cada `ProductPrice` tiene un `branchId` (`string | null`): `null` = **precio base** (aplica a toda sucursal sin override propio); no-null = **override** exclusivo de esa sucursal. Cada `ProductPriceDto` incluye `id`, `productId`, `branchId`, `isOverride` (= `branchId !== null`), `name`, `price`, `minQuantity`, `discountPct` (o `null`), `isDefault`, `createdAt`, `updatedAt`.

- **Sin `branchId`**: retorna únicamente los precios base (`branchId: null`) del producto, ordenados por prioridad de negocio (igual que hoy): primero el `isDefault=true`, luego `subdis` (case-insensitive), luego `distri`, luego el resto por `name ASC`.
- **Con `branchId=<uuid>`**: retorna el conjunto **efectivo** para esa sucursal — para cada `name` de precio base, si existe un override de esa sucursal con el mismo `name` se retorna el override (`isOverride: true`); si no, se retorna el base sin cambios (`isOverride: false`). El orden de prioridad de negocio se aplica sobre el conjunto efectivo resultante, no sobre las filas crudas.

#### Scenario: List prices
- **WHEN** an authorized user gets prices for an existing product
- **THEN** the response includes all prices, default first

#### Scenario: Orden de prioridad para descuentos por volumen
- **WHEN** un producto tiene precios "Precio Publico" (`isDefault=true`), "Precio Subdis 10%", "Precio Distri 15%" y "Precio 4"
- **THEN** el orden de la respuesta es exactamente: Precio Publico, Precio Subdis 10%, Precio Distri 15%, Precio 4

#### Scenario: Precios sin patrón conocido van al final por nombre
- **WHEN** un producto tiene un precio no-default cuyo `name` no matchea `subdis` ni `distri` (ej. "General")
- **THEN** ese precio aparece después de los precios "subdis"/"distri" del mismo producto, ordenado alfabéticamente junto a otros precios en la misma situación

#### Scenario: Product not found
- **WHEN** the URL `:id` does not match any product
- **THEN** the system returns HTTP 404

#### Scenario: Precio efectivo por sucursal — override presente
- **WHEN** un producto tiene precio base "Precio Publico" ($3,666.65) y un override para la sucursal ZARIOZ con el mismo nombre ($699.35), y se pide `?branchId=<ZARIOZ>`
- **THEN** la respuesta incluye "Precio Publico" con `price: 699.35`, `branchId: <ZARIOZ>`, `isOverride: true`

#### Scenario: Precio efectivo por sucursal — hereda el base
- **WHEN** un producto tiene precios base "Precio Publico" y "Precio Subdis 10%", y sólo existe override de "Precio Publico" para la sucursal HUAJUAPAN, y se pide `?branchId=<HUAJUAPAN>`
- **THEN** la respuesta incluye "Precio Subdis 10%" con el valor base y `isOverride: false`

#### Scenario: Eliminar un override revierte esa sucursal al base
- **WHEN** existe un override "Precio Publico" para la sucursal ZARIOZ y se elimina vía `DELETE /prices/:priceId`, y luego se pide `GET .../prices?branchId=<ZARIOZ>`
- **THEN** la respuesta muestra "Precio Publico" con el valor base (`isOverride: false`) y las demás sucursales no se ven afectadas

#### Scenario: branchId con formato inválido
- **WHEN** `?branchId=` recibe un valor que no es UUID
- **THEN** the system returns HTTP 400

#### Scenario: branchId de sucursal inexistente
- **WHEN** `?branchId=<uuid>` no corresponde a ninguna sucursal
- **THEN** the system returns HTTP 404 `{"error":"Branch not found"}`

---

### Requirement: Create product price
The system SHALL expose `POST /api/v1/admin/products/:id/prices`. Requires `products:write`. Required body: `name: string` (1–60 chars), `price: number` (>= 0, max 12 integer digits + 4 decimals). Optional: `minQuantity: number` (integer >= 1, default 1), `discountPct: number | null` (0–100), `isDefault: boolean` (default `false`), `branchId: string | null` (UUID of an active branch; omitted or `null` = base price, applies to every branch without its own override).

Uniqueness and default constraints are scoped per `(productId, branchId)` bucket, treating `branchId: null` as its own bucket distinct from any specific branch:
- A product may have at most ONE price with `isDefault: true` PER bucket (one global default, plus at most one default per branch that has overrides). A second default within the same bucket returns HTTP 409 `{"error": "Product already has a default price"}`.
- Two prices with the same `name` in the same bucket return HTTP 409. The same `name` MAY be reused across different buckets (e.g. a base "Precio Publico" and a ZARIOZ-override "Precio Publico" coexist).

**Branch scoping**: when `branchId` is present (creating an override), a caller without `branches:access_all` MUST pass `branchId === x-user-branch-id`; mismatch returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`. Creating a base price (`branchId` omitted or `null`) is NOT branch-scoped — any caller with `products:write` may create it, same as today. A non-existent or inactive `branchId` returns HTTP 400.

#### Scenario: Create non-default price
- **WHEN** the body is `{ "name": "Mayoreo", "price": 10.50, "minQuantity": 10 }`
- **THEN** the system returns HTTP 201

#### Scenario: Create first default price
- **WHEN** the body is `{ "name": "Menudeo", "price": 12.00, "isDefault": true }` and no default exists
- **THEN** the system returns HTTP 201

#### Scenario: Reject second default price
- **WHEN** the product already has a default price and the body sets `isDefault: true`
- **THEN** the system returns HTTP 409

#### Scenario: Duplicate price name
- **WHEN** a price named "Menudeo" already exists for the product
- **THEN** the system returns HTTP 409

#### Scenario: Invalid price
- **WHEN** the body contains `price: -5`
- **THEN** the system returns HTTP 400

#### Scenario: Crear override de sucursal
- **WHEN** un caller con `products:write` envía `{ "name": "Precio Publico", "price": 699.35, "branchId": "<ZARIOZ>" }` para un producto cuyo precio base "Precio Publico" ya existe
- **THEN** the system returns HTTP 201 — no colisiona con el nombre del base porque pertenece a un bucket distinto

#### Scenario: Override con mismo nombre en la misma sucursal colisiona
- **WHEN** la sucursal ZARIOZ ya tiene un override "Precio Publico" y se intenta crear otro override "Precio Publico" para ZARIOZ
- **THEN** the system returns HTTP 409

#### Scenario: Default de sucursal no colisiona con el default global
- **WHEN** el producto ya tiene un default global (`branchId: null`) y se crea un override con `isDefault: true` y `branchId: "<ZARIOZ>"`
- **THEN** the system returns HTTP 201 — son buckets distintos, cada uno con su propio default

#### Scenario: Operador crea override fuera de su sucursal
- **WHEN** un `operator` con `x-user-branch-id: B1` (sin `branches:access_all`) envía `{ "name": "Precio Publico", "price": 500, "branchId": "B2" }`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "branches:access_all"}`

#### Scenario: Operador crea override de su propia sucursal
- **WHEN** un `operator` con `x-user-branch-id: B1` envía `{ "name": "Precio Publico", "price": 500, "branchId": "B1" }`
- **THEN** the system returns HTTP 201

#### Scenario: branchId de sucursal inactiva o inexistente
- **WHEN** el body incluye `branchId` que no corresponde a una sucursal activa
- **THEN** the system returns HTTP 400

---

### Requirement: Update product price
The system SHALL expose `PATCH /api/v1/admin/products/:id/prices/:priceId`. Requires `products:write`. Body MAY include `name`, `price`, `minQuantity`, `discountPct`, `isDefault`. At least one field required. Toggling `isDefault: true` SHALL automatically unset `isDefault` on the prior default price of the SAME `(productId, branchId)` bucket (atomic) — it SHALL NOT affect the default of any other bucket.

`branchId` is **immutable** after creation, same as `code` in other catalogs: if the body includes `branchId`, it SHALL be silently ignored.

#### Scenario: Update price value
- **WHEN** the body is `{ "price": 13.50 }`
- **THEN** the system returns HTTP 200 with the new value

#### Scenario: Promote to default
- **WHEN** the body is `{ "isDefault": true }` for a non-default price and another price is currently default IN THE SAME BUCKET
- **THEN** the system atomically sets the new price as default and unsets the previous default; returns HTTP 200

#### Scenario: Promote branch override to default does not touch the global default
- **WHEN** a ZARIOZ override with `isDefault: false` is PATCHed to `{ "isDefault": true }`, and the product's global (`branchId: null`) default is currently some other price
- **THEN** the ZARIOZ override becomes default within its own bucket; the global default is unchanged

#### Scenario: Price not found
- **WHEN** `:priceId` does not exist
- **THEN** the system returns HTTP 404

#### Scenario: branchId is ignored on update
- **WHEN** the body includes `{ "price": 15.00, "branchId": "<other-branch>" }` on an existing override for branch A
- **THEN** the system returns HTTP 200, updates `price`, and the row's `branchId` remains A
