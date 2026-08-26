## MODIFIED Requirements

### Requirement: Emparejamiento de Tlaxiaco por nombre normalizado
El seeder runtime SHALL normalizar el `name` de cada fila de `INV TLAXIACO` y de cada `products.name` existente mediante: descomposición `NFD` y remoción de diacríticos, `uppercase`, colapso de espacios múltiples, y remoción de los tokens completos `DE`, `CON`, `Y` (no como substring — sólo cuando aparecen como palabra separada). El sistema SHALL buscar un `product` cuyo `name` normalizado sea exactamente igual al `name` normalizado de la fila de Tlaxiaco. Cuando exista un match exacto, la fila SHALL tratarse con el `code`/`id` de ese producto, sin modificar `name`/`unit`/`departmentId` del producto (mismo criterio no-agresivo que las 4 tiendas). Cuando no exista match y la fila traiga `Departamento` explícito, el sistema SHALL sintetizar un `code` aplicando `normalizeProductCode()` (de `prisma/seeds/lib/normalize.ts`) sobre el `name` real de la fila (nunca sobre `tlaxiacoRawCode`), y auto-crear el producto con ese `code` sintetizado, resolviendo `departmentId` desde la columna `Departamento` explícita de la fila. Cuando no exista match y la fila NO traiga `Departamento` explícito (`"- Sin Departamento -"` o vacío, normalizado a `null`), el sistema SHALL resolver un departamento fallback fijo (`code: "SIN_DEPARTAMENTO"`, creado si no existe, vía el mismo mecanismo de resolución/upsert de departamento usado en el resto del seeder) y auto-crear el producto con ese departamento, en vez de omitir la fila — contando la fila en un contador separado (`tlaxiacoFallbackDepartment`) distinto de las auto-creaciones con departamento explícito. Cuando el `code` sintetizado colisione con uno ya usado en la misma corrida para un producto distinto, el sistema SHALL contar la fila como `error` y omitirla, sin sobrescribir el producto existente — esta regla aplica igual con o sin departamento explícito.

#### Scenario: Nombre normalizado matchea producto existente pese a "DE" de relleno
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ALGAK DE 1L"` y existe `products.name: "ALGAK 1L"`
- **THEN** el seeder empareja la fila con ese producto existente y usa su `code` (`AK1`) para el resto del flujo (inventario/precio de `TLAXIACO`)

#### Scenario: Sin match, con departamento explícito, se sintetiza code del nombre real
- **WHEN** la fila de `INV TLAXIACO` trae `name: "BIO-FREEZE DE 1L"`, `departmentName: "AGROQUIMICOS"` y ningún producto en catálogo normaliza a ese mismo nombre
- **THEN** el seeder sintetiza `code` vía `normalizeProductCode("BIO-FREEZE DE 1L")` y auto-crea el producto con ese `code` y `departmentId` resuelto de `"AGROQUIMICOS"` — nunca usa el `tlaxiacoRawCode` original

#### Scenario: Sin match y sin departamento explícito, usa el departamento fallback
- **WHEN** la fila de `INV TLAXIACO` trae `name: "ALIETTE DOSIS 500GRS"`, `departmentName: null` (Excel traía `"- Sin Departamento -"`), y ningún producto en catálogo normaliza a ese mismo nombre
- **THEN** el seeder resuelve/crea el departamento `code: "SIN_DEPARTAMENTO"` y auto-crea el producto con `code` sintetizado del nombre y ese `departmentId`
- **AND** la fila se cuenta en `tlaxiacoFallbackDepartment`, no se omite como `error`

#### Scenario: Departamento fallback es idempotente entre corridas
- **WHEN** el seeder corre una segunda vez y ya existe `departments.code = "SIN_DEPARTAMENTO"` de una corrida anterior
- **THEN** no crea una segunda fila de departamento, reutiliza la existente para todas las filas de esta categoría

#### Scenario: Colisión de code sintetizado se reporta sin sobrescribir
- **WHEN** dos filas de `INV TLAXIACO` con nombres distintos normalizan a un `code` sintetizado idéntico
- **THEN** la segunda fila procesada se cuenta como `error` y se omite; el producto creado por la primera fila permanece sin cambios
