## Context

`useCart` (`app/(private)/pos/_logic/hooks/useCart.ts:152`) firma `useCart(surchargePct = 0)`. Internamente delega el cálculo de totales a `computeTotalsClient` (`app/(private)/pos/_logic/lib/computeTotalsClient.ts:67`), que aplica el recargo solo a líneas fraccionarias/dosificadas. El backend calcula el mismo recargo vía `PosLookupService.getDosificationSurchargePct()` (`src/modules/pos/application/ports/PosLookups.ts:67`), leyendo `pricing_settings` (default 5%, `PricingSettings.ts:6`).

`PosPage.tsx` ya resuelve esto correctamente: obtiene el valor con el hook global `usePricingSettingsOptions()` (`app/_hooks/usePricingSettingsOptions.ts`, caché de módulo 60s con dedupe de promesa) y lo pasa a `useCart(dosificationSurchargePct)` (`PosPage.tsx:48,59`). Las otras 3 pantallas que instancian carrito (`QuoteCreatePage`, `QuoteEditPage`, `EditSalePage`) llaman `useCart()` a secas, heredando el default `0`.

Responde a la única fila de la Historia de Usuario en `proposal.md`: el operador ve un total desalineado del que el backend persiste al guardar.

## Goals / Non-Goals

**Goals:**
- Que `QuoteCreatePage`, `QuoteEditPage` y `EditSalePage` calculen el total en cliente con el mismo `dosificationSurchargePct` que usa el backend al guardar.
- Cero cambio de comportamiento en líneas sin dosificación/cantidad entera.
- Reutilizar el hook y patrón existentes sin crear abstracciones nuevas.

**Non-Goals:**
- No se toca el backend (`CreateSaleUseCase`, `EditCompletedSaleUseCase`, `CreateQuoteUseCase`, `UpdateQuoteUseCase`) — ya calcula correcto y es la fuente de verdad.
- No se añade soporte de dosificación a `QuoteItem` (fuera de alcance; las cotizaciones ya soportan solo el recargo por cantidad fraccionaria, no dosificación completa — confirmado en exploración: `QuoteItem` no tiene `dosificationId`).
- No se modifica `usePricingSettingsOptions` ni `useCart` — su firma y caché ya son correctas.

## Decisions

**D1 — Reutilizar `usePricingSettingsOptions` en los 3 call sites, igual que `PosPage`.**
Alternativa descartada: pasar el valor por prop desde un componente padre común. Rechazada porque las 3 pantallas no comparten un padre React con ese dato disponible, y el hook ya tiene caché de 60s + dedupe, así que llamarlo 4 veces (incluyendo POS) no genera 4 fetches — es el patrón ya validado en producción por POS.

**D2 — No introducir loading state nuevo.**
El hook devuelve un valor inmediato (fallback `DEFAULT_SURCHARGE_PCT` mientras resuelve, ver `usePricingSettingsOptions.ts:32`) igual que en `PosPage`. Las 3 pantallas heredan ese mismo comportamiento sin código adicional — no hay estado de carga que gestionar explícitamente en la UI.

**D3 — Tests: un test por pantalla verificando el valor pasado a `useCart`, no un mock end-to-end de fetch.**
Suficiente para prevenir la regresión (que un refactor futuro vuelva a omitir el argumento) sin acoplar los tests al detalle de red del hook, que ya está testeado en `useCart.test.ts` y donde corresponda para `usePricingSettingsOptions`.

## Risks / Trade-offs

- **[Riesgo]** Si `pricing_settings` cambia entre que el operador abre la pantalla y guarda, el preview puede quedar stale por la caché de 60s. → **Mitigación:** mismo riesgo que ya acepta `PosPage` en producción; no es un caso nuevo introducido por este fix, y el backend siempre recalcula al guardar (la UI es solo preview, nunca la fuente de verdad).
- **[Riesgo]** Copiar-pegar el patrón en 3 sitios en vez de centralizarlo. → **Mitigación:** aceptado explícitamente — no hay padre común y la duplicación es de 2 líneas; introducir una abstracción para esto sería sobre-ingeniería para el tamaño del cambio.

## Migration Plan

No aplica — cambio de solo-frontend, sin migración de datos ni flag de despliegue. Deploy estándar del branch.
