## MODIFIED Requirements

### Requirement: Quote detail screen with state-driven action bar

The system SHALL provide a screen at `/quotes/[id]` (`QuoteDetailPage`) that requires `quotes:read`. The screen SHALL render a header (folio mono, `QuoteStatusBadge`, total destacado, expiresAt with banner when `isExpired === true`), a metadata grid (cliente, sucursal, vendedor, fecha de creación, fecha de autorización if any, fecha de conversión if any, fecha de cancelación if any, motivo de cancelación if any), a `QuoteItemsTable` listing items with snapshot fields, a totals block (subtotal, taxTotal, total), and a `QuoteActionsBar`. The `QuoteActionsBar` SHALL render buttons according to `(status, isExpired, can(...))`:

| status | isExpired | Buttons |
|---|---|---|
| `draft` | false | Autorizar (`quotes:authorize`), Editar (`quotes:write`), Cancelar (`quotes:cancel`), Descargar PDF |
| `draft` | true | Editar (enabled, `quotes:write`), Cancelar (`quotes:cancel`), Descargar PDF; Autorizar disabled with tooltip "Extiende la fecha de vencimiento primero" |
| `authorized` | false | Convertir (`quotes:convert`), Cancelar (`quotes:cancel`), Descargar PDF |
| `authorized` | true | Convertir disabled with tooltip "Cotización vencida — cancela y crea otra", Cancelar (`quotes:cancel`), Descargar PDF |
| `converted` | n/a | Ver venta generada (link `/sales/[convertedSaleId]`), Descargar PDF |
| `cancelled` | n/a | banner, Descargar PDF |

Buttons whose required permission is `"loading"` SHALL render disabled with a small spinner. Buttons whose required permission is `false` SHALL NOT render. The "Descargar PDF" button (molecule compartido `DownloadPdfButton`, `app/_components/molecules/PdfDownloadButton.tsx`, icono `picture_as_pdf` — antes "Imprimir PDF" con icono `print`) SHALL render in every status (including `converted` and `cancelled`, which otherwise render no other write actions) since it requires no permission beyond the `quotes:read` already needed to view the screen. While a PDF download is in progress the button SHALL render disabled with a loading indicator; it SHALL re-enable once the download completes (success or failure).

#### Scenario: Draft quote shows three actions
- **WHEN** the quote has `status='draft'` and the caller has all three permissions
- **THEN** the action bar renders "Autorizar", "Editar" and "Cancelar"

#### Scenario: Expired draft hides Authorize
- **WHEN** the quote has `status='draft'`, `expiresAt < now`, `isExpired=true`
- **THEN** the "Autorizar" button is rendered disabled with the tooltip; "Editar" remains enabled

#### Scenario: Authorized quote shows convert and cancel
- **WHEN** the quote has `status='authorized'` and the caller has both permissions
- **THEN** the action bar renders "Convertir a venta" and "Cancelar"; "Editar" is hidden

#### Scenario: Converted quote deep-links to sale
- **WHEN** the quote has `status='converted'` with `convertedSaleId='S-1'`
- **THEN** the action bar renders the link "Ver venta generada" pointing to `/sales/S-1`

#### Scenario: Cancelled quote shows reason banner
- **WHEN** the quote has `status='cancelled'` with `cancellationReason='Cliente cambió de proveedor'`
- **THEN** the screen renders a banner with the reason and the cancelled date; no write action buttons render

#### Scenario: Permission loading state
- **WHEN** the `quotes:authorize` permission resolves to `"loading"`
- **THEN** the "Autorizar" button renders disabled with a small spinner until the check resolves

#### Scenario: Viewer cannot see write actions
- **WHEN** the caller has only `quotes:read`
- **THEN** the action bar renders no write buttons (authorize/edit/cancel/convert), but "Descargar PDF" still renders enabled

#### Scenario: isExpired banner appears
- **WHEN** the detail returns `isExpired=true`
- **THEN** an amber banner "Cotización vencida — el precio podría no estar vigente" renders above the totals block

#### Scenario: Descargar PDF available on converted and cancelled quotes
- **WHEN** the quote has `status='converted'` or `status='cancelled'`
- **THEN** the action bar still renders the "Descargar PDF" button alongside whatever status-specific content (link or banner) is shown

#### Scenario: Descargar PDF click triggers a direct download
- **WHEN** the caller clicks "Descargar PDF" on any quote
- **THEN** the browser downloads a file named `cotizacion-<folioCode>-<folioNumber>.pdf` without opening any preview modal, and no other action button is disabled by this in-flight download

#### Scenario: Descargar PDF disables while exporting
- **WHEN** a PDF download triggered by "Descargar PDF" is in progress
- **THEN** the "Descargar PDF" button renders disabled with a loading indicator until the download settles (success or error)

#### Scenario: Descargar PDF button uses shared icon
- **WHEN** the "Descargar PDF" button renders in `QuoteActionsBar`
- **THEN** it shows the `picture_as_pdf` icon provided by the shared `DownloadPdfButton` molecule, replacing the previous `print` icon
