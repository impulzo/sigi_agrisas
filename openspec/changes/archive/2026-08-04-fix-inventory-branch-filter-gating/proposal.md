## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador (no-admin) | Como operador sin `branches:access_all`, quiero que `/inventory` muestre directamente el stock de mi sucursal asignada, sin un selector que me deje intentar ver otras | Evitar 403 inesperados y no exponer los nombres de todas las sucursales a roles que de todos modos no pueden consultarlas (el backend ya lo bloquea, pero la UI lo permitía intentar) | - Al entrar a `/inventory`, el stock de mi sucursal (`useCurrentUser().branchId`) carga automáticamente, sin `<select>` de sucursal<br>- Si mi usuario no tiene sucursal asignada, veo un `EmptyState` "Sin sucursal asignada" en vez de un selector vacío o un 403 | - No se renderiza ningún control que permita elegir un `branchId` distinto al propio<br>- El fetch a `GET /api/v1/admin/branches/:id/inventory` usa siempre mi `branchId` de JWT, nunca uno arbitrario tomado de un input |
| 2 | Administrador | Como admin (`branches:access_all`), quiero seguir pudiendo elegir y cambiar de sucursal en `/inventory` exactamente como hoy | No perder la capacidad de auditar/gestionar el stock de cualquier sucursal | - El `<select>` de sucursal se sigue mostrando igual que antes, con el mismo placeholder "Selecciona una sucursal"<br>- Cambiar de sucursal sigue refrescando la tabla y reseteando la página | - Sin cambios de permisos ni de comportamiento para este rol |

## Why

Auditoría transversal de branch scoping (rules: "todo rol no-admin solo ve
datos de su sucursal; solo admin ve/switchea todas") confirmó que el
mecanismo ya está implementado en casi todos los módulos vía
`enforceBranchScope`/`resolveScopedBranchId`
(`src/modules/rbac/infrastructure/http/enforceBranchScope.ts`), incluyendo el
backend de inventario (`BranchInventoryController.ts`). El único gap
encontrado es puramente de UI: `app/(private)/inventory/_blocks/InventoryPage.tsx`
es el único módulo (comparado con waybills, payments, purchases, reports)
donde el selector de sucursal se muestra a **cualquier** usuario con
`inventory:read`, sin el gate `can("branches:access_all")` que el resto de
pantallas ya usa (`isBypass` + `showBranchFilter`). El backend igual rechaza
con 403 si un no-admin elige otra sucursal, así que no hay fuga de datos,
pero la experiencia es inconsistente con el resto del panel y expone el
listado completo de sucursales a roles que nunca podrán consultarlas.

Nota de alcance (decisiones de producto confirmadas durante la auditoría,
sin acción requerida):
- El módulo `users` queda intencionalmente sin branch scoping (gestión de
  usuarios es una capacidad administrativa transversal).
- No se construye un switcher global de sucursal; se mantienen los filtros
  locales por módulo ya existentes en el resto de pantallas.
- El dashboard (`app/(private)/dashboard/`) está 100% mockeado (sin fetch
  real) y queda fuera de alcance.

## What Changes

- `InventoryPage.tsx` deja de mostrar siempre el `<select>` de sucursal.
  - Si `can("branches:access_all") === true`: comportamiento sin cambios.
  - Si no: no se renderiza el selector; el `branchId` interno se fija al
    `branchId` del usuario autenticado (`useCurrentUser().branchId`); se
    muestra el nombre de la sucursal como texto no editable; si el usuario
    no tiene sucursal asignada se muestra `EmptyState` "Sin sucursal
    asignada".
- Sin cambios de backend: `BranchInventoryController.ts` ya aplica
  `enforceBranchScope` en todos sus endpoints.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `inventory-ui`: se modifica el requisito "Inventory screen with branch
  selector" para gatear el `<select>` de sucursal detrás de
  `branches:access_all`, igual que el resto de pantallas branch-scoped del
  panel.

## Impact

- **Frontend**: `app/(private)/inventory/_blocks/InventoryPage.tsx` (único
  archivo modificado).
- **Backend**: sin cambios.
- **Tests**: no existe suite unitaria previa para `InventoryPage.tsx`;
  verificación es manual + `npm run build`.
