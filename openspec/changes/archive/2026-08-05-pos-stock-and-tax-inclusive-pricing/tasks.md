## 1. Stock negativo (ya cubierto — solo confirmar, sin cambio de código de producción)

- [x] 1.1 Ya cubierto por `tests/integration/modules/pos/sales-negative-stock.test.ts` ("vender sin registro de inventario crea fila con quantity negativa") — test de integración con DB real, mejor ubicación que un unit test con `SaleRepository` mockeado (el mock no ejercitaría `recordInventoryMovement`). No se agrega test unitario duplicado.
- [x] 1.2 Ya cubierto por el mismo archivo ("vender sobre stock=0 deja quantity negativa" + "inserción directa en BD con quantity negativa es permitida").
- [x] 1.3 `sales-negative-stock.test.ts` corrido — en verde (confirmado en la corrida completa final de la suite).

## 2. Fórmula de extracción de impuesto — dominio

- [x] 2.1 Actualizar `src/modules/pos/domain/services/SaleTotalsCalculator.ts`: reemplazar fórmula aditiva por extracción (`lineGross` → `divisor = 1+ivaRate+iepsRate` → `lineSubtotal = lineGross/divisor` → `lineIva`/`lineIeps` desde `lineSubtotal` → `lineTotal = lineGross`), preservando firma pública, validaciones de input y redondeo banker's a 4 decimales.
- [x] 2.2 Aplicar el mismo cambio, byte-equivalente, en `src/modules/quotes/domain/services/QuoteTotalsCalculator.ts`.
- [x] 2.3 Aplicar el mismo cambio, byte-equivalente, en `src/modules/returns/domain/services/ReturnTotalsCalculator.ts`.
- [x] 2.4 Aplicar el mismo cambio en el port cliente puro `app/(private)/pos/_logic/lib/computeTotalsClient.ts`.
- [x] 2.5 **(Alcance ampliado, confirmado con el cliente)** Aplicar el mismo cambio, byte-equivalente, en `src/modules/purchases/domain/services/PurchaseTotalsCalculator.ts` y en `app/(private)/purchases/_logic/lib/computePurchaseTotalsClient.ts` — el spec `purchases-api` ya exigía fórmula idéntica a Sale/Quote/Return y el test de equivalencia en `ReturnTotalsCalculator.test.ts` la verifica; excluir `purchases` habría roto ese contrato.
- [x] 2.6 Vectores de `tests/fixtures/totals-vectors.ts` no requirieron cambio (solo inputs; los tests que los consumen verifican consistencia interna `total ≈ subtotal+taxTotal`, no valores absolutos).
- [x] 2.7 Actualizados tests unitarios de cada calculador (`SaleTotalsCalculator.test.ts`, `QuoteTotalsCalculator.test.ts`, `ReturnTotalsCalculator.test.ts`, `PurchaseTotalsCalculator.test.ts`, `computeTotalsClient.test.ts`, `computePurchaseTotalsClient.test.ts`) con los nuevos valores.
- [x] 2.8 Test de equivalencia entre los 4 calculadores pasa sobre los vectores existentes (sin cambios).
- [x] 2.9 `npm test` en los módulos `pos`, `quotes`, `returns`, `purchases`: se actualizaron 9 suites downstream con montos hardcodeados (`CreateSaleUseCase`, `EditCompletedSaleUseCase`, `QuoteLifecycleUseCases`, `CreateReturnUseCase`, `CreatePurchaseUseCase`, `sales-create-and-cancel`, `sales-edit-from-hq`, `returns-create-and-cancel` — integración; `quotes-conversion-edge-cases` era flaky por estado compartido de DB, no relacionado).
- [x] 2.10 **(Gaps descubiertos vía `npm test` completo — no estaban en el plan original)**: aplicado el mismo cambio de fórmula a `src/modules/billing/domain/services/InvoiceTotalsCalculator.ts` (test de equivalencia dedicado con `SaleTotalsCalculator`, usado por facturas CFDI standalone) y a `app/(private)/returns/_logic/lib/computeReturnTotalsClient.ts` (port cliente de devoluciones, no descubierto en el barrido inicial). Actualizados tests downstream con montos hardcodeados: `useCart.test.ts`, `useCreatePurchaseForm.test.tsx`, `SaleDetailPage.test.tsx`, `QuoteDetailPage.test.tsx`, `CreateReturnPage.realtimeTotals.test.tsx`, `StampInvoiceUseCase.test.ts`. Confirmado no relacionados: `products-crud.test.ts` (deadlock Postgres por paralelismo) y `quotes-conversion-edge-cases.test.ts` (colisión RFC entre workers paralelos) — flakiness preexistente de infraestructura de tests, no causada por este change.

## 3. UI — IVA e IEPS siempre visibles

- [x] 3.1 `app/(private)/pos/_blocks/CartTotals.tsx`: quitar condicionales `> 0`, renderizar siempre las líneas IVA e IEPS.
- [x] 3.2 Actualizado test de `CartTotals` cubriendo el caso "todo en $0" (ambas líneas visibles con $0.00).
- [x] 3.3 `app/(private)/sales/_blocks/PrintableTicket.tsx`: reemplazado el renglón único "Impuestos" por dos renglones separados IVA/IEPS, sumando `lineIva`/`lineIeps` de `sale.items`.
- [x] 3.4 Actualizado `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` con el nuevo desglose IVA/IEPS.
- [x] 3.5 Verificado con Playwright real (`/pos` → venta → `/sales/[id]`): descubierto que `SaleDetailPage.tsx`, `QuoteDetailPage.tsx`, `ReturnDetailPage.tsx` NO usan `CartTotals` sino un componente compartido distinto, `app/_components/molecules/TaxBreakdownRows/TaxBreakdownRows.tsx`, que también ocultaba IVA/IEPS con `> 0` (los 3 variantes: sale/quote/compact). Corregido — ahora siempre visibles. Solo `QuoteEmitPanel.tsx` usa `CartTotals` directamente.

## 4. Verificación

- [x] 4.1 `npm test` completo en verde: 2899/2899 tests, 417/417 suites (única excepción intermitente `sales-edit-from-hq.test.ts` por colisión de RFC fijo entre workers paralelos — confirmado pasa 100% en aislamiento, no relacionado a este change).
- [x] 4.2 `npm run build` sin errores de tipos (confirmado, exit 0).
- [x] 4.3 Playwright real contra `npm run dev`: venta completada en `/pos` con producto `RAF` en stock -51 (permitido); carrito mostró Subtotal $94.83 / IVA $15.17 / IEPS $0.00 / Total $110.00 (igual al precio de catálogo, impuesto extraído no sumado); venta persistida (Folio 12); `/sales/[id]` mostró IVA/IEPS siempre visibles tras corregir `TaxBreakdownRows`. Verificación de `PrintableTicket` (impresión física) hecha vía test unitario — el diálogo nativo `window.print()` bloquea la automatización headless (limitación conocida, documentada en las instrucciones del entorno), no vía Playwright en vivo.
- [x] 4.4 `openspec validate pos-stock-and-tax-inclusive-pricing --strict` sin errores — confirmado en cada iteración de scope (incluyendo tras ampliar a purchases-api y billing-api).
