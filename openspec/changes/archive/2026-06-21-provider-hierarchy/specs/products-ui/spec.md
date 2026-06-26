## ADDED Requirements

### Requirement: Provider column in products table
`ProductsTable` SHALL include a "Proveedor" column displaying `providerName` or "—" if null. Column positioned after "Departamento".

#### Scenario: Products table shows provider name
- **WHEN** a product's department belongs to a provider
- **THEN** "Proveedor" column shows the provider name

#### Scenario: Products table shows dash for no provider
- **WHEN** `providerName` is null
- **THEN** "Proveedor" column shows "—"

### Requirement: Provider filter in products page
`ProductsPage` toolbar SHALL include a "Proveedor" Combobox filter. Selecting a provider populates the "Departamento" filter with departments belonging to that provider (fetched via `GET /departments?providerId=<uuid>&pageSize=100`). Changing the provider filter clears the departmentId filter. Clearing the provider filter restores all departments.

#### Scenario: Select provider filters departments combobox
- **WHEN** user selects a provider in the toolbar
- **THEN** the department combobox updates to show only that provider's departments; previous department filter is cleared

#### Scenario: Clear provider restores all departments
- **WHEN** user clears the provider combobox
- **THEN** department combobox reloads with all active departments

### Requirement: Provider field derived in product form
`ProductGeneralTab` (and `ProductEditModal`) SHALL show a read-only "Proveedor" field that auto-populates when a department is selected (derived from `department.providerName`). The field is display-only and is not sent in the POST/PATCH body.

#### Scenario: Department selected shows provider
- **WHEN** user selects a department with an associated provider
- **THEN** the "Proveedor" read-only field shows the provider's name

#### Scenario: Department with no provider shows empty
- **WHEN** selected department has `providerId: null`
- **THEN** "Proveedor" field shows "Sin proveedor"

### Requirement: Provider field in department form
`DepartmentEditModal` SHALL include a "Proveedor" Combobox (required for new departments). The combobox fetches active providers (using an existing `useProvidersOptions` hook or equivalent). On edit, shows the current provider and allows changing. Existing departments with `providerId: null` show "Sin proveedor" and prompt the user to assign one.

#### Scenario: Create department requires provider
- **WHEN** user submits create form without selecting a provider
- **THEN** inline validation error "El proveedor es obligatorio"

#### Scenario: Edit department shows current provider
- **WHEN** user opens edit modal for a department with a provider
- **THEN** combobox is pre-selected with the current provider

#### Scenario: Department table shows provider column
- **WHEN** user views the departments table
- **THEN** a "Proveedor" column shows `providerName` or "—"
