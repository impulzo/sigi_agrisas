## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador (permiso `quotes:write`) que edita cotizaciones `draft` | Como Operador, quiero que al abrir `/quotes/[id]/edit` una cotización con líneas de cantidad fraccionaria, el total mostrado sea el mismo que persistirá el backend al guardar, para poder confiar en el preview antes de decidir guardar o cancelar cambios | - Given una cotización `draft` con una línea de cantidad fraccionaria (creada con `dosificationSurchargePct` vigente distinto de 0), When el operador abre `/quotes/[id]/edit`, Then el total mostrado al cargar coincide exactamente con el `total` persistido de esa cotización (obtenido vía `GET /api/v1/admin/quotes/:id`), sin recargo duplicado.<br>- Given la misma pantalla recién cargada (sin que el operador modifique nada), When el operador presiona "Guardar cambios", Then el total que persiste el `PATCH` es idéntico al que ya se mostraba antes de guardar (no cambia sólo por abrir y re-guardar).<br>- Given una línea de cantidad entera sin dosificación, When se carga la cotización para editar, Then el comportamiento no cambia (sin recargo, regresión cero — ya cubierto por el test existente de `computeTotalsClient.test.ts`).<br>- Given el operador SÍ cambia la cantidad de una línea fraccionaria durante la edición, When el total se recalcula en cliente, Then aplica el recargo una sola vez sobre el precio base de catálogo (no sobre el precio ya recargado del snapshot). | - No aplica control de acceso nuevo: la pantalla ya exige `quotes:write` y sólo opera sobre cotizaciones `draft` (reglas existentes, sin cambio).<br>- El fix es puramente de cálculo/mapeo en cliente (qué valor se usa como "precio base" al reconstruir el carrito desde el snapshot) — el backend sigue siendo la fuente de verdad y no se modifica; no hay riesgo de que el cliente pueda alterar el monto que finalmente cobra/persiste `UpdateQuoteUseCase`.<br>- Test de regresión obligatorio: cubrir explícitamente que re-abrir para editar una cotización con línea fraccionaria y recargo activo NO duplique el recargo (evitar que un futuro refactor reintroduzca el bug, tal como pasó con el recargo en `0` antes de `fix-dosification-surcharge-ui`). |

## Why

`QuoteEditPage.tsx` reconstruye el carrito de una cotización `draft` a partir de sus items persistidos. Para cada item, arma un `fakePrice` cuyo campo `price` toma directo de `item.unitPrice` (`QuoteEditPage.tsx:75`) — pero ese `unitPrice` es el snapshot FINAL ya recargado que guardó el backend al crear la cotización (p. ej. `$105` para un precio base de `$100` con `dosificationSurchargePct=5%`), no el precio base de catálogo. Ese valor se pasa a `addLine`, cuyo estado interno lo guarda tal cual como `unitPrice` de la línea (`useCart.ts:79`). Cuando `computeTotalsClient` calcula el total para mostrar en pantalla, detecta que la línea tiene cantidad fraccionaria y vuelve a multiplicar ese `unitPrice` (ya recargado) por `(1 + surchargePct/100)` — duplicando el recargo sólo en el preview de la pantalla de edición.

El bug fue invisible mientras `dosificationSurchargePct` era siempre `0` en esta pantalla (el defecto que corrigió `fix-dosification-surcharge-ui`); al pasar el porcentaje real, el doble-recargo se volvió visible y medible. Verificado manualmente el 2026-08-19: una cotización con línea `qty=0.5`, precio base `$100`, recargo `5%` persiste correctamente `$52.50` al crearse; al reabrirla en `/quotes/[id]/edit` la pantalla muestra `$55.13`, y guardar sin tocar nada vuelve a persistir `$52.50` (el backend recalcula desde el precio de catálogo, ajeno al bug de cliente). El preview que ve el operador no coincide con lo que realmente se guardará — el mismo tipo de mismatch dato-mostrado-vs-dato-persistido que motivó el cambio anterior, ahora en la dirección opuesta (recargo de más, no de menos).

## What Changes

- `QuoteEditPage.tsx`: al reconstruir el carrito desde `quote.items`, dejar de alimentar `useCart`/`addLine` con el `unitPrice` snapshot (ya recargado) como si fuera precio base de catálogo. La línea reconstruida debe producir, al pasar por `computeTotalsClient` con el `dosificationSurchargePct` vigente, el mismo total que ya está persistido — es decir, aplicar el recargo una sola vez.
- Ningún cambio de contrato HTTP: `handleSubmit` ya envía sólo `productPriceId` + `quantity` + `discountPctOverride` al `PATCH` (no envía `unitPrice`), así que el backend no se toca.
- Cobertura de test nueva: caso de regresión que reconstruye una línea fraccionaria desde un snapshot con recargo aplicado y confirma que el total mostrado al cargar coincide con el total ya persistido (no con el doble).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `pos-ui`: el requisito "Consistencia del recargo de dosificación entre pantallas del carrito" (agregado por `fix-dosification-surcharge-ui`) exige que el total en `/quotes/[id]/edit` refleje el `dosificationSurchargePct` vigente y coincida con el total persistido — hoy lo aplica dos veces en vez de una. Se afina el requisito para dejar explícito que la reconstrucción del carrito desde un snapshot NO debe re-recargar un precio que ya viene recargado.

## Impact

- `app/(private)/quotes/_blocks/QuoteEditPage.tsx`
- Tests nuevos/extendidos en `tests/unit/ui/(private)/quotes/_blocks/QuoteEditPage.test.tsx`
- Sin cambios de backend, API, ni migraciones.
