## Context

Ver proposal.md (`## Why` / `## What Changes`). Estado actual relevante para el diseño:

- El backend de búsqueda SAT ya existe y filtra por `code` **O** `description` (ILIKE, min 2 chars, tope 20). No requiere cambios.
- `SatCodeCombobox` ya existe y ya está cableado en `ProductGeneralTab` (pestaña General del detalle). Falta en `ProductEditModal`.
- `Product.satProductCode` es `String? @db.VarChar(16)` sin FK al catálogo → resync total del catálogo es seguro.
- El seed previo siembra ~56 códigos placeholder con descripciones incorrectas (verificadas contra la fuente real).

## Goals / Non-Goals

**Goals**
- Cargar el catálogo real `c_ClaveProdServ` (52,513 códigos) de forma reproducible e idempotente, con procedencia y checksum verificables.
- Mostrar el listado de códigos SAT en crear y editar producto (`ProductEditModal`).
- Garantizar filtro por código y por nombre en el buscador del combobox (ya soportado por el backend; verificado por tests).

**Non-Goals**
- Nueva pantalla/catálogo SAT dedicado (el usuario eligió el alcance del combobox).
- Cambios al schema (la tabla `SatProductServiceCode` ya existe).
- Cambios al endpoint de búsqueda ni al hook `useSatCodesSearch`.

## Decisions

### D1. Fuente de datos del catálogo real → repo `phpcfdi/resources-sat-catalogs`
El SAT oficial bloquea descarga automatizada (HTTP 403). Se usa el archivo `cfdi_40_productos_servicios.sql` del proyecto phpcfdi, que se auto-sincroniza con los catálogos del SAT cada ~2 semanas (última sync 2026-07-31) y es la referencia estándar del ecosistema CFDI en México. Verificación de calidad realizada: 52,513 filas, 0 duplicados, 0 descripciones vacías, todos los códigos `^\d{8}$`.
Alternativas descartadas: descarga directa del SAT (bloqueada), scraping propio (no mantenible).

### D2. Formato de la data embebida → TSV `prisma/seeds/data/sat-codes.tsv` (~2.2 MB)
Formato `code\t description` UTF-8, ordenado por code, sin header. Compacto (~2.2 MB), diff-friendly y reproducible. Se prefirió sobre un módulo TS con 52,513 literales (el parser ts-node no debe compilar 50k filas) y sobre SQL crudo (~7 MB).
El archivo se genera una vez desde la fuente (pipeline documentado en `satCatalog.ts`); no se commitea el script generador (evitar basura — el pipeline es reproducible con los comandos documentados).

### D3. Verificación de integridad → checksum SHA-256 en `satCatalog.ts`
`verifySatCatalogChecksum(tsv)` compara el SHA-256 del TSV contra `SAT_CATALOG_SOURCE.tsvSha256`. `loadSatCatalog()` lo verifica antes de parsear y valida que el conteo de filas coincida con `rowCount` (52,513). El seed aborta con mensaje claro si hay mismatch → mitiga corrupción silenciosa o edición manual del TSV.
Riesgo conocido: el checksum debe actualizarse cuando se regenere el TSV desde una fuente más reciente; se documenta el comando y dónde actualizarlo en el comentario del módulo.

### D4. Estrategia de seed → resync total idempotente en una transacción
`deleteMany` + `createMany` en lotes de 5,000 dentro de `prisma.$transaction`. La tabla no tiene FKs entrantes (confirmado en schema), así que `deleteMany` es seguro. Idempotente: dos corridas producen el mismo estado. Se eligió sobre upsert (52k upserts secuenciales = lento) y sobre `createMany(skipDuplicates)` (no corrige descripciones del placeholder). Los lotes evitan superar el límite de parámetros de Postgres y de memoria del query engine. **Nota de implementación**: la transacción interactiva debe declarar `{ maxWait: 30_000, timeout: 180_000 }` — los 52,513 inserts vía pooler exceden el timeout interactivo por defecto de Prisma (5 s) y la transacción se cierra con error P2028 si no se amplía.

### D5. UI → reutilizar `SatCodeCombobox` existente en `ProductEditModal`
Mismo componente que ya usa `ProductGeneralTab`; cero lógica nueva. El modal conserva su validación `^\d{8}$` (en el submit, sobre el estado `satProductCode`), el diff en edit y el envío de `null` al limpiar. No se sustituye por el `Combobox` genérico de `_components/molecules` porque el específico ya está probado en uso en `ProductGeneralTab` y evita regresiones.

## Risks / Trade-offs

- [El TSV de 52k filas crece el repo ~2.2 MB] → Mitigación: es data de referencia de un catálogo gubernamental estable; el formato TSV es el más compacto viable y diff-friendly.
- [Checksum stale al actualizar la fuente] → Mitigación: pipeline de regeneración documentado en el header de `satCatalog.ts`; el seed falla (no falla silencioso) si el TSV y el checksum no coinciden.
- [El seed borra todas las filas cada corrida] → Mitigación: transacción única (rollback atómico si falla) y sin FKs entrantes confirmadas; si en el futuro se agrega una FK, `deleteMany` fallará explícitamente y se deberá cambiar la estrategia.
- [El combobox muestra hasta 20 sugerencias; códigos fuera del top no son listables sin filtro] → Mitigación: es el diseño intencional del endpoint (tope 20); el filtro por código/nombre es el mecanismo de navegación, y la captura manual de 8 dígitos sigue permitida.
