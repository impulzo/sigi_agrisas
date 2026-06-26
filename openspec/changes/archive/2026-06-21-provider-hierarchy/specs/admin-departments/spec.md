## ADDED Requirements

### Requirement: Create department requires providerId
`POST /api/v1/admin/departments` SHALL require `providerId: string (UUID)` in the request body. The referenced provider MUST exist and be active; otherwise the system returns HTTP 400 `{"error":"Provider not found or inactive"}`. The `providerId` SHALL be stored in `departments.provider_id`.

#### Scenario: Create department with valid provider
- **WHEN** body includes `providerId: "<uuid of active provider>"`
- **THEN** department is created with `provider_id` set; response includes `providerId` and `providerName`

#### Scenario: Create department with inactive provider
- **WHEN** body includes `providerId: "<uuid of inactive provider>"`
- **THEN** system returns HTTP 400 `{"error":"Provider not found or inactive"}`

#### Scenario: Create department without providerId
- **WHEN** body omits `providerId`
- **THEN** system returns HTTP 400 (validation error — field required for new departments)

### Requirement: Update department accepts providerId
`PATCH /api/v1/admin/departments/:id` SHALL accept `providerId: string (UUID) | null`. Setting `providerId` to a valid active provider reassigns the department. Setting to `null` disassociates it (allowed). Invalid or inactive provider → 400.

#### Scenario: Reassign department to different provider
- **WHEN** PATCH body is `{ "providerId": "<new provider uuid>" }`
- **THEN** `provider_id` is updated; response reflects new `providerId` and `providerName`

#### Scenario: Disassociate provider
- **WHEN** PATCH body is `{ "providerId": null }`
- **THEN** `provider_id` set to null; response has `providerId: null`, `providerName: null`

### Requirement: Filter departments by provider
`GET /api/v1/admin/departments` SHALL accept an optional query parameter `providerId: string (UUID)`. When provided, only departments with `provider_id = providerId` are returned. Combined with `includeInactive` and pagination.

#### Scenario: Filter by provider returns only that provider's departments
- **WHEN** request includes `?providerId=<uuid>`
- **THEN** response contains only departments with matching `provider_id`

#### Scenario: No departments for provider returns empty list
- **WHEN** the provider has no departments
- **THEN** response is `{ items: [], total: 0, page: 1, pageSize: 20 }`
