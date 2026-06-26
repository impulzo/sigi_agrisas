## ADDED Requirements

### Requirement: Quantity validation (formalized)
The system SHALL reject `POST /api/v1/admin/returns` requests where any item has `quantity <= 0` with HTTP 400. The system SHALL reject requests where any item's `quantity` exceeds `ReturnableQuantityCalculator.computeRemaining(soldQty, priorItems)` with HTTP 422 `{"error": "ReturnQuantityExceedsRemaining", "saleItemId": "<id>", "remaining": <n>}`. Requests with an empty `items` array SHALL return HTTP 400 `{"error": "ReturnItemsEmpty"}`.

#### Scenario: Zero quantity rejected
- **WHEN** the body includes `{ items: [{ saleItemId: "x", quantity: 0 }] }`
- **THEN** the system returns HTTP 400

#### Scenario: Negative quantity rejected
- **WHEN** the body includes `{ items: [{ saleItemId: "x", quantity: -1 }] }`
- **THEN** the system returns HTTP 400

#### Scenario: Quantity exceeds remaining
- **WHEN** the body requests returning 5 units of a line where only 3 remain
- **THEN** the system returns HTTP 422 `{"error": "ReturnQuantityExceedsRemaining", "saleItemId": "<id>", "remaining": 3}`

#### Scenario: Empty items array rejected
- **WHEN** the body includes `{ items: [] }`
- **THEN** the system returns HTTP 400 `{"error": "ReturnItemsEmpty"}`
