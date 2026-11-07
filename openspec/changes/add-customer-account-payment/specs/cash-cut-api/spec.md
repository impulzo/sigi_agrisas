## MODIFIED Requirements

### Requirement: Row composition and tax prorating
Cada fila del corte de caja SHALL incluir: `customerCode` (código del cliente), `docto` (`customer_payments.folioCode`), `factura` (`sale.folioCode` de la venta ligada), `customerName`, `facturaDate` (`sale.createdAt`), `days` (días transcurridos entre `facturaDate` y `collectedAt`), `amount` (`customer_payments.amount`), `paymentMethodCode`/`paymentMethodName`, `reference` (`customer_payments.notes`), `collectedAt` (`customer_payments.createdAt`), `ivaAmount` y `taxRatePct`. Como `customer_payments` no persiste IVA propio, `ivaAmount` e `taxRatePct` SHALL prorratearse desde la venta ligada: `ivaAmount = amount × (sale.taxTotal / sale.total)`, `taxRatePct = sale.taxTotal / sale.subtotal`. El redondeo SHALL usar banker's rounding a 4 decimales. (Traza: S5.)

**Los abonos "a saldo general" (`CustomerPayment.saleId = null`, sin venta asociada) SHALL excluirse de este reporte** (`WHERE customer_payments.sale_id IS NOT NULL`, además del resto de filtros ya definidos). Razón: este reporte prorratea IVA y calcula `days`/`factura`/`facturaDate` a partir de una venta ligada; un abono sin venta no tiene un comprobante fiscal del que derivar esos campos. Esta exclusión es deliberada y documentada, no una pérdida de dato — ese abono sigue apareciendo en `GET /api/v1/admin/payments` y sigue decrementando `customers.current_balance` normalmente; sólo queda fuera de este reporte específico, cuyo modelo es inherentemente por-ticket.

#### Scenario: Días transcurridos
- **WHEN** una venta se factura el día X y su abono se cobra el día X+N
- **THEN** la fila correspondiente trae `days = N`

#### Scenario: IVA prorrateado en venta gravada
- **WHEN** el abono corresponde a una venta con `taxTotal > 0`
- **THEN** `ivaAmount` refleja la proporción del abono sobre el total de la venta y `taxRatePct` refleja la tasa efectiva de esa venta

#### Scenario: IVA prorrateado en venta con tasa 0%
- **WHEN** el abono corresponde a una venta con `taxTotal = 0`
- **THEN** `ivaAmount` y `taxRatePct` son `0`

#### Scenario: Abonos a saldo general quedan fuera del corte de caja
- **WHEN** el periodo filtrado incluye un abono a saldo general (`saleId=null`) además de abonos por venta
- **THEN** el corte de caja SHALL incluir únicamente las filas de abonos por venta; el abono a saldo general no aparece en `rows` ni en los totales de este reporte
