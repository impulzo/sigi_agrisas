## ADDED Requirements

### Requirement: Folio scope must be POS for quotes

`CreateQuoteUseCase` y `ConvertQuoteToSaleUseCase` SHALL validar, después de cargar el `Folio` desde el `folioId` recibido, que `folio.scope === 'POS'`. Si el scope no coincide, el use case SHALL lanzar `FolioScopeMismatchError(expected='POS', actual=<folio.scope>)` que el controller mapea a HTTP 400 `{"error":"FolioScopeMismatch","expected":"POS","actual":"<scope>"}`. La validación SHALL ocurrir en el mismo paso que `folio.isActive`, antes de cualquier asignación de folio. `UpdateQuoteUseCase` no admite cambios de `folioId` (folio inmutable tras creación), por lo que NO requiere chequeo adicional: el folio original ya fue validado contra `scope='POS'` en la creación.

#### Scenario: Crear cotización con folio COT (POS)

- **WHEN** un usuario con `quotes:create` envía `POST /api/v1/admin/quotes` con `folioId` apuntando al folio `COT` (`scope='POS'`)
- **THEN** el sistema procede con la creación normal y retorna HTTP 201

#### Scenario: Crear cotización con folio OPERATIONS rechazada

- **WHEN** la request usa `folioId` apuntando a un folio cuyo `scope='OPERATIONS'` (e.g. `RB`)
- **THEN** el sistema retorna HTTP 400 `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}` SIN incrementar `current_number`

#### Scenario: Convertir cotización con folio fiscal scope mismatch rechazada

- **WHEN** un usuario con `quotes:convert` envía `POST /api/v1/admin/quotes/:id/convert` con `folioId` apuntando a un folio cuyo `scope='OPERATIONS'`
- **THEN** el sistema retorna HTTP 400 `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}` y NO crea la venta ni incrementa `current_number`
