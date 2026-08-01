## Why

El catálogo de productos del sistema necesita inicializarse con los datos reales del negocio definidos en "Inventario Agrisas 2.0". El seeder previo cargaba productos pero **hardcodeaba `price: 0`** (un solo `ProductPrice` `"Default"` por producto), dejando el catálogo sin precios reales y el POS sin poder vender. El archivo fuente `INVENTARIO AGRISAS 2.0.xlsx` ya incluye **múltiples columnas de precio por producto**, el **Código SAT** y la **Existencia** inicial, que deben cargarse.

## What Changes

- Reescribir `prisma/seeds/inventory.ts` como orquestador idempotente (departamentos + sucursal matriz + delegación al engine `lib/inventorySeedLogic.ts`)
- **Embeber todos los datos en TypeScript** (`prisma/seeds/data/inventario-agrisas-v2.ts`): el Excel NO se lee en runtime. Un generador dev-only (`prisma/seeds/data/generate-inventory-data.ts`) transforma `INVENTARIO AGRISAS 2.0.xlsx` → TS y solo se re-ejecuta si cambia el Excel
- Mapea campos a: `Product` (code, name, unit, departmentId, **satProductCode** desde `Codigo SAT`, ivaRate, iepsRate, isTaxable, isActive), **múltiples** `ProductPrice` (un tier por columna `/precio/i`; `Precio Publico` = default) y `BranchInventory` (**quantity** desde `Existencia`, en la matriz)
- Detección dinámica de columnas de precio; `Precio Publico` siempre se crea (aunque sea 0) como default; tiers extra solo si valor `> 0`
- Enforce un solo `isDefault` por producto (limpia el previo + borra placeholder legacy `"Default"`) por el índice `product_default_price_idx`
- Lógica upsert: crea si no existe (por `code`); actualiza campos mapeados si ya existe; reporta `created`/`updated`/`skipped`/`errors`
- Comando npm: `npm run seed:inventory`
- Reporte en stdout: resumen de productos, precios e inventario (creados/actualizados/omitidos/errores)

## Capabilities

### New Capabilities

- `data-seeding`: seeder de inventario con datos reales de Agrisas, idempotente, con reporte

### Modified Capabilities

_(ninguna spec existente cambia requisitos)_

## Impact

- **Archivos**: reescribe `prisma/seeds/inventory.ts`; reemplaza `prisma/seeds/data/inventario-agrisas-v2.ts` (tipo extendido + datos embebidos); nuevos `prisma/seeds/data/generate-inventory-data.ts` y `prisma/seeds/lib/normalize.ts`; extiende `prisma/seeds/lib/inventorySeedLogic.ts`
- **`package.json`**: script `seed:inventory` (ya existente)
- **Sin cambios de esquema** (`Product`, `ProductPrice`, `BranchInventory` ya existen)
- **Dependencia externa solo para regenerar**: `INVENTARIO AGRISAS 2.0.xlsx` se necesita únicamente al ejecutar el generador; el seeder de runtime consume el TS embebido
- **Sin breaking changes**

> **Nota**: los datos del negocio quedan embebidos en el TS generado. Para actualizarlos, reemplazar `INVENTARIO AGRISAS 2.0.xlsx` y re-ejecutar el generador.
