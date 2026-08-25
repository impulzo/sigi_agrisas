# Spec: payments-ui

## Purpose

Define la interfaz de usuario del módulo de abonos (pagos de crédito): listado paginado de abonos, detalle con acciones, sección de abonos embebida en el detalle de venta, modal de registro, historial exportable a PDF y componentes de estado de pago.

---
## Requirements
### Requirement: PaymentStatusBadge estado combinado

El componente `app/(private)/payments/_blocks/PaymentStatusBadge.tsx` SHALL recibir dos props: `status: "completed" | "cancelled"` (ciclo de vida del registro de abono) y `salePaymentStatus: "paid" | "partial" | "pending"` (estado de cobro de la venta asociada al abono en el momento actual). SHALL renderizar exactamente uno de 3 estados visuales, calculados así:

- `status === "cancelled"` → estado `"cancelled"`, label "Cancelado".
- `status === "completed"` AND `salePaymentStatus === "paid"` → estado `"completed"`, label "Completado".
- `status === "completed"` AND `salePaymentStatus !== "paid"` → estado `"active"`, label "Activo".

El estado `"active"` SHALL usar un color distinto (no verde) al usado por `"completed"`, para no confundirse visualmente con el badge "Pagado" de `SalePaymentStatusBadge`.

Todo consumidor de `PaymentStatusBadge` (`PaymentsTable`, `SalePaymentsSection`, `PaymentDetailPage`, `PaymentsHistoryPage`, `GroupedPaymentsTable`) SHALL pasar ambas props usando el `salePaymentStatus` de la venta asociada al abono en el momento de renderizar (no el estado en el momento en que el abono fue creado).

#### Scenario: Abono activo con venta parcial

- **WHEN** un abono tiene `status="completed"` y su venta tiene `salePaymentStatus="partial"`
- **THEN** el badge muestra "Activo"

#### Scenario: Abono activo con venta liquidada

- **WHEN** un abono tiene `status="completed"` y su venta tiene `salePaymentStatus="paid"`
- **THEN** el badge muestra "Completado"

#### Scenario: Abono cancelado

- **WHEN** un abono tiene `status="cancelled"`
- **THEN** el badge muestra "Cancelado" sin importar `salePaymentStatus`

#### Scenario: Badge cambia al registrar el abono que liquida la venta

- **WHEN** en `SalePaymentsSection` de una venta con `total=1000` se registra un abono parcial de `600` (badge "Activo") y luego un segundo abono de `400` que deja `salePaymentStatus="paid"`
- **THEN** el badge del segundo abono muestra "Completado"; el primer abono (si sigue activo, sin cancelar) pasa también a mostrar "Completado" porque ambos reflejan el estado ACTUAL de la venta, no un snapshot histórico

---

### Requirement: Vista agrupada por ticket en listado e historial de abonos

`PaymentsListPage` y `PaymentsHistoryPage` SHALL ofrecer un control de tipo toggle ("Vista plana" / "Vista agrupada", usando `SegmentedButton`) que alterna cómo se renderizan los resultados ya cargados, sin re-consultar al backend:

- **Vista plana**: tabla actual, una fila por abono (`PaymentsTable` / tabla plana del historial).
- **Vista agrupada**: componente `GroupedPaymentsTable` — agrupa los items visibles por `saleId` client-side; cada grupo se renderiza como una fila padre con `saleFolioCode`, `customerName`, `saleTotal`, `saleDueAmount`, expandible a sus abonos individuales (cada uno con su propio `PaymentStatusBadge`).

La agrupación en pantalla opera únicamente sobre los items de la página cargada actualmente (no re-agrupa a través de múltiples páginas del backend); si un ticket tiene abonos repartidos entre dos páginas de resultados, cada página muestra su propio grupo parcial para ese ticket.

En `PaymentsHistoryPage`, independientemente de qué vista esté activa en pantalla (plana o agrupada), los exports a PDF y Excel SHALL generarse siempre agrupados por ticket sobre el dataset filtrado completo (no paginado), con subtotal de Monto total/Saldo por ticket y totales globales al final del documento.

#### Scenario: Activar vista agrupada en el listado

- **WHEN** el usuario en `/payments` cambia el toggle a "Vista agrupada"
- **THEN** las filas se reorganizan agrupadas por `saleId`, cada grupo mostrando el folio de venta, cliente, Monto total y Saldo, con sus abonos colapsados por default

#### Scenario: Volver a vista plana

- **WHEN** el usuario cambia el toggle de "Vista agrupada" a "Vista plana"
- **THEN** se muestra de nuevo la tabla original, una fila por abono, sin perder los filtros ni la página actual

#### Scenario: Ticket con abonos en dos páginas distintas

- **WHEN** un ticket tiene 2 abonos y, por la paginación activa, quedan en páginas distintas de resultados
- **THEN** en vista agrupada cada página muestra ese ticket como un grupo separado con solo los abonos presentes en esa página (limitación conocida, no se agrupa entre páginas)

#### Scenario: Export agrupado independiente del toggle de pantalla

- **WHEN** el usuario tiene la "Vista plana" activa en pantalla y hace clic en "Exportar PDF" o "Exportar Excel"
- **THEN** el documento generado agrupa TODAS las filas del dataset filtrado por ticket (no solo las de la página visible), con subtotal por ticket y totales globales al final

---

### Requirement: Payments list page

El sistema SHALL proveer la ruta `app/(private)/payments/page.tsx` (Server Component) con `metadata.title = "Abonos"`. Renderiza `<PaymentsListPage />` (Client Component) que consume `usePaymentsList`.

`PaymentsListPage` incluye:
- `PaymentsToolbar`: campo de búsqueda server-side (mín 2 chars, debounce 300 ms, badge "Búsqueda en servidor · 2+ caracteres"), selector de estado (`completed`, `cancelled`, `todos`), selector de sucursal (visible solo con `branches:access_all`), rango de fechas `from`/`to`. Botón "Historial" navega a `/payments/history` (visible si `can("payments:report_read")`).
- Toggle "Vista plana" / "Vista agrupada" (ver Requirement: Vista agrupada por ticket en listado e historial de abonos).
- `PaymentsTable` (vista plana): columnas — Folio recibo, Folio venta, Cliente, Cobrador, Método de pago, Monto, Monto total de la venta, Saldo pendiente, Fecha, Estado, Acción. La columna Sucursal se muestra solo cuando el usuario tiene `branches:access_all`. La columna Acción tiene un botón "Ver" que navega a `/payments/:id`. La columna Estado usa `PaymentStatusBadge` con los 3 estados (Activo/Cancelado/Completado).
- `GroupedPaymentsTable` (vista agrupada): fila padre por ticket con Monto total y Saldo, expandible a sus abonos.
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

#### Scenario: Desglose de Monto total y Saldo visible en cada fila

- **WHEN** el usuario ve la vista plana con una venta cuyo `total=1000` y `paidAmount=300`
- **THEN** la fila del abono muestra `Monto total: $1,000.00` y `Saldo pendiente: $700.00`, además del monto del abono individual

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
- Tabla de abonos: columnas — Folio recibo, Cobrador, Método, Monto, Fecha, Estado. Sin paginación (máx abonos por venta es razonable). La columna Estado usa `PaymentStatusBadge` pasando el `paymentStatus` que `useSalePayments` ya expone a nivel de sección (no solo el `status` individual del abono), de forma que el badge refleja los 3 estados combinados (Activo/Cancelado/Completado). Un abono con desglose por línea (`items` no vacío) SHALL mostrar un indicador expandible ("Ver desglose") listando `{productNameSnapshot, amount}` por línea.
- Tabla de saldo por línea ("Saldo por producto"): columnas — Producto, Total línea, Pagado, Pendiente, derivada de `lineBalances` de la respuesta. Visible solo cuando `sale.isCredit === true`, independiente de si hay abonos aún (líneas sin abono muestran `Pagado: $0.00`).
- CTA "+ Registrar abono" visible si `sale.status === 'completed'` y `can("payments:create")`; abre `RegisterPaymentModal`.
- Sección vacía (sin abonos aún) muestra texto "Sin abonos registrados" (la tabla de saldo por línea SHALL seguir visible aunque no haya abonos, mostrando el pendiente completo de cada línea).

Tras registrar o cancelar un abono, la sección llama `onPaymentMutated()` prop que propaga al padre (`SaleDetailPage`) para re-fetch del `sale` (actualiza `paidAmount`, `paymentStatus`).

#### Scenario: Venta cash no muestra sección

- **WHEN** `sale.isCredit === false`
- **THEN** `SalePaymentsSection` no se renderiza

#### Scenario: Venta crédito con abonos

- **WHEN** `sale.isCredit === true` con 2 abonos (1 completed, 1 cancelled) y `paidAmount=300`, `total=1000`
- **THEN** la sección muestra barra de progreso "30%", tabla con 2 filas, CTA si corresponde, y el abono `completed` muestra badge "Activo" (venta parcial)

#### Scenario: CTA oculto cuando venta no es completada

- **WHEN** `sale.status === 'cancelled'`
- **THEN** el botón "+ Registrar abono" no se muestra

#### Scenario: Tabla de saldo por línea visible sin abonos

- **WHEN** `sale.isCredit === true` y aún no hay abonos registrados
- **THEN** la tabla "Saldo por producto" muestra cada línea con `Pagado: $0.00` y `Pendiente` igual al total de la línea

#### Scenario: Desglose de un abono por línea es expandible

- **WHEN** un abono en la tabla tiene `items` no vacío
- **THEN** la fila muestra un control "Ver desglose" que al expandirse lista cada `{producto, monto}` del abono

#### Scenario: Badge cambia a Completado al liquidar la venta

- **WHEN** se registra el abono que deja `paymentStatus="paid"`
- **THEN** tras el refresh de la sección, ese abono (y cualquier otro abono activo de la misma venta) muestra badge "Completado"

---

### Requirement: RegisterPaymentModal

Modal lanzado desde `SalePaymentsSection`. Campos:
- `amount: number` — requerido, `> 0`, max 2 decimales en UI. Muestra el saldo pendiente como hint: "Saldo pendiente: $X.XX".
- `paymentMethodId: string` — selector usando `usePaymentMethodsOptions()` (solo activos). Default: primer método no-crédito disponible.
- `folioId: string` — selector usando `useFoliosOptions()` (solo activos). Default: folio cuyo `code='RECIBO'` si existe en la lista.
- `notes?: string` — campo de texto opcional, max 1000 chars.
- Un toggle opcional "Repartir por producto" (`off` por default, preserva el flujo actual). Al activarlo, el modal reemplaza el campo `amount` único por una lista de las líneas de la venta (`lineBalances`), cada una con un input de monto independiente (placeholder: saldo pendiente de esa línea, `0` por default) y un badge con su saldo pendiente. `amount` del body SHALL calcularse como la suma de los montos de línea capturados (no editable directamente en este modo). Líneas con `dueAmount = 0` SHALL aparecer deshabilitadas (ya liquidadas).

Validación Zod client-side en `_logic/schemas/registerPayment.ts`. En submit: llama `registerPayment(saleId, body)` del service, incluyendo `items` cuando el toggle está activo. Errores:
- 409 `PaymentExceedsDueAmount` → error inline en campo `amount`: "El monto supera el saldo pendiente ($X.XX)".
- 409 `PaymentExceedsLineDueAmount {saleItemId, due}` → error inline en el input de esa línea específica: "Supera el saldo pendiente de esta línea ($X.XX)"; las demás líneas conservan su valor capturado.
- 400 `PaymentItemsAmountMismatch` → no debería ocurrir desde la UI (el total se deriva de la suma), pero si el backend lo rechaza se muestra como error genérico.
- 409 `SaleNotPayable` → error genérico: "Esta venta no admite abonos".
- 400 → mensaje del backend.

En éxito: cierra modal, llama `onSuccess()`.

#### Scenario: Folio RECIBO preseleccionado

- **WHEN** la lista de folios activos contiene uno con `code='RECIBO'`
- **THEN** ese folio queda preseleccionado al abrir el modal

#### Scenario: Error de monto excedido

- **WHEN** el operador ingresa `amount=500` y el saldo pendiente es `300`
- **THEN** el submit falla con error inline "El monto supera el saldo pendiente ($300.00)" sin cerrar el modal

#### Scenario: Modo repartir por producto activo

- **WHEN** el operador activa "Repartir por producto"
- **THEN** el campo `amount` único se oculta y aparece un input de monto por cada línea de la venta con saldo pendiente, mostrando su saldo como hint

#### Scenario: Envío en modo repartir por producto

- **WHEN** el operador captura `$60` en la línea A y `$50` en la línea B, y confirma
- **THEN** el servicio llama `registerPayment(saleId, { amount: 110, items: [{saleItemId: A, amount: 60}, {saleItemId: B, amount: 50}], ... })`

#### Scenario: Línea ya liquidada aparece deshabilitada

- **WHEN** una línea tiene `dueAmount = 0`
- **THEN** su input de monto aparece deshabilitado en modo "Repartir por producto"

#### Scenario: Error de línea excedida resalta solo esa línea

- **WHEN** el backend responde `409 PaymentExceedsLineDueAmount` para la línea B
- **THEN** solo el input de la línea B muestra el error inline; los demás inputs conservan su valor capturado

### Requirement: SalePaymentStatusBadge

El sistema SHALL exponer el componente `app/(private)/sales/_blocks/SalePaymentStatusBadge.tsx` (presentational). Props: `status: "paid" | "partial" | "pending"`.

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

Toggle "Vista plana" / "Vista agrupada" (ver Requirement: Vista agrupada por ticket en listado e historial de abonos) sobre los `items` de la página JSON cargada.

El toolbar incluye:
- Botón "Descargar PDF" (molecule compartido `DownloadPdfButton`, `app/_components/molecules/PdfDownloadButton.tsx`, icono `picture_as_pdf`) que: (1) llama `GET /api/v1/admin/payments/history?format=pdf&{filtros actuales}` con `authFetch`; (2) convierte la respuesta a `Blob` y crea un `<a download="payments-history-YYYY-MM-DD.pdf">` dinámico; (3) muestra spinner durante la descarga; (4) error 409 (`ReportTooLarge`) → toast "El conjunto de datos supera 10,000 registros. Aplica más filtros." El PDF generado agrupa las filas por ticket.
- Botón "Exportar Excel" con el mismo comportamiento que "Descargar PDF" pero llamando `?format=xlsx` y descargando `payments-history-YYYY-MM-DD.xlsx`. El Excel generado agrupa las filas por ticket con la misma estructura que el PDF.

La tabla de resultados en vista plana (`PaymentsHistoryTable`) tiene las mismas columnas que `PaymentsTable` (incluyendo Monto total de la venta, Saldo pendiente, y `PaymentStatusBadge` de 3 estados) más el pie "Totales": `totals.rowCount`, `totals.completedCount`, `totals.cancelledCount`, `totals.totalAmountCompleted`, `totals.totalAmountCancelled` — leídos desde el objeto `totals` anidado de la respuesta (no como campos planos de nivel superior), mostrando siempre valores numéricos correctos, nunca `NaN` ni `undefined`.

Sin paginación en PDF/Excel; con paginación (`pageSize` default 50, max 200) en JSON.

#### Scenario: Descargar PDF con filtros activos

- **WHEN** el usuario aplica filtro `from=2026-06-01` y hace clic en "Descargar PDF"
- **THEN** el browser descarga un archivo `payments-history-YYYY-MM-DD.pdf` agrupado por ticket, sin navegar fuera de la página

#### Scenario: Exportar Excel con filtros activos

- **WHEN** el usuario aplica filtro `from=2026-06-01` y hace clic en "Exportar Excel"
- **THEN** el browser descarga un archivo `payments-history-YYYY-MM-DD.xlsx` agrupado por ticket, sin navegar fuera de la página

#### Scenario: ReportTooLarge muestra error

- **WHEN** el backend devuelve 409 `{"error":"ReportTooLarge","limit":10000}` (para `format=pdf` o `format=xlsx`)
- **THEN** se muestra un toast con el mensaje de filtrado y no se descarga ningún archivo

#### Scenario: Botón historial desde lista

- **WHEN** el usuario con `payments:report_read` accede a `/payments`
- **THEN** el toolbar muestra el botón "Historial" que navega a `/payments/history`

#### Scenario: Pie de totales muestra valores correctos

- **WHEN** el historial devuelve `totals: { rowCount: 5, completedCount: 4, cancelledCount: 1, totalAmountCompleted: "1200.0000", totalAmountCancelled: "50.0000" }`
- **THEN** el pie de la tabla muestra "Total registros: 5", "Completados (4): $1,200.00", "Cancelados (1): $50.00" — nunca `$NaN` ni `$undefined`

#### Scenario: Pie de totales con resultado vacío

- **WHEN** el historial no devuelve registros tras aplicar filtros (`totals.rowCount === 0`)
- **THEN** el pie de totales muestra "0" y "$0.00" en cada campo, no `NaN`

#### Scenario: Botón de descarga PDF con icono uniforme

- **WHEN** se renderiza el botón "Descargar PDF" en `/payments/history`
- **THEN** muestra el icono `picture_as_pdf`, provisto por el molecule compartido `DownloadPdfButton`

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

