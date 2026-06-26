## ADDED Requirements

### Requirement: Return reason immutability (V1)
The system SHALL NOT expose any endpoint that allows modifying `Return.reason` after creation. There is no `PATCH /returns/:id` endpoint. Any future endpoint to edit the reason (for Admin role) is explicitly out of scope for V1 and requires a separate change with a new `returns:admin_edit` permission.

#### Scenario: No PATCH endpoint exists
- **WHEN** a client sends `PATCH /api/v1/admin/returns/:id`
- **THEN** the system returns HTTP 405 Method Not Allowed (or 404 if unrouted)

#### Scenario: reason persisted verbatim
- **WHEN** `POST /returns` is called with `reason: "Cliente cambió de opinión tras revisar el producto"`
- **THEN** `GET /returns/:id` returns `reason: "Cliente cambió de opinión tras revisar el producto"` unchanged

---

### Requirement: Return reason validation formalized
The system SHALL enforce `reason` as required on `POST /returns` and `POST /sales/:id/full-return`: empty string, whitespace-only, or missing field → HTTP 400 `{"error": "ReturnReasonRequired"}`. Length SHALL be between 3 and 500 chars; violations → HTTP 400.

#### Scenario: Missing reason
- **WHEN** the body omits `reason`
- **THEN** the system returns HTTP 400 `{"error": "ReturnReasonRequired"}`

#### Scenario: Whitespace-only reason
- **WHEN** the body includes `reason: "   "`
- **THEN** the system returns HTTP 400 `{"error": "ReturnReasonRequired"}`

#### Scenario: Reason at max length
- **WHEN** the body includes `reason` of exactly 500 characters
- **THEN** the system accepts the request (HTTP 201)

#### Scenario: Reason exceeds max length
- **WHEN** the body includes `reason` of 501 characters
- **THEN** the system returns HTTP 400
