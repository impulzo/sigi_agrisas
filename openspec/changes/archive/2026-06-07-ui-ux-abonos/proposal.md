## Why

El backend de abonos (`api-abonos`) ya está completamente implementado y archivado: endpoints de registro, cancelación, listado, detalle, abonos por venta e historial con PDF. Sin UI, el operador no puede cobrar abonos ni consultar el historial desde el panel; el flujo de ventas a crédito creado en `api-abonos` queda inaccesible para usuarios no técnicos.

## What Changes

- Nueva ruta `/payments` con listado paginado y filtros (estado, sucursal, fechas, búsqueda server-side).
- Nueva ruta `/payments/[id]` con detalle del abono, datos del ticket origen, acciones contextuales (cancelar).
- Nueva ruta `/sales/[id]/payments/new` para registrar un abono contra un ticket de crédito (formulario guiado).
- `SalePaymentsSection` integrada en `SaleDetailPage`: lista abonos del ticket, barra de progreso de cobro, CTA "Registrar abono".
- `SalePaymentStatusBadge` y columna `paymentStatus` en la lista de ventas y detalle del ticket.
- Nueva ruta `/payments/history` con historial filtrable y exportación a PDF (`?format=pdf`).
- Entrada `payments` añadida al `NavigationRail` (requiere `payments:read`).
- Tipos TS de dominio y servicios para consumir la nueva API de abonos.

## Capabilities

### New Capabilities

- `payments-ui`: UI completa para el módulo de abonos — listado, detalle, registro, cancelación, historial con PDF, `SalePaymentsSection` en detalle de venta, badge de estado de cobro.

### Modified Capabilities

- `panel-shell`: añadir item `payments` al `NavigationRail` con `href="/payments"`, icon `payments`, `requires="payments:read"`.

## Impact

- **Rutas nuevas**: `app/(private)/payments/`, `app/(private)/sales/[id]/payments/new/`
- **Archivos modificados**: `app/(private)/sales/_blocks/SaleDetailPage.tsx` (añadir `SalePaymentsSection`), `app/_components/organisms/NavigationRail/items.ts` (añadir entrada payments), `app/(private)/sales/_logic/types/` (extender tipos con `paidAmount`, `paymentStatus`, `isCredit`), lista de ventas (columna `paymentStatus`).
- **Hooks globales reutilizados**: `useCurrentUser`, `useFoliosOptions`, `usePaymentMethodsOptions`, `useHeadquarters`.
- **API consumida**: `GET/POST /api/v1/admin/payments`, `GET /api/v1/admin/payments/:id`, `POST /api/v1/admin/payments/:id/cancel`, `GET /api/v1/admin/payments/history`, `GET /api/v1/admin/sales/:id/payments`.
- **Sin cambios en backend**: toda la lógica vive en `src/modules/payments/`; la UI solo consume via `authFetch`.
