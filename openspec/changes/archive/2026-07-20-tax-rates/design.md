## Context

Los productos tienen `ivaRate: Decimal?` e `iepsRate: Decimal?` como columnas directas. Los snapshots en `sale_items`, `quote_items`, `return_items` copian estos valores en el momento de la venta. El cálculo de totales (`SaleTotalsCalculator`, etc.) opera sobre los snapshots, lo que aisla la lógica de totales de cualquier cambio en catálogos. Por tanto, agregar `taxRateId` como FK informativa no rompe ningún cálculo existente.

El módulo hexagonal de `products` ya existe; se extiende con la relación. Se crea un módulo nuevo `tax-rates` siguiendo el mismo patrón.

## Goals / Non-Goals

**Goals:**
- Catálogo CRUD de tasas con soft-delete protegido.
- Asociación `product.taxRateId` (nullable, informativa).
- Respuesta de detalle de producto incluye `taxRate: { id, code, name, rate } | null`.
- UI: página de administración de tasas + integración en formulario de producto.

**Non-Goals:**
- No reemplaza `ivaRate`/`iepsRate` en `Product` ni en snapshots. Los campos de tasa directa se mantienen para compatibilidad; `taxRateId` es adicional.
- No propaga automáticamente el `rate` de la tasa a `ivaRate`/`iepsRate` del producto (eso es una decisión futura).
- No afecta el cálculo de totales en POS, cotizaciones ni devoluciones.
- No agrega item al `NavigationRail` (ya navega por `/catalogs` → hub).

## Decisions

**D1 — `taxRateId` informativo (no reemplaza ivaRate/iepsRate)**
Opción A: `taxRateId` reemplaza `ivaRate`/`iepsRate` → requiere migración de datos existentes, cambio en `SaleTotalsCalculator`, riesgo alto. Opción B (elegida): `taxRateId` es un vínculo de catálogo; `ivaRate`/`iepsRate` siguen siendo la fuente de verdad para cálculos. Cero riesgo de regresión.

**D2 — Soft-delete con protección a productos activos**
`DELETE /tax-rates/:id` → `isActive=false`. Si existen `products` con `taxRateId=id AND isActive=true` → 409 `{ error: "TaxRateInUse", productCount: N }`. Productos inactivos no bloquean.

**D3 — Módulo hexagonal independiente `src/modules/tax-rates/`**
Mismo patrón que `payment-methods`: dominio puro, use cases, repositorio Prisma, controller, DI container. No se reutiliza el módulo de products para evitar acoplamiento.

**D4 — Seed idempotente**
`prisma/seeds/taxRates.ts` usa `upsert` por `code`. Tasas canónicas: `IVA_16` (0.1600), `IEPS_8` (0.0800), `IVA_0` (0.0000). Registrado en `prisma/seed.ts`.

**D5 — `products-api` incluye `taxRate` en el DTO de detalle**
`GET /products/:id` incluye `taxRate: { id, code, name, rate } | null`. La lista (`GET /products`) incluye `taxRateId` y `taxRateCode` como campos planos para evitar N+1. El repositorio hace un `include: { taxRate: true }` en `findById` y un join sencillo en `list`.

**D6 — Permisos RBAC**
`tax_rates:read`: admin, operator, viewer. `tax_rates:write`: admin, operator. Se agrega al seed de `rbac.ts` en la lista de permisos y asignaciones de roles.

## Risks / Trade-offs

- **Acoplamiento opcional**: Si en el futuro se quiere que `taxRateId` drive el cálculo, habrá que migrar datos y cambiar el controller de products. → Aceptado como deuda técnica documentada.
- **Inconsistencia `ivaRate` vs `taxRate.rate`**: Un producto puede tener `ivaRate=0.16` y `taxRateId=IVA_0`. → La UI puede mostrar un warning si los valores no coinciden (opcional, fuera de esta iteración).
- **ON DELETE SET NULL**: Si se elimina físicamente una tasa (no previsto, solo soft delete), Postgres limpia la FK automáticamente. → Aceptado.
