# QA review — diff sin commitear (kardex, historial de pagos, repo de reportes)

**Veredicto: LISTO PARA MERGE. Sin bloqueantes.**

## Alcance revisado

Diff de trabajo (9 archivos modificados, sin staging):
- `app/(private)/inventory/kardex/_blocks/KardexFilters.tsx`
- `app/(private)/inventory/kardex/_blocks/KardexPage.tsx`
- `app/(private)/inventory/kardex/_logic/hooks/useProductSearch.ts`
- `app/(private)/inventory/kardex/_logic/services/searchProducts.ts`
- `app/(private)/payments/_blocks/PaymentsHistoryToolbar.tsx`
- `app/(private)/payments/_logic/hooks/useProductSearch.ts`
- `app/(private)/payments/_logic/services/searchProducts.ts`
- `src/modules/reports/infrastructure/repositories/PrismaDepartmentPriceListRepository.ts`
- `tests/unit/ui/(private)/payments/services/searchProducts.test.ts`

Más archivos nuevos sin trackear que son parte del mismo trabajo:
- `openspec/changes/fix-inventory-branch-scoping-leaks/` (proposal.md, design.md, tasks.md completos)
- `tests/unit/modules/reports/infrastructure/repositories/PrismaDepartmentPriceListRepository.test.ts`
- `tests/unit/ui/(private)/inventory/kardex/_logic/hooks/useProductSearch.test.ts`
- `tests/unit/ui/(private)/inventory/kardex/_logic/services/searchProducts.test.ts`
- `tests/unit/ui/(private)/payments/_logic/hooks/useProductSearch.test.ts`

Fuera de alcance de esta revisión (no forman parte del diff descrito por el usuario): `.claude/skills/qa-verify-workspace/` y `.claude/skills/qa-verify/` — tooling/skills no relacionados con el fix. No deberían arrastrarse accidentalmente al mismo commit/PR si no es intencional.

## Contexto encontrado

El diff es la implementación completa y ya verificada del change OpenSpec **`fix-inventory-branch-scoping-leaks`** (`openspec/changes/fix-inventory-branch-scoping-leaks/`), con `proposal.md` (4 historias de usuario), `design.md` (4 decisiones D1–D4) y `tasks.md` con **todas las tareas marcadas `[x]`**, incluida una sección 4.2 de verificación manual con Playwright documentada (admin bypass, admin con sucursal elegida, y un usuario operador efímero creado y eliminado sólo para la prueba). Este contexto por sí solo ya da alta confianza; lo que sigue es verificación independiente de que el código en disco coincide con lo documentado y no rompe nada.

## Verificación contra reglas del proyecto (CLAUDE.md)

- **Arquitectura frontend**: `_logic/services/` encapsula el `fetch` (acepta `fetchImpl` para tests), `_logic/hooks/` orquesta estado + deps del `useEffect`, los `_blocks/` (containers) calculan el `branchId` efectivo y lo pasan hacia abajo — cumple la separación de capas documentada.
- **Branch scoping**: el patrón `isBypass === true ? (seleccionDelSelect || undefined) : (branchIdPropio ?? undefined)` es el mismo que ya usa el guard de HQ en POS/Sales (`can("branches:access_all")` como único bypass) — no inventa una ruta de bypass nueva.
- **Backend ya soporta el contrato**: confirmé en `src/modules/products/infrastructure/http/ProductsController.ts` (líneas 67, 153–172) que `GET /api/v1/admin/products` ya valida `branchId` vía `resolveScopedBranchId` sólo cuando viene explícito en el query string — exactamente lo que la spec `products-api` documenta y lo que el fix de frontend asume. Ningún archivo de `src/modules/products/` ni `src/modules/rbac/` fue tocado (cero riesgo de regresión backend).
- **Specs OpenSpec consultadas y conformes**:
  - `openspec/specs/inventory-api/spec.md` → Requirement "No global stock" ("Stock is always reported per branch") — el cambio en `PrismaDepartmentPriceListRepository.ts` (de `WHERE TRUE` a `WHERE scopeBranchId ? branch_id = scopeBranchId : FALSE`) elimina exactamente la violación de este requirement que existía antes.
  - `openspec/specs/products-api/spec.md` → Requirement "List products", semántica de `branchId` (omitido = nunca filtra; presente + no-bypass = debe matchear `x-user-branch-id` o 403) — el frontend ahora respeta esto al no enviar nunca un `branchId` ajeno.
  - No se requiere ni se hizo ningún cambio de spec (correcto según el proposal: es un fix de comportamiento, no de contrato).

## Hallazgo de documentación pre-existente (no bloqueante, no introducido por este diff)

`openspec/specs/reports-api/spec.md` → Requirement "Department price list report JSON DTO": el ejemplo de JSON y la prosa **no mencionan** los campos `stockQuantity` (por producto), `subtotal.totalStock` ni `totals.totalStock`, que sí existen y se devuelven realmente en `GetDepartmentPriceListReportUseCase.ts` (líneas 48, 67-78, 92). Es una deuda de documentación previa a este diff (el campo ya existía antes del cambio; el diff sólo corrige el filtro SQL que alimenta ese campo). Vale la pena un follow-up para sincronizar la spec, pero no bloquea este PR.

## Verificación técnica ejecutada

- `npm test` (suite completa): **585/587 test suites, 4370/4384 tests pasaron** (2 suites / 14 tests skip, preexistentes y no relacionados). Incluye los 3 bloques de tests nuevos/actualizados (`PrismaDepartmentPriceListRepository.test.ts` con los 3 casos de `tasks.md` 1.2; `useProductSearch`/`searchProducts` de kardex y payments con casos "sin branchId", "con branchId" y "re-fetch al cambiar branchId").
- `npm run lint`: sin errores. Sólo warnings preexistentes en archivos no tocados por este diff (`next/image`, deps de hooks en `ProductsPage.tsx` / `useProductDosifications.ts`).
- `npm run build`: compila y type-checkea sin errores.

## Pendiente antes de abrir el PR (housekeeping, no bloqueante de código)

- `openspec/changes/fix-inventory-branch-scoping-leaks/` y los 4 archivos de test nuevos están **sin trackear** — hace falta `git add` explícito de esos paths (además de los 9 modificados) para que el PR incluya el proposal versionado y la cobertura de test completa.
- No archivar el change (`opsx:archive`) salvo que el usuario lo pida explícitamente — `tasks.md` lo tiene todo `[x]` pero el protocolo del proyecto exige indicación explícita para archivar.

## Conclusión

Sin bloqueantes. El fix está acotado, coincide 1:1 con un proposal OpenSpec ya completo y auto-verificado (incluida prueba manual con Playwright documentada), no introduce violaciones de las specs `inventory-api`/`products-api`, no toca contrato de backend, y pasa test suite completa + lint + build limpios. Único punto de atención real es housekeeping de `git add` antes del PR, más una nota de deuda de documentación preexistente en `reports-api` spec que no corresponde arreglar en este PR.
