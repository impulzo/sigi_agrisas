## Context

Ver `proposal.md` - Why. Estado actual relevante:

- `app/_hooks/useBranchesOptions.ts` ya existe y resuelve "traer todas las sucursales activas" con caché de módulo (TTL 5 min) — pero no cubre el patrón "si no hay bypass, usar sólo mi sucursal + auto-seleccionar" que sí necesitan POS/Cotizaciones/Facturación.
- Los 3 call sites duplicados (`PosPage.tsx:84-140`, `QuoteCreatePage.tsx:43-68`, `NewInvoicePage.tsx:27-42`) usan el mismo endpoint `GET /api/v1/admin/branches?pageSize=100&includeInactive=false` y el mismo fallback `{id: ownBranchId, code:"", name:"Mi sucursal", isHeadquarters:false}`, pero difieren en detalles menores no funcionales: `PosPage`/`QuoteCreatePage` usan `import("../../../_lib/authFetch").then(...)` (dynamic import), `NewInvoicePage` usa import estático top-level. `QuoteCreatePage` además mapea la respuesta a `{id, name}` en vez de guardar el `BranchOption` completo.
- `src/modules/billing/application/use-cases/DownloadInvoiceFileUseCase.ts:7` importa desde `../../infrastructure/services/resolveSatDescription`. Ese archivo (`resolveSatDescription.ts`) no tiene ninguna dependencia real de infraestructura (Prisma/Next/IO) — sólo define `interface SatCodeSearchUseCase` (un port) y una función pura que lo consume.

## Goals / Non-Goals

**Goals:**
- Un único punto de verdad para la lógica "resolver sucursales según bypass admin" (fila 1 de Historia de Usuario), consumido de forma idéntica por los 3 call sites.
- `resolveSatDescription.ts` ubicado en `application/services/`, sin imports de `application/` hacia `infrastructure/` en el módulo `billing` (fila 2).
- Cero cambio de comportamiento observable end-to-end (mismo endpoint, mismo payload, misma UX de selector de sucursal, misma resolución de descripciones SAT).

**Non-Goals:**
- No se toca el otro hook (`useBranchesOptions.ts`) ni se fusiona con el nuevo — resuelven necesidades distintas (lista simple vs. lista con fallback single-branch + selección).
- No se corrigen otras violaciones de capas del repo fuera de `billing/DownloadInvoiceFileUseCase.ts` (no se encontraron más en el área explorada).
- No se introduce caché en el hook nuevo (los 3 call sites originales tampoco cacheaban; agregarla sería scope creep no pedido).

## Decisions

**D1 — El hook nuevo (`useBypassBranchOptions`) posee el estado `selectedBranchId`/`setSelectedBranchId`, no sólo `branches`.**
Los 3 call sites usan `selectedBranchId` en múltiples puntos (cálculo de precios, submit, offline-guard, props a hijos) y su único punto de escritura además del efecto de auto-selección es el `onChange` del selector de sucursal (`onBranchChange={setSelectedBranchId}`). Devolver también el setter evita que cada page mantenga un `useState` paralelo que sólo se sincroniza con el hook — eliminaría la duplicación a medias. Alternativa descartada: hook que sólo devuelve `branches` y deja `selectedBranchId` en cada page — rechazada porque no elimina la duplicación del `useState` + lógica de auto-selección en el `useEffect`, que es la mitad del código repetido.

**D2 — Tipo `BranchOption` propio en el hook, sin importar el de `pos/_logic/types/api.ts`.**
La regla del proyecto es explícita: "`_hooks/` (global): React/framework-agnostic; no importa de `app/(private)/(public)`". El hook define su propio `interface BranchOption { id: string; code: string; name: string; isHeadquarters: boolean }` (superset del shape real que devuelve el endpoint). Los call sites siguen usando su propio tipo importado de `pos/_logic/types/api.ts` — estructuralmente compatible, TypeScript no requiere cast. Alternativa descartada: mover `BranchOption` a un tipo compartido en `app/_lib/` — fuera de alcance, ningún call site lo pidió y el tipo ya vive correctamente en `pos/_logic/types/api.ts` para su propio dominio.

**D3 — Import de `authFetch` estático (no dynamic) en el hook nuevo.**
`useBranchesOptions.ts` (hook hermano ya existente en el mismo directorio) usa import estático top-level de `authFetch`. Se sigue ese precedente por consistencia dentro de `app/_hooks/`, en vez de replicar el `import("../../../_lib/authFetch").then(...)` de `PosPage`/`QuoteCreatePage`. Sin efecto observable: `authFetch` ya se importa estáticamente en el top-level de esos mismos archivos para otros usos, así que no hay ganancia real de code-splitting que se pierda.

**D4 — Reubicación de archivo (`git mv` semántico) en vez de crear un adapter/wrapper.**
Para D2 de la fila 2 de Historia de Usuario: mover `resolveSatDescription.ts` completo a `application/services/`, sin cambiar su contenido ni envolverlo en un port adicional. Es la corrección mínima suficiente — el archivo ya es puro, no necesita una interfaz nueva ni un adapter; sólo necesita vivir del lado correcto de la frontera hexagonal. Alternativa descartada: dejar el archivo en `infrastructure/` y crear un port + implementación en `application/` que lo envuelva — over-engineering para una función pura de una sola responsabilidad, agrega indirección sin beneficio.

## Risks / Trade-offs

- [`QuoteCreatePage.tsx` hoy mapea `branches` a `{id, name}` en vez de guardar el `BranchOption` completo; al migrar al hook, `branches` pasa a incluir `code`/`isHeadquarters` también ahí] → Sin riesgo real: `QuoteCreatePage` sólo consume `id`/`name` de cada branch en su render actual (selector simple), los campos extra son ignorados por el JSX existente, no rompen tipos porque `BranchOption` es un superset.
- [Cambiar de dynamic import a static import de `authFetch` en el hook (D3) podría en teoría afectar el bundle inicial de páginas que hoy no cargaban `authFetch` de forma eager] → Mitigado: verificado que `authFetch` ya es import estático top-level en `PosPage.tsx` y `QuoteCreatePage.tsx` para otros usos (submit, etc.), así que no se añade peso nuevo al bundle inicial de esas rutas.
- [Mover un archivo de módulo backend (`resolveSatDescription.ts`) podría romper algún import no detectado por el grep] → Mitigado: `grep -rn "resolveSatDescription"` ejecutado sobre `src/` y `tests/` durante la exploración enumeró los 5 imports exhaustivamente (2 en infra, 1 en application, 2 en tests) — se listan todos en tasks.md y se verifica con un grep final post-cambio.

## Migration Plan

Cambio interno sin despliegue de datos ni migración de BD. Pasos (ver `tasks.md` para detalle):
1. Crear el hook nuevo (aditivo, no rompe nada existente).
2. Migrar los 3 call sites uno por uno, verificando build/tests entre cada uno.
3. Mover `resolveSatDescription.ts` y actualizar los 5 imports en un solo paso atómico (mover + actualizar imports en el mismo commit lógico, para no dejar el árbol en estado roto).
4. Verificación final: `npm run build` + `npm test` completos + smoke manual (ver proposal.md, Criterios de Aceptación).

Rollback: revertir el commit del change; no hay estado persistente ni migración que revertir aparte del código.

## Open Questions

Ninguna — alcance y decisiones ya cerrados por el usuario en Plan Mode antes de este proposal.
