# Spec: payments-ui

## Purpose

Define la interfaz de usuario del módulo de abonos (pagos de crédito): listado paginado de abonos, detalle con acciones, sección de abonos embebida en el detalle de venta, modal de registro, historial exportable a PDF y componentes de estado de pago.

---

## Requirements

### Requirement: Payments list page

El sistema SHALL proveer la ruta `app/(private)/payments/page.tsx` (Server Component) con `metadata.title = "Abonos"`. Renderiza `<PaymentsListPage />` (Client Component) que consume `usePaymentsList`.

`PaymentsListPage` incluye:
- `PaymentsToolbar`: campo de búsqueda server-side (mín 2 chars, debounce 300 ms, badge "Búsqueda en servidor · 2+ caracteres"), selector de estado (`completed`, `cancelled`, `todos`), selector de sucursal (visible solo con `branches:access_all`), rango de fechas `from`/`to`. Botón "Historial" navega a `/payments/history` (visible si `can("payments:report_read")`).
- `PaymentsTable`: columnas — Folio recibo, Folio venta, Cliente, Cobrador, Método de pago, Monto, Fecha, Estado, Acción. La columna Sucursal se muestra solo cuando el usuario tiene `branches:access_all`. La columna Acción tiene un botón "Ver" que navega a `/payments/:id`.
- `PaymentsEmpty`: mensaje vacío cuando no hay resultados.
- Paginación con `CatalogPagination` (max pageSize 100).
- La página filtra con `resolveScopedBranchId` implícitamente en el backend; el selector de sucursal en toolbar es opcional para admins.

#### Scenario: Listado básico para operator

- **WHEN** un operator con `payments:read` y `x-user-branch-id=B1` accede a `/payments`
- **THEN** ve solo abonos de B1, ordenados por `created_at DESC`, con columnas sin "Sucursal"

#### Scenario: Admin ve columna Sucursal

- **WHEN** un admin con `branches:access_all` accede a `/payments`
- **THEN** la tabla incluye la columna "Sucursal" y el toolbar muestra el selector de sucursal

#### Scenario: Búsqueda server-side

- **WHEN** el usuario escribe 2+ caracteres en el campo de búsqueda
- **THEN** la lista se filtra tras 300 ms (por folio de venta o nombre de cliente)

---

### Requirement: Payment detail page

El sistema SHALL proveer `app/(private)/payments/[id]/page.tsx` (Server Component) que renderiza `<PaymentDetailPage id={params.id} />` (Client Component). Muestra:

- Header: folio del recibo (`folioCode`), `PaymentStatusBadge`, monto formateado como MXN.
- Link al ticket origen: "Venta · {saleFolioCode}" → `/sales/:saleId`.
- `PaymentMetaPanel`: cliente, cobrador, método de pago, sucursal, fecha, motivo de cancelación (si `status='cancelled'`).
- `PaymentActionsBar`: botón "Cancelar abono" visible si `status='completed'` y `can("payments:cancel")`. Abre `CancelPaymentModal`.

`CancelPaymentModal`: campo opcional "Motivo" (max 500 chars), botones Cancelar / Confirmar. En éxito refresca el detalle.

#### Scenario: Detalle de abono completado

- **WHEN** un usuario con `payments:read` accede a `/payments/:id` de un abono `completed`
- **THEN** ve el folio, monto, link al ticket, meta panel, y botón "Cancelar abono" si tiene `payments:cancel`

#### Scenario: Detalle de abono cancelado

- **WHEN** el abono tiene `status='cancelled'`
- **THEN** el botón "Cancelar abono" no se muestra; se muestra el motivo de cancelación en `PaymentMetaPanel`

#### Scenario: Cancelación exitosa

- **WHEN** el usuario confirma la cancelación
- **THEN** el modal cierra, el detalle se refresca y el badge pasa a "Cancelado"

---

### Requirement: SalePaymentsSection en SaleDetailPage

`SaleDetailPage` SHALL incluir `<SalePaymentsSection saleId={id} />` condicionalmente: solo cuando `sale.isCredit === true`. La sección se renderiza después de `SaleReturnsSection`.

`SalePaymentsSection` (Client Component) consume `useSalePayments(saleId)` que llama `GET /api/v1/admin/sales/:id/payments`.

Contenido:
- Título "Abonos" con contador `(N)`.
- Barra de progreso visual: `paidAmount / total` redondeado a 2 dec MXN; texto `"$X.XX abonado de $Y.YY"`.
- Tabla de abonos: columnas — Folio recibo, Cobrador, Método, Monto, Fecha, Estado. Sin paginación (máx abonos por venta es razonable).
- CTA "+ Registrar abono" visible si `sale.status === 'completed'` y `can("payments:create")`; abre `RegisterPaymentModal`.
- Sección vacía (sin abonos aún) muestra texto "Sin abonos registrados".

Tras registrar o cancelar un abono, la sección llama `onPaymentMutated()` prop que propaga al padre (`SaleDetailPage`) para re-fetch del `sale` (actualiza `paidAmount`, `paymentStatus`).

#### Scenario: Venta cash no muestra sección

- **WHEN** `sale.isCredit === false`
- **THEN** `SalePaymentsSection` no se renderiza

#### Scenario: Venta crédito con abonos

- **WHEN** `sale.isCredit === true` con 2 abonos (1 completed, 1 cancelled) y `paidAmount=300`, `total=1000`
- **THEN** la sección muestra barra de progreso "30%", tabla con 2 filas, CTA si corresponde

#### Scenario: CTA oculto cuando venta no es completada

- **WHEN** `sale.status === 'cancelled'`
- **THEN** el botón "+ Registrar abono" no se muestra

---

### Requirement: RegisterPaymentModal

Modal lanzado desde `SalePaymentsSection`. Campos:
- `amount: number` — requerido, `> 0`, max 2 decimales en UI. Muestra el saldo pendiente como hint: "Saldo pendiente: $X.XX".
- `paymentMethodId: string` — selector usando `usePaymentMethodsOptions()` (solo activos). Default: primer método no-crédito disponible.
- `folioId: string` — selector usando `useFoliosOptions()` (solo activos). Default: folio cuyo `code='RECIBO'` si existe en la lista.
- `notes?: string` — campo de texto opcional, max 1000 chars.

Validación Zod client-side en `_logic/schemas/registerPayment.ts`. En submit: llama `registerPayment(saleId, body)` del service. Errores:
- 409 `PaymentExceedsDueAmount` → error inline en campo `amount`: "El monto supera el saldo pendiente ($X.XX)".
- 409 `SaleNotPayable` → error genérico: "Esta venta no admite abonos".
- 400 → mensaje del backend.

En éxito: cierra modal, llama `onSuccess()`.

#### Scenario: Folio RECIBO preseleccionado

- **WHEN** la lista de folios activos contiene uno con `code='RECIBO'`
- **THEN** ese folio queda preseleccionado al abrir el modal

#### Scenario: Error de monto excedido

- **WHEN** el operador ingresa `amount=500` y el saldo pendiente es `300`
- **THEN** el submit falla con error inline "El monto supera el saldo pendiente ($300.00)" sin cerrar el modal

---

### Requirement: SalePaymentStatusBadge

Nuevo componente `app/(private)/sales/_blocks/SalePaymentStatusBadge.tsx` (presentational). Props: `status: "paid" | "partial" | "pending"`.

- `paid` → chip verde — "Pagado"
- `partial` → chip ámbar — "Parcial"
- `pending` → chip rojo — "Pendiente"

Mostrado en `SaleDetailPage` (junto a `SaleStatusBadge`) y en `SalesTable` (columna adicional "Cobro") cuando `isCredit === true`. Para ventas cash no se renderiza el badge.

`SaleSummaryDto` y `SaleDetailDto` en `app/(private)/sales/_logic/types/api.ts` se extienden con:
- `paidAmount: number`
- `paymentStatus: "paid" | "partial" | "pending"`
- `isCredit: boolean`

El mapper en `_logic/services/_mappers.ts` parseará `paidAmount` de `string` a `number` con `parseFloat`.

#### Scenario: Badge visible en venta a crédito

- **WHEN** `sale.isCredit === true` y `paymentStatus='partial'`
- **THEN** `SaleDetailPage` muestra el badge "Parcial" en ámbar junto al `SaleStatusBadge`

#### Scenario: Badge ausente en venta cash

- **WHEN** `sale.isCredit === false`
- **THEN** `SalePaymentStatusBadge` no se renderiza en lista ni detalle

---

### Requirement: Payment history page

El sistema SHALL proveer `app/(private)/payments/history/page.tsx` (Server Component) que renderiza `<PaymentsHistoryPage />` (Client Component). Requiere `payments:report_read`.

Filtros disponibles (todos opcionales): `userId` (selector de texto libre o futuro picker), `customerId`, `productId` (UUID), `paymentMethodId`, `status` (completed/cancelled/todos), `from`/`to` (fechas), `branchId` (solo con `branches:access_all`).

El toolbar incluye un botón "Exportar PDF" que:
1. Llama `GET /api/v1/admin/payments/history?format=pdf&{filtros actuales}` con `authFetch`.
2. Convierte la respuesta a `Blob` y crea un `<a download="payments-history-YYYY-MM-DD.pdf">` dinámico.
3. Muestra spinner durante la descarga.
4. Error 409 (`ReportTooLarge`) → toast "El conjunto de datos supera 10,000 registros. Aplica más filtros."

La tabla de resultados (`PaymentsHistoryTable`) tiene las mismas columnas que `PaymentsTable` más el campo "Totales" al pie: `completedCount`, `cancelledCount`, `totalAmountCompleted`, `totalAmountCancelled`.

Sin paginación en PDF; con paginación (`pageSize` default 50, max 200) en JSON.

#### Scenario: Exportar PDF con filtros activos

- **WHEN** el usuario aplica filtro `from=2026-06-01` y hace clic en "Exportar PDF"
- **THEN** el browser descarga un archivo `payments-history-YYYY-MM-DD.pdf` sin navegar fuera de la página

#### Scenario: ReportTooLarge muestra error

- **WHEN** el backend devuelve 409 `{"error":"ReportTooLarge","limit":10000}`
- **THEN** se muestra un toast con el mensaje de filtrado y no se descarga ningún archivo

#### Scenario: Botón historial desde lista

- **WHEN** el usuario con `payments:report_read` accede a `/payments`
- **THEN** el toolbar muestra el botón "Historial" que navega a `/payments/history`

---

### Requirement: Payments module frontend layering

Los archivos de la UI de abonos SHALL respetar las convenciones de arquitectura frontend:
- `_blocks/` son presentational: sin fetch, sin router, sin sessionStorage.
- `_logic/hooks/` orquestan estado + validación + HTTP + navegación.
- `_logic/services/` encapsulan `authFetch`; aceptan `fetchImpl?: typeof fetch`; nunca devuelven `Response` crudo.
- `_logic/schemas/` contienen validación Zod cliente.
- `page.tsx` son Server Components; exportan `metadata`.

#### Scenario: Services aceptan fetchImpl

- **WHEN** se inspecciona `app/(private)/payments/_logic/services/registerPayment.ts`
- **THEN** la función acepta un segundo parámetro `fetchImpl?: typeof fetch` (para tests RTL)

#### Scenario: Bloques son presentational

- **WHEN** se hace grep de `fetch(` en `app/(private)/payments/_blocks/`
- **THEN** no hay coincidencias directas (toda la red está en `_logic/services/`)

---

### Requirement: FolioScopeMismatch error typed in payments frontend

El módulo frontend de pagos (`app/(private)/payments/_logic/`) SHALL definir la clase `FolioScopeMismatchError extends Error` con propiedades públicas `expected: string` y `actual: string`. El servicio `registerPayment` SHALL detectar la respuesta `{"error":"FolioScopeMismatch","expected":"...","actual":"..."}` (HTTP 400) y lanzar `FolioScopeMismatchError(expected, actual)`. El componente `RegisterPaymentModal` SHALL capturar `FolioScopeMismatchError` y mostrar un mensaje inline claro en lugar del mensaje genérico actual.

#### Scenario: Backend retorna FolioScopeMismatch en registro de abono

- **WHEN** el servicio `registerPayment` recibe HTTP 400 con body `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"POS"}`
- **THEN** el servicio lanza `FolioScopeMismatchError` con `expected="OPERATIONS"` y `actual="POS"`, y el modal muestra un mensaje explicativo (ej. "El folio seleccionado es de tipo POS, pero este flujo requiere uno de tipo OPERATIONS.") en lugar de "Error al registrar el abono"

#### Scenario: Mensaje inline visible en RegisterPaymentModal

- **WHEN** la submisión del abono resulta en `FolioScopeMismatchError`
- **THEN** el modal muestra el error como `formError` (banner inline) en lugar de cerrar el modal o mostrar un mensaje genérico irrecuperable
