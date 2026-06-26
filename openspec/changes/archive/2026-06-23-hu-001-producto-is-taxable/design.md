## Context

El catálogo de productos ya maneja `iva_rate` e `ieps_rate` por línea (decimales 0–1 o null). El cálculo de totales en `SaleTotalsCalculator` / `QuoteTotalsCalculator` multiplica `lineSubtotal * ivaRate` directamente. No existe distinción entre "producto exento" y "producto con tasa 0%": ambos producen el mismo resultado matemático, pero semánticamente son distintos. Los productos agropecuarios típicos en MX están exentos (no tasa 0%), lo que afecta la facturación SAT.

## Goals / Non-Goals

**Goals:**
- Agregar `is_taxable: Boolean` al modelo `Product` (default `false`)
- Propagarlo a DTOs de respuesta y al snapshot de línea de venta/cotización
- Cuando `is_taxable = false`, los calculadores de totales ignoran `ivaRate`/`iepsRate` (efectivamente 0)
- UI: toggle en formulario + columna/badge en tabla

**Non-Goals:**
- Cambiar el esquema de facturación SAT (esto es preparación, no integración)
- Retroactividad de ventas ya cerradas (snapshots existentes no se tocan)
- Auditoría de cambios más allá del `updatedAt` existente (CS-3 de la HU es deseable futuro, no parte de este cambio)
- Soporte multi-tasa (un producto con IVA en algunas sucursales y exento en otras)

## Decisions

### D-1: Flag en Producto, no en Línea de Venta

**Decisión**: `is_taxable` vive en `Product`, no en `SaleItem`.

**Alternativa**: campo `is_taxable` en snapshot de `SaleItem`.

**Razón**: La exención es una propiedad del producto (definida por régimen SAT), no de la transacción. Si se cambia el flag, las ventas futuras reflejan el cambio; las pasadas mantienen su snapshot. Agregar el campo al snapshot puede venir en una iteración posterior si se necesita auditoría fiscal.

### D-2: Calculadores respetan el flag vía parámetro de ítem

**Decisión**: `SaleTotalsCalculator.calculate(items[])` recibe en cada ítem un `isTaxable: boolean`. Cuando `false`, el calculador usa `effectiveIvaRate = 0` e `effectiveIepsRate = 0` independientemente de los campos almacenados.

**Alternativa**: Normalizar las tasas a 0 antes de guardar el snapshot.

**Razón**: Mantiene las tasas del catálogo intactas (útiles para referencias y reportes futuros). El flag es la fuente de verdad fiscal.

### D-3: Migración conservadora (default `false`)

Todos los productos existentes reciben `is_taxable = false`. Esto preserva el comportamiento actual del cálculo (si `ivaRate = null` o `iepsRate = null`, ya producían 0). No requiere recalcular ninguna venta.

### D-4: Sin campo separado en snapshot de línea (por ahora)

El snapshot de `SaleItem` / `QuoteItem` no agrega `isTaxableSnapshot`. El `is_taxable` al momento de la venta se infiere del catálogo. Si en el futuro se necesita auditoría de exención por línea, se agrega el snapshot en esa iteración.

## Risks / Trade-offs

- **[Riesgo] Ventas pasadas con `ivaRate > 0` en productos marcados `is_taxable=false` quedan inconsistentes** → Mitigation: los snapshots de líneas ya completadas no se retoucan; el cambio aplica solo a ventas futuras.
- **[Riesgo] Confusión semántica entre `is_taxable=false` y `ivaRate=null`** → Mitigation: documentar en spec que `is_taxable` es el gate; las tasas son los valores a aplicar *cuando* es taxable.
- **[Trade-off] No se agrega `isTaxableSnapshot` al snapshot de línea** → Se pierde la trazabilidad del flag en el momento de la venta, pero se reduce la complejidad. Aceptable para V1.

## Migration Plan

1. `npx prisma migrate dev --name add_is_taxable_to_products`
   - SQL: `ALTER TABLE products ADD COLUMN is_taxable BOOLEAN NOT NULL DEFAULT false;`
2. No requiere seed manual adicional (el default cubre todos los registros existentes)
3. Rollback: `ALTER TABLE products DROP COLUMN is_taxable;` (no datos críticos)

## Open Questions

- ¿Debe `is_taxable=true` ser obligatorio cuando `ivaRate` o `iepsRate` son distintos de null? (sugerido: no, son independientes; las tasas pueden estar documentadas sin aplicarse)
- ¿Se necesita auditoría explícita (`product_audit_log`)? CS-3 de la HU lo pide pero es complejo; diferir a `add-audit-log` change.
