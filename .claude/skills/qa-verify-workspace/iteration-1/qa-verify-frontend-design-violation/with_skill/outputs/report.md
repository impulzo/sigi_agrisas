## QA Verify — diff no aplicado: `app/(private)/expenses/_blocks/ExpenseQuickActions.tsx` (nuevo archivo)

Nota de alcance: analizado como texto contra `develop` actual. No se aplicó el patch. El diff de `ExpensesTable.tsx` (columna de acciones) no vino incluido, así que esa parte queda marcada ⚠️ no verificable.

### Alcance detectado
- Áreas: Arquitectura Frontend (`_blocks` presentational), Sistema de diseño (`designer.md` + guardarraíl `tokens.test.ts`), módulo Gastos (UI), Proceso OpenSpec.
- Specs consultadas: `openspec/specs/expenses-ui/spec.md` (archivada, sin change activo — confirmé que `openspec/changes/` sólo tiene `fix-inventory-branch-scoping-leaks` y `fix-sales-cut-expenses`, ninguno de gastos), `openspec/specs/design-system/spec.md` + `designer.md`, contrato real de `PATCH /expenses/:id` en `expenses-api`.

### Checklist

#### Arquitectura Frontend — capas
- ❌ "`_blocks/` son presentational: NO `fetch`/`sessionStorage`" — línea ~16 lee `sessionStorage.getItem("accessToken")` directo; líneas ~17-24 hacen `fetch(...)` crudo con `Authorization` manual, dentro de `app/(private)/expenses/_blocks/`.
- ❌ "`_logic/services/` encapsulan fetch, normalizan errores, aceptan `fetchImpl?`" — ignora por completo `app/_lib/authFetch.ts` y el patrón ya existente del módulo (`app/(private)/expenses/_logic/services/updateExpense.ts`, hook `useExpenseMutations` con `updateOne`/`softDeleteOne`). Se pierde retry-on-401 con refresh, errores tipados (`UnauthenticatedError`/`ForbiddenError`/`NetworkError`), testabilidad.
- ❌ No revisa `res.ok`: si el PATCH falla, igual llama `onDone()` como si hubiera tenido éxito (falla silenciosa).

#### Sistema de diseño (`designer.md` + `tests/unit/ui/design-system/tokens.test.ts`)
- ❌ Hex crudo `style={{ backgroundColor: "#4CAF50" }}` (línea ~30) — prohibido; el archivo no está en `HEX_EXEMPT_FILES` (sólo exime 2 archivos de ticket térmico).
- ❌ `rounded-3xl` (línea ~30) — explícitamente prohibido por fuera de escala.
- ❌ `<button>` nativo nuevo (líneas ~31-38) en vez del átomo `Button` (`app/_components/atoms/Button/Button`), que es justo el que usa `ExpensesTable.tsx` para Editar/Desactivar. No está en `RAW_ELEMENT_ALLOWLIST` de `tokens.test.ts` (esa lista sólo puede encoger).
- ❌ `text-white` (línea ~35) — color fuera de los tokens semánticos M3 (debería ser `text-on-primary` o similar).
- Si se aplicara, `npm test -- tests/unit/ui/design-system/tokens.test.ts` fallaría en 3 asserts (hex, rounded, raw-button).

#### Hallazgo funcional (el más grave)
- ❌ El componente envía `PATCH /api/v1/admin/expenses/:id` con `{ isActive: !isActive }`. El schema real (`src/modules/expenses/infrastructure/http/ExpensesController.ts:53-62`, `updateBodySchema`) sólo acepta `concept`/`amount`/`notes`/`expenseDate`, usa modo "strip" (descarta `isActive` en silencio) y su `.refine(...)` exige que al menos uno de esos 4 campos venga definido → con sólo `isActive` en el body, **siempre responde 400**. El soft-delete real del módulo es `DELETE /api/v1/admin/expenses/:id` (204); no existe endpoint de reactivación. La feature "Activar"/"Desactivar" de este componente nunca puede funcionar tal como está escrita, y al no chequear `res.ok` el fallo es invisible para el usuario.

#### OpenSpec — `expenses-ui`
- ❌ Requirement "Desactivación de gasto desde el listado" / Scenario "Desactivación con confirmación" exige diálogo de confirmación antes de desactivar; el componente ejecuta el toggle directo al click, sin confirmación.
- ⚠️ sin spec — "Activar" (reactivar un gasto inactivo) no está en ningún Requirement/Scenario de `expenses-ui`, ni soportado por el backend. Encaja con el criterio de refusal de CLAUDE.md: "Crear nueva feature sin pedido → out-of-scope. ask: <clarification>."
- ❌ Proceso OpenSpec: no existe `openspec/changes/<nombre>/` para esta feature — requiere `opsx:propose` + aprobación antes de implementar (no es un cambio trivial de 1 línea).

#### No verificable
- ⚠️ El diff de `ExpensesTable.tsx` (columna de acciones nueva) no vino incluido — no se puede confirmar gating `expenses:write`/`canWrite` ni si duplica/contradice los botones Editar/Desactivar existentes.

### Verificación automatizada
- Build/Lint/Tests: no corridos — diff no aplicado (instrucción explícita del usuario de no aplicarlo). El veredicto del guardarraíl de diseño es por inspección directa de las reglas de `tokens.test.ts` contra el texto del diff (fail esperado en 3 asserts).

### Resumen
- Cumplidos: 0/9 criterios evaluables.
- Bloqueantes (❌): fetch/sessionStorage crudos fuera de `authFetch`+services; hex crudo; `rounded-3xl`; `<button>` nativo nuevo fuera de allowlist; `text-white` fuera de tokens; bug funcional (PATCH siempre 400, sin manejo de error); falta diálogo de confirmación requerido por spec; sin proposal OpenSpec para feature nueva (reactivar).
- Gaps de cobertura (⚠️): "Activar"/reactivación no especificada en ningún spec; gating de permisos en `ExpensesTable.tsx` no verificable (diff no incluido).

**No abrir el PR así.** Reescribir usando `useExpenseMutations` + un service nuevo (si se aprueba reactivación) + átomo `Button` + tokens de `designer.md`, agregar confirmación, y pasar por `opsx:propose` antes porque introduce una feature (reactivar gasto) no contemplada en `expenses-ui`/`expenses-api`.
