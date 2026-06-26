## ADDED Requirements

### Requirement: Folio scope must be POS for sales

`CreateSaleUseCase` SHALL validar, después de cargar el `Folio` desde el `folioId` recibido, que `folio.scope === 'POS'`. Si el scope no coincide, el use case SHALL lanzar `FolioScopeMismatchError(expected='POS', actual=<folio.scope>)` que el controller mapea a HTTP 400 `{"error":"FolioScopeMismatch","expected":"POS","actual":"<scope>"}`. La validación SHALL ocurrir en el mismo paso que `folio.isActive`, antes de cualquier mutación de inventario o asignación de folio. `EditCompletedSaleUseCase` no admite cambios de `folioId` (folio inmutable en edit), por lo que NO requiere chequeo adicional: el folio original ya fue validado contra `scope='POS'` en la creación.

#### Scenario: Crear venta con folio POS válido

- **WHEN** un usuario con `sales:create` envía `POST /api/v1/admin/sales` con `folioId` apuntando a un folio cuyo `scope='POS'` (e.g. `TK`, `TC`)
- **THEN** el sistema procede con la emisión normal y retorna HTTP 201

#### Scenario: Crear venta con folio OPERATIONS rechazada

- **WHEN** la request usa `folioId` apuntando a un folio cuyo `scope='OPERATIONS'` (e.g. `RB`)
- **THEN** el sistema retorna HTTP 400 `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}` SIN tocar inventario ni `current_number` del folio

#### Scenario: Crear venta con folio INVENTORY rechazada

- **WHEN** la request usa `folioId` apuntando a un folio cuyo `scope='INVENTORY'` (e.g. `TS`)
- **THEN** el sistema retorna HTTP 400 `{"error":"FolioScopeMismatch","expected":"POS","actual":"INVENTORY"}`

#### Scenario: Scope check ocurre antes de allocate folio

- **WHEN** la request usa un folio con scope incorrecto pero `is_active=true` y `current_number=42`
- **THEN** tras el 400, `current_number` sigue en 42 (no se incrementa por el intento fallido)
