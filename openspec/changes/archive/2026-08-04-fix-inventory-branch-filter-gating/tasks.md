## 1. Frontend — gating del selector de sucursal

- [x] 1.1 En `InventoryPage.tsx`, leer `branchId: myBranchId` de `useCurrentUser()` y computar `isBypass = can("branches:access_all")`
- [x] 1.2 Sincronizar el estado `branchId` al `myBranchId` del usuario mientras `isBypass !== true` (efecto reactivo a `isBypass`/`myBranchId`)
- [x] 1.3 Renderizar el `<select>` de sucursal sólo cuando `isBypass === true`; para el resto, mostrar el nombre de la sucursal como texto no editable
- [x] 1.4 `EmptyState` "Sin sucursal asignada" cuando `isBypass !== true` y no hay `branchId` resuelto

## 2. Verificación

- [x] 2.1 `npx tsc --noEmit` sin errores en `InventoryPage.tsx`
- [x] 2.2 Automatizado (`tests/unit/ui/(private)/inventory/InventoryPage.test.tsx`): operador con sucursal asignada → `/inventory` carga directo su stock, sin selector
- [x] 2.3 Automatizado (mismo archivo): admin con `branches:access_all` → selector visible con opciones de sucursal, comportamiento sin cambios
- [x] 2.4 `handleAssign`/`handleAdjust`/`handleEdit`/`handleRemove` en `InventoryPage.tsx` ya usan el `branchId` fijo del estado (no dependen de que exista un selector); cubierto indirectamente por las suites existentes de `InventoryAssignModal.test.tsx` y `StockAdjustModal.test.tsx` que ejercitan esos flujos contra un `branchId` dado
