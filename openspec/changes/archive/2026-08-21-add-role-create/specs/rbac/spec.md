## ADDED Requirements

### Requirement: Create role

The system SHALL allow creating a new role via `POST /api/v1/admin/roles`, gated by `requirePermission(req, "roles:write")`. The request body SHALL be validated with Zod: `name` (string, `^[a-z][a-z0-9_]{1,31}$`, required) and `description` (string, optional). The use case (`CreateRoleUseCase`) SHALL reject a `name` that already exists (case-sensitive match against `roles.name`, which is `@unique`) and SHALL NOT grant any permission to the newly created role — it starts with zero `role_permissions` rows, to be configured afterwards via the existing `GrantPermissionToRoleUseCase`.

#### Scenario: Successful role creation

- **WHEN** `POST /api/v1/admin/roles` is called with `{ "name": "supervisor_almacen", "description": "Supervisor de almacén" }` by a caller with `roles:write`
- **THEN** the response is HTTP 201, a row is inserted in `roles` with that `name`/`description`, and the role has zero rows in `role_permissions`

#### Scenario: Invalid role name returns 400

- **WHEN** `POST /api/v1/admin/roles` is called with `{ "name": "Supervisor Almacen" }` (uppercase/spaces, invalid per `RoleName`)
- **THEN** the response is HTTP 400 with a Zod field error on `name`

#### Scenario: Duplicate role name returns 409

- **WHEN** `POST /api/v1/admin/roles` is called with a `name` that already exists in `roles`
- **THEN** the response is HTTP 409 and no new row is inserted

#### Scenario: Forbidden without roles:write

- **WHEN** `POST /api/v1/admin/roles` is called by a caller who lacks `roles:write`
- **THEN** the response is HTTP 403 with `{ "error": "Forbidden", "required": "roles:write" }`

#### Scenario: Empty body returns 400

- **WHEN** `POST /api/v1/admin/roles` is called with an empty body or without `name`
- **THEN** the response is HTTP 400 with a Zod field error
</content>
