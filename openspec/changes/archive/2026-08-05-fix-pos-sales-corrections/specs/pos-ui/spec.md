## ADDED Requirements

### Requirement: "Editar venta" button hidden from sale detail UI
`app/(private)/sales/_blocks/SaleDetailPage.tsx` SHALL NOT render the "Editar venta" link/button in the sale detail header, regardless of the existing `canEdit` guard (`sales:edit_completed` permission + headquarters check) evaluating `true`. This is a UI-only restriction implemented via a module-level feature flag (e.g. `SALE_EDIT_UI_ENABLED = false`) that gates the JSX block in addition to the pre-existing `canEdit` check — the guard computation itself (`canEditCompleted`, `isBypass`, `isInHq`, `canEdit`) SHALL remain unchanged and unused for rendering while the flag is `false`. The route `/sales/:id/edit`, its page component (`EditSalePage`), the mutation service, and the backend `PATCH /api/v1/admin/sales/:id` endpoint (requiring `sales:edit_completed`, see `pos-api` "Edit completed sale (headquarters only)") are NOT modified by this requirement and remain fully functional when accessed directly.

#### Scenario: Edit button not shown even when guard passes
- **WHEN** a user with `sales:edit_completed` and headquarters access (or `branches:access_all`) opens the detail of a `completed` sale
- **THEN** the "Editar venta" button/link is NOT rendered anywhere in the page

#### Scenario: Direct navigation to edit route still works
- **WHEN** the same user navigates directly to `/sales/:id/edit` by URL
- **THEN** the edit page loads and functions normally (the underlying feature is not disabled, only its UI entry point)

### Requirement: Product catalog table shows branch stock
`app/(private)/pos/_blocks/ProductCatalogTable.tsx` SHALL render an additional "Existencias" column showing each product's stock (`ProductDto.stock`, sourced from `GET /api/v1/admin/products?branchId=<selected>`, see `products-api` "List products"). The column SHALL render the numeric value when `stock` is a number, and an em dash (`—`) when `stock` is `null` (no branch selected, or no inventory record for that product/branch pair). When `stock` is a number `<= 0`, the cell SHALL be visually highlighted (e.g. error color) to warn the cashier before adding the product to the cart.

#### Scenario: Product with positive stock
- **WHEN** the selected branch has `branch_inventory.quantity = 12` for a listed product
- **THEN** the "Existencias" column shows `12` in default styling

#### Scenario: Product with zero or negative stock highlighted
- **WHEN** the selected branch has `branch_inventory.quantity <= 0` for a listed product
- **THEN** the "Existencias" column shows the value highlighted in an error/warning style

#### Scenario: No branch selected (admin bypass)
- **WHEN** an admin has not selected a branch (bypass mode) and the catalog loads without a `branchId`
- **THEN** every row's "Existencias" column shows `—` and the catalog still loads and functions normally

#### Scenario: Product without inventory record for the branch
- **WHEN** a branch is selected but the product has no `branch_inventory` row for that branch
- **THEN** the "Existencias" column shows `—`

### Requirement: Credit limit exceeded warning toast
When the POS completes a credit sale (or a quote conversion to a credit sale) whose response includes `creditLimitExceeded: true` (see `pos-api` "Create sale (atomic emission)" and `quotes-api` "Convert quote to sale"), the UI SHALL display an additional toast/notification informing the cashier that the customer's credit limit was exceeded, alongside the normal success toast. The sale/conversion SHALL complete normally regardless of this flag — the toast is purely informational and does NOT block or roll back the transaction. When `creditLimitExceeded` is `false` (including all cash sales and credit sales within limit or without a configured credit line), no additional toast is shown.

#### Scenario: Credit sale exceeding limit shows warning toast
- **WHEN** the cashier completes a credit sale and the backend responds HTTP 201 with `creditLimitExceeded: true`
- **THEN** the sale completes (success toast/redirect as usual) AND an additional toast is shown warning that the customer's credit limit was exceeded

#### Scenario: Credit sale within limit shows no warning
- **WHEN** the cashier completes a credit sale and the backend responds with `creditLimitExceeded: false`
- **THEN** only the normal success feedback is shown, with no credit warning toast

#### Scenario: Customer without credit line shows no warning
- **WHEN** the cashier completes a credit sale for a customer with no `creditLimit` configured and the backend responds with `creditLimitExceeded: false`
- **THEN** the sale completes normally with no credit warning toast

#### Scenario: Quote conversion to credit sale exceeding limit shows warning toast
- **WHEN** a quote is converted to a credit sale and the backend responds HTTP 200 with `creditLimitExceeded: true`
- **THEN** the conversion completes (redirect to the resulting sale as usual) AND the same credit warning toast is shown
