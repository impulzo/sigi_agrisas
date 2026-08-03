## ADDED Requirements

### Requirement: Product taxRateId field
The `ProductDto` SHALL include `taxRateId: string | null` and, in the detail endpoint (`GET /products/:id`), an embedded `taxRate: { id, code, name, rate } | null`. The list endpoint SHALL include `taxRateId` and `taxRateCode: string | null` as flat fields (no full object, to avoid N+1).

`POST /admin/products` and `PATCH /admin/products/:id` SHALL accept `taxRateId: string (UUID) | null`. If `taxRateId` is provided and non-null, the referenced tax rate MUST exist and be active; otherwise 400 `{"error":"Tax rate not found or inactive"}`. Setting `taxRateId: null` disassociates the product from any tax rate.

#### Scenario: Create product with tax rate
- **WHEN** POST body includes `taxRateId: "<uuid of IVA_16>"`
- **THEN** product is created with `taxRateId` set and detail response includes `taxRate: { id, code: "IVA_16", name: "IVA 16%", rate: 0.16 }`

#### Scenario: Create product with invalid taxRateId
- **WHEN** POST body includes `taxRateId: "<non-existent uuid>"`
- **THEN** system returns HTTP 400 `{"error":"Tax rate not found or inactive"}`

#### Scenario: PATCH to remove tax rate
- **WHEN** PATCH body is `{ "taxRateId": null }`
- **THEN** product's `taxRateId` is set to null; detail response has `taxRate: null`

#### Scenario: List products includes taxRateId and taxRateCode
- **WHEN** GET /admin/products returns list
- **THEN** each item includes `taxRateId: string | null` and `taxRateCode: string | null`
