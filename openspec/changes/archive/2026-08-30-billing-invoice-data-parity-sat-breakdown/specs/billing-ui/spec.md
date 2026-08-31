## MODIFIED Requirements

### Requirement: `/billing/[id]` invoice detail
The system SHALL expose a private route `/billing/[id]` gated by `billing:read` that fetches `GET /api/v1/admin/invoices/:id` via `getInvoice`. It SHALL render a header (folio fiscal `uuid`, `InvoiceStatusBadge`, link a `/sales/[saleId]` cuando `saleId` no es null), `InvoiceItemsTable` (snapshots por línea con `lineSubtotal/lineIva/lineIeps/lineTotal` y totales `subtotal/taxTotal/total`, y por línea el `satProductCode` mostrado como "código - descripción" vía `satProductCodeLabel` de la respuesta — no sólo el código crudo), `InvoiceMetaPanel` (una sección "Datos del emisor": `issuerRfc/issuerLegalName/issuerFiscalRegime/issuerZipCode/issuerAddress`, mostrando el régimen fiscal como "código - descripción" (resuelto vía `SatTaxRegimeRepository`, ver `billing-api`), un subtítulo con `issuerBranchName` cuando la respuesta lo trae (mismo lugar visual que ya usa el modal/PDF de prefactura), y "—" para cualquier campo `null`; una sección "Datos del receptor": `receiverRfc/receiverName/receiverCfdiUse/receiverFiscalRegime/receiverTaxZipCode`, con `receiverFiscalRegime` y `receiverCfdiUse` también como "código - descripción"; `paymentForm`/`paymentMethod` como "código - descripción" vía el catálogo compartido `SAT_PAYMENT_FORMS`/`SAT_PAYMENT_METHODS`; banner de cancelación con `cancellationMotive`+`cancelledAt` si `status='cancelled'`), y `InvoiceActionsBar`.

`InvoiceActionsBar` SHALL render "Descargar PDF" (molecule compartido `DownloadPdfButton`, `app/_components/molecules/PdfDownloadButton.tsx`, icono `picture_as_pdf`) y "Descargar XML" siempre, y "Cancelar" sólo cuando `status='stamped'` y `can("billing:cancel")`.

#### Scenario: Render stamped invoice
- **WHEN** a user with `billing:read` opens `/billing/[id]` of a `stamped` invoice
- **THEN** items, totales, emisor, receptor y los botones de descarga SHALL render; "Cancelar" SHALL render only if the user has `billing:cancel`

#### Scenario: Cancelled invoice shows banner, no cancel
- **WHEN** the invoice `status='cancelled'`
- **THEN** the meta panel SHALL show the cancellation banner (`cancellationMotive`, `cancelledAt`) and the "Cancelar" action SHALL NOT render

#### Scenario: Not found
- **WHEN** the backend responds 404 `InvoiceNotFound`
- **THEN** the service SHALL throw `InvoiceNotFoundError` and the page SHALL render a not-found state

#### Scenario: Branch scope violation
- **WHEN** the backend responds 403 for an invoice outside the user's branch
- **THEN** the page SHALL render an access-denied message

#### Scenario: Download PDF button uses shared icon
- **WHEN** the "Descargar PDF" button renders on `/billing/[id]`
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule

#### Scenario: Issuer section shows dashes for a pre-migration invoice
- **WHEN** the invoice was stamped before the issuer snapshot existed and its `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress` are all `null`
- **THEN** the "Datos del emisor" section SHALL render with "—" in each field instead of a blank space or a crash

#### Scenario: Fiscal regime and CFDI use show their description, not just the code
- **WHEN** a stamped invoice has `receiverFiscalRegime="601"` and `receiverCfdiUse="G03"`
- **THEN** the detail page SHALL show "601 - General de Ley Personas Morales" and "G03 - Gastos en general" (or their current catalog descriptions), not the raw codes alone — same treatment for the issuer's fiscal regime

#### Scenario: Item's SAT product/service code shows its description
- **WHEN** an invoice item has `satProductCode="21102300"`
- **THEN** `InvoiceItemsTable` SHALL show "21102300 - `<description>`" for that line, not the raw code alone

#### Scenario: Issuer branch name shown as subtitle
- **WHEN** the response includes `issuerBranchName`
- **THEN** the "Datos del emisor" section SHALL show it as a subtitle, matching how the prefactura already shows the issuing branch

#### Scenario: Issuer branch name absent
- **WHEN** the response's `issuerBranchName` is `null` (e.g. branch lookup failed defensively)
- **THEN** the "Datos del emisor" section renders without that subtitle, no crash

---

### Requirement: Invoice preview before stamping
Both emission forms (`StampSaleForm` and `PartialInvoiceForm`, under `/billing/new`) SHALL render a "Vista previa" button. Clicking it SHALL open `InvoicePreviewModal` (a native `<dialog>`, following the same open/close pattern as `CancelInvoiceModal`) showing: the logo and the fixed title "Factura" (NOT the company name — the company's identity lives only in the "Datos del emisor" section below), a folio placeholder "PENDIENTE DE TIMBRAR", a visible badge "BORRADOR — no válido fiscalmente", a "Datos del emisor" section (RFC, razón social, régimen fiscal as "code - description", código postal, dirección — resolved as described below), the receiver's fiscal data including its zip code (`taxZipCode`) and its `fiscalRegime`/`cfdiUse` as "code - description", a "Forma de pago" / "Método de pago" section (each as "code - description" via the shared `describePaymentForm`/`describePaymentMethod` catalog, matching what the PDF already shows — this section did not previously render in the modal), the line items with per-line SAT product/service code (as "code - description", resolved client-side per the resolution described below), per-line IEPS, per-line subtotal, and aggregate totals computed client-side via `computeInvoiceTotalsClient`, and three actions: "Volver a editar" (closes the modal without side effects), "Descargar PDF" (molecule compartido `DownloadPdfButton`, icono `picture_as_pdf` — downloads the currently-displayed preview as a PDF via `POST /api/v1/admin/invoices/preview/pdf`, sending the same `InvoicePreviewData` already rendered on screen — no side effects, no Facturama call), and "Timbrar ahora" (invokes the same existing `submit()` used by the form's real "Emitir factura" action — it SHALL NOT call Facturama or persist anything on its own).

The issuer's fiscal identity (`rfc`, `legalName`, `fiscalRegime`, `zipCode`, `address`) SHALL be resolved by calling `GET /api/v1/admin/billing/emitter-fiscal-settings` (requires only `billing:write`, already held by whoever can open this form — NOT `billing:manage_csd`) when the preview is opened, for BOTH forms. That endpoint's cascade (CSD en vivo → `EmitterFiscalSettings` → `TicketSettings`, ver `billing-api`) draws only from real data the admin has actually captured — it SHALL NEVER return a hardcoded/invented placeholder. A field with no value in any of the three sources renders as "—" in the UI; the same "—" also covers the case where the network call itself fails (see below) — the UI cannot distinguish "nothing captured" from "the lookup failed", and SHALL NOT need to. The receiver's `fiscalRegime`/`cfdiUse` descriptions SHALL be resolved client-side by querying the existing search endpoints `GET /api/v1/admin/sat-codes/regimen-fiscal?search=<code>` and `.../uso-cfdi?search=<code>` with the exact code, reusing them as an exact-match lookup. Each line's `satProductCode` description SHALL be resolved the same way, querying `GET /api/v1/admin/sat-codes?search=<code>` (the base sat-codes endpoint, product/service code catalog), once per unique code across the previewed lines. This resolution SHALL happen once per modal open and SHALL NOT block rendering the rest of the preview if any of it fails — a failure to resolve issuer data or a catalog description SHALL NOT prevent "Descargar PDF" or "Timbrar ahora" (the backend independently re-resolves everything server-side for the actual PDF render).

For `PartialInvoiceForm`, the receiver/lines preview data SHALL be built entirely from data already present in the form's local state (customer, lines, payment form/method) — no network request beyond the issuer fiscal lookup and the per-line SAT code lookups above SHALL be made to open the preview.

For `StampSaleForm`, which does not hold line items or the receiver's fiscal data in its local state, opening the preview SHALL resolve that data by reading `GET /api/v1/admin/sales/:id` and (when the sale has a `customerId`) `GET /api/v1/admin/customers/:id` — both already-existing read endpoints, reused unmodified. When mapping the sale's items to preview lines, any `discountPct`, `ivaRate`, or `iepsRate` that is `null` on the source sale item (e.g. a line without a discount, or an IEPS-exempt product) SHALL be normalized to `0` — the preview payload SHALL NEVER carry a `null` for these fields, since the preview PDF endpoint's contract requires non-nullable numbers (see `billing-api`'s "Invoice preview PDF endpoint"). While resolving, the modal SHALL show a loading state. If the selected sale has no `customerId`, the modal SHALL show the message "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable "Timbrar ahora" AND "Descargar PDF".

The preview SHALL never introduce a persisted draft state: `Invoice.status` remains only `"stamped" | "cancelled"`, and closing the modal without confirming SHALL leave the form's state untouched. Downloading the PDF SHALL NOT close the modal or alter the form's state.

#### Scenario: Preview from partial invoice form (no network)
- **WHEN** the user has picked a fiscally-complete customer and added at least one line in `PartialInvoiceForm`, then clicks "Vista previa"
- **THEN** the modal SHALL open showing the logo, the "Factura" title, "BORRADOR" badge, "PENDIENTE DE TIMBRAR" folio, issuer data (resolved via the emitter fiscal settings lookup, including address), receiver data (including zip code and fiscal-regime/CFDI-use descriptions), a Forma de pago/Método de pago section, lines with SAT code description/IEPS/subtotal per line, and totals matching the form's live totals

#### Scenario: Preview from stamp-sale form (resolves sale + customer)
- **WHEN** the user has selected a `completed` sale with an associated customer in `StampSaleForm`, then clicks "Vista previa"
- **THEN** the modal SHALL show a brief loading state, then render the sale's lines (with SAT code description/IEPS/subtotal per line), the customer's real fiscal data, the issuer's fiscal data, and Forma de pago/Método de pago

#### Scenario: Sale without customer blocks preview confirmation and download
- **WHEN** the user clicks "Vista previa" in `StampSaleForm` for a sale with no `customerId`
- **THEN** the modal SHALL show "Esta venta no tiene cliente asociado, no se puede facturar" and SHALL disable both "Timbrar ahora" and "Descargar PDF", without throwing an unhandled error

#### Scenario: Confirm stamps for real
- **WHEN** the user clicks "Timbrar ahora" inside the preview modal (either form)
- **THEN** the modal SHALL close and the form's existing real stamping flow SHALL run unchanged (same `POST /api/v1/admin/invoices` request the "Emitir factura" / "Emitir factura parcial" button already triggers)

#### Scenario: Cancel preview leaves form untouched
- **WHEN** the user clicks "Volver a editar"
- **THEN** the modal SHALL close and no field of the underlying form SHALL be modified

#### Scenario: Download PDF from partial invoice preview
- **WHEN** the user, with a partial-invoice preview open, clicks "Descargar PDF"
- **THEN** the browser downloads a PDF containing the same issuer, receiver, payment form/method, lines (with SAT code/IEPS/subtotal), and totals shown in the modal, watermarked "BORRADOR — no válido fiscalmente", without closing the modal or calling `POST /invoices`

#### Scenario: Download PDF from stamp-sale preview
- **WHEN** the user, with a stamp-sale preview open (customer resolved), clicks "Descargar PDF"
- **THEN** the browser downloads a PDF matching the sale's lines and the customer's fiscal data, same watermark

#### Scenario: Download PDF succeeds when the sale has null discount/tax fields
- **WHEN** the user opens a stamp-sale preview for a sale whose items include `discountPct`, `ivaRate`, or `iepsRate` equal to `null`, and clicks "Descargar PDF"
- **THEN** the PDF downloads successfully, showing `0%`/`$0` for the normalized fields, instead of failing with a validation error

#### Scenario: Download does not affect modal state
- **WHEN** the user clicks "Descargar PDF" and the download completes (or fails)
- **THEN** the modal remains open with its data unchanged, and "Timbrar ahora"/"Volver a editar" remain available

#### Scenario: Download failure shown inline
- **WHEN** `POST /api/v1/admin/invoices/preview/pdf` fails (network error or non-200)
- **THEN** the modal shows an inline error near the "Descargar PDF" button without closing or clearing the preview, and the error message reflects the backend's actual reason (e.g. a validation detail) rather than a generic connectivity message whenever the backend returned a structured error body

#### Scenario: Preview download button uses shared icon
- **WHEN** the "Descargar PDF" button renders inside `InvoicePreviewModal`
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule, same icon as `/billing/[id]`

#### Scenario: Issuer lookup failure does not block the preview
- **WHEN** `GET /api/v1/admin/billing/emitter-fiscal-settings` fails (network error) while opening the preview
- **THEN** the modal SHALL still open showing "—" for the issuer's RFC/razón social/régimen fiscal/CP/dirección, and "Descargar PDF"/"Timbrar ahora" SHALL remain enabled (the actual PDF resolves the issuer server-side regardless, via the same cascade, so it will not be blank there even if it was in the modal)

#### Scenario: Modal header shows "Factura", not the company name
- **WHEN** the preview modal renders (either form)
- **THEN** its header SHALL show the logo and the text "Factura" — it SHALL NOT show the issuer's name or "Agrisas" as a title; the issuer's identity is shown only inside the "Datos del emisor" section below

#### Scenario: Catalog description lookup failure falls back to raw code
- **WHEN** a search call to `/api/v1/admin/sat-codes/regimen-fiscal`, `.../uso-cfdi`, or the base `/api/v1/admin/sat-codes` (product/service code) fails or returns no match for the exact code
- **THEN** the modal SHALL display the raw code alone for that field, without blocking the rest of the preview

#### Scenario: Payment form/method section renders with description
- **WHEN** the preview modal renders (either form)
- **THEN** it SHALL show a "Forma de pago" / "Método de pago" section with each value as "code - description", matching what the preview PDF already shows for the same data

#### Scenario: Line's SAT code, IEPS, and subtotal render in the modal
- **WHEN** a previewed line has `satProductCode` and `iepsRate > 0`
- **THEN** the modal's line table SHALL show that line's SAT code description, its IEPS, and its subtotal — not just description/quantity/price/total as before
