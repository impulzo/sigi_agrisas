# sat-unit-of-measure-api Specification

## Purpose

Catálogo de referencia del SAT (`c_ClaveUnidad`, CFDI 4.0) para búsqueda de claves de unidad de medida, y resolución de la descripción legible correspondiente a un código para mostrarla en vez del código crudo en cualquier pantalla o reporte que muestre la unidad de un producto.

## Requirements

### Requirement: Search SAT units of measure catalog
El sistema SHALL exponer `GET /api/v1/admin/sat-codes/clave-unidad` que busca en el catálogo oficial `c_ClaveUnidad` (2418 claves, CFDI 4.0). Requiere sesión autenticada; no requiere ningún permiso RBAC adicional (catálogo de referencia, no dato de negocio sensible — mismo criterio que los sub-catálogos `sat-codes`/`sat-catalogs` existentes). Parámetro `search` (opcional, mínimo 2 caracteres cuando está presente) filtra por `code` OR `description` (case-insensitive, coincidencia parcial). Sin `search`, devuelve hasta 20 resultados ordenados por `code` ascendente. Respuesta: `{ items: [{ code: string, description: string }] }`.

#### Scenario: Búsqueda por código
- **WHEN** se llama al endpoint con `search=KGM`
- **THEN** el sistema retorna `{ items: [{ code: "KGM", description: "Kilogramo" }] }`

#### Scenario: Búsqueda por descripción
- **WHEN** se llama al endpoint con `search=kilogramo`
- **THEN** el sistema retorna la entrada cuyo `code` es `KGM` entre los resultados

#### Scenario: Búsqueda por debajo del mínimo de caracteres
- **WHEN** se llama al endpoint con `search=k` (1 carácter)
- **THEN** el sistema retorna HTTP 400

#### Scenario: Sin autenticación
- **WHEN** se llama al endpoint sin token válido
- **THEN** el sistema retorna HTTP 401

---

### Requirement: Resolve human-readable unit description for display
El sistema SHALL resolver, en cada respuesta que exponga la unidad de un producto (catálogo de productos, reporte de stock, reporte de lista de precios por departamento, kardex), una descripción legible (`unitDescription`) buscando el `code` almacenado (`Product.unit`) contra el catálogo `c_ClaveUnidad`. Si el código no matchea ninguna entrada del catálogo (dato legado en texto libre previo a este cambio, o catálogo aún no sembrado), `unitDescription` SHALL ser `null` y el consumidor (UI, PDF, XLSX) SHALL mostrar el valor crudo de `unit` como fallback. La columna `unit` no tiene FK hacia el catálogo — un re-seed completo no puede dejar productos con referencia huérfana.

#### Scenario: Producto con clave SAT válida
- **WHEN** un producto tiene `unit: "KGM"` y el catálogo está sembrado
- **THEN** las respuestas que incluyen ese producto devuelven `unitDescription: "Kilogramo"`

#### Scenario: Producto con dato legado (texto libre)
- **WHEN** un producto tiene `unit: "kg"` (texto libre capturado antes de este cambio, no matchea ninguna clave del catálogo)
- **THEN** las respuestas devuelven `unitDescription: null` y la UI muestra `"kg"` (el valor crudo) sin error

#### Scenario: Movimiento de inventario nuevo snapshotea la descripción resuelta
- **WHEN** se registra un movimiento de inventario (venta, ajuste, compra, devolución) para un producto con clave SAT válida
- **THEN** el movimiento persiste la descripción resuelta (no el código crudo) en su columna `unit`, para que el kardex histórico siga siendo legible aunque el catálogo se re-siembre después
