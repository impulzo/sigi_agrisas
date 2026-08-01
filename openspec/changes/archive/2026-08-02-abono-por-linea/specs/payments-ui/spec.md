## MODIFIED Requirements

### Requirement: SalePaymentsSection en SaleDetailPage

`SaleDetailPage` SHALL incluir `<SalePaymentsSection saleId={id} />` condicionalmente: solo cuando `sale.isCredit === true`. La sección se renderiza después de `SaleReturnsSection`.

`SalePaymentsSection` (Client Component) consume `useSalePayments(saleId)` que llama `GET /api/v1/admin/sales/:id/payments`.

Contenido:
- Título "Abonos" con contador `(N)`.
- Barra de progreso visual: `paidAmount / total` redondeado a 2 dec MXN; texto `"$X.XX abonado de $Y.YY"`.
- Tabla de abonos: columnas — Folio recibo, Cobrador, Método, Monto, Fecha, Estado. Sin paginación (máx abonos por venta es razonable). Un abono con desglose por línea (`items` no vacío) SHALL mostrar un indicador expandible ("Ver desglose") listando `{productNameSnapshot, amount}` por línea.
- Tabla de saldo por línea ("Saldo por producto"): columnas — Producto, Total línea, Pagado, Pendiente, derivada de `lineBalances` de la respuesta. Visible solo cuando `sale.isCredit === true`, independiente de si hay abonos aún (líneas sin abono muestran `Pagado: $0.00`).
- CTA "+ Registrar abono" visible si `sale.status === 'completed'` y `can("payments:create")`; abre `RegisterPaymentModal`.
- Sección vacía (sin abonos aún) muestra texto "Sin abonos registrados" (la tabla de saldo por línea SHALL seguir visible aunque no haya abonos, mostrando el pendiente completo de cada línea).

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

#### Scenario: Tabla de saldo por línea visible sin abonos

- **WHEN** `sale.isCredit === true` y aún no hay abonos registrados
- **THEN** la tabla "Saldo por producto" muestra cada línea con `Pagado: $0.00` y `Pendiente` igual al total de la línea

#### Scenario: Desglose de un abono por línea es expandible

- **WHEN** un abono en la tabla tiene `items` no vacío
- **THEN** la fila muestra un control "Ver desglose" que al expandirse lista cada `{producto, monto}` del abono

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
