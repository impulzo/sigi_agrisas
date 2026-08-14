## MODIFIED Requirements

### Requirement: Download invoice file (PDF/XML)
The system SHALL expose `GET /api/v1/admin/invoices/:id/download?format=pdf|xml`. Requires `billing:read`. Enforces branch scope. The system retrieves the file from Facturama by `facturamaCfdiId` and responds with the binary content and the correct `Content-Type` (`application/pdf` or `application/xml`) and a `Content-Disposition` filename based on `uuid`. Default `format=pdf`.

Cuando la factura no tiene `facturamaCfdiId` (nunca timbrada o inconsistente), el sistema SHALL responder HTTP 400 `{"error":"Invoice has not been stamped"}` en vez de un cuerpo vacío con 200. Cuando la llamada al gateway Facturama falla al recuperar el archivo (timeout, error del proveedor), el sistema SHALL responder HTTP 502 `{"error":"Failed to download invoice file"}` sin filtrar detalle interno del proveedor.

#### Scenario: Download PDF
- **WHEN** `?format=pdf` for an existing, stamped invoice in scope
- **THEN** the system returns HTTP 200 with `Content-Type: application/pdf`

#### Scenario: Download XML
- **WHEN** `?format=xml`
- **THEN** the system returns HTTP 200 with `Content-Type: application/xml`

#### Scenario: Invalid format
- **WHEN** `format` is neither `pdf` nor `xml`
- **THEN** the system returns HTTP 400

#### Scenario: Invoice not stamped
- **WHEN** the invoice's `facturamaCfdiId` is null (never stamped or inconsistent)
- **THEN** the system SHALL return HTTP 400 `{"error":"Invoice has not been stamped"}` and SHALL NOT return a `200` response with empty content

#### Scenario: Facturama download failure
- **WHEN** the Facturama gateway raises an error while retrieving the stamped file
- **THEN** the system SHALL return HTTP 502 `{"error":"Failed to download invoice file"}` without leaking the underlying provider error detail
