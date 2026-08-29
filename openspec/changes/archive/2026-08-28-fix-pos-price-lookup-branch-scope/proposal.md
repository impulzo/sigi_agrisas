## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/vendedor en POS o armando una cotización nueva | Como cajero/vendedor en POS o cotizaciones, quiero que al agregar un producto al carrito se muestre y cobre el precio vigente de mi sucursal activa (override propio si existe, si no el base), para no cobrar el precio de otra tienda | El inventario real trae ~35 productos con precio divergente por sucursal y varios productos que sólo existen con precio en tiendas distintas a Matriz; sin esto el POS cobraba siempre el precio de Matriz o no mostraba precio alguno | - Al agregar un producto con sucursal `B` seleccionada, `PriceTierPicker` lista los precios efectivos de `B` (override propio + heredados de base)<br>- Producto con override en `B` pero sin precio base global se lista igual (antes mostraba "Este producto no tiene precios configurados")<br>- Producto sin override propio en `B` sigue mostrando el precio base heredado, sin regresión<br>- Sin sucursal aún seleccionada (admin en modo bypass antes de elegir), la llamada omite `branchId` y conserva el comportamiento anterior (sólo precios base) | - El fix es sólo de UI (qué precio se pide/muestra); la autorización real sigue en backend — `CreateSaleUseCase` ya rechaza con `ProductPriceNotAvailableForBranchError` (400) si el `priceId` enviado no pertenece a `null` o a la sucursal de la venta, sin exponer el precio de la otra sucursal en el mensaje |
| 2 | Usuario editando una venta completada o una cotización en borrador | Como usuario editando una venta ya completada o una cotización en borrador, quiero que al agregar o cambiar de precio una línea se use el precio efectivo de la sucursal ya fijada en esa venta/cotización (inmutable), para mantener consistencia con el precio original de esa sucursal en vez del de mi sesión | `branchId` de una venta/cotización es inmutable tras creación; usar el `branchId` del usuario logueado en vez del de la venta/cotización mostraría precios de una sucursal distinta a la real | - `EditSalePage` pide precios usando `sale.branchId`, no el `branchId` del usuario logueado<br>- `QuoteEditPage` pide precios usando `quote.branchId`<br>- Cambiar de tier en una línea ya existente (no sólo agregar producto nuevo) también usa el `branchId` correcto de la venta/cotización | - `branchId` de la venta/cotización es inmutable server-side (`PATCH` no lo acepta); el frontend sólo lo lee del recurso cargado, no puede alterarlo vía este flujo |

Nota: se separó en 2 historias porque difieren en la *fuente* del `branchId` (sesión/selección del usuario vs. recurso ya persistido e inmutable) — mismo mecanismo subyacente (`getProductPrices(productId, branchId)`), pero criterios de aceptación distintos.

## Why

El change ya archivado `add-branch-scoped-prices` introdujo precios `ProductPrice.branchId` para que cada sucursal pueda tener un override de precio distinto al de Matriz, con backend (`findEffectiveForBranch`, `ListProductPricesUseCase`) y validación (`ProductPriceNotAvailableForBranchError`) completos desde entonces. Sin embargo, su Historia 2 ("al vender en sucursal B se cobra automáticamente el precio vigente de B") nunca se completó del lado del frontend: `getProductPrices()` — el servicio compartido que alimenta `PriceTierPicker` en POS, Cotizaciones y Edición de venta completada — nunca envió `?branchId=` al backend. El resultado en producción: productos que sólo tienen precio de sucursal (sin precio base global, ~282 de 344 overrides en Tlaxiaco) aparecían sin ningún precio seleccionable, y productos con precio divergente por sucursal siempre mostraban el precio de Matriz. Este change corrige esa brecha y documenta el comportamiento correcto en la spec `pos-ui`, que había quedado desactualizada (seguía describiendo la llamada `GET .../prices` "ya existente" sin `branchId`).

## What Changes

- `getProductPrices(productId, branchId?, fetchImpl?)` — nuevo parámetro `branchId` opcional que agrega `?branchId=<id>` a la query cuando se provee; sin cambio de comportamiento cuando se omite.
- 8 call sites actualizados para pasar el `branchId` de contexto de cada pantalla:
  - `PosPage.tsx` (2 sitios) → `selectedBranchId`
  - `QuoteCreatePage.tsx` (2 sitios) → `selectedBranchId`
  - `EditSalePage.tsx` (2 sitios) → `sale.branchId` (inmutable)
  - `QuoteEditPage.tsx` (2 sitios) → `quote.branchId` (inmutable)
- Tests actualizados a la nueva firma + 2 casos nuevos en `getProductPrices.test.ts` verificando presencia/ausencia de `?branchId=` en la URL dispatchada.
- `billing-ui` (`PartialInvoiceForm`) queda sin cambios — su spec ya documenta `getProductPrices(productId)` sin `branchId` como comportamiento intencional (factura no está atada a una sucursal operativa); no forma parte de esta corrección.
- Caché offline (`getProductPricesFromCache`) queda sin cambios — no es branch-aware; limitación preexistente del módulo `offline-sync`, fuera de alcance.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `pos-ui`: el requirement "Price/dosification selection dialog" se actualiza para exigir que `PriceTierPicker`/`getProductPrices` soliciten los precios efectivos de la sucursal activa (`?branchId=<id>`) en vez de siempre los precios base, tanto en el POS normal como en la edición de venta completada.

## Impact

- **Código**: `app/(private)/pos/_logic/services/getProductPrices.ts`, `app/(private)/pos/_blocks/PosPage.tsx`, `app/(private)/quotes/_blocks/QuoteCreatePage.tsx`, `app/(private)/quotes/_blocks/QuoteEditPage.tsx`, `app/(private)/sales/_blocks/EditSalePage.tsx`.
- **Tests**: `tests/unit/ui/(private)/pos/_logic/services/getProductPrices.test.ts`.
- **Specs**: `openspec/specs/pos-ui/spec.md` (delta MODIFIED).
- **Sin cambios de backend, DB, ni contrato de API** — el endpoint `GET /api/v1/admin/products/:id/prices?branchId=` ya existía y ya estaba probado; sólo se corrige quién lo invoca y cómo.
- **Sin cambios de permisos** — mismo `products:read` que el cajero ya posee.
