# sat-codes-api Specification

## Purpose
Catálogo de referencia de códigos de producto/servicio del SAT (`c_ClaveProdServ`), de sólo lectura con búsqueda, usado para asistir la captura de `Product.satProductCode` sin escribirlo a mano. El subconjunto sembrado inicialmente es un placeholder aproximado, no el catálogo oficial completo — ver `Requirement: Seed placeholder disclosure`.
## Requirements
### Requirement: SatProductServiceCode aggregate model
El sistema SHALL persistir `SatProductServiceCode` con: `code` (`VARCHAR(8)`, único, PK lógica — mismo formato que `Product.satProductCode`), `description` (`TEXT`, requerido). Sin `isActive` ni soft delete — es un catálogo de referencia externo, no un recurso administrable por el usuario en esta iteración.

#### Scenario: Código único
- **WHEN** el seed intenta insertar dos filas con el mismo `code`
- **THEN** la constraint única lo impide (el seed usa `upsert` por `code`, idempotente)

---

### Requirement: Search SAT codes endpoint
El sistema SHALL exponer `GET /api/v1/admin/sat-codes?search=` que requiere sesión autenticada (sin permiso adicional — catálogo de referencia, no dato de negocio sensible). Query param `search` (opcional, mínimo 2 caracteres cuando presente) filtra por `code` O `description` vía `ILIKE '%search%'`. Sin `search`, devuelve una página inicial (máx. 20 resultados) para no listar el catálogo completo sin filtro. Response: `{ items: Array<{code: string, description: string}> }`, sin paginación explícita (el subconjunto placeholder es pequeño; se revisará cuando se cargue el catálogo completo).

#### Scenario: Búsqueda por código
- **WHEN** un usuario autenticado llama `GET /api/v1/admin/sat-codes?search=10191`
- **THEN** la respuesta incluye códigos cuyo `code` contiene "10191"

#### Scenario: Búsqueda por descripción
- **WHEN** un usuario autenticado llama `GET /api/v1/admin/sat-codes?search=fertilizante`
- **THEN** la respuesta incluye códigos cuya `description` contiene "fertilizante" (case-insensitive)

#### Scenario: Búsqueda corta rechazada
- **WHEN** `search` tiene 1 carácter
- **THEN** el sistema retorna HTTP 400

#### Scenario: Sin filtro devuelve página inicial
- **WHEN** se llama sin `search`
- **THEN** la respuesta incluye hasta 20 códigos (orden por `code` ASC), no el catálogo completo

---

### Requirement: Seed placeholder disclosure
El script de seed (`prisma/seeds/satCodes.ts`) SHALL sembrar un subconjunto curado de códigos SAT relevantes al giro agro/agroquímico del cliente (~50-100 filas), idempotente vía `upsert` por `code`. El archivo del seed SHALL incluir un comentario visible al inicio indicando explícitamente que el subconjunto es aproximado (basado en conocimiento general, no una descarga verificada del catálogo oficial vigente del SAT) y que debe reemplazarse por el catálogo oficial completo antes de depender de él para CFDI de producción sin revisión manual.

#### Scenario: Seed idempotente
- **WHEN** `npm run seed:sat-codes` (o el mecanismo de seed elegido) corre dos veces
- **THEN** no se duplican filas ni se lanzan errores

#### Scenario: Advertencia de placeholder visible
- **WHEN** se inspecciona `prisma/seeds/satCodes.ts`
- **THEN** el archivo contiene un comentario explícito marcando los datos como placeholder no verificado

