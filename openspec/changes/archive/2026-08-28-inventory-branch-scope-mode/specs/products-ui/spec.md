## ADDED Requirements

### Requirement: Branch scope mode notice in products catalog
The `/catalogs/products` screen SHALL display an informational notice, when the deployment's inventory scope mode (`inventory-api` — Configurable inventory scope mode) is `branch`, clarifying that a product created here is not yet sellable in any branch until it is assigned via `/inventory` (Assign product to branch modal). The catalog list itself SHALL remain unfiltered by branch — this is an informational notice only, not a behavior change to the admin catalog.

#### Scenario: Notice shown in branch mode
- **WHEN** the inventory scope mode is `branch` and a user with `products:read` opens `/catalogs/products`
- **THEN** the screen displays a notice explaining that products must be assigned per branch from Inventario

#### Scenario: No notice in general mode
- **WHEN** the inventory scope mode is `general`
- **THEN** the screen renders exactly as before this capability, with no additional notice

#### Scenario: Catalog list stays unfiltered regardless of mode
- **WHEN** the inventory scope mode is `branch`
- **THEN** `/catalogs/products` still lists the full catalog (active and, if requested, inactive products), unaffected by branch assignment — only the POS/Cotizaciones catalog is filtered (`products-api`)
