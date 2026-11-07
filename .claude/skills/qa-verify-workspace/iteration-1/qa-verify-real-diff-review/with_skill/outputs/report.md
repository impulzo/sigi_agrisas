## QA Verify — working tree sin commitear (agrisas-panel, branch `develop`)

### Alcance detectado

Diff revisado (9 archivos modificados + 4 rutas sin seguimiento relevantes; se excluyen de este QA `.claude/skills/qa-verify*` por ser tooling de esta misma skill):

- `app/(private)/inventory/kardex/_blocks/{KardexFilters,KardexPage}.tsx`
- `app/(private)/inventory/kardex/_logic/{hooks/useProductSearch.ts,services/searchProducts.ts}`
- `app/(private)/payments/_blocks/PaymentsHistoryToolbar.tsx`
- `app/(private)/payments/_logic/{hooks/useProductSearch.ts,services/searchProducts.ts}`
- `src/modules/reports/infrastructure/repositories/PrismaDepartmentPriceListRepository.ts`
- `tests/unit/ui/(private)/payments/services/searchProducts.test.ts` (ampliado)
- Sin seguimiento (nuevos, parte del mismo cambio): `tests/unit/modules/reports/infrastructure/repositories/PrismaDepartmentPriceListRepository.test.ts`, `tests/unit/ui/(private)/inventory/kardex/_logic/{hooks,services}/*.test.ts`, `tests/unit/ui/(private)/payments/_logic/hooks/useProductSearch.test.ts`, `openspec/changes/fix-inventory-branch-scoping-leaks/`

**Áreas**: Branch scoping/RBAC (defensivo en frontend), Capas frontend (`_logic/services`, `_logic/hooks`, `_blocks` presentational), Prisma (reporte crudo `$queryRaw`), Tests, Proceso OpenSpec.

**Specs consultadas**:
- `products-api` (archivada) — semántica de `?branchId=` en `GET /api/v1/admin/products`.
- `inventory-api` (archivada) — Requirement "No global stock" y "Configurable inventory scope mode".
- `reports-api` (archivada) — Requirement "Department price list report filters" + "...JSON DTO".
- Change activo: `openspec/changes/fix-inventory-branch-scoping-leaks/` (`skip_specs: true`, sin carpeta `specs/` — correcto: el fix alinea implementación a requirements ya documentados, no cambia contrato).

El diff **es** la implementación completa de ese change (proposal.md con 4 historias de usuario, design.md con decisiones D1–D4, tasks.md con las 11 subtareas marcadas `[x]`, incluyendo verificación manual con Playwright ya narrada en 4.2).

### Checklist

#### Branch scoping defensivo (frontend)
- ✅ Kardex calcula el `branchId` efectivo de búsqueda con la fórmula documentada en design.md D3: `isBypass === true ? (branchId || undefined) : (userBranchId ?? undefined)` — `app/(private)/inventory/kardex/_blocks/KardexPage.tsx:44`.
- ✅ Payments replica la misma fórmula — `app/(private)/payments/_blocks/PaymentsHistoryToolbar.tsx:72`.
- ✅ Consistente con `products-api` spec (`openspec/specs/products-api/spec.md:14`): sin `branchId` el catálogo nunca se filtra (caso "Todos" intencional para bypass, historia 3); con `branchId`, un no-bypass que no coincida con `x-user-branch-id` recibe 403 — el fix evita que el frontend dispare ese 403 por accidente, sin tocar el backend (`ProductsController`/`PrismaProductRepository` no se modifican, consistente con D4).

#### Capas frontend (`_logic/services`, `_logic/hooks`, `_blocks`)
- ✅ `searchProducts.ts` (kardex y payments) añaden `branchId?: string` opcional y sólo lo agregan al query string si viene (`if (branchId) params.set("branchId", branchId)`), preservan `fetchImpl = authFetch` para tests — `kardex/_logic/services/searchProducts.ts:22`, `payments/_logic/services/searchProducts.ts:21`.
- ✅ `useProductSearch` (ambos módulos) propagan `branchId` a las deps del `useEffect` → re-fetch al cambiar de sucursal, confirmado por test "dispara una nueva búsqueda al cambiar de branchId" en ambos módulos.
- ✅ `_blocks` (`KardexFilters.tsx`, `KardexPage.tsx`, `PaymentsHistoryToolbar.tsx`) siguen sin `fetch`/`sessionStorage`/`localStorage`/navegación directa — sólo consumen el valor ya resuelto por el hook, consistente con la regla de capas de CLAUDE.md.

#### Prisma — reporte crudo
- ✅ `PrismaDepartmentPriceListRepository.ts:42` — la query de stock (`$queryRaw`) ahora usa `scopeBranchId` (mismo fallback a sucursal `isHeadquarters` que ya usan los precios en la línea 29) en vez de `filters.branchId` crudo, y cae a `FALSE` (no `TRUE`) cuando no hay matriz configurada — evita sumar todas las sucursales en un solo total cuando el admin deja "Global" sin elegir sucursal. Mismo criterio exacto que D1 en design.md.
- ⚠️ El Requirement "No global stock" de `inventory-api` (spec.md:238) habla literalmente de "no exponer un endpoint de stock total cross-branch", no de este reporte de lista de precios — el fix corrige el **espíritu** del requirement en un segundo endpoint que no estaba cubierto literalmente por ese escenario. No es un hallazgo bloqueante, sólo una precisión: la cobertura de spec para este caso específico es indirecta.

#### Proceso OpenSpec
- ✅ Existe `openspec/changes/fix-inventory-branch-scoping-leaks/` con `proposal.md` (4 historias de usuario + Why + What Changes), `design.md` (Context/Goals-NonGoals/Decisions D1–D4/Risks/Migration Plan) y `tasks.md` (11 subtareas, todas `[x]`, incluyendo verificación manual narrada con Playwright en 4.2 y nota de un bug real encontrado y corregido durante esa verificación).
- ⚠️ El change no está archivado (`opsx:archive` no se ha corrido) — correcto por regla del proyecto ("nunca automático al terminar apply/verify"), pero queda pendiente para cuando el usuario lo indique explícitamente, incluso después de mergear.

#### Gap de documentación (preexistente, no introducido por este diff)
- ⚠️ **Sin spec actualizada**: el "Department price list report JSON DTO" en `openspec/specs/reports-api/spec.md` (~líneas 535-571) no documenta el campo `stockQuantity` que sí expone `DepartmentPriceListResponseDto` y consume `InventoryPriceStockTable.tsx` — exactamente el dato que la historia 1 de este fix corrige. Es deuda de documentación anterior a este cambio (el campo ya existía), pero como este mismo diff toca su comportamiento, es buen momento para sincronizarlo (`opsx:sync` o ampliar el DTO documentado). No bloquea el merge.

### Verificación automatizada

- **Build** (`npm run build`): **pass** — type-check completo + `prisma generate` sin errores.
- **Tests** (archivos tocados/afectados + regresión):
  - `tests/unit/modules/reports/infrastructure/repositories/PrismaDepartmentPriceListRepository.test.ts` — 3/3 pass
  - `tests/unit/ui/(private)/inventory/kardex/_logic/hooks/useProductSearch.test.ts` — 3/3 pass
  - `tests/unit/ui/(private)/inventory/kardex/_logic/services/searchProducts.test.ts` — 3/3 pass
  - `tests/unit/ui/(private)/payments/_logic/hooks/useProductSearch.test.ts` — 3/3 pass
  - `tests/unit/ui/(private)/payments/services/searchProducts.test.ts` — 9/9 pass (7 existentes + 2 nuevas)
  - `tests/unit/ui/(private)/payments/_blocks/PaymentsHistoryPage.test.tsx` (regresión, no tocado pero consume `PaymentsHistoryToolbar`) — 6/6 pass
  - **Total: 27/27 pass**, 0 fail
- **Lint** (`npm run lint`): pass — sólo warnings preexistentes y ajenos al diff (`<img>` sin `next/image`, 2 `exhaustive-deps` en archivos no tocados).
- **Guardarraíl diseño** (`tests/unit/ui/design-system/tokens.test.ts`): pass — 8/8 (el diff no agrega clases fuera de escala, hex crudo, `bg-gray-*`, `rounded-2xl/3xl` ni elementos crudos nuevos).
- No se corrieron migraciones, seeds ni comandos de escritura — sólo lectura/verificación, según el protocolo de la skill.

### Resumen

- **Cumplidos: 10/10** criterios de checklist (incluyendo los 2 marcados ⚠️, que son gaps de cobertura, no fallas).
- **Bloqueantes (❌): ninguno.**
- **Gaps de cobertura (⚠️ sin spec o pendientes de proceso, no bloqueantes):**
  1. Requirement "No global stock" de `inventory-api` cubre el caso sólo indirectamente (no es un escenario literal para este endpoint de reportes).
  2. `stockQuantity` no está documentado en el DTO de `reports-api` (deuda preexistente, oportunidad de sincronizar specs ahora que se tocó ese comportamiento).
  3. El change `fix-inventory-branch-scoping-leaks` sigue sin archivar — pendiente de instrucción explícita del usuario (no bloquea el PR).

**Veredicto: listo para armar el PR hacia `develop`.** No hay hallazgos bloqueantes: build, lint, guardarraíl de diseño y los 27 tests relevantes (incluida regresión de `PaymentsHistoryPage`) pasan en verde; la implementación sigue al pie de la letra las decisiones D1–D4 ya documentadas en `openspec/changes/fix-inventory-branch-scoping-leaks/design.md`, y los 2 gaps señalados son de documentación/proceso, no de código.
