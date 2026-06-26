## ADDED Requirements

### Requirement: Tax rates catalog page
The system SHALL expose a route `/catalogs/tax-rates` that renders a `TaxRatesPage` with a `TaxRatesTable` and `TaxRateEditModal`. Requires `tax_rates:read` to view; write actions require `tax_rates:write`. The page follows the same layout pattern as other catalog pages (CatalogShell, CatalogToolbar, CatalogPagination).

The toolbar SHALL include:
- Client-side search over the current page (same pattern as payment-methods and folios).
- Toggle "Incluir inactivos".
- "+ Nueva tasa" button (gated on `tax_rates:write`).

The table SHALL show columns: Código, Nombre, Tasa (%), Estado, Creación, Acciones. "Tasa (%)" displays `(rate * 100).toFixed(2) + "%"` (e.g., `16.00%`). Actions: Editar, Desactivar (gated on `tax_rates:write`). Desactivar shows `ConfirmDialog`; on 409 shows inline error "La tasa está asociada a N productos activos. Desasócialos antes de desactivarla."

#### Scenario: Admin views tax rates
- **WHEN** user with `tax_rates:read` navigates to `/catalogs/tax-rates`
- **THEN** page renders with list of active tax rates and formatted percentage column

#### Scenario: Write-only gating
- **WHEN** user has `tax_rates:read` but not `tax_rates:write`
- **THEN** "+ Nueva tasa" button and edit/deactivate actions are hidden

#### Scenario: Deactivate with products
- **WHEN** user confirms deactivation and backend returns 409 `TaxRateInUse`
- **THEN** modal closes, inline error shown below the table row

### Requirement: Tax rate create/edit modal
`TaxRateEditModal` with `mode: "create" | "edit"`. Fields: Código (disabled in edit), Nombre, Descripción (optional), Tasa % (numeric, 0–100; stored as decimal 0–1 dividing by 100). On edit, submit only if diff not empty. 409 → inline error on Código field.

#### Scenario: Create new tax rate
- **WHEN** user fills form and submits
- **THEN** POST to `/api/v1/admin/tax-rates`, table refreshes, modal closes

#### Scenario: Edit existing tax rate
- **WHEN** user edits name and submits
- **THEN** PATCH sent with diff only; table refreshes

#### Scenario: Duplicate code on create
- **WHEN** backend returns 409
- **THEN** inline error "Código ya en uso" shown on Código field

### Requirement: Tax rates card in catalogs hub
The catalogs hub page (`CatalogsHubPage`) SHALL include a card for "Tasas de impuesto" that navigates to `/catalogs/tax-rates`. Requires `tax_rates:read` to be visible (same gating pattern as other hub cards).

#### Scenario: Hub shows tax rates card
- **WHEN** user with `tax_rates:read` views `/catalogs`
- **THEN** "Tasas de impuesto" card appears in the hub grid
