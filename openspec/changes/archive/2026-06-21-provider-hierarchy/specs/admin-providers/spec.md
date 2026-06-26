## ADDED Requirements

### Requirement: Provider soft-delete blocked by active departments
`DELETE /api/v1/admin/providers/:id` (soft delete) SHALL check whether the provider has any active departments (`departments WHERE provider_id = id AND is_active = true`). If count > 0, the system SHALL return HTTP 409 `{"error":"ProviderHasDepartments","departmentCount":N}`. If count = 0 (no departments or all inactive), the soft delete proceeds normally.

#### Scenario: Deactivate provider with active departments
- **WHEN** provider has 2 active departments
- **THEN** system returns HTTP 409 `{"error":"ProviderHasDepartments","departmentCount":2}`

#### Scenario: Deactivate provider with no departments
- **WHEN** provider has no departments
- **THEN** system returns HTTP 200 with `isActive: false`

#### Scenario: Deactivate provider with only inactive departments
- **WHEN** all provider's departments have `isActive: false`
- **THEN** system returns HTTP 200 with `isActive: false`
