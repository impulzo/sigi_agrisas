## 1. Implementación del departamento fallback

- [x] 1.1 En `prisma/seeds/lib/inventoryTiendasSeedLogic.ts`, agregar constante `FALLBACK_DEPARTMENT_NAME = "Sin Departamento"` y campo `tlaxiacoFallbackDepartment: number` en `TiendasSeedCounters` (inicializado en `emptyCounters()`)
- [x] 1.2 En el loop Tlaxiaco (rama `else` de "sin match"), reemplazar el `if (!row.departmentName) { ...error...continue }` actual: cuando `!row.departmentName`, resolver `departmentId = await resolveDepartmentId(FALLBACK_DEPARTMENT_NAME)` en vez de omitir la fila, incrementar `counters.tlaxiacoFallbackDepartment`, y continuar con el mismo flujo de síntesis de code + auto-creación ya existente (sin duplicar esa lógica — reusar la rama de creación actual con el `departmentId` resuelto por cualquiera de las dos vías)
- [x] 1.3 Confirmar que la validación de code sintetizado (`CODE_REGEX`) y la detección de colisión (`syntheticCodeOwners`) se aplican igual en la rama fallback, sin duplicar esa lógica
- [x] 1.4 Actualizar `printTiendasSeedReport()` para imprimir `tlaxiacoFallbackDepartment` junto al resto de conteos de Tlaxiaco

## 2. Tests

- [x] 2.1 En `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts`, agregar caso: fila Tlaxiaco sin match de nombre y `departmentName: null` → producto se auto-crea con `departmentId` del departamento `"Sin Departamento"` (`code: "SIN_DEPARTAMENTO"`), `counters.tlaxiacoFallbackDepartment` incrementa, `counters.errors` no crece
- [x] 2.2 Agregar caso: fila Tlaxiaco sin match de nombre pero CON `departmentName` explícito → sigue usando ese departamento real, NO usa el fallback, `tlaxiacoFallbackDepartment` no incrementa (regresión del comportamiento ya existente)
- [x] 2.3 Agregar caso: dos filas sin match y sin departamento con nombres que normalizan al mismo `code` sintetizado → la segunda sigue reportándose como `error` por colisión (D10 sin cambios), no por falta de departamento
- [x] 2.4 Agregar caso: dos filas sin match y sin departamento en la misma corrida (nombres distintos, sin colisión de code) → ambas usan el MISMO `departmentId` de `"Sin Departamento"` (una sola fila de departamento creada, cache reutilizado)
- [x] 2.5 `npx jest tests/unit/modules/seeds/` — suite completa en verde, sin regresión en los 60 tests existentes (64/64: 60 + 4 nuevos)

## 3. Verificación real

- [x] 3.1 Correr `npm run seed:inventory-tiendas` contra la DB real de desarrollo; confirmar en el reporte que `tlaxiacoFallbackDepartment = 38` (o el número vigente si el Excel no cambió) y que `counters.errors` ya no incluye esas 38 filas — confirmado: `tlaxiacoFallbackDepartment: 38`, `productsCreated: 38`, reporte sin sección de errores (antes 38 errores)
- [x] 3.2 Verificación SQL directa: `SELECT code, name FROM departments WHERE code = 'SIN_DEPARTAMENTO'` retorna exactamente 1 fila; `SELECT count(*) FROM products WHERE department_id = (SELECT id FROM departments WHERE code = 'SIN_DEPARTAMENTO')` retorna 38 (o el número vigente) — confirmado vía `mcp__supabase__execute_sql`: 1 fila (`code: "SIN_DEPARTAMENTO", name: "Sin Departamento"`), count = 38
- [x] 3.3 Correr el seeder una segunda vez (idempotencia): confirmar que no se duplica la fila de `departments` ni los 38 productos (mismos `id`, `branch_inventory`/`product_prices` se pisan igual que el resto del flujo) — confirmado: 2da corrida reporta `productsCreated: 0`, `tlaxiacoFallbackDepartment: 0`, `tlaxiacoMatched: 367` (los 38 ahora matchean por nombre); SQL confirma `dept_count: 1, product_count: 38` sin cambio
- [x] 3.4 `opsx:verify` — ver reporte al final de este documento

---

## Verification Report

### Summary

| Dimensión | Estado |
|---|---|
| Completeness | 13/13 tasks, 1/1 requirement (MODIFIED) implementado |
| Correctness | Requirement cubierto con implementación + 4 tests nuevos dedicados; 64/64 tests suite completa |
| Coherence | design.md — 4/4 decisiones seguidas, sin desviación |

### Completeness

**Tareas**: 13/13 marcadas `[x]`, ninguna pendiente.

**Cobertura de requirement** (1 MODIFIED en `specs/data-seeding/spec.md`):

| Requirement | Implementación |
|---|---|
| Emparejamiento de Tlaxiaco por nombre normalizado (rama fallback) | `prisma/seeds/lib/inventoryTiendasSeedLogic.ts:322,338-339` (constante `FALLBACK_DEPARTMENT_NAME`, contador `tlaxiacoFallbackDepartment`, resolución condicional de `departmentId`) |

Ningún requirement sin implementación detectada.

### Correctness

- Los 5 escenarios de la spec están cubiertos por tests dedicados en `tests/unit/modules/seeds/inventoryTiendasSeedLogic.test.ts`:
  - "sin match, sin departamento → fallback" — test "Tlaxiaco sin match y sin departamento usa el departamento fallback en vez de omitirse"
  - "sin match, con departamento explícito → no usa fallback" — test "Tlaxiaco sin match pero CON departamento explícito no usa el fallback"
  - "idempotencia del departamento fallback" — cubierto por test "dos filas fallback distintas... comparten el mismo departamento" (mismo mecanismo de cache que garantiza idempotencia entre corridas) + verificado en corrida real (ver abajo)
  - "colisión de code sintetizado se reporta sin sobrescribir" — test "colisión de code sintetizado entre dos filas fallback se reporta como error, no como falta de departamento"
  - "match por nombre sigue funcionando" — cubierto por los 3 tests preexistentes de matching, sin regresión
- Suite completa: `npx jest tests/unit/modules/seeds/` → 5 suites, 64/64 tests (60 preexistentes + 4 nuevos).
- Corrida real contra la DB de desarrollo (`npm run seed:inventory-tiendas`, dos corridas completas vía proceso detached + Monitor, ~1817 filas cada una):
  - 1ª corrida: `productsCreated: 38`, `tlaxiacoFallbackDepartment: 38`, `tlaxiacoCreated: 38`, reporte sin sección de errores (antes de este change, esas 38 filas se contaban como `errors`).
  - 2ª corrida (idempotencia): `productsCreated: 0`, `tlaxiacoFallbackDepartment: 0`, `tlaxiacoMatched: 367` (las 38 ahora matchean por nombre exacto, ya en catálogo).
  - Verificación SQL directa (`mcp__supabase__execute_sql`, proyecto `qzzjpyepggwautckqeex`): `departments WHERE code='SIN_DEPARTAMENTO'` → exactamente 1 fila (`name: "Sin Departamento"`) tras ambas corridas; `products WHERE department_id=<ese id>` → 38 tras ambas corridas (sin duplicar).

### Coherence

Las 4 decisiones de `design.md` se siguieron sin desviación:
- D1 — reusa `resolveDepartmentId` existente, sin mecanismo paralelo: confirmado, `inventoryTiendasSeedLogic.ts:338` llama al mismo helper que el resto del seeder.
- D2 — activación estrictamente en la sub-rama "sin match Y sin departamento": confirmado, el flag `usesFallbackDepartment` se calcula sólo dentro del `else` de "sin match" (línea 322) y nunca reemplaza `row.departmentName` cuando viene explícito.
- D3 — contador separado `tlaxiacoFallbackDepartment`, no mezclado en `tlaxiacoCreated`: confirmado, ambos contadores incrementan independientemente (`tlaxiacoCreated` sigue contando el total de auto-creados, `tlaxiacoFallbackDepartment` es un subconjunto visible aparte).
- D4 — sin cambios a la regla de colisión de code sintetizado: confirmado, `syntheticCodeOwners` no fue tocado; test de colisión con filas fallback pasa sin modificación de esa lógica.

### Issues

Ninguno CRITICAL. Ninguno WARNING. Ninguno SUGGESTION.

### Final Assessment

Sin issues. Todos los checks pasaron. Listo para archivar (cuando el usuario lo indique explícitamente, por protocolo del repo — junto con `seed-tiendas-inventory-v3`, ambos pendientes sólo de `opsx:archive`).
