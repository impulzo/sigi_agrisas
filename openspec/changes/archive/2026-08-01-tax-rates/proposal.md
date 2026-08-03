## Why

Los productos almacenan `ivaRate` e `iepsRate` como valores decimales directos sin un catálogo de referencia. Esto obliga al operador a recordar y escribir manualmente el porcentaje correcto en cada producto, genera inconsistencias y no permite reportes agrupados por tasa. Se crea un catálogo administrable de tasas de impuesto que centraliza los porcentajes y permite asociar cada producto a una tasa de forma explícita.

## What Changes

- Nuevo modelo de dominio `TaxRate` con código único, nombre, descripción y tasa decimal (0–1).
- Migración Prisma: tabla `tax_rates` + columna `tax_rate_id` (nullable, FK con ON DELETE SET NULL) en `products`.
- CRUD completo bajo `/api/v1/admin/tax-rates` con soft-delete protegido (409 si hay productos activos asociados).
- El campo `products.taxRateId` es **informativo** — el cálculo de totales en ventas/cotizaciones sigue usando `ivaRate`/`iepsRate` que el operador mantiene en el producto; `taxRateId` vincula la tasa catálogo para UI y reportes pero no reemplaza los campos de tasa en productos en esta iteración.
- Seed idempotente: `IVA_16` (0.16), `IEPS_8` (0.08), `IVA_0` (0.00).
- RBAC: permisos `tax_rates:read` y `tax_rates:write`; asignados a roles `admin` y `operator`.
- Nueva ruta `/catalogs/tax-rates` con tabla, modal crear/editar.
- Integración en hub de catálogos (nueva tarjeta).
- `ProductGeneralTab` + `ProductEditModal`: selector de tasa (Combobox).
- `ProductsTable`: columna "Tasa" con `taxRate.code` o "—".

## Capabilities

### New Capabilities
- `tax-rates-api`: CRUD de tasas de impuesto — endpoints REST, modelo de dominio, repositorio Prisma, use cases, módulo hexagonal completo.
- `tax-rates-ui`: Interfaz de administración de tasas — página listado, modal crear/editar, integración en hub catálogos y en formulario de producto.

### Modified Capabilities
- `products-api`: Agrega campo `taxRateId` (nullable) en create/update/read; incluye `taxRate` en respuesta de detalle de producto.
- `products-ui`: Agrega selector de tasa en `ProductGeneralTab`/`ProductEditModal`; columna "Tasa" en `ProductsTable`.

## Impact

- Nueva migración: `add_tax_rates_table`
- Nuevo módulo hexagonal: `src/modules/tax-rates/`
- Nuevos routes: `app/api/v1/admin/tax-rates/` (list/create/get/update/delete)
- Modificado: `prisma/schema.prisma` (modelo `TaxRate`, relación en `Product`)
- Modificado: `src/modules/products/` (domain, application, repository)
- Modificado: `app/(private)/catalogs/products/` (UI)
- Modificado: `prisma/seeds/rbac.ts` (nuevos permisos)
- Nuevo seed: `prisma/seeds/taxRates.ts` + registro en `prisma/seed.ts`
- Nueva ruta: `app/(private)/catalogs/tax-rates/`
