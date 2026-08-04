## Context

`add-carta-porte`/`carta-porte-ui` (archivados en este mismo change) implementaron un único tipo de traspaso entre sucursales, siempre timbrado con CFDI Traslado + Complemento Carta Porte. La Historia 1 de la tabla de usuario expone que eso es innecesario cuando ambas sucursales están en la misma ciudad, y la Historia 6 expone un bloqueo real: sin domicilio fiscal estructurado en `BranchEditModal`, ningún traspaso Carta Porte puede crearse hoy desde la interfaz.

Decisiones de negocio ya cerradas con el usuario (no reabrir):
- Selección de tipo manual pura — sin inferencia por municipio.
- Folios separados: `TRI` (simple) y `TS` (Carta Porte).
- `waybills:stamp` como permiso nuevo, solo para Carta Porte.
- Traspaso simple exige `productId` en toda línea — sin líneas libres.

## Goals / Non-Goals

**Goals:**
- Dos tipos de traspaso en un solo módulo `waybills`, discriminados por `type`, reusando inventario/scoping/cancelación/listado.
- Traspaso simple operable end-to-end sin ningún dato de Carta Porte.
- Traspaso Carta Porte gated por `waybills:stamp`, sin cambios de comportamiento.
- Domicilio fiscal estructurado capturable desde `BranchEditModal`.

**Non-Goals:**
- Inferencia automática de tipo por municipio — decisión de negocio, no se reabre.
- Cambios al pipeline de timbrado Facturama en sí (ya corregido en sesión previa: emisor completo en el payload).
- Catálogo maestro de vehículos/operadores — sigue fuera de alcance (decisión heredada de `add-carta-porte`).

## Decisions

**D1 — Un módulo, discriminante `type`, no módulos paralelos**
Inventario (origen estricto / destino tolerante), branch scoping por origen-o-destino, cancelación y listado son idénticos entre los dos tipos — solo difiere si se valida domicilio/vehículo y si se timbra. Separar en módulos duplicaría toda esa lógica compartida. `type: "simple" | "carta_porte"` en `Waybill`, validado por Zod discriminated union en el controller.

**D2 — Entidad con campos nullable, no unión discriminada a nivel de dominio**
`domain/entities/Waybill.ts` gana `type`/`notes` y los 14+8 campos exclusivos de Carta Porte pasan a `| null`, en vez de una unión de tipos a nivel de entidad. Una unión obligaría a `mapWaybill` (que construye desde una fila plana de Prisma) y a todo consumidor a ramificar en cada acceso; el estrechamiento fuerte se aplica mejor en el borde (Zod discriminated union en el controller, DTOs de request tipados por unión).

**D3 — `StampCallback` opcional explícito (`| null`, no `?:`)**
`WaybillRepository.createCompleted(data, stamp: StampCallback | null)`. Mismo patrón que el puerto ya usa para `CancelStampCallback`. Con TS strict, `| null` explícito fuerza a cada call site (use case, `InMemoryWaybillRepository`, tests) a declarar intención en vez de omitir por accidente — el fallo peligroso sería crear un Carta Porte sin timbrar por un parámetro olvidado.

**D4 — Folio `TRI`, separado de `TS`**
Traspaso simple aloca `TRI` (scope `INVENTORY`, seed nuevo en `prisma/seeds/folios.ts`) vía el mismo `allocateFolio` compartido. Numeración fiscal (`TS`) y numeración interna (`TRI`) quedan desacopladas — un traspaso simple nunca consume un número de folio fiscal.

**D5 — `waybills:stamp` como gate adicional, no reemplazo**
`waybills:write` sigue siendo necesario para ambos tipos (crear, en general). `waybills:stamp` se exige SOLO cuando `type === "carta_porte"`, verificado en el controller después del parseo Zod (el discriminante viene en el body). Consecuencia aceptada: un body malformado sin `waybills:stamp` puede recibir 400 antes que 403 — no hay forma de evitarlo sin leer el body como `unknown` antes de validarlo.

**D6 — Traspaso simple reusa `departureAt` como fecha única**
No se agrega columna `transferDate`. `departureAt` se queda `NOT NULL` en ambos tipos; solo `arrivalAt` (exclusivo de Carta Porte) pasa a nullable. Evita propagar una segunda fecha nullable por entidad, DTO, mapper y UI. El costo es semántico (la UI etiqueta el campo distinto según tipo: "Fecha de traspaso" vs "Salida estimada"), no estructural.

**D7 — Traspaso simple exige `productId`; sin líneas libres**
A diferencia de Carta Porte, donde una línea libre (mercancía no catalogada) es válida porque el CFDI documenta el traslado igual, un traspaso simple existe únicamente para mover stock — una línea sin `productId` no movería nada y no tiene otro propósito documental. La UI oculta "+ Línea libre" en modo simple; el backend lo rechaza con `ProductRequiredForSimpleTransferError` (400) como defensa en profundidad.

**D8 — Domicilio fiscal en `BranchEditModal`, patrón `ProviderEditModal`**
El backend ya soporta los 8 campos (`admin-branches`, sin delta nuevo en este change). La UI adopta el patrón de secciones con encabezado + separador ya usado en `ProviderEditModal` (`max-w-2xl`, `normalizeOptional` con `.trim()`), en vez de inventar un layout nuevo.

## Risks / Trade-offs

- **[Riesgo] Migración de 24+ columnas a nullable sobre datos reales** (~32 traspasos existentes en Supabase). Mitigado: `DROP NOT NULL` en Postgres es solo de catálogo, no reescribe filas; sin ventana de mantenimiento necesaria. Ver plan de migración.
- **[Riesgo] `z.discriminatedUnion` no acepta `ZodEffects`** — el schema actual de creación termina en `.refine()`. Se resuelve moviendo los refines a `.superRefine()` sobre la unión, en backend y cliente.
- **[Trade-off] Gate de `waybills:stamp` después del parseo Zod**: un payload malformado sin ese permiso da 400 en vez de 403. Aceptado — la alternativa exige leer `type` de un body sin tipar antes de validarlo.
- **[Riesgo] `WaybillsController.branchScoping.test.ts`** usa payloads Carta Porte con un mock de `AuthorizationService` que no concede `waybills:stamp` — se rompe si no se actualiza junto con el controller.

## Migration Plan

`prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script`, filtrado a mano a `waybills`/`waybill_items` (el entorno tiene drift ajeno preexistente en tablas RBAC que NO debe tocarse). Backfill `type='carta_porte'` con `DEFAULT` transitorio, luego `DROP DEFAULT`. `npx prisma migrate deploy` + `npx prisma generate`. Seeds (`folios.ts` +`TRI`, `seed.ts` +`waybills:stamp`) corridos después, idempotentes.

## Open Questions

_Resueltas:_
- ¿Selección de tipo automática o manual? → Manual pura (decisión del negocio).
- ¿Folio compartido o separado? → Separado (`TRI` vs `TS`).
- ¿Permiso de timbrado separado? → Sí, `waybills:stamp`.
- ¿Líneas libres en traspaso simple? → No, solo catálogo.

_Ninguna pendiente._
