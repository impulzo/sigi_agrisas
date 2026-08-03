## MODIFIED Requirements

### Requirement: List product prices
El sistema SHALL exponer `GET /api/v1/admin/products/:id/prices`. Requiere `products:read`. Retorna `{ items: ProductPriceDto[] }` ordenado por prioridad de negocio: primero el precio con `isDefault=true`, luego los precios cuyo `name` matchea `subdis` (case-insensitive), luego los que matchean `distri` (case-insensitive), luego el resto ordenado por `name ASC`. Cada `ProductPriceDto` incluye `id`, `productId`, `name`, `price`, `minQuantity`, `discountPct` (o `null`), `isDefault`, `createdAt`, `updatedAt`.

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
