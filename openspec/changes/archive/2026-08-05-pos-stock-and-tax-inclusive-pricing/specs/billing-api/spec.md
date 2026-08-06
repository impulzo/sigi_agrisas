## MODIFIED Requirements

### Requirement: Stamp invoice (CFDI Ingreso)
The system SHALL expose `POST /api/v1/admin/invoices` that issues (timbra) a CFDI 4.0 of type Ingreso (`I`) via Facturama and persists an `Invoice` only on success. Requires `billing:write`. The request body MUST be one of two mutually exclusive shapes:
- **Sale-linked**: `{ saleId: string (uuid), paymentForm?: string, paymentMethod?: string, cfdiUse?: string }` — the system loads the sale (must be `status='completed'`), derives `branchId`, receiver, items and totals from the sale and its customer. Since these totals are the sale's already-persisted snapshot (computed by `SaleTotalsCalculator`), they already reflect the tax-inclusive extraction formula — no re-derivation happens here.
- **Standalone**: `{ branchId?: string, customer: { rfc, name, cfdiUse, fiscalRegime, taxZipCode }, items: InvoiceItemInput[], paymentForm?, paymentMethod? }` — the system computes totals via `InvoiceTotalsCalculator`, using `Decimal(14,4)` banker's rounding and the same tax-inclusive-price extraction formula as `SaleTotalsCalculator`/`QuoteTotalsCalculator`/`ReturnTotalsCalculator`/`PurchaseTotalsCalculator` (`unitPrice` is the final price including tax; `lineSubtotal = lineGross / (1 + ivaRate + iepsRate)`). Standalone invoices have `saleId=null`.

`InvoiceItemInput`: `{ productId?: string|null, productCode: string, description: string, satProductCode?: string, satUnitCode?: string, unit?: string, quantity: number, unitPrice: number, discountPct?: number, ivaRate?: number, iepsRate?: number }`. Defaults: `paymentForm='01'`, `paymentMethod='PUE'`, `cfdiUse` from customer. **No inventory movement occurs in any case.** Returns HTTP 201 with `InvoiceDto`.

#### Scenario: Stamp from completed sale
- **WHEN** authenticated user with `billing:write` posts `{ "saleId": "<uuid>" }` for a `completed` sale whose customer has complete fiscal data
- **THEN** the system calls Facturama, persists an `Invoice` with `status='stamped'`, `uuid` (folio fiscal), `facturamaCfdiId`, `saleId` set, and returns HTTP 201 with `InvoiceDto`

#### Scenario: Stamp standalone invoice
- **WHEN** the body contains `customer` + `items[]` and no `saleId`
- **THEN** the system stamps the CFDI, persists `Invoice` with `saleId=null`, and does NOT modify `branch_inventory`

#### Scenario: Standalone invoice extracts tax from the final price
- **WHEN** a standalone item has `unitPrice=100`, `ivaRate=0.16`
- **THEN** `lineSubtotal ≈ 86.2069`, `lineIva ≈ 13.7931`, `lineTotal=100` — identical per-line breakdown to `SaleTotalsCalculator` given the same input

#### Scenario: Sale not completed
- **WHEN** the referenced sale has `status` other than `completed`
- **THEN** the system returns HTTP 409 `{"error":"SaleNotInvoiceable"}`

#### Scenario: Sale already has a stamped invoice
- **WHEN** the sale already has an `Invoice` with `status='stamped'`
- **THEN** the system returns HTTP 409 `{"error":"SaleAlreadyInvoiced","invoiceId":"<uuid>"}`

#### Scenario: Receiver fiscal data incomplete
- **WHEN** the customer is missing `rfc`, `cfdiUse`, `taxRegime` or `taxZipCode`
- **THEN** the system returns HTTP 400 `{"error":"ReceiverFiscalDataIncomplete"}` and does NOT call Facturama

#### Scenario: Facturama rejects the stamp
- **WHEN** Facturama returns an error (invalid CFDI, CSD missing, SAT validation)
- **THEN** the system returns HTTP 422 `{"error":"FacturamaStampError","detail":"<message>"}` and persists NO invoice

#### Scenario: Forbidden without permission
- **WHEN** user lacks `billing:write`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"billing:write"}`
