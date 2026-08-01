## Context

Este change depende del backend propuesto en `add-purchases-crud` (endpoints `/api/v1/admin/purchases`, `/api/v1/admin/purchases/:id/provider-payments`, `/api/v1/admin/provider-payments/:id/cancel`, permisos `purchases:read/create/cancel/pay/pay_cancel`). No debe implementarse antes de que ese change esté aplicado.

Patrones de UI ya existentes a reutilizar (investigados antes de proponer este change):
- `app/(private)/returns/` — estructura de listado/detalle/badges/toolbar server-side.
- `app/(private)/sales/[id]/returns/new/` — patrón de formulario contra una entidad existente (no aplica 1:1 a Compras, que agrega líneas desde cero).
- `app/(private)/pos/_blocks/CartLine.tsx` + `computeTotalsClient.ts` — patrón de líneas editables + totales puros en cliente (sí aplica directo a Compras).
- `app/(private)/pos/_blocks/CustomerPicker.tsx` + `CustomerQuickAddModal.tsx` — patrón de picker con búsqueda server-side + creación rápida.
- `app/_components/organisms/NavigationRail/items.ts` — catálogo de items del rail, ya con nota de que el spec `panel-shell` estaba desactualizado respecto al código real (ver Risks).

## Goals / Non-Goals

**Goals:**
- Cubrir las 7 historias de `proposal.md`: listado, creación, detalle, registrar/cancelar abono, cancelar compra, item de navegación.
- Reutilizar `ProviderPicker`/`ProviderQuickAddModal` construidos sobre servicios ya existentes de `catalogs/providers` (no duplicar validación de RFC/código).
- Mantener `computePurchaseTotalsClient` como puerto puro (sin `src/modules/`), igual que el resto de calculadoras client-side del proyecto.

**Non-Goals:**
- Edición de compras (el backend no lo soporta — ver `add-purchases-crud`).
- Reporte PDF/historial de compras.
- Cambios de API/BD/RBAC (todo eso vive en `add-purchases-crud`, ya propuesto).

## Decisions

### Estructura de carpetas

```
app/(private)/purchases/
├── page.tsx                          # listado
├── new/page.tsx                      # creación
├── [id]/page.tsx                     # detalle
├── _blocks/
│   ├── PurchasesListPage.tsx
│   ├── PurchasesToolbar.tsx
│   ├── PurchasesTable.tsx
│   ├── PurchasesEmpty.tsx
│   ├── PurchaseStatusBadge.tsx
│   ├── CreatePurchasePage.tsx
│   ├── PurchaseLineRow.tsx           # análogo a CartLine.tsx
│   ├── ProviderPicker.tsx            # análogo a CustomerPicker.tsx
│   ├── ProviderQuickAddModal.tsx     # análogo a CustomerQuickAddModal.tsx
│   ├── PurchaseDetailPage.tsx
│   ├── PurchaseItemsTable.tsx
│   ├── PurchaseMetaPanel.tsx
│   ├── PurchaseActionsBar.tsx
│   ├── ProviderPaymentsSection.tsx
│   ├── RegisterProviderPaymentModal.tsx
│   ├── CancelProviderPaymentModal.tsx
│   └── CancelPurchaseModal.tsx
└── _logic/
    ├── hooks/{usePurchasesList,usePurchaseDetail,useCreatePurchaseForm,usePurchaseMutations,useProviderSearch}.ts
    ├── services/{listPurchases,getPurchase,createPurchase,cancelPurchase,registerProviderPayment,cancelProviderPayment}.ts
    ├── lib/computePurchaseTotalsClient.ts
    ├── schemas/createPurchase.ts
    ├── types/{api,domain}.ts
    └── errors.ts
```

Esta estructura replica 1:1 la de `returns` + `pos` (picker/líneas/totales), sin inventar convenciones nuevas.

### `ProviderPicker` reutiliza `createProvider` existente

`ProviderQuickAddModal` llama al mismo servicio `app/(private)/catalogs/providers/_logic/services/createProvider.ts` (no se duplica lógica de validación de RFC/código) — igual que `CustomerQuickAddModal` reutiliza `createCustomer` de `catalogs/customers`. `ProviderPicker` necesita su propio hook `useProviderSearch` (no existe hoy un hook de búsqueda reutilizable para proveedores fuera del listado paginado de `/catalogs/providers`) — se crea localmente en `purchases/_logic/hooks/`, mismo patrón que `useCustomerSearch` en `pos/_logic/hooks/`.

### `computePurchaseTotalsClient`

Puerto puro (sin `src/modules/`, sin Prisma) que replica la fórmula de `PurchaseTotalsCalculator` del backend: `lineSubtotal = round(quantity * unitCost * (1 - discountPct/100), 4)`, IVA/IEPS sobre ese subtotal, banker's rounding. Es una copia deliberada del patrón ya usado 3 veces (`computeTotalsClient`, `computeReturnTotalsClient`) — no se extrae un helper compartido porque el proyecto ya estableció esa convención de duplicación intencional por módulo.

### NavigationRail

Se agrega el item `purchases` a `app/_components/organisms/NavigationRail/items.ts`, entre `payments` e `inventory` (ver delta de `panel-shell` en `specs/panel-shell/spec.md`). Icono elegido: `shopping_cart` (Material Symbols Outlined), no usado por ningún otro item hoy.

### Gating de acciones en el detalle

`PurchaseActionsBar` y `ProviderPaymentsSection` gatean cada acción (registrar abono, cancelar abono, cancelar compra) independientemente vía `useCurrentUser().can(...)`, mismo patrón que `ReturnActionsBar`. El guard de "abonos activos bloquean cancelar compra" se replica en cliente (deshabilitar botón + mensaje) como UX, pero el backend es la fuente de verdad — doble capa igual que el resto del sistema.

## Risks / Trade-offs

- [El spec `panel-shell` existente ya estaba desactualizado respecto al código real de `NavigationRail/items.ts` antes de este change: el requirement "Navigation rail item catalogue" no mencionaba los items `billing`, `waybills`, `reports` que ya existen en producción] → Mitigación: dado que este change ya modifica ese mismo requirement para insertar `purchases`, se aprovechó para corregir también la lista completa (agregando `billing`/`waybills`/`reports` con su posición real), cerrando la deriva preexistente sin abrir un change aparte.
- [No existe un endpoint de búsqueda de proveedores fuera del listado paginado — `useProviderSearch` reutilizará `GET /api/v1/admin/providers?search=` que ya soporta ese query param] → Mitigación: verificado en `add-agrisas-logo`/investigación previa que `providers` list endpoint ya acepta `?search=` server-side (CLAUDE.md), no requiere cambio de backend.
- [Formulario de creación de compra es el más complejo del módulo (picker + líneas dinámicas + totales + forma de pago) — mayor superficie de bugs de UX] → Mitigación: se sigue el patrón ya probado de `CartPanel`/`CartLine` de POS casi sin variación, minimizando decisiones de diseño nuevas.
