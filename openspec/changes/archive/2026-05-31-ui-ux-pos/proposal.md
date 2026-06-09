## Why

El backend POS (`add-pos`, 2026-05-30) ya expone los endpoints de ventas (`/api/v1/admin/sales`) y clientes (`/api/v1/admin/customers`), pero el panel solo tiene un item `pos` en la `NavigationRail` apuntando a `/pos` — sin ruta, sin pantalla y sin gating. Los cajeros y operadores no pueden emitir tickets desde el navegador; los admins no pueden listar, consultar, cancelar ni editar ventas. La regla del cliente "ticket sólo editable desde la matriz" tampoco tiene cómo expresarse visualmente.

Este change implementa **la capa de UI del POS** sobre el backend ya desplegado, incorporando el diseño del Stitch *"Punto de Venta - Agrisas"* (proyecto `5227157529282603342`, pantalla `3b7ab57a14944ac99f12f421db512076`) — layout split-pane catálogo/carrito, totales en panel lateral fijo, selección de tier de precio en modal superpuesto, y resumen subtotal + impuestos + total en tiempo real.

## What Changes

- Nueva ruta privada `/pos` — pantalla de emisión de venta con layout split-pane (catálogo de productos a la izquierda, carrito + totales a la derecha), selector de sucursal/folio/método de pago/cliente, selector de tier de precio por item, descuento por línea, totales en tiempo real (`SaleTotalsCalculator` portado al cliente como `computeTotalsClient`), modal de confirmación con resumen del ticket emitido. Gateada por `sales:create`.
- Nueva ruta privada `/sales` — historial paginado de ventas con filtros (sucursal, estado `completed|cancelled|edited`, rango de fechas, búsqueda por folio/cliente/RFC), badge de estado, columnas de folio/cliente/cajero/total/fecha. Gateada por `sales:read`.
- Nueva ruta de detalle `/sales/[id]` — vista de venta con header (folio, estado, totales), tabla de items con snapshots, datos de cliente/sucursal/cajero/método de pago, botones de cancelar (perm `sales:cancel`) y editar (perm `sales:edit_completed` + matriz).
- Modal de cancelación con `reason` opcional (max 500 chars) y `ConfirmDialog`. Idempotente: si ya está cancelada muestra estado actual sin reintentar.
- Modal de edición de venta (sólo matriz) que reusa el editor de líneas del POS con la venta cargada; submit → `PATCH /sales/:id`. Gateada combinada por `sales:edit_completed` + (`branches:access_all` ∨ usuario en HQ).
- Quick-add de cliente embebido en el POS: modal con campos mínimos (`code`, `name`, `rfc`) + fiscales opcionales; POST → `/customers`; tras éxito el cliente queda seleccionado en el carrito. Gateado por `customers:write`.
- `useCurrentUser` extendido con `branchId`/`isHeadquartersUser?` derivado del JWT (claim `branchId`) y consulta `findHeadquarters()` cacheada — usado por el guard de edición de ticket en cliente.
- NavigationRail: item `pos` ya existente recibe `requires: "sales:create"`; nuevo item `sales` (icono `receipt_long`, `requires: "sales:read"`) reemplazando el placeholder `billing`. Hub de catálogos NO recibe a clientes en este change (se difiere a `add-customers-ui`).

## Capabilities

### New Capabilities

- `pos-ui`: Pantalla `/pos` — emisión de venta con catálogo paginado/buscable, carrito con tier de precio + descuento por línea, totales en vivo (subtotal/IVA/IEPS/total), selección de sucursal (gateada por scoping) + folio + método de pago + cliente, quick-add de cliente, confirmación con ticket emitido y reset opcional del carrito.
- `sales-ui`: Pantallas `/sales` (lista paginada con filtros + badge de estado) y `/sales/[id]` (detalle con items + acciones cancelar/editar), respetando el branch scoping del backend (sin `?branchId=` para no-admins se filtra implícitamente por la sucursal del usuario).

### Modified Capabilities

- `panel-shell`: Añadir `requires: "sales:create"` al item `pos`; reemplazar el item placeholder `billing` por `sales` (`/sales`, icono `receipt_long`, `requires: "sales:read"`).

## Impact

- **Rutas nuevas**: `app/(private)/pos/page.tsx`, `app/(private)/sales/page.tsx`, `app/(private)/sales/[id]/page.tsx`
- **Componentes nuevos**: `app/(private)/pos/_blocks/`, `app/(private)/pos/_logic/`, `app/(private)/sales/_blocks/`, `app/(private)/sales/_logic/`
- **NavigationRail**: `items.ts` — gating de `pos`, reemplazo de `billing` → `sales`
- **`useCurrentUser`**: añadir `branchId` derivado del JWT (sin verificación de firma); nuevo hook `useHeadquarters()` que consulta `GET /api/v1/admin/branches` con filtro client-side por `isHeadquarters=true` (cache de módulo, TTL 60s)
- **Cliente HTTP**: 0 cambios en `authFetch`; se reutiliza el patrón `_logic/services` con `fetchImpl?`
- **Sin cambios en backend**: el módulo POS está completo y testeado
- **Dependencias**: `authFetch`, `useCurrentUser`, `useDebounce`, `useBranchesOptions` (reusar de inventory-ui), bloques existentes (`Badge`, `Skeleton`, `Spinner`, `Switch`, `ConfirmDialog`, `EmptyState`, `SearchInput`, `FormField`, `Card`, `Chip`)
- **Diseño**: Material 3 + tokens "Agro-Systemic Design" del Stitch — `primary #0d631b` para acciones principales (Finalizar venta), `tertiary` para datos administrativos, badges de estado (`completed` verde, `cancelled` rojo, `edited` ámbar), tabla densa con números tabulares para totales.
