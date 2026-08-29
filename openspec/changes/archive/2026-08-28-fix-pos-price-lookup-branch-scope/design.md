## Context

Ver `proposal.md` — Why. El backend (`ListProductPricesUseCase`, `PrismaProductPriceRepository.findEffectiveForBranch`, `resolveEffectivePrices`) ya soporta `GET /api/v1/admin/products/:id/prices?branchId=<id>` desde `add-branch-scoped-prices` y ya está probado. El único componente sin actualizar era el cliente: `getProductPrices()` (`app/(private)/pos/_logic/services/getProductPrices.ts`), consumido por `PosPage.tsx`, `QuoteCreatePage.tsx`, `QuoteEditPage.tsx`, `EditSalePage.tsx` y `PartialInvoiceForm.tsx` (billing).

## Goals / Non-Goals

**Goals:**
- Que `PriceTierPicker` reciba los precios efectivos de la sucursal correcta en las 4 pantallas de venta/cotización (Historias 1 y 2 de `proposal.md`).
- Mantener retrocompatibilidad: llamar `getProductPrices(productId)` sin `branchId` sigue funcionando igual que antes (precios base únicamente) — usado deliberadamente por `PartialInvoiceForm`.

**Non-Goals:**
- No se modifica el backend, contrato de API, ni permisos — ya cumplen lo necesario.
- No se hace branch-aware la caché offline (`getProductPricesFromCache`/`catalogPrices`) — es una limitación preexistente y separada del módulo `offline-sync`, con su propio historial de fixes/gating (`fix: gate offline sale/quote creation by fixed working branch`). Abordarlo es un change de alcance distinto.
- No se toca `PartialInvoiceForm.tsx` (billing) — su spec (`billing-ui`) documenta explícitamente `getProductPrices(productId)` sin `branchId` como comportamiento intencional (la factura no está atada a una sucursal operativa).

## Decisions

**D1 — `branchId` como segundo parámetro posicional, antes de `fetchImpl`.**
`getProductPrices(productId, branchId?, fetchImpl = authFetch)`. Alternativa considerada: objeto de opciones (`{ branchId, fetchImpl }`). Se descartó por sobre-ingeniería — la función sólo tiene 2 parámetros configurables y el patrón posicional-con-último-parámetro-inyectable-para-tests ya es el usado en el resto de `_logic/services/` del proyecto (ver `createSale.ts`, `getProductDosifications.ts`). Responde a Historia 1 y 2: mismo mecanismo, distinta fuente del valor.

**D2 — Cada pantalla resuelve su propio `branchId`, sin crear un hook compartido.**
`PosPage`/`QuoteCreatePage` usan su estado local `selectedBranchId` (sucursal elegida por el operador para esa venta/cotización); `EditSalePage`/`QuoteEditPage` usan `sale.branchId`/`quote.branchId` (inmutables, ya cargados del recurso). Alternativa considerada: extraer un hook `useOperatingBranchId()` único. Se descartó porque la fuente correcta difiere por diseño entre "crear" (sesión/selección del usuario) y "editar" (recurso ya persistido) — unificarlas detrás de un hook oscurecería justo la distinción que exige la Historia 2 (usar el branch de la venta, no el de la sesión).

**D3 — `branchId` se envía como `string | null`, coalescido con `|| null` / `?? null` en cada call site.**
`selectedBranchId` es `useState<string>("")` (string vacío antes de elegir sucursal); `sale`/`quote` pueden ser `undefined` mientras cargan. `getProductPrices` sólo agrega `?branchId=` cuando el valor es truthy, así que tanto `""` como `null`/`undefined` producen la misma URL sin `branchId` (comportamiento idéntico al anterior al fix). No se introduce un estado de carga adicional ni un guard extra — el fallback ya es seguro.

**D4 — Caché offline (`getProductPricesFromCache`) no recibe `branchId`.**
Se mantiene la firma de fallback sin cambios; en modo offline, el cajero sigue viendo únicamente precios base cacheados (comportamiento preexistente, sin regresión ni mejora). Ver Non-Goals.

## Risks / Trade-offs

- **[Riesgo] Un cajero en un producto con override de sucursal pero SIN precio base global, que cae a modo offline a mitad de turno, seguirá sin ver ningún precio** (la caché no es branch-aware) → Mitigación: sin cambio de comportamiento respecto a hoy; documentado explícitamente como Non-Goal, no una regresión introducida por este fix.
- **[Riesgo] `selectedBranchId === ""` en modo bypass de admin antes de elegir sucursal sigue devolviendo sólo precios base** (mismo comportamiento que la Historia 1 exige explícitamente como fallback, no un bug) → Sin mitigación necesaria, es el comportamiento deseado.
- **[Trade-off] No se centraliza la resolución del `branchId` en un solo hook** → Aceptado (ver D2): la duplicación de 2 líneas por pantalla es más clara que una abstracción que mezclaría dos fuentes semánticamente distintas.
