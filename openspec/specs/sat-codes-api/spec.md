# sat-codes-api Specification

## Purpose
Catálogo de referencia de códigos de producto/servicio del SAT (`c_ClaveProdServ`), de sólo lectura con búsqueda, usado para asistir la captura de `Product.satProductCode` sin escribirlo a mano. El seed siembra el catálogo oficial completo (52,513 códigos) desde `c_ClaveProdServ`.
## Requirements
### Requirement: SatProductServiceCode aggregate model
El sistema SHALL persistir `SatProductServiceCode` con: `code` (`VARCHAR(8)`, único, PK lógica — mismo formato que `Product.satProductCode`), `description` (`TEXT`, requerido). Sin `isActive` ni soft delete — es un catálogo de referencia externo, no un recurso administrable por el usuario en esta iteración.

#### Scenario: Código único
- **WHEN** el seed intenta insertar dos filas con el mismo `code`
- **THEN** la constraint única lo impide (el seed usa resync total en una transacción, idempotente)

---

### Requirement: Search SAT codes endpoint
El sistema SHALL exponer `GET /api/v1/admin/sat-codes?search=` que requiere sesión autenticada (sin permiso adicional — catálogo de referencia, no dato de negocio sensible). Query param `search` (opcional, mínimo 2 caracteres cuando presente) filtra por `code` O `description` vía `ILIKE '%search%'`. Sin `search`, devuelve una página inicial (máx. 20 resultados) para no listar el catálogo completo sin filtro. Response: `{ items: Array<{code: string, description: string}> }`, sin paginación explícita — el tope de 20 resultados es intencional y suficiente para el autocompletado del combobox de productos; el filtro `search` es el mecanismo para navegar el catálogo completo.

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

### Requirement: Seed del catálogo real c_ClaveProdServ
El script de seed (`prisma/seeds/satCodes.ts`) SHALL sembrar el catálogo oficial completo `c_ClaveProdServ` del SAT (Anexo 20, CFDI 4.0) — 52,513 códigos — reemplazando el subconjunto placeholder aproximado previo. La data vive en `prisma/seeds/data/sat-codes.tsv` (`code\t description`, UTF-8), generada desde la fuente documentada (repo `phpcfdi/resources-sat-catalogs`, archivo `cfdi_40_productos_servicios.sql`, que se auto-sincroniza con los catálogos del SAT). El seed SHALL ser idempotente mediante **resync total en una sola transacción**: `deleteMany` de todas las filas + `createMany` por lotes del catálogo completo. El archivo de la lib (`prisma/seeds/lib/satCatalog.ts`) SHALL documentar la procedencia (URL, fecha de obtención) y los SHA-256 de la fuente SQL y del TSV; el seed SHALL verificar el checksum del TSV antes de escribir y abortar con un error claro si no coincide.

#### Scenario: Seed idempotente con resync total
- **WHEN** `npm run seed:sat-codes` corre dos veces contra una BD que ya tiene filas (incluidas las 56 del placeholder previo)
- **THEN** tras la primera corrida la tabla contiene 52,513 filas con códigos/descripciones reales; la segunda corrida produce exactamente el mismo resultado, sin duplicados ni errores

#### Scenario: Checksum inválido aborta el seed
- **WHEN** el TSV embebido está corrupto o fue editado a mano (checksum SHA-256 distinto del documentado)
- **THEN** el seed aborta con un error que indica el checksum esperado vs. obtenido, antes de tocar la BD

#### Scenario: Descripciones verificadas contra la fuente
- **WHEN** se inspecciona `prisma/seeds/data/sat-codes.tsv` y la lib `satCatalog.ts`
- **THEN** las descripciones coinciden con el catálogo oficial (ej. `01010101` = "No existe en el catálogo", `10151500` = "Semillas y plántulas vegetales") y no se conserva ninguna descripción del placeholder previo que contradiga la fuente (ej. el placeholder decía `10161500` = "Fertilizantes"; el real es "Árboles y arbustos")

#### Scenario: Sin FK que bloquee el resync
- **WHEN** `deleteMany` corre dentro de la transacción
- **THEN** no falla por restricciones de FK (el catálogo no es referenciado por FKs en el schema) y los productos/ventas existentes conservan sus `satProductCode` como columna suelta

