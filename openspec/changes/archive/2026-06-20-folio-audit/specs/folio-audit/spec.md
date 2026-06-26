## ADDED Requirements

### Requirement: Folio sequence audit endpoint
The system SHALL expose `GET /api/v1/admin/folios/:id/audit` that returns the full sequence of documents issued under a given folio. The endpoint requires the `folios:read` permission. The folio MUST exist; otherwise the system returns HTTP 404.

The response SHALL be:
```json
{
  "folioId": "uuid",
  "code": "TK",
  "prefix": "TK-",
  "currentNumber": 42,
  "totalIssued": 42,
  "gaps": [],
  "truncated": false,
  "sequence": [
    {
      "number": 1,
      "documentType": "sale",
      "documentId": "uuid",
      "status": "completed",
      "issuedAt": "ISO8601"
    }
  ]
}
```

- `gaps`: array of integers representing folio numbers in `[1..currentNumber]` that appear in no document. An empty array means the sequence is intact.
- `truncated`: `true` when total issued documents exceed 10 000; in that case `sequence` is empty and `gaps` is `[]`. Gap detection requires the full sequence and is intentionally skipped when truncated to avoid reporting inaccurate results from partial data.
- `documentType`: `'sale' | 'quote' | 'payment'`
- `status`: document-specific status string (e.g., `completed`, `cancelled`, `edited`, `draft`, `authorized`, `converted`).
- `issuedAt`: the document's `created_at` timestamp.
- `sequence` is ordered by `number` ascending.

The query MUST use a UNION over `sales`, `quotes`, `customer_payments` filtering by `folio_id = :id AND folio_number IS NOT NULL`.

#### Scenario: Folio with intact sequence
- **WHEN** an authenticated user with `folios:read` calls `GET /api/v1/admin/folios/:id/audit`
- **THEN** the system returns HTTP 200 with `gaps: []` and `sequence` containing one entry per issued document

#### Scenario: Folio with gap detected
- **WHEN** folio number 3 was never assigned (e.g., due to a DB inconsistency)
- **THEN** `gaps` includes `3` and `totalIssued` does not count it

#### Scenario: Cancelled document keeps its number
- **WHEN** a sale with `status='cancelled'` was issued under this folio
- **THEN** its entry appears in `sequence` with `status: 'cancelled'` and no gap is recorded for its number

#### Scenario: Folio not found
- **WHEN** the `:id` does not match any folio
- **THEN** the system returns HTTP 404 `{"error": "Folio not found"}`

#### Scenario: Unauthorized user
- **WHEN** user lacks `folios:read`
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "folios:read"}`

#### Scenario: Large folio truncated
- **WHEN** total issued documents exceed 10 000
- **THEN** `truncated: true`, `sequence: []`, `gaps: []`, summary fields still populated

### Requirement: Folio audit UI modal
The system SHALL render a `FolioAuditModal` accessible via an "Auditar" action in `FoliosTable`. The modal SHALL:

- Display `totalIssued`, `currentNumber`, a badge "Secuencia íntegra" (green) when `gaps.length === 0`, or "X huecos detectados" (red) when gaps exist.
- Render a table of the sequence with columns: Número, Tipo, Estado, Fecha, with client-side pagination of 50 rows per page.
- When `truncated: true`, hide the table and show an informational banner "La secuencia supera 10,000 documentos. Solo se muestra el resumen."
- Show a loading state while fetching.
- Be accessible only to users with `folios:read`.

#### Scenario: Modal opens with intact sequence
- **WHEN** user clicks "Auditar" on a folio
- **THEN** the modal opens, fetches `/api/v1/admin/folios/:id/audit`, and shows the green badge and sequence table

#### Scenario: Modal shows gaps
- **WHEN** the audit response contains `gaps: [3, 7]`
- **THEN** the modal shows a red badge "2 huecos detectados" and lists gap numbers

#### Scenario: Truncated response
- **WHEN** `truncated: true` in the response
- **THEN** the table is hidden and a banner is shown instead
