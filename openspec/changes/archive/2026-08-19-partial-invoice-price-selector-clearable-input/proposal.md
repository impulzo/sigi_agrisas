## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Facturista (`billing:write`) | Como facturista, quiero seleccionar la lista de precios de un producto al agregarlo a una factura parcial para no tener que capturar el precio a mano ni timbrar por error un CFDI en $0 | - Al agregar un producto desde el catálogo, se preselecciona su precio `isDefault` (si tiene alguno) en vez de `unitPrice: 0`<br>- Cada línea con producto de catálogo muestra un selector de lista de precios (reutilizando `PriceTierPicker` de POS) que permite cambiar entre las listas disponibles de ese producto<br>- Cambiar de lista de precios actualiza `unitPrice` de la línea al valor de la lista elegida<br>- Las líneas libres (`handleAddFreeLine`, sin `productId`) NO tienen selector de lista de precios — siguen aceptando precio manual, sin cambios | - Sólo `billing:write` agrega/edita líneas; el selector sólo lista precios del producto ya autorizado en el catálogo (mismo `ProductCatalogPanel` ya usado) |
| 2 | Facturista (`billing:write`) | Como facturista, quiero poder borrar por completo el campo de precio (y los demás campos numéricos de la línea) sin que reaparezca un `0` para poder escribir un valor nuevo sin fricción | - El input de precio (y cantidad, descuento%, IVA%, IEPS%) permite quedar vacío mientras se edita, sin forzar `0`<br>- Al perder foco (`onBlur`) con el campo vacío, se normaliza a `0` recién en ese momento, no en cada tecla<br>- Escribir un valor válido (ej. `150`) funciona sin tener que borrar un `0` persistente primero | - El timbrado sigue bloqueado si alguna línea de producto de catálogo queda con precio `0` o vacío al momento de enviar (mensaje de validación claro, evita CFDI en $0) |

Nota: ambas historias tocan el mismo componente (`PartialInvoiceLineRow.tsx`) pero son independientes — la 1 cambia de dónde sale el precio inicial y cómo se re-selecciona; la 2 arregla el bug de input controlado que afecta a los 5 campos numéricos de la fila, no sólo precio.

## Why

Hoy `PartialInvoiceForm.handleAddProduct` fija `unitPrice: 0` al agregar cualquier producto de catálogo a una factura parcial, sin consultar sus listas de precio (`ProductPrice`) — el facturista debe teclear el precio a mano cada vez, sin ninguna referencia. Además, `NumField` en `PartialInvoiceLineRow.tsx` es un input `type="number"` controlado sobre `number` crudo: `Number("")` evalúa a `0`, así que al borrar el campo React lo re-renderiza inmediatamente con `0`, haciendo imposible dejarlo vacío mientras se escribe un valor nuevo. La combinación de ambos problemas es lo que hace fácil timbrar, sin querer, un CFDI con `unitPrice=0` — la validación backend (`unitPrice: z.number().min(0)`) lo permite porque `0` es técnicamente válido para líneas libres legítimas.

## What Changes

- `PartialInvoiceForm`/`PartialInvoiceLineRow` ganan un selector de lista de precios por línea de producto de catálogo (reutilizando `PriceTierPicker` de `pos/_blocks` y `getProductPrices` de `pos/_logic/services`), preseleccionando el precio `isDefault` al agregar el producto.
- `NumField` se reescribe con el patrón de estado-borrador en `string` ya usado por `PriceTierPicker` (`type="text" inputMode="decimal"`, normalización en `onBlur`), aplicado a los 5 campos numéricos de la fila (precio, cantidad, descuento%, IVA%, IEPS%).
- `usePartialInvoiceForm` agrega una validación client-side: ninguna línea con `productId` puede tener `unitPrice <= 0` al enviar (líneas libres quedan exentas).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `billing-ui`: `Partial standalone invoice ("Factura parcial") does not affect inventory` — selector de precio por línea de catálogo, input de precio/cantidad/impuestos borrable, validación de precio `> 0` en líneas de catálogo antes de enviar.

## Impact

- **Sin cambios en `billing-api`**: el backend ya acepta `unitPrice: number >= 0` para ambos tipos de línea (catálogo y libre) — la restricción de "no $0 en líneas de catálogo" es una regla de UX de este formulario específico, no una regla fiscal general (una línea libre en $0 sigue siendo válida a nivel API, ej. para promociones).
- **Frontend**: `app/(private)/billing/_blocks/{PartialInvoiceForm,PartialInvoiceLineRow}.tsx`, `app/(private)/billing/_logic/hooks/usePartialInvoiceForm.ts`, `app/(private)/billing/_logic/types/domain.ts`.
- **Reutiliza sin modificar**: `app/(private)/pos/_blocks/PriceTierPicker.tsx`, `app/(private)/pos/_logic/services/getProductPrices.ts`.
