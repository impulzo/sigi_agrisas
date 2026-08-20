## ADDED Requirements

### Requirement: CustomerFilterCombobox exposes an explicit "all customers" option

The shared `CustomerFilterCombobox` component (used by the sales-by-product report's Por Cliente view and by the collections Por Cliente view) SHALL prepend a fixed option `{ value: "", label: "Todos los clientes" }` to its options list whenever there is no active text search (`query === ""`). Consumers that already initialize their `customerId` filter state as `""` SHALL therefore display "Todos los clientes" as the selected value by default, without any change to the consumer's own state initialization. Selecting this option SHALL behave identically to leaving the filter empty — the backend's existing optional `customerId` contract is unchanged.

#### Scenario: Combobox opened with no search shows "Todos los clientes" first
- **WHEN** the customer filter combobox is opened in `/reports/sales-by-product` (Por Cliente) or `/reports/collections` (Por Cliente) without typing a search query
- **THEN** the first option listed is "Todos los clientes" with `value=""`

#### Scenario: Default state renders the option as selected
- **WHEN** the report page mounts with `customerId=""` (the existing default in both consumers)
- **THEN** the combobox displays "Todos los clientes" as its current value, not an empty/unlabeled field

#### Scenario: Selecting "Todos los clientes" behaves like the empty filter
- **WHEN** the user explicitly selects "Todos los clientes" and applies the report filters
- **THEN** the report request omits `customerId` (or sends it empty), returning data for all customers — identical to today's behavior when the field was left blank

#### Scenario: Active text search does not mix in the sentinel option
- **WHEN** the user types a search query (one or more characters) into the customer filter combobox
- **THEN** the results shown are exclusively the matches returned by the customer search — "Todos los clientes" does not appear interleaved among search results
