## Context

El proyecto ya tiene 6 CRUDs backend operativos (`users`, `payment-methods`, `folios`, `departments`, `branches`, `providers`) más el módulo `rbac`. Todos siguen estrictamente el patrón hexagonal: `domain/{entities,errors}/`, `application/{ports,use-cases,dto,mappers}/`, `infrastructure/{repositories,services,http,di}/`. Los route handlers viven en `app/api/v1/admin/<recurso>/` y delegan al controller vía DI container. La validación Zod ocurre exclusivamente en los controllers. Tests unitarios usan repositorios in-memory; tests de integración golpean Supabase real.

Este change introduce el primer módulo con **relaciones M:N reales** entre dos entidades existentes (`Product ↔ Branch` vía `branch_inventory`) y el primero con **sub-recursos anidados** (prices, dosifications). Eso implica route handlers en rutas anidadas (`/products/:id/prices/:priceId`) y use cases que reciben dos IDs.

El cliente viene de un sistema legacy con catálogo de productos. Las columnas heredadas son: `CLAVE` (clave de negocio), `Nombre`, `Unidad` (texto libre), `Iva` / `Ieps` (porcentajes 0–100), `NombreDepartamento` (string que resuelve a `department_id` por JOIN). La migración se hace en SQL separado, no es responsabilidad del schema Prisma generar el seed legacy.

## Goals / Non-Goals

**Goals:**

- Esquema relacional limpio: `products`, `product_prices`, `product_dosifications`, `branch_inventory` con FKs e índices apropiados.
- 2 módulos hexagonales (`products`, `inventory`) que respetan el patrón validado en los 6 módulos previos.
- Lógica de cálculo de dosis aislada en un servicio de dominio puro y testeable sin BD.
- Soft delete consistente con el resto del sistema (excepto `product_prices` y `branch_inventory` por razones documentadas).
- API REST que permite (a) gestionar el catálogo completo desde admin, (b) operar stock por sucursal desde POS futuro, (c) preservar la semántica del sistema legacy.

**Non-Goals:**

- Auditoría de movimientos de stock (sin tabla `stock_movements`). El historial se difiere a un change posterior.
- UI/frontend (se construirá en `add-products-ui` y `add-inventory-ui`).
- Catálogos SAT validados contra el servicio oficial (solo validación de formato).
- Tabla `tax_rates` catalogada (porcentajes IVA/IEPS guardados inline por producto).
- Multi-currency, multi-warehouse en una sucursal, lotes/series por producto.
- Precios time-bound (precio promoción con vigencia) — se difiere; por ahora `discount_pct` es siempre vigente.

## Decisions

### Decisión 1 — Dos módulos hexagonales: `products` e `inventory`

`Product`, `ProductPrice` y `ProductDosification` viven en `src/modules/products/` porque conceptualmente son el mismo agregado (un producto sin sus precios/dosificaciones no es funcional). `BranchInventory` vive en `src/modules/inventory/` porque (a) referencia FKs a `Product` Y `Branch`, (b) opera con primitivas distintas (delta atómico, reserva), (c) será consumido por el módulo POS futuro como puerto independiente.

**Alternativa descartada**: un único módulo `inventory` que englobe todo. Mezcla responsabilidades (gestión de catálogo vs. control de stock) y dificulta la inyección de dependencias hacia el POS.

### Decisión 2 — `ProductPrice` y `ProductDosification` como entidades hijas con repositorios propios

Ambos son sub-recursos del agregado Product, pero los modelo con repositorios propios (`ProductPriceRepository`, `ProductDosificationRepository`) porque las operaciones CRUD individuales (POST de un precio, PATCH de una dosificación) requieren consultas dirigidas. Mantenerlos dentro del `ProductRepository` obligaría a cargar el producto completo en cada operación.

Cada operación de sub-recurso valida que el `product_id` exista vía `productRepository.findById(...)` antes de tocar la tabla hija. Si no existe, 404.

**Alternativa descartada**: Aggregate root puro con todo dentro de `Product`. Funciona en DDD clásico pero genera código verboso para CRUD admin sin valor aquí.

### Decisión 3 — `code` como clave de negocio inmutable, regex `^[A-Z0-9_]{1,32}$`

Consistente con el resto del proyecto (`branches`, `departments`, `providers`). `code` es UNIQUE en `products`, inmutable después de creación, normalizado a uppercase + trim en el controller. Duplicado → 409.

Para `product_prices` y `product_dosifications` no hay `code` — son sub-entidades identificadas por `name` único dentro del producto (UNIQUE compuesto `(product_id, name)`).

### Decisión 4 — Modelo de impuestos: `iva_rate` e `ieps_rate` como decimales nullables

Mexico solo tiene IVA e IEPS como impuestos federales relevantes para venta. Cada uno se guarda como `decimal(5, 4)`:

- `NULL` = el impuesto no aplica a este producto (productos exentos o tasa 0% sin trazabilidad — se documenta en el código).
- `0.0000` = aplica al 0% (exento con trazabilidad).
- `0.1600` = 16% (tasa estándar).
- `0.0800` = 8% (zona fronteriza).

El cliente puede ingresar el valor como porcentaje (16) y el controller normaliza a decimal (0.16) antes de persistir. La respuesta devuelve el decimal almacenado (0–1) — la misma escala que se persiste en BD. La UI es responsable de multiplicar por 100 para mostrarlo como porcentaje.

**Alternativa descartada**: tabla `tax_rates` con catálogo enumerado. Sobreingeniería para 4 valores conocidos (0, 8, 16, 0% exento).

**Alternativa descartada**: campo `eps_rate`. Confirmado con el cliente que era typo por "ieps".

### Decisión 5 — `sat_product_code` como string libre validado por formato

El catálogo SAT de productos/servicios tiene ~50 000 códigos. Mantenerlos sincronizados en BD es costoso. Se valida solo formato (`^\d{8}$` — 8 dígitos, sin verificar contra catálogo oficial). El frontend puede sugerir códigos comunes; el backend solo persiste lo que recibe.

Optional. NULL significa "no clasificado fiscalmente" (admisible para productos internos no facturables aún).

### Decisión 6 — Department es FK obligatoria con `ON DELETE RESTRICT`

Regla del cliente: "departamento obligatorio". `products.department_id NOT NULL`. Eliminar un departamento con productos asociados falla con FK constraint (no se cascade). Esto fuerza al admin a reasignar productos antes de eliminar departamentos, previniendo huérfanos.

`Department` tiene soft delete (`isActive=false`). Productos en departamentos inactivos siguen funcionando — solo es metadata.

### Decisión 7 — Precios múltiples con `is_default` booleano y constraint parcial

Tabla `product_prices`:
- `name` VARCHAR(60) — etiqueta libre ("Menudeo", "Mayoreo", "Promoción", "Especial").
- `price` DECIMAL(12, 4) — el monto.
- `min_quantity` INT default 1 — cantidad mínima para aplicar este precio.
- `discount_pct` DECIMAL(5, 2) NULL — descuento opcional sobre el precio (0–100).
- `is_default` BOOLEAN default FALSE — máximo uno default por producto.

Constraint UNIQUE parcial: `CREATE UNIQUE INDEX product_default_price_idx ON product_prices(product_id) WHERE is_default = TRUE`. Garantiza que solo un precio puede ser default por producto. El cálculo de dosificación usa el `is_default = TRUE` como base.

Si un producto no tiene ningún precio default, las respuestas de dosificación devuelven `computedUnitPrice: null` con `requiresDefaultPrice: true`.

**Alternativa descartada**: una columna `default_price_id` en `products`. Crea ciclo de referencia (product → price → product). El UNIQUE parcial es la solución canónica.

### Decisión 8 — Dosificaciones con recargo fijo del 7% no configurable

Servicio de dominio puro `DosificationPriceCalculator`:

```ts
const DOSIFICATION_SURCHARGE_PCT = 7.0;

function computeUnitPrice(basePrice: number, numParts: number): number {
  if (numParts < 1) throw new Error("numParts debe ser >= 1");
  const perPart = basePrice / numParts;
  return perPart * (1 + DOSIFICATION_SURCHARGE_PCT / 100);
}
```

Confirmado con el cliente: 7% fijo (no configurable por dosificación). Si en el futuro se quiere parametrizar, se añade un campo `surcharge_pct` a `product_dosifications` con default 7.00, sin romper compatibilidad.

`num_parts INT >= 2`: una "dosificación con num_parts=1" sería el producto entero (no tiene sentido). Validar en use case.

### Decisión 9 — `branch_inventory` sin stock global, UNIQUE (branch_id, product_id)

Cada par (sucursal, producto) tiene una sola fila. La columna `quantity DECIMAL(14, 4) DEFAULT 0 CHECK (quantity >= 0)` garantiza stock no negativo a nivel de BD. Operaciones:

- **PATCH** (`update`): set absoluto de quantity/reservedQuantity/reorderPoint. Útil para inicializar o corregir errores de captura.
- **POST adjust** (`{ delta, reason? }`): incremento/decremento atómico vía `UPDATE ... SET quantity = quantity + ${delta} WHERE id = ${id} AND quantity + ${delta} >= 0 RETURNING *`. Si el `RETURNING` viene vacío, lanzar `NegativeStockNotAllowedError`. Garantiza atomicidad sin transacciones explícitas.

**Alternativa descartada**: tabla `stock_movements`. Decisión del cliente difundir a change posterior.

`reserved_quantity` se modela en BD pero **no se modifica desde este change**. Se deja preparado para que el módulo POS futuro pueda reservar stock al crear un pedido sin afectar el `quantity` disponible.

### Decisión 10 — Hard delete para `product_prices` y `branch_inventory`; soft delete para los demás

- `products`: soft delete (`isActive=false`). Mismo patrón que catálogos.
- `product_dosifications`: soft delete (`isActive=false`). Permite desactivar una dosificación temporalmente.
- `product_prices`: **hard delete**. Un precio borrado es un precio borrado; no tiene semántica "inactiva". Si se quiere mantener histórico, se difiere a un módulo de auditoría.
- `branch_inventory`: **hard delete**. Es un registro M:N puro; si un producto deja de venderse en una sucursal, se elimina el registro.

### Decisión 11 — Búsqueda server-side por `name` y `code` (ILIKE)

`GET /api/v1/admin/products?search=<q>` aplica `OR ILIKE '%search%'` sobre `name`, `code`. Min 2 chars (igual que providers). Server-side porque el catálogo puede crecer a miles de SKUs.

Adicional: `?departmentId=<uuid>` filtra por departamento. `?includeInactive=true` incluye inactivos. Paginación `?page=&pageSize=` (default 20, max 100).

### Decisión 12 — Atomicidad de `adjust` via SQL condicional, sin transacción Prisma

```ts
const result = await prisma.$executeRaw`
  UPDATE branch_inventory
  SET quantity = quantity + ${delta}, updated_at = NOW()
  WHERE id = ${id} AND quantity + ${delta} >= 0
`;
if (result === 0) {
  const exists = await prisma.branchInventory.findUnique({ where: { id } });
  if (!exists) throw new BranchInventoryRecordNotFoundError();
  throw new NegativeStockNotAllowedError();
}
```

Esto evita el race condition de "leer-modificar-escribir" en concurrencia (dos POS vendiendo al mismo tiempo). El `CHECK` de tabla actúa como red de seguridad pero el WHERE es la primera línea de defensa.

### Decisión 13 — Permisos RBAC: 4 nuevos, asignados según rol

| Permiso | admin | operator | viewer |
|---|---|---|---|
| `products:read` | ✅ | ✅ | ✅ |
| `products:write` | ✅ | ❌ | ❌ |
| `inventory:read` | ✅ | ✅ | ✅ |
| `inventory:write` | ✅ | ✅ | ❌ |

`operator` recibe `inventory:write` porque típicamente son cajeros/almacenistas que ajustan stock en su sucursal. Admin write para catálogo. Viewer solo lectura.

### Decisión 14 — Brownfield: mapping documentado, no auto-ejecutado

El schema Prisma crea las tablas vacías. La importación legacy es una **operación manual** documentada en `docs/legacy-products-import.md` con SQL:

```sql
-- Suponiendo tabla temporal `legacy_products` cargada desde CSV/dump del sistema viejo
INSERT INTO products (code, name, unit, iva_rate, ieps_rate, department_id, is_active)
SELECT
  UPPER(TRIM(l.clave))                              AS code,
  TRIM(l.nombre)                                    AS name,
  TRIM(l.unidad)                                    AS unit,
  NULLIF(l.iva, 0) / 100.0                          AS iva_rate,
  NULLIF(l.ieps, 0) / 100.0                         AS ieps_rate,
  d.id                                              AS department_id,
  TRUE                                              AS is_active
FROM legacy_products l
JOIN departments d ON LOWER(d.name) = LOWER(TRIM(l.nombredepartamento))
ON CONFLICT (code) DO NOTHING;
```

Notas:
- Se ignoran (ON CONFLICT DO NOTHING) los códigos ya existentes.
- Departamentos no encontrados → producto se descarta (NOT IN); el cliente debe sincronizar departamentos primero.
- `NULLIF(0)` convierte tasas en 0 a NULL para diferenciar "no aplica" de "exento".

## Risks / Trade-offs

- **Concurrencia en `adjust`** — Mitigación: SQL condicional con WHERE. Bajo carga POS real (miles de TPS) puede requerir locks explícitos o cola; aceptado para v1 con volumen admin.
- **Sin movimientos históricos** — Difunde a change posterior. Riesgo: imposible auditar quién bajó el stock. Mitigación documentada al cliente.
- **Múltiples precios sin tiers exclusivos** — Dos precios con `min_quantity=5` y nombres diferentes ambos aplicarían al mismo umbral. El módulo POS futuro deberá resolver la ambigüedad (probablemente "el de mayor descuento gana"). En este change, el backend permite la situación; es responsabilidad del consumidor.
- **Hard delete de precios** — Si un POS futuro referencia un precio en un ticket histórico, perderá el nombre. Mitigación: el ticket guarda copia del nombre+precio en su propia tabla (responsabilidad del módulo POS).
- **Cálculo de dosis usa `is_default` price** — Si no hay default, la respuesta incluye `computedUnitPrice: null`. UI debe mostrar el aviso "Configura un precio por defecto para calcular dosis".
- **FKs CASCADE en sub-recursos** — Borrar un producto borra sus prices/dosifications/inventory en cascada. Pero el soft delete de producto NO borra los sub-recursos — solo marca `isActive=false`. Documentado.

## Migration Plan

1. `npm run build` — verifica tipos.
2. Crear migración: `npx prisma migrate dev --name add_products_and_inventory_tables` en desarrollo. Genera el archivo SQL + actualiza `_prisma_migrations`.
3. Verificar SQL generado contiene las 4 tablas + índices + FKs + CHECK constraints.
4. Deploy:
   - `npx prisma migrate deploy` (usa `DIRECT_URL`).
   - `npm run seed` (idempotente; añade 4 permisos nuevos y los asigna).
5. Validación manual con `curl`:
   - Login como admin → crear departamento (si no hay) → crear producto → añadir precio default → añadir dosificación → verificar GET de dosificación devuelve `computedUnitPrice` correcto.
   - Login como operator → POST `/inventory/.../adjust` con delta positivo y negativo; verificar `NegativeStockNotAllowedError` cuando delta excede.
6. Importación legacy (opcional, manual): seguir el SQL de `docs/legacy-products-import.md`.

Rollback:

1. Revertir el commit del código.
2. `DROP TABLE branch_inventory, product_dosifications, product_prices, products CASCADE;`.
3. Eliminar los 4 permisos nuevos.

## Open Questions

- ¿`reserved_quantity` se actualiza desde este change o solo se reserva la columna? → Solo se reserva la columna. La lógica de reserva vendrá con el módulo POS (`reserveStockUseCase` que mueve quantity → reservedQuantity al crear un pedido).
- ¿`branch_inventory.reorder_point` debe disparar alertas? → No en este change. El endpoint `?belowReorder=true` permite consultar; las notificaciones (email/push) se difieren.
- ¿Se permite `discount_pct = 100`? → Sí. Significa "regalo" (precio efectivo = 0). El cliente puede usarlo para promociones de tipo "compra 1 lleva 1".
- ¿`min_quantity` puede ser cero? → No. Min 1. Un precio aplica a partir de 1 unidad o más.
- ¿`product_dosifications.num_parts` puede ser fraccionario (ej. 2.5)? → No. INT >= 2. Una dosificación divide el producto en N partes enteras. Si se necesita fracciones, se modela como otro producto.
- ¿API de "duplicar producto" (clonar) en este change? → No, se difiere. CRUD básico es suficiente.
