## MODIFIED Requirements

### Requirement: Waybill detail page

The system SHALL expose `/waybills/[id]` rendering `WaybillDetailPage`, gated by `waybills:read`. For `type='carta_porte'`, it SHALL display: the origin branch and the destination CUSTOMER (name, code, snapshotted address), a link to the originating sale (`/sales/[saleId]`), `WaybillItemsTable` (product, quantity, weight, SAT transport key), vehicle and driver data, CFDI status and UUID, and (for `status='completed'`) buttons to download PDF/XML (the PDF button using the shared `DownloadPdfButton` molecule, `app/_components/molecules/PdfDownloadButton.tsx`, icon `picture_as_pdf`, label "Descargar PDF") and cancel (gated additionally by `waybills:cancel`). For `type='simple'`, it SHALL display: origin/destination branch names (no address snapshot, since none is captured), `WaybillItemsTable` restricted to product/quantity columns (no weight/SAT/hazmat columns, since none apply), the transfer date, and notes — it SHALL NOT display any vehicle, driver, distance, CFDI, or sale-link section, and SHALL NOT render the PDF/XML download buttons (a `type='simple'` waybill has no CFDI to download).

For `status='cancelled'` waybills of either type, the page SHALL show a cancellation banner with reason and date, and SHALL NOT show the cancel button.

#### Scenario: Carta Porte detail shows customer destination and sale link
- **WHEN** a completed `type='carta_porte'` waybill's detail is opened
- **THEN** origin branch, destination customer (name/code/snapshotted address), a link to the originating sale, merchandise lines, vehicle, driver, and CFDI UUID are all visible

#### Scenario: Simple detail omits Carta Porte sections
- **WHEN** a completed `type='simple'` waybill's detail is opened
- **THEN** no vehicle, driver, CFDI, or sale-link section is rendered, the download buttons are absent, and the transfer date and notes are shown instead

#### Scenario: Cancelled waybill shows banner, no cancel button
- **WHEN** a cancelled waybill's detail is opened (either type)
- **THEN** a cancellation banner is shown and the "Cancelar" action is absent

#### Scenario: Download PDF or XML (Carta Porte only)
- **WHEN** the user clicks "Descargar PDF" or "Descargar XML" on a stamped `type='carta_porte'` waybill
- **THEN** the file downloads via `GET /waybills/:id/download?format=...`, with the filename derived from `Content-Disposition` (fallback `carta-porte-<uuid>.<ext>`)

#### Scenario: Download PDF button uses shared icon
- **WHEN** the "Descargar PDF" button renders on a stamped `type='carta_porte'` waybill detail
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule
