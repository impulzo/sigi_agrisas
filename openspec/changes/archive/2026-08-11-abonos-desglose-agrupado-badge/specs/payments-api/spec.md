## MODIFIED Requirements

### Requirement: List payments endpoint

El sistema SHALL exponer `GET /api/v1/admin/payments` que devuelve listado paginado. Requires `payments:read`. Query params: `page` (default 1), `pageSize` (default 20, max 100), `saleId?` UUID, `customerId?` UUID, `userId?` UUID, `paymentMethodId?` UUID, `status?` (one or more of `completed,cancelled`, comma-separated), `from?` ISO date, `to?` ISO date, `branchId?` UUID.

Branch scoping: idéntico al patrón de `sales` (`resolveScopedBranchId`).

Response: `{ items: PaymentDto[], total, page, pageSize }`. Ordenado por `created_at DESC`.

`PaymentDto`: `id`, `saleId`, `saleFolioCode` (join), `customerId`, `customerName` (join), `userId`, `userName` (join), `branchId`, `branchName` (join), `paymentMethodId`, `paymentMethodCode` (join), `folioId`, `folioCode`, `folioNumber`, `amount` (string), `status`, `notes`, `createdAt`, `cancelledAt`, `cancellationReason`, `saleTotal` (string, monto total de la venta asociada), `salePaidAmount` (string, abonado hasta el momento en la venta), `salePaymentStatus` (`"paid" | "partial" | "pending"`, estado de cobro de la venta), `saleDueAmount` (string, `saleTotal - salePaidAmount`).

#### Scenario: Listado básico

- **WHEN** un operator invoca el endpoint sin filtros
- **THEN** recibe HTTP 200 con sus abonos de su sucursal, paginados

#### Scenario: Filtro por ticket (saleId)

- **WHEN** se filtra `?saleId=<uuid-S>`
- **THEN** solo se incluyen abonos cuyo `sale_id === S`

#### Scenario: Filtro por usuario cobrador

- **WHEN** se filtra `?userId=<uuid-U>`
- **THEN** solo se incluyen abonos cuyo `user_id === U`

#### Scenario: Filtro por rango de fechas

- **WHEN** se filtra `?from=2026-06-01&to=2026-06-30`
- **THEN** solo se incluyen abonos con `created_at` dentro de ese rango (inclusive)

#### Scenario: Filtro por status múltiple

- **WHEN** se filtra `?status=completed,cancelled`
- **THEN** se incluyen ambos estados

#### Scenario: Cada abono incluye el desglose de su venta

- **WHEN** se lista un abono cuya venta tiene `total=1000` y `paidAmount=300`
- **THEN** el item incluye `saleTotal="1000.0000"`, `salePaidAmount="300.0000"`, `saleDueAmount="700.0000"`, `salePaymentStatus="partial"`

#### Scenario: Venta liquidada al 100% refleja saldo cero

- **WHEN** se lista un abono cuya venta tiene `total=1000` y `paidAmount=1000`
- **THEN** el item incluye `saleDueAmount="0.0000"` y `salePaymentStatus="paid"`

---

### Requirement: Get payment detail

El sistema SHALL exponer `GET /api/v1/admin/payments/:id`. Requires `payments:read`. Devuelve HTTP 404 si no existe. Branch scoping aplica.

`PaymentDetailDto` hereda todos los campos de `PaymentDto` (incluyendo `saleTotal`, `salePaidAmount`, `salePaymentStatus`, `saleDueAmount`) y añade el bloque `sale: { id, folioCode, folioNumber, total, paidAmount, paymentStatus }` con el snapshot completo de la venta.

#### Scenario: Detalle de abono existente

- **WHEN** un caller autorizado invoca `GET /payments/:id` con UUID válido
- **THEN** responde HTTP 200 con `PaymentDetailDto` (`PaymentDto` + desglose de venta + bloque `sale`)

#### Scenario: No encontrado

- **WHEN** el `:id` no matchea ningún abono
- **THEN** HTTP 404

---

### Requirement: List payments by sale

El sistema SHALL exponer `GET /api/v1/admin/sales/:id/payments` que lista TODOS los abonos de una venta (incluye `cancelled`). Requires `payments:read`. Branch scoping vía el `sale.branchId`.

Response: `{ items: PaymentDto[], saleId, saleTotal, salePaidAmount, salePaymentStatus, saleDueAmount, lineBalances: Array<{ saleItemId, lineTotal, paidAmount, dueAmount }> }`. `saleDueAmount = saleTotal - salePaidAmount`. Cada elemento de `items[]` (`PaymentDto`) también incluye `saleTotal`, `salePaidAmount`, `salePaymentStatus`, `saleDueAmount` a nivel de fila (mismos valores que los campos de nivel superior de la respuesta, por consistencia con el resto de endpoints que devuelven `PaymentDto`). `lineBalances` incluye TODAS las líneas de la venta (tengan o no abonos por línea); `paidAmount` de cada línea es la suma de `CustomerPaymentItem.amount` de abonos `completed` para esa línea (`0` si nunca se abonó por línea); `dueAmount = lineTotal - paidAmount`. Sin paginación (una venta no tendrá miles de abonos).

#### Scenario: Listar abonos de venta

- **WHEN** una venta tiene 3 abonos (2 completed y 1 cancelled)
- **THEN** la respuesta los incluye TODOS, ordenados por `created_at ASC`, con los totales agregados

#### Scenario: lineBalances incluye líneas sin abono por línea

- **WHEN** una venta tiene 2 líneas y ningún abono usó `items` (desglose por línea)
- **THEN** `lineBalances` incluye ambas líneas con `paidAmount: 0` y `dueAmount = lineTotal`

#### Scenario: lineBalances refleja abonos por línea completados

- **WHEN** una línea A (`lineTotal=100`) recibió un abono por línea de `60` (completed)
- **THEN** `lineBalances` para A muestra `paidAmount: 60`, `dueAmount: 40`

### Requirement: Payment history report endpoint

El sistema SHALL exponer `GET /api/v1/admin/payments/history` que devuelve el historial con filtros y formatos `json`, `pdf` o `xlsx`. Requires `payments:report_read`.

Query params (todos opcionales excepto `format`):

- `format?: "json" | "pdf" | "xlsx"` (default `"json"`).
- `userId?: string` UUID — filtra abonos cuyo cobrador es ese usuario.
- `saleId?: string` UUID — filtra a una venta específica (cubre el "historial por ticket").
- `customerId?: string` UUID.
- `productId?: string` UUID — filtra abonos cuya venta incluye ese producto (JOIN `sales` → `sale_items`; `DISTINCT customer_payments.id`).
- `paymentMethodId?: string` UUID.
- `status?: string` (comma-separated `completed,cancelled`; default ambos).
- `from?: string` (ISO date YYYY-MM-DD; inclusive lower bound sobre `created_at`).
- `to?: string` (ISO date YYYY-MM-DD; inclusive upper bound).
- `branchId?: string` UUID (con branch scoping).
- `page?`, `pageSize?` (solo para `format=json`; `pageSize` default `50`, max `200`).

Para `format=pdf` o `format=xlsx`: sin paginación, límite duro 10,000 filas compartido entre ambos formatos. Si excede → HTTP 409 `{"error":"ReportTooLarge","limit":10000}`.

Para `format=pdf`: el PDF SHALL generarse con `@react-pdf/renderer`, devuelto con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"` (fecha del `generatedAt` UTC). El contenido SHALL agrupar visualmente las filas por ticket (`saleId`): un bloque de encabezado por ticket (folio de venta, cliente, Monto total, Saldo) seguido de las filas de sus abonos, antes de la sección de totales globales.

Para `format=xlsx`: el archivo SHALL generarse como workbook `.xlsx`, devuelto con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.xlsx"`. El contenido SHALL agrupar las filas por ticket con la misma estructura que el PDF (encabezado de ticket + filas de abonos + fila en blanco de separación), y una sección de totales globales al final de la hoja.

`PaymentHistoryReportDto` (JSON):

```json
{
  "generatedAt": "2026-06-06T18:23:00.000Z",
  "generatedBy": { "userId": "<uuid>", "email": "operator@example.com" },
  "filters": { "userId": null, "saleId": null, "customerId": null, "productId": null, "paymentMethodId": null, "status": ["completed"], "from": null, "to": null, "branchId": null },
  "items": [
    {
      "id": "<uuid>",
      "createdAt": "2026-06-05T...",
      "folioCode": "RECIBO-0042",
      "saleId": "<uuid>",
      "saleFolioCode": "VENTA-1024",
      "customerId": "<uuid>",
      "customerName": "Acme S.A.",
      "userId": "<uuid>",
      "userName": "Juan Pérez",
      "branchId": "<uuid>",
      "branchName": "Matriz",
      "paymentMethodCode": "EFECTIVO",
      "amount": "300.0000",
      "status": "completed",
      "saleTotal": "1000.0000",
      "salePaidAmount": "1000.0000",
      "salePaymentStatus": "paid",
      "saleDueAmount": "0.0000"
    }
  ],
  "totals": {
    "rowCount": 1,
    "completedCount": 1,
    "cancelledCount": 0,
    "totalAmountCompleted": "300.0000",
    "totalAmountCancelled": "0.0000"
  },
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```

#### Scenario: Historial JSON con filtros

- **WHEN** un caller con `payments:report_read` invoca `?userId=<U>&from=2026-06-01&to=2026-06-30`
- **THEN** HTTP 200 con `items[]` filtrados (cada uno con `saleTotal`/`salePaidAmount`/`salePaymentStatus`/`saleDueAmount`) y `totals` agregados

#### Scenario: Historial por ticket

- **WHEN** un caller invoca `?saleId=<S>`
- **THEN** la respuesta solo incluye abonos cuyo `sale_id === S` (cubre "historial de abonos por Ticket")

#### Scenario: Historial filtrado por producto

- **WHEN** un caller invoca `?productId=<P>`
- **THEN** la respuesta incluye solo abonos cuya venta tiene al menos un `sale_item.product_id === P`; un abono cuya venta tiene 3 productos distintos aparece UNA sola vez

#### Scenario: PDF de historial agrupado por ticket

- **WHEN** un caller invoca `?format=pdf&userId=<U>`
- **THEN** HTTP 200 con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"`; el cuerpo es un PDF válido (comienza con bytes `%PDF-`) cuyo contenido agrupa las filas por ticket

#### Scenario: Excel de historial agrupado por ticket

- **WHEN** un caller con `payments:report_read` invoca `?format=xlsx&from=2026-06-01&to=2026-06-30`
- **THEN** HTTP 200 con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.xlsx"`; el archivo es un workbook `.xlsx` válido cuyo contenido agrupa las filas por ticket, con subtotal de Monto total/Saldo por ticket y totales globales al final

#### Scenario: Excel demasiado grande

- **WHEN** el set filtrado excede 10,000 filas y se pide `format=xlsx`
- **THEN** HTTP 409 `{"error":"ReportTooLarge","limit":10000}` (mismo comportamiento que `format=pdf`)

#### Scenario: PDF demasiado grande

- **WHEN** el set filtrado excede 10,000 filas y se pide `format=pdf`
- **THEN** HTTP 409 `{"error":"ReportTooLarge","limit":10000}`

#### Scenario: Sin permiso payments:report_read

- **WHEN** un usuario con `payments:read` pero SIN `payments:report_read` invoca el endpoint
- **THEN** HTTP 403 `{"error":"Forbidden","required":"payments:report_read"}`
