## ADDED Requirements

### Requirement: Tax rate selector in product form
`ProductGeneralTab` (and `ProductEditModal`) SHALL include a `TaxRateCombobox` field labeled "Tasa de impuesto" (optional). The combobox fetches active tax rates from `GET /api/v1/admin/tax-rates` (using a new `useTaxRatesOptions` hook, analogous to `usePaymentMethodsOptions`). Display format: `"IVA_16 — IVA 16% (16.00%)"`. Clearing the field sends `taxRateId: null` on submit.

#### Scenario: Product form shows tax rate selector
- **WHEN** user opens create or edit product modal
- **THEN** "Tasa de impuesto" combobox appears with active tax rates as options

#### Scenario: Select and save tax rate
- **WHEN** user selects "IVA_16 — IVA 16% (16.00%)" and saves
- **THEN** `taxRateId` is included in the POST/PATCH body

#### Scenario: Clear tax rate
- **WHEN** user clears the combobox and saves
- **THEN** `taxRateId: null` is sent in the PATCH body

### Requirement: Tax rate column in products table
`ProductsTable` SHALL include a "Tasa" column that displays `taxRateCode` (e.g., `IVA_16`) or "—" if null. Column positioned after "Departamento".

#### Scenario: Products table shows tax rate
- **WHEN** a product has `taxRateCode: "IVA_16"`
- **THEN** the "Tasa" column shows "IVA_16"

#### Scenario: Products table shows dash for no rate
- **WHEN** a product has `taxRateCode: null`
- **THEN** the "Tasa" column shows "—"
