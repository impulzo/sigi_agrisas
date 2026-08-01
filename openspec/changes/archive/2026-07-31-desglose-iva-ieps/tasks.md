## 1. Backend — DTOs de línea

- [x] 1.1 `src/modules/pos/application/dto/SaleItemDto.ts` — agregar `lineIva: number` y `lineIeps: number` (mantener `lineTax`).
- [x] 1.2 `src/modules/quotes/application/dto/QuoteItemDto.ts` — ídem.
- [x] 1.3 `src/modules/returns/application/dto/ReturnDto.ts` (`ReturnItemDto`) — ídem.

## 2. Backend — Repos Prisma (mapper derivación)

- [x] 2.1 `src/modules/pos/application/mappers/toSaleDto.ts` (`toSaleItemDto`) — `lineIva`/`lineIeps` derivados en el mapper de aplicación (mejor lugar que el repo).
- [x] 2.2 `src/modules/quotes/application/mappers/toQuoteDto.ts` (`toQuoteItemDto`) — ídem.
- [x] 2.3 `src/modules/returns/application/mappers/toReturnDto.ts` (`toReturnItemDto`) — ídem.

## 3. Backend — Repos InMemory (fixture tests)

- [x] 3.1 `InMemorySaleRepository.ts` — no requiere cambio; la derivación ocurre en el mapper de aplicación.
- [x] 3.2 `InMemoryQuoteRepository.ts` — ídem.
- [x] 3.3 `InMemoryReturnRepository.ts` — ídem.

## 4. Frontend — computeTotalsClient + tipos domain

- [x] 4.1 `app/(private)/pos/_logic/lib/computeTotalsClient.ts` — `TotalsResult` agrega `ivaTotal: number` e `iepsTotal: number`; el cuerpo de `computeTotalsClient` los suma de `computed.reduce(... l.lineIva ...)`.
- [x] 4.2 `app/(private)/pos/_logic/types/domain.ts` — `CartTotals` agrega `ivaTotal: number` e `iepsTotal: number`.

## 5. Frontend — CartTotals.tsx (POS)

- [x] 5.1 `app/(private)/pos/_blocks/CartTotals.tsx` — reemplazar fila "Impuestos (IVA + IEPS)" por filas condicionales IVA/IEPS; omitir si 0.

## 6. Frontend — Panel de totales en páginas de detalle

- [x] 6.1 `app/(private)/sales/_blocks/SaleDetailPage.tsx` — calcular `totalIva`/`totalIeps` desde `sale.items.reduce(...)`, reemplazar fila "Impuestos" por dos filas condicionales IVA / IEPS.
- [x] 6.2 `app/(private)/quotes/_blocks/QuoteDetailPage.tsx` — ídem con `quote.items`.
- [x] 6.3 `app/(private)/returns/_blocks/ReturnDetailPage.tsx` — desglose IVA/IEPS junto al headline "Reembolso total".

## 7. Verificación

- [x] 7.1 `npm run build` — cero errores de tipos.
- [x] 7.2 `npm test` — tests UI en verde. Tests de integración que fallan (quotes-conversion-edge-cases, inventory-crud) son PRE-EXISTING (falla de aislamiento de BD real, no relacionados con este cambio).
- [x] 7.3 Recorrido manual: abrir detalle de venta con IVA 16% e IEPS 8% → verificar que el panel de totales muestre las tres filas (Subtotal / IVA / IEPS / Total). Verificar POS con producto mixto IVA+IEPS.
