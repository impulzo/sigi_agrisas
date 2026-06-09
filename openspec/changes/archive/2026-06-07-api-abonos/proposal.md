## Why

El cliente necesita vender a crédito y recibir pagos parciales ("abonos") sobre ventas pendientes. Hoy el POS asume que cada `Sale` se cobra al 100% al momento (`status: completed`); `Customer.currentBalance` y `creditLimit` están en el schema pero son **read-only** (decisión explícita en `add-pos/design.md:60` que difería el dominio de crédito a un futuro `add-customer-credit`). Sin abonos, los operadores no pueden registrar cobros posteriores ni saber qué saldo deben los clientes. El cliente además pidió un historial imprimible/exportable a PDF, con filtros por usuario (cobrador), ticket (venta), cliente, producto y rango de fechas.

## What Changes

- **Nueva entidad `CustomerPayment`** (tabla `customer_payments`): registra cada abono con `id`, `customerId`, `saleId`, `userId` (cobrador), `branchId`, `paymentMethodId`, `folioId`/`folioNumber`/`folioCode` (folio propio de recibos de abono, separado del folio fiscal de la venta), `amount`, `status (completed | cancelled)`, `notes`, `createdAt`, `cancelledAt`, `cancellationReason`.
- **`PaymentMethod` extendido con `isCredit: boolean` (default `false`, inmutable tras creación)**: el método de pago es ahora el discriminador del flujo de crédito. Cuando el cajero selecciona un `PaymentMethod` con `isCredit=true`, la venta se activa automáticamente como venta a crédito. NO se agrega ningún flag `isCredit` a `Sale`; el carácter "venta a crédito" se infiere del método de pago seleccionado (con un JOIN al leer y mediante la carga del método en el use case al escribir).
- **Seed de un `PaymentMethod` semilla `code='CREDITO'`, `name='Crédito'`, `isCredit=true`**: provee la opción "Crédito" en la lista de métodos sin requerir que el operador la cree a mano. El admin puede crear métodos de crédito adicionales (ej. `code='CREDITO_30D'`) con `isCredit=true` si necesita distinguir plazos (los plazos en sí mismos NO se modelan en este change).
- **`Sale` extendido con campos de pago parcial**: `paidAmount` (Decimal, default `0`), `paymentStatus` (`paid` | `partial` | `pending`, calculado por el use case al crear/cancelar abonos o al emitir/cancelar/editar ventas). El "estado de cobro" es ortogonal al `status` de venta (`completed | cancelled | edited`, sin cambios).
- **`CreateSaleUseCase` detecta automáticamente venta a crédito**: el body sigue requiriendo `paymentMethodId`; el use case carga el `PaymentMethod` y, si `paymentMethod.isCredit=true`:
  - Valida que el caller tenga `sales:create_credit` (sino 403).
  - Valida que `customer.creditLimit !== null` y que `customer.currentBalance + total <= creditLimit` (sino 409).
  - Setea `paidAmount = 0`, `paymentStatus = pending` y suma `customer.currentBalance += total` en la misma transacción.
  - Si `paymentMethod.isCredit=false`: comportamiento actual (`paidAmount = total`, `paymentStatus = paid`, sin tocar `currentBalance`).
- **Nuevo módulo hexagonal `src/modules/payments/`**: ports, use cases (`RegisterPaymentUseCase`, `CancelPaymentUseCase`, `ListPaymentsUseCase`, `GetPaymentUseCase`, `ListPaymentsBySaleUseCase`, `GetPaymentHistoryReportUseCase`), repositorios Prisma/InMemory, controller HTTP.
- **Nuevos endpoints REST** bajo `/api/v1/admin/payments`:
  - `POST /` — registra un abono (mueve `Sale.paidAmount`, `Customer.currentBalance`, asigna folio).
  - `GET /` — lista paginada con filtros (usuario, saleId, customerId, productId vía join, paymentMethodId, status, rango fechas).
  - `GET /:id` — detalle.
  - `POST /:id/cancel` — cancela un abono; revierte `paidAmount` y `currentBalance`; re-calcula `paymentStatus`.
  - `GET /history` — reporte de historial con los mismos filtros, devuelve JSON o PDF según `?format=`.
  - `GET /api/v1/admin/sales/:id/payments` — lista los abonos de una venta (incluye cancelados).
- **Reglas de cancelación**: cancelar un abono es **no idempotente** (segunda llamada 409). Cancelar una venta que tiene abonos `completed` requiere primero cancelar los abonos (409 con lista de payment IDs).
- **Edición de ventas con abonos**: una `Sale` con uno o más abonos `completed` NO puede editarse (409). El operador debe cancelar abonos primero.
- **Folios separados para recibos**: un nuevo `Folio` semilla con `code="RECIBO"` se siembra en `prisma/seed.ts`; cada abono toma su número de ese folio (no del folio de la venta). `(folioId, folioNumber)` único.
- **Generación de PDF** server-side con `@react-pdf/renderer` (se evalúa reusar la instalación de `reports-inventory` si ya entró; si no, este change la instala).
- **Permisos RBAC nuevos**: `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`, `sales:create_credit` (separado de `sales:create` para que un perfil pueda cobrar contado pero NO autorizar crédito).
- **Migración Prisma `add_customer_payments`**: crea `customer_payments`, agrega columnas a `sales`, siembra el folio `RECIBO`.

## Capabilities

### New Capabilities

- `payments-api`: contrato de la API de abonos (entidad, endpoints, validaciones, branch scoping, formatos JSON/PDF, reglas de cancelación, interacciones con `sales` y `customers`).

### Modified Capabilities

- `pos-api`: agrega los campos `paidAmount` y `paymentStatus` al `Sale` y a los DTOs; introduce el flujo de venta a crédito activado por `paymentMethod.isCredit`; documenta el bloqueo de edición/cancelación cuando hay abonos `completed`.
- `customers-api`: documenta que `currentBalance` ahora **sí muta** (vía `payments-api` y vía venta a crédito), removiendo la prohibición previa. Mantiene el campo como read-only desde los endpoints CRUD de customers (no se puede setear directamente vía PATCH).
- `admin-payment-methods`: agrega el campo `isCredit: boolean` al modelo `PaymentMethod`, lo expone en los DTOs, y declara la invariante "inmutable tras creación". Agrega el seed semilla `code='CREDITO'`.
- `rbac`: agrega `payments:read`, `payments:create`, `payments:cancel`, `payments:report_read`, `sales:create_credit` al catálogo y a los roles base. Agrega el folio semilla `RECIBO` al seed.

## Impact

- **Código nuevo**: `src/modules/payments/**`, `app/api/v1/admin/payments/**/*`, `app/api/v1/admin/sales/[id]/payments/route.ts`, `tests/unit/modules/payments/**`.
- **Código modificado**: `prisma/schema.prisma` (`Sale` con `paidAmount`, `paymentStatus`; `PaymentMethod` con `isCredit`; `CustomerPayment` nuevo modelo), `prisma/seed.ts` (permisos + folio RECIBO + payment method CREDITO), `src/modules/pos/**` (CreateSaleUseCase, CancelSaleUseCase, EditCompletedSaleUseCase, SaleDto, SalesController para cargar paymentMethod y derivar flujo de crédito), `src/modules/payment-methods/**` (dominio + DTOs para exponer `isCredit`), `src/modules/customers/**` (mappers y dtos para reflejar `currentBalance` mutable).
- **Migración Prisma**: `prisma/migrations/2026XXXXXXXXXX_add_customer_payments` (incluye también `ALTER TABLE payment_methods ADD COLUMN is_credit`).
- **Dependencias**: `@react-pdf/renderer` (si no fue instalado por `reports-inventory`).
- **APIs nuevas**: `POST /payments`, `GET /payments`, `GET /payments/:id`, `POST /payments/:id/cancel`, `GET /payments/history`, `GET /sales/:id/payments`.
- **APIs modificadas (non-breaking)**: `POST /sales` sin cambios en el wire format del body (el flujo de crédito se deriva del `paymentMethodId`); `SaleDto` incluye `paidAmount` y `paymentStatus` (defaults seguros para callers viejos). `PaymentMethodDto` incluye `isCredit`.
- **Documentación**: tras archivar, `CLAUDE.md` recibirá la sección "Abonos (Backend)" análoga a "Devoluciones (Backend)", una nueva tabla de permisos y una nota sobre el flujo de crédito.
- **Sin breaking changes en el wire format**: el body de `POST /sales` no cambia; el cliente solo selecciona un `paymentMethodId` distinto para activar crédito.
