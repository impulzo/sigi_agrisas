## 1. Tipos y estado

- [x] 1.1 `app/(private)/billing/_logic/types/domain.ts`: `PartialLine` gana `priceId?: string | null`, `priceName?: string | null`.
- [x] 1.2 Confirmado: `updateLine` ya hace merge genérico (`{ ...l, ...patch }`), soporta actualizar `unitPrice`/`priceId`/`priceName` juntos sin cambios de código.

## 2. Precio preseleccionado al agregar producto

- [x] 2.1 `app/(private)/billing/_blocks/PartialInvoiceForm.tsx` `handleAddProduct`: ahora async, llama `getProductPrices(product.id)`, preselecciona `prices.find(p => p.isDefault) ?? prices[0]`, setea `unitPrice`/`priceId`/`priceName` de la nueva línea (fallback `unitPrice: 0` si no hay precios).

## 3. Selector de lista de precios por línea

- [x] 3.1 Nota de desviación: `PriceTierPicker` real es un `<dialog>` modal (no un elemento embebible en una celda de tabla) que requiere `product: ProductDto` completo — no admite "alimentarlo con las listas ya cargadas" de forma inline como asumía el proposal. Se replicó el patrón ya establecido en `QuoteCreatePage.tsx` (`handleChangeTier`/`fakeProduct`/`onConfirm`): `PartialInvoiceForm` monta un único `PriceTierPicker` a nivel de formulario, abierto vía un botón "Elegir precio"/`priceName` por línea de catálogo en `PartialInvoiceLineRow`; al confirmar, sólo se aplican `unitPrice`/`priceId`/`priceName` (no cantidad/descuento, a diferencia de `QuoteCreatePage` que sí los reaplica — ver design.md D1 amendment).
- [x] 3.2 Líneas libres (sin `productId`) NO renderizan el selector — mantienen el input manual de precio tal cual (`onChangePriceTier` es `undefined` para esas líneas).

## 4. Input numérico borrable

- [x] 4.1 `PartialInvoiceLineRow.tsx` `NumField`: reescrito con estado draft `string`, `type="text" inputMode="decimal"`, patrón `/^\d*\.?\d*$/`, normalización a número en `onBlur`. Nota: el clamp de `min` se aplica sólo en `onBlur`, no en cada keystroke — clampear durante el tecleo rompería escribir p.ej. "0.5" en un campo con `min=0.001` (el "0" inicial saltaría a "0.001" a mitad de tecleo).
- [x] 4.2 Aplicado a los 5 usos existentes: precio, cantidad, descuento%, IVA%, IEPS% — mismas props públicas (`value`, `onChange`, `min`, `step`, `placeholder`), sin romper los call sites.

## 5. Validación de precio antes de timbrar

- [x] 5.1 `usePartialInvoiceForm.ts`: agregado chequeo junto a la validación de receptor/líneas — ninguna línea con `productId != null` puede tener `unitPrice <= 0`; si falla, bloquea submit con mensaje identificando la línea por descripción/código.
- [x] 5.2 Reutiliza el banner genérico ya existente (`renderError()` en `PartialInvoiceForm.tsx`, mismo patrón que el error de receptor incompleto) — no requirió UI nueva.

## 6. Tests

- [x] 6.1 Test RTL de `handleAddProduct`/`PartialInvoiceForm` (nuevo `PartialInvoiceForm.test.tsx`): agregar un producto con precio default precarga `unitPrice` correcto (no `0`); fallback a `prices[0]` sin default; fallback a `0` sin precios.
- [x] 6.2 Test RTL de `PartialInvoiceLineRow` (nuevo `PartialInvoiceLineRow.test.tsx`): trigger de cambio de precio presente sólo en líneas de catálogo; líneas libres no muestran el selector.
- [x] 6.3 Test RTL de `NumField`: borrar el contenido deja el input vacío (no reaparece `0` en cada keystroke); `onBlur` con campo vacío normaliza a `0`; escribir un decimal completo sin que el `min`-clamp interrumpa el tecleo.
- [x] 6.4 Test de `usePartialInvoiceForm`: submit bloqueado con línea de catálogo en `unitPrice=0`; submit permitido con línea libre en `unitPrice=0`.

## 7. Verificación manual

- [x] 7.1 `/billing/new` → pestaña "Factura parcial": agregado producto (TESTPROD, única lista de precio disponible en este entorno dev) → confirmada precarga del precio default ($100.00, no $0); abierto el selector, confirmado el modal `PriceTierPicker` funciona (selecciona → aplica `unitPrice`/`priceName` a la línea). No había en este entorno un producto con 2+ listas de precio para probar el cambio entre listas distintas en vivo — cubierto en su lugar por `PartialInvoiceForm.test.tsx` (fallback a `prices[0]`) y `PartialInvoiceLineRow.test.tsx` (trigger).
- [x] 7.2 Confirmado en vivo: borrado completo del campo de precio deja el input vacío (no reaparece `0` mientras se edita); escribir un valor nuevo (`175.50`) funciona sin fricción y el total recalcula en vivo (`$175.50`).
- [x] 7.3 Confirmado en vivo (con cliente fiscalmente completo): timbrar con la línea de catálogo TESTPROD en precio `$0` mostró el banner de error `La línea "Test Product" tiene precio $0. Selecciona una lista de precios o captura un precio manual antes de timbrar.` y NO se llamó a Facturama; al quitar esa línea y agregar una línea libre en `$0` (con descripción y clave SAT), "Emitir factura parcial" SÍ procedió — timbró y navegó a `/billing/[id]` sin bloqueo.
