## 1. Backend — criterio de rango

- [x] 1.1 En `src/modules/reports/domain/services/priceColumnNames.ts`, agregar función `priorityOf(name: string, isDefault: boolean): number` (isDefault→0, `/subdis/i`→1, `/distri/i`→2, resto→3), mismo patrón regex que `sortProductPricesForDisplay.ts:3-8`.
- [x] 1.2 Reemplazar el comparador de `priceColumnNames` para ordenar por `priorityOf` ascendente, con `localeCompare("es-MX")` como desempate dentro del mismo rango.

## 2. Frontend — paridad de la copia local

- [x] 2.1 Replicar el mismo cambio (función `priorityOf` + comparador) en `app/(private)/reports/_blocks/InventoryPriceStockTable.tsx:25-41`, manteniendo el comentario existente que documenta la duplicación intencional.

## 3. Tests

- [x] 3.1 En `tests/unit/modules/reports/domain/services/priceColumnNames.test.ts`, agregar caso con nombres reales de producción (`Precio Publico` isDefault, `Precio Subdis 10%`, `Precio Distri 15%`, `Precio 4`) esperando `["Precio Publico", "Precio Subdis 10%", "Precio Distri 15%", "Precio 4"]`.
- [x] 3.2 Verificar que los casos existentes del archivo (nombres-número puros, casos sin default, etc.) siguen pasando sin modificación — todos caen en rango 3 (ninguno matchea subdis/distri) y mantienen el mismo desempate alfabético que antes.
- [x] 3.3 En `tests/unit/ui/(private)/reports/InventoryPriceStockTable.test.tsx`, agregar el mismo caso de paridad con nombres reales, verificando que `uiPriceColumnNames` produce el mismo resultado que `backendPriceColumnNames`.

## 4. Verificación

- [x] 4.1 Correr `npx jest tests/unit/modules/reports/domain/services/priceColumnNames.test.ts` y `npx jest --testPathPattern="InventoryPriceStockTable"` — ambos en verde (11/11).
- [x] 4.2 Correr `npm test` completo para descartar regresiones fuera del alcance directo. 3570/3575 pasan; 5 fallas preexistentes en `tests/integration/modules/inventory/inventory-crud.test.ts` (estado de BD real, módulo `inventory` no tocado por este change) — no relacionadas.
