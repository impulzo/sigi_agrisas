## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Operador de POS y Administrador de catálogo de productos | Como Cajero/Operador de POS y Administrador de catálogo, quiero que el selector de tarifas del POS y la tabla de precios del catálogo muestren siempre el orden Público → Subdis 10% → Distri 15% → otras tarifas para elegir la tarifa correcta sin depender del orden alfabético actual | Evitar que el cajero seleccione por error la tarifa equivocada (hoy "Precio 4" aparece antes que "Precio Subdis 10%" por orden alfabético, sin relación con la prioridad de negocio real) | - Given un producto con precios "Precio Publico" (default), "Precio Subdis 10%", "Precio Distri 15%" y "Precio 4", When se lista en POS o en `ProductPricesTab`, Then el orden mostrado es exactamente Publico, Subdis 10%, Distri 15%, Precio 4<br>- Given un producto con un nombre de precio que no matchea ningún patrón conocido (ej. "General"), When se lista, Then aparece al final, ordenado alfabéticamente junto a otros no reconocidos (comportamiento heredado, sin romper productos con nomenclatura distinta)<br>- Given un producto con un solo precio (el default), When se lista, Then aparece solo, sin error | - El orden es puramente de presentación — no debe alterar `price`, `isDefault`, `minQuantity` ni ningún dato persistido<br>- El endpoint sigue requiriendo `products:read`; no se introduce exposición de datos nueva |
| 2 | Sistema/backend (`GET /api/v1/admin/products/:id/prices`) | Como sistema, quiero exponer los precios de un producto ordenados por prioridad de negocio (default primero, luego `name` que matchea "subdis", luego "distri", luego el resto por `name ASC`) en vez de `is_default DESC, min_quantity ASC, name ASC` | Es el único punto de cambio de contrato que permite que POS y catálogo compartan el mismo orden correcto sin duplicar la regla de prioridad en cada cliente | - Given precios con nombres variados que incluyen "subdis"/"distri" (case-insensitive) en cualquier posición del string, When se listan, Then se agrupan y ordenan según la prioridad default→subdis→distri→resto<br>- Given dos precios no-default sin match de patrón, When se listan, Then el desempate sigue siendo `name ASC` (comportamiento previo preservado para el resto)<br>- Given ningún precio marcado `isDefault`, When se listan, Then no hay error — simplemente ningún precio ocupa el rango 0, el resto sigue su regla | - Requiere `products:read` (sin cambio de permisos)<br>- Cambio es de sólo-lectura/orden; no debe introducir mutación ni afectar unicidad de `isDefault` existente<br>- Repositorio Prisma e InMemory deben mantenerse equivalentes (regla del proyecto: tests contra InMemory, nunca mock de BD real) |

Nota: se dividió en 2 historias porque mezclan capas independientes — historia 1 es el efecto visible (UI en POS y catálogo), historia 2 es el contrato de backend que lo habilita; ambas se implementan en este mismo change pero son negociables/testeables por separado.

## Why

Feedback de producción (#33 de la auditoría) reporta que el orden de precios en caja no respeta la jerarquía de negocio esperada (Público primero, luego los descuentos por volumen 10%/15%, luego el resto). Se confirmó contra datos reales de la BD que sólo existen 5 nombres de precio en todo el catálogo (`Precio Publico` ×582, `Precio Subdis 10%` ×336, `Precio Distri 15%` ×247, `Precio 4` ×126, `General` ×1) y que el orden actual documentado (`is_default DESC, min_quantity ASC, name ASC`) degenera, para el caso real, en el orden alfabético incorrecto "Precio 4, Precio Distri 15%, Precio Subdis 10%" — el cajero puede seleccionar por error una tarifa distinta a la que el cliente corresponde. El fix es de bajo riesgo (cambia sólo el criterio de ordenamiento de una lectura, ningún dato mutado) y de alto impacto operativo diario.

## What Changes

- `GET /api/v1/admin/products/:id/prices` cambia su orden documentado: en vez de `is_default DESC, min_quantity ASC, name ASC`, ahora es prioridad de negocio — `isDefault=true` primero, luego `name` que matchea `/subdis/i`, luego `name` que matchea `/distri/i`, luego el resto por `name ASC` (mismo desempate final que antes, aplicado sólo al remanente).
- El ordenamiento se centraliza en una función pura de dominio (`sortProductPricesForDisplay`) reutilizada por `PrismaProductPriceRepository.findByProductId` e `InMemoryProductPriceRepository.findByProductId`, evitando divergencia entre ambos repositorios.
- `app/(private)/pos/_logic/services/getProductPrices.ts` elimina su `.sort()` redundante (que sólo agrupaba por `isDefault` y perdía el resto del orden del backend) — el cliente confía en el orden ya correcto que entrega la API.
- `ProductPricesTab` (catálogo) no cambia de código — hereda el nuevo orden automáticamente porque consume el mismo endpoint vía `useProductPrices`.
- Sin cambios de permisos, de schema de base de datos, ni de los datos persistidos — es puramente el criterio de `ORDER BY` de una lectura.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `products-api`: modifica el requirement de `GET /api/v1/admin/products/:id/prices` — cambia el orden documentado de los resultados.

## Impact

- `src/modules/products/domain/services/sortProductPricesForDisplay.ts` (nuevo, función pura)
- `src/modules/products/infrastructure/repositories/PrismaProductPriceRepository.ts` — usa la nueva función tras el fetch
- `src/modules/products/infrastructure/repositories/InMemoryProductPriceRepository.ts` — usa la misma función (paridad de tests)
- `app/(private)/pos/_logic/services/getProductPrices.ts` — elimina el `.sort()` cliente redundante
- `openspec/specs/products-api/spec.md` — actualiza el texto de orden documentado del endpoint de precios
- Tests: unit del nuevo servicio de dominio, tests existentes de los repos (Prisma vía integración/InMemory) y del service `getProductPrices.ts`
