## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Desarrollador (mantiene seeders de inventario) | Como desarrollador, quiero que el generador de datos de inventario (`generate-inventory-data.ts`) traduzca el texto crudo de la columna "Unidad" del Excel ("PZA", "NA") a claves reales del catálogo SAT `c_ClaveUnidad` (H87="Pieza", ACT="Actividad") antes de emitir `inventario-agrisas-v2.ts`, y que re-sembrar (`npm run seed:inventory`) propague esas claves a los productos ya existentes en BD, para que `Product.unit` quede consistente con lo que exige la UI/API de catálogo (`SatCatalogCombobox`, regex `^[A-Za-z0-9]{2,3}$`) y `resolveUnitDescriptions()` pueda resolver la descripción humana en vez de caer al valor crudo | - Dado el Excel fuente con "Unidad"="PZA", al regenerar, la fila emitida tiene `unit:"H87"`.<br>- Dado "Unidad"="NA" (líneas no físicas: descuento, servicio), al regenerar, la fila emitida tiene `unit:"ACT"`.<br>- Dado un valor de "Unidad" no contemplado en el mapeo, el generador cae a `DEFAULT_UNIT_CODE="H87"` y emite un `console.warn` visible (no falla silenciosamente ni omite la fila).<br>- Tras regenerar, el conteo de productos/departamentos/omitidos/colisiones es idéntico al run previo (580 productos) — el único diff es el campo `unit`.<br>- Tras `npm run seed:inventory`, productos ya existentes en BD quedan con `unit` actualizado a la clave nueva vía `upsert` (no se duplican, coincide por `code`).<br>- En `/catalogs/products`, la columna de unidad muestra "Pieza"/"Actividad" (vía `unitDescription`) en vez de "PZA"/"NA" crudo. | - No se toca `satProductCode` (fuera de alcance).<br>- El generador es dev-only (no expone endpoint ni requiere permiso RBAC nuevo).<br>- El mapeo de unidades es whitelist explícita, no heurística, para no asignar silenciosamente una clave SAT incorrecta a un valor futuro no anticipado del Excel. |

## Why

`openspec/specs/products-api/spec.md` ya documenta como comportamiento esperado que un producto con `unit` como texto libre no capturado del catálogo (datos "prior to this change") resuelva `unitDescription: null` — ese es exactamente el estado actual de los 582 productos del seeder de inventario, que emiten `unit:"PZA"`/`unit:"NA"` (texto legado de `INVENTARIO AGRISAS 2.0.xlsx`, sintácticamente válido contra el regex `^[A-Za-z0-9]{2,3}$` pero inexistente en el catálogo `SatUnitOfMeasure` real). El resultado: catálogo, reportes (Kardex, lista de precios, stock XLSX/PDF) y facturación muestran el crudo "PZA"/"NA" en vez de la descripción SAT ("Pieza"/"Actividad"), aunque la UI de edición de producto (`SatCatalogCombobox`, etiqueta "Unidad (clave SAT) *") ya asume que `unit` contiene una clave real del catálogo. Corregir la fuente del seeder resuelve la deuda de datos legado sin tocar ningún contrato de API.

## What Changes

- `prisma/seeds/data/generate-inventory-data.ts`: reemplazar el paso-through crudo de la columna "Unidad" del Excel por un mapeo explícito (`UNIT_CODE_MAP`) a claves reales `c_ClaveUnidad` (`PZA`→`H87`, `NA`→`ACT`), con `console.warn` y fallback `H87` para valores no mapeados.
- Regenerar `prisma/seeds/data/inventario-agrisas-v2.ts` (582 productos) corriendo el generador contra el Excel fuente ya presente localmente — único diff esperado: el campo `unit` por fila.
- Re-ejecutar `npm run seed:inventory` para propagar el `unit` corregido a los productos ya existentes en BD (upsert idempotente por `code`, ya incluye `unit` en `create` y `update`).

## Capabilities

### New Capabilities
- `inventory-seed-data`: contrato del generador/seeder de inventario (`generate-inventory-data.ts` → `inventario-agrisas-v2.ts` → `seedInventory()`) sobre cómo traduce la columna "Unidad" del Excel fuente a claves reales del catálogo SAT `c_ClaveUnidad`. No existía documentado como spec antes de este cambio.

### Modified Capabilities
(ninguna — no cambia ningún requirement de `products-api`; el escenario "Product with legacy data includes unitDescription null" sigue siendo válido para cualquier dato futuro no capturado del catálogo. Este cambio corrige los *datos* que produce el seeder, no la regla de `products-api`.)

## Impact

- **Código**: `prisma/seeds/data/generate-inventory-data.ts` (generador), `prisma/seeds/data/inventario-agrisas-v2.ts` (datos regenerados, archivo auto-generado versionado).
- **BD**: tabla `products` — `unit` de 582 filas existentes se actualiza vía re-seed (no hay migración de schema).
- **Sin impacto en API/contratos**: no cambian endpoints, DTOs, validaciones ni specs de `products-api`.
- **UI derivada**: catálogo de productos, reportes (Kardex, lista de precios por depto, stock), PDFs de facturación — todos consumen `unitDescription ?? unit` y mostrarán la descripción SAT correcta sin cambios de código en esas capas.
