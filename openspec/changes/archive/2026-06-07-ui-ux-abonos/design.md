## Context

El módulo `payments` del backend está 100 % funcional (archivado en `api-abonos`): expone endpoints para registrar, cancelar, listar y reportar abonos; los modelos `CustomerPayment`, `SalePaymentStatus`, y el folio `RECIBO` están en BD. Sin embargo, los tipos front-end (`SaleSummaryDto`, `SaleDetailDto` en `app/(private)/sales/_logic/types/api.ts`) aún no incluyen `paidAmount`, `paymentStatus` ni `isCredit`, y no existe ninguna pantalla para cobrar ni consultar abonos.

Restricciones relevantes:
- Toda la lógica de UI vive bajo `app/`; `src/` es exclusivo del backend.
- `_logic/services/` encapsulan `authFetch`; nunca devuelven `Response` crudo.
- Pages son Server Components por defecto (sin `"use client"`).
- `_components/` es presentacional: sin fetch, sin router, sin localStorage.
- Branch scoping es manejado en el backend; la UI solo propaga `branchId` cuando corresponde.
- Los hooks globales `useFoliosOptions` y `usePaymentMethodsOptions` ya existen y serán reutilizados.

## Goals / Non-Goals

**Goals:**
- Permitir al operador registrar y cancelar abonos desde el panel web.
- Mostrar el estado de cobro (`paymentStatus`, `paidAmount`) en la lista y detalle de ventas.
- Proveer una sección `SalePaymentsSection` en el detalle de venta para créditos.
- Pantalla de historial con filtros + exportación PDF client-triggered.
- Entrada `payments` en el NavigationRail.
- Cobertura de tests unitarios RTL para bloques y hooks principales.

**Non-Goals:**
- Abonos globales sin atribuir a venta específica.
- Múltiples métodos de pago en un mismo abono.
- Notas de crédito / saldos a favor.
- Edición de abonos (cancelar + crear nuevo es el flujo soportado).
- Notificaciones push o email al cliente.

## Decisions

### D1 — Registro de abono: página dedicada vs modal

**Elegido**: modal `RegisterPaymentModal` iniciado desde `SalePaymentsSection` dentro del detalle de venta. El formulario es simple (amount, paymentMethodId, folioId, notes?) y no requiere selección por línea como las devoluciones.

**Alternativa descartada**: página `/sales/[id]/payments/new` (análoga a devoluciones). Descartada porque el formulario de abono no tiene la complejidad de selección de cantidades por ítem que justifica una página completa; mantener el contexto del ticket mejora la UX.

### D2 — SaleDetailDto: extensión de tipos front-end

Los tipos `SaleSummaryDto` y `SaleDetailDto` en `app/(private)/sales/_logic/types/api.ts` deben extenderse con:
- `paidAmount: number` (parseado del `string` que devuelve el backend).
- `paymentStatus: "paid" | "partial" | "pending"`.
- `isCredit: boolean` (campo derivado que el backend ya incluye en el DTO).

El mapper en `app/(private)/sales/_logic/services/_mappers.ts` parseará `paidAmount` de string a number con `parseFloat`.

**Razón**: la lista de ventas y el detalle necesitan estos datos para mostrar el badge de estado de cobro y la barra de progreso en `SalePaymentsSection`; extender los tipos existentes es menos costoso que crear tipos paralelos.

### D3 — `SalePaymentStatusBadge`: nuevo átomo visual

Nuevo componente `app/(private)/sales/_blocks/SalePaymentStatusBadge.tsx` (no en `_components/atoms/` porque es específico del dominio de ventas). Paleta:
- `paid` → chip verde (`bg-green-100 text-green-800`) — "Pagado"
- `partial` → chip amarillo (`bg-yellow-100 text-yellow-800`) — "Parcial"
- `pending` → chip rojo (`bg-red-100 text-red-800`) — "Pendiente"

Solo visible cuando `isCredit === true`. Para ventas cash no se renderiza (la venta siempre es `paid` y no es relevante mostrarlo).

### D4 — Historial PDF: descarga client-triggered

`GET /api/v1/admin/payments/history?format=pdf` devuelve `application/pdf`. La UI llama a `authFetch`, convierte a blob y usa `URL.createObjectURL` + `<a download>` para forzar la descarga. El botón "Exportar PDF" muestra un spinner durante la descarga; error 409 (`ReportTooLarge`) muestra toast de error.

**Alternativa descartada**: abrir en nueva pestaña con `window.open`. Descartada porque requeriría pasar el token por query param (inseguro).

### D5 — Ruta `/payments/history` vs tab en `/payments`

**Elegido**: página separada `/payments/history` accesible desde `/payments` mediante un botón/link "Ver historial" en el toolbar. Requiere `payments:report_read`. Tiene su propio toolbar con filtros avanzados (userId, customerId, productId, paymentMethodId, from/to) y el botón de exportar PDF.

**Alternativa**: tab dentro de `/payments`. Descartada por complejidad de filtros distintos (historial tiene más parámetros) y para respetar el patrón de rutas existentes (no hay tabs en otros módulos).

### D6 — `SalePaymentsSection` vs `SaleReturnsSection`

`SalePaymentsSection` espeja el patrón de `SaleReturnsSection`:
- Solo se renderiza si `sale.isCredit === true`.
- Llama `GET /api/v1/admin/sales/:id/payments` via hook `useSalePayments(saleId)`.
- Muestra: barra de progreso visual (`paidAmount / total`), tabla de abonos, CTA "Registrar abono" (si `status='completed'` + `payments:create`).
- Al cancelar un abono desde esta sección, re-fetcha el sale (para actualizar `paidAmount`/`paymentStatus`) y los payments.

### D7 — NavigationRail: posición de "Pagos"

Insertar `payments` entre `returns` y `inventory` en `items.ts`. Icon: `"payments"` (Material Symbols). Requiere `payments:read`.

### D8 — Estructura de archivos del módulo `payments` UI

```
app/(private)/payments/
├── page.tsx                          # Server Component, exporta metadata
├── history/
│   └── page.tsx                      # Server Component, requiere payments:report_read
├── [id]/
│   └── page.tsx                      # Server Component
├── _blocks/
│   ├── PaymentsListPage.tsx
│   ├── PaymentsToolbar.tsx
│   ├── PaymentsTable.tsx
│   ├── PaymentsEmpty.tsx
│   ├── PaymentStatusBadge.tsx        # completed | cancelled
│   ├── PaymentDetailPage.tsx
│   ├── PaymentMetaPanel.tsx
│   ├── PaymentActionsBar.tsx         # botón cancelar
│   ├── CancelPaymentModal.tsx
│   ├── RegisterPaymentModal.tsx      # formulario de registro de abono
│   ├── PaymentsHistoryPage.tsx       # historial con filtros y export PDF
│   └── PaymentsHistoryToolbar.tsx
└── _logic/
    ├── hooks/
    │   ├── usePaymentsList.ts
    │   ├── usePaymentDetail.ts
    │   ├── usePaymentMutations.ts
    │   ├── useSalePayments.ts        # hook para SalePaymentsSection
    │   └── usePaymentsHistory.ts
    ├── services/
    │   ├── listPayments.ts
    │   ├── getPayment.ts
    │   ├── registerPayment.ts
    │   ├── cancelPayment.ts
    │   ├── listSalePayments.ts
    │   ├── getPaymentsHistory.ts
    │   └── index.ts
    ├── schemas/
    │   └── registerPayment.ts        # Zod client-side
    └── types/
        ├── api.ts                    # PaymentDto, PaymentDetailDto, etc.
        └── domain.ts                 # Payment, PaymentStatus, SalePaymentStatus

app/(private)/sales/_blocks/
├── SalePaymentsSection.tsx           # Nuevo — se añade a SaleDetailPage
└── SalePaymentStatusBadge.tsx        # Nuevo — badge paid|partial|pending
```

## Risks / Trade-offs

- **[`paidAmount`/`paymentStatus` ausentes en ventas pre-deploy]** → El backend hace backfill en la migración (`paid_amount=total`, `payment_status='paid'`); la UI parseará correctamente valores `0` como `paid` para ventas existentes.
- **[Cancelación de abono actualiza `paidAmount` del sale]** → `useSalePayments` re-fetcha ambos recursos tras cancelar; posible flicker. Mitigación: mostrar spinner mientras refresca.
- **[Exportación PDF lenta en historial grande]** → Botón muestra estado `loading`; timeout del browser (60s) es suficiente para < 10k filas; el backend rechaza > 10k con 409.
- **[`RegisterPaymentModal` con dos selectores (folioId, paymentMethodId)]** → reusar `useFoliosOptions` y `usePaymentMethodsOptions` con filtro `isActive=true`; el folio `RECIBO` aparece pre-seleccionado si es el único folio activo disponible (o si es el primero de la lista).
- **[Concurrencia: dos operadores abonan al mismo ticket]** → el backend rechaza con 409 `PaymentExceedsDueAmount`; la UI muestra error inline y re-fetcha el sale para mostrar el saldo actualizado.
