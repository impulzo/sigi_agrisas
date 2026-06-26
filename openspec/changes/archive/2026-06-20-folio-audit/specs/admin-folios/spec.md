## ADDED Requirements

### Requirement: Folio audit action in table
The `FoliosTable` SHALL include an "Auditar" action button (icon: `policy` or `fact_check`) in the actions column for each folio row. Clicking it SHALL open `FolioAuditModal` passing the folio `id`. The button SHALL be visible to all users with `folios:read` (same permission already required to view the table).

#### Scenario: User with folios:read sees audit button
- **WHEN** an authenticated user with `folios:read` views the folios table
- **THEN** each row shows the "Auditar" action alongside existing actions

#### Scenario: Clicking audit opens modal
- **WHEN** user clicks the "Auditar" button on a folio row
- **THEN** `FolioAuditModal` opens with that folio's data loading
