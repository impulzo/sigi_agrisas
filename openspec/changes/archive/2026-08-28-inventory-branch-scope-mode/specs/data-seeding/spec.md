## ADDED Requirements

### Requirement: Assignment coverage precondition for branch scope mode
Before an operator sets `INVENTORY_SCOPE_MODE=branch` (`inventory-api` — Configurable inventory scope mode) on an environment with existing data, every active product intended to be sellable SHALL have at least one `branch_inventory` row (in any branch) — otherwise it becomes invisible to every branch's POS catalog. The multi-store seeder (Requirement: Upsert de sucursales e inventario multi-sucursal) already satisfies this precondition for seeded data, since it upserts a `branch_inventory` row (`quantity = 0` where not explicitly stocked) for every product it assigns to a branch. This requirement documents that guarantee explicitly as a precondition for enabling branch scope mode, and is informational — it does not add new seeding behavior.

#### Scenario: Seeded catalog satisfies the precondition
- **WHEN** the multi-store seeder has run and `INVENTORY_SCOPE_MODE=branch` is then enabled
- **THEN** every product the seeder assigned to a branch (including those seeded with `quantity = 0`) remains visible in that branch's POS catalog

#### Scenario: A product with no branch assignment becomes invisible
- **WHEN** an active product exists with no `branch_inventory` row in any branch (e.g. created directly via `/catalogs/products` and never assigned), and `INVENTORY_SCOPE_MODE=branch` is enabled
- **THEN** the product does not appear in any branch's POS catalog until an administrator assigns it via `/inventory`, a purchase, or a waybill
