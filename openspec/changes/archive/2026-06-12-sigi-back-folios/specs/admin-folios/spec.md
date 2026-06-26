## ADDED Requirements

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
