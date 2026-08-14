## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador/Administrador de compras | Como operador de compras, quiero que al cargar un XML de factura CFDI cada concepto se empareje con su producto correcto en el catálogo (aunque todos compartan el mismo `ClaveProdServ` genérico del SAT) para no tener que corregir manualmente cantidades y costos mezclados entre productos distintos | - **Given** un XML CFDI con N conceptos de productos distintos, todos con el mismo `ClaveProdServ`, **When** se carga el XML, **Then** cada concepto se resuelve como línea independiente (no se agrupan por `ClaveProdServ` antes de buscar)<br>- **Given** la `Descripcion` de un concepto viene como `"[NoIdentificacion] Nombre"`, **When** se busca el producto, **Then** se usa el texto tras el prefijo entre corchetes (sin ese prefijo) como término de búsqueda<br>- **Given** la búsqueda por nombre (`?search=`, contains ambas direcciones) devuelve exactamente 1 candidato, **When** se resuelve el concepto, **Then** ese candidato se usa como línea con cantidad y costo unitario del concepto<br>- **Given** la búsqueda devuelve 0 candidatos, **When** se resuelve el concepto, **Then** cae a `unmatched` (igual que hoy)<br>- **Given** la búsqueda devuelve ≥2 candidatos, **When** se comparan `ClaveUnidad` del concepto vs `unit` del producto, **Then** si exactamente 1 candidato coincide en unidad se usa ese; si 0 o ≥2 siguen empatados, el concepto cae a `unmatched` con warning explicando la ambigüedad (no se adivina)<br>- **Given** dos conceptos distintos resuelven al mismo producto (ej. dos líneas del mismo SKU), **When** se arma el resultado, **Then** se agregan en una sola línea de compra (cantidad sumada) — comportamiento ya existente, se preserva | - El término de búsqueda (nombre extraído de `Descripcion`) se recorta a longitud razonable y se pasa tal cual al query param `search` existente — no se introduce nuevo endpoint ni bypass de `products:read` (el flujo ya requiere ese permiso para listar productos)<br>- El parseo del XML sigue ocurriendo 100% client-side (`fast-xml-parser`), sin subir el archivo a servidor — no cambia<br>- El texto extraído de `Descripcion`/`NoIdentificacion` del XML (dato no confiable, viene de un tercero) nunca se usa para construir queries SQL directas ni se interpola sin pasar por el mecanismo de query params existente (`URLSearchParams`), evitando inyección |

## Why

El uploader de XML CFDI en `/purchases/new` existe para ahorrarle al operador la captura manual de cada línea de una compra. Hoy empareja conceptos con productos por `ClaveProdServ` — la categoría genérica del catálogo SAT — agrupando primero por ese código antes de resolver producto. El catálogo real de agrisas no tiene granularidad por SKU en el catálogo SAT: verificado en Supabase, el 100% de los productos activos comparten el mismo `ClaveProdServ` (`10171600`). Consecuencia: cualquier factura con 2 o más conceptos de productos distintos colapsa todas las líneas en un solo producto — cantidades de conceptos no relacionados se suman entre sí y el costo unitario se toma solo del primer concepto. No hay error visible; el formulario se prellena con datos silenciosamente incorrectos que el operador podría registrar sin notar la discrepancia. Probado con un XML CFDI 4.0 real de 16 conceptos distintos: el sistema generó una sola línea con total $263,124.23 contra un subtotal real de factura de $202,862.01.

El fix resuelve cada concepto de forma independiente por nombre (extraído de `Descripcion`, ya que el `ClaveProdServ` no sirve como discriminador en este catálogo), con `ClaveUnidad` como desempate cuando el nombre matchea a más de un producto, evitando tanto el colapso masivo actual como adivinar mal ante ambigüedad genuina.

## What Changes

- Cambiar `buildSatApplyResult` (`app/(private)/purchases/_logic/lib/satInvoiceMapping.ts`) para resolver cada `SatConcepto` de forma independiente, sin agrupar previamente por `claveProdServ`.
- Nueva función de extracción: obtener el nombre de producto desde `concepto.descripcion` quitando el prefijo `"[NoIdentificacion] "` cuando está presente.
- Cambiar la búsqueda de producto: usar `?search=<nombre extraído>` (endpoint ya existente `GET /api/v1/admin/products`) en vez de `?satProductCode=<claveProdServ>`.
- Agregar lógica de desempate por unidad (`ClaveUnidad` del concepto vs `unit` del producto) cuando la búsqueda por nombre devuelve más de un candidato.
- Agregar campo `unit` a `ProductDto`/mapeo en `searchProductsBySatCode` (o servicio equivalente renombrado) para soportar el desempate.
- Preservar el comportamiento de agregación: si múltiples conceptos resuelven al mismo producto, sus cantidades se suman en una sola línea (ya existente, no cambia).
- Preservar el fallback a `unmatched` con warning cuando no hay match único (0 candidatos, o ≥2 candidatos sin desempate posible).
- Actualizar el Requirement "Carga de factura SAT (CFDI) para prellenar la compra" en `openspec/specs/purchases-ui/spec.md` (línea 68-98) para reflejar la nueva estrategia de matching por nombre + desempate por unidad, en vez de `ClaveProdServ`.
- Actualizar tests existentes de `satInvoiceMapping`/`SatInvoiceUploader` que asuman matching por `ClaveProdServ`.

## Capabilities

### New Capabilities

_(ninguna — este cambio modifica un requirement existente, no introduce una capability nueva)_

### Modified Capabilities

- `purchases-ui`: cambia el requirement "Carga de factura SAT (CFDI) para prellenar la compra" — la estrategia de auto-mapeo de líneas pasa de "por `ClaveProdServ` coincidente" a "por nombre extraído de `Descripcion`, con `ClaveUnidad` como desempate ante múltiples candidatos".

## Impact

- **Código**: `app/(private)/purchases/_logic/lib/satInvoiceMapping.ts` (lógica principal), `app/(private)/purchases/_logic/services/searchProductsBySatCode.ts` (cambia de filtro `satProductCode` a `search`, posible rename, agrega `unit` al DTO devuelto).
- **No se toca**: `app/(private)/purchases/_logic/lib/satXmlParser.ts` (el parser ya expone `claveProdServ`, `noIdentificacion`, `descripcion`, `claveUnidad` por concepto — no requiere cambios), `SatInvoiceUploader.tsx` (UI del uploader no cambia).
- **API**: no se agregan endpoints nuevos; se reutiliza `GET /api/v1/admin/products?search=` ya existente. No hay cambios de contrato HTTP.
- **Tests**: tests unitarios de `satInvoiceMapping` y del servicio de búsqueda de productos por factura deben actualizarse para cubrir los nuevos escenarios (match único, 0 candidatos, ≥2 candidatos con y sin desempate por unidad).
- **Specs**: `openspec/specs/purchases-ui/spec.md` — requirement de carga de XML.
