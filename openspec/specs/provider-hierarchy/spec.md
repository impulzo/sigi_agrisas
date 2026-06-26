# Spec: provider-hierarchy

## Purpose

Define the schema and DTO changes that introduce the provider–department relationship: a nullable `provider_id` FK on `departments`, the migration strategy, and the enriched `DepartmentDto` with `providerId`/`providerName` fields.

---

## Requirements

### Requirement: Department belongs to provider (schema)
The system SHALL add a nullable column `provider_id TEXT` in the `departments` table, with a foreign key referencing `providers.id` ON DELETE RESTRICT. An index SHALL be created on `departments(provider_id)`. Existing rows will have `provider_id = NULL` after migration.

#### Scenario: Migration runs without error on existing data
- **WHEN** the migration `add_provider_id_to_departments` is applied to a database with existing departments
- **THEN** migration completes successfully; existing departments have `provider_id = NULL`

#### Scenario: Delete provider with active departments is blocked
- **WHEN** a provider has at least one department with `is_active = true`
- **THEN** soft-deactivating the provider via `DELETE /api/v1/admin/providers/:id` returns HTTP 409 `{"error":"ProviderHasDepartments","departmentCount":N}`

#### Scenario: Delete provider with no active departments succeeds
- **WHEN** all departments of a provider are inactive or it has none
- **THEN** soft-deactivating the provider returns HTTP 200

---

### Requirement: DepartmentDto includes provider fields
The `DepartmentDto` SHALL include `providerId: string | null` and `providerName: string | null`. These fields are populated via a join with the `providers` table. When `provider_id` is NULL, both fields are `null`.

#### Scenario: List departments returns providerName
- **WHEN** authenticated user calls `GET /api/v1/admin/departments`
- **THEN** each `DepartmentDto` includes `providerId` and `providerName` (joined from providers)

#### Scenario: Department without provider returns nulls
- **WHEN** a department has no associated provider
- **THEN** `providerId: null` and `providerName: null` in the DTO
