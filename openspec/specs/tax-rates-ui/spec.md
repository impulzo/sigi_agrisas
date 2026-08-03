# Spec: tax-rates-ui

## Purpose

Interfaz de administración del catálogo de tasas de impuesto: listado, alta/edición, desactivación protegida, y tarjeta de acceso desde el hub de catálogos.

---

## Requirements

### Requirement: Tax rates catalog page
The system SHALL expose a route `/catalogs/tax-rates` that renders a `TaxRatesPage` with a `TaxRatesTable` and `TaxRateEditModal`. Requires `tax_rates:read` to view; write actions require `tax_rates:write`. The page follows the same layout pattern as other catalog pages (CatalogShell, CatalogToolbar, CatalogPagination).

The toolbar SHALL include:
- Client-side search over the current page (same pattern as payment-methods and folios).
- Toggle "Incluir inactivos".
- "+ Nueva tasa" button (gated on `tax_rates:write`).

The table SHALL show columns: Código, Nombre, Clave SAT, Tipo Factor, Valor, Tasa (%), Estado, Creación, Acciones. "Tasa (%)" displays `(rate * 100).toFixed(4) + "%"` (e.g., `16.0000%`). Actions: Editar, Desactivar (gated on `tax_rates:write`). Desactivar shows `ConfirmDialog`; on 409 shows inline error "La tasa está asociada a N productos activos. Desasócialos antes de desactivarla."

#### Scenario: Admin views tax rates
- **WHEN** user with `tax_rates:read` navigates to `/catalogs/tax-rates`
- **THEN** page renders with list of active tax rates, showing Clave SAT, Tipo Factor and Valor columns alongside the formatted percentage column

#### Scenario: Write-only gating
- **WHEN** user has `tax_rates:read` but not `tax_rates:write`
- **THEN** "+ Nueva tasa" button and edit/deactivate actions are hidden

#### Scenario: Deactivate with products
- **WHEN** user confirms deactivation and backend returns 409 `TaxRateInUse`
- **THEN** modal closes, inline error shown below the table row

---

### Requirement: Tax rate create/edit modal
`TaxRateEditModal` with `mode: "create" | "edit"`. Fields: Código (disabled in edit), Nombre, Descripción (optional), Clave SAT (text, 3 digits), Tipo Factor (select: Tasa | Cuota | Exento), Valor (numeric, display value), Tasa/Cuota % (numeric, 0–100 for `Tasa`; stored as decimal 0–1+ dividing by 100), Cuenta Trasladado / Cuenta x Trasladar / Cuenta Acreditado / Cuenta x Acreditar (optional text, max 20 chars). On edit, submit only if diff not empty. 409 → inline error on Código field. Client-side Zod validation mirrors backend: `satTaxCode` regex `^\d{3}$`, `factorType` enum.

#### Scenario: Create new tax rate
- **WHEN** user fills form (including Clave SAT, Tipo Factor, Valor) and submits
- **THEN** POST to `/api/v1/admin/tax-rates` with the SAT fields, table refreshes, modal closes

#### Scenario: Edit existing tax rate
- **WHEN** user edits Clave SAT and Tipo Factor and submits
- **THEN** PATCH sent with diff only (Código excluded); table refreshes

#### Scenario: Invalid SAT tax code in form
- **WHEN** user types a Clave SAT that is not 3 digits and blurs the field
- **THEN** inline validation error shown before submit is possible

#### Scenario: Duplicate code on create
- **WHEN** backend returns 409
- **THEN** inline error "Este código ya está en uso." shown on Código field

#### Scenario: Optional accounting accounts left empty
- **WHEN** user leaves the 4 cuenta contable fields empty and submits
- **THEN** request sends them as `null`, form does not block submit

---

### Requirement: Tax rates card in catalogs hub
The catalogs hub page (`CatalogsHubPage`) SHALL include a card for "Tasas de impuesto" that navigates to `/catalogs/tax-rates`. Requires `tax_rates:read` to be visible (same gating pattern as other hub cards).

#### Scenario: Hub shows tax rates card
- **WHEN** user with `tax_rates:read` views `/catalogs`
- **THEN** "Tasas de impuesto" card appears in the hub grid
