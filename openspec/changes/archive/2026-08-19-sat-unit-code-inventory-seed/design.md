## Context

`Product.unit` (`prisma/schema.prisma`, `VARCHAR(32)`) no tiene FK al catálogo
`SatUnitOfMeasure` — decisión ya documentada en
`src/shared/infrastructure/sat-codes/resolveUnitDescriptions.ts:7-13` para
permitir re-sembrar el catálogo SAT sin romper referencias. La UI de edición
de producto (`ProductGeneralTab.tsx`) y el backend (`ProductsController.ts`)
ya asumen que `unit` contiene una clave real `c_ClaveUnidad`, validada por
formato (`^[A-Za-z0-9]{2,3}$`) pero no contra el catálogo. `products-api`
spec documenta explícitamente el caso "legacy data" (`unitDescription: null`)
como comportamiento válido — este cambio reduce cuántos productos caen en ese
caso, sin alterar la regla.

El único productor de datos afectado es el seeder de inventario
(`prisma/seeds/data/generate-inventory-data.ts` → `inventario-agrisas-v2.ts`
→ `seedInventory()`), que hoy pasa el texto crudo de la columna "Unidad" del
Excel (`"PZA"`, `"NA"`) directamente a `unit`.

Fila #1 de la Historia de Usuario en `proposal.md` es la única historia de
este cambio; todas las decisiones abajo responden a ella.

## Goals / Non-Goals

**Goals:**
- El generador emite claves SAT reales (`H87`, `ACT`) en vez de texto legado.
- El mapeo es explícito y auditable (whitelist), con warning visible ante
  cualquier valor de Excel no contemplado — nunca un mis-mapeo silencioso.
- Los productos ya sembrados en BD se actualizan re-corriendo el seeder
  existente (`npm run seed:inventory`), sin script de migración nuevo.

**Non-Goals:**
- No se toca `satProductCode` (fuera de alcance, confirmado con el usuario).
- No se agrega FK `Product.unit → SatUnitOfMeasure` (decisión arquitectónica
  previa y deliberada, fuera de alcance de este cambio).
- No se cambia ningún contrato de `products-api` (endpoints, DTOs,
  validaciones) — es una corrección de datos, no de comportamiento.

## Decisions

**D1 — Mapeo en el generador (`generate-inventory-data.ts`), no en el
seeder de runtime (`inventorySeedLogic.ts`).**
El generador es la única fuente que lee el Excel crudo; el seeder de runtime
sólo consume `inventario-agrisas-v2.ts` ya tipado (`InventoryRow`). Corregir
ahí evita que el archivo auto-generado vuelva a divergir en la próxima
regeneración desde Excel.
Alternativa descartada: mapear en `inventorySeedLogic.ts` — hubiera
funcionado para el run actual, pero el comentario "AUTO-GENERADO ... NO
editar a mano" se rompería en la próxima regeneración (el Excel seguiría
trayendo "PZA"/"NA" crudo).

**D2 — Whitelist explícita (`UNIT_CODE_MAP`) con fallback a warning, no
lookup dinámico contra `SatUnitOfMeasure`.**
El generador es un script standalone sin conexión a BD (lee Excel, escribe
TS) — conectarlo a Prisma para resolver contra el catálogo real sería un
salto de complejidad injustificado para 2 valores crudos conocidos
(`PZA`, `NA`). Un mapa estático cubre el caso real y el `console.warn` de
fallback protege contra valores futuros no anticipados sin bloquear la
regeneración.

**D3 — `"NA"` → `"ACT"` (Actividad), no `"E48"` (Unidad de servicio).**
Las 2 filas con `"NA"` son `DESCUENTO` (línea de ajuste, no un servicio) y
`SERVICIO DE ASESORIA EN RIEGO` (sí es un servicio). `ACT` es la clave SAT
genérica para conceptos no físicos/no medibles y cubre ambos casos con una
sola entrada de mapeo; usar `E48` sólo sería más preciso para la segunda fila
y dejaría la primera sin cubrir. Con sólo 2 filas totales, la precisión
adicional no justifica una tercera categoría en el mapa.

**D4 — Default de fallback = `"H87"` (Pieza), igual que el default previo
(`"PZA"`).**
Mantiene el criterio de negocio ya existente (línea 142 original: `?? "PZA"`)
para filas sin columna "Unidad" — sólo cambia la clave, no la semántica.

## Risks / Trade-offs

- **[Riesgo] El Excel trae en el futuro un tercer valor de "Unidad" no
  mapeado (ej. "KG", "LT")** → Mitigación: `console.warn` explícito en la
  regeneración hace el caso visible en el log del comando; no falla
  silenciosamente ni omite la fila (cae a `H87` con warning). Si esto ocurre,
  agregar la entrada al `UNIT_CODE_MAP` antes de re-sembrar.
- **[Riesgo] Clasificar "DESCUENTO" con `ACT` en vez de un código más
  específico de ajuste/descuento** → Mitigación: es una mejora sobre el
  estado actual (`"NA"`, que no resuelve descripción alguna); si se requiere
  mayor precisión más adelante, es un cambio de datos aislado (una fila) sin
  impacto en el generador.
- **[Trade-off] Re-sembrar (`npm run seed:inventory`) sobrescribe `unit` de
  cualquier producto que un admin haya editado manualmente desde entonces**
  → Aceptado: mismo comportamiento que ya tiene el seeder para `name`,
  `satProductCode`, `ivaRate`, etc. (upsert-por-code determinista); no es un
  riesgo nuevo introducido por este cambio.

## Migration Plan

1. Editar `generate-inventory-data.ts` (mapeo `UNIT_CODE_MAP`).
2. Regenerar `inventario-agrisas-v2.ts` localmente (Excel fuente ya presente
   en el repo local, no versionado).
3. Revisar el diff generado (sólo el campo `unit` debe cambiar).
4. Correr `npm run seed:inventory` contra la BD de desarrollo.
5. Verificar en `/catalogs/products` que la unidad se muestra como
   "Pieza"/"Actividad".

**Rollback**: revertir el commit de `generate-inventory-data.ts` +
`inventario-agrisas-v2.ts` y volver a correr `npm run seed:inventory` — el
upsert restaura `unit` al valor anterior sin pérdida de datos (mismo
mecanismo idempotente).

## Open Questions

Ninguna — alcance y mapeo ya confirmados con el usuario antes de este
artefacto (ver Historia de Usuario, fila #1, y decisión D3).
