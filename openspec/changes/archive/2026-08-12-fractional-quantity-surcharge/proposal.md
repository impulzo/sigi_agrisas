## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero | Como Cajero, quiero que el sistema sume automáticamente el % de recargo configurado en Precios al vender una cantidad fraccionaria (ej. 0.5, 2.25) de un producto con precio normal, para cobrar el costo real de fraccionar sin depender de que el producto tenga una Dosificación precatalogada | Hoy el recargo solo existe si el producto tiene una Dosificación configurada en catálogo; la mayoría de productos no la tienen, así que se pierde el margen al vender fracciones | - Given producto con precio normal $100 y `dosificationSurchargePct=5`, When se vende cantidad `0.5` vía `productPriceId`, Then `unitPrice` efectivo = $100 × 1.05 antes de aplicar descuento/impuestos<br>- Given cantidad entera (`1`, `2`, `10`), When se vende, Then NO se aplica recargo (comportamiento actual sin cambios)<br>- Given línea con `dosificationId` (dosificación catalogada) y cantidad fraccionaria en su multiplicador, When se vende, Then el recargo NUEVO no se aplica ahí — solo el recargo ya incluido en `computedUnitPrice` (sin doble cobro)<br>- Given cualquier producto/departamento, When cantidad es fraccionaria, Then el recargo aplica sin excepción (no hay flag de opt-out) | - El % se resuelve server-side desde `PricingSettingsRepository` (mismo `dosificationSurchargePct` de settings-api) en `CreateSaleUseCase` — nunca confiar en un `unitPrice` con recargo enviado por el cliente<br>- No requiere permiso nuevo — cubierto por `sales:create` ya existente<br>- `computeTotalsClient` (preview del carrito) y el cálculo server-side deben coincidir exactamente (mismo banker's rounding) para que el total mostrado en POS no difiera del persistido |
| 2 | Cajero con acceso HQ | Como Cajero con acceso a sucursal matriz, quiero que al editar una venta completada el recargo por fracción se recalcule igual que en creación, para que la edición no deje totales inconsistentes con una venta nueva equivalente | `EditCompletedSaleUseCase` reconstruye totales desde cero (restaura stock viejo, re-aplica líneas); si no replica la misma regla que create, una venta editada con cantidad fraccionaria queda con total distinto a una creada igual | - Given venta completada editada agregando/modificando una línea con `productPriceId` y cantidad fraccionaria, When se guarda, Then el recargo se aplica igual que en `CreateSaleUseCase` (mismo `surchargePct` resuelto en el momento de editar, no snapshot viejo)<br>- Given línea editada de fraccionaria a entera, When se guarda, Then el recargo se remueve del cálculo | - Mismo guard existente: sólo editable desde HQ (`sales:edit_completed` + `branches:access_all` o sucursal=HQ) — sin cambios de autorización<br>- Venta con abonos activos sigue bloqueada (409) antes de llegar a este cálculo — no bypassear esa regla existente |
| 3 | Vendedor | Como Vendedor, quiero que una cotización con cantidad fraccionaria en una línea de precio normal muestre el mismo recargo que tendría la venta equivalente, para que el monto cotizado no cambie sorpresivamente al convertir la cotización en venta | Si `QuoteTotalsCalculator` no aplica la misma regla, el cliente ve un total en la cotización y paga otro distinto al convertir — rompe la garantía de "gana el precio cotizado" que ya aplica al resto del snapshot | - Given cotización `draft` con línea `productPriceId` y cantidad fraccionaria, When se calcula el total, Then aplica el mismo recargo que `SaleTotalsCalculator`<br>- Given cotización autorizada con recargo aplicado, When se convierte a venta, Then el `unitPrice` snapshoteado en la conversión preserva el recargo ya calculado (no se re-resuelve el % al momento de convertir, mismo patrón que el resto del snapshot Quote→Sale) | - Sin permiso nuevo — cubierto por `quotes:create`/`quotes:write` existentes<br>- Cotización no toca inventario (regla ya existente) — este cambio no debe introducir ningún side-effect de stock |

Nota: se dividió en 3 historias (crear venta / editar venta completada / cotizaciones) porque cada una tiene flujo y guard distintos — testeables por separado.

## Why

El recargo por dosificación (`dosificationSurchargePct`, default 5%, configurable en `/settings`) hoy solo se aplica cuando la línea de venta usa una **Dosificación precatalogada** (`dosificationId`, con `numParts` fijo definido en catálogo). La mayoría de productos no tienen dosificaciones configuradas, así que al venderse una cantidad fraccionaria (ej. 0.5 kg, 2.25 unidades) por precio normal (`productPriceId`), el sistema no cobra ningún costo adicional por fraccionar — el negocio pierde margen en cada venta fraccionaria de un producto sin dosificación en catálogo. Esta brecha se confirmó al reproducir un caso real: un producto sin dosificaciones, vendido con cantidad `0.5`, no sumó el 5% esperado — comportamiento correcto según el diseño actual, pero insuficiente para la regla de negocio real (fraccionar cualquier producto cuesta extra, no solo los precatalogados).

## What Changes

- Nueva regla de cálculo: en `SaleTotalsCalculator` y `QuoteTotalsCalculator`, cuando una línea usa precio normal (no `dosificationId`) y su `quantity` no es un entero (`quantity % 1 !== 0`), se aplica el mismo `dosificationSurchargePct` configurado en Pricing Settings sobre el `unitPrice` antes de calcular subtotal/impuestos.
- Líneas con `dosificationId` quedan explícitamente excluidas de esta regla nueva (ya llevan su propio recargo vía `computedUnitPrice`) — no hay doble cobro.
- Sin opt-out por producto ni departamento — aplica de forma global y automática, mismo % para todos.
- `CreateSaleUseCase` y `EditCompletedSaleUseCase` resuelven el `surchargePct` vía `PosLookupService.getDosificationSurchargePct()` (ya existente) y lo pasan al calculador de totales para TODAS las líneas con precio normal, no solo para dosificaciones.
- `computeTotalsClient` (preview del carrito en POS) replica la misma regla client-side para que el total mostrado antes de confirmar coincida con el persistido.
- Cotizaciones: `QuoteTotalsCalculator` recibe el mismo `surchargePct` resuelto por línea; la conversión Quote→Sale preserva el `unitPrice` ya recargado en el snapshot (no se re-resuelve el % al convertir).
- **BREAKING** (comportamiento, no de API): cualquier venta o cotización existente con cantidad fraccionaria en precio normal cambiará de total la próxima vez que se recalculen sus líneas (edición de venta completada). Ventas ya `completed`/`edited` no se recalculan retroactivamente — solo aplica hacia adelante.

## Capabilities

### New Capabilities
(ninguna — extiende el cálculo de totales ya cubierto por `pos-api` y `quotes-api`)

### Modified Capabilities
- `pos-api`: `SaleTotalsCalculator`, `CreateSaleUseCase`, `EditCompletedSaleUseCase` aplican recargo por cantidad fraccionaria en líneas de precio normal.
- `quotes-api`: `QuoteTotalsCalculator` aplica la misma regla; conversión Quote→Sale preserva el recargo en el snapshot.

## Impact

- **Backend**: `src/modules/pos/domain/services/SaleTotalsCalculator.ts`, `src/modules/pos/application/use-cases/CreateSaleUseCase.ts`, `src/modules/pos/application/use-cases/EditCompletedSaleUseCase.ts`, `src/modules/quotes/domain/services/QuoteTotalsCalculator.ts`, use cases de cotizaciones que arman `calcLines`.
- **Frontend**: `app/(private)/pos/_logic/lib/computeTotalsClient.ts` (y su equivalente/uso en cotizaciones si difiere), para que el preview coincida con backend.
- **Tests**: `tests/fixtures/totals-vectors.ts` (test de equivalencia entre los 3 calculadores) debe extenderse con casos de cantidad fraccionaria + precio normal; tests unitarios de `CreateSaleUseCase`/`EditCompletedSaleUseCase`/`QuoteTotalsCalculator`.
- **Sin cambios de esquema DB** — reutiliza `pricing_settings` existente.
- **Sin cambios de API pública** — mismo request/response shape; solo cambia el `unitPrice`/totales calculados.
- **Sin nuevos permisos RBAC**.
