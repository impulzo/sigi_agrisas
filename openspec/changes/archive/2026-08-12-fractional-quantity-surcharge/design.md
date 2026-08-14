## Context

Ver `proposal.md` (sección Why / Historia de Usuario) para la motivación de negocio. Contexto técnico relevante ya existente en el repo:

- `dosificationSurchargePct` ya vive en `settings-api` (`pricing_settings`, singleton, default `5.0`), expuesto vía `PricingSettingsRepository` y reutilizado hoy solo para líneas `dosificationId` (catálogo + POS, ver `DosificationPriceCalculator`).
- El recargo de dosificación NUNCA se calcula dentro de `SaleTotalsCalculator`/`QuoteTotalsCalculator` — esos servicios son puros y agnósticos de cómo se resolvió `unitPrice`; el recargo se resuelve ANTES, en la capa de use case, y se pasa ya "horneado" en `unitPrice`.
- POS (`CreateSaleUseCase`/`EditCompletedSaleUseCase`) resuelve el % vía `PosLookupService.getDosificationSurchargePct()`. Cotizaciones no tiene ese puerto — sus use cases no inyectan hoy nada de `settings`.
- Frontend: `computeTotalsClient` (POS) recibe `unitPrice` ya resuelto por línea; para dosificaciones ese valor viene del backend (`computedUnitPrice` del catálogo, vía `GET /products/:id/dosifications`), nunca se calcula en cliente. Para precios normales, el cliente usa `price.price` tal cual — hoy nunca aplica ningún recargo.
- `operator` (rol POS) SÍ tiene `settings:read` (no `settings:write`) — puede leer `GET /api/v1/admin/settings/pricing` sin permiso nuevo.

## Goals / Non-Goals

**Goals:**
- Historia 1/2 (proposal.md): aplicar el mismo `dosificationSurchargePct` a líneas `productPriceId` con `quantity` fraccionaria, en creación y edición de venta.
- Historia 3: misma regla en creación/edición de cotización, preservada intacta al convertir a venta (ya lo garantiza el patrón de snapshot existente, sin tocar `Convert quote to sale`).
- Preview de cliente (POS) coincide exactamente con lo que persiste el backend.
- Cero doble cobro en líneas `dosificationId`.

**Non-Goals:**
- No agregar flag de opt-out por producto/departamento (decisión de negocio ya confirmada).
- No tocar `SaleTotalsCalculator`/`QuoteTotalsCalculator`/`ReturnTotalsCalculator` — su fórmula de impuestos no cambia.
- No recalcular retroactivamente ventas/cotizaciones ya persistidas — solo aplica hacia adelante (creación nueva o próxima edición).
- No cambios de esquema DB — reutiliza `pricing_settings` tal cual.
- No cambios en `Convert quote to sale` — el snapshot ya viaja sin re-resolver precios.

## Decisions

**1. El recargo se resuelve en la capa de use case, no en los calculadores de totales.**
Mismo patrón que dosificaciones: `CreateSaleUseCase`/`EditCompletedSaleUseCase`/`CreateQuoteUseCase`/`UpdateQuoteUseCase` calculan `unitPrice` final ANTES de armar las líneas para `SaleTotalsCalculator`/`QuoteTotalsCalculator`. Alternativa descartada: agregar `surchargePct` como parámetro del calculador — se rechaza porque mezclaría "cálculo de impuestos" con "resolución de precio", y el calculador hoy es deliberadamente agnóstico de cómo se llegó a `unitPrice` (lo mismo vale para líneas de dosificación, que ya siguen este patrón). Responde a Historias 1, 2 y 3.

**2. Detección de "cantidad fraccionaria" con redondeo a 4 decimales antes del módulo.**
`quantity` se persiste como `Decimal(14,4)`; comparar `quantity % 1 !== 0` directo sobre `number` de JS puede dar falsos positivos/negativos por precisión flotante (ej. `2.9999999999996`). Se define un helper puro compartido:

```
isFractionalQuantity(quantity: number): boolean {
  return Math.round(quantity * 10000) % 10000 !== 0;
}
```

Vive junto a `DosificationPriceCalculator` (`src/modules/products/domain/services/`) — mismo home lógico ("cálculos de precio de producto"), reutilizado por `pos` y `quotes` para no duplicar la regla en 4 lugares (Create/Edit sale, Create/Update quote). Responde a Historia 1 (definición de "cantidad fraccionaria" = cualquier decimal ≠ entero, ya decidido).

**3. Cotizaciones resuelve el % vía `PricingSettingsRepository` inyectado directamente.**
POS ya tiene `PosLookupService.getDosificationSurchargePct()`. Cotizaciones no tiene una capa de "lookups" análoga — se inyecta `PricingSettingsRepository` directamente en `CreateQuoteUseCase`/`UpdateQuoteUseCase`, mismo patrón que `ListProductDosificationsUseCase` ya usa en `products`. Alternativa descartada: crear un `QuoteLookupService` nuevo solo para esto — sobre-ingeniería para un único método; se evalúa en implementación si el use case ya tiene puntos de inyección suficientes o si conviene un wrapper mínimo.

**4. Preview de cliente: nuevo hook global `usePricingSettingsOptions`.**
Sigue el patrón ya establecido por `useFoliosOptions`/`usePaymentMethodsOptions` (`app/_hooks/`, caché 60s, sin dedupe complejo) — NO reutiliza `app/(private)/settings/_logic/hooks/usePricingSettings.ts` porque ese hook es privado al módulo settings (import cruzado entre módulos de features está prohibido por convención del proyecto, igual que `catalogs/customers` vs `pos`). El nuevo hook llama `GET /api/v1/admin/settings/pricing` (ya autorizado para `operator` vía `settings:read`, sin permiso nuevo). `computeTotalsClient` recibe el `dosificationSurchargePct` resuelto como parámetro opcional; el reducer de carrito (`useCart.ts`) lo aplica a `unitPrice` en `ADD_LINE`/`UPDATE_QUANTITY`/`CHANGE_TIER` cuando la línea NO tiene `dosificationId` y `isFractionalQuantity(quantity)` es `true` — mismo criterio que backend. Responde a Historia 1 (Criterio de Seguridad: preview y persistido deben coincidir).

**5. Sin recálculo retroactivo.**
Ventas/cotizaciones ya persistidas conservan su `unitPrice` snapshoteado. Solo una nueva creación o una edición futura (que ya re-ejecuta el flujo completo de resolución) aplica la regla nueva. Sin migración de datos ni backfill.

## Risks / Trade-offs

- [Riesgo] Falsos positivos/negativos por precisión flotante en la detección de fracción → [Mitigación] helper único `isFractionalQuantity` con redondeo a 4 decimales, cubierto con vectores de test dedicados (`0.1+0.2`, `2.99999999996`, enteros grandes) — una sola implementación compartida, no 4 copias con reglas ligeramente distintas.
- [Riesgo] Desfase cliente/servidor si un admin cambia el % mientras un cajero tiene el carrito abierto → [Mitigación] mismo TTL de 60s ya aceptado para folios/métodos de pago; el servidor SIEMPRE recalcula de forma autoritativa al confirmar, el cliente es solo preview — un desfase momentáneo en el preview no afecta lo que se cobra.
- [Riesgo] Cajeros sorprendidos por un cargo nuevo en ventas que antes no lo tenían (cualquier fracción de cualquier producto) → [Mitigación] fuera del alcance de este spec (decisión de negocio ya confirmada por el usuario); se recomienda aviso operativo antes de desplegar, no requiere cambio de diseño.
- [Riesgo] `tests/fixtures/totals-vectors.ts` (test de equivalencia Sale/Quote/Return) asume `unitPrice` ya resuelto — si no se agregan vectores nuevos, la regla de fracción queda sin cobertura de equivalencia entre los tres calculadores → [Mitigación] agregar vectores con `unitPrice` ya recargado (no agregar el recargo dentro del vector-runner, ya que el cálculo del recargo vive fuera del calculador).
- [Riesgo] `ReturnTotalsCalculator` opera sobre el `unitPrice` snapshoteado del `sale_item` original → [Mitigación] ninguna: al estar el recargo ya horneado en `unit_price` antes de persistir, devoluciones lo heredan gratis sin cambio de código; se agrega un test de integración que lo confirme explícitamente en vez de asumirlo.

## Migration Plan

Sin migración de base de datos — reutiliza `pricing_settings` existente. Despliegue es un cambio de código de aplicación puro: los use cases empiezan a aplicar la nueva regla en el próximo deploy, efecto inmediato sobre nuevas ventas/cotizaciones. Rollback = revertir el deploy (revert de los commits); no hay estado persistido que limpiar porque no se agregan columnas ni se recalculan filas existentes.
