## Context

`useCart` (`app/(private)/pos/_logic/hooks/useCart.ts:79`) guarda `unitPrice: action.price.price` tal cual, sin marcar si ese precio ya incluye o no el recargo de dosificación. `computeTotalsClient` (`app/(private)/pos/_logic/lib/computeTotalsClient.ts:65-68`) asume que `line.unitPrice` es SIEMPRE el precio base de catálogo, y para líneas de cantidad fraccionaria calcula `effectiveUnitPrice = line.unitPrice * (1 + surchargePct / 100)`.

Ese supuesto es correcto en los 3 flujos que arrancan el carrito vacío y agregan líneas vía `PriceTierPicker` (POS, `QuoteCreatePage`, `EditSalePage` — este último no precarga items existentes, ver hallazgo separado abajo): el `price.price` que reciben viene de `getProductPrices()`, catálogo puro, sin recargo.

`QuoteEditPage.tsx:60-79` es distinto: reconstruye el carrito desde `quote.items` (persistidos) llamando `addLine(fakeProduct, fakePrice, item.quantity, item.discountPct)` con `fakePrice.price = item.unitPrice`. Ese `item.unitPrice` es el snapshot FINAL que guardó el backend — ya incluye el recargo si la línea era fraccionaria (`105` para un precio base `100` con `5%`). `computeTotalsClient` no tiene forma de distinguir "este `unitPrice` ya viene recargado" de "este es un precio de catálogo crudo", así que lo recarga de nuevo.

Responde a la única fila de la Historia de Usuario en `proposal.md`: el operador ve, al abrir `/quotes/[id]/edit`, un total mayor al que realmente está persistido.

## Goals / Non-Goals

**Goals:**
- Que al abrir `/quotes/[id]/edit`, el total mostrado para una línea fraccionaria coincida con el `unitPrice`/total ya persistidos de esa línea (recargo aplicado una sola vez).
- Que guardar sin modificar nada no cambie el total (idempotencia de abrir+guardar).
- No introducir un segundo camino de cálculo ni un flag nuevo en el modelo de `useCart`/`computeTotalsClient` — mantener una sola fórmula de recargo, aplicada sobre el precio base correcto.

**Non-Goals:**
- No se toca el backend (`UpdateQuoteUseCase`) — ya recalcula correcto desde `productPriceId` fresco.
- No se resuelve el hallazgo separado de que `EditSalePage.tsx` no precarga los items existentes de la venta al abrir la pantalla de edición (carrito arranca vacío) — está fuera de alcance de esta corrección puntual; no exhibe el bug de doble recargo porque nunca pasa por el camino de reconstrucción-desde-snapshot.
- No se resuelve el hallazgo separado de que `editSaleSchema` rechaza `customerId: null` en el `PATCH` de edición de venta — bug distinto, no relacionado al cálculo de recargo.
- No se cambia qué campos snapshotea el backend en `QuoteItem` (`unitPrice` sigue siendo el precio final, correcto para historial/facturación).

## Decisions

**D1 — Derivar el precio base de catálogo al reconstruir la línea, en vez de pasar el snapshot recargado como si fuera base.**
Para una línea de cantidad fraccionaria sin dosificación, el snapshot cumple `item.unitPrice = basePrice * (1 + surchargePct_al_momento_de_crear / 100)`. Al reconstruir para edición, `QuoteEditPage` debe pasar a `addLine` el precio que, al pasar por `computeTotalsClient` con el `dosificationSurchargePct` VIGENTE (no necesariamente el mismo que había al crear), produzca el mismo total ya persistido si nada cambió. La forma más simple y sin ambigüedad: para líneas de cantidad fraccionaria, revertir la operación aplicada por `computeTotalsClient` — es decir, pasar el precio base (`item.unitPrice / (1 + dosificationSurchargePct_vigente / 100)`) en vez del snapshot recargado — de modo que la única aplicación del recargo vuelva a ocurrir dentro de `computeTotalsClient`, tal como en los demás flujos.
Alternativa descartada: agregar un flag `isAlreadySurcharged` a la línea del carrito y bifurcar la fórmula en `computeTotalsClient`. Rechazada porque introduce un segundo camino de cálculo dentro de la función que toda pantalla comparte (POS, ambas de cotizaciones, venta), aumentando superficie de bugs futuros por una sola pantalla con una necesidad puntual.
Alternativa descartada: mostrar el total directamente desde `quote.total`/`item.lineTotal` en vez de recalcular con `useCart`, sólo mientras no haya cambios. Rechazada porque `CartPanel` necesita totales reactivos apenas el operador edita cantidad/descuento — mantener dos fuentes (total estático vs. `useCart`) reintroduce el mismo tipo de desalineación que motivó `fix-dosification-surcharge-ui`.

**D2 — El "recargo vigente" usado para revertir es el mismo `dosificationSurchargePct` que ya se pasa a `useCart`.**
Si `pricing_settings` cambió entre que se creó la cotización y se abre para editar, revertir con el porcentaje vigente (no el histórico) es intencional: el objetivo es que el preview de edición sea consistente con lo que el backend recalculará al guardar (que también usa el porcentaje vigente, no uno histórico — ver `Risks` de `fix-dosification-surcharge-ui`, mismo riesgo ya aceptado).

**D3 — Test: reconstrucción con snapshot recargado no debe duplicar el recargo.**
Extender `QuoteEditPage.test.tsx` con un caso que simula `usePricingSettingsOptions` devolviendo el mismo `dosificationSurchargePct` usado para construir el `unitPrice` mockeado de un item fraccionario, y verifica que el total calculado (vía el mock de `useCart`/`computeTotalsClient`, o el valor pasado a `addLine`) coincide con el total esperado sin duplicar el recargo — no un mock end-to-end de fetch, siguiendo el mismo criterio (D3) de `fix-dosification-surcharge-ui`.

## Risks / Trade-offs

- **[Riesgo]** Dividir entre `(1 + surchargePct/100)` puede introducir imprecisión de punto flotante si `surchargePct` cambió entre crear y editar (revertir con el % vigente sobre un monto recargado con el % histórico no da exactamente el precio base original). → **Mitigación:** aceptable — el objetivo no es reconstruir el precio base histórico exacto, sino que el preview de edición sea consistente con lo que el backend recalculará al guardar (que también usa el % vigente). Cualquier diferencia de céntimos por este caso ya existe hoy en el flujo normal (mismo riesgo documentado en `fix-dosification-surcharge-ui`).
- **[Riesgo]** Sólo aplica la reversión a líneas de cantidad fraccionaria sin dosificación — `QuoteEditPage` no maneja líneas de dosificación (confirmado en `fix-dosification-surcharge-ui`: `QuoteItem` no tiene `dosificationId`), así que no hay caso de dosificación que revertir aquí. → **Mitigación:** ninguna necesaria, fuera del dominio de esta pantalla.
- **[Riesgo]** Cambio queda acoplado a la fórmula exacta de `computeTotalsClient` (multiplicar por `1 + pct/100`) — si esa fórmula cambia, la reversión en `QuoteEditPage` debe cambiar en paralelo. → **Mitigación:** aceptado explícitamente (ver D1) para no introducir un flag en el modelo compartido; el test de regresión (D3) detecta la divergencia si ocurre.

## Migration Plan

No aplica — cambio de solo-frontend, sin migración de datos ni flag de despliegue. Deploy estándar del branch.
