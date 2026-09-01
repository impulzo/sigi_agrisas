## 1. Hook compartido `useBypassBranchOptions`

- [x] 1.1 Crear `app/_hooks/useBypassBranchOptions.ts`: `"use client"`, import estático de `authFetch` desde `../_lib/authFetch`, `interface BranchOption { id: string; code: string; name: string; isHeadquarters: boolean }`, y `export function useBypassBranchOptions(isBypass: boolean | "loading", ownBranchId: string | null)` que devuelve `{ branches, selectedBranchId, setSelectedBranchId }` con la lógica: sin bypass + `ownBranchId` → sucursal única "Mi sucursal" + auto-selección; bypass → fetch `GET /api/v1/admin/branches?pageSize=100&includeInactive=false` sin auto-selección; `"loading"` → no fetch.
- [x] 1.2 Refactorizar `app/(private)/pos/_blocks/PosPage.tsx:84-140`: eliminar `useState<branches>`, `useState<selectedBranchId>` y el `useEffect` "Load branches for admin bypass"; reemplazar por `const { branches, selectedBranchId, setSelectedBranchId } = useBypassBranchOptions(isBypass, userBranchId ?? null)`.
- [x] 1.3 Refactorizar `app/(private)/quotes/_blocks/QuoteCreatePage.tsx:43-68` con el mismo patrón.
- [x] 1.4 Refactorizar `app/(private)/billing/_blocks/NewInvoicePage.tsx:27-42` con el mismo patrón (`ownBranchId` = `branchId` de `useCurrentUser()`).
- [x] 1.5 Verificar que ningún call site quedó con imports muertos (`useState`/`useEffect` sin otro uso, `authFetch` sin otro uso) tras el refactor.

## 2. Corrección de capa en `billing`

- [x] 2.1 Mover `src/modules/billing/infrastructure/services/resolveSatDescription.ts` → `src/modules/billing/application/services/resolveSatDescription.ts` (contenido sin cambios).
- [x] 2.2 Actualizar import en `src/modules/billing/application/use-cases/DownloadInvoiceFileUseCase.ts:7` → `../services/resolveSatDescription`.
- [x] 2.3 Actualizar import en `src/modules/billing/infrastructure/http/BillingController.ts:20` → `../../application/services/resolveSatDescription`.
- [x] 2.4 Actualizar import en `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts:17` → `../../application/services/resolveSatDescription`.
- [x] 2.5 Actualizar import en `tests/unit/modules/billing/resolveSatDescription.test.ts:1` → `../../../../src/modules/billing/application/services/resolveSatDescription`.
- [x] 2.6 Actualizar import de tipo en `tests/unit/modules/billing/FakeFacturamaGateway.test.ts:24` → misma ruta nueva.
- [x] 2.7 `grep -rn "infrastructure/services/resolveSatDescription" src tests` debe devolver 0 resultados.

## 3. Verificación

- [x] 3.1 `npm test -- resolveSatDescription FakeFacturamaGateway` en verde.
- [x] 3.2 `npm run build` (type-check completo) en verde.
- [x] 3.3 `npm test` completo en verde (regresión pos/quotes/billing/UI).
- [x] 3.4 Smoke manual con Playwright, usuario `admin@example.com`/`admin1234` (tiene `branches:access_all`): `/pos`, `/quotes/new`, `/billing/new` (modo "Factura parcial") — confirmar que el selector de sucursal puebla la lista completa y el flujo de creación (venta/cotización/factura) sigue funcionando.
- [x] 3.5 Repetir smoke con un usuario de sucursal fija (sin `branches:access_all`) para validar el camino "Mi sucursal" auto-seleccionado en al menos una de las 3 pantallas. Nota: la DB de dev no tiene ningún usuario seed con `branchId` fijo (todos `null`), y no hay credenciales documentadas para los usuarios `e2e-*` no-admin. Se valida en su lugar con el test automatizado ya existente `tests/unit/ui/(private)/billing/NewInvoicePage.branchSelector.test.tsx` ("usuario sin branches:access_all con branchId propio NO ve selector" + "PartialInvoiceForm recibe su branchId propio"), que ejercita el hook nuevo vía render real y pasó en el `npm test` completo post-refactor (tarea 3.3).
