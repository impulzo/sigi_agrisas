## Context

Auditoría del repo (ver proposal.md) detectó lógica duplicada cross-módulo y deuda de diseño. Este cambio es cross-cutting (toca `src/shared/`, 13 controllers, 6 use-cases de reportes, 13+ generadores PDF, y 20 archivos de frontend), por eso requiere design.md antes de tasks.md: hay decisiones de nomenclatura/ubicación de los nuevos módulos compartidos y de resolución de conflicto (`useBranchesOptions`) que conviene fijar antes de tocar código, para no improvisar convenciones distintas archivo por archivo.

`skip_specs: true` está declarado en `.openspec.yaml`: ninguna historia (filas 1-9 de la tabla en proposal.md) cambia comportamiento observable de ninguna API o pantalla — son extracciones de lógica idéntica a un solo lugar, no nuevas reglas de negocio. Las specs existentes (paginación `pageSize` máx. 100, reglas RFC/taxRegime, redondeo banker's, `design-system`) ya documentan el comportamiento correcto; este cambio solo alinea la implementación con esas reglas ya vigentes.

## Goals / Non-Goals

**Goals:**
- Una sola implementación por pieza de lógica duplicada (filas 2-6, 9 de la tabla), sin cambiar el resultado observable.
- Alinear 5 archivos con el átomo `Icon` existente y 1 archivo con la escala tipográfica ya vigente (filas 7-8), sin tocar el guardarraíl.
- Eliminar basura y deuda de dependencias mal ubicadas (fila 1) sin romper build/tests.

**Non-Goals:**
- No se cambia ninguna regla de negocio (montos, validaciones, paginación) — solo su ubicación en el código.
- No se extiende el guardarraíl `tokens.test.ts` para detectar iconos crudos (fuera de alcance de esta auditoría; podría proponerse en un change futuro).
- No se toca el fragmento de "branch access bypass" repetido en Payments/Sales/Waybills (descartado explícitamente en proposal.md — semántica distinta en cada uno).
- No se toca `w-[Npx]`/`h-[Npx]` arbitrario en tablas (no viola ninguna regla de `designer.md`).

## Decisions

**D1 — Ubicación de helpers backend compartidos** (filas 2, 4, 5, 6 de la tabla)
Todos los helpers de dominio puro (`roundHalfToEven`, redondeo de dinero de reportes) van a `src/shared/domain/services/`; los validadores Zod (`entityCodeSchema`, `rfcSchema`, `taxRegimeSchema`) van a `src/shared/infrastructure/http/validators.ts`; `formatDate`/`formatDateTime` va a `src/shared/infrastructure/formatters/formatDate.ts`. Sigue la convención ya establecida por `src/shared/infrastructure/http/parseListQuery.ts` y `src/shared/infrastructure/folios/allocateFolio.ts` — separar dominio puro (sin I/O) de infraestructura (Zod, formatters). Alternativa descartada: un único `src/shared/utils.ts` fourre-tout — rechazada porque rompe la separación domain/infrastructure que el resto del proyecto ya respeta.

**D2 — `roundHalfToEven` es una función, no un servicio con estado** (fila 2)
Se extrae como función pura `(value: number, decimals: number) => number`, sin clase ni inyección de dependencias — coincide con la firma actual en los 6 archivos (ya es una función local, no un método de instancia). Los 6 `*TotalsCalculator`/`KardexAssembler` la importan directo. Riesgo de seguridad de la tabla (fila 2, "ningún cambio de comportamiento numérico observable"): se cumple por construcción, ya que el algoritmo (floor+epsilon) se copia sin alterar, solo se mueve.

**D3 — DESCARTADO en implementación: `computeTotalsClient.ts` mantiene su copia local de `bankersRound`** (fila 2)
Plan original: importar `roundHalfToEven` desde `src/shared/domain/`, asumiendo que ese árbol es seguro para cliente al ser dominio puro sin Prisma/Next. Descartado sin llegar a probar build: el propio `computeTotalsClient.ts` ya documenta inline la regla "`app/` (frontend) may not import runtime code from `src/` (backend-only)" — una regla más amplia que src/shared/domain/ también viola, no solo src/modules/. La copia de cliente (`bankersRound`) se mantiene intacta, consistente con la duplicación intencional ya presente en ese archivo.

**D4 — `parseListQuery` no se reescribe, los 13 controllers se adaptan a su forma** (fila 3)
El helper existente ya define la forma canónica (page/pageSize/includeInactive). Donde un controller tiene params adicionales (`search`, filtros de fecha), se extiende el schema Zod componiendo `parseListQuery`'s output shape con `.extend()` o un segundo `z.object` para los campos propios del módulo — nunca se descarta el helper para mantener el propio. Migración módulo por módulo (no en un solo commit) para poder correr tests intermedios y aislar regresiones. Orden sugerido: empezar por los módulos sin filtros extra (`users`, `products`) antes que los que sí tienen (`reports`, `pos`).

**D5 — CORREGIDO en implementación: mensajes en inglés, sin `.toUpperCase()` forzado en el schema** (fila 4)
Plan original: unificar mensajes en español (asumiendo que `CustomersController`/`ProviderController` ya estaban en español) y normalizar RFC con `.toUpperCase()` vía `.transform()` en el schema compartido. Revertido tras inspección (tarea 19): es al revés — `Customers`/`Provider` ya usaban mensajes en INGLÉS, igual que `entityCodeSchema` de Folios/Departments/etc., que es el patrón dominante en el resto del backend; `Purchases` era el único outlier en español. Se mantiene inglés (patrón dominante) y sin normalización forzada en `taxRegimeSchema`. `Customers`/`Provider` ya normalizaban RFC igual (`.trim().toUpperCase()` antes de validar) por su cuenta — cero cambio de comportamiento confirmado. `PurchasesController` no se migró (ver 5.4 en tasks.md): su schema valida el regex antes de uppercase y trimea `taxRegime`, comportamiento distinto al del schema compartido — migrarlo cambiaría validación observable.

**D6 — `useBranchesOptions` unificado hereda semántica del hook de mayor adopción** (fila 9)
Con 19 de 20 usos en el hook de `inventory/_logic/hooks/`, ese es el comportamiento "de facto" que ya validó el mayor tráfico de la app: TTL 5 min, filtro server-side `includeInactive=false`, seed de estado inicial desde cache. Se le añade `refresh()` (tomado del otro hook) porque `UserEditModal.tsx` lo necesita y no tiene sustituto. El resultado vive en `app/_hooks/useBranchesOptions.ts` (ubicación ya correcta según CLAUDE.md: "`_hooks/` global, reutilizable en ≥2 módulos"), y se borra la copia de `inventory/_logic/hooks/`. Alternativa descartada: mantener 2 hooks con nombres distintos — rechazada porque no resuelve la causa raíz (nadie debería tener que elegir cuál importar) y perpetúa el riesgo de que un futuro archivo importe "el equivocado" sin darse cuenta.

**D7 — Iconos: se usa el átomo `Icon` con los mismos nombres de símbolo, sin crear variantes nuevas** (fila 7)
`Icon` ya envuelve `material-symbols-outlined`; el cambio es mecánico (reemplazar `<span className="material-symbols-outlined ...">nombre</span>` por `<Icon name="nombre" className="..." />`), preservando clases de estilo adicionales (tamaño, color, `animate-spin`) como props/className pass-through. Si `Icon` no soporta alguna clase necesaria hoy (ej. `animate-spin` en el ícono de progreso de `ImageUploadField`), se verifica su prop API antes de migrar ese caso puntual — no se modifica el átomo salvo que sea estrictamente necesario para no crecer su superficie sin necesidad.

## Risks / Trade-offs

- [Migrar 13 controllers a `parseListQuery` puede introducir una regresión sutil en un módulo con filtros propios complejos (`reports`, `pos`)] → Migrar uno a la vez, correr su suite de tests después de cada uno, no migrar todos en un solo commit.
- [Unificar `useBranchesOptions` cambia TTL de 60s a 5min para el único consumidor que tenía 60s (`UserEditModal`)] → Verificado como aceptable: la lista de sucursales cambia con muy baja frecuencia (evento admin explícito), 5 min de staleness no afecta el flujo de asignar sucursal a un usuario. Se prueba manualmente tras el cambio.
- [Normalizar `rfcSchema` con `.toUpperCase()` por defecto podría cambiar el valor persistido en un controller que antes no normalizaba] → Revisar cada uno de los 3 controllers afectados (`Customers`, `Provider`, `Purchases`) antes de aplicar; si alguno depende de preservar el case original por alguna razón no documentada, se detiene esa migración puntual y se reporta en vez de forzarla.
- [`computeTotalsClient.ts` podría no poder importar de `src/shared/domain/` si ese árbol arrastra alguna dependencia de servidor no evidente] → Verificar con `npm run build` antes de aplicar (D3); fallback documentado es mantener la copia en cliente.
- [Volumen alto de archivos tocados (13 + 13 + 8 + 6 + 20 + 5 ≈ 65 archivos) aumenta la chance de un import roto o un olvido] → `npm run build` (type-check) después de cada bloque de la tabla (no solo al final), no solo al terminar todo.

## Migration Plan

No aplica despliegue/rollback especial — es un refactor de código sin migración de datos ni cambio de contrato HTTP/UI. Rollback estándar: revertir el/los commits del change si `npm run build`/`npm test` fallan en CI.

## Open Questions

Ninguna — el alcance y las decisiones de nomenclatura/ubicación ya quedaron fijadas en este documento; lo que falta es orden de ejecución, que se resuelve en tasks.md.
