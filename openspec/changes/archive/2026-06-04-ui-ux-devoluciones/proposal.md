## Why

El backend de devoluciones (`apis-devoluciones`, 2026-06-02) ya expone `/api/v1/admin/returns` con todo el ciclo de vida (`completed → cancelled`), branch scoping, snapshot por línea, regla "remaining = sold − ΣcompletedReturns" y enlace a venta vía `saleId`. Además `SaleDetailDto` ahora trae `returnedQuantityBySaleItem` para que la UI pueda renderizar "Devuelto: X / Y" sin un round-trip extra. Sin embargo, el panel no tiene **ninguna pantalla** para registrar, listar, ver detalle o cancelar devoluciones — el operador no puede ejecutar la regla del cliente "registrar devolución de producto en mal estado contra un ticket".

El flujo operativo del cliente es claro: el cajero abre el ticket original, marca qué líneas devolver y con qué cantidad, escribe el motivo y la fecha. La devolución debe nacer **desde el ticket** (regla "enlazado a un ticket obligatorio") — crearla desde una ruta independiente obligaría a buscar primero la venta y rompe el mental model.

Este change implementa **la capa de UI completa de devoluciones** sobre el backend ya desplegado, ancla la creación al detalle de venta y añade un listado consolidado para auditoría/búsqueda.

## What Changes

- Nueva ruta privada `/returns` — listado paginado con filtros (sucursal sólo con bypass, estado `completed|cancelled` multi, customer, sale, rango fechas `from/to` sobre `returnedAt`, búsqueda server-side por `sale.folio_code`/`sale.folio_number`/`customer.name`/`customer.rfc` con debounce 300 ms y mínimo 2 chars). Columnas: `Folio venta / Cliente / Sucursal / Devuelto por / Reembolso / Fecha / Estado / Acción`. Gateada por `returns:read`.
- Nueva ruta privada `/returns/[id]` — detalle con header (link al ticket origen, status badge, reembolso total, fecha de devolución), tabla de items con snapshots (código, nombre, precio, cantidad devuelta, descuento, IVA/IEPS, line totals), bloque de metadata (cliente, sucursal, creador, motivo, notas, datos de cancelación cuando aplique), y acción contextual "Cancelar devolución" cuando `status === 'completed'` (perm `returns:cancel`). Gateada por `returns:read`.
- Nueva ruta privada `/sales/[id]/returns/new` — formulario de registro de devolución contra un ticket existente, perm `returns:create`. Reusa `SaleItemsTable` extendida para mostrar `vendido / ya devuelto / disponible` por línea, con input `cantidad a devolver` por fila (debe respetar `remaining`). Campos `reason` (3–500 chars), `returnedAt` (date-picker `≤ hoy`), `notes?` (max 1000). Submit → `POST /api/v1/admin/returns`. Tras éxito 201, redirige a `/returns/[id]`.
- Modal `CancelReturnModal` con `reason?` opcional (max 500 chars) y `ConfirmDialog`. Maneja 409 "already cancelled" mostrando estado actual. Muestra warning amarillo "El stock de algunos productos podría quedar negativo" cuando aplique (informativo, no bloqueante — el backend permite stock negativo en este path).
- **Sección "Devoluciones" en el detalle de venta `/sales/[id]`**:
  - Sub-bloque `SaleReturnsSection` que consulta `GET /api/v1/admin/sales/:id/returns` (formato `{ returns: ReturnDetailDto[] }`) y lista las devoluciones asociadas con estado, fecha, reembolso y link a `/returns/[id]`.
  - Si `sale.status === 'completed'` y `can("returns:create") === true` y existe al menos 1 línea con `remaining > 0`, muestra CTA "Registrar devolución" que navega a `/sales/[id]/returns/new`.
  - Si la venta tiene devoluciones `completed`, cada fila de `SaleItemsTable` muestra una subnota "Devuelto: X de Y" basada en `returnedQuantityBySaleItem`.
- NavigationRail: añade item `returns` (`/returns`, icono `assignment_return`, label `Devoluciones`, `requires: "returns:read"`) entre `quotes` e `inventory`.

## Capabilities

### New Capabilities

- `returns-ui`: pantallas `/returns` (lista paginada con filtros + badge de estado), `/returns/[id]` (detalle + acción cancelar), `/sales/[id]/returns/new` (creación contra ticket con cantidades por línea), y la sub-sección "Devoluciones" en el detalle de venta que lista las devoluciones existentes y abre la creación. Respeta branch scoping (sin `?branchId=` para non-bypass se filtra por sucursal del usuario; el formulario hereda `branchId` del ticket).

### Modified Capabilities

- `panel-shell`: añadir item `returns` (`/returns`, icono `assignment_return`, label `Devoluciones`, `requires: "returns:read"`) entre `quotes` e `inventory`. Todos los demás items quedan idénticos.

## Impact

- **Rutas nuevas**: `app/(private)/returns/page.tsx`, `app/(private)/returns/[id]/page.tsx`, `app/(private)/sales/[id]/returns/new/page.tsx`.
- **Componentes nuevos**: `app/(private)/returns/_blocks/` (ReturnsListPage, ReturnsToolbar, ReturnsTable, ReturnStatusBadge, ReturnDetailPage, ReturnItemsTable, ReturnMetaPanel, ReturnActionsBar, CancelReturnModal, ReturnsEmpty), `app/(private)/returns/_logic/` (services, hooks, types, errors, schemas), `app/(private)/sales/[id]/returns/new/_blocks/CreateReturnPage.tsx`, `app/(private)/sales/[id]/returns/new/_blocks/ReturnLineRow.tsx`.
- **Sales modificado**: `app/(private)/sales/_blocks/SaleDetailPage.tsx` añade el sub-bloque `SaleReturnsSection` y el CTA "Registrar devolución"; `SaleItemsTable.tsx` añade la subnota "Devuelto: X de Y" por línea cuando aplica.
- **NavigationRail**: `app/_components/organisms/NavigationRail/items.ts` recibe el nuevo entry `returns`.
- **Iconos**: registrar `assignment_return` y `keyboard_return` en `app/_components/atoms/Icon/icons.ts` si no existen. `warning`, `arrow_back`, `cancel`, `receipt_long` ya existen.
- **Sin cambios en backend**: el módulo `returns` está completo y testeado (archivado en `apis-devoluciones`, 2026-06-02).
- **Sin cambios en `useCurrentUser`, `useHeadquarters`, `useFoliosOptions`, `usePaymentMethodsOptions`**: las devoluciones no requieren guard de matriz ni consumen folios fiscales.
- **Dependencias reutilizadas**: `authFetch`, `useCurrentUser`, `useDebounce`, `Combobox`, `Badge`, `Skeleton`, `Spinner`, `ConfirmDialog`, `EmptyState`, `SearchInput`, `FormField`, `Card`, `CatalogShell`, `CatalogToolbar`, `CatalogPagination`, `SaleItemsTable` (extendido con subnota). Cero átomos nuevos.
- **Diseño**: Material 3 + tokens "Agro-Systemic Design" — `primary` para acciones positivas (Registrar), `error-container` para "Cancelar devolución", badges de estado con punto coloreado (`completed → bg-primary-container`, `cancelled → bg-surface-container-highest`). Tabla densa con `tabular-nums` para totales.
