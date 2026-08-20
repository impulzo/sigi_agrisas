## Context

`PartialInvoiceForm.handleAddProduct` (`app/(private)/billing/_blocks/PartialInvoiceForm.tsx:82-97`) inserta líneas con `unitPrice: 0` hardcodeado; `PartialLine` (`_logic/types/domain.ts`) no tiene `priceId`/`priceName`. `NumField` (`PartialInvoiceLineRow.tsx:14-26`) usa `value={value} onChange={(e) => onChange(Number(e.target.value))}` sobre `type="number"` — el patrón correcto ya existe en `PriceTierPicker.tsx:187-208`: estado draft `string`, `QUANTITY_DRAFT_PATTERN = /^\d*\.?\d{0,3}$/`, `type="text" inputMode="decimal"`, normalización a número en `onBlur`. `PriceTierPicker` y `getProductPrices` (`pos/_logic/services`) ya resuelven exactamente "listar precios de un producto y dejar elegir uno" para POS/Cotizaciones — billing ya reutiliza otros bloques de POS (`CustomerPicker`, `CustomerQuickAddModal`, `ProductCatalogPanel`), así que este es el mismo patrón de reutilización cross-módulo ya establecido.

## Goals / Non-Goals

**Goals:**
- Precio de línea de catálogo se preselecciona y es reseleccionable desde las listas reales del producto (historia 1).
- Los 5 campos numéricos de la fila (precio, cantidad, descuento%, IVA%, IEPS%) se pueden vaciar mientras se editan (historia 2).
- Bloquear el timbrado si una línea de catálogo queda en precio `0`/vacío (historia 2, criterio de seguridad).

**Non-Goals:**
- No se cambia la validación backend de `unitPrice` — sigue aceptando `>= 0` para ambos tipos de línea; la regla de "no $0" es sólo client-side y sólo para líneas de catálogo (una línea libre en $0 sigue siendo un caso de uso legítimo, ej. cortesías).
- No se toca `StampSaleForm` (factura desde venta) — ese flujo no construye líneas manualmente, las hereda de la venta ya totalizada.
- No se agrega selector de precio a las líneas libres (`handleAddFreeLine`) — no tienen `productId`, no hay lista de precios que resolver.

## Decisions

**D1 — Reutilizar `PriceTierPicker` tal cual, no crear un selector nuevo para billing.**
`PriceTierPicker` ya recibe `prices: ProductPriceDto[]` y un callback de selección — es agnóstico del módulo que lo monta (ya lo usan POS y Cotizaciones). Se monta dentro de `PartialInvoiceLineRow` sólo cuando la línea tiene `productId`, pasándole las listas obtenidas vía `getProductPrices(productId)` (mismo servicio que POS, sin modificar).

**Amendment (durante apply):** `PriceTierPicker` real es un `<dialog>` modal completo (product header + selector de precio + cantidad + descuento%), no un control embebible dentro de una celda de tabla — y requiere `product: ProductDto` completo, no sólo un `productId`. Montarlo "dentro de `PartialInvoiceLineRow`" tal como sugería el proposal original no es viable estructuralmente (un `<dialog>` por fila generaría N diálogos ocultos). En su lugar se replicó el patrón ya establecido en `app/(private)/quotes/_blocks/QuoteCreatePage.tsx` (`handleChangeTier`): un único `PriceTierPicker` montado a nivel de `PartialInvoiceForm`, con un `fakeProduct: ProductDto` reconstruido desde los campos ya presentes en `PartialLine` (`productId`, `productCode`, `description` como `name`, `ivaRate`, `iepsRate`), abierto vía un botón por línea de catálogo. A diferencia de `QuoteCreatePage.handlePriceConfirm` (que también reaplica `quantity`/`discountPct` al confirmar, porque en POS/Cotizaciones "cambiar de nivel" puede implicar reajustar cantidad), aquí sólo se aplican `unitPrice`/`priceId`/`priceName` — la cantidad y el descuento de la línea de facturación son campos independientes que el usuario ya controla por separado en la fila, y el criterio de aceptación de la historia 1 sólo menciona que cambiar de lista actualiza `unitPrice`.

**D2 — El precio se preselecciona al agregar el producto, no se difiere a que el usuario abra el selector.**
`handleAddProduct` pasa a llamar `getProductPrices(product.id)`, preseleccionar `prices.find(p => p.isDefault) ?? prices[0]` (mismo criterio ya usado en `PriceTierPicker.tsx:38`), y setear `unitPrice`/`priceId`/`priceName` de esa línea. Si el producto no tiene ninguna lista de precios, la línea queda en `unitPrice: 0` (comportamiento actual, no regresión) pero la validación de historia 2 bloqueará el envío hasta que el usuario capture un precio manualmente.

**D3 — `NumField` migra al patrón draft-string de `PriceTierPicker`, aplicado uniformemente a los 5 campos.**
Alternativa descartada: arreglar sólo el campo de precio (el único mencionado explícitamente por el usuario) y dejar cantidad/descuento/IVA/IEPS con el bug. Se descarta porque `NumField` es un único componente compartido por los 5 campos (`PartialInvoiceLineRow.tsx` línea 57 para precio, 54/60/63/66 para el resto) — arreglar sólo uno requeriría bifurcar el componente, más riesgoso que corregir el componente compartido una sola vez.

**D4 — La validación "sin $0 en líneas de catálogo" vive en `usePartialInvoiceForm`, no en `PartialInvoiceLineRow`.**
Consistente con la arquitectura del proyecto: `_logic/hooks/` orquesta validación + envío, `_blocks/` es presentacional. El hook ya valida "receptor completo + ≥1 línea" antes de enviar (`usePartialInvoiceForm.ts:83-90`) — se agrega ahí una tercera condición: ninguna línea con `productId != null` tiene `unitPrice <= 0`.

## Risks / Trade-offs

- **[Riesgo]** Un producto con múltiples listas de precio pero ninguna marcada `isDefault` no preselecciona nada determinístico → **Mitigación**: mismo comportamiento ya aceptado en POS (`prices[0]` como fallback, orden ya gobernado por `sortProductPricesForDisplay` en el backend) — no es una regresión, es paridad con el patrón existente.
- **[Trade-off]** La regla de "no $0 en catálogo" es sólo client-side — un cliente HTTP directo (no la UI) podría seguir enviando `unitPrice: 0` para una línea con `productId`. Se acepta porque el backend ya lo permite deliberadamente (no hay regla fiscal SAT que lo prohíba) y este change es explícitamente de UX de formulario, no de integridad de datos.
