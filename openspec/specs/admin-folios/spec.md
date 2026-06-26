# Spec: admin-folios

## Purpose

Define the administrative CRUD endpoints for the folios catalog: list, get, create, update, and soft-delete operations under `/api/v1/admin/folios`.

---

## Requirements

### Requirement: List folios
The system SHALL expose `GET /api/v1/admin/folios` that returns a paginated list of folios. The endpoint requires the `folios:read` permission. Query parameters `page` (default 1), `pageSize` (default 20, max 100) and `includeInactive` (default `false`) control the result set. By default the system SHALL return only folios with `isActive = true`. The response SHALL be `{ items: FolioDto[], total: number, page: number, pageSize: number }`. Each `FolioDto` includes `id`, `code`, `name`, `prefix` (string or `null`), `currentNumber` (number ≥ 0), `isActive`, `createdAt`, `updatedAt`.

#### Scenario: Admin lists active folios
- **WHEN** an authenticated user with `folios:read` sends `GET /api/v1/admin/folios`
- **THEN** the system returns HTTP 200 with active folios only

#### Scenario: Admin lists including inactive folios
- **WHEN** the request includes `?includeInactive=true`
- **THEN** the response includes inactive folios as well

#### Scenario: pageSize exceeds max
- **WHEN** the request includes `?pageSize=200`
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Unauthorized user
- **WHEN** an authenticated user without `folios:read` calls the endpoint
- **THEN** the system returns HTTP 403 `{"error": "Forbidden", "required": "folios:read"}`

---

### Requirement: Get folio detail
The system SHALL expose `GET /api/v1/admin/folios/:id` that returns a single folio by UUID. Requires `folios:read`. Returns the entity regardless of `isActive`. Returns HTTP 404 if not found.

#### Scenario: Admin gets folio
- **WHEN** the request targets a valid UUID
- **THEN** the system returns HTTP 200 with the `FolioDto`

#### Scenario: Folio not found
- **WHEN** the `:id` does not match any folio
- **THEN** the system returns HTTP 404 `{"error": "Folio not found"}`

#### Scenario: Invalid UUID format
- **WHEN** the `:id` is not a valid UUID
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Create folio
The system SHALL expose `POST /api/v1/admin/folios` to create a new folio. Requires `folios:write`. The body SHALL include `code: string` matching `^[A-Z0-9_]{1,32}$` and `name: string` (1–100 chars). Optional: `prefix: string | null` matching `^[A-Z0-9-]{1,8}$` when not null, `currentNumber: integer ≥ 0` (default `0`), `isActive: boolean` (default `true`). Returns HTTP 201 with the new `FolioDto`. Duplicate `code` returns HTTP 409.

#### Scenario: Successful creation with minimal body
- **WHEN** the body is `{ "code": "FAC_A", "name": "Facturas Serie A" }`
- **THEN** the system returns HTTP 201 with `prefix: null`, `currentNumber: 0`, `isActive: true`

#### Scenario: Creation with prefix and starting number
- **WHEN** the body is `{ "code": "REC_1", "name": "Recibos", "prefix": "REC-", "currentNumber": 1000 }`
- **THEN** the system returns HTTP 201 with the provided values

#### Scenario: Duplicate code
- **WHEN** the body contains `code: "FAC_A"` and a folio with that code already exists
- **THEN** the system returns HTTP 409 `{"error": "Folio code already in use"}`

#### Scenario: Invalid prefix format
- **WHEN** the body contains `prefix: "rec-"` (lowercase)
- **THEN** the system returns HTTP 400 with a validation error

#### Scenario: Negative currentNumber rejected
- **WHEN** the body contains `currentNumber: -1`
- **THEN** the system returns HTTP 400 with a validation error

---

### Requirement: Update folio
The system SHALL expose `PATCH /api/v1/admin/folios/:id` to partially update a folio. Requires `folios:write`. The body MAY include any of `name`, `prefix` (string or `null` to clear), `currentNumber`, `isActive`. The field `code` MUST NOT be updatable; if present it SHALL be ignored silently. At least one updatable field MUST be present.

#### Scenario: Admin updates currentNumber
- **WHEN** the body is `{ "currentNumber": 5000 }`
- **THEN** the system returns HTTP 200 with the updated value

#### Scenario: Admin clears prefix
- **WHEN** the body is `{ "prefix": null }`
- **THEN** the system stores `null` in the prefix column

#### Scenario: Admin reactivates inactive folio
- **WHEN** the body is `{ "isActive": true }` and the entity was inactive
- **THEN** the system returns HTTP 200 with `isActive: true`

#### Scenario: code in body is ignored
- **WHEN** the body is `{ "code": "NEW", "name": "Otro" }`
- **THEN** the system updates only `name` and `code` remains unchanged

#### Scenario: Empty body
- **WHEN** the body is `{}`
- **THEN** the system returns HTTP 400 `{"error": "At least one field (name, prefix, currentNumber, isActive) must be provided"}`

#### Scenario: Folio not found
- **WHEN** the `:id` does not match any folio
- **THEN** the system returns HTTP 404 `{"error": "Folio not found"}`

---

### Requirement: Soft delete folio
The system SHALL expose `DELETE /api/v1/admin/folios/:id` that marks the folio as inactive without removing the row. Requires `folios:write`. Returns HTTP 204 on success. Calling DELETE on an already inactive folio SHALL succeed silently.

#### Scenario: Admin soft-deletes an active folio
- **WHEN** the request targets an active folio
- **THEN** the system returns HTTP 204 and the entity now has `isActive = false`

#### Scenario: Admin soft-deletes an inactive folio
- **WHEN** the target entity has `isActive = false`
- **THEN** the system still returns HTTP 204

#### Scenario: Folio not found
- **WHEN** the `:id` does not match any folio
- **THEN** the system returns HTTP 404 `{"error": "Folio not found"}`

---

### Requirement: Folio scope field

El sistema SHALL persistir una columna `scope: VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS'` en `folios`. El conjunto válido SHALL ser exactamente `{'POS', 'INVENTORY', 'OPERATIONS'}`, validado vía Zod en el controller (no vía Postgres ENUM TYPE). El campo SHALL exponerse en `FolioDto` como `scope: 'POS' | 'INVENTORY' | 'OPERATIONS'`.

#### Scenario: Migración aplica default a filas existentes

- **WHEN** la migración `add_folios_scope_column` se aplica sobre una DB con N folios pre-existentes
- **THEN** todos los folios pre-existentes quedan con `scope='OPERATIONS'` sin requerir intervención manual

#### Scenario: DTO incluye scope

- **WHEN** un cliente autenticado solicita `GET /api/v1/admin/folios/:id` (o el listado)
- **THEN** cada `FolioDto` retornado incluye el campo `scope` con uno de los tres valores válidos

#### Scenario: Valor inválido rechazado por Zod

- **WHEN** un cliente envía `POST /api/v1/admin/folios` con `scope: "INVALID"` (o cualquier string fuera de la enum)
- **THEN** el sistema retorna HTTP 400 con error de validación indicando los valores permitidos

---

### Requirement: Filter folios by scope on list

El sistema SHALL aceptar en `GET /api/v1/admin/folios` un query param opcional `scope` cuyos valores válidos son `POS`, `INVENTORY`, `OPERATIONS`. Cuando se proporciona, el listado SHALL retornar solo folios cuyo `scope` coincida. Cuando se omite, el listado conserva el comportamiento actual (no filtra por scope).

#### Scenario: Filtrar folios de POS

- **WHEN** un usuario con `folios:read` envía `GET /api/v1/admin/folios?scope=POS`
- **THEN** la respuesta contiene únicamente folios con `scope='POS'` (por ejemplo `TK`, `TC`, `COT`)

#### Scenario: Filtrar folios de OPERATIONS

- **WHEN** la request incluye `?scope=OPERATIONS`
- **THEN** la respuesta contiene únicamente folios con `scope='OPERATIONS'` (por ejemplo `RB`, `DEV`, `AB`, `CP`)

#### Scenario: Sin filtro de scope

- **WHEN** la request NO incluye `?scope=`
- **THEN** la respuesta lista folios de cualquier scope (paginación e `includeInactive` aplican normalmente)

#### Scenario: Scope inválido rechazado

- **WHEN** la request incluye `?scope=BANK` (no en la enum)
- **THEN** el sistema retorna HTTP 400 con error de validación

---

### Requirement: Create folio with scope

`POST /api/v1/admin/folios` SHALL incluir `scope: 'POS' | 'INVENTORY' | 'OPERATIONS'` como campo REQUERIDO en el body. Si el campo se omite, el sistema SHALL retornar HTTP 400. El `scope` enviado SHALL persistirse y reflejarse en el `FolioDto` de la respuesta HTTP 201.

#### Scenario: Crear folio POS

- **WHEN** el body es `{ "code": "TK", "name": "Folio de Venta Efectivo", "prefix": "TK-", "scope": "POS" }`
- **THEN** el sistema retorna HTTP 201 con `scope: "POS"` en el `FolioDto`

#### Scenario: Crear folio OPERATIONS

- **WHEN** el body es `{ "code": "RB", "name": "Recibo de Pago - Cobranza", "prefix": "RB-", "scope": "OPERATIONS" }`
- **THEN** el sistema retorna HTTP 201 con `scope: "OPERATIONS"`

#### Scenario: Body sin scope rechazado

- **WHEN** el body es `{ "code": "FOO", "name": "Foo" }` (sin `scope`)
- **THEN** el sistema retorna HTTP 400 con error de validación indicando que `scope` es requerido

---

### Requirement: Update folio scope is editable

`PATCH /api/v1/admin/folios/:id` SHALL permitir incluir `scope` como uno de los campos opcionales. Cuando se proporciona, el sistema SHALL actualizar el valor. A diferencia de `code` (que es inmutable y se ignora silenciosamente), `scope` SÍ es modificable post-creación.

#### Scenario: Cambiar scope de OPERATIONS a POS

- **WHEN** el body es `{ "scope": "POS" }` sobre un folio con `scope='OPERATIONS'`
- **THEN** el sistema retorna HTTP 200 con `scope: "POS"` y el cambio se persiste

#### Scenario: Scope inválido en update rechazado

- **WHEN** el body es `{ "scope": "BANK" }`
- **THEN** el sistema retorna HTTP 400 con error de validación

#### Scenario: Update parcial sin tocar scope

- **WHEN** el body es `{ "name": "Otro nombre" }` (sin `scope`)
- **THEN** el sistema actualiza solo `name`; `scope` queda intacto

---

### Requirement: Folio audit action in table
The `FoliosTable` SHALL include an "Auditar" action button (icon: `policy` or `fact_check`) in the actions column for each folio row. Clicking it SHALL open `FolioAuditModal` passing the folio `id`. The button SHALL be visible to all users with `folios:read` (same permission already required to view the table).

#### Scenario: User with folios:read sees audit button
- **WHEN** an authenticated user with `folios:read` views the folios table
- **THEN** each row shows the "Auditar" action alongside existing actions

#### Scenario: Clicking audit opens modal
- **WHEN** user clicks the "Auditar" button on a folio row
- **THEN** `FolioAuditModal` opens with that folio's data loading
