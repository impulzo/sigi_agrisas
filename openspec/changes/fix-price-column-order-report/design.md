## Context

`priceColumnNames` (`src/modules/reports/domain/services/priceColumnNames.ts`) genera la lista ordenada de nombres de precio para las columnas dinámicas del reporte "Inventario por Departamento". Hoy ordena: default primero, resto por `localeCompare("es-MX")` puro sobre el nombre completo. Con los nombres reales de producción (`Precio Publico`, `Precio Subdis 10%`, `Precio Distri 15%`, `Precio 4`) esto rompe el orden de negocio esperado (historia 1 de `proposal.md`): "Distri 15%" queda antes que "Subdis 10%" porque `D < S` alfabéticamente, aunque el negocio espera subdistribuidor (10%) antes que distribuidor (15%).

El módulo `products` ya resuelve exactamente este problema con `sortProductPricesForDisplay` (`src/modules/products/domain/services/sortProductPricesForDisplay.ts`), consumida por catálogo y POS. `reports` es un módulo hexagonal independiente (`src/modules/reports/`) y su dominio no debe importar de `src/modules/products/*` — cada módulo mantiene su dominio puro y desacoplado de otros módulos (regla de capas del proyecto). Además, la función existente opera sobre `ProductPrice[]` (entidad completa), mientras `priceColumnNames` opera sobre un `Map<string, boolean>` de nombre→isDefault agregado entre productos/departamentos — firmas incompatibles. Por eso la solución es replicar el criterio de rango (mismo patrón de reglas), no importar la función.

La copia del frontend (`InventoryPriceStockTable.tsx`) ya es una duplicación consciente y documentada (comentario en el archivo) porque `app/` (cliente) no puede importar `src/modules/*` (regla de capas frontend). Un test de paridad (`tests/unit/ui/(private)/reports/InventoryPriceStockTable.test.tsx`) ya existe y sirve de guardarraíl para mantener ambas copias sincronizadas — este change extiende ese mismo test, no introduce mecanismo nuevo.

## Goals / Non-Goals

**Goals:**
- Que `priceColumnNames` (backend y copia frontend) ordene las columnas de precio por rango de negocio (isDefault → subdistribuidor → distribuidor → otros), igual que `sortProductPricesForDisplay`, en vez de alfabético puro (historia 1).
- Mantener el orden idéntico entre las 3 salidas (web, PDF, Excel) — ya garantizado hoy porque las tres consumen la misma función/copia; se preserva sin cambio arquitectónico.
- Mantener fallback alfabético es-MX para nombres que no matchean ningún patrón conocido, y para desempate dentro del mismo rango (historia 1, edge cases).

**Non-Goals:**
- No se toca `sortProductPricesForDisplay` ni su consumo en catálogo/POS.
- No se resuelve la divergencia de alcance per-department (PDF/Excel) vs global (web) en el cálculo de qué columnas aparecen — señalado en sesión previa, decisión explícita del usuario de dejarlo fuera de este change.
- No se introduce un mecanismo de importación compartida entre `reports` y `products` (violaría independencia de módulos hexagonales) ni se elimina la duplicación backend/frontend existente (restricción de capas de Next.js ya documentada en el código).
- No se agregan columnas ni se cambian columnas fijas del reporte.

## Decisions

**Replicar el patrón de rango de `sortProductPricesForDisplay`, adaptado a la firma de `priceColumnNames`.**

`priceColumnNames` no recibe `ProductPrice[]`, recibe `DepartmentPriceListDepartmentDto[]` y produce `Map<string, boolean>` (nombre → isDefault agregado). El rango se calcula sobre el **nombre** del precio, no sobre la entidad completa:

```ts
function priorityOf(name: string, isDefault: boolean): number {
  if (isDefault) return 0;
  if (/subdis/i.test(name)) return 1;
  if (/distri/i.test(name)) return 2;
  return 3;
}
```

Mismos 4 rangos, mismos patrones regex (`/subdis/i`, `/distri/i`) que `sortProductPricesForDisplay.ts:5-6` — decisión deliberada de copiar el patrón exacto (no inventar uno nuevo) para que el reporte muestre el mismo orden que el usuario ya ve en catálogo/POS para los mismos productos. Alternativa descartada: extraer un helper compartido en `src/shared/domain/` — se descarta porque el criterio (regex sobre nombres de precio en español, específico del dominio de pricing) pertenece conceptualmente a `products`, no a `shared`; moverlo a `shared` para un solo caso de reuso no está justificado (no hay un tercer consumidor hoy) y el módulo `reports` seguiría sin poder importarlo si viviera en `products`.

**Ordenamiento final:** rango ascendente, `localeCompare("es-MX")` en empate (mismo que `sortProductPricesForDisplay.ts:11-15` y el criterio de empate que ya tenía `priceColumnNames`).

**Duplicación backend/frontend se mantiene, no se resuelve en este change** — ya documentada y ya guardada por test de paridad; extenderla con el mismo patrón en ambas copias es consistente con cómo se hizo el cambio anterior (`2026-08-19-product-acquisition-price-report-order`, que introdujo la duplicación original).

## Risks / Trade-offs

- **[Riesgo] Nombres de precio futuros que no matcheen ningún patrón** (ej. "Mayoreo", "Especial") caen todos en rango 3 y se ordenan alfabéticamente entre sí — mismo comportamiento que tiene hoy `sortProductPricesForDisplay` en catálogo/POS para esos casos, así que no es una regresión nueva, es el comportamiento ya aceptado del negocio. → Mitigación: ninguna requerida, es el comportamiento esperado y ya en producción en otro módulo.
- **[Riesgo] Duplicación backend/frontend se olvida de actualizar en un lado.** → Mitigación: test de paridad existente (`InventoryPriceStockTable.test.tsx`) falla si las copias divergen; se extiende con los nuevos casos en ambos archivos en el mismo commit.
- **[Trade-off] No se extrae un helper compartido** entre `products` y `reports` para este patrón de rango, aceptando duplicación de la función `priorityOf` (regex) entre 3 lugares (products, reports-backend, reports-frontend) en vez de 1. Aceptado porque cruzar módulos hexagonales para esto violaría la regla de independencia de dominio, y el volumen (una función de 5 líneas) no justifica una capa compartida nueva.

## Migration Plan

No aplica — cambio de lógica de ordenamiento puro (sin I/O, sin migración de datos, sin cambio de contrato HTTP). Deploy estándar; sin rollback especial más allá de revertir el commit.

## Open Questions

Ninguna — criterio de rango tomado del patrón ya validado y en producción (`sortProductPricesForDisplay`), no requiere nueva decisión de negocio.
