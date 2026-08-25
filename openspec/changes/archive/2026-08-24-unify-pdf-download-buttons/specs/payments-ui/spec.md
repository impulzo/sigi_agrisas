## MODIFIED Requirements

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
