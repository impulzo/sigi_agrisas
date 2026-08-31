## Context

Ver `proposal.md` - Why. `effectiveBranchId` ya existe en `PartialInvoiceForm.tsx:38` (`branchId ?? hq?.id ?? null`) y ya se usa en `handleChangeTier` (línea 130). El único cambio necesario es reutilizar esa misma variable en `handleAddProduct` (línea 94), que hoy la omite.

## Goals / Non-Goals

**Goals:**
- Corregir el fix de la Historia de Usuario #1: `handleAddProduct` debe usar `effectiveBranchId` igual que `handleChangeTier`, para que ambos call sites vean el mismo set de precios (global + override de la sucursal efectiva).
- Cubrir con test de regresión el argumento `branchId` en ambos call sites de `getProductPrices` dentro de `PartialInvoiceForm`.

**Non-Goals:**
- No se toca `getProductPrices`, `ListProductPricesUseCase`, `PrismaProductPriceRepository` ni ningún endpoint — el bug es de un call site, no del servicio compartido (ya usado correctamente por POS/Cotizaciones/Editar venta).
- No se cambia la lógica de resolución de `effectiveBranchId` (headers de sesión, `useHeadquarters`) — se reutiliza tal cual.
- No se agrega selector de sucursal en `PartialInvoiceForm` ni se altera el permiso `billing:write`.

## Decisions

- **Reusar `effectiveBranchId` existente en vez de re-derivarlo en `handleAddProduct`**: la variable ya está en scope del componente (línea 38) y es la misma que `handleChangeTier` consume — evita divergencia futura y es el patrón que ya siguen POS/Cotizaciones/Ventas (`PosPage.tsx:195/220`, `QuoteCreatePage.tsx:90/112`, `EditSalePage.tsx:94/117`). Alternativa descartada: introducir un `branchId` propio por call site — rechazada porque reintroduce el riesgo de que un futuro cambio actualice un call site y no el otro (exactamente el bug actual).
- **Sync de `openspec/specs/billing-ui/spec.md` en vez de dejarlo como "implementación se adelantó al spec"**: el spec documentaba `getProductPrices(productId)` sin `branchId` como decisión intencional (heredada de `2026-08-28-fix-pos-price-lookup-branch-scope`). Como el modelo de datos real ya no sostiene esa decisión (mayoría de precios son overrides de sucursal), se actualiza el requisito para que vuelva a ser la fuente de verdad, no un texto obsoleto que un futuro cambio podría "corregir" de vuelta al bug.
- **Test de regresión por assert de argumento, no por fixture de datos**: se agrega un `expect(getProductPricesMock).toHaveBeenCalledWith(productId, effectiveBranchId)` en ambos call sites, en vez de simular filas de `ProductPrice` branch-scoped end-to-end — más barato y detecta exactamente la clase de bug que ocurrió (divergencia de argumento entre dos call sites del mismo componente).

## Risks / Trade-offs

- [Riesgo: `effectiveBranchId` puede resolver a `null` si no hay sesión con sucursal ni HQ configurada] → Mitigación: comportamiento idéntico al actual para ese caso (`getProductPrices` sin `branchId`, sólo precios globales) — no es una regresión nueva, ya documentado como escenario límite en el spec actualizado.
- [Riesgo: cambio de spec podría interpretarse como reabrir el alcance del proposal `2026-08-28-fix-pos-price-lookup-branch-scope` archivado] → Mitigación: el proposal archivado no se toca; sólo se actualiza el spec vigente de `billing-ui`, que es exactamente el mecanismo de OpenSpec para esto (delta spec, no edición retroactiva de un change ya archivado).
