## Context

Ver `proposal.md` → `## Why` para la motivación. Estado actual del código relevante:

- `app/(private)/purchases/_logic/lib/satXmlParser.ts`: parsea el CFDI client-side y ya expone por cada `Concepto`: `claveProdServ`, `noIdentificacion`, `descripcion`, `claveUnidad`, `cantidad`, `valorUnitario`, `traslados`. No requiere cambios.
- `app/(private)/purchases/_logic/lib/satInvoiceMapping.ts` (`buildSatApplyResult`): hoy agrupa conceptos por `claveProdServ`, hace 1 búsqueda por cada `claveProdServ` único vía `searchProductsBySatCode`, toma `items[0]` como match, y luego agrupa TODOS los conceptos que comparten ese `claveProdServ` bajo el primer producto encontrado — este es el paso que colapsa productos distintos.
- `app/(private)/purchases/_logic/services/searchProductsBySatCode.ts`: llama `GET /api/v1/admin/products?satProductCode=X&page=1&pageSize=100&includeInactive=false`, mapea la respuesta a un `ProductDto` reducido (`id, code, name, ivaRate, iepsRate, isActive`) — **no incluye `unit`**.
- Backend `GET /api/v1/admin/products` ya soporta `?search=` (contains, case-insensitive, sobre `name` y `code`, mínimo 2 caracteres) — ver `ProductsController.ts:42-46` y `PrismaProductRepository.ts:95-99`. No requiere cambios de backend.
- `ProductDto` (frontend, `app/(private)/purchases/_logic/types/api.ts`) es un tipo local del módulo purchases, reducido respecto al `ProductDto` de backend — se puede extender con `unit` sin tocar el backend, ya que el backend ya devuelve `unit` en cada item de la lista (confirmado en `src/modules/products/application/dto/ProductDto.ts`).

## Goals / Non-Goals

**Goals:**
- Resolver cada `Concepto` del XML de forma independiente contra el catálogo, sin depender de que `ClaveProdServ` discrimine productos.
- Nunca adivinar entre candidatos ambiguos: ante ambigüedad no resuelta, el concepto cae a `unmatched` con aviso explícito (mejor un dato faltante y visible que un dato incorrecto y silencioso — la fila 1 de la historia de usuario en proposal.md lo exige explícitamente).
- Mantener sin cambios: el parser XML, el componente `SatInvoiceUploader`, el contrato de `SatApplyResult` consumido por `CreatePurchasePage`/`useCreatePurchaseForm` (mismos campos de salida: `lines`, `unmatched`, `warnings`, `metadata`, `newProvider`, `paymentMethodId`).

**Non-Goals:**
- No se implementa un algoritmo de similitud difusa (Levenshtein, fuzzy score) — el criterio de match es contención de substring (case-insensitive), suficiente para los casos reales observados y evita falsos positivos de un umbral de similitud mal calibrado.
- No se agrega un campo nuevo al modelo `Product` (ej. `satSku`) para mapear `NoIdentificacion` 1:1 — quedaría fuera de alcance (requeriría poblar históricamente todo el catálogo); se aborda con el nombre + unidad, que ya están disponibles.
- No se cambia el backend (`ProductsController`, `PrismaProductRepository`) — `?search=` y `unit` en la respuesta ya existen.

## Decisions

### 1. Extracción de nombre desde `Descripcion`

`Descripcion` llega como `"[NoIdentificacion] Nombre"` (formato observado consistentemente en el XML real de prueba, típico de sistemas de facturación que anteponen el SKU del emisor entre corchetes). Se extrae con una regex simple `/^\[.*?\]\s*/` removida del inicio; si no hay corchetes (formato distinto), se usa `descripcion` completa tal cual como término de búsqueda. No se intenta parsear `NoIdentificacion` como código de producto porque, verificado contra la BD real, `NoIdentificacion` del proveedor (ej. `40.04.01`) no coincide con `product.code` del catálogo agrisas (ej. `AMK`) — son sistemas de codificación independientes. El nombre sí es semánticamente comparable (`"AMINOGREEN K"` vs `"AMINOGREEN K 1LT"`).

**Alternativa descartada**: matchear por `NoIdentificacion` == `product.code`. Descartada porque, en los datos reales verificados, nunca coinciden — habría 0% de match.

### 2. Búsqueda por nombre vía `?search=` existente, contains en ambas direcciones

Se llama `GET /api/v1/admin/products?search=<nombre extraído>` reutilizando el filtro ya implementado (contains sobre `name`/`code`, case-insensitive). Como el backend ya hace "product.name contains search", falta cubrir el caso inverso (nombre de factura más largo que el de catálogo, o con palabras extra) — se resuelve client-side: de los resultados que el backend regresa (que ya garantiza `search` ⊆ `product.name` o `search` ⊆ `product.code`), se aceptan tal cual como candidatos; adicionalmente, si el término de búsqueda no da resultados, no se reintenta con substrings más cortos (mantiene el comportamiento predecible: 0 resultados ⇒ `unmatched`, sin heurísticas adicionales que compliquen el debug).

**Alternativa descartada**: pedir todos los productos activos una sola vez (`pageSize=100` sin filtro) y hacer el contains 100% client-side en ambas direcciones. Descartada por ser más costosa en payload sin necesidad — el catálogo puede crecer más allá de 100 productos y el filtro server-side ya resuelve el 90% del caso (factura ⊆ catálogo); el caso catálogo ⊆ factura es marginal dado que los nombres de catálogo agrisas suelen ser más específicos (con presentación/medida) que los de factura.

### 3. Desempate por `ClaveUnidad` vs `product.unit`

Cuando `?search=` regresa ≥2 candidatos (ej. buscar "BUFALO" matchea "BUFALO 20 L", "BUFALO 1L", "BUFALO SOLID 5KG"), se filtran los candidatos cuyo `unit` sea exactamente igual (string compare) a `concepto.claveUnidad`. Ambos son códigos de unidad SAT (`ClaveUnidad` del CFDI y `products.unit`, que ya se valida contra el catálogo SAT de unidades — ver `sat-unit-of-measure-api`), por lo que son directamente comparables sin normalización adicional.

- Si el filtro deja exactamente 1 candidato → se usa ese.
- Si deja 0 o ≥2 → `unmatched` con warning de ambigüedad (Decisión de diseño explícita, no un caso no contemplado: ver Goals).

**Alternativa descartada**: tomar el primer candidato devuelto por el backend sin desempate (comportamiento "menos malo" que el bug actual, pero reintroduce el mismo patrón de "adivinar y fallar silenciosamente" que esta historia busca eliminar — rechazada explícitamente por el usuario al aprobar la estrategia de desempate).

### 4. Resolución de conceptos en paralelo, sin agrupar antes de buscar

Se reemplaza el loop actual (agrupar por `claveProdServ` → 1 fetch por grupo) por: 1 fetch por concepto (usando `Promise.all` para paralelizar, igual que hoy se paraleliza por `claveProdServ` único). Después de resolver todos los conceptos a su producto (o `unmatched`), se agrupan por `product.id` para sumar cantidades — mismo paso de agregación que existe hoy, solo que la clave de agrupación ahora es el resultado del match por nombre, no el `claveProdServ` de entrada.

Nota de eficiencia: si un XML real trae muchos conceptos con nombres repetidos o muy similares, esto implica potencialmente más llamadas HTTP que la versión actual (1 por concepto en vez de 1 por `claveProdServ` único). Se acepta el costo: los XML de factura de compra son documentos acotados (decenas de conceptos, no miles) y el uploader ya es una operación manual de "cargar factura", no un flujo de alta frecuencia.

### 5. Extensión de `ProductDto` (frontend, módulo purchases) con `unit`

Se agrega `unit: string` al tipo `ProductDto` en `app/(private)/purchases/_logic/types/api.ts` y al mapeo en el servicio de búsqueda, leyendo `p.unit` de la respuesta del backend (que ya lo incluye). No afecta a otros consumidores de ese tipo local (namespace del módulo purchases).

## Risks / Trade-offs

- **[Riesgo] Nombres de catálogo con presentación/medida variable pueden generar 0 matches donde antes (incorrectamente) había 1.** Ej. si el catálogo tuviera "AMINOGREEN-K" (con guion) en vez de "AMINOGREEN K", el contains no matchea. → Mitigación: esto ya es visible al usuario como línea `unmatched` con la descripción original del concepto — el usuario completa manualmente, que es el flujo ya existente y probado para este caso (Scenario "Conceptos sin producto equivalente avisados" ya cubre esto).
- **[Riesgo] Aumento de llamadas HTTP (1 por concepto en vez de 1 por `claveProdServ` único) en facturas con muchos conceptos.** → Mitigación: se paraleliza con `Promise.all`; volumen típico de una factura de compra (decenas de líneas) no es un problema de performance real para un flujo manual de carga de archivo.
- **[Riesgo] Regresión en tests existentes que asumen agrupación por `claveProdServ`.** → Mitigación: parte explícita de `tasks.md` — actualizar los tests de `satInvoiceMapping` para reflejar la nueva estrategia antes de dar el cambio por completo.
- **[Trade-off] Se prioriza seguridad del dato (no adivinar) sobre cobertura de auto-mapeo.** Facturas con productos genuinamente ambiguos por nombre (ej. "BUFALO" sin unidad discriminante en el XML) requerirán completar manualmente más líneas que en una implementación que "adivinara" tomando el primer candidato. Se acepta como aceptable porque el bug actual ya demostró el costo de adivinar mal: peor tener que completar una línea manualmente que registrar una compra con cantidades y costos incorrectos sin que nadie lo note.
