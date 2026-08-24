## MODIFIED Requirements

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

Para `format=pdf`: el PDF SHALL generarse con `@react-pdf/renderer`, devuelto con `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="payments-history-YYYY-MM-DD.pdf"` (fecha del `generatedAt` UTC). El contenido SHALL agrupar visualmente las filas por ticket (`saleId`): un bloque de encabezado por ticket (folio de venta, cliente, Monto total, Saldo) seguido de las filas de sus abonos, antes de la sección de totales globales. El encabezado del PDF SHALL incluir el logo del negocio (tamaño reducido, junto al título), resuelto desde `TicketSettings.logoUrl` con fallback al logo por defecto (`public/logo.png`) cuando no está configurado. Los colores de tabla (encabezado, bordes, texto mutado) SHALL provenir de la paleta de marca compartida (`pdfTheme`), no de valores hex arbitrarios específicos de este módulo.

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

#### Scenario: PDF incluye logo del negocio
- **WHEN** un caller con `payments:report_read` solicita `?format=pdf`
- **THEN** el PDF generado incluye el logo del negocio (o el fallback por defecto) en el encabezado

#### Scenario: PDF usa colores de marca
- **WHEN** un caller con `payments:report_read` solicita `?format=pdf`
- **THEN** el color de fondo del encabezado de tabla del PDF corresponde a la paleta de marca compartida, no al azul `#1565C0` anterior
