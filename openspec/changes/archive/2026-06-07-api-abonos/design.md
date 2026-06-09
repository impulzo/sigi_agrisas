## Context

El POS (módulo `pos`) actualmente asume **pago al momento** para toda venta: `Sale.status` solo puede ser `completed | cancelled | edited`, no hay `paidAmount`, y `Customer.currentBalance` está congelado (`add-pos/design.md:60` lo difería a un futuro `add-customer-credit`).

El módulo `customers` expone `currentBalance` y `creditLimit` como **read-only** desde los endpoints CRUD (`customers-api/spec.md:149-167`). La regla "POS no muta currentBalance" está documentada en `pos-api/spec.md:238-239` con scenario explícito.

Restricciones del dominio relevantes:
- `Sale.folio*` es inmutable post-creación (numeración fiscal MX consecutiva).
- `Sale.cashierId` es FK a `users` `ON DELETE RESTRICT`.
- `Sale.paymentMethodId` es FK a `PaymentMethod` `ON DELETE RESTRICT`.
- `Sale` tiene `quoteId` nullable (FK `ON DELETE SET NULL`) — coexistencia con `payments` debe respetar esto.
- 14 módulos hexagonales ya activos en `src/modules/` con el mismo patrón. `returns` (último entregado) es la mejor plantilla por similitud: agrega entidad con folios, snapshot de líneas, cancelación reversible, branch scoping, hooks con Sale.
- App Router Next 14 con runtime Node por default — compatible con `@react-pdf/renderer`.

El cliente pidió:
1. Historial de abonos por Usuario y Ticket.
2. Imprimir y exportar a PDF.
3. Filtrado/exportación por usuario y productos.

Tras alinear con el usuario, se confirmó el modelo "Sale a crédito + abonos liquidan", con un giro clave: **el crédito NO es un campo de `Sale`; es una propiedad del `PaymentMethod`**. Cuando el cajero selecciona un método con `isCredit=true` (típicamente el seed `CREDITO`), la venta se activa como venta a crédito; el `Sale` solo persiste `paidAmount` y `paymentStatus` como su "estado de cobro". Cada abono (`CustomerPayment`) la liquida progresivamente; cuando `paidAmount >= total` queda `paid`. `Customer.currentBalance` se mueve en ambos sentidos.

## Goals / Non-Goals

**Goals:**
- Persistir cada abono como un registro auditable (`CustomerPayment`) con folio propio (`code="RECIBO"`).
- Permitir crear ventas a crédito sin romper el contrato actual (`isCredit` con default `false`).
- Mover `Customer.currentBalance` atómicamente al crear venta a crédito (`+= total`) y al crear/cancelar abonos (`-= amount` / `+= amount`).
- Validar `creditLimit` al crear venta a crédito (sin línea de crédito O excede límite → 409).
- Reporte de historial con filtros (usuario, sale, customer, producto, paymentMethod, status, rango fechas) y exportación PDF via `@react-pdf/renderer`.
- Branch scoping idéntico al resto (vía `enforceBranchScope` / `resolveScopedBranchId`).
- Cobertura de tests unitarios para todos los use cases con `InMemoryPaymentRepository` y para el controller HTTP.
- Idempotencia del seed RBAC (5 permisos nuevos) y del folio `RECIBO`.

**Non-Goals:**
- UI/UX para registrar abonos y ver historial (ir á en `ui-ux-payments` posterior).
- Intereses, plazos, vencimientos por línea, recordatorios, mora — el dominio de cobranza más amplio se difiere.
- Aplicación de un abono "a saldo global" sin atribuir a una venta específica (cada abono es **por sale**; el saldo global del cliente es siempre `sum(sale.total - sale.paidAmount)` de sus ventas a crédito).
- Pagos en múltiples métodos en un mismo recibo (un `CustomerPayment` tiene UN solo `paymentMethodId`). Pagar $300 con efectivo + $200 con transferencia = dos abonos separados.
- Notas de crédito / saldos a favor (no se permite `currentBalance < 0`; ver D7).
- Conversión de moneda. Todo se asume MXN.
- Sincronización con CFDI / SAT (un futuro change podrá emitir el complemento de pago).

## Decisions

### D1 — `Sale` con `paidAmount` + `paymentStatus` (sin `isCredit` en Sale)

- **Elegido**: extender `Sale` con dos campos: `paidAmount: Decimal(14,4)` y `paymentStatus: 'paid' | 'partial' | 'pending'`. Cada `CustomerPayment` es FK a `Sale`. `paymentStatus` se mantiene **derivado** y persistido a la vez (escrito por los use cases que mueven `paidAmount`):
  - `paid` si `paidAmount >= total`.
  - `partial` si `0 < paidAmount < total`.
  - `pending` si `paidAmount === 0`.
  - Para ventas pagadas al momento, `paymentStatus` es siempre `paid` desde el primer momento (no generan abonos).
- **NO se agrega `Sale.isCredit`**: el carácter "venta a crédito" se infiere desde el `PaymentMethod` seleccionado (D2). El `Sale.status` (`completed | cancelled | edited`) y `Sale.paymentStatus` (`paid | partial | pending`) son los únicos estados del agregado.
- **Alternativa descartada**: persistir `Sale.isCredit` como snapshot. Descartado porque (a) duplicaría información disponible vía `JOIN payment_methods`, (b) abre la puerta a inconsistencia si el snapshot y el join discrepan, y (c) el usuario fue explícito: "el crédito no es un status".
- **Alternativa descartada 2**: tabla `Payment` flotante sin FK a Sale; el cliente debe N pagos y N ventas a crédito; un job FIFO los liga. Descartado por complejidad y por el requerimiento explícito "Historial **por Usuario y Ticket**" (atribución directa).
- **Razón**: refleja la atribución 1:1 ticket↔abonos, simplifica los reportes y los joins, y mantiene la regla del proyecto "snapshot por línea" sin sobrecargar el agregado `Sale`.

### D2 — Crédito como propiedad del `PaymentMethod` (no del body de `POST /sales`)

- **Elegido**: agregar el campo `isCredit: boolean NOT NULL DEFAULT false` al modelo `PaymentMethod`. El body de `POST /sales` NO recibe ningún flag de crédito; el `CreateSaleUseCase` carga el `paymentMethod` por `paymentMethodId` y RAMIFICA el flujo según `paymentMethod.isCredit`:
  - `paymentMethod.isCredit === false`: comportamiento actual (`paidAmount = total`, `paymentStatus = 'paid'`, sin tocar `currentBalance`).
  - `paymentMethod.isCredit === true`:
    - Exigir `sales:create_credit` (el controller valida antes de invocar al use case; 403 sino).
    - Validar `customer.creditLimit !== null` (sino 409 `CustomerHasNoCreditLineError`).
    - Validar `customer.currentBalance + sale.total <= customer.creditLimit` (sino 409 `CreditLimitExceededError`).
    - Setear `paidAmount = 0`, `paymentStatus = 'pending'`.
    - `UPDATE customers SET current_balance = current_balance + ? WHERE id = ?` en la misma transacción.
- **Inmutabilidad del flag**: `PaymentMethod.isCredit` SHALL ser inmutable tras la creación. `PATCH /payment-methods/:id` SHALL ignorar silenciosamente cualquier `isCredit` en el body (mismo patrón que `code`). Esto evita el escenario "el admin marca un método existente como crédito, ¿qué pasa con las ventas pasadas que lo usaron?".
- **Alternativa descartada**: endpoint separado `POST /sales/credit`. Descartado por duplicación de lógica y peor descubrimiento.
- **Alternativa descartada 2**: flag `isCredit: boolean` en el body de `POST /sales`, ortogonal al `paymentMethodId`. Descartado porque (a) el usuario quiere que la UX sea "el cajero solo elige el método de pago", (b) introducir un flag adicional sin contraparte UI agrega ambigüedad ("¿qué pasa si `isCredit=true` pero el método es `EFECTIVO`?").
- **Razón**: la UX queda transparente — el cajero ve "Efectivo", "Transferencia", "Crédito" como opciones equivalentes en un dropdown; el sistema sabe qué hacer con cada una. Backwards-compatible para los callers existentes (un cliente que solo tiene métodos cash sigue funcionando sin cambios).

### D3 — Seed semilla del `PaymentMethod` "CREDITO"

- **Elegido**: `prisma/seed.ts` hace upsert idempotente de un payment method con `code='CREDITO'`, `name='Crédito'`, `description='Venta a crédito (saldo a cuenta del cliente)'`, `isCredit=true`, `isActive=true`. Si ya existe con cualquier campo distinto, el seed lo actualiza EXCEPTO `code` (inmutable como en todos los catálogos).
- **¿Múltiples métodos de crédito?**: permitido. El admin puede crear `CREDITO_30D`, `CREDITO_60D`, etc. con `isCredit=true` para distinguir plazos visualmente (los plazos en sí no se modelan en este change). El sistema solo necesita saber si un método es crédito o no.
- **Razón**: provee la opción "Crédito" de fábrica para que el cliente pueda usar el flujo sin configuración manual; preserva la flexibilidad de tener varios métodos de crédito.

### D4 — Folio separado para recibos

- **Elegido**: nuevo `Folio` semilla con `code="RECIBO"`, `name="Recibo de abono"`. Cada `CustomerPayment` toma `(folioId, folioNumber)` de ese folio via el mismo helper atómico que `sales` (`UPDATE folios SET current_number = current_number + 1 WHERE id=? AND is_active=true RETURNING ...`).
- **Alternativa**: reusar el folio de la venta. Descartado porque (a) confundiría la numeración fiscal del ticket con la numeración del recibo, (b) requeriría sub-numeración (`A-001.1`, `A-001.2`...) que no escala.
- **Razón**: numeración independiente y trazable. El operador puede crear más folios de recibos si lo necesita (multi-folio por sucursal futura).

### D5 — `CustomerPayment.status`: `completed | cancelled`

- **Elegido**: ciclo de vida simple: nace `completed`; se puede cancelar a `cancelled` (no idempotente — segunda llamada → 409). No hay `pending`, `draft`, ni edición.
- **Razón**: alineado con `Return`. La edición de un abono mal capturado es: cancelar + crear uno nuevo. Folio nunca se libera (numeración consecutiva).

### D6 — Mover `Customer.currentBalance` atómicamente

- **Elegido**: TODA mutación de `currentBalance` ocurre dentro de la transacción que crea o cancela una entidad relacionada:
  - **Crear venta cuyo paymentMethod tiene `isCredit=true`**: `currentBalance += sale.total`. Atómico con el insert del Sale y los SaleItems.
  - **Cancelar venta a crédito sin abonos**: `currentBalance -= (sale.total - sale.paidAmount)` (resta el saldo aún pendiente). Atómico con el `UPDATE sales SET status='cancelled'`.
  - **Crear abono**: `currentBalance -= payment.amount` y `sale.paidAmount += payment.amount`. Atómico con el insert del payment.
  - **Cancelar abono**: `currentBalance += payment.amount` y `sale.paidAmount -= payment.amount`. Atómico con el `UPDATE customer_payments SET status='cancelled'`.
  - El `paymentStatus` de la sale se recalcula y persiste en cada operación.
- **Cómo se detecta "venta a crédito" en la transacción**: el repositorio carga el `PaymentMethod.isCredit` flag en la misma transacción (vía `include: { paymentMethod: true }` o un JOIN explícito) antes de decidir si tocar `currentBalance`.
- **Reglas anti-overdraw**:
  - Crear abono con `amount > sale.total - sale.paidAmount` → 409 `PaymentExceedsDueAmountError`.
  - Cancelar venta cuando tiene abonos `completed` → 409 con la lista de payment IDs a cancelar primero (NO cascada implícita).
  - Editar venta completada con abonos `completed` → 409 `SaleHasActivePaymentsError` (forzar cancelación previa).
- **Razón**: consistencia eventual entre `sale.paidAmount`, `payments.amount` agregados y `customer.currentBalance`. Las violaciones se detectan en tests con vectores de equivalencia.

### D7 — `currentBalance` no puede ser negativo

- **Elegido**: invariante a nivel de aplicación + CHECK opcional en BD (`current_balance >= 0`). Si un abono lo dejaría negativo (caso imposible con D6 si las validaciones se aplican, pero defensa en profundidad): rechazo 409 `PaymentWouldOverpayError`.
- **Razón**: el dominio asume "cliente debe ≥ 0". Saldos a favor / notas de crédito quedan explícitamente fuera de scope (Non-Goal).

### D8 — Branch scoping del abono

- **Elegido**: el `branchId` del `CustomerPayment` se hereda del `Sale.branchId` (no se acepta en el body). El operador con un branch asignado solo puede crear abonos para ventas de su sucursal. Si una venta está en una sucursal distinta al `x-user-branch-id` y el usuario no tiene `branches:access_all`: 403 antes de validar montos.
- **Reglas de listado**: `enforceBranchScope` para `GET /:id`, `POST /:id/cancel`; `resolveScopedBranchId` para `GET /` y `GET /history`. Idéntico al resto de módulos.
- **Razón**: coherencia transversal. Patrón establecido por `sales`, `returns`, `quotes`.

### D9 — Permisos RBAC con granularidad fina

- **Elegidos**: 5 permisos nuevos:
  - `payments:read` — listar y ver detalle (incluye `GET /sales/:id/payments`).
  - `payments:create` — registrar un abono.
  - `payments:cancel` — cancelar un abono.
  - `payments:report_read` — consultar el historial `/payments/history` y exportar PDF.
  - `sales:create_credit` — autorizar la creación de venta a crédito (`isCredit=true`).
- **Asignación a roles**:
  - `admin`: los 5 + todos los existentes.
  - `operator`: `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`, `sales:create_credit` (operador cobra y autoriza crédito como cajero principal).
  - `viewer`: `payments:read`, `payments:report_read` (consulta).
- **Razón**: separa "cobrar" de "autorizar crédito" (algunos negocios quieren solo admin para autorizar; pero por defecto operator lo recibe — fácil de remover del rol via UI). Granularidad fina sin sobrecargar.

### D10 — Reporte de historial: JSON + PDF en un endpoint

- **Elegido**: `GET /payments/history?format=json|pdf` con filtros (`userId`, `saleId`, `customerId`, `productId`, `paymentMethodId`, `status`, `from`, `to`, `branchId`). Sin paginación cuando `format=pdf` (el PDF se genera del set completo, con límite duro 10,000 filas para evitar abuso); con paginación cuando `format=json` (default `pageSize=50`, max `200`).
- **Filtro por productId**: join `customer_payments → sales → sale_items` y `DISTINCT payments.id WHERE sale_items.product_id = ?`. Trae todos los abonos de ventas que contienen el producto.
- **Razón**: misma forma que `reports-inventory` propuesto antes — consistencia.

### D11 — Stack PDF: `@react-pdf/renderer`

- **Elegido**: misma decisión que `reports-inventory` (D1 de su design.md). Si `reports-inventory` aterriza primero, este change solo verifica `npm ls @react-pdf/renderer`; sino lo instala.
- **Razón**: una sola lib de PDF para todo el panel.

### D12 — Estructura del módulo `payments`

```
src/modules/payments/
├── domain/
│   ├── entities/
│   │   └── CustomerPayment.ts
│   ├── value-objects/
│   │   ├── PaymentStatus.ts          (completed | cancelled)
│   │   └── SalePaymentStatus.ts      (paid | partial | pending)
│   ├── services/
│   │   └── SalePaymentApplier.ts     (puro: dado sale + new amount, devuelve {paidAmount, paymentStatus})
│   └── errors/
│       ├── PaymentNotFoundError.ts
│       ├── PaymentAlreadyCancelledError.ts
│       ├── PaymentExceedsDueAmountError.ts
│       ├── PaymentWouldOverpayError.ts
│       ├── SaleNotPayableError.ts            (status≠completed o isCredit=false)
│       ├── SaleHasActivePaymentsError.ts     (para rechazar edit/cancel de Sale)
│       ├── CustomerHasNoCreditLineError.ts
│       └── CreditLimitExceededError.ts
├── application/
│   ├── ports/
│   │   └── PaymentRepository.ts
│   ├── dto/
│   │   ├── PaymentDto.ts
│   │   ├── PaymentDetailDto.ts
│   │   ├── PaymentHistoryRowDto.ts
│   │   └── PaymentHistoryReportDto.ts
│   ├── mappers/
│   │   └── toPaymentDto.ts
│   └── use-cases/
│       ├── RegisterPaymentUseCase.ts
│       ├── CancelPaymentUseCase.ts
│       ├── ListPaymentsUseCase.ts
│       ├── GetPaymentUseCase.ts
│       ├── ListPaymentsBySaleUseCase.ts
│       └── GetPaymentHistoryReportUseCase.ts
└── infrastructure/
    ├── http/
    │   └── PaymentsController.ts
    ├── pdf/
    │   ├── PaymentHistoryPdf.tsx
    │   └── pdfStyles.ts
    ├── repositories/
    │   ├── PrismaPaymentRepository.ts
    │   └── InMemoryPaymentRepository.ts
    └── di/
        └── container.ts
```

Reusos del codebase:
- `src/modules/rbac/infrastructure/http/{requirePermission,enforceBranchScope}.ts` para el guard.
- `src/shared/infrastructure/prisma/client.ts` singleton Prisma.
- Helpers internos de `PrismaSaleRepository` para folio allocation (refactor sugerido: extraer `allocateFolio()` a `src/shared/infrastructure/folios/allocateFolio.ts` para reuso entre `sales`, `quotes`, y `payments`).

### D13 — Migración Prisma `add_customer_payments`

- Crea tabla `customer_payments`:
  - `id TEXT PK DEFAULT uuid()`
  - `sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT`
  - `customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT`
  - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT` (alineado con `sales.cashier_id @db.Uuid`)
  - `branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT`
  - `payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT`
  - `folio_id TEXT NOT NULL REFERENCES folios(id) ON DELETE RESTRICT`
  - `folio_number INT NOT NULL`
  - `folio_code TEXT NOT NULL` (snapshot)
  - `amount DECIMAL(14,4) NOT NULL CHECK (amount > 0)`
  - `status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled'))`
  - `notes TEXT NULL`
  - `created_at TIMESTAMP NOT NULL DEFAULT now()`
  - `cancelled_at TIMESTAMP NULL`
  - `cancellation_reason TEXT NULL`
  - `UNIQUE (folio_id, folio_number)`
  - Índices: `(sale_id, status)`, `(customer_id, status)`, `(user_id, created_at)`, `(branch_id, created_at)`.
- Agrega a `sales`:
  - `paid_amount DECIMAL(14,4) NOT NULL DEFAULT 0`
  - `payment_status VARCHAR(10) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending'))`
  - Para ventas existentes: `paid_amount = total`, `payment_status = 'paid'` (backfill explícito: `UPDATE sales SET paid_amount = total WHERE paid_amount = 0`).
- Agrega a `payment_methods`:
  - `is_credit BOOLEAN NOT NULL DEFAULT false`
  - Los payment methods existentes quedan con `is_credit = false` por DEFAULT.
- Agrega a `customers`: nada (los campos ya existen).
- Agrega a `folios`: nada; el seed inserta el folio `RECIBO`.

### D14 — Backfill de ventas existentes

- Las ventas previas al deploy quedan: `paid_amount = total`, `payment_status = paid`. El DEFAULT cubre las columnas; el `UPDATE sales SET paid_amount = total` en la migración asegura que las ventas existentes ya estén marcadas como pagadas.
- Los payment methods existentes quedan con `is_credit = false` (sin afectar el comportamiento previo).
- `customer_payments` arranca vacío. No hay migración de datos histórica.

## Risks / Trade-offs

- **[Inconsistencia `sale.paidAmount` ↔ `sum(payments.amount)`]** → mitigado por D6 (todo en una transacción) + test de invariante en repository tests + script de reconciliación offline opcional.
- **[`customer.currentBalance` drift]** → misma mitigación: toda mutación atómica + tests de invariante.
- **[Cancelar venta con abonos olvidados]** → 409 explícito con lista de payment IDs (D6). No hay cascada.
- **[Edición de venta con abonos pierde montos]** → 409 explícito (D6). Cobranza debe ser linear: cancelar abonos → editar venta → re-cobrar.
- **[Conversión Quote→Sale a crédito]** → permitida. El conversor (`POST /quotes/:id/convert`) acepta `paymentMethodId` para la venta resultante; si el `paymentMethod` seleccionado tiene `isCredit=true`, el flujo de crédito se activa idéntico al de `POST /sales` directo. La cotización en sí no tiene flag de crédito; solo la venta resultante lo es.
- **[PDF gigante con 10k filas]** → el endpoint impone límite duro 10,000 filas para `format=pdf`; si excede, devuelve 409 con sugerencia de afinar filtros.
- **[Concurrencia: dos abonos simultáneos]** → el `UPDATE sales SET paid_amount = paid_amount + ?` (con condición `paid_amount + ? <= total`) es atómico; un segundo abono que sobrepase devuelve 0 filas afectadas → 409.
- **[Folio `RECIBO` ya existente con datos]** → el seed usa `upsert` por `code`. Si ya existe con `current_number > 0`, lo respeta (idempotencia).
- **[`@react-pdf/renderer` doble instalación]** → npm dedupe; sin riesgo.
- **[Permiso `sales:create_credit` ausente en operator existente]** → el seed lo agrega via merge; usuarios viejos con rol `operator` lo reciben tras `npm run seed`.

## Migration Plan

1. `git pull`.
2. `npm install` (instala `@react-pdf/renderer` si falta).
3. `npx prisma migrate deploy` → aplica `add_customer_payments`.
4. `npm run seed` → crea los 5 permisos nuevos, los asigna a roles, e inserta el folio `RECIBO`.
5. Deploy backend.
6. Smoke:
   - `POST /sales` con `isCredit=true` → venta queda `pending`, `currentBalance` aumenta.
   - `POST /payments` → abono se registra, `paidAmount` aumenta, `currentBalance` baja.
   - `GET /payments/history?format=pdf` → PDF descargable.

Rollback: bajar el código a la versión previa. La migración Prisma es reversible (las columnas nuevas son DEFAULT y NULL-safe; un `DROP COLUMN` manual las elimina). El folio `RECIBO` queda en BD sin consumo (inofensivo).

## Open Questions

- **CFDI Complemento de Pago**: cuando el negocio emita facturación electrónica, cada abono requerirá un complemento de pago (PPD). Por ahora no se modela; se trata en un futuro change `payments-cfdi`.
- **Notificación al cliente** del abono recibido (email/whatsapp): fuera de scope; se diseñará si el cliente lo pide.
- **Aplicación FIFO** de un abono "al saldo global" sin atribuir a venta: descartado en este change (D1); si surge, se modela en un change posterior con un endpoint `POST /payments/global` que atribuya internamente con FIFO.
- **Recibo PDF individual**: ¿queremos `GET /payments/:id?format=pdf` que devuelva el recibo del abono individual (no solo el historial)? Probablemente sí pero se agrega cuando UI/UX lo pida. Por ahora solo el historial agregado.
