## Context

Ver `proposal.md` — Why para la motivación completa. Punto técnico relevante: `Product.departmentId` es FK `NOT NULL` en `prisma/schema.prisma` (línea 286), así que el seeder no puede auto-crear un producto sin resolver algún `departmentId` real en DB. Hoy (`prisma/seeds/lib/inventoryTiendasSeedLogic.ts`, loop Tlaxiaco, rama `else` de "sin match", líneas ~318-322) esa restricción se resuelve omitiendo la fila con un `error` cuando `row.departmentName` es `null`. Confirmado por corrida read-only contra la DB real (`prisma.product.findMany` + `normalizeProductNameForMatching` sobre `TLAXIACO_RAW_DATA`): exactamente 38 filas caen en esa rama, todas con `departmentName: null` (0 filas "sin match + con departamento" quedan sin cubrir — ese caso ya se auto-crea hoy).

El seeder ya tiene un mecanismo de resolución/creación de departamento reusable: `resolveDepartmentId(name)` (línea ~125), que normaliza el nombre a `code` vía `normalizeDepartmentCode` y hace `department.upsert` con cache en memoria por corrida. Este change no introduce un mecanismo nuevo — reusa exactamente ese helper con un nombre fijo.

## Goals / Non-Goals

**Goals:**
- Que las 38 filas de Tlaxiaco sin match y sin departamento (historia 1) se auto-creen bajo un departamento fallback fijo, visible en el reporte, en vez de perderse como `error`.
- Mantener intacto el criterio de matching exacto-tras-normalizar (D9 de `seed-tiendas-inventory-v3`) y la síntesis de code (D10) — este change sólo toca qué pasa DESPUÉS de confirmar "sin match", en la sub-rama "sin departamento".

**Non-Goals:**
- No reclasifica manualmente estos 38 productos a su departamento real (ferretería, agroquímicos, etc.) — quedan bajo `SIN_DEPARTAMENTO` para revisión/reasignación manual posterior vía `admin-departments`/`admin-products` en el panel, fuera de scope de este seeder.
- No cambia el comportamiento de las 4 tiendas de code alineado ni de Agrisas (Matriz) — ninguna de esas 2 rutas tiene la rama "sin match, sin departamento" (las tiendas simples matchean por `code` exacto, no por nombre; Agrisas siempre trae `departmentName` de su propia hoja).
- No agrega heurística de clasificación automática de departamento por palabra clave del nombre (ej. detectar "VALVULA"/"CODO" → Plomería) — eso es ambigüedad de negocio real, no un fallback técnico; se prefiere un bucket único explícito y auditable sobre una heurística que podría clasificar mal en silencio.

## Decisions

**D1 — Departamento fallback fijo `SIN_DEPARTAMENTO`, resuelto con el mismo `resolveDepartmentId` ya existente.**
Responde a la historia 1 de `proposal.md`. En vez de introducir una segunda ruta de creación de `Department`, se llama `resolveDepartmentId("Sin Departamento")` (el mismo helper que ya usan Agrisas/tiendas/Tlaxiaco-con-departamento) — `normalizeDepartmentCode("Sin Departamento")` produce `"SIN_DEPARTAMENTO"`, que se resuelve/crea una sola vez por corrida gracias al cache en memoria (`departmentCache`) ya existente en el helper. Alternativa descartada: código de departamento hardcodeado como constante de infraestructura sin pasar por `resolveDepartmentId` — se descarta porque duplicaría la lógica de upsert idempotente que el helper ya resuelve correctamente, sin ganar nada.

**D2 — Se activa únicamente en la rama "sin match Y sin departamento", nunca reemplaza un departamento explícito.**
Precisión requerida por el Criterio de Seguridad de la historia 1: una fila con `departmentName` explícito (aunque no matchee por nombre) sigue exactamente el flujo ya implementado (código sintetizado + `resolveDepartmentId(row.departmentName)` real) — el fallback es estrictamente el `else` dentro del `else` de "sin match" (`if (!row.departmentName) { ...usar fallback... } else { ...flujo actual... }`), no una condición nueva de nivel superior que pudiera capturar casos no previstos.

**D3 — Contador separado `tlaxiacoFallbackDepartment`, no mezclado en `tlaxiacoCreated`.**
Auditar cuántos productos entraron por la vía "departamento desconocido" es un requisito explícito de la historia 1 (visibilidad para revisión manual posterior). `tlaxiacoCreated` sigue incrementándose igual (la fila sí crea un producto), pero se agrega un contador adicional específico para este subconjunto, impreso en `printTiendasSeedReport` junto al resto de conteos de Tlaxiaco.

**D4 — Sin cambios a la regla de colisión de code sintetizado (D10 del change original).**
La colisión se evalúa sobre `syntheticCodeOwners` (mapa `code → normalizedName`), que es independiente del departamento asignado — una fila que hoy colisionaría (dos nombres distintos normalizan al mismo code) sigue colisionando igual con o sin departamento fallback; este change no toca esa rama de código.

## Risks / Trade-offs

- **[Riesgo] `SIN_DEPARTAMENTO` se vuelve un cajón de sastre permanente si nadie reclasifica manualmente después** → Mitigación: contador `tlaxiacoFallbackDepartment` visible en cada corrida del reporte hace explícito el tamaño del pendiente; reclasificación real es responsabilidad de `admin-departments`/`admin-products` vía UI, fuera de scope de este seeder (ver Non-Goals).
- **[Riesgo] Si en el futuro el Excel fuente sí trae `Departamento` para alguna de estas 38 filas (corrección de captura), la corrida subsiguiente NO reasigna el departamento del producto ya creado** → Ya es el comportamiento general de Tlaxiaco (no-agresivo, D9 del change original: un producto ya matcheado/creado no se actualiza por nombre/unit/departamento en corridas futuras) — este change no cambia esa política, sólo la extiende al caso fallback. Mitigación: mismo camino de reclasificación manual que el riesgo anterior.
- **[Trade-off] No hay heurística de clasificación automática por palabra clave** → Aceptado explícitamente (ver Non-Goals) — evita clasificar mal en silencio 38 productos reales de categorías mixtas (ferretería + agroquímicos) sin revisión humana.
