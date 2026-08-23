## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Encargado de inventario (`reports:inventory_read`) | Como encargado de inventario, quiero que las columnas de nivel de precio en el reporte "Inventario por Departamento" (web, PDF, Excel) se ordenen con el mismo criterio de rango de negocio que ya usa el catálogo de productos y el POS (público → subdistribuidor → distribuidor → otros) para leer la jerarquía de descuento sin distorsión alfabética | Hoy "Precio Distri 15%" aparece antes que "Precio Subdis 10%" porque el reporte ordena alfabéticamente el nombre completo en vez de reutilizar el rango ya validado (`sortProductPricesForDisplay`), generando lectura inconsistente frente a catálogo y POS | - Dado un depto con precios `Precio Publico`(isDefault), `Precio Subdis 10%`, `Precio Distri 15%`, `Precio 4` → columnas se muestran `Precio Publico, Precio Subdis 10%, Precio Distri 15%, Precio 4`<br>- Orden idéntico en las 3 salidas (web, PDF, Excel)<br>- Nombres que no matchean isDefault/subdis/distri caen a rango "otros" y se ordenan alfabético es-MX entre sí (empate)<br>- Edge case: dos precios ambos en rango "otros" → orden alfabético es-MX entre ellos, sin regresión<br>- Edge case: producto sin ningún precio `isDefault=true` → no falla; cae a orden subdis/distri/otros normal<br>- Tests de `priceColumnNames.test.ts` e `InventoryPriceStockTable.test.tsx` (paridad backend/frontend) cubren nombres reales con texto alrededor del número, no sólo nombres-número puros | - Sin cambio de superficie de permisos, sigue gated por `reports:inventory_read`<br>- Cambio puramente de orden de presentación (dominio puro, sin I/O), no afecta totales, precios ni acceso a datos<br>- No depende de input no confiable — nombres de precio vienen de catálogo administrado por `products:write` |

## Why

El reporte "Inventario por Departamento" ordena las columnas dinámicas de nivel de precio con `priceColumnNames` (`src/modules/reports/domain/services/priceColumnNames.ts`), un criterio propio: default primero, resto puramente alfabético (`localeCompare("es-MX")`) sobre el nombre completo del precio. Con los nombres reales de producción (`Precio Publico`, `Precio Subdis 10%`, `Precio Distri 15%`, `Precio 4`), ese criterio ordena por la primera letra de la palabra ("Distri" antes que "Subdis"), no por el nivel de descuento — produciendo `Precio Publico, Precio 4, Precio Distri 15%, Precio Subdis 10%`, donde el 15% aparece antes que el 10%.

El catálogo de productos y el POS ya resuelven este mismo problema con `sortProductPricesForDisplay` (`src/modules/products/domain/services/sortProductPricesForDisplay.ts`), que asigna rango por patrón de nombre (isDefault → 0, `/subdis/i` → 1, `/distri/i` → 2, resto → 3) en vez de alfabético puro. El módulo de reportes nunca reutilizó esa función — la duplicó con un criterio distinto y, sin querer, incorrecto para los nombres reales del negocio.

## What Changes

- `priceColumnNames` (backend, `src/modules/reports/domain/services/priceColumnNames.ts`) cambia su criterio de orden de "alfabético puro tras isDefault" a "rango de negocio" (isDefault → 0, `/subdis/i` → 1, `/distri/i` → 2, resto → 3; alfabético es-MX en empate dentro del mismo rango) — mismo criterio que `sortProductPricesForDisplay`.
- La copia duplicada en frontend (`app/(private)/reports/_blocks/InventoryPriceStockTable.tsx`, exportada como `priceColumnNames`) se actualiza en paridad — el cliente no puede importar `src/modules/*`, así que ambas copias deben mantenerse sincronizadas manualmente (igual que hoy), guardado por el test de paridad existente.
- Los tests unitarios de ambas copias (`tests/unit/modules/reports/domain/services/priceColumnNames.test.ts`, `tests/unit/ui/(private)/reports/InventoryPriceStockTable.test.tsx`) se extienden con casos de nombres reales de producción (con texto alrededor del número), no sólo nombres-número puros como hoy.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `reports-api`: `Department price list report PDF and Excel artifacts` — cambia el criterio de orden de las columnas/filas de nivel de precio de alfabético puro a rango de negocio (mismo patrón que `sortProductPricesForDisplay`).
- `reports-ui`: `Inventory by department view` — cambia el criterio de orden de las columnas de nivel de precio de alfabético puro a rango de negocio.

## Impact

- **Backend**: `src/modules/reports/domain/services/priceColumnNames.ts` (única función modificada).
- **Frontend**: `app/(private)/reports/_blocks/InventoryPriceStockTable.tsx` (copia local de `priceColumnNames`, mantiene paridad).
- **Tests**: `tests/unit/modules/reports/domain/services/priceColumnNames.test.ts`, `tests/unit/ui/(private)/reports/InventoryPriceStockTable.test.tsx`.
- **Specs**: `openspec/specs/reports-api/spec.md` (scenario "Orden de columnas de precio — default primero"), `openspec/specs/reports-ui/spec.md` (scenario homólogo) — se actualiza el criterio descrito, no el requisito de "orden idéntico en las 3 salidas" (eso se mantiene).
- **Sin impacto** en columnas fijas del reporte, en PDF/Excel más allá de la función compartida, en `sortProductPricesForDisplay` (no se toca, sólo se replica su criterio), ni en el alcance per-department (PDF/Excel) vs global (web) del cálculo de columnas (fuera de alcance, decisión explícita previa del usuario).
