## Context

Ver `proposal.md` - Why. Constricción clave del repo: `SaleTotalsCalculator`, `QuoteTotalsCalculator` y `ReturnTotalsCalculator` deben mantenerse byte-equivalentes (comentario explícito en `QuoteTotalsCalculator.ts:26-28`), y ambos (dominio + UI) alimentan `tests/fixtures/totals-vectors.ts` como fuente compartida de vectores de prueba. `computeTotalsClient.ts` es un port cliente puro que replica la fórmula de dominio sin depender de Prisma (para cálculo optimista en el carrito antes de confirmar la venta).

## Goals / Non-Goals

**Goals:**
- Extraer (no sumar) IVA/IEPS del precio de catálogo en los 3 calculadores de dominio + el port cliente, preservando exactamente la firma pública y el tipo de retorno (`SaleTotalsResult`/`QuoteTotalsResult`) — cero cambios de contrato hacia los use cases que los consumen.
- Mostrar siempre IVA e IEPS en la UI de totales (Historia #3).
- Formalizar (con test) el comportamiento de stock negativo ya implementado (Historia #1), sin tocar código de producción.

**Non-Goals:**
- No se recalculan ventas/cotizaciones/devoluciones históricas ya persistidas — el snapshot por línea (`unitPrice`, `ivaRate`, `iepsRate`, `discountPct`) se preserva tal cual; solo las NUEVAS operaciones usan la fórmula nueva.
- No se agregan nuevos permisos RBAC ni se modifica branch scoping — ninguna Historia de Usuario de la tabla lo requiere (los 3 Criterios de Seguridad son "sin cambio" o "no aplica nuevo permiso").
- No se cambia el redondeo (banker's, 4 decimales) ni el tipo `Decimal(14,4)` de la base de datos.

## Decisions

**1. Fórmula: extracción financiera estándar (`base = precio/(1+tasa)`), no la aritmética simple del ejemplo original del cliente.**
Alternativa considerada y descartada: `iva = precio × tasa; base = precio − iva` (lo que el cliente escribió literalmente en su ejemplo, $1→$0.84/$0.16). Ambas fórmulas sí suman de vuelta al precio original, pero solo la división por `(1+tasa)` es la que usa la industria fiscal mexicana para "precio con impuesto incluido" (es la inversa exacta de la fórmula aditiva que el sistema ya usaba: `precio = base × (1+tasa)` ⟹ `base = precio / (1+tasa)`). El cliente confirmó explícitamente esta opción tras contraste numérico. Responde a Historia #2.

**2. Cambio queda contenido en las 3 calculadoras de dominio + su port cliente — no se toca el DTO/schema de `unitPrice`, `ivaRate`, `iepsRate` en `ProductPrice`/`Product`.**
Alternativa descartada: agregar un flag `priceIncludesTax` por producto para soportar ambos modos. Se descarta por scope creep — ninguna Historia de Usuario pide selección por producto; el cliente pidió un cambio global de interpretación del precio de catálogo. Si en el futuro se necesita mezclar productos con precio antes/después de impuesto, es un change nuevo.

**3. UI: el cambio de visibilidad de IVA/IEPS vive únicamente en `CartTotals` (componente compartido) y `PrintableTicket`.**
`SaleDetailPage`, `QuoteDetailPage`, `ReturnDetailPage`, `QuoteEmitPanel` ya delegan el render de totales a `CartTotals` — no requieren cambio propio. Esto minimiza el blast radius (Historia #3) y evita duplicar la regla de "siempre visible" en 5 archivos.

**4. `purchases` (compras a proveedores) SÍ recibe la misma fórmula de extracción, ampliando el alcance original.**
Decisión inicial (descartada): excluir `purchases` porque el costo de proveedor típicamente llega desglosado en su factura (CFDI con subtotal + IVA separados), a diferencia del precio de venta al público que es precio de anaquel. Se descubrió durante la implementación que `openspec/specs/purchases-api/spec.md` ya exige explícitamente que `PurchaseTotalsCalculator` use "la misma fórmula de banker's rounding que SaleTotalsCalculator/QuoteTotalsCalculator/ReturnTotalsCalculator", y que `tests/unit/modules/returns/domain/services/ReturnTotalsCalculator.test.ts` verifica automáticamente esa equivalencia (incluyendo `PurchaseTotalsCalculator`) sobre los mismos vectores compartidos. Excluir `purchases` habría roto ese contrato existente y ese test. El cliente confirmó, ante esta disyuntiva, aplicar la misma extracción a `purchases` para preservar la equivalencia formal entre los 4 calculadores.

**5. Test de stock negativo se agrega sin tocar `CreateSaleUseCase.ts`.**
El código ya cumple la Historia #1 (verificado por exploración: sin validación de stock disponible en el use case, `recordInventoryMovement` sin cláusula `WHERE quantity - delta >= 0`). Se agrega un caso de test explícito para que la ausencia de validación quede documentada como comportamiento intencional y protegida contra una futura reintroducción accidental (p. ej. alguien "arreglando" un bug percibido).

## Risks / Trade-offs

- **[Riesgo] Cambio de negocio en montos reportados**: `subtotal`/`taxTotal` de TODA venta/cotización/devolución nueva cambian de valor respecto a hoy (aunque `total` no cambia). Reportes fiscales o de contabilidad externos que ya consumían `subtotal`/`taxTotal` verán una discontinuidad en la fecha de despliegue. → **Mitigación**: el cambio es explícitamente solicitado por el cliente tras revisión; se documenta como **BREAKING** en el proposal; no requiere migración de datos porque no se tocan registros históricos (solo afecta operaciones nuevas).
- **[Riesgo] Redondeo por línea vs. header**: al extraer con división, `lineSubtotal + lineTax` puede diferir de `lineTotal` por hasta 1 unidad en el 4º decimal en casos con muchas líneas/tasas no triviales (ya ocurría con la fórmula aditiva; no es un riesgo nuevo, pero vale re-confirmar en los tests de equivalencia). → **Mitigación**: se mantiene `lineTotal = lineGross` como ancla (nunca se deriva de `lineSubtotal + lineTax`), evitando que el redondeo afecte lo que paga el cliente.
- **[Riesgo] Divergencia entre los 3 calculadores + port cliente**: son 4 implementaciones "iguales" mantenidas a mano. → **Mitigación**: ya existe el patrón de test de equivalencia (`tests/fixtures/totals-vectors.ts`); se actualizan los vectores y se preserva ese test como gate obligatorio.
