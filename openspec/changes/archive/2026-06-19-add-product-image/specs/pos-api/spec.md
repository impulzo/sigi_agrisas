## ADDED Requirements

### Requirement: POS product catalog does NOT expose product imageUrl
The POS lookup endpoint(s) used to populate the POS product catalog (e.g., `searchProducts` consumed by `PosLookupService`) SHALL NOT expose the `imageUrl` field of products. The DTO returned to the POS frontend MUST NOT include `imageUrl`. The `SaleItem` snapshot (`product_code_snapshot`, `product_name_snapshot`, `price_name_snapshot`, etc.) MUST NOT store any image reference. This preserves payload size and rendering latency on the POS catalog.

#### Scenario: searchProducts response excludes imageUrl
- **WHEN** the POS frontend invokes the product search endpoint
- **THEN** each item in the response MUST NOT contain an `imageUrl` field

#### Scenario: SaleItem snapshot excludes image
- **WHEN** a sale is created
- **THEN** the persisted `sale_items` rows MUST NOT contain any image-related column

#### Scenario: Quote and Return snapshots also exclude image
- **WHEN** a quote item or return item is created
- **THEN** the persisted snapshot MUST NOT contain any image-related column
