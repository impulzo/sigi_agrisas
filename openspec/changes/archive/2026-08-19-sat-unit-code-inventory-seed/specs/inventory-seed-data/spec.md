## ADDED Requirements

### Requirement: Mapeo de unidad cruda del Excel a clave SAT
El generador de datos de inventario (`prisma/seeds/data/generate-inventory-data.ts`) SHALL traducir el valor crudo de la columna "Unidad" de `INVENTARIO AGRISAS 2.0.xlsx` a una clave real del catálogo SAT `c_ClaveUnidad` mediante una whitelist explícita (`UNIT_CODE_MAP`), antes de emitirlo como `unit` en cada fila de `inventario-agrisas-v2.ts`. El valor `"PZA"` SHALL mapear a `"H87"` (Pieza). El valor `"NA"` SHALL mapear a `"ACT"` (Actividad).

#### Scenario: Fila con Unidad "PZA" mapea a clave Pieza
- **WHEN** el generador procesa una fila del Excel con `Unidad = "PZA"`
- **THEN** la fila emitida en `inventario-agrisas-v2.ts` tiene `unit: "H87"`

#### Scenario: Fila con Unidad "NA" mapea a clave Actividad
- **WHEN** el generador procesa una fila del Excel con `Unidad = "NA"` (ej. "DESCUENTO" o "SERVICIO DE ASESORIA EN RIEGO")
- **THEN** la fila emitida en `inventario-agrisas-v2.ts` tiene `unit: "ACT"`

### Requirement: Fallback explícito ante valor de Unidad no mapeado
Cuando el valor crudo de "Unidad" no está en `UNIT_CODE_MAP` (incluyendo vacío/`null`), el generador SHALL emitir `unit: "H87"` (clave Pieza, mismo default de negocio previo) y SHALL registrar un `console.warn` visible en la salida del comando, identificando el valor crudo no mapeado. El generador NO SHALL omitir la fila ni fallar la ejecución por este motivo.

#### Scenario: Valor de Unidad desconocido cae a Pieza con warning
- **WHEN** el generador procesa una fila del Excel con `Unidad = "KG"` (valor no contemplado en `UNIT_CODE_MAP`)
- **THEN** la fila emitida tiene `unit: "H87"`
- **AND** el comando imprime un `console.warn` indicando que `"KG"` no está mapeado

### Requirement: Regeneración preserva el resto de los campos y conteos
Al regenerar `inventario-agrisas-v2.ts` con el mapeo de unidad aplicado, el generador SHALL preservar sin cambios todos los demás campos de cada fila (`code`, `name`, `departmentCode`, `departmentName`, `satProductCode`, `ivaRate`, `iepsRate`, `quantity`, `prices`) y los contadores de ejecución (productos, departamentos, filas de sección, omitidos, colisiones) SHALL ser idénticos a una regeneración sin el mapeo de unidad, para el mismo Excel fuente.

#### Scenario: Regeneración produce mismos conteos que el run previo
- **WHEN** se regenera `inventario-agrisas-v2.ts` contra el mismo `INVENTARIO AGRISAS 2.0.xlsx` (582 productos)
- **THEN** el log del comando reporta 582 productos, mismos departamentos, mismos omitidos (0) y mismas colisiones (0) que el run anterior al cambio
- **AND** el único diff en el archivo generado, fila por fila, es el valor de `unit`

### Requirement: Re-sembrado propaga la unidad corregida a productos existentes
`seedInventory()` (`prisma/seeds/lib/inventorySeedLogic.ts`) SHALL incluir `unit` tanto en la rama `create` como en la rama `update` de su `product.upsert` por `code`, de forma que correr `npm run seed:inventory` después de regenerar los datos actualice el campo `unit` de productos ya existentes en base de datos sin crear duplicados.

#### Scenario: Producto existente recibe la clave SAT corregida al re-sembrar
- **WHEN** existe en base de datos un producto con `code: "CURZ"` y `unit: "PZA"` (sembrado antes de este cambio)
- **AND** se corre `npm run seed:inventory` con los datos regenerados (`unit: "H87"` para ese `code`)
- **THEN** el producto `CURZ` en base de datos queda con `unit: "H87"`
- **AND** no se crea un segundo producto con el mismo `code`
