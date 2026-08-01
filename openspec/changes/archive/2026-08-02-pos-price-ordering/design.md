## Context

Hoy dos repositorios (`PrismaProductPriceRepository.findByProductId` e `InMemoryProductPriceRepository.findByProductId`) ordenan por `is_default DESC, min_quantity ASC, name ASC`, y encima el frontend de POS (`getProductPrices.ts`) re-ordena en cliente sólo por `isDefault`, perdiendo el resto del orden que ya trajo el backend. Con los nombres reales de precio existentes (`Precio Publico`, `Precio Subdis 10%`, `Precio Distri 15%`, `Precio 4`, `General`), el resultado final visible al cajero no coincide con la jerarquía de negocio esperada (ver proposal.md - Why).

## Goals / Non-Goals

**Goals:**
- Un único criterio de orden, correcto por defecto para los 4 nombres de precio reales del catálogo (historia 1 y 2 de la tabla).
- Backend como única fuente de verdad del orden — el frontend (POS y catálogo) no debe duplicar ni reinterpretar la regla.
- No romper productos con nomenclatura de precios distinta a la convención agro actual (deben seguir listándose, sólo sin garantía de posición "de negocio").

**Non-Goals:**
- No se introduce un campo estructurado nuevo (ej. `tierRank`) para volver la prioridad configurable por admin — el matching es por patrón de `name`, documentado y de bajo riesgo dado que sólo existen 5 nombres reales hoy (ver Riesgos).
- No se toca la captura/edición de precios en `ProductPricesTab` — ya son inputs de texto libre sin guardas NaN (verificado en el código actual), no hay bug de UX que arreglar ahí.

## Decisions

**D1 — Función pura de dominio, no lógica inline en cada repositorio**
`src/modules/products/domain/services/sortProductPricesForDisplay.ts` exporta `sortProductPricesForDisplay(prices: ProductPrice[]): ProductPrice[]`. Ambos repos (Prisma e InMemory) fetchean sin `ORDER BY` de negocio (o con uno mínimo) y aplican esta función en memoria antes de retornar. Alternativa descartada: replicar el `CASE WHEN` en SQL crudo vía Prisma — más frágil de testear y duplicado entre Prisma/InMemory (viola la regla del proyecto de mantener ambos repos en paridad para tests). El volumen de precios por producto es pequeño (<10 filas típico), el costo de ordenar en memoria es despreciable.

**D2 — Matching por patrón de `name`, no por catálogo de nombres exactos**
Prioridad: `isDefault === true` → rango 0; `name` matchea `/subdis/i` → rango 1; `name` matchea `/distri/i` → rango 2; resto → rango 3 (desempate `name ASC`, igual que el comportamiento previo para el remanente). Se usa `subdis`/`distri` como substrings (no el string completo "Precio Subdis 10%") porque son estables ante variaciones menores del nombre (ej. "Subdistribuidor", "SUBDIS") y responden directamente a la fila 2 de la tabla de Historia de Usuario. Alternativa descartada: lista exacta de 4 strings — más frágil si un producto tiene el nombre con mayúsculas/espacios distintos.

**D3 — Frontend deja de re-ordenar (`getProductPrices.ts`)**
Se elimina el `.sort()` client-side existente (línea que sólo agrupaba por `isDefault`). El POS confía en el orden ya correcto que entrega la API — mismo patrón que otras listas del proyecto (orden se resuelve server-side, cliente sólo muestra). `ProductPricesTab` no tiene sort propio — ya hereda el orden del backend vía `useProductPrices`, así que no requiere cambio de código, sólo se beneficia del fix en el repositorio.

## Risks / Trade-offs

- **[Riesgo] Un producto con un nombre de precio ambiguo (ej. "Distribuidor Subdis Especial") podría matchear dos patrones.** Mitigado: el `if/else if` evalúa `subdis` antes que `distri`, dando prioridad determinística única por precio (un precio sólo puede caer en un rango). No se han visto casos así en los 5 nombres reales existentes.
- **[Riesgo] Nuevos precios con nombres fuera de la convención agro (ej. si el negocio agrega "Precio Mayoreo") caerán en el rango 3 (resto), no en una posición de negocio específica.** Aceptado explícitamente como Non-Goal — no se generaliza a un sistema de prioridad configurable en este change; si se requiere, es un change futuro con su propio requirement.
