# QA — ExpenseQuickActions.tsx (diff no aplicado)

## 1. Bug funcional — la acción siempre falla (bloqueante)

`UpdateExpenseUseCase`/`ExpenseRepository.UpdateExpenseData` (src/modules/expenses/application/ports/ExpenseRepository.ts:22-27) solo acepta `concept | amount | notes | expenseDate`. El Zod schema del controller tampoco declara `isActive`:

```
src/modules/expenses/infrastructure/http/ExpensesController.ts:53-62
const updateBodySchema = z.object({
  concept: ..., amount: ..., notes: ..., expenseDate: ...,
}).refine((d) => d.concept !== undefined || d.amount !== undefined || ...)
```

Al no ser `.strict()`, Zod descarta silenciosamente la clave `isActive` que manda `ExpenseQuickActions`, y el `.refine` exige al menos uno de los 4 campos reales — ninguno está presente, así que `safeParse` falla y el endpoint devuelve 400 SIEMPRE (ExpensesController.ts:161-162).

El componente no comprueba `res.ok` ni hace try/catch:
```tsx
await fetch(...);
setLoading(false);
onDone();   // se llama igual aunque la respuesta sea 400
```
Resultado: el toggle nunca cambia el estado real del gasto, pero `onDone()` se dispara como si hubiera tenido éxito — falla silenciosa para el usuario.

Tampoco existe endpoint de "reactivar": `SoftDeleteExpenseUseCase` solo hace `isActive=false` (PrismaExpenseRepository.ts:141); no hay ningún `ReactivateExpenseUseCase` ni ruta que lo revierta.

## 2. Contradice una regla de negocio ya documentada (fuera de alcance)

`ExpensesPage.tsx` ya declara la intención de producto en el `ConfirmDialog` de desactivar:
```tsx
description="Esta acción marcará el gasto como inactivo. No podrá reactivarse desde el panel."
```
`ExpenseQuickActions` introduce justo esa capacidad sin pedido explícito, sin backend que la soporte, y sin pasar por `opsx:propose`/aprobación (CLAUDE.md: toda feature nueva requiere proposal aprobado; Refusals: "Crear nueva feature sin pedido → out-of-scope"). Debe resolverse con el usuario antes de seguir, no solo arreglando el 400.

## 3. Viola separación de capas frontend (CLAUDE.md)

> `_components/` y `_blocks/` son presentational: NO fetch, sessionStorage... ni validación inline.

`ExpenseQuickActions` hace ambas cosas dentro de un `_blocks/`:
```tsx
const token = sessionStorage.getItem("accessToken");
await fetch(`/api/v1/admin/expenses/${expenseId}`, { ... Authorization: `Bearer ${token}` ... });
```
El módulo ya tiene la capa correcta y la usa en todos los demás flujos:
- app/(private)/expenses/_logic/services/updateExpense.ts — encapsula el fetch vía authFetch, normaliza errores (ExpenseNotFoundError, ExpenseInvalidAmountError, NetworkError).
- app/(private)/expenses/_logic/hooks/useExpenseMutations.ts — orquesta isSaving/mutationError y llama a los services.

Al saltarse authFetch pierde: inyección consistente de Authorization, reintento automático con refresh de token ante 401, y tipado de errores (UnauthenticatedError, ForbiddenError) que el resto del módulo usa.

No hay check de permiso (expenses:write) dentro del propio componente — depende de que quien lo consuma lo gatee externamente, a diferencia de ExpensesTable.tsx que envuelve toda la columna de Acciones en `canWrite &&`.

## 4. Violaciones del sistema de diseño (designer.md + guardrail de tests)

tests/unit/ui/design-system/tokens.test.ts fallaría:

- `<button>` crudo nuevo en `_blocks/`: el test que exige que todo `<button>`/`<table>`/`<select>` crudo esté en RAW_ELEMENT_ALLOWLIST (líneas ~126-140) solo permite instancias ya existentes y listadas. `ExpenseQuickActions.tsx` no está en la lista → test rojo. Debe usar el átomo Button (app/_components/atoms/Button/Button.tsx), como ya hace ExpensesTable.tsx.
- `rounded-3xl`: prohibido explícitamente (test "sin rounded-2xl ni rounded-3xl", línea ~110).
- Hex crudo `style={{ backgroundColor: "#4CAF50" }}`: viola "color exclusivamente por token semántico" — no corresponde a ningún token de la paleta M3 de designer.md.
- `text-xs`: no pertenece a la escala tipográfica cerrada de tailwind.config.ts (tokens válidos: text-label-sm, text-label-lg, etc.) — el test de escala tipográfica lo marca como offender.

## 5. Inconsistencias menores vs. convención del módulo

- Botones hermanos en ExpensesTable.tsx usan aria-label + title explícitos; este botón de texto no replica ese patrón.
- Sin feedback visual de error (el módulo usa mutationError + toast en ExpensesPage.tsx); aquí un 400 pasa desapercibido.
- Sin test unitario acompañando el componente.

## Tabla resumen

| # | Severidad | Hallazgo |
|---|---|---|
| 1 | Bloqueante | PATCH con isActive siempre devuelve 400 — feature no funciona |
| 2 | Bloqueante/fuera de alcance | Reactivar gasto contradice texto ya documentado y no pasó por opsx:propose |
| 3 | Alto | fetch + sessionStorage directos en _blocks/ — viola capas frontend |
| 4 | Alto | Sin manejo de error — onDone() se llama aunque falle |
| 5 | Alto | `<button>` crudo nuevo fuera de la allowlist de tokens.test.ts |
| 6 | Alto | rounded-3xl prohibido |
| 7 | Alto | Hex crudo #4CAF50 en vez de token semántico |
| 8 | Medio | text-xs fuera de la escala tipográfica M3 |
| 9 | Medio | Sin gating de permiso expenses:write dentro del componente |
| 10 | Bajo | Sin aria-label consistente, sin toast de error, sin test |

Recomendación: no abrir el PR así. Si la reactivación es un requerimiento real, decidir con producto, correr opsx:propose para el caso de uso de backend (ReactivateExpenseUseCase + endpoint), y reconstruir la UI reusando useExpenseMutations + Button del sistema de diseño con un token de color real. Si no es requerimiento, descartar el componente.
