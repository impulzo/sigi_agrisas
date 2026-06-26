## ADDED Requirements

### Requirement: ProductDto includes providerName
The `ProductDto` (list and detail) SHALL include `providerName: string | null` derived from the join `products → departments → providers`. When the department has no provider, `providerName` is `null`. The list response SHALL also include `providerId: string | null` as a flat field.

#### Scenario: List products includes providerName
- **WHEN** GET /api/v1/admin/products returns items
- **THEN** each item includes `providerName: string | null` and `providerId: string | null`

#### Scenario: Detail includes providerName
- **WHEN** GET /api/v1/admin/products/:id is called
- **THEN** response includes `providerName` from the department's provider

### Requirement: Filter products by provider
`GET /api/v1/admin/products` SHALL accept an optional query parameter `providerId: string (UUID)`. When provided, only products whose department has `provider_id = providerId` are returned. Combined with existing filters (`departmentId`, `search`, pagination).

#### Scenario: Filter by provider
- **WHEN** request includes `?providerId=<uuid>`
- **THEN** response contains only products whose department belongs to that provider

#### Scenario: Combined filter providerId + departmentId
- **WHEN** request includes both `?providerId=<uuid>&departmentId=<uuid>`
- **THEN** both filters are applied (AND condition); if the department doesn't belong to that provider, result is empty
