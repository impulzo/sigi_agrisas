## ADDED Requirements

### Requirement: Return reason displayed in detail
The system SHALL render `Return.reason` in `ReturnMetaPanel` on the `/returns/[id]` detail page using `<p className="whitespace-pre-line">`. The label SHALL be "Motivo de devolución". The field SHALL always be visible (it is never null).

#### Scenario: Reason rendered with line breaks preserved
- **WHEN** a return has `reason: "Producto dañado.\nCliente rechazó el artículo."`
- **THEN** the detail page renders both lines separated visually (whitespace-pre-line)

#### Scenario: Reason always present
- **WHEN** any return detail is opened
- **THEN** the "Motivo de devolución" label and its content are always visible in ReturnMetaPanel

---

### Requirement: Return reason required in create form
The system SHALL enforce client-side that the `reason` field in `/sales/[id]/returns/new` and in `FullReturnModal` (HU-002) is non-empty and ≥ 3 chars before dispatching the request. The field SHALL show inline error "El motivo es obligatorio (mín. 3 caracteres)".

#### Scenario: Empty reason blocks submit
- **WHEN** the user clicks submit with an empty `reason`
- **THEN** the form shows the inline error and does not dispatch the API call

#### Scenario: Reason of 3 chars passes client validation
- **WHEN** the user enters exactly 3 chars in `reason`
- **THEN** no client-side error appears and the form can be submitted
