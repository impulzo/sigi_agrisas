## Context

Los tres calculadores de dominio ya producen `lineIva` / `lineIeps` por separado. El gap está en que los repos Prisma no incluyen estos campos al mapear la fila DB → DTO, y la UI no los muestra. No se necesita migración porque `lineSubtotal`, `ivaRate` e `iepsRate` ya están almacenados en `sale_items`, `quote_items` y `return_items`.

El módulo de Billing ya usa el patrón correcto: `InvoiceItemDto` expone `lineIva`, `lineIeps`, `lineTotal` separados, y los almacena como columnas en `invoice_items`. Para Sale/Quote/Return optamos por derivar en el mapper (sin nueva columna) para mantener el scope ajustado.

## Goals / Non-Goals

**Goals**
- Exponer `lineIva` / `lineIeps` en los tres DTOs de ítem (backend).
- Mostrar desglose IVA / IEPS en CartTotals (POS), SaleDetailPage, QuoteDetailPage, ReturnDetailPage.
- Mantener retro-compatibilidad: `lineTax` permanece en los DTOs.

**Non-Goals**
- Almacenar `lineIva`/`lineIeps` como columnas en DB (puede ser un follow-up alineado a Billing).
- Agregar `totalIva`/`totalIeps` como campos de primer nivel en `SaleDetailDto`/`QuoteDetailDto`/`ReturnDetailDto` — el frontend los computa sumando los ítems.
- Cambiar la lógica de cálculo (los calculadores ya son correctos).
- Cambios en el módulo de Billing (ya tiene el patrón correcto).

## Decisions

### Cómo derivar `lineIva` / `lineIeps` sin migración

En los mappers de los repos Prisma:
```ts
const lineSubtotal = Number(it.lineSubtotal);
const ivaRate      = Number(it.ivaRate  ?? 0);
const iepsRate     = Number(it.iepsRate ?? 0);
const lineIva  = Math.round(lineSubtotal * ivaRate  * 10_000) / 10_000;
const lineIeps = Math.round(lineSubtotal * iepsRate * 10_000) / 10_000;
```

`Math.round` a 4 decimales es suficiente para display. La diferencia vs. banker's rounding ocurre solo en casos exactamente a mitad de escala, que son extremadamente raros con valores monetarios reales. `lineTax` almacenado (banker's) permanece el valor canónico para la lógica de negocio; `lineIva`/`lineIeps` son solo para presentación.

Los repos InMemory **no requieren cambio**: devuelven entidades de dominio (`SaleItem`, `QuoteItem`, `ReturnItem`) con `ivaRate` y `lineSubtotal`, y el mapper de aplicación (`toSaleItemDto`, `toQuoteItemDto`, `toReturnItemDto`) es quien deriva `lineIva`/`lineIeps`. La fórmula aplicada en el mapper es idéntica.

### Agregados de IVA/IEPS en UI (sin campo backend adicional)

El frontend computa:
```ts
const totalIva  = sale.items.reduce((s, i) => s + i.lineIva,  0);
const totalIeps = sale.items.reduce((s, i) => s + i.lineIeps, 0);
```

Disponible en vistas de detalle (`SaleDetailPage`, `QuoteDetailPage`, `ReturnDetailPage`) donde siempre se tienen los ítems. Las vistas de lista no muestran desglose.

### CartTotals / POS

`computeTotalsClient` ya produce `lineIva`/`lineIeps` en cada `ComputedLine` pero `TotalsResult` solo expone `taxTotal`. Se agregan `ivaTotal` e `iepsTotal`:

```ts
export interface TotalsResult {
  lines: ComputedLine[];
  subtotal: number;
  ivaTotal: number;    // nuevo
  iepsTotal: number;   // nuevo
  taxTotal: number;    // permanece (suma de los dos, retro-compat)
  total: number;
}
```

`CartTotals` domain type (`app/(private)/pos/_logic/types/domain.ts`) agrega los mismos campos. `CartTotals.tsx` reemplaza la fila "Impuestos (IVA + IEPS)" por dos filas:
```
IVA    $xxx.xx
IEPS   $xxx.xx
```
Si ambos son 0 se omiten (producto sin impuestos); si solo uno aplica se muestra solo ese.

### Panel de totales en detalle (SaleDetailPage, QuoteDetailPage, ReturnDetailPage)

Patrón uniforme para los tres:
```
Subtotal   $xxx.xx
IVA        $xxx.xx      ← nuevo (oculto si 0)
IEPS       $xxx.xx      ← nuevo (oculto si 0)
Total      $xxx.xx
```

La fila "Impuestos" genérica desaparece. Las filas IVA/IEPS se renderizan solo si `totalIva > 0` o `totalIeps > 0` respectivamente.

### Archivos afectados

**Backend (src/):**
```
src/modules/pos/application/dto/SaleItemDto.ts              + lineIva, lineIeps
src/modules/pos/infrastructure/repositories/
  PrismaSaleRepository.ts    mapper toDetail/toSummary items  + lineIva, lineIeps derivados
  InMemorySaleRepository.ts  mapper items                     + lineIva, lineIeps
src/modules/quotes/application/dto/QuoteItemDto.ts          + lineIva, lineIeps
src/modules/quotes/infrastructure/repositories/
  PrismaQuoteRepository.ts   mapper items                     + lineIva, lineIeps derivados
  InMemoryQuoteRepository.ts mapper items                     + lineIva, lineIeps
src/modules/returns/application/dto/ReturnDto.ts            + lineIva, lineIeps en ReturnItemDto
src/modules/returns/infrastructure/repositories/
  PrismaReturnRepository.ts  mapper items                     + lineIva, lineIeps derivados
  InMemoryReturnRepository.ts mapper items                    + lineIva, lineIeps
```

**Frontend (app/):**
```
app/(private)/pos/_logic/lib/computeTotalsClient.ts         TotalsResult + ivaTotal, iepsTotal
app/(private)/pos/_logic/types/domain.ts                    CartTotals   + ivaTotal, iepsTotal
app/(private)/pos/_blocks/CartTotals.tsx                    desglose IVA / IEPS
app/(private)/sales/_blocks/SaleDetailPage.tsx              desglose en panel totales
app/(private)/quotes/_blocks/QuoteDetailPage.tsx            desglose en panel totales
app/(private)/returns/_blocks/ReturnDetailPage.tsx          desglose en panel totales (si existe)
```

**Nota:** Los tipos frontend `app/(private)/*/\_logic/types/api.ts` ya declaran `lineIva`/`lineIeps` en sus `*ItemDto`. No requieren cambio.

## Risks / Trade-offs

- **Rounding mínimo (Math.round vs banker's)**: Solo afecta display de `lineIva`/`lineIeps`. `lineTax` sigue siendo el valor canónico para totales. Riesgo aceptable para display.
- **Items no disponibles en lista**: El desglose solo aparece en vistas de detalle. Las vistas de lista siguen mostrando `taxTotal` (total combinado). Esto es correcto y esperado.
- **ReturnDetailPage**: Verificar si existe el panel de totales con refundSubtotal/refundTax/refundTotal; de existir, aplicar el mismo patrón de desglose.

## Migration Plan

Orden recomendado:
1. Backend DTOs (+ tests de fixture) — bloque sin riesgo, solo agrega campos.
2. Repos Prisma + InMemory — derivan los nuevos campos.
3. `computeTotalsClient` + tipos domain (CartTotals) — ajuste client puro.
4. `CartTotals.tsx` — display POS.
5. `SaleDetailPage`, `QuoteDetailPage`, `ReturnDetailPage` — display detalles.
6. `npm run build` + `npm test` en verde.
