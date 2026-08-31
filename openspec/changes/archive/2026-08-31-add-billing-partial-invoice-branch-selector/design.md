## Context

`PartialInvoiceForm.tsx` calcula `effectiveBranchId = branchId ?? hq?.id ?? null` (prop `branchId` viene de `useCurrentUser()` vía `NewInvoicePage.tsx:53`) y lo usa en los dos call sites de `getProductPrices` (`handleAddProduct`, `handleChangeTier`). El fix archivado `2026-08-30-fix-billing-invoice-price-branch-scope` sólo igualó esos dos call sites; no resuelve el caso de un usuario `branches:access_all` sin `branchId` propio en una DB sin ninguna sucursal `is_headquarters=true` — verificado en vivo (ver proposal.md).

`PosPage.tsx` ya resuelve el mismo problema de fondo (resolución de precios de catálogo por sucursal para un usuario bypass) con un patrón probado en producción: estado `selectedBranchId`, poblado condicionalmente según `isBypass`, sin autoselección para bypass, renderizado con el átomo `Select` del sistema de diseño (`_components/atoms/Select/Select`), no un `<select>` crudo — esto último importa porque `tests/unit/ui/design-system/tokens.test.ts` bloquea `<select>` crudos **nuevos** en `_blocks/` (los existentes, como los de "Forma de pago"/"Método de pago" en este mismo archivo, están en una allowlist de deuda ya declarada que sólo puede encoger, no crecer).

## Goals / Non-Goals

**Goals:**
- Dar a un usuario `branches:access_all` una forma explícita de elegir la sucursal cuyo catálogo de precios quiere consultar en Factura Parcial, replicando el patrón ya vigente en `PosPage`.
- Cero regresión para usuarios sin `branches:access_all` (Historia #2): comportamiento idéntico al actual.
- Eliminar la dependencia de `useHeadquarters()` como fallback silencioso, reemplazándola por selección explícita — evita que el comportamiento dependa de si alguien configuró una sucursal matriz.

**Non-Goals:**
- No se persiste `branchId` en `Invoice` ni se envía en `POST /invoices` — la factura parcial sigue sin scoping de sucursal en el modelo de datos (a diferencia de `Sale`/`Quote`).
- No se toca `StampSaleForm` (el otro modo de `/billing/new`, "Facturar venta") — ese flujo resuelve el `branchId` desde la venta seleccionada, no desde este selector.
- No se autoselecciona ninguna sucursal para el usuario bypass (ni HQ, ni la primera de la lista) — mismo criterio que `PosPage`, decisión deliberada para que el usuario sepa explícitamente bajo qué sucursal está consultando precios.
- No se modifica `ProductCatalogPanel` más allá de pasarle el nuevo `branchId` si aplica (ver Decisión 3) — su contrato de props ya soporta `branchId?: string`.

## Decisions

**1. Dónde vive el estado `selectedBranchId`: en `NewInvoicePage.tsx`, no en `PartialInvoiceForm.tsx`.**
`NewInvoicePage` ya es quien decide qué `branchId` pasarle a `PartialInvoiceForm` (hoy pasa el del usuario directo). Moviendo el estado un nivel arriba, `NewInvoicePage` puede decidir el `effectiveBranchId` final considerando `can("branches:access_all")` (ya lo tiene disponible vía `useCurrentUser()`) sin que `PartialInvoiceForm` necesite conocer el concepto de "bypass" — sigue recibiendo un simple `branchId: string | null` por prop, igual que hoy, sólo que ahora ese valor puede venir de una selección explícita en vez de sólo del JWT. Alternativa descartada: mover todo el estado a `PartialInvoiceForm` (como en `PosPage`, que sí es dueño de su propio `selectedBranchId`) — se descarta porque `PartialInvoiceForm` ya recibe `branchId` como prop controlada desde afuera; introducir un segundo estado interno paralelo (`selectedBranchId` local que a veces gana sobre la prop) sería más confuso que subir la decisión al padre, que además ya es responsable de leer permisos (`can`).

**2. `useHeadquarters()` se retira de `PartialInvoiceForm.tsx` sin reemplazo.**
Con el selector explícito, el fallback a HQ deja de ser necesario: si el usuario bypass no ha elegido nada, `effectiveBranchId` es `null` (mismo comportamiento documentado en el escenario "No branch resolves" de la spec, sin crash). Alternativa descartada: mantener HQ como fallback cuando el selector está en `""` — se descarta porque diluye el propósito del selector (el usuario ya tiene un control explícito; agregar un fallback implícito detrás reintroduce la misma opacidad que causó el bug original) y porque el criterio de aceptación de la Historia #1 pide que "no autoselecciona nada, igual que en POS".

**3. Selector construido con el átomo `Select`, mismo fetch que `useHeadquarters()`/`PosPage` usan hoy (`GET /admin/branches?pageSize=100&includeInactive=false`), sin nuevo hook compartido.**
Se descarta extraer un hook `useBranchSelector` reutilizable entre POS y Billing en este cambio — el fetch de sucursales activas ya es trivial (una función `useEffect` + `authFetch`, igual que en `PosPage`), y forzar una abstracción compartida ahora sin un tercer consumidor sería premature (regla de "no diseñar para lo hipotético" del proyecto). Si un tercer módulo necesita el mismo patrón, se extrae entonces.

**4. `ProductCatalogPanel` en Factura Parcial NO recibe `branchId`.**
A diferencia de `PosPage`, que pasa `branchId={selectedBranchId || undefined}` a `ProductCatalogPanel` (afecta qué columna de stock se muestra por sucursal), `PartialInvoiceForm` abre el catálogo dentro de un panel colapsable (`showCatalog`) sin ese prop hoy. Este cambio no lo agrega — está fuera de alcance (Historia #1 sólo pide que el precio se resuelva correctamente al agregar/cambiar tier, no que la tabla de catálogo muestre stock por sucursal). Si se quiere en el futuro, es un cambio incremental separado.

**5. Cambiar de sucursal no re-cotiza líneas ya agregadas (Historia #1, criterio de aceptación 4).**
`effectiveBranchId` sólo se lee en el momento de `handleAddProduct`/`handleChangeTier` — cambiar el selector después no dispara ningún efecto sobre `lines` ya existentes. Esto es consistente con `PosPage` (que tampoco re-cotiza el carrito al cambiar de sucursal) y evita que precios ya congelados en una línea cambien "por debajo" del usuario sin que él lo pida explícitamente.

## Risks / Trade-offs

- **[Riesgo] Un admin puede olvidar seleccionar sucursal y seguir viendo "$0.00"/"sin precios" para productos branch-scoped, sin entender por qué.** → Mitigación: fuera de alcance de este cambio (ya es el comportamiento documentado como "sin regresión" en la spec), pero el selector ahora hace visible *que existe una elección qué hacer* — antes no había ningún control en la UI que sugiriera esa causa. Una mejora futura (placeholder "Selecciona sucursal para ver precios por sucursal" o similar) queda fuera de alcance salvo que el usuario lo pida.
- **[Riesgo] Mover el estado a `NewInvoicePage` significa que cambiar de mode ("Facturar venta" ↔ "Factura parcial") podría perder la sucursal seleccionada si el componente se desmonta.** → Mitigación: aceptable — `StampSaleForm` no usa este estado, y volver a "Factura parcial" simplemente reinicia el selector a vacío, mismo comportamiento que recargar la página hoy. No se persiste en URL ni storage porque no hay Historia de Usuario que lo pida.
- **[Riesgo] Divergencia de patrón entre POS (branch selector dueño de `PosPage`, reutilizado en 3+ lugares: catálogo, carrito, submit) y Billing (selector más simple, sólo para precios).** → Mitigación: aceptable y documentado en Decisión 1 — Billing tiene un alcance más chico (no hay submit branch-scoped), replicar 1:1 toda la superficie de `PosPage` sería sobre-ingeniería para este caso.

## Migration Plan

Cambio de UI puro, sin migración de datos ni de API. Deploy estándar (build + verificación manual/Playwright, per convención del proyecto). Sin rollback especial — revertir el componente basta si aparece un problema.
