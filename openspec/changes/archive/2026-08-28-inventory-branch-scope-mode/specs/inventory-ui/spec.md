## ADDED Requirements

### Requirement: Inventory scope mode indicator
The `/inventory` screen SHALL indicate when the deployment's inventory scope mode (`inventory-api` — Configurable inventory scope mode) is `branch`, so operators understand why the POS catalog for their branch may be shorter than the full product catalog. The indicator SHALL be sourced from a dedicated read endpoint (not inferred client-side) and cached briefly to avoid a request on every render.

#### Scenario: Badge shown in branch mode
- **WHEN** the inventory scope mode is `branch` and a user with `inventory:read` opens `/inventory`
- **THEN** the screen displays a badge or notice indicating "Inventario por sucursal" (or equivalent), distinct from the branch selector already present

#### Scenario: No indicator in general mode
- **WHEN** the inventory scope mode is `general`
- **THEN** the screen renders exactly as before this capability, with no additional indicator
