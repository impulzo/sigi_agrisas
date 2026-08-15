## Context

Ver `proposal.md` — Why. Hoy `app/(private)/reports/cash-cut/` y `app/(private)/reports/customer-collections/` son dos árboles `_blocks`/`_logic` completos e independientes, cada uno con su propio `page.tsx`, hook (`useCashCut`, `useCustomerCollectionsReport`), servicio, tipos y export PDF/Excel. Ambos backends (`GetCashCutReportUseCase`, `GetCollectionsReportUseCase`) permanecen intactos — este cambio es puramente de reorganización de UI: mover los dos árboles bajo una sola ruta y envolverlos en un contenedor de tabs.

## Goals / Non-Goals

**Goals:**
- Una sola ruta `/reports/collections` con tabs "Global" / "Por Cliente" (Historia 1).
- Gating de tab forzado cuando el usuario solo tiene uno de los dos permisos, ocultando el `SegmentedButton` superior (Historia 2).
- Hub con 1 tarjeta "Cobranza" en vez de 2 (Historia 3).
- Mover el código existente (`_blocks`, `_logic`) sin reescribir su lógica interna: mismos hooks, mismos servicios, mismos cálculos, mismas exportaciones PDF/Excel.

**Non-Goals:**
- No se unifican los DTOs de backend ni los endpoints (`/api/v1/admin/reports/cash-cut`, endpoint de customer-collections se mantienen tal cual).
- No se agrega un tercer corte ni se cambia ninguna regla de cálculo de totales/IVA.
- No se agregan redirects de compatibilidad desde las rutas viejas — se eliminan directamente (project convention: sin shims de compatibilidad no solicitados).

## Decisions

### 1. Estructura de carpetas: mover árboles completos bajo subcarpetas por tab, no fusionar archivos

```
app/(private)/reports/collections/
├── page.tsx                          # Server Component, metadata "Cobranza"
├── _blocks/
│   ├── CollectionsPage.tsx           # NUEVO: contenedor de tabs (SegmentedButton + gating)
│   ├── global/                       # movido de cash-cut/_blocks/, sin cambios internos
│   │   ├── GlobalCollectionsView.tsx # renombrado de CashCutPage.tsx (pierde PageShell/permission-check, los absorbe CollectionsPage)
│   │   ├── CashCutFilters.tsx
│   │   ├── TotalsCards.tsx
│   │   ├── PaymentMethodBreakdownTable.tsx
│   │   └── CollectionsRowsTable.tsx
│   └── by-customer/                  # movido de customer-collections/_blocks/, sin cambios internos
│       ├── ByCustomerCollectionsView.tsx # renombrado de CustomerCollectionsPage.tsx (pierde PageShell/permission-check)
│       ├── CollectionsFilters.tsx
│       ├── ByCustomerTable.tsx
│       └── ByTicketTable.tsx
└── _logic/
    ├── global/                       # movido de cash-cut/_logic/, sin cambios internos
    │   ├── hooks/useCashCut.ts
    │   ├── services/index.ts
    │   └── types/{api,domain}.ts
    └── by-customer/                  # movido de customer-collections/_logic/, sin cambios internos
        ├── hooks/useCustomerCollectionsReport.ts
        ├── services/index.ts
        └── types/{api,domain}.ts
```

**Por qué**: los dos `_logic/services/index.ts` actuales tienen el mismo nombre de archivo en carpetas hermanas distintas — fusionarlos en un solo `_logic/services/` produciría colisión de nombres o forzaría renombrarlos, aumentando el diff y el riesgo de tocar lógica interna. Mantenerlos en subcarpetas `global/`/`by-customer/` es un mover-carpeta casi mecánico (git detecta el rename), preserva imports internos relativos casi intactos, y dos hooks/servicios independientes por tab es exactamente lo que pide la Historia 1 (filtros y fetch independientes por tab).

**Alternativa descartada**: fusionar todo en un solo `_logic/hooks/`, `_logic/services/` con nombres tipo `useGlobalCollections.ts` / `useCustomerCollections.ts`. Descartada por mayor diff (rename de archivos internos, no solo de carpeta) sin beneficio funcional — el proposal exige explícitamente "reutilizar los componentes existentes tal cual, solo reorganizando carpetas e importaciones".

### 2. `CollectionsPage.tsx` como único punto de permission-check y gating de tabs

`GlobalCollectionsView` y `ByCustomerCollectionsView` (ex-`CashCutPage`/`CustomerCollectionsPage`) dejan de hacer su propio `if (canRead === "loading")` / `if (canRead === false)` / `<PageShell>` — eso sube a `CollectionsPage.tsx`, que:
1. Resuelve `canGlobal = can("reports:cash_cut_read")`, `canByCustomer = can("reports:customer_collections_read")`.
2. Si ambos `=== false` → `<EmptyState icon="block" title="Sin acceso" .../>` (Historia 1, Historia 2).
3. Si alguno está en `"loading"` y el otro no es `false` → trata optimista (no bloquea), igual que el patrón ya usado en `useCurrentUser().can()` en el resto del módulo.
4. Determina `forcedView: View | null` — `"global"` si solo `canGlobal`, `"customer"` si solo `canByCustomer`, `null` si ambos.
5. Renderiza `<PageShell title="Cobranza" backHref="/reports">`, con `SegmentedButton<View>` solo si `forcedView === null` (mismo patrón que `PosHeader` ocultando el toggle Venta/Cotización cuando falta permiso — Historia 2).
6. Renderiza `<GlobalCollectionsView />` o `<ByCustomerCollectionsView />` según `view` efectivo (`forcedView ?? view`).

**Por qué**: evita que cada vista dependa dos veces de `useCurrentUser()` con checks divergentes, y centraliza el único lugar donde vive la regla de gating de la Historia 2 — igual que POS centraliza el forzado de modo en `PosHeader`/página POS en vez de repetirlo en `CartPanel`.

### 3. Filtros y fetch independientes por tab (sin lift-state)

`GlobalCollectionsView` sigue manejando su propio `useState` de `from`/`to`/`branchId` y llamando `useCashCut(...)` con esos valores; `ByCustomerCollectionsView` hace lo mismo con `useCustomerCollectionsReport`. `CollectionsPage.tsx` NO comparte estado de filtros entre tabs — cada vista monta/desmonta con `view === "global" ? <GlobalCollectionsView/> : <ByCustomerCollectionsView/>`, igual que hoy `customer-collections` monta `ByCustomerTable`/`ByTicketTable` condicionalmente. Al cambiar de tab y volver, los filtros de cada vista se reinician a sus defaults (mismo comportamiento que hoy tienen al navegar entre las dos rutas separadas) — no se requiere preservar estado entre montajes, la Historia 1 solo exige que no se compartan entre sí.

**Por qué**: es el comportamiento actual (dos páginas separadas = dos montajes independientes); conservarlo evita introducir manejo de estado nuevo (lift a `CollectionsPage`) no pedido por el proposal.

### 4. Rutas viejas: eliminación directa, sin redirect

Se borran `app/(private)/reports/cash-cut/` y `app/(private)/reports/customer-collections/` completos (incluyendo sus `page.tsx`). No se agrega `redirect()` de Next.js desde las rutas viejas — el proyecto no usa shims de compatibilidad salvo pedido explícito, y no hay indicios de bookmarks/integraciones externas a esas rutas (uso interno del panel).

### 5. Export PDF/Excel: sin cambios en `_logic/services`, solo en el path de import

Los servicios de export (`exportPdf`/`exportXlsx` dentro de cada `_logic/*/services/index.ts`) llaman a los mismos endpoints (`/api/v1/admin/reports/cash-cut`, endpoint de customer-collections) sin cambios — la Historia 1 ("exporta solo la tab activa") ya se cumple gratis porque cada tab tiene su propio botón conectado a su propio servicio; no hay export unificado que filtrar.

## Riesgos / Trade-offs

- **[Riesgo]** Renombrar `CashCutPage.tsx`→`GlobalCollectionsView.tsx` y `CustomerCollectionsPage.tsx`→`ByCustomerCollectionsView.tsx` rompe cualquier import externo a esos nombres. → **Mitigación**: `Explore`/grep antes de mover, para confirmar que no se importan desde fuera de sus propios `page.tsx` (esperado, dado el patrón `_blocks` privado del resto del módulo).
- **[Riesgo]** Tests existentes (si los hay) bajo `tests/unit/ui/` referencian rutas/paths viejos de `cash-cut`/`customer-collections`. → **Mitigación**: localizar y mover/actualizar imports de esos tests como parte de `tasks.md`, no dejarlos rotos.
- **[Trade-off]** Perder el estado de filtros al cambiar de tab y volver (no hay lift-state) puede sentirse como regresión menor de UX vs. una app con tabs "reales" que preservan estado. Aceptado porque el proposal no lo pide y añadirlo es alcance nuevo no solicitado.
