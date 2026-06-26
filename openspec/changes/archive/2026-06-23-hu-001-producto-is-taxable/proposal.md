## Why

El sistema actualmente asume que todos los productos aplican IVA/IEPS basándose en sus tasas por línea, pero no existe un control explícito para marcar un producto como exento de impuestos. Esto impide clasificar correctamente productos agropecuarios o exentos fiscalmente, generando facturas incorrectas.

## What Changes

- Nuevo campo booleano `is_taxable` (default `false`) en la entidad `Product` y tabla `products`
- Migración que asigna `is_taxable = false` a todos los productos existentes
- El controller de productos acepta y valida `isTaxable` (boolean) en POST/PATCH
- El dominio de producto expone `isTaxable` en entity y DTO
- `PosLookupService` propaga `isTaxable` al snapshot de línea
- `SaleTotalsCalculator` y `QuoteTotalsCalculator` aplican `ivaRate = 0 / iepsRate = 0` cuando `isTaxable = false`, independientemente de las tasas del catálogo
- UI: formulario Crear/Editar Producto muestra toggle `isTaxable`; tabla de productos agrega columna/badge de estado fiscal
- Los productos existentes no se ven afectados funcionalmente (default `false` mantiene comportamiento actual)

## Capabilities

### New Capabilities

_(ninguna nueva spec de alto nivel; el comportamiento se incorpora a las specs existentes de productos)_

### Modified Capabilities

- `products-api`: nuevo campo `isTaxable` en request/response; lógica de cálculo de totales respeta el flag
- `products-ui`: formulario y tabla actualizados con el campo `isTaxable`

## Impact

- **BD**: nueva columna `is_taxable BOOLEAN NOT NULL DEFAULT false` en `products`
- **Prisma**: `Product.isTaxable Boolean @default(false)`
- **Backend**: `src/modules/products/domain/`, `src/modules/products/application/`, `src/modules/products/infrastructure/`; `src/modules/pos/` (lookup + calculators)
- **Frontend**: `app/(private)/catalogs/products/_blocks/`, `app/(private)/catalogs/products/_logic/`
- **Sin breaking changes** para clientes existentes: campo nuevo con default conservador
