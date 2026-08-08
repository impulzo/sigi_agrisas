# Spec: sat-catalogs

## Purpose

Catálogos de referencia SAT de régimen fiscal (`c_RegimenFiscal`) y uso CFDI (`c_UsoCFDI`), sembrados por seed y expuestos mediante endpoints de búsqueda read-only para asistir la captura fiscal de clientes.

---

## Requirements

### Requirement: SatTaxRegime aggregate model
El sistema SHALL persistir `SatTaxRegime` con: `code` (`VARCHAR(3)`, único, PK lógica — mismo formato que `Customer.taxRegime`), `description` (`TEXT`, requerido). Sin `isActive` ni soft delete — es un catálogo de referencia externo, no un recurso administrable por el usuario en esta iteración.

#### Scenario: Código único
- **WHEN** el seed intenta insertar dos filas con el mismo `code`
- **THEN** la constraint única lo impide (el seed usa upsert idempotente por `code`)

#### Scenario: Formato del código
- **WHEN** se inspecciona el seed
- **THEN** los códigos son de 3 dígitos dentro del rango oficial de `c_RegimenFiscal` CFDI 4.0 (601–626) y la descripción coincide con el catálogo oficial (ej. `601` = "General de Ley Personas Morales")

---

### Requirement: SatCfdiUse aggregate model
El sistema SHALL persistir `SatCfdiUse` con: `code` (`VARCHAR(3)`, único, PK lógica — mismo formato que `Customer.cfdiUse`), `description` (`TEXT`, requerido). Sin `isActive` ni soft delete — es un catálogo de referencia externo.

#### Scenario: Código único
- **WHEN** el seed intenta insertar dos filas con el mismo `code`
- **THEN** la constraint única lo impide (el seed usa upsert idempotente por `code`)

#### Scenario: Formato del código
- **WHEN** se inspecciona el seed
- **THEN** los códigos son letras + 2 dígitos (de 3 o 4 caracteres, ej. `G01`, `CP01`, `CN01`) dentro del catálogo oficial `c_UsoCFDI` CFDI 4.0 y la descripción coincide con el catálogo oficial (ej. `G01` = "Adquisición de mercancías.")

---

### Requirement: Search tax regime catalog endpoint
El sistema SHALL exponer `GET /api/v1/admin/sat-codes/regimen-fiscal?search=` que requiere sesión autenticada (sin permiso adicional — catálogo de referencia, no dato de negocio sensible). Query param `search` (opcional, mínimo 2 caracteres cuando presente) filtra por `code` O `description` de forma case-insensitive. Sin `search`, devuelve una página inicial (máx. 20 resultados). Response: `{ items: Array<{code: string, description: string}> }`.

#### Scenario: Búsqueda por código
- **WHEN** un usuario autenticado llama `GET /api/v1/admin/sat-codes/regimen-fiscal?search=601`
- **THEN** la respuesta incluye el régimen con `code` que contiene "601" ("General de Ley Personas Morales")

#### Scenario: Búsqueda por descripción
- **WHEN** un usuario autenticado llama `GET /api/v1/admin/sat-codes/regimen-fiscal?search=simplificado`
- **THEN** la respuesta incluye el régimen `626` ("Régimen Simplificado de Confianza") (case-insensitive)

#### Scenario: Búsqueda corta rechazada
- **WHEN** `search` tiene 1 carácter
- **THEN** el sistema retorna HTTP 400

#### Scenario: Sin filtro devuelve página inicial
- **WHEN** se llama sin `search`
- **THEN** la respuesta incluye hasta 20 códigos (orden por `code` ASC), no el catálogo completo

---

### Requirement: Search CFDI use catalog endpoint
El sistema SHALL exponer `GET /api/v1/admin/sat-codes/uso-cfdi?search=` que requiere sesión autenticada (sin permiso adicional). Query param `search` (opcional, mínimo 2 caracteres cuando presente) filtra por `code` O `description` de forma case-insensitive. Sin `search`, devuelve una página inicial (máx. 20 resultados). Response: `{ items: Array<{code: string, description: string}> }`.

#### Scenario: Búsqueda por código
- **WHEN** un usuario autenticado llama `GET /api/v1/admin/sat-codes/uso-cfdi?search=G03`
- **THEN** la respuesta incluye el uso con `code` "G03" ("Gastos en general.")

#### Scenario: Búsqueda por descripción
- **WHEN** un usuario autenticado llama `GET /api/v1/admin/sat-codes/uso-cfdi?search=nomina`
- **THEN** la respuesta incluye el uso `CN01` ("Nómina") (case-insensitive)

#### Scenario: Búsqueda corta rechazada
- **WHEN** `search` tiene 1 carácter
- **THEN** el sistema retorna HTTP 400

#### Scenario: Sin filtro devuelve página inicial
- **WHEN** se llama sin `search`
- **THEN** la respuesta incluye hasta 20 códigos (orden por `code` ASC), no el catálogo completo

---

### Requirement: Seed de los catálogos c_RegimenFiscal y c_UsoCFDI
El script de seed (`prisma/seeds/satCatalogs.ts`) SHALL sembrar los catálogos oficiales CFDI 4.0 — `c_RegimenFiscal` (19 códigos) y `c_UsoCFDI` (24 códigos) — con data estática embebida y procedencia documentada (repo `phpcfdi/resources-sat-catalogs`, archivos `cfdi_40_regimenes_fiscales.sql` y `cfdi_40_usos_cfdi.sql`). El seed SHALL ser idempotente mediante upsert por `code` en una sola transacción.

#### Scenario: Seed idempotente
- **WHEN** `npm run seed:sat-catalogs` corre dos veces contra una BD que ya tiene filas
- **THEN** tras la primera corrida la tabla `sat_tax_regimes` tiene 19 filas y `sat_cfdi_uses` 24; la segunda corrida produce exactamente el mismo resultado, sin duplicados ni errores

#### Scenario: Descripciones verificadas contra la fuente
- **WHEN** se inspecciona `prisma/seeds/satCatalogs.ts`
- **THEN** las descripciones coinciden con el catálogo oficial (ej. `601` = "General de Ley Personas Morales", `G01` = "Adquisición de mercancías.") y no se conserva ningún placeholder
