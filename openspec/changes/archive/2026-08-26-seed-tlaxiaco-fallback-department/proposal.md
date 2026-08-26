## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Dev/ops que corre seeders locales | Como dev/ops, quiero que el seeder `inventory-tiendas.ts` asigne un departamento fallback (`SIN_DEPARTAMENTO`) a las filas de `INV TLAXIACO` que no matchean ningún producto existente por nombre normalizado Y tampoco traen `Departamento` explícito en el Excel, en vez de omitirlas | para no perder ~38 productos reales (adaptadores, coples, válvulas, agroquímicos como ALIETTE/AMISTAR/BACTROL/FINALBACTER, aspersoras, cintillas) del catálogo multi-sucursal sólo porque la captura manual del Excel dejó el campo Departamento vacío, mientras se preserva sin cambios el criterio de matching exacto-tras-normalizar ya decidido (D9) | - Departamento fallback `SIN_DEPARTAMENTO` se resuelve vía el mismo `resolveDepartmentId`/upsert idempotente que usa el resto del seeder (no una tabla ni ruta de código paralela)<br>- Se usa ÚNICAMENTE cuando la fila no matcheó por nombre Y `row.departmentName` es `null`/vacío — una fila con match de nombre sigue el flujo existente sin tocar su departamento (no-agresivo, historia 6 original); una fila sin match pero CON departamento explícito sigue usando ese departamento real, no el fallback<br>- Las 38 filas hoy omitidas se auto-crean tras el fix, contadas en un nuevo contador `tlaxiacoFallbackDepartment` en el reporte (no se mezclan silenciosamente en `tlaxiacoCreated` sin visibilidad)<br>- Colisión de code sintetizado entre dos de estas filas sigue reportándose como error y omitiéndose (regla D10 sin cambios)<br>- Rerunable: correr el seeder dos veces no duplica el departamento `SIN_DEPARTAMENTO` ni los productos creados bajo él | - No se auto-asigna el fallback a ninguna fila que sí tenga `Departamento` explícito en el Excel, aunque esté vacío tras trim de espacios en blanco no estándar (se normaliza igual que el resto de la columna, no un caso especial silencioso)<br>- El contador nuevo hace auditable en el reporte cuántos productos entraron por esta vía excepcional, para revisión manual posterior de asignación real de departamento |

## Why

El verify de `seed-tiendas-inventory-v3` (40/40 tareas, sin issues críticos) dejó documentada como SUGGESTION no bloqueante que 38 filas de `INV TLAXIACO` quedan fuera del catálogo: no matchean ningún producto existente por nombre normalizado y tampoco traen `Departamento` explícito en el Excel fuente (columna `"- Sin Departamento -"` o vacía → `null`), y `Product.departmentId` es un FK `NOT NULL` en el schema — sin departamento resoluble, el seeder no puede auto-crear el producto (regla explícita de la historia 6 del change original) y la fila se cuenta como `error`. Verificado por corrida real read-only contra la DB de desarrollo (`prisma.product.findMany` + `normalizeProductNameForMatching`): las 38 filas son productos reales de ferretería/plomería y agroquímicos (`ADAPTADOR HEMBRA`, `ALIETTE DOSIS 500GRS`, `BACTROL 2X DE 800 GRS`, `FINALBACTER DE 800 GRS`, `ASPERSORA FIAT 20L AZUL`, `CINTILLA CHICA 6 MIL A 10CM`, etc.), no ruido ni filas basura del Excel. El usuario indicó explícitamente asignarlas a un departamento general en vez de seguir omitiéndolas.

## What Changes

- `prisma/seeds/lib/inventoryTiendasSeedLogic.ts` (loop Tlaxiaco, rama sin match): cuando `row.departmentName` es `null`/vacío, en vez de omitir la fila con `error`, resuelve un departamento fallback fijo (`code: "SIN_DEPARTAMENTO"`) vía el mismo `resolveDepartmentId`/upsert idempotente ya usado por el resto del seeder, y continúa el flujo normal de auto-creación (mismo criterio D10: code sintetizado del nombre real, nunca del numérico de Tlaxiaco).
- Nuevo contador `tlaxiacoFallbackDepartment` en `TiendasSeedCounters` y en `printTiendasSeedReport`, para distinguir auditablemente estas 38 filas de las que sí tenían un departamento explícito resoluble.
- No cambia: criterio de matching exacto-tras-normalizar (D9), síntesis de code (D10), manejo de colisión de code sintetizado, ni el comportamiento de las 4 tiendas de code alineado o de Agrisas.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `data-seeding`: modifica el requirement "Emparejamiento de Tlaxiaco por nombre normalizado" (de `seed-tiendas-inventory-v3`) — agrega la resolución de departamento fallback para filas sin match y sin departamento explícito, en vez de omitirlas.

## Impact

- **Código**: `prisma/seeds/lib/inventoryTiendasSeedLogic.ts` (rama sin match del loop Tlaxiaco, `TiendasSeedCounters`, `printTiendasSeedReport`).
- **Tests**: `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts` — nuevos casos para fila sin match + sin departamento (usa fallback) vs. fila sin match + con departamento explícito (sigue igual, no usa fallback).
- **DB**: nueva fila en `departments` (`code: "SIN_DEPARTAMENTO"`) sólo si no existe ya; hasta 38 filas nuevas en `products`/`branch_inventory`/`product_prices` (Tlaxiaco) que hoy no se crean.
- **No afecta**: UI, API HTTP, otras 5 hojas del Excel (Agrisas + 4 tiendas de code alineado), ni el criterio de matching por nombre (D9) — sólo la rama de "sin match Y sin departamento" que hoy termina en `error`.
- **Dependencia**: requiere `seed-tiendas-inventory-v3` ya implementado en la rama (40/40 tareas, verify limpio, pendiente sólo de `opsx:archive` explícito).
