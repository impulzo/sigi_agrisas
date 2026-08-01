## Why

Los calculadores de dominio (`SaleTotalsCalculator`, `QuoteTotalsCalculator`, `ReturnTotalsCalculator`) ya producen `lineIva` y `lineIeps` por separado, pero los DTOs de salida de los tres módulos los consolidan en `lineTax` (suma) antes de llegar a la API. La UI muestra una única línea "Impuestos (IVA + IEPS)" en el panel de totales de todas las vistas de detalle y en el carrito del POS.

Esto impide que el operador distinga cuánto corresponde a IVA y cuánto a IEPS, información relevante para la contabilidad y la conciliación fiscal. Los tipos frontend ya declaran `lineIva` / `lineIeps` en todas las interfaces de ítem (`SaleItemDto`, `QuoteItemDto`, `ReturnItemDto`) pero el backend nunca los envía — los campos son `undefined` en runtime.

## What Changes

- **Backend — DTOs de línea**: `SaleItemDto`, `QuoteItemDto`, `ReturnItemDto` exponen `lineIva` y `lineIeps` (calculados desde los campos ya almacenados `lineSubtotal × ivaRate` / `× iepsRate`). Sin migración: los campos necesarios (`lineSubtotal`, `ivaRate`, `iepsRate`) ya están en BD.
- **Backend — repos Prisma e InMemory**: Los mappers de `PrismaSaleRepository`, `PrismaQuoteRepository`, `PrismaReturnRepository` y sus contrapartes InMemory incluyen `lineIva`/`lineIeps` en el objeto devuelto.
- **Frontend — POS/Carrito**: `TotalsResult` (de `computeTotalsClient`) agrega `ivaTotal` / `iepsTotal`. `CartTotals` domain type actualizado; `CartTotals.tsx` muestra IVA e IEPS como filas independientes.
- **Frontend — Detalle venta, cotización, devolución**: El panel de totales de `SaleDetailPage`, `QuoteDetailPage` y `ReturnDetailPage` reemplaza la fila "Impuestos" única por dos filas "IVA" e "IEPS", calculadas en frontend sumando `lineIva` / `lineIeps` de cada ítem.

## Capabilities

### Modified Capabilities
- `products-api` (indirectamente): ningún cambio de endpoints; solo los DTOs de ítems agregan campos.
- `pos-api`: `SaleItemDto` agrega `lineIva`, `lineIeps`.
- `quotes-api`: `QuoteItemDto` agrega `lineIva`, `lineIeps`.
- `returns-api`: `ReturnItemDto` agrega `lineIva`, `lineIeps`.
- `pos-ui` / `sales-ui` / `quotes-ui` / `returns-ui` (display): Totales muestran desglose.

### New Capabilities
- _(ninguna)_

## Impact

- **Sin migración de base de datos.** Los valores se derivan de campos ya almacenados.
- **Sin breaking changes**: `lineTax` permanece en los DTOs (retro-compatible). Se agregan dos campos nuevos.
- Archivos backend afectados: 3 DTOs + 3 repos Prisma + 3 repos InMemory.
- Archivos frontend afectados: `computeTotalsClient.ts`, `CartTotals` type/component, `SaleDetailPage`, `QuoteDetailPage`, `ReturnDetailPage`.
- Tests: Los tests que construyen fixtures de ítems necesitan agregar `lineIva`/`lineIeps`; los tests de calculadores existentes siguen sin cambio.
