## 1. Dominio compartido — helper de fracción

- [x] 1.1 `src/modules/products/domain/services/isFractionalQuantity.ts`: helper puro `isFractionalQuantity(quantity: number): boolean` con redondeo a 4 decimales antes del módulo (ver design.md § Decisión 2). Sin I/O.
- [x] 1.2 Test unitario dedicado: enteros (`1`, `2`, `100`), fraccionarios obvios (`0.5`, `2.25`), casos de precisión flotante (`0.1 + 0.2`, `2.9999999999996`, `1.00000000001`), cero y negativos (fuera de rango de negocio pero el helper no debe crashear).

## 2. Backend — Ventas (POS)

- [x] 2.1 `CreateSaleUseCase.ts`: en la rama `productPriceId` (item sin `dosificationId`), si `isFractionalQuantity(item.quantity)` es `true`, resolver `surchargePct` vía `lookups.getDosificationSurchargePct()` (ya inyectado) y computar `unitPrice = price.price * (1 + surchargePct / 100)`; si es `false`, `unitPrice = price.price` sin cambios.
- [x] 2.2 Confirmar explícitamente (test) que la rama `dosificationId` NO se ve afectada — sigue usando únicamente `DosificationPriceCalculator.computeUnitPrice`, sin aplicar el recargo nuevo aunque su `quantity` sea fraccionaria.
- [x] 2.3 `EditCompletedSaleUseCase.ts`: mismo cambio que 2.1 en su propio loop de resolución de items (re-ejecuta la misma lógica que "Create sale" per spec).
- [x] 2.4 Tests unitarios `CreateSaleUseCase.test.ts`/`EditCompletedSaleUseCase.test.ts`: casos de `specs/pos-api/spec.md` — cantidad fraccionaria aplica recargo, cantidad entera no, dos productos/departamentos distintos ambos afectados por igual, línea dosificación con cantidad fraccionaria NO se recarga doble.

## 3. Backend — Cotizaciones

- [x] 3.1 Confirmar puntos de inyección actuales de `CreateQuoteUseCase`/`UpdateQuoteUseCase` (constructor) antes de tocar — usar codegraph, no asumir. **Hallazgo**: ambos ya inyectan `PosLookupService` (lo usan para `getProduct`/`getProductPrice`), que YA expone `getDosificationSurchargePct()` — no hace falta ninguna dependencia nueva.
- [x] 3.2 ~~Inyectar `PricingSettingsRepository`~~ — innecesario per hallazgo 3.1; se reutiliza `this.lookups.getDosificationSurchargePct()` ya inyectado, mismo patrón exacto que `CreateSaleUseCase`/`EditCompletedSaleUseCase`.
- [x] 3.3 `CreateQuoteUseCase.ts`: aplicada la misma regla que 2.1 al snapshotear cada item (`isFractionalQuantity` + `this.lookups.getDosificationSurchargePct()`).
- [x] 3.4 `UpdateQuoteUseCase.ts`: mismo cambio en su loop de re-snapshot cuando `items` viene en el body.
- [x] 3.5 ~~Actualizar DI container~~ — innecesario, sin dependencia nueva que registrar.
- [x] 3.6 Tests unitarios (`QuoteLifecycleUseCases.test.ts`, consolida Create/Update): fraccionaria aplica recargo igual que en venta, entera no cambia, edición de entero→fraccionario recalcula. (Se agregó `getDosificationSurchargePct` al stub `makeLookups` del archivo, ausente hasta ahora.)
- [x] 3.7 Test unitario de conversión (`ConvertQuoteToSaleUseCase`, vía `InMemoryQuoteRepository`/`InMemorySaleRepository`): cotización con línea fraccionaria (recargo 8% horneado) convertida con un mock que devuelve 20% distinto — el `unitPrice` resultante conserva 108, NO se re-resuelve el % al convertir.

## 4. Frontend — Preview en POS

- [x] 4.1 `app/_hooks/usePricingSettingsOptions.ts`: nuevo hook global, mismo patrón que `useFoliosOptions`/`usePaymentMethodsOptions` (caché 60s), llama `GET /api/v1/admin/settings/pricing`.
- [x] 4.2 `computeTotalsClient.ts`: agregado parámetro opcional `surchargePct` (default 0, backwards-compatible con `billing`); línea sin `isDosificationLine` y `quantity` fraccionaria (helper local `isFractionalQuantity`, duplicado del de `src/` porque `app/` no puede importar runtime de `src/`) recibe el recargo en el cálculo. **Desviación de diseño**: el recargo se aplica SOLO dentro del cálculo (`computeTotalsClient`), nunca se hornea en `CartLine.unitPrice` persistido — hornearlo en el reducer (como decía design.md § Decisión 4 literal) hubiera compuesto el recargo en ediciones repetidas de `quantity` (0.5 → 0.55 → ... cada `UPDATE_QUANTITY` reaplicando sobre un `unitPrice` ya recargado). Se resuelve con un `useRef` que lee el `surchargePct` vigente en cada `dispatch`, sin mutar el estado base — más seguro, mismo resultado visible.
- [x] 4.3 `useCart.ts` (`app/(private)/pos/_logic/hooks/`): hook acepta `surchargePct` como parámetro (`useCart(surchargePct)`), leído vía ref en cada acción (`ADD_LINE`/`UPDATE_QUANTITY`/`UPDATE_DISCOUNT`/`CHANGE_TIER`/`REMOVE_LINE`) y pasado a `computeTotalsClient` en `recompute`/`buildState`, junto con `isDosificationLine: !!l.dosificationId` por línea. `PosPage.tsx` instancia `usePricingSettingsOptions()` y pasa `dosificationSurchargePct` a `useCart(...)` — cubre tanto modo Venta como modo Cotización (mismo carrito).
- [x] 4.4 Test unitario `computeTotalsClient.test.ts`: casos con `surchargePct` + cantidad fraccionaria vs. entera, línea dosificación (no se recarga doble), y `surchargePct=0` default no cambia nada (retrocompatibilidad con `billing`).
- [x] 4.5 Verificado con Playwright (browser real, `admin@example.com`): producto `FAG` (RAFIA DELGADA 2KG, $110.00, SIN dosificaciones configuradas) → PriceTierPicker confirma sin sección "Dosificaciones" → cantidad `0.5` en carrito muestra Total `$57.75` (= 0.5 × 110 × 1.05) ANTES de confirmar → `POST /api/v1/admin/sales` responde HTTP 201 con `items[0].unitPrice: 115.5, quantity: 0.5, lineTotal: 57.75, total: 57.75` — preview de cliente y persistido coinciden exactamente. Venta de prueba cancelada después (`POST /sales/:id/cancel`) para no dejar dato de prueba en la base compartida. (Intento inicial con `claude-in-chrome` bloqueado por timeout de inyección de script en la extensión — no relacionado al código; resuelto usando Playwright.)

## 5. Specs y verificación final

- [x] 5.1 `openspec validate fractional-quantity-surcharge --strict` sin errores.
- [x] 5.2 `npm test` completo verde: 456 test suites, 3187 tests, 0 fallos.
- [x] 5.3 `npm run build` sin errores de tipos.
- [x] 5.4 Extendido `tests/fixtures/totals-vectors.ts` con un vector de `unitPrice` ya recargado (`0.5 × 105`, representa `100 × 1.05`) — compartido entre `SaleTotalsCalculator`/`QuoteTotalsCalculator`/`ReturnTotalsCalculator`/`PurchaseTotalsCalculator` (148 tests verdes, todos los calculadores tratan el valor igual).
- [x] 5.5 Confirmado (no requirió test nuevo): `ReturnTotalsCalculator.test.ts` ya itera `totalsVectors` — el vector 5.4 agregado ahí prueba que devoluciones tratan un `unitPrice` ya recargado exactamente igual que Sale/Quote, sin ningún cambio de código en `returns`. Cero riesgo — confirma la hipótesis de design.md § Riesgos.
